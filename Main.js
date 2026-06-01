const { Solve } = require("./Solver.js");
const { ParseSystem } = require("./Parser.js");



const readline = require("readline");
const rl = readline.createInterface({

    input: process.stdin,
    output: process.stdout,

});

const eqtns = [];


console.log("Welcome to simultaneous equation solver.")
console.log("Enter each equation in the format ax + by + cz...= d");
console.log("Type done when ready");

/*const res = Solve(ParseSystem(["-5x + 3y 5z = 13"]));
if(res) Array.from(res.keys()).forEach(sym => console.log(sym, ' = ', res.get(sym)));*/

begin();

function begin() {

    rl.on("line", (eqtn) => {

        if(eqtn === "done") {

            rl.pause();
            const res = Solve(ParseSystem(eqtns));
            if(res) Array.from(res.keys()).forEach(sym => console.log(sym, ' = ', res.get(sym)));
            else console.log("No unique solution to your system of equations");

            console.log("Automatically going again. Enter 'quit' to terminate the program.")
            rl.resume();
            begin();

        }
        else if(eqtn == "quit") {

            console.log("Thank you for using Simultaneous Equation Solver!")
            rl.close();
            return;

        }
        else eqtns.push(eqtn);

    })

}


