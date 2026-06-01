# Simultaneous Equation Solver BETA
A simple simultaneous equation parser and solver that uses matrices. Supports long mathematical expressions.

## Overview
This was a simultaneous equation solver originally intended to be used as part of the solution for AOC 2025 Day 10 part 2, but was later scrapped, so I decided to turn it into it's own project.

IMPORTANT: This project is very early in development and is prone to errors.

## How it works
Those of you who are studying or have studied A-level further maths may be familiar with using matrices to solve simultaneous equations. This solver uses exactly the textbook method:

* Work out inverse matrix
* Left multiply this by the matrix of sums of each equation

The process of inverting the matrix has also been broken down using the steps:
* Work out "matrix of minors"
* Apply corresponding cofactor signage
* Take the transpose of cofactor matrix to get adjugate matrix

## Notes on input

* Any equations inputted must be of the form ax + by + cz ... = d, where all variables and constants are real 
* To start and end a longer math expression, use '&' e.g &e^pi - 5&
* The system must have a unique solution
* The number of equations given must match the number of unique variables used
