# Conditionals

[document](http://www.buildyourownlisp.com/chapter13_conditionals)

codes: 

- [conditionals.c](../codes/conditionals.c)

This is a fairly short chapter and essentially consists of adding a couple of new builtin functions to deal with comparison and ordering.

Define some new builtin functions for **greater than**, **less than**, **equal to** and all the other comparison operators we use in C.

Try to define an `if` function that tests for some condition and then either evaluate some code, or some other code, depending on the result.

## Ordering

For simplicity's sake I'm going to re-use the number data type to represent the result of comparisons. I'll make a rule similar to C, to say that any number that isn't `0` evaluates to true in an `if` statement, while `0` always evaluates to false.

Therefore our ordering functions are a little like a simplified version of the arithmetic functions. They'll only work on numbers, and we only want them to work on two arguments.

If these error conditions are met the maths is simple. We want to return a number `lval` either `0` or `1` depending on the equality comparison between the two input `lval`. We can use C's comparison operators to do this. Like the arithmetic functions we'll make use of a single function to do all of the comparisons.

First we check the error conditions, then we compare the numbers in each of the arguments to get some result. Finally we return this result as a number value.

```c
lval* builtin_ord(lenv* e, lval* a, char* op) {
    LASSERT_NUM(op, a, 2);
    LASSERT_TYPE(op, a, 0, LVAL_NUM);
    LASSERT_TYPE(op, a, 1, LVAL_NUM);
    
    int r;
    if (strcmp(op, ">") == 0) {
        r = ( a->cell[0]->num > a->cell[1]->num );
    }
    if (strcmp(op, "<") == 0) {
        r = ( a->cell[0]->num < a->cell[1]->num );
    }
    if (strcmp(op, ">=") == 0) {
        r = ( a->cell[0]->num >= a->cell[1]->num );
    }
    if (strcmp(op, "<=") == 0) {
        r = ( a->cell[0]->num <= a->cell[1]->num );
    }
    
    lval_del(a);
    return lval_num(r);
}

lval* builtin_gt(lenv* e, lval* a) {
    return builtin_ord(e, a, ">");
}

lval* builtin_lt(lenv* e, lval* a) {
    return builtin_ord(e, a, "<");
}

lval* builtin_ge(lenv* e, lval* a) {
    return builtin_ord(e, a, ">=");
}

lval* builtin_le(lenv* e, lval* a) {
    return builtin_ord(e, a, "<=");
}
```

## Equality

Equality is going to be different to ordering because we want it to work on more than number types. It will be useful to see if an input is equal to an empty list, or to see if two functions passed in are the same. Therefore we need to define a function which can test for equality between two different types of `lval`.

This function essentially checks that all the field which make up the data for a particular `lval` type are equal. If all the fields are equal, the whole thing is considered equal. Otherwise if there are any differences the whole thing is considered unequal.

```c
int lval_eq(lval* x, lval* y) {
    if (x->type != y->type) { return 0; }
    
    switch (x->type) {
        case LVAL_NUM: return (x->num == y->num);
        
        case LVAL_ERR: return (strcmp(x->err, y->err) == 0);
        case LVAL_SYM: return (strcmp(x->sym, y->sym) == 0);
        
        case LVAL_FUN:
            if (x->builtin || y->builtin) {
                return (x->builtin == y->builtin);
            } else {
                return lval_eq(x->formals, y->formals) && lval_eq(x->body, y->body);
            }
        
        case LVAL_QEXPR:
        case LVAL_SEXPR:
            if (x->count != y->count) { return 0; }
            for (int i=0; i < x->count; i++) {
                if (!lval_eq(x->cell[i], y->cell[i])) { return 0; }
            }
            return 1;
        break;
    }
    
    return 0;
}
```

Using this function the new builtin function for equality comparison is very simple to add. We simple ensure two arguments are input, and that they are equal. We store the result of the comparison into a new `lval` and return it.


```c
lval* builtin_cmp(lenv* e, lval* a, char* op) {
    LASSERT_NUM(op, a, 2);
    
    int r;
    
    if (strcmp(op, "==") == 0) {
        r = lval_eq(a->cell[0], a->cell[1]);
    }
    if (strcmp(op, "!=") == 0) {
        r = !lval_eq(a->cell[0], a->cell[1]);
    }
    lval_del(a);
    return lval_num(r);
}

lval* builtin_eq(lenv* e, lval* a) {
    return builtin_cmp(e, a, "==");
}

lval* builtin_ne(lenv* e, lval* a) {
    return builtin_cmp(e, a, "!=");
}
```

## If Function

To make the comparison operators useful we'll need an `if` function. This function is a little like the ternary operation in C. Upon some condition being true it evaluates to one thing, and if the condition is false, it evaluates to another.

We can again make use of Q-Expressions to encode a computation. First we get the user to pass in the result of a comparison, then we get the user to pass in two Q-Expressions representing the code to be evaluated upon a condition being either true or false.

```c
lval* builtin_if(lenv* e, lval* a) {
    LASSERT("if", a, 3);
    LASSERT_TYPE("if", a, 0, LVAL_NUM);
    LASSERT_TYPE("if", a, 1, LVAL_QEXPR);
    LASSERT_TYPE("if", a, 2, LVAL_QEXPR);
    
    lval* x;
    a->cell[1]->type = LVAL_SEXPR;
    a->cell[2]->type = LVAL_SEXPR;
    
    if (a->cell[0]->num) {
        x = lval_eval(e, lval_pop(a, 1));
    } else {
        x = lval_eval(e, lval_pop(a, 2));
    }
    
    lval_del(a);
    
    return x;
}   

// don't forget to register all of these builtins
lenv_add_builtin(e, "if", builtin_if);
lenv_add_builtin(e, "==", builtin_eq);
lenv_add_builtin(e, "!=", builtin_ne);
lenv_add_builtin(e, ">",  builtin_gt);
lenv_add_builtin(e, "<",  builtin_lt);
lenv_add_builtin(e, ">=", builtin_ge);
lenv_add_builtin(e, "<=", builtin_le);
```

## Recursive Functions

By introducing conditionals we've actually made the language a lot more powerful. This is because they effectively let us implement recursive functions.

Recursive functions are those which call themselves. We've used these already in C to perform reading in and evaluation of expressions. The reason we require conditionals for these is because they let us test for the situation where we wish to terminate the recursion.

For example we can use conditionals to implement a function `len` which tells us the number of items in a list. If we encounter the empty list we just return `0`. Otherwise we return the length of the `tail` of the input list, plus `1`. It repeatedly uses the `len` function until it reaches the empty list. At this point it returns `0` and adds all the other partial results together.

```c
(fun {len l} {
    if ( == l {}) 
        {0}
        {+ 1 (len (tail l)}
})
```

Just as in C, there is a pleasant symmetry to this sort of recursive function. First we do something for the empty list (the base case). Then if we get something bigger, we take off a chunk such as the head of the list, and do something to it, before combining it with the rest of the thing to which the function has been already applied.

[Next on Strings](strings.md)
