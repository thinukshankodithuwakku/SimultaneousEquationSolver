
function det(Mat : number[][]){


    const rows = Mat[0].length;
    const cols = Mat.length;

    if(rows != cols) return 0;

    if(rows == 1 && cols == 1) return Mat[0][0];

    let out = 0;

    for(let i = 1; i <= Mat[0].length; i++){

        const sign = i % 2 == 0 ? -1 : 1; 
        const coef = Mat[0][i - 1] * sign;

        let newM = [];
        

        for(let j = 1; j < cols; j++){

            const row = Mat[j].toSpliced(i - 1, 1);
            newM.push(row)

        }

        //console.log(`${coef} * det(${newM})`);
        out += coef * det(newM);

    }

    return out;

}

function MatMin(Mat : number[][]){

    const minors = [];
    let newRow = [];

    for(let row = 1; row <= Mat.length; row++){

        for(let col = 1; col <= Mat[0].length; col++){

            newRow.push(det(Mat.toSpliced(row - 1, 1).map(r => r.toSpliced(col - 1, 1))));


        }

        minors.push(newRow);
        newRow = [];

    }

    return minors;

}

function Cofac(Mat : number[][]){

    let inc = 0;
    const cofactors = [];
    let row = [];

    for(let i = 0; i < Mat.length; i++ ){

        row = [];

        for(let j = 0; j < Mat[0].length; j++){

            inc++
            if(inc % 2 != 0) row.push(Mat[i][j])
            else row.push(-Mat[i][j])

        }

        cofactors.push(row);

    }

    return cofactors;

}

function Tran(Mat: number[][]){

    const transp = [];
    let cols = [];

    for(let i = 0; i < Mat[0].length; i++){

        cols = [];

        for(const row of Mat){

            cols.push(row[i]);

        }

        transp.push(cols);

    }

    return transp;

}

//x + y + 2z = 7
//2x - 4y - 3z = -5
//-5x + 4y +5z = 13

function Invert(Mat : number[][]){

    let determinant = det(Mat);

    if(determinant == 0) throw("No unique solution to your system. There is either an infinity of solutions, no solutions or 1 or more of your equations are identical.");

    const inv = Tran(Cofac(MatMin(Mat))); //adjugate matrix


    for(let i = 0; i < Mat.length; i++){

        for(let j = 0; j < Mat[0].length; j++){

            inv[i][j] = (1 / determinant) * inv[i][j];

        }

    }

    return inv;

}

export function Solve(problem : System) : Map<string, number> | undefined {

    const matrix : number[][] = [];
    let row = [];

    const sumMat : number[] = [];

    if(problem.eqtns.length < problem.vars.length){

        throw(`${problem.vars.length} variables used but only ${problem.eqtns.length} equations listed!`);

    }

    for(const eqtn of problem.eqtns){

        row = [];


        for(const term of eqtn.terms){

            row.push(term.coef);

        }
        sumMat.push(eqtn.sum);
        matrix.push(row);

    }

    
    if(matrix.length == 0) return;
    const inverse = Invert(matrix);


    let res : Map<string, number> = new Map();
    let rowSum = 0;


    

    for(let i = 0; i < problem.vars.length; i++ ){

        rowSum = 0;

        for(let j = 0; j < problem.vars.length; j++){

            rowSum += inverse[i][j] * sumMat[j]

        }

        res.set(problem.vars[i], rowSum);

    }

    return res;

}

export interface Equation {

    terms: {sym: string, coef: number}[],
    sum: number,
    vars: string[],

}

export interface System {

    vars : string[],
    eqtns: Equation[],


}

function spt(Mat : number[][]){

    Mat.forEach(row => console.log(row));

}


const testProblem : System = {

    eqtns: [
        {
            terms: [{sym: 'x', coef: 2}, {sym: 'y', coef: -3}, {sym: 'z', coef: 1}],
            sum: -3,
            vars: ['x', 'y', 'z']
        },

        {
            terms: [{sym: 'x', coef: 1}, {sym: 'y', coef: -4}, {sym: 'z', coef: 2}],
            sum: 1,
            vars: ['x', 'y', 'z']
        },

        {
            terms: [{sym: 'x', coef: -3}, {sym: 'y', coef: -2}, {sym: 'z', coef: 3}],
            sum: 14,
            vars: ['x', 'y', 'z']
        },
    ],

    vars: ['x', 'y', 'z']


}

const test = [
    [2, -3, 1],
    [1, -4, 2],
    [-3, -2, 3]
]


//Invert(test);
//let res = Solve(testProblem);
//Array.from(res.keys()).forEach(sym => console.log(sym, ' = ', res.get(sym)));
