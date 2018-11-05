# An Interactive Prompt

[doc](http://www.buildyourownlisp.com/chapter4_interactive_prompt)

codes:

- [simple prompt](../codes/simple-prompt.c)
- [editline prompt](../codes/editline-prompt.c)

## Read, Evaluate, Print

As we build our programming language we'll need some way to interact with it. C uses a compiler, where you can change the program, recompile and run it. It'd be good if we could do something better, and interact with the language dynamically. Then we test its behaviour under a number of conditions very quickly. For this we can build something called an **interactive prompt**.

This is a program that prompts the user for some input, and when supplied with it, replies back with some message. Using this will be the easiest way to test our programming language and see how it acts. This system is also called a **REPL**, which stands for **read-evaluate-print loop**. 

## An Interactive Prompt

For the basic setup we want to write a loop which repeatedly writes out a message, and then waits for some input. To get user input we can use a function called `fgets`, which reads any input up until a new line. We need somewhere to store this user input. For this we can declare a constantly sized input buffer.

Once we have this user input stored we can then print it back to the user using a function called `printf`.

```c
#include <stdio.h>

static char input[2048];

int main(int argc, char** argv) {

    puts("Lispy Version 0.0.0.0.1");
    puts("Press Ctrl+c to Exit\n");
    
    while(1) {
        fputs("lispy> ", stdout);

        fgets(input, 2048, stdin);

        printf("Now you're a %s", input);
    }

    return 0;
}
```

The line `static char input[2048];` declares a global array of 2048 characters. This is a reserved block of data we can access anywhere from our program. In it we are going to store the user input which is typed into the command line. The `static` keyword makes this variable local to this file, and the `[2048]` section is what declares the size.

We write an infinite loop using `while (1)`. In a conditional block `1` always evaluates to true. Therefore commands inside this loop will run forever.

To output our prompt we use the function `fputs`. This is a slight variation on puts which does not append a newline character. We use the `fgets` function for getting user input from the command line. Both of these functions require some file to write to, or read from. For this we supply the special variables `stdin` and `stdout`. These are declared in `<stdio.h>` and are special file variables representing input to, and output from, the command line. 

When passed this variable the `fgets` function will wait for a user to input a line of text, and when it has it will store it into the `input` buffer, including the newline character. So that `fgets` does not read in too much data we also must also supply the size of the buffer `2048`.

To echo the message back to the user we use the function `printf`. This is a function that provides a way of printing messages consisting of several elements. It matches arguments to patterns in the given string. For example in our case we can see the `%s` pattern in the given string. This means that it will be replaced by whatever argument is passed in next, interpreted as a string.

On MacOS, we need `editline` to escape the arrow keys.

```c
#include <stdio.h>
#include <stdlib.h>

#include <editline/readline.h>

int main(int argc, char** argv) {
    puts("Lispy Version 0.0.0.0.1");
    puts("Press Ctrl+c to Exit\n");
    
    while(1) {
        char* input = readline("lispy> ");
        
        add_history(input);
        
        printf("Now you're a %s\n", input);
        
        free(input);
    }
    return 0;
}
```

We have included a few new headers. There is `#include <stdlib.h>`, which gives us access to the `free` function used later on in the code. We have also added `#include <editline/readline.h>` and `#include <editline/history.h>` which give us access to the `editline` functions, `readline` and `add_history`.

Instead of prompting, and getting input with `fgets`, we do it in one go using `readline`. The result of this we pass to `add_history` to record it. Finally we print it out as before using `printf`.

Unlike `fgets`, the `readline` function strips the trailing newline character from the input, so we need to add this to our `printf` function. We also need to delete the input given to us by the `readline` function using `free`. This is because unlike `fgets`, which writes to some existing buffer, the `readline` function allocates new memory when it is called. When to free memory is something we cover in depth in later chapters.

Using `cc -std=c99 -Wall path/to/editline-prompt.c -ledit -o prompt
` to compile the code, And you are good to go. 

# The C Preprocessor

For such a small project it might be okay that we have to program differently depending on what operating system we are using, but if I want to send my source code to a friend on different operating system to give me a hand with the programming, it is going to cause problems. In an ideal world I'd wish for my source code to be able to compile no matter where, or on what computer, it is being compiled. This is a general problem in C, and it is called **portability**. There is not always an easy or correct solution.

But C does provide a mechanism to help, called the **preprocessor**.

The preprocessor is a program that runs before the compiler. It has a number of purposes, and we've been actually using it already without knowing. Any line that starts with a octothorpe `#` character (hash to you and me) is a preprocessor command. We've been using it to **include** header files, giving us access to functions from the standard library and others.

Another use of the preprocessor is to detect which operating system the code is being compiled on, and to use this to emit different code.

This is exactly how we are going to use it. If we are running Windows we're going to let the preprocessor emit code with some fake `readline` and `add_history` functions I've prepared, otherwise we are going to include the headers from `editline` and use these.

To declare what code the compiler should emit we can wrap it in `#ifdef`, `#else`, and `#endif` preprocessor statements. These are like an `if` function that happens before the code is compiled. All the contents of the file from the first `#ifdef` to the next `#else` are used if the condition is true, otherwise all the contents from the `#else` to the final `#endif` are used instead. By putting these around our fake functions, and our editline headers, the code that is emitted should compile on Windows, Linux or Mac.

```c
#include <stdio.h>
#include <stdlib.h>

#ifdef _WIN32
#include <string.h>

static char buffer[2048];

/* Polyfill readline function */
char* readline(char* prompt) {
    fputs(prompt, stdout);
    fgets(buffer, 2048, stdin);
    char* cpy = malloc(strlen(buffer)+1);
    strcpy(cpy, buffer);
    cpy[strlen(cpy)-1] = '\0';
    return cpy;
}

/* Polyfill add_history funtion*/
void add_history(char* unused) {}

#else
#include <editline/readline.h>
#endif

int main(int argc, char** argv) {
    puts("Lispy Version 0.0.0.0.1");
    puts("Press Ctrl+c to Exit\n");
    
    while(1) {
        char* input = readline("lispy> ");
        add_history(input);
        
        printf("Now you're a %s\n", input);
        free(input);
    }
    return 0;
}
```

[Next on language-and-programming-language](language-grammar.md)
