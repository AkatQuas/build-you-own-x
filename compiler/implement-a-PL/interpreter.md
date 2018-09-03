## A simple interpreter

So far we have wrote 3 functions: `InputStream`, `TokenStream` and `parse`. To get an AST from a piece of code now we can do the following: 

    var ast = parse(TokenStream(InputStream(code)));

Writing an interpreter is easier tan the parser. We just have to walk the AST, executing expressions in their normal order.

### The environment

The key to correct execution is to properly maintain the environment - a structure holding variable bindings. It will be passed as an argument to our `evaluate` function. Each time we enter a `lambda` node we must extend the environment with new variables (function's arguments) and initialize them with values passed at run time. If an arguments shadows a variable from the outer scope ( *scope* and *environment* mean the same thing, execution context) we must be careful to restore the previous value when we leave the function.

The simplest way to implement this is using JavaScript's prototype inheritance. When we enter a function we'll create a new environment, set its prototype to the outer (parent) environment and evaluate the function body in the new one. This way wthen we exit we needs not do anything -- the outer env will already contain any shadowed bindings.

Here's the definition of the Environment object:

```javascript
function Environment(parent) {
    this.vars = Object.create(parent ? parent.vars : null);
    this.parent = parent;
}
Environment.prototype = {
    extend: function() {
        return new Environment(this);
    },
    lookup: function(name) {
        var scope = this;
        while (scope) {
            if (Object.prototype.hasOwnProperty.call(scope.vars, name)) {
                return scope;
            }
            scope = scope.parent;
        }
    },
    get: function(name) {
        if (name in this.vars) {
            return this.vars[name];
        }
        return new Error("Undefined variable " + name);
    },
    set: function(name, value) {
        var scope = this.lookup(name);
        if (!scope && this.parent) {
            throw new Error("Undefined variable " + name);
        }
        return (scope || this).vars[name] = value;
    },
    def: function(name, value) {
        return this.vars[name] = value;
    }
};
```

An Environment object has a `parent`, which points to the parent scope. The parent will be null for the global scope. And it has a `vars` property which holds the variable bindings. This is initialized as `Object.create(null)` for the toplevel (global) scope, or `Object.create(parent.vars)` for subscopes, in order to "see" the current bindings via prototypal inheritance.

There are the following methods:

- extend() — to create a subscope.
- lookup(name) — to find the scope where the variable with the given name is defined.
- get(name) — to get the current value of a variable. Throws an error if the variable is not defined.
- set(name, value) — to set the value of a variable. This needs to lookup the actual scope where the variable is defined. If it's not found and we're not in the global scope, throws an error.
- def(name, value) — this creates (or shadows, or overwrites) a variable in the current scope.

## The `evaluate` function

Now that we have the Environment we can jump to the main problem. This function will be a big `switch` statement, dispatching by node type, containing logic for evaluating each kind of node. 

```javascript
function evaluate(exp, env) {
    switch (exp.type) {

        // for constant nodes, just return their value
        case "num":
        case "str":
        case "bool":
            return exp.value;

        // variables are fetched from the environment
        // "var" tokens contain the name in the `value` property
        case "var":
            return env.get(exp.value);
        
        // assignment, we need to check if the left side is a "var" token
        // if not, throw an error; we don't support assignment to anythiny else for now
        // Then we use `env.set` to set the value. Note that the value needs
        // to be computed first by calling `evaluate` recursively
        case "assign":
            if (exp.left.type != "var")
                throw new Error("Cannot assign to " + JSON.stringfy(exp.left));
            return env.set(exp.left.value, evaluate(exp.right, env));
        
        // "binary" node needs to apply an operator to two operands.
        // We'll write the `apply_op` function later, it's quite trivial.
        // Again, we need to call the evaluator recursively to compute the `left` 
        // ande `right` operands
        case "binary":
            return apply_op(exp.operator,
                            evaluate(exp.left, env),
                            evaluate(exp.right, env));
                    
        // "lambda" node will actually result in a Javascript closure, so it
        // will be callable from JavaScript just like an ordinary function. 
        case "lambda":
            return make_lambda(env, exp);

        // Evaluating an "if" node is simple: first evaluate the condition.
        // if it's not `false` then evaluate the "then" branck and return its value.
        // Otherwise, evaluate the `else` branch, if present, or return `false`.
        case "if":
            var cond = evaluate(exp.cond, env);
            if (cond !== false) return evaluate(exp.then, env);
            return exp.else ? evaluate(exp.else, env) : false;
        
        // A "prog" is a squence of expressions. We just evaluate them in order and
        // return the value of the last one. For an empty sequence, the return value 
        // is initialized to `false`
        case "prog":
            var val = false;
            exp.prog.forEach(function(exp) { val =  evaluate(exp, env) });
            return val;

        // For a "call" node we need to call a function. First we evaluate the `func`,
        // which should return a normal  JS function, then we evaluate the `args` and 
        // apply that function
        case "call":
            var func = evaluate(exp.func, env);
            return func.apply(null, exp.args.map(function(arg) {
                return evaluate(arg, env);
            }));

        // normally, we should never get here, but just in case we add new
        // node types in the parser and we forget to update the evaluator,
        // let's throw a clear error
        default:
            throw new Error("Unknown type for evaluating " + exp.type );
    }
}
```

That is the core of the evaluator and as you can see it's really simple. We still need to write two more functions, let's start with `apply_op` as it's the easiest one:

```javascript
function apply_op(op, a, b) {
    function num(x) {
        if (typeof x != "number") {
            throw new Error("Eexpected number but got " + x);
        }
        return x;
    }
    function div(x) {
        if (num(x) == 0) {
            throw new Error("Divide by zero");
        }
    }
    switch (op) {
        case "+"  : return num(a) + num(b);
        case "-"  : return num(a) - num(b);
        case "*"  : return num(a) * num(b);
        case "/"  : return num(a) / div(b);
        case "%"  : return num(a) % div(b);
        case "&&" : return a !== false && b;
        case "||" : return a !== false ? a : b;
        case "<"  : return num(a) < num(b);
        case ">"  : return num(a) > num(b);
        case "<=" : return num(a) <= num(b);
        case ">=" : return num(a) >= num(b);
        case "==" : return a === b;
        case "!=" : return a !== b;
    }
    throw new Error("Cannot apply operator " + op);
}
```

It receives the operator and the arguments. Just a boring switch to apply it. Unlike JavaScript, which applies any operator to any arguments and moves on whether that makes any sense or not, we require that the operands for numeric operators be numbers, and that a divizor is not zero, using the small helpers `num` and `div`. For strings we'll define something else.

The `make_lambda` is a bit subtle:

```javascript
function make_lambda(env, exp) {
    function lambda() {
        var names = exp.vars;
        var scope = env.extend();
        for (var i = 0; i < names.length; ++i) {
            scope.def(names[i], i < arguments.length ? arguments[i] : false);
        }
        return evaluate(exp.body, scope);
    }
    return lambda;
}
```

As you can see, it returns a plain JavaScript function that *encloses over the environment and the expression to evaluate*. It's important to understand that nothing happens when this closure is created — but *when it's called*, it will extend the environment that it saved at creation time with the new bindings of arguments/values (if less values are passed than the function's argument list, the missing ones will get the value `false`). And then it just evaluates the body in the new scope.

So far, we have a runnable [compiler](./codes/lambda-eval1.js). It's runnable with NodeJS — just pass the code to evaluate at standard input, e.g.:

    echo 'sum = lambda(x, y) x + y; println(sum(2, 3));' | node lambda-eval1.js

Whilst, the tutorial is not finised. In the rest sections, we are going to [play a bit with our λanguage](http://lisperator.net/pltut/eval1/play).