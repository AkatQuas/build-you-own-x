# Basic features of C

[doc](http://www.buildyourownlisp.com/chapter3_basics)

codes:
    
- [hello world](../codes/hello-world.c)

## On Program

A program in C consists of only **function definitions** and **structure definitions**.

Therefore a source file is simply a list of **function** and **types**. These function can call each other or themselves, and can use any data types that have benn declared or are built into the language.

It it possible to call the functions in other libraries, or to use their data types. This is how layers of complexity are accumulated in C programming.

The execution of a C program always starts in the function called `main`. From here it calls more and more functions, to perform all the actions it requires.

## On variable

We declare a new variable by writing the name of its type, followed by its name, and optionally setting it to some value using `=`. Such declaration is a **statement**, and we terminate all **statements** in C with a semicolon `;`.

## On Function

A function is a computation that manipulates variables, and optionally changes the state of the program. It takes as input some variables and returns some single variable as output.

To declare a function we write the type of the variable it returns, the name of the function, and then in parenthesis a list of the variables it takes as input, separated by commas. The contents of the function are put inside curly brackets `{}`, and lists all of the statements the function executes, terminated by semicolons `;`. A `return` statement is used to let the function finish and output a variable.

We call functions by writing their name and putting the arguments to the function in parentheses, separated by commas.

## On Structure

Structures are used to declare new **types**. Structures are several variables bundled together into a single package.

To declare structures we can use the `struct` keyword in conjunction with the `typedef` keyword. For example:

```c
typedef struct {
    float x;
    float y;
} point;
```

We should place this definition above any functions that wish to use it. This type is no different to the built-in types, and we can use it in all the same ways.

## On Pointers

A pointer is a variation on a normal type where the type name is suffixed with an asterisk. Pointers are used for a whole number of different things such as for strings or lists. 

## On Strings

In C strings are represented by the pointer type `char*`. Under the hood they are stored as a list of characters, where the final character is a special character called the **null terminator**. Strings can also be declared literally by putting text between quotation marks.

## On Conditionals

Conditional statements let the program perform some code only if certain conditions are met.

To perform code under some condition we use the `if` statement. This is written as `if` followed by some condition in parentheses, followed by the code to execute in curly brackets. An `if` statement can be followed by an optional `else` statement, followed by other statements in curly brackets. The code in these brackets will be performed in the case the conditional is false.

We can test for multiple conditions using the logical operator `||` for **or**, and `&&` for **and**. Inside a conditional statement's parentheses any value that is not `0` will evaluate to `true`. This is important to remember as many conditions use this to check things implicitly.

## On Loops

Loops allow for some code to be repeated until some condition becomes false, or some counter elapses.

There are two main loops in C. The first is a `while` loop. This loop repeatedly executes as a block of code until some condition becomes false. It is written as `while` followed by some condition in parentheses, followed by the code to execute in curly brackets.

The second kind of loop is a `for` loop. Rather than a condition, this loop requires three expressions separated by semicolons. These are an **initializer**, a **condition** and an **increment**. The **initializer** is performed before the loop starts. The **condition** is checked before each iteration of the loop. If it is false, the loop is exited. The **increment** is performed at the end of each iteration of the loop. These loops are often used for counting as they are more compact than the `while` loop.

[Next on prompt](interactive-prompt.md)
