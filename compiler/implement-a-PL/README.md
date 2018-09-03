# Writing a parser

Writing a parser is, depending on the language, a moderately complex task. In essence, it must transform a piece of code (which we inspect by looking at the characters) into an "abstract syntax tree" (AST). The AST is a structured in-memory representation of the program, and it's "abstract" in the sense that it does not care exactly what characters is the source code made of, but it faithfully represents the semantics of it. 

For example, for the following program text:

```
sum = lambda(a, b) {
  a + b;
};
print(sum(1, 2));
```

Our parser will generate the following AST, as a JavaScript object:

```javascript
{
  type: "prog",
  prog: [
    // first line:
    {
      type: "assign",
      operator: "=",
      left: { type: "var", value: "sum" },
      right: {
        type: "lambda",
        vars: [ "a", "b" ],
        body: {
          // the body should be a "prog", but because
          // it contains a single expression, our parser
          // reduces it to the expression itself.
          type: "binary",
          operator: "+",
          left: { type: "var", value: "a" },
          right: { type: "var", value: "b" }
        }
      }
    },
    // second line:
    {
      type: "call",
      func: { type: "var", value: "print" },
      args: [{
        type: "call",
        func: { type: "var", value: "sum" },
        args: [ { type: "num", value: 1 },
                { type: "num", value: 2 } ]
      }]
    }
  ]
}
```

The main difficulty in writing a parser consists in a failure to properly organize the code. The parser should operate at a higher level than reading characters from a string. Some advices on how to keep complexity manageable:

1. Write many functions and keep them small. In every function, do one thing and do it well.

1. Do not try to use regexps for parsing. They don't work. Regexps can be helpful in the lexer though, but I suggest to limit them to very simple things.

1. Don't attempt to guess. When unsure how to parse something, throw an error and make sure the message contains the error location (line/column).

To keep it simple I've split my code in three parts, which are further divided into many small functions:

- [The character input stream](./character-input-stream.md)
- [The token input stream (lexer)](./token-input-stream.md)
- [The parser](./parser.md)
