## The token input stream

The tokenizer (also called “lexer”) operates on a `character input stream` and returns a stream object with the same interface, but the values returned by `peek() / next()` will be tokens. A token is an object with two properties: type and value. Here are some examples with supported tokens:

```javascript
{ type: "punc", value: "(" }           // punctuation: parens, comma, semicolon etc.
{ type: "num", value: 5 }              // numbers
{ type: "str", value: "Hello World!" } // strings
{ type: "kw", value: "lambda" }        // keywords
{ type: "var", value: "a" }            // identifiers
{ type: "op", value: "!=" }            // operators
```

Whitespaces and comments are skipped over, no tokens are returned.

In order to write the tokenizer we need to look more closely into the syntax of our language. The idea is to notice that depending on the current character (as returned by `input.peek()`) we can decide what kind of token to read:

- First off, skip over whitespace.
- If `input.eof()` then return `null`.
- If it's a sharp sign `#`, skip comment (retry after the end of line).
- If it's a quote then read a string.
- If it's a digit, then we proceed to read a number.
- If it's a "letter", then read an identifier or a keyword token.
- If it's one of the punctuation characters, return a punctuation token.
- If it's one of the operator characters, return an operator token.
- If none of the above, error out with `input.croak()`.

So here's the “read_next” function — the “core” of the tokenizer — which implements the above:

```javascript
function read_next() {
    read_while(is_whitespace);
    if (input.eof()) return null;
    var ch = input.peek();
    if (ch == '#') {
        skip_comment();
        return read_next();
    }
    if (ch == '"') return read_string();
    if (is_digit(ch)) return read_number();
    if (is_id_start(ch)) return read_ident();
    if (is_punc(ch)) return {
        type: 'punc',
        value: input.next()
    }
    if (is_op_char(ch)) return {
        type: 'op',
        value: read_while(is_op_char)
    }
    input.croak('Can not handle character: ' + ch);
}
```

This is a "dispatcher" function and it's what `next()` will call in order to fetch the next token. Note it uses many utilities that are focused on particular token types, like `read_string()`, `read_number()` etc. There's no point to complicate the dispatcher with code from those functions, even if we never call them elsewhere.

Another thing to notice is that we don't consume all the input stream in one step. Each time the parser will call for next token, we read one token. In case of a parse error we don't even reach the end of the stream.

`read_ident()` will read characters as long as they are allowed as part of an identifier(`is_id`). Identifiers must start with a letter, or `λ` or `_`, and can contain further such characters, or digits, or one of the following: `? ! - < > =`. Therefore, `foo-bar` will not be read as three tokens but as a single identifier (a `"var"` token).

Also, the `read_ident()` function will check the identifier against the list of known keywords, and if it's there it will return a `"kw"` token rather than a `"var"` one.

```javascript
function TokenStream(input) {
    var current = null;
    var keywords = " if then else lambda λ true false ";
    function is_keyword(x) {
        return keywords.indexOf(" "+ x + " ") >= 0;
    }
    function is_digit(ch) {
        return /[0-9]/i.test(ch);
    }
    function is_id_start(ch) {
        return /[a-zλ_]/i.test(ch);
    }
    function is_id(ch) {
        return is_id_start(ch) || "?!-<>=0123456789".indexOf(ch) >= 0;
    }
    function is_op_char(ch) {
        return "+-*/%=&|<>!".indexOf(ch) >= 0;
    }
    function is_punc(ch) {
        return ",;(){}[]".indexOf(ch) >=0;
    }
    function is_whitespace(ch) {
        return " \t\n".indexOf(ch) >= 0;
    }
    function read_while(predicate) {
        var str = "";
        while(!input.eof() && predicate(input.peek())) {
            str += input.next()
        }
        return str;
    }
    function read_number() {
        var has_dot = false;
        var number = read_while(function (ch) {
            if (ch == ".") {
                if (has_dot) return false;
                has_dot = true;
                return true;
            }
            return is_digit(ch);
        });
        return { type: "num", value: parseFloat(number) };
    }
    function read_ident() {
        var id = read_while(is_id);
        return {
            type: is_keyword(id) ? "kw" : "var",
            value: id
        };
    }
    function read_escaped(end) {
        var escaped = false, str = "";
        input.next();
        while (!input.eof()) {
            var ch = input.next();
            if (escaped) {
                str += ch;
                escaped = false;
            } else if ( ch == '\\' ) {
                escaped = true;
            } else if ( ch == end ) {
                break;
            } else {
                str += ch;
            }
        }
        return str;
    }
    function read_string() {
        return { type: "str" , value : read_escaped('"')};
    }
    function skip_comment () {
        read_while(function(ch) {return ch != '\n' });
        input.next();
    }
    function read_next() {
        read_while(is_whitespace);
        if (input.eof()) return null;
        var ch = input.peek();
        if (ch == '#') {
            skip_comment();
            return read_next();
        }
        if (ch == '"') return read_string();
        if (is_digit(ch)) return read_number();
        if (is_id_start(ch)) return read_ident();
        if (is_punc(ch)) return {
            type: "punc",
            value: input.next()
        }
        if (is_op_char(ch)) return {
            type: "op",
            value: read_while(is_op_char)
        }
        input.croak('Can not handle character: ' + ch);
    }
    function peek() {
        return current || (current = read_next());
    }
    function next() {
        var tok = current;
        current = null;
        return tok || read_next();
    }
    function eof() {
        return peek() == null;
    }
    return {
        next: next,
        peek: peek,
        eof: eof,
        croak: input.croak
    }
}
```

- The `next()` function doesn't always call `read_next()`, because it might have been peeked before (in which case `read_next()` was already called and the stream advanced). Therefore we need a `current` variable which keeps track of the current token.

- We only support decimal numbers with the usual notition (no `1E5` stuff, no hex, no octal). But if we ever need more, the changes go only in `read_number()` and are pretty easy to do.

- Unlike JavaScript, the only characters that cannot appear unquoted in a string are the quote character itself and the backslash. You need to backslash them. Otherwise string can contain hard newlines, tabs, and whatnot. We don't interpret the usual escapes like `\n`, `\t` etc. though again, the changes would be pretty trivial (in `read_string()`).

Next, we will move on to [the parser](./the-parser.md)
