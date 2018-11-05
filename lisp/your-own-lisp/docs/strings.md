# Strings

[documents](http://www.buildyourownlisp.com/chapter14_strings)

codes:

- [strings.c](../codes/strings.c) 

## Libraries

Now the Lisp is fully functional in the terminal. In this chapter, we'll add the functionality to load code from a file and run it. This will allow us to start building up a standard library up. Along the way we'll also add support for code comments, strings, and printing.

## String Type

For the user to load a file we'll have to let them supply a string consisting of the file name, which can include spaces and other characters. We nee to add this possible `lval` type to specify the file names we need.

```c
enmu { LVAL_ERR, LVAL_NUM, LVAL_SYM, LVAL_STR, LVAL_FUN, LVAL_SEXPR, LVAL_QEXPR };

struct lval {
    //...
    long num;
    char* err;
    char* sym;
    char* str;
    //...
};

lval* lval_str(char* s) {
    lval* v = malloc(sizeof(lval));
    v->type = LVAL_STR;
    v->str = malloc(strlen(s) + 1);
    strcpy(v->str, s);
    return v;
}
```

We also need to add relevant entries into the functions that deal with `lval`.

```c
// for deletion
case LVAL_STR: free(v->str); break;

// for copying
case LVAL_STR: x->str = malloc(strlen(v->str) + 1);
            strcpy(x->str, v->str); break;

// for equality
case LVAL_STR: return ( strcmp(x->str, y->str) == 0);

// for type name
case LVAL_STR: return "string";

// for print
case LVAL_STR: lval_print_str(v); break;
```

For Printing we need to do a little more. The string we store internally is different to the string we want to print. We want to print a string as a user might input it, using escape characters such as `\n` to represent a new line.

We therefore need to escape it before we print it. Luckily we can make use of a `mpc` function that will do this for us.

```c
void lval_print_str(lval* v) {
    char* escaped = malloc(strlen(v->str)+1);
    strcpy(escaped, v->str);
    
    escaped = mpcf_escape(escaped);
    
    printf("\"%s\"", escaped);
    
    free(escaped);
}
```

## Reading Strings

Now we need to add support for parsing strings. As usual this requires first adding a new grammar rule called `string` and adding it to the parser.

The rule we are going to use that represents a string is going to be the same as for C style strings. This means a string is essentially series of escaped characters, or normal characters, between twe quotation marks `""`. We can specify this as a regular expression inside the grammar string as follows.

    string: /\"(\\\\.|[^\"])*\"/;  //???

This looks complicated but makes a lot more sense when explained in parts. A string is a `"` character, followed by zero or more of either a backslash `\\` followed by any other character `.`, or anything this isn't a `"`, character `[^\"]`. Finally it ends with another `"` character.

We also need to add a case to deal with this in the `lval_read` function.

    if (strstr(t->tag, "string")) { return lval_read_str(t); }

Because the input string is input in an escaped from we need to create a function `lval_read_str` which deals with this. This function is a little tricky because it has to do a few tasks. First it must strip the input string of the `"` characters on either side. Then it must unescape the string, converting series of characters such as `\n` to their actual encoded characters. Finally it has to create a new `lval` and clean up anything that has happened in-between.

```c
lval* lval_read_str(mcp_ast_t* t) {
    /* Cut off the final quote character */
    t->contents[strlen(strlen(t->contents) -1] = '\0';
    /* Copy the string missing out the first quote character */
    char* unescaped = malloc(strlen(t->contents+1) + 1); // ??
    strcpy(unescaped, t->contents+1);
    unescaped = mpcf_unescape(unescaped);
    lval* str = lval_str(unescaped);
    free(unescaped);
    return str;
}
```


## Comments

While we're building in new syntax to the language we may as well look at comments.

Just like in C, we can use comments in inform other people (or ourselves) about what the code is meant to do or why it has been written. In C comments go between `/*` and `*/`. Lisp comments, on the other hand, start with `;` and run to the end of the line.

I attempted to research why Lisps use `;` for comments, but it appears that the origins of this have been lost in the mists of time. I imagine it as a small rebellion against the imperative languages such as C and Java which use semicolons so shamelessly and frequently to separate/terminate statements. Compared to Lisp all these languages are just comments.

So in lisp a comment is defined by a semicolon `;` followed by any number of characters that are not newline characters represented by either `\r` or `\n`. We can use another regex to define it.

    comment : /;[^\\r^\\n]*/;

As with strings we need to create a new parser and use this to update the language in `mpca_lang`. We also need to remember to add the parser to `mpc_cleanup`, and update the first integer argument to reflect the new number of parsers passed in.

```c
mpca_lang( MPCA_LANG_DEFAULT,
    "
        number: /-?[0-9]+/; \
        symbol: /[a-zA-Z0-9_+\\-*\\/\\\\=<>!&]+/; \
        string: /\"(\\\\.|[^\"])*\"/; \
        comment: /;[^\\r\\n]*/; \
        sexpr: '(' <expr>* ')'; \
        qexpr: '{' <expr>* '}'; \
        expr: <number> | <symbol> | <string> | <comment> | <sexpr> | <qexpr> ; \
        lispy: /^/ <expr> * /$/; \
    ", 
    Number, Symbol, String, Comment, Sexpr, Qexpr, Expr, Lispy);

mpc_cleanup(8, Number, Symbol, String, Comment, Sexpr, Qexpr, Expr, Lispy);
```

Because comments are only for programmers reading the code, our internal function for reading them in just consists of ignoring them. We can add a clause to deal with them in a similar way to brackets and parenthesis in `lval_read`.

    if (strstr(t->children[i]->tag, "comment")) { continue; }

## Load Function

We want to built a function that can load and evaluate a file when passed a string of its name. To implement this function we'll need to make use of the grammar as we'll need ti to read in the file contents, parse, and evaluate them. The load function is going to rely on the `mpc_parser*` called `Lispy`.

Therefore, just like with functions, we need to forward declare the parser pointers, and place them at the top of the file.

```c
mpc_parser_t* Number;
mpc_parser_t* Symbol;
mpc_parser_t* String;
mpc_parser_t* Comment;
mpc_parser_t* Sexpr;
mpc_parser_t* Qexpr;
mpc_parser_t* Expr;
mpc_parser_t* Lispy;
```

The `load` function will just like any other builtin. We need to start by checking that the input argument is a single string. Then we can use the `mpc_parse_contents` function to read in the contents of a file using a grammar. Just like `mpc_parse` this parses the contents of a file into some `mpc_result` object, which in our case is an **abstract syntax tree** again or an **error**.

Slightly differently to the command prompt, on successfully parsing a file we shouldn't treat it like on expression. When typing into a file we let users list multiple expressions and evaluate all of them individually. To achieve this behaviour we need to loop over each expression in the contents of the file and evaluate it one by one. If there are any errors we should print them and continue.

If there is a parse error we're going to extract the message and put it into a error `lval` which we return. If there are no errors the return value for this builtin can just be the empty expression. The full code for this:

```c
lval* builtin_load(lenv* e, lval* a) {
    LASSERT_NUM("load", a, 1);
    LASSERT_TYPE("load", a, 0, LVAL_STR);
    
    /* Parse File given by string name*/
    mpc_result_t r;
    if (mpc_parse_contents(a->cell[0]->str, Lispy, &r)) {
        lval* expr = lval_read(r.output);
        mpc_ast_delete(r.output);
        while (expr->count) {
            lval* x = lval_eval(e, lval_pop(expr, 0));
            if (x->type == LVAL_ERR) { lval_println(x); }
            lval_del(x);
        }
        lval_del(expr);
        lval_del(a);
        return lval_sexpr();
    } else {
        char* err_msg = mpc_err_string(r.error);
        mpc_err_delete(r.error);
        
        lval* err = lval_err("could not load library %s", err_msg);
        free(err_msg);
        lval_del(a);
        
        return err;
    }
}
```

## Command Line Arguments

With the ability to load files, we can take the chance to add in some functionality typical of other programming languages. When file names are given as arguments to the command line we can try to run these files. For example to run a python file one might write `python filename.py`.

These command line arguments are accessible using the `argc` and `argv` variables that are given to `main`. The `argc` variable gives the number of arguments, and `argv` specifies each string. The `argc` is always set to at least one, where the first argument is always the complete command invoked.

That means if `argc` is set to `1` we can invoke the interpreter, otherwise we can run each of the arguments through the `builtin_load` function.

```c
if (argc >= 2) {
    for (int i = 1; i < argc; i++) {
        lval* args = lval_add(lval_sexpr(), lval_str(argv[i]));
        lval* x = builtin_load(e, args);
        
        if (x->type == LVAL_ERR) { lval_println(x); }
        lval_del(x);
    }
}
```

## Print Function

If we are running programs form the command line we might want them to output some data, rather than just define functions and other values. We can add a `print` function to the Lisp which makes use of the existing `lval_print` function.

This function prints each arguments separated by a space and then prints a newline character to finish. It returns the empty expression.

```c
lval* builin_print(lenv* e, lval* a) {
    for (int i = 0; i < a->count; i++) {
        lval_print(a->cell[i]); putchar(' ');
    }
    
    putchar('\n');
    lval_del(a);
    
    return lval_sexpr();
}
```

## Error Function

We can also make use of strings to add in an error reporting functions. This can take as input a user supplied string and provide it as an error message `lval_err`.

```c
lval* builtin_error(lenv* e, lval* a) {
    LASSERT_NUM("error", a, 1);
    LASSERT_TYPE("error", a, 0, LVAL_STR);
    
    lval* err = lval_err(a->cell[0]->str);
    
    lval_del(a);
    return err;
}
```

And remember to register these as builtins.

```c
lenv_add_builtin(e, "load", builtin_load);
lenv_add_builtin(e, "error", builtin_error);
lenv_add_builtin(e, "print", builtin_print);
``` 

## Wrapping Up

This is the last chapter in which we are going to explicitly work on our C implementation of Lisp. The result of this chapter will be the final state of your language implementation.

The final line count should clock in somewhere close to 1000 lines of code. Writing this amount of code is not trivial. If you've made it this far you've written a real program and started on a proper project. The skills you've learnt here should be transferable, and give you the confidence to seek out your own goals and targets. You now have a complex and beautiful program which you can interact and play with. This is something you should be proud of. Go show it off to your friends and family!
