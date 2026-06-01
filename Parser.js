"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseSystem = ParseSystem;
function is_num(str) {
    return !str.includes('+') && !str.includes('-') && !isNaN(Number(str));
}
function Tokenise(src) {
    src = src.trim();
    const tokens = [];
    const chars = src.split('');
    const ops = ['<', '>', '≤', '≥', '%'];
    function pushTok(type, value) {
        tokens.push({
            type: type,
            value: value,
        });
    }
    while (chars.length > 0) {
        const next = chars[0];
        if (next == ' ' || next == '\n' || next == '\t') {
            chars.shift();
        }
        else if (is_num(next)) {
            let num = chars.shift();
            while (is_num(num + chars[0]) && chars.length > 0) {
                num += chars.shift();
            }
            pushTok("num", num);
        }
        else if (/^[A-Za-z]+$/.test(next)) {
            let sym = chars.shift();
            while (/^[A-Za-z]+$/.test(next + chars[0]) && chars.length > 0) {
                sym += chars.shift();
            }
            pushTok("sym", sym);
        }
        else if (next == '+') {
            pushTok("plus", chars.shift());
        }
        else if (next == '-') {
            pushTok("minus", chars.shift());
        }
        else if (next == '*') {
            pushTok("mult", chars.shift());
        }
        else if (next == '/') {
            pushTok("div", chars.shift());
        }
        else if (next == '^') {
            pushTok("exp", chars.shift());
        }
        else if (next == '=') {
            pushTok("equals", chars.shift());
        }
        else if (next == '&') {
            pushTok("osl", chars.shift());
        }
        else if (next == '{') {
            pushTok("obr", chars.shift());
        }
        else if (next == '}') {
            pushTok("cbr", chars.shift());
        }
        else if (next == '(') {
            pushTok("lp", chars.shift());
        }
        else if (next == ')') {
            pushTok("rp", chars.shift());
        }
        else if (ops.includes(next)) {
            throw `Unexpected operator '${chars.shift()}'. Only '+' and '-' supported for linear equations.`;
        }
        else {
            pushTok("other", chars.shift());
        }
    }
    if (tokens[0].type != "minus")
        tokens.unshift({ type: "plus", value: '+' });
    return tokens;
}
function ParseEqtn(tokens) {
    function expect(type, msg) {
        if (tokens.length == 0 || tokens[0].type != type)
            throw msg;
    }
    const parser = new ExprParser(tokens);
    let coef = 1;
    let minus = false;
    const terms = [];
    let Vars = [];
    while (tokens.length > 0 && tokens[0].type != "equals") {
        if (tokens[0].type == "plus")
            minus = false;
        else if (tokens[0].type == "minus")
            minus = true;
        else
            throw `Missing operator!`;
        tokens.shift();
        if (tokens[0].type == "num") {
            coef = Number(tokens.shift().value);
            if (minus)
                coef = -coef;
        }
        else if (tokens[0].type == "obr") {
            tokens.shift();
            coef = evaluate(parser.parse());
            if (minus)
                coef = -coef;
            while (tokens.length > 0 && tokens[0].type != "cbr")
                tokens.shift();
            expect("cbr", "'}' expected!");
            tokens.shift();
        }
        else {
            coef = 1;
            if (minus)
                coef = -1;
        }
        if (tokens[0].value.length > 1)
            throw "Variables should only be 1 character long!";
        const sym = tokens.shift().value;
        terms.push({ sym: sym, coef: coef });
        Vars.push(sym);
    }
    expect("equals", "Missing '=' in equation(s)!");
    tokens.shift(); //Consuming the equals token
    if (tokens[0].type == "minus")
        minus = true;
    if (tokens[0].type == "minus" || tokens[0].type == "plus")
        tokens.shift();
    if (tokens[0].type != "num" && tokens[0].type != "obr")
        throw `Unexpected token '${tokens[0].value}'!`;
    let sum = 0;
    if (tokens[0].type == "num")
        sum = Number(tokens.shift().value);
    else {
        tokens.shift();
        sum = evaluate(parser.parse());
        while (tokens.length > 0 && tokens[0].type != "cbr")
            tokens.shift();
        expect("cbr", "'}' expected!");
        tokens.shift();
    }
    if (minus)
        sum = -sum;
    terms.sort((a, b) => a.sym.localeCompare(b.sym));
    Vars.sort((a, b) => a.localeCompare(b));
    if (Vars.length != new Set(Vars).size)
        throw ("Duplicated terms in equation(s)");
    return {
        terms: terms,
        sum: sum,
        vars: Vars,
    };
}
class ExprParser {
    tokens = [];
    zero = {
        kind: "Num",
        value: 0,
    };
    constructor(Tokens) {
        this.tokens = Tokens;
    }
    at() {
        return this.tokens[0];
    }
    eat() {
        return this.tokens.shift();
    }
    eol() {
        return this.tokens.length == 0 || this.tokens[0].type == "cbr";
    }
    parse() {
        return this.parseAdditive();
    }
    parseAdditive() {
        if (this.eol())
            return this.zero;
        let left = this.parseMult();
        while (!this.eol() && (this.at().type == "plus" || this.at().type == "minus")) {
            const op = this.eat().value;
            const right = this.parseMult();
            left = {
                kind: "Binary",
                lhs: left,
                rhs: right,
                op: op,
            };
        }
        return left;
    }
    parseMult() {
        if (this.eol())
            return this.zero;
        let left = this.parseExp();
        while (!this.eol() && (this.at().type == "mult" || this.at().type == "div")) {
            const op = this.eat().value;
            const right = this.parseExp();
            left = {
                kind: "Binary",
                lhs: left,
                rhs: right,
                op: op,
            };
        }
        return left;
    }
    parseExp() {
        if (this.eol())
            return this.zero;
        let left = this.unaryExpr();
        while (!this.eol() && this.at().type == "exp") {
            const op = this.eat().value;
            const right = this.unaryExpr();
            left = {
                kind: "Binary",
                lhs: left,
                rhs: right,
                op: op,
            };
        }
        return left;
    }
    unaryExpr() {
        if (this.eol())
            return this.zero;
        if (this.at().type == "plus" || this.at().type == "minus") {
            const op = this.eat().value;
            return {
                op: op,
                operand: this.primary()
            };
        }
        else
            return this.primary();
    }
    primary() {
        if (this.eol())
            return this.zero;
        switch (this.at().type) {
            case "num":
                return {
                    kind: "Num",
                    value: Number(this.eat().value),
                };
            case "sym":
                return {
                    kind: "Sym",
                    value: this.eat().value,
                };
            case "lp":
                this.eat();
                const expr = this.parseAdditive();
                if (this.at().type != "rp")
                    throw "')' expected!";
                this.eat();
                return expr;
            case "obr":
                this.eat();
                const sym = {
                    kind: "Sym",
                    value: this.eat().value,
                };
                if (this.at().type != "cbr")
                    throw "'}' expected!";
                this.eat();
                return sym;
            default:
                throw `Unexpected token '${this.at().value}'!`;
        }
    }
}
const MatConsts = ["pi", "e", "phi"];
const ConstantTable = {
    "pi": Math.PI,
    "e": Math.E,
    "phi": (1 + Math.sqrt(5)) / 2,
};
function evaluate(expr) {
    switch (expr.kind) {
        case "Binary":
            return evalBin(expr);
        case "Unary":
            return evalUn(expr);
        case "Sym":
            const sym = expr.value.toLowerCase();
            if (!MatConsts.includes(sym))
                throw `Could not find mathematical constant '${sym}'!`;
            return ConstantTable[sym];
        case "Num":
            return Number(expr.value);
        default:
            return 0;
    }
}
function evalBin(expr) {
    switch (expr.op) {
        case "+":
            return evaluate(expr.lhs) + evaluate(expr.rhs);
        case '*':
            return evaluate(expr.lhs) * evaluate(expr.rhs);
        case "-":
            return evaluate(expr.lhs) - evaluate(expr.rhs);
        case "/":
            return evaluate(expr.lhs) / evaluate(expr.rhs);
        case "^":
            return evaluate(expr.lhs) ^ evaluate(expr.rhs);
    }
}
function evalUn(expr) {
    switch (expr.op) {
        case "+":
            return evaluate(expr.operand);
        case "-":
            return -evaluate(expr.operand);
    }
}
function ParseSystem(src) {
    const eqtns = src.map(raw => ParseEqtn(Tokenise(raw)));
    const uniqueVars = [...new Set(eqtns.map(eqtn => eqtn.vars).flat())];
    for (const eqtn of eqtns) {
        const missing = uniqueVars.filter(sym => !eqtn.vars.includes(sym));
        for (const sym of missing) {
            eqtn.vars.push(sym);
            eqtn.terms.push({ sym: sym, coef: 0 });
        }
        eqtn.terms.sort((a, b) => a.sym.localeCompare(b.sym));
        eqtn.vars.sort((a, b) => a.localeCompare(b));
    }
    return {
        eqtns: eqtns,
        vars: uniqueVars,
    };
}
//console.log(JSON.stringify(ParseSystem(["2x -3y + z = -3", "x - 4y + 2z = 1", "-3x -2y + 3z = 14"])));
