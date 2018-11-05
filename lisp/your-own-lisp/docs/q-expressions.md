# Q-Expressions

[docs](http://www.buildyourownlisp.com/chapter10_q_expressions)

codes:

- [q-expressions](../codes/q-expressions.c)

## Adding Features

You'll notice that the following chapters will all follow a similar pattern. This pattern is the typical approach used to add new features to a language. It consists of a number of steps that bring a feature from start to finish. These are listed below, and are exactly what we're going to do in this chapter to introduce a new feature called a Q-Expression.
 
|||
|-|-|
|Syntax|Add new rule to the language grammar for this feature|
|Representation|Add new data type variation to represent this feature|
|Parsing|Add new functions for reading this feature from the **abstract syntax tree**|
|Semantics|Add new functions for evaluating and manipulating this features|

## Quoted Expressions

In this chapter we'll implement a new type of Lisp Value called a Q-Expression.

This stands for **quoted expression**, and is a type of Lisp Expression that is not evaluated by the standard Lisp mechanics. When encountered by the evaluation function Q-expressions are left exactly as they are. This makes them ideal for a number of purposes. We can use them to store and manipulate other Lisp values such as numbers, symbols, or other S-Expressions themselves.

After we've added Q-Expressions we are going to implement a concise set of operators to manipulate them. Like the arithmetic operators these will prove fundamental in how we think about and play with expressions.

The syntax for Q-Expressions is very similar to that of S-Expressions. The only difference is that instead of parenthesis `()` Q-Expressions are surrounded by curly brackets `{}`. We can add this to our grammar as follows.

```c
mpc_parser_t* Number = mpc_new("number");
mpc_parser_t* Symbol = mpc_new("symbol");
mpc_parser_t* Sexpr = mpc_new("sexpr");
mpc_parser_t* Qexpr = mpc_new("qexpr");
mpc_parser_t* Expr = mpc_new("expr");
mpc_parser_t* Lispy = mpc_new("lispy");

mpca_lang(MPCA_LANG_DEFAULT,
    "\
        number: /-?[0-9]+/ ;\
        symbol: '+' | '-' | '*' | '/' ;\
        sexpr: '(' <expr>* ')' ;\
        qexpr: '{' <expr>* '}' ;\
        expr: <number> | <symbol> | <sexpr> | <qexpr> ;\
        lispy: /^/ <expr>* /$/ ;\
    ", Number, Symbol, Sexpr, Qexpr, Expr, Lispy);
    
mpc_cleanup(6, Number, Symbol, Sexpr, Qexpr, Expr, Lispy);
```

## Reading Q-Expressions

Because Q-Expressions are so similar S-Expressions much of their internal behaviour is going to be the same. We're going to reuse our S-Expression data fields to represent Q-Expressions, but we still need to add a separate type to the enumeration, as well as a constructor for this variation.

```c
enum { LVAL_ERR, LVAL_NUM, LVAL_SYM, LVAL_SEXPR, LVAL_QEXPR };

lval* lval_qexpr(void) {
    lval* v = malloc(sizeof(lval));
    v->type = LVAL_QEXPR;
    v->count = 0;
    v->cell = NULL;
    return v;
}
```

To print and delete Q-Expressions we do essentially the same thing as with S-Expressions. We can add the relevant lines to our functions for printing and deletion as follows.

```c
void lval_print(lval* v) {
    switch (v->type) {
        case LVAL_NUM: printf("%li", v->num); break;
        case LVAL_ERR: printf("Error: %s", v->err); break;
        case LVAL_SYM: printf("%s", v->sym); break;
        case LVAL_SEXPR: lval_expr_print(v, '(', ')'); break;
        case LVAL_QEXPR: lval_expr_print(v, '{', '}'); break;
    }
}

void lval_del(lval* v) {
    switch (v->type) {
        case LVAL_NUM: break;
        case LVAL_ERR: free(v->err); break;
        case LVAL_SYM: free(v->sym); break;

        /* If Qexpr or Sexpr then delete all elements inside */
        case LVAL_QEXPR:
        case LVAL_SEXPR:
            for (int i = 0; i < v->count; i++) {
                lval_del(v->cell[i]);
            }
            /* Also free the memory allocated to contain the pointers */
            free(v->cell);
        break;
    }
    
    free(v);
}
```

Using these simple changes we can update our reading function `lval_read` to be able to read in Q-Expressions. Because we reused all the S-Expression data fields for our Q-Expression type, we can also reuse all the of the functions for S-Expressions such as `lval_add`. Therefore to read in Q-Expressions we just need to add a special case for constructing an empty Q-Expression to `lval_read` just below where we detect and create empty S-Expressions from the **abstract syntax tree**. And we also need to update `lval_read` to recognize the curly bracket characters when they appear.

```c
if (strstr(t->tag, "qexpr")) { x = lval_qexpr(); }

// ...


if (strcmp(t->children[i]->contents, "(") == 0) { continue; }
if (strcmp(t->children[i]->contents, ")") == 0) { continue; }
if (strcmp(t->children[i]->contents, "}") == 0) { continue; }
if (strcmp(t->children[i]->contents, "{") == 0) { continue; }
```

Because there is no special method of evaluating Q-Expressions, we don't need to edit any of the evaluation functions. Our Q-Expressions should be ready to try.

## Builtin Functions

We can read in Q-Expressions but they are still useless. We need some way to manipulate them.

For this we can define some built-in operators to work on our list type. Choosing a concise set of these is important. If we implement a few fundamental operations then we can use these to define new operations without add extra C code. There are a few ways to pick these fundamental operators but we'll choose a set that will allow us to do everything we need.

|||
|-|-|
|`list`|Takes one or more arguments and returns a new Q-Expression containing the arguments|
|`head`|Takes a Q-Expression and returns a Q-Expression with only one of the first element|
|`tail`|Takes a Q-Expression and returns a Q-Expression with the first element removed|
|`join`|Takes one or more Q-Expressions and returns a Q-Expression of them conjoined together|
|`eval`|Takes a Q-Expression and evaluates it as if it were a S-Expression|

Like with our mathematical operators we should add these functions as possible valid symbols. Afterward we can go about trying to define their behaviour in a similar way to `builtin_op`.

```c
mpca_lang(
    "\
        number : /-?[0-9]+/ ;                                  \
        symbol : \"list\" | \"head\" | \"tail\"                \
               | \"join\" | \"eval\" | '+' | '-' | '*' | '/' ; \
        sexpr  : '(' <expr>* ')' ;                             \
        qexpr  : '{' <expr>* '}' ;                             \
        expr   : <number> | <symbol> | <sexpr> | <qexpr> ;     \
        lispy  : /^/ <expr>* /$/ ;                             \
    "
, Number, Symbol, Sexpr, Qexpr, Expr, Lispy);
```

## First Attempt

Our builtin functions should have the same interface as `builtin_op`. That means the arguments should be bundled into an S-Expression which the function must use and then delete. They should return a new `lval*` as a result of the evaluation.

The actual functionality of taking the head or tail of an Q-Expression shouldn't be too hard for us. We can make use of the existing functions we've defined for S-Expressions such as `lval_take` and `lval_pop`. But like `builtin_op` we also need to check that the inputs we get are valid.

Let's take a look at `head` and `tail` first. These functions have a number of conditions under which they can't act. First of all we must ensure they are only passed a single argument, and that that argument is a Q-Expression. Then we need to ensure that this Q-Expression isn't empty and actually has some elements.

The `head` function can repeatedly pop and delete the item at index `1` until there is nothing else left in the list.

The `tail` function is even more simple. It can pop and delete the item at index `0`, leaving the tail remaining. An initial attempt at these functions might look like this.

```c
lval* builtin_head(lval* a) {
    if (a->count != 1) {
        lval_del(a);
        return lval_err("Function 'head' passed too many arguments!");
    }
    
    if (a->cell[0]->type != LVAL_QEXPR) {
        lval_del(a);
        return lval_err("Function 'head' passed incorrect types!");
    }
    
    if (a->cell[0]->count == 0 ) {
        lval_del(a);
        return lval_err("Funciton 'head' passed {}!");
    }
    
    lval* v = lval_take(a,0);
    while (v->count > 1) { lval_del(lval_pop(v, 1)); }
    return v;
}

lval* builtin_tail(lval* a) {
    if (a->count != 1) {
        lval_del(a);
        return lval_err("Function 'head' passed too many arguments!");
    }
    
    if (a->cell[0]->type != LVAL_QEXPR) {
        lval_del(a);
        return lval_err("Function 'head' passed incorrect types!");
    }
    
    if (a->cell[0]->count == 0 ) {
        lval_del(a);
        return lval_err("Funciton 'head' passed {}!");
    }
    
    lval* v = lval_take(a,0);
    
    lval_del(lval_pop(v, 1));
    return v;
}
```

## Macros

These `head` and `tail` functions do the correct thing, but the code is pretty unclear, and long. There is so much error checking that the functionality is hard to see. One method we can use to clean it up is to use a **Macro**.

A Macro is a **preprocessor** statement for creating function-like-things that are evaluated before the program is compiled. It can be used for many different things, one of which is what we need to de her, clean up code.

We can design a macro to help with our error conditions called `LASSERT`. Macros are typically given names in capitals to help distinguish them from normal C functions. This marco take in three arguments `args`, `cond` and `err`. It then generates code as shown on the right hand side, but with these variables pasted in at the locations where they are name. This pattern is a good fit for all of our error conditions. 

```c
#define LASSERT(args, cond, err) if (!(cond)) { lval_del(args); return lval_err(err); }
```

We can use this to change how our above functions are written, without actually changing what code is generated by the compiler. This makes it much easier to read for the programmer, and saves a bit of typing. The rest of the error conditions for our functions should become easy to write too!

## Head & Tail

Using this our `head` and `tail` functions are defined as follows. Notice how much clearer their real functionality is. 

```c
lval* builtin_head(lval* a) {
    LASSERT(a, a->count == 1, "Function 'head' passed too many arguments!");
    
    LASSERT(a, a->cell[0]->type == LVAL_QEXPR, "Function 'head' passed incorrect type!");
    
    LASSERT(a, a->cell[0]->count != 0, "Function 'head' passed {}!");
    
    lval* v = lval_take(a, 0);
    while (v->count > 1) { lval_del(lval_pop(v, 1)); }
    return v;
}

lval* builtin_tail(lval* a) {
    LASSERT(a, a->count == 1, "Function 'head' passed too many arguments!");
    
    LASSERT(a, a->cell[0]->type == LVAL_QEXPR, "Function 'head' passed incorrect type!");
    
    LASSERT(a, a->cell[0]->count != 0, "Function 'head' passed {}!");
    
    lval* v = lval_take(a, 0);
    lval_del(lval_pop(v, 0));
    return v;
}
```

## List & Eval 

The `list` function is simple. It just converts the input S-Expression to a Q-Expression and returns it.

The `eval` function is similar to the converse. It takes as input some single Q-Expression, which it converts to an S-Expression, and evaluates using `lval_eval`.

```c
lval* builtin_list(lval* c) {
    a->type = LVAL_QEXPR;
    return a;
}

lval* builtin_eval(lval* a) {
    LASSERT(a, a->count == 1, "Function 'eval' passed too many arguments!");
    
    LASSERT(a, a->cell[0]->type == LVAL_QEXPR, " Function 'eval' passed incorrect type!");
    
    lval* x = lval_take(a, 0);
    x->type = LVAL_SEXPR;
    return lval_eval(x);
}
```

## Join

Unlike the others, it can take multiple arguments, so its structure looks somewhat more like that of `builtin_op`. First we check that all of the arguments are Q-Expressions and then we join them together one by one. To do this we use the function `lval_join`. This works by repeatedly popping each item from `y` and adding it to `x` until `y` is empty. It then deletes y and returns `x`.

```c
lval* lval_join(lval* x, lval* y) {
    while (y->count) {
        x = lval_add(x, lval_pop(y, 0));
    }
    lval_del(y);
    return x;
}

lval* builtin_join(lval* a) {
    for (int i = 0; i < a->count; i++) {
        LASSERT(a, a->cell[i]->type == LVAL_QEXPR, "Function 'join' passed incorrcet type.");
    }
    
    lval* x = lval_pop(a, 0);
    while (a->count) {
        x = lval_join(x, lval_pop(a,0));
    }
    lval_del(a);
    return x;
}
```

## Builtins Lookup

We've now got all of our builtin functions defined. We need to make a function that can call the correct one depending on what symbol it encounters in evaluation. We can do this using `strcmp` and `strstr`.

```c
lval* builtin(lval* a, char* func) {

    if(strcmp("list", func) == 0) { return builtin_list(a); }
    if(strcmp("head", func) == 0) { return builtin_head(a); }
    if(strcmp("tail", func) == 0) { return builtin_tail(a); }
    if(strcmp("join", func) == 0) { return builtin_join(a); }
    if(strcmp("eval", func) == 0) { return builtin_eval(a); }
    if(strstr("+-/*", func)) { return builtin_op(a, func); }
    lval_del(a);
    return lval_err("Unknown Function!");
}
```

Then we can change our evaluation line in `lval_eval_sexpr` to call `builtin` rather than `builtin_op`.

```c
lval* result = builtin(v, f->sym);
lval_def(f);
return result;
```

[Next on Variables](variables.md)
