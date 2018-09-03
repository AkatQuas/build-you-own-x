## The character input stream

This is the smallest part. We're going to create a "stream object" which provides operations to read characters from a string. A stream object has 4 methods:

- peek() — returns the next value but without removing it from the stream.
- next() — returns the next value and also discards it from the stream.
- eof() — returns true if and only if there are no more values in the stream.
- croak(msg) — does `throw new Error(msg)`.

The reason why I'm including the last one is that the stream can easily keep track of the current location (i.e. line/column), which is important to display in the case of an error message.

Feel free to add more methods here, depending on your needs, but for my tutorial these will suffice.

The character input stream deals with characters, so the values that `next() / peek()` return are chars (well, since JS doesn't have a char type, they're strings containing one character).

Here is the full code of this object, which I will call [InputStream](./codes/character-input-stream.js). It's small enough and you should have no problem to understand it:

```javascript
function InputStream(input) {
    var pos = 0, line = 1, col = 0;
    function next() {
        var ch = input.charAt(pos++);
        if (ch === "\n") line++, col = 0; else col++;
        return ch;
    }
    function peek() {
        return input.charAt(pos);
    }
    function eof() {
        return peek() === "";
    }
    function croak(msg) {
        throw new Error(msg + " (" + line + ":" + col + ")");
    }
    return {
        next  : next,
        peek  : peek,
        eof   : eof,
        croak : croak,
    };
}
```

Note that it's not a standard object (the kind you create with `new`). You just do `var stream = InputStream(string)` to get a stream object.

Next we're going to write another abstraction on top of this object: the [tokenizer](./the-token-input-stream.md)
