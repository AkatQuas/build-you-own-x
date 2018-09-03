## The AST

As mentioned, the parser will build a structure which faithfully represents the semantics of the program. An AST node is a plain JavaScript object that has a `type` property specifying what kind of node it is, and additional information, depending on the particular `type`.

In short:

|||
|:-:|:-|
|num| `{ type: "num", value: NUMBER }`|
|str| `{ type: "str", value: STRING }`|
|bool| `{ type: "bool", value: true or false }`|
|var| `{ type: "var", value: NAME }`|
|lambda| `{ type: "lambda", vars: [ NAME... ], body: AST }`|
|call| `{ type: "call", func: AST, args: [ AST... ] }`|
|if| `{ type: "if", cond: AST, then: AST, else: AST }`|
|assign| `{ type: "assign", operator: "=", left: AST, right: AST }`|
|binary| `{ type: "binary", operator: OPERATOR, left: AST, right: AST }`|
|prog| `{ type: "prog", prog: [ AST... ] }`|
|let| `{ type: "let", vars: [ VARS... ], body: AST }`|

Examples:

**Functions ("lambda")**

```
lambda (x) 10   ->  {
   # or                 type: "lambda",
λ (x) 10                vars: [ "x" ],
                        body: { type: "num", value: 10 }
                    }
```

**Function calls ("call")**

```
foo(a, 1)  ->   {
                    "type": "call",
                    "func": { "type": "var", "value": "foo" },
                    "args": [
                        { "type": "var", "value": "a" },
                        { "type": "num", "value": 1 }
                    ]
                }
```

**Conditionals ("if")**

```
if foo then bar else baz  ->   {
                                    "type": "if",
                                    "cond": { "type": "var", "value": "foo" },
                                    "then": { "type": "var", "value": "bar" },
                                    "else": { "type": "var", "value": "baz" }
                                }
```

**Assignment ("assign)**

```
a = 10  ->  {
                "type": "assign",
                "operator": "=",
                "left": { "type": "var", "value" : "a" },
                "right": { "type": "num", "value": 10 }
            }
```

**Binary experssion ("binary")**

```
x + y * z  ->   {
                    "type": "binary",
                    "operator": "+",
                    "left": { "type" : "var", "value": "x" },
                    "right": {
                        "type": "binary",
                        "operator": "*",
                        "left": { "type": "var", "value": "y" },
                        "right": { "type": "var", "value": "z" }
                    }
                }
```

**Sequences ("prog")**

```
{                   {
  a = 5;                "type": "prog",
  b = a * 2;    ->      "prog": [
  a + b;                     {
}                               "type": "assign",
                                "operator": "=",
                                "left": { "type": "var", "value": "a" },
                                "right": { "type": "num", "value": 5 }
                            },
                            {
                                "type": "assign",
                                "operator": "=",
                                "left": { "type": "var", "value": "b" },
                                "right": {
                                    "type": "binary",
                                    "operator": "*",
                                    "left": { "type": "var", "value": "a" },
                                    "right": { "type": "num", "value": 2 }
                                }
                            },
                            {
                                "type": "binary",
                                "operator": "+",
                                "left": { "type": "var", "value": "a" },
                                "right": { "type": "var", "value": "b" }
                            }
                        ]
                    }
```

**Block scoped variables ("let")**

```
let (a = 10, b = a * 10) {      {
  a + b;                     ->     "type": "let",
}                                   "vars": [ 
                                        {
                                            "name": "a",
                                            "def": { "type": "num", "value": 10 }
                                        },
                                        {
                                            "name": "b",
                                            "def": {
                                                "type": "binary",
                                                "operator": "*",
                                                "left": { "type": "var", "value": "a" },
                                                "right": { "type": "num", "value": 10 }
                                            }
                                        }
                                    ],
                                    "body": {
                                        "type": "binary",
                                        "operator": "+",
                                        "left": { "type": "var", "value": "a" },
                                        "right": { "type": "var", "value": "b" }
                                    }
                                }
```

## The parser

The parser creates AST nodes.

Thanks to the work we did in the tokenizer, the parser operates on a stream of tokens instead of dealing with individual characters. It still defines many helpers to keep complexity down. 

I'll discuss here the main functions that comprise the parser. Let's start with a high level one, the `lambda` parser:

```javascript
function parse_lambda() {
    return {
        type: "lambda",
        vars: delimited("(", ")", "," , parse_varname),
        body: parse_expression()
    };
}
```

This function will be invoked when the `lambda` keywords has already been seen and "eaten" from the input, so all it cares for is to parse the argument names; but they're in parenthesese and delimited by commas. Rather than placing that code in `parse_lambda`, it is better to write a `delimited` function that takes these arguments: the `start` token, the `end` token, the `separator`, and a *function* which parses whatever must be between those *start/end* tokens. In this case, it's `parse_varname`, which takes care to throw an error if it encounters anything which doesn't look like a variable. The body of the function is an expression, so we get it with `parse_expression`.

`delimited` is a bit lower-level:

```javascript
function delimited(start, stop, separator, parser) {
    var a = [], first = true;
    skip_punc(start);
    while(!input.eof()) {
        if (is_punc(stop)) break;
        if (first) {
            first = false;
        } else {
            skip_punc(separator);
        }
        if (is_punc(stop)) break;

        a.push(parser());
    }
    skip_punc(stop);
    return a;
}
```

As it can be seen, it uses more utilities: `is_punc` and `skip_punc`. The former will return true if the current token is the given punctuation sign (without "eating" it), while `skip_punc` will ensure that the current token is that punctuation (throws an error otherwise) and will discard it from the input.

The function that parses the whole program is probably the simplest:

```javascript
function parse_toplevel() {
    var prog = [];
    while (!input.eof()) {
        prog.push(parse_expression());
        if (!input.eof()) skip_punc(";");
    }
    return { type: "prog", prog: prog };
}
```

Since we have no statements, we simply call `parse_expression()` and read expressions until we get to the end of the input. Using `skip_punc(";")` we demand semicolons between these expressions.

Another simple example `parse_if()`:

```javascript
function parse_if() {
    skip_kw("if");
    var cond = parse_expression();  // condition exp not in parenthese
    if (!is_punc("{")) skip_kw("then");
    var then = parse_expression();
    var ret = { type: "if", cond: cond, then: then };
    if (is_kw("else")) {
        input.next();
        ret.else = parse_expression();
    }
    return ret;
}
```

It skips over the `if` keyword with `skip_kw`(and this throws an error if the current token is not the given keyword), reads the condition using `parse_expression()`. Next, if the consequent branch doesn't start with a `{` we require the keyword `then` to be present (I feel like the syntax is too scarce without it). The branches are just expressions, so again we use `parse_expression()` for them. The `else` branch in optional so we need to check if the keyword is present before parsing it.

Having many small utilities helps a lot in keeping the code simple. We almost write the parser like we had a high level language dedicated for parsing. All these functions are "mutually recursive", e.g.: there's a `parse_atom()` function which is the main dispatcher — based on the current token it calls other functions. One of them is `parse_if()` (called when the current token is `if`) and that in turn calls `parse_expression()`. But `parse_expression()` calls `parse_atom()`. The reason why there's no infinite loop is that at each step, one function or another will advance at least one token.

This kind of parser is called a **recursive descent parser** and it's probably the easiest kind to write manually.

`parse_atom()` does the main dispacthing job, depending on the current token:

```javascript
function parse_atom() {
    return  maybe_call(function() {
        if (is_punc("(")) {
            input.next();
            var exp = parse_expression();
            skip_punc(")");
            return exp;
        }
        if (is_punc("{")) return parse_prog();
        if (is_kw("if")) return parse_if();
        if (is_kw("true") || is_kw("false")) return parse_bool();
        if (is_kw("lambda") || is_kw("λ")) {
            input.next();
            return parse_lambda();
        }
        var tok = input.next();
        if (tok.type == "var" || tok.type == "number" || tok.type == "str") {
            return tok;
        }
        unexpected();
    });
}
```

If it sees an open paren, then it must be a parenthesized expression — thus, skip over paren, call `parse_expression()` and expect a closing paren. If it sees some keyword, it calls the appropriate parser function. If it sees a constant or an identifier, it's just returned as is. And if nothing works, `unexpected()` will throw an error.

When an atomic expression is expected and it sees `{`, it calls `parse_prog()` to parse a sequence of expressions. That's defined below. It will do some minor optimization at this point — if the prog is empty, then it just returns `FALSE`. If it has a single expression, it is returned instead of a `prog` node. Otherwise it returns a `prog` node containing the expressions.

```javascript
var FALSE = { type: "bool", value: false };

function parse_prog() {
    var prog = delimited("{", "}", ";", parse_expression);
    if (prog.length == 0) return FALSE;
    if (prog.length == 1) return prog[0];
    return { type: "prog", prog: prog };
}
```

Here's the `parse_expression()` function. Contrary to `parse_atom()`, this one will extend an expression as much as possible to the right using `maybe_binary()`, which is explained below.

```javascript
function parse_expression() {
    return maybe_call(function(){
        return maybe_binary(parse_atom(), 0);
    });
}
```

What are these `maybe_*` functions?

These functions check what follows *after* an expression in order to decied whether to wrap that expression in another node, or just return it as is.

`maybe_call()` is very simple. It receives a function that is expected to parse the current expression. If after that expression it sees a `(` punctuation token, then it must be a `call` node, which is what `parse_call()` makes. Notice again how `delimited()` comes in handy for reading the argument list.

```javascript
function maybe_call(expr) {
    expr = expr();
    return is_punc("(") ? parse_call(expr) : expr;
}

function parse_call(func) {
    return {
        type: "call",
        func: func,
        args: delimited("(", ")", ",", parse_expression)
    };
}
```

How about **Operator precedence**?

`maybe_binary(left, my_prec)` is used to compose binary expression like `1 + 2 * 3`. The trick to parse them properly is to correctly define the operator precedence like this:

```javascript
var PRECEDENCE = {
    "=": 1,
    "||": 2,
    "&&": 3,
    "<": 7, ">": 7, "<=": 7, ">=": 7, "==": 7, "!=": 7,
    "+": 10, "-": 10,
    "*": 20, "/": 20, "%": 20,
};
```

This says that `*` binds tighter than `+`, so an expression like `1 + 2 * 3` must be read as `(1 + (2 * 3))` instead of `((1 + 2) * 3)`, which would be the normal left-to-right order in which the parser operates.

The trick is to read an atomic expression (only the `1`) and pass it to `maybe_binary()` (the left argument), along with the current precedence (the `my_prec`). `maybe_binary` will look at what follows. If it doesn't see an operator, or if it has a smaller priority, then left is returned as is.

If it's an operator that has a higher precedence than ours, then it wraps left in a new `"binary"` node, and for the right side it repeats the trick at the new precedence level `(*)`:

```javascript
function maybe_binary(left, my_prec) {
    var tok = is_op();
    if (tok) {
        var his_prec = PRECEDENCE[tok.value];
        if (his_prec > my_prec) {
            input.next();
            var right = maybe_binary(parse_atom(), his_prec);
            var binary = {
                type: tok.value == '=' ? "assign" : "binary",
                operator: tok.value,
                left: left,
                right: right
            };
            return maybe_binary(binary, my_prec);
        }
    }
    return left;
} 
```

Note that before returning the binary expression we must also call `maybe_binary` at the old precedence level (my_prec), in order to wrap the expression in another one, should an operator with a higher precedence follow. If all this is confusing, read the code again and again (perhaps try to execute it mentally on some input expressions) until you get it.

Finally, since `my_prec` is initially zero, any operator will trigger the building of a `"binary"` node (or `"assign"` when the operator is `=`).

The whole [parse function](./codes/parser.js)

Next, we move on to [the interpreter](./interpreter.md)