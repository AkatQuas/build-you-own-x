# S-Expressions

[docs](http://www.buildyourownlisp.com/chapter9_s_expressions)

codes:

- [s-expressions](../codes/s-expressions.c)

## Lists and Lisps

Lisps are famous for having little distinction between data and code. They use the same structures to represent both. This allows them to do many powerful things which other languages cannot do. If we want this power for our programming language we're going to have to separate out the process of **reading** input, and **evaluating** the input we have stored.

To store the program we will need to create an internal list structure that is built up recursively of numbers, symbols, and other lists. In Lisp,  this structure is commonly called an S-Expression standing for **Symbolic Expression**. We will extend our `lval` structure to be able to represent it. The evaluation behaviour of S-Expressions is the behaviour typical of Lisps, that we are used to so far. To evaluate an S-Expression we look at the first item in the list, and take this to be the operator. We then look at all the other items in the list, and take these as operands to get the result.

By introducing S-Expressions we'll finally be entering the world of Lisp.

## Pointers

In C no concept of lists can be explored without dealing properly with pointers. Pointers are a famously misunderstood aspect of C. They are difficult to teach because while being conceptually very simple, they come with a lot of new terminology, and often no clear use-case. This makes them appear far more monstrous than they are. Luckily for us, we have a couple of ideal use-cases, both of which are extremely typical in C, and will likely end up being how you use pointers 90% of the time.

The reason we need pointers in C is because of how function calling works. When you call a function in C the arguments are always passed **by value**. This means **a copy** of them is passed to the function you call. This is true for `int`, `long`, `char`, and user-defined `struct` types such as `lval`. Most of the time this is great but occasionally it can cause issues.

A common problem occurs when we have a large struct containing many other sub structs we wish to pass around. Every time we call a function we must create another copy of it. Suddenly the amount of data that needs to be copied around just to call a function can become huge!

A second problem is that when we define a `struct`, it is always a fixed size. It has a limited number of fields, and each field is itself a fixed size. If F want to call a function with just **a list of things**, where the number of **things** varies from call to call, clearly I can't use a `struct` to do this.

To get around these issues the developers of C came up with a clever idea. They imagined computer memory as a single huge list of bytes. In this list each byte can be given a global index, or position. A bit like a house number. The first byte is numbered `0`, the second is `1`, etc.

In this case, all the data in the computer, including the structs and variables used in currently running program, start at some index in this huge list. If, rather than copying the data itself to a function, we instead copy a number representing the **index** at where this data starts, the function being called can look up any amount data it wants.

By using **address** instead of the actual data, we can allow a function to access and modify some location in memory without having to copy any data. Functions can also use pointers to do other stuff, like output data to some address given as input.

Because the total size of computer memory is fixed, the number of bytes needed to represent an address is always the same. But if we keep track of it, the number of bytes the address points to can grow and shrink. This means we can create a variable sized data-structure and still **pass** it to a function, which can inspect and modify it.

So a pointer is just a number. A number representing the starting index of some data in memory. The type of the pointer hints to us, and the compiler, what type of data might be accessible at this location.

We can declare pointer types by suffixing existing ones with the `*` character. We've seen some examples of this already with `mpc_parser_t*`, `mpc_ast_t*`, or `char*`.

To create a pointer to some data, we need to get its index, or **address**. To get the address  of some data we use the **address of operator** `&`. 

Finally to get the data at an address, called **dereferencing**, we use the `*` operator on the left-hand side of a variable. To get the data at the field of a pointer to a struct we use the arrow `->`.

## The Stack & The Heap

The memory can be visualised of as one long list of bytes. Actually it is bettor to imagine it split into two sections. These sections are called **The Stack** and **The Heap**.

In essence they are just two sections of memory used for two different tasks.

### The Stack

The Stack is the memory where your program lives. It is where all of your temporary variables and data structures exist as you manipulate and edit them. Every time you call a function a new area of the stack is put aside for it to use. Into this area are put local variables, copies of any arguments passed to the function, as well as some bookkeeping data such as who the caller was, and what to do when finished. When the function is done the area is used is unallocated, ready for use again by someone else.

### The Heap

The Heap is a section of memory put aside for storage of objects with a longer lifespan. Memory in this area has to be manually allocated and deallocated. To allocate new memory the `malloc` function is used. This function takes as input the number of bytes required, and returns back a pointer to a new black of memory with that many bytes set aside.

When done with the memory at that location it must be released again. To do this the pointer received from `malloc` should be passed to the `free` function. Using the Heap is trickier than the Stack because it requires the programmer to remember to call `free` and to call it correctly. If not, the program may continuously allocate more and more memory. This is called a **memory leak**. An easy rule to avoid this is to ensure for each `malloc` there is a corresponding (and only one corresponding) `free`. 

## Parsing Expressions

We need to update our parser to make it suitable for S-Expressions. The syntax for S-Expressions is simple. It is just a number of other Expressions between parentheses, where an Expression can be a Number, Operator, or other S-Expression. We can modify our existing parse rules to reflect this. We also are going to rename our `operator` rule to `symbol`. This is in anticipation of adding more operators, variables and functions later.

```c
mpc_parser_t* Number = mpc_new("number");
mpc_parser_t* Symbol = mpc_new("symbor");
mpc_parser_t* Sexpr = mpc_new("sexpr");
mpc_parser_t* Expr = mpc_new("expr");
mpc_parser_t* Lispy = mpc_new("lispy");

mpca_lang(MPCA_LANG_DEFAULT,
    "\
    number : /-?[0-9]+/;\
    symbol :  '+' | '-' | '*' | '/' ;\
    sexpr : '(' <expr>* ')' ;\
    expr : <number> | <symbol> | <sexpr> ; \
    lispy: /^/ <expr>* /$/; \
    ",
    Number, Symbol, Sexpr, Expr, Lispy);
     
...

mpc_cleanup(5, Number, Symbol, Sexpr, Expr, Lispy);
```

## Expression Structure

We need a way to store S-Expressions as `lval`. This means we'll also need to store **Symbols** and **Numbers**. We're going to add two new `lval` types to the `enum`. The first is `LVAL_SYM`, which we're going to use to represent operators such as `+`. The second new type is `LVAL_SEXPR` which is going to be used to represent S-Expressions.

```c
enum { LVAL_ERR, LVAL_NUM, LVAL_SYM, LVAL_SEXPR };
```

S-Expressions are variable length **lists** of values. We are going to create a pointer field `cell` which points to a location where we store a list of `lval*`. More specifically pointers to the other individual `lval`. Our field should there fore be a double pointer type `lval**`. A pointer to `lval` pointers. We will also need to keep track of how many `lval*` are in this list, so we add an extra field `count` to record this.

To represent symbols we're going to use a string. We're also going to change the representation of errors to a string. This means we can store a unique error message rather than just an error code. This will make our error reporting better and more flexible, and we can get rid of the original error `enum`. The updated `lval` struct looks like this:

```c
typedef struct lval {
    int type;
    long num;
    char* err;
    char* sym;
    int count;
    struct lval** cell;
} lval;
```

The new definition of `lval` needs to contain a reference to itself. This means we have to slightly change tow it is defined. Before we open the curly brackets we can put the name of the struct, and then refer to this inside the definition using `struct lval`. Even though a struct can refer to its own type, it must only contain pointers to its own type, not its own type directly. Otherwise the size of the struct would refer to itself, and grow infinite in size when you tried to calculate it!

>
> Are there ever pointers to pointers to pointers?
>
> There is an old programming joke which says you can rate C programmers by how many stars are on their pointers.
> 
> Beginner's programs might only use `char*` or the odd `int*`, so they were called **one star programmers**. Most intermediate programs contain double pointer types such as `lval**`. These programmers are therefore called **two star programmers**. To spot a triple pointer is something special. You would be viewing the work of someone grand and terrible, writing code not meant to be read with mortal eyes. As such being called **three star programmer** is rarely a compliment.
> 

## Constructors && Destructors

We can change our `lval` construction functions to return pointers to an `lval`, rather than one directly. This will make keeping track of `lval` variables easier. For this we need to use `malloc` with the `sizeof` function to allocate enough space for the `lval` struct, and then to fill in the fields with the relevant information using the arrow operator `->`.

When we construct `lval` its fields may contain pointers to other things that have been allocated on the heap. This means we need to be careful. Whenever we are finished with an `lval` we also need to delete the things in points to on the heap. We'll have to make a rule for ourselves. Whenever we free the memory allocated for an `lval`, we also free all the things it points to.

```c
/* Construct a pointer to a new Number lval */
lval* lval_num(long x) {
    lval* v = malloc(sizeof(lval));
    v->type = LVAL_NUM;
    v->num = x;
    return v;
}

/* Construct a pointer to a new Error lval */
lval* lval_err(char* m) {
    lval* v = malloc(sizeof(lval));
    v->type = LVAL_ERR;
    v->err = malloc(strlen(m)+1);
    strcpy(v->err, m);
    return v;
}

/* Construct a pointer to a new Symbol lval */
lval* lval_sym(char *s) {
    lval* v = malloc(sizeof(lval));
    v->type = LVAL_SYM;
    v->sym = malloc(strlen(s)+1);
    strcpy(v->sym, s);
    return v;
}

/* A pointer to a new empty Sexpr lval */
lval* lval_sexpr(void) {
    lval* v = malloc(sizeof(lval));
    v->type = LVAL_SEXPR;
    v->count = 0;
    v->cell = NULL;
    return v;
}
```

> `NULL` is a special constant that points to memory location `0`. In many places it is used as a convention to signify some non-value or empty data. Above we use it to specify that we have a data pointer, but that is doesn't point to any number of data items.
>
> What about the `strlen(s)+1`? In C strings are **null terminated**. This means that the final character of them is always the zero character `\0`. This is a convention in C to signal the end of a string. It is important that all strings are stored this way otherwise programs will break in nasty ways.
> The `strlen` function only returns the number of bytes in a string `excluding` the null terminator. This is why we need to add one, to ensure there is enough allocated space for it all!

We now need a special function to delete `lval*`. This should call `free` on the pointer itself to release the memory acquired from `malloc`, but more importantly it should inspect the type of the `lval`, and release any memory pointed to by its `lval_del` we can ensure we will get no memory leaks.

```c
void lval_del(lval* v) {
    switch (v->type) {
        /* Do nothing special for number type */
        case LVAL_NUM: break;
        
        /* For Err or Sym free the string data */
        case LVAL_ERR: free(v->err); break;
        case LVAL_SYM: free(v->sym); break;
        
        /* If Sexpr then delete all elements inside */
        case LVAL_SEXPR:
            for (int i = 0; i < v->count; i++) {
                lval_del(v->cell[i]);
            }
            free(v->cell); break;
    }
    free(v);
}
```

## Reading Expressions

First we are going to **read** in the program and construct an `lval*` that represents it all. Then we are going to `evaluate` this `lval*` to get the result of our program. This first stage should convert the **abstract syntax tree** into an S-Expression, and the second stage should evaluate this S-Expression using our normal Lisp rules.

To complete the first stage we can recursively look at each node of the tree, and construct different `lval*` types depending on the `tag` and `contents` fields of the node.

If the given node is tagged as a `number` or `symbol`, then we use our constructors to return an `lval*` directly for those types. If the given node is the `root`, or an `expr`, then we create an empty S-Expression `lval` and slowly add each valid sub-expression contained in the tree.

To add an element to an S-Expression we can create a function `lval_add`. This function increases the count of the Expression list by one, and then uses `realloc` to reallocate the amount of space required by `v->cell`. This new space can be used to store the extra `lval*` required. Using this new space it sets the final value of the list with `v->cell[v->count-1]` to the value `lval* x` passed in.

```c
lval* lval_read_num(mpc_ast_t* t) {
    errno = 0;
    long x = strtol(t->contents, NULL, 10);
    return errno != ERANGE ? lval_num(x) : lval_err("Invalid number");
}

lval* lval_read(mpc_ast_t* t) {
    /* If symbol or number return conversion to that type */
    if (strstr(t->tag, "number")) { return lval_read_num(t); }
    if (strstr(t->tag, "symbol")) { return lval_sym(t->contents); }
    
    /* If root (>) or sexpr then create empty list */
    lval* x = NULL;
    if (strcmp(t->tag, ">") == 0) { x = lval_sexpr(); }
    if (strstr(t->tag, "sexpr")) { x = lval_sexpr(); }
    
    /* Fill this list with any valid expression contained within */
    for (int i = 0; i < t->children_num; i++ ) {
        if (strcmp(t->children[i]->contents, "(") == 0) { continue; }
        if (strcmp(t->children[i]->contents, ")") == 0) { continue; }
        if (strcmp(t->children[i]->tag, "regex") == 0) { continue; }
        
        x = lval_add(x, lval_read(t->children[i]));
    }
    
    return x;
}

lval* lval_add(lval* v, lval* x) {
    v->count++;
    v->cell = realloc(v->cell, sizeof(lval*) * v->count);
    v->cell[v->count - 1] = x;
    return v;
}
```

## Printing Expressions

We are now so close to trying out all ouf our new changes. We need to modify our print function to print out S-Expressions types. Using this we can double check that the **reading** phase is working correctly by printing out the S-Expressions we read in and verifying they match those we input.

To print out S-Expressions we can create another function that loops over all the sub-expressions of an expressions and prints these individually separated by spaces, in the same way they are input.

```c
void lval_expr_print(lval* v, char open, char close) {
    putchar(open);
    for (int i = 0; i < v->count; i++) {
        /* Print value contained within */
        lval_print(v->cell[i]);
        
        /* Don't print trailing space if last element */
        if (i != (v->count - 1 ) {
            putchar(' ');
        }
    }
    putchar(close);
}

void lval_print(lval* v) {
    switch (v->type) {
        case LVAL_NUM: printf("%li", v->num); break;
        case LVAL_ERR: printf("ERROR: %s", v->err); break;
        case LVAL_SYM: printf("%s", v->sym); break;
        case LVAL_SEXPR: lval_expr_print(v, '(', ')'); break;
    }
}

void lval_println(lval* v) { lval_print(v); putchar('\n'); }
```

In the main loop, we can remove the evaluation for now, and instead try reading in the result and printing out what we have read.

```c
lval* x = lval_read(r.output);
lval_println(x);
lval_del(x);
```

## Evaluating Expressions

The behaviour of the evaluation function is largely the same as before. we need to adapt it to deal with `lval*` and our more relaxed definition of what constitutes an expression. We can think of our evaluation function as a kind of transformer. It takes in some `lval*` and transforms it in some way to some new `lval*`. In some cases it can just return exactly the same thing. In other cases it may modify the input `lval*` and return it. In many cases it will delete the input, and return something completely different. If we are going to return something new we must always remember to delete the `lval*` we get as input.

For S-Expressions we first evaluate all teh children of the S-Expression. If any of these children are errors we return the first error we encounter using a function we'll define later called `lval_take`.

If the S-Expression has no children we just return it directly. This corresponds to the empty expressions, denoted by `()`. We also check for single expressions. These are expressions with only one child such as `(5)`. In this case we return the single expression contained within the parenthesis.

If neither of these are the case we know have a valid expression with more than one child. In this case we separate the first element of the expression using a function we'll define later called `lval_pop`. we then check this is a **symbol** and not anything else. If it is a symbol we check what symbol it is, and pass it, and the arguments, to a function `builtin_op` which does our calculations. If the first element is not a symbol we delete it, and the values passed into the evaluation function, returning an error.

To evaluate all other types we just return them directly back.

```c
lval* lval_eval_sexpr(lval* v) {
    /* Evaluate Children */
    for (int i = 0; i < v->count; i++ ) {
        v->cell[i] = lval_eval(v->cell[i]);
    }
    
    /* Error Checking */
    for (int i = 0; i < v-> count; i++ ) {
        if (v->cell[i]->type == LVAL_ERR) { return lval_take(v, i); }
    }
    
    /* Empty Expression */
    if (v->count == 0) { return v; }
    
    /* Single Expression */
    if (v->count == 1) { return lval_take(v, 0); }
    
    /* Ensure First Element is Symbol */
    lval* f = lval_pop(v, 0);
    if (f->type != LVAL_SYM) {
        lval_del(f);
        lval_del(v);
        return lval_err("S-expression does not start with symbol!");
    }
    
    /* Call builtin with operator */
    lval* result = builtin_op(v, f->sym);
    lval_del(f);
    return result;
}

lval* lval_eval(lval* v) {
    /* Evaluate Sexpressions */
    if (v->type = LVAL_SEXPR) { return lval_eval_sexpr(v); }
       
    /* All other lval types remain the same */
    return v;
}
```

There are two functions we've used and not defined in the above code. These are `lval_pop` and `lval_take`. These are general purpose functions for manipulating S-Expression `lval` types which we'll make use of here and in the future.

The `lval_pop` function extracts a single element from an S-Expression at index `i` and shifts the rest of the list backward so that it no longer contains that `lval*`. It then returns the extracted value. Notice that it doesn't delete the input list. It is like taking an element from a list and popping it out, leaving what remains. This means both the element popped and the old list need to be deleted at some point with `lval_del`.

The `lval_take` function is similar to `lval_pop` but it deletes the list it has extracted the element from. This is like taking an element from the list and deleting the rest. It is a slight variation on lval_pop but it makes our code easier to read in some places. Unlike `lval_pop`, only the expression you take from the list needs to be deleted by `lval_del`.

```c
lval* lval_pop(lval* v, int i) {
    /* Find the item at "i" */
    lval* x = v->cell[i];
    
    /* Shift memory after the item at "i" over the top */
    memmove(&v->cell[i], &v->cell[i+1], sizeof(lval*) * (v->count-i-1);
    
    /* Decrease the count of items in the list */
    v->count--;
    
    /* Reallocate the memory used */
    v->cell = realloc(v->cell, sizeof(lval*) * v->count);
    
    return x;
}

lval* lval_take(lval* v, int i) {
    lval* x = lval_pop(v, i);
    lval_del(v);
    return x;
}
```

We also need to define the evaluation function `builtin_op`. This is like the `eval_op` function used in our previous chapter but modified to take a single `lval*` representing a list of all the arguments to operate on. It needs to do some more rigorous error checking. If any of the inputs are a non-number `lval*` we need to return an error.

First it checks that all the arguments input are numbers. It then pops the first argument to start. If there are no more sub-expressions and the operator is subtraction it performs unary negation on this first number. This makes expressions such as `(- 5)` evaluate correctly.

If there are more arguments it constantly pops the next one from the list and performs arithmetic depending on which operator we're meant to be using. If a zero is encountered on division it deletes the temporary `x`, `y`, and the argument list `a`, and returns an error.

If there have been no errors the input arguments are deleted and then new expression returned.

```c
lval* builtin_op(lval* a, char* op) {
    /* Ensure all arguments are numbers */
    for (int i = 0; i < a->count; i++ ) {
        if (a->cell[i]->type != LVAL_NUM) {
            lval_del(a);
            return lval_err("Cannot operator on non-number!");
        }
    }
    
    /* Pop the first element */
    lval* x = lval_pop(a, 0);
    
    /* If no arguments and sub then perform unary negation */
    if (strcmp(op,  "-") == 0 && a->count == 0 ) {
        x->num = -x->num;
    }
    
    /* While there are still elements remaining */
    while (a->count > 0) {
        /* Pop the next element */
        lval* y = lval_pop(a, 0);
        if (strcmp(op, "+") == 0) { x->num += y->num; }
        if (strcmp(op, "-") == 0) { x->num -= y->num; }
        if (strcmp(op, "*") == 0) { x->num *= y->num; }
        if (strcmp(op, "/") == 0) {
            if (y->num == 0) {
            lval_del(x); lval_del(y);
            x = lval_err("Division By Zero!"); break;
            }
            x->num /= y->num;
        }
    
        lval_del(y);
    } 
    lval_del(a);
    return x;
}
```

This completes our evaluation functions. We just need to change `main` again so it passes the input through this evaluation before printing it.

```c
lval* x = lval_eval(lval_read(r.output));
lval_println(x);
lval_del(x);
```

[Next on Q-Expressions](q-expressions.md)
