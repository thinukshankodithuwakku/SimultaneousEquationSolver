import { push } from "node:stream/iter";
import {Equation, System} from "./Solver.js";

type TokenType = "num" | "sym" | "plus" | "minus" | "equals" | "op" | "other" | "lp" | "rp" | "div" | "mult" | "exp" | "obr" | "cbr" | "osl" | "csl" | "abs";

interface Token {

    type: TokenType,
    value: string,

}

function is_num(str : string) : boolean {

    return !str.includes('+') && !str.includes('-') && !isNaN(Number(str));

}

function Tokenise(src : string){

    src = src.trim();
    const tokens : Token[] = [];

    const chars : string[] = src.split('');

    const ops = ['<', '>','≤', '≥', '%'];

    function pushTok(type : TokenType, value : string){

        tokens.push({

            type: type,
            value: value,

        })

    }

    while(chars.length > 0){
        
        const next = chars[0];

        if(next == ' ' || next == '\n' || next == '\t'){

            chars.shift();

        }
        else if(is_num(next)){

            let num : string = chars.shift() as string;

            while(is_num(num + chars[0]) && chars.length > 0){

                num += chars.shift();


            }
            
            pushTok("num", num);

        }
        else if(/^[A-Za-z]+$/.test(next)){


            let sym : string = chars.shift() as string;

            while(/^[A-Za-z]+$/.test(next + chars[0]) && chars.length > 0){

                sym += chars.shift();

            }

            pushTok("sym", sym as string)

        }
        else if(next == '+'){

            pushTok("plus", chars.shift() as string);

        }
        else if(next == '-'){

            pushTok("minus", chars.shift() as string);

        }
        else if(next == '*'){

            pushTok("mult", chars.shift() as string);

        }
        else if(next == '/'){

            pushTok("div", chars.shift() as string);

        }
        else if(next == '^'){

            pushTok("exp", chars.shift() as string);

        }
        else if(next == '='){

            pushTok("equals", chars.shift() as string);

        }
        else if(next == '&'){

            pushTok("osl", chars.shift() as string);

        }

        else if(next == '{'){

            pushTok("obr", chars.shift() as string);

        }
        else if(next == '}'){

            pushTok("cbr", chars.shift() as string);

        }
        else if(next == '('){

            pushTok("lp", chars.shift() as string);

        }
        else if(next == ')'){

            pushTok("rp", chars.shift() as string);

        }
        else if(next == '|'){

            pushTok("abs", chars.shift() as string);

        }
        else if(ops.includes(next)){

            throw `Unexpected operator '${chars.shift() as string}'. Only '+' and '-' supported for linear equations.`;

        }
        else {

            pushTok("other", chars.shift() as string);

        }


    }

    if(tokens[0].type != "minus") tokens.unshift({type: "plus", value: '+'});

    return tokens;
}

interface Expr {

    kind: "Unary" | "Binary" | "Num" | "Sym"

}

interface UnaryExpr extends Expr {

    kind: "Unary",
    op: '+' | '-' | '|',
    operand: Expr

}

interface BinaryExpr extends Expr {

    kind: "Binary"
    op: '+' | '-' | '*' | '/' | '^',
    lhs: Expr,
    rhs: Expr

}

interface Num extends Expr {

    kind: "Num"
    value: Number,

}

interface Sym extends Expr {

    kind: "Sym"
    value: string,

}

function ParseEqtn(tokens : Token[]) : Equation{

    function expect(type : TokenType, msg : string){

        if(tokens.length == 0 || tokens[0].type != type) throw msg;

    }

    const parser = new ExprParser(tokens);
    let coef : number = 1;

    let minus = false;

    const terms = [];
    let Vars : string[] = [];

    while(tokens.length > 0 && tokens[0].type != "equals"){

        if(tokens[0].type == "plus") minus = false;
        else if(tokens[0].type == "minus") minus = true;
        else throw `Missing operator!`;

        tokens.shift();



        if((tokens[0] as Token).type == "num"){

            coef = Number((tokens.shift() as Token).value);
            if(minus) coef = -coef;

        }
        else if((tokens[0] as Token).type == "obr"){

            tokens.shift();
            coef = evaluate(parser.parse());
            if(minus) coef = -coef;
            
            
            while(tokens.length > 0 && (tokens[0] as Token).type != "cbr") tokens.shift();
            expect("cbr", "'}' expected!");
            tokens.shift();

        }
        else {
            coef = 1;
            if(minus) coef = -1;
        }

        if(tokens[0].value.length > 1) throw "Variables should only be 1 character long!";
        const sym = (tokens.shift() as Token).value;

        terms.push({sym: sym, coef: coef})
        Vars.push(sym);
        
    }

    expect("equals", "Missing '=' in equation(s)!");

    tokens.shift() //Consuming the equals token

    if((tokens[0].type as TokenType) == "minus") minus = true;

    if((tokens[0].type as TokenType) == "minus" || (tokens[0].type as TokenType) == "plus") tokens.shift();

    if((tokens[0].type as TokenType) != "num" && (tokens[0].type as TokenType) != "obr") throw `Unexpected token '${tokens[0].value}'!`;
    let sum = 0;

    if((tokens[0].type as TokenType) == "num") sum = Number((tokens.shift() as Token).value);
    else {

        tokens.shift();
        sum = evaluate(parser.parse());
        while(tokens.length > 0 && (tokens[0] as Token).type != "cbr") tokens.shift();
        expect("cbr", "'}' expected!");
        tokens.shift();

    }

    if(minus) sum = -sum;

    terms.sort((a,b) => a.sym.localeCompare(b.sym));
    Vars.sort((a,b) => a.localeCompare(b));

    if(Vars.length != new Set(Vars).size) throw("Duplicated terms in equation(s)");

    return {

        terms: terms,
        sum: sum,
        vars: Vars,

    }

}

class ExprParser {

    public tokens : Token[] = [];
    private zero : Num = {

        kind: "Num",
        value: 0,

    };

    constructor(Tokens : Token[]) {

    this.tokens = Tokens;

    } 

    private at() : Token{

        return this.tokens[0] as Token;

    }

    private eat() : Token {

        return this.tokens.shift() as Token;

    }

    private eol() : boolean {

        return this.tokens.length == 0 || this.tokens[0].type == "cbr";

    }

    public parse() : Expr {

        

        return this.parseAdditive();

    }

    private parseAdditive() : Expr {

        if(this.eol()) return this.zero;

        let left : Expr = this.parseMult();

        while(!this.eol() && (this.at().type == "plus" || this.at().type == "minus")){

            const op = this.eat().value;
            const right = this.parseMult();

            left = {

                kind: "Binary",
                lhs: left,
                rhs: right,
                op: op,

            } as BinaryExpr;

        }
        
        return left;
        

    }

    private parseMult() : Expr {

        if(this.eol()) return this.zero;

        let left : Expr = this.parseExp();

        while(!this.eol() && (this.at().type == "mult" || this.at().type == "div")){

            const op = this.eat().value;
            const right = this.parseExp();

            left = {

                kind: "Binary",
                lhs: left,
                rhs: right,
                op: op,

            } as BinaryExpr;

        }
        
        return left;
        

    }

    private parseExp() : Expr {

        if(this.eol()) return this.zero;

        let left : Expr = this.unaryExpr();

        while(!this.eol() && this.at().type == "exp"){

            const op = this.eat().value;
            const right = this.unaryExpr();

            left = {

                kind: "Binary",
                lhs: left,
                rhs: right,
                op: op,

            } as BinaryExpr;

        }
        
        return left;
        

    }

    private unaryExpr() : Expr {

        if(this.eol()) return this.zero;

        if(this.at().type == "plus" || this.at().type == "minus"){

            const op = this.eat().value;

            return {

                op: op,
                operand: this.primary()

            } as UnaryExpr;

        }
       else return this.primary();

    }

    private expect(type : TokenType, msg : string) {

        if(this.eol() || this.at().type != type) throw new SyntaxError(msg);

    }

    private primary() : Expr {

        if(this.eol()) return this.zero;

        switch(this.at().type){

            case "num":
                return {

                    kind: "Num",
                    value: Number(this.eat().value),

                } as Num

            case "sym":
                return {

                    kind: "Sym",
                    value: this.eat().value,

                } as Sym

            case "lp":
                this.eat();
                const expr = this.parse();
                
                this.expect("rp", "')' expected!");
                this.eat();
                return expr;

            case "obr":
                this.eat();
                const sym = {

                    kind: "Sym",
                    value: this.eat().value,

                } as Sym;

                this.expect("cbr", "'}' expected!");
                this.eat();
                return sym;

            case "abs":
                this.eat();

                const signed = this.parse();
                this.expect("abs", "'|' expected!");
                this.eat();

                return {

                    kind: "Unary",
                    op: "|",
                    operand: signed,

                } as UnaryExpr;
                
                

            default:
                throw `Unexpected token '${this.at().value}'!`;

        }

    }


}

const MatConsts = ["pi", "e", "phi"];
const ConstantTable : Record<string , number> = {

    "pi" : Math.PI,
    "e" : Math.E,
    "phi" : (1 + Math.sqrt(5)) / 2,
    "tau" : 2 * Math.PI,


}

function evaluate(expr : Expr) : number {


    switch(expr.kind){

        case "Binary":
            return evalBin(expr as BinaryExpr);

        case "Unary":
            return evalUn(expr as UnaryExpr);

        case "Sym":

            const sym = (expr as Sym).value.toLowerCase();

            if(!MatConsts.includes(sym)) throw `Could not find mathematical constant '${sym}'!`;
            return ConstantTable[sym];

        case "Num":
            return Number((expr as Num).value);

        default:
            return 0;

    }

}

function evalBin(expr : BinaryExpr) : number {

    switch(expr.op){

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

function evalUn(expr : UnaryExpr) : number {

    switch(expr.op){

        case "+":
            return evaluate(expr.operand);

        case "-":
            return -evaluate(expr.operand);

        case "|":
            return Math.abs(evaluate(expr.operand));

        default:
            return 0;


    }

}

export function ParseSystem(src : string[]) : System {

    const eqtns = src.map(raw => ParseEqtn(Tokenise(raw)));

    const uniqueVars : string[] = [...new Set(eqtns.map(eqtn => eqtn.vars).flat())];


    for(const eqtn of eqtns){

        const missing = uniqueVars.filter(sym => !eqtn.vars.includes(sym));
        for(const sym of missing){

            eqtn.vars.push(sym);
            eqtn.terms.push({sym: sym, coef: 0});

        }

        eqtn.terms.sort((a,b) => a.sym.localeCompare(b.sym));
        eqtn.vars.sort((a,b) => a.localeCompare(b));

    }

    return {

        eqtns: eqtns,
        vars: uniqueVars,

    }
}

//console.log(JSON.stringify(ParseSystem(["2x -3y + z = -3", "x - 4y + 2z = 1", "-3x -2y + 3z = 14"])));