On this section, we'll create a new version of the calculator from [calc1.py](./calc1.py) that will be able to:

1. Handle whitespace characters anywhere in the input string

1. Consume multi-digit integers from the input

1. Substract two integers

Here is the complete code:

```python
# Token types
# EOF (end-of-file) token is used to indicate that
# there is no more input left for lexical analysis
INTEGER, PLUS, MINUS, EOF = 'INTEGER', 'PLUS', 'MINUS', 'EOF'

class Token(object):
    def __init__(self, type, value):
        # token type: INTEGER, PLUS, MINUS, or EOF
        self.type = type
        # token value: non-negative integer value, '+', '-', or None
        self.value = value

    def __str__(self):
        """String representation of the class instance.
        Examples:
            Token(INTEGER, 3)
            Token(PLUS '+')
        """
        return 'Token({type}, {value})'.format(
            type=self.type,
            value=repr(self.value)
        )

    def __repr__(self):
        return self.__str__()

class Interpreter(object):
    def __init__(self, text):
        # client string input, e.g. "3+5", "12 - 5", etc
        self.text = text
        # self.pos is an index into self.text
        self.pos = 0
        # current_token = None
        self.current_token = None
        self.current_char = self.text[self.pos]

    def error(self):
        raise Exception('Error parsing inpt')

    def advance(self):
        """Advance the `pos` pointer and set the `current_char` variable."""
        self.pos += 1
        if self.pos > len(self.text) - 1:
            self.current_char = None
        else: 
            self.current_char = self.text[self.pos]

    def skip_whitespace(self):
        while self.current_char is not None and self.current_char.isspace():
            self.advance()

    def integer(self):
        """Return a (multidigit) integer consumed from the input."""
        result = ''
        while self.current_char is not None and self.current_char.isdigit():
            result += self.current_char
            self.advance()
        return int(result)

    def get_next_token(self):
        """Lexical analyzer (also known as scanner or tokenizer)

        This method is responsible for breaking a sentence apart into tokens.
        """
        while self.current_char is not None:
            if self.current_char.isspace():
                self.skip_whitespace()
                continue

            if self.current_char.isdigit():
                return Token(INTEGER, self.integer())
            
            if self.current_char == '+':
                self.advance()
                return Token(PLUS, '+')
            
            if self.current_char == '-':
                self.advance()
                return Token(MINUS, '-')
            
            self.error()
        
        return Token(EOF, None)
    
    def eat(self, token_type):
        # compare the current token type with the passed token
        # type and if they match then "eat" the current token
        # and assign the next token to the self.current_token,
        # otherwise raise an exception.

        if self.current_token.type == token_type:
            self.current_token = self.get_next_token()
        else:
            self.error()

    def expr(self):
        """Parser / Interpreter
        expr -> INTEGER PLUS INTEGER
        expr -> INTEGER MINUS INTEGER
        """
        
        # set current token to the first token taken from the input
        self.current_token = self.get_next_token()

        # we expect the current token to be an integer
        left = self.current_token
        self.eat(INTEGER)

        # we expect the current token to be either a '+' or '-'
        op = self.current_token
        if op.type == PLUS:
            self.eat(PLUS)
        else:
            self.eat(MINUS)

        # we expect the current token to be an integer
        right = self.current_token
        self.eat(INTEGER)

        # after the above call the self.current_token is set to EOF token

        # at this point either the INTEGER PLUS INTEGER or
        # the INTEGER MINUS INTEGER sequence of tokens
        # has been successfully found and the method can just
        # return the result of adding or subtracting two integers,

        if op.type == PLUS:
            result = left.value + right.value
        else:
            result = left.value - right.value

        return result


def main():
    while True:
        try:
            text = input('calc> ')
        except EOFError:
            break

        if not text:
            continue
        interpreter = Interpreter(text)
        result = interpreter.expr()
        print(result)
            
if __name__ == '__main__':
    main()
```

The major code changes compared with the version from Part 1 are:

1. The *get_next_token* method was refactored a bit. The logic to increment the pos pointer was factored into a separate method *advance*.
1. Two more methods were added: *skip_whitespace* to ignore whitespace characters and *integer* to handle multi-digit integers in the input.
1. The *expr* method was modified to recognize **INTEGER -> MINUS -> INTEGER** phrase in addition to **INTEGER -> PLUS -> INTEGER** phrase. The method now also interprets both addition and subtraction after having successfully recognized the corresponding phrase.

Here we'd like to talk a little bit about **lexemes, parsing, and parsers**.

You already know about tokens. But in order for me to round out the discussion of tokens I need to mention lexemes. What is a lexeme? A **lexeme** is a sequence of characters that form a token. In the following picture you can see some examples of tokens and sample lexemes and hopefully it will make the relationship between them clear:

![](./imgs/lsbasi_part2_lexemes.png)

Before you can interpret an expression you first need to recognize what kind of phrase it is, whether it is addition or subtraction, for example. That's what the *expr* method essentially does: it finds the structure in the stream of tokens it gets from the *get_next_token* method and then it interprets the phrase that is has recognized, generating the result of the arithmetic expression.

The process of finding the structure in the stream of tokens, or put differently, the process of recognizing a phrase in the stream of tokens is called **parsing**. The part of an interpreter or compiler that performs that job is called a **parser**.

So the *expr* method is the part of your interpreter where both **parsing** and **interpreting** happens - the *expr* method first tries to recognize (parse) the **INTEGER -> PLUS -> INTEGER** or the **INTEGER -> MINUS -> INTEGER** phrase in the stream of tokens and after it has successfully recognized (parsed) one of those phrases, the method interprets it and returns the result of either addition or subtraction of two integers to the caller.
