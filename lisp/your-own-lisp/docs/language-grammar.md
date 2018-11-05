# Language 

[doc](http://www.buildyourownlisp.com/chapter5_languages)

## What is a Programming language?

A programming language is very similar to a real language. There is a structure behind it, and some rules which dictate what is, and isn't, a valid thing to say. 

It's an obvious observation that natural languages are built up of recursive and repeated substructures.

The consequence of this observation by Chomsky is important. It means that although there are an infinite number of different things that can be said, or written down in a particular language, it is still possible to process and understand all of them with a finite number of re-write rules. The name given to a set of re-write rules is a **grammar**.

To write a programming language such as our Lisp we are going to need to understand grammars. For reading in the user input we need to write a **grammar** which describes it. Then we can use it along with our user input, to decide if the input is valid. We can also use it to build a structured internal representation, which will make the job of understanding it, and then evaluating it, performing the computations encoded within, much easier.

This is where a library called `mpc` comes in.

## Parser Combinator

`mpc` is a **Parser Combinator** library that allows you to build programmes that understand and process particular languages. These are known as **parsers**. There are many different ways of building parsers, but the cool thing about using a **Parser Combinator** library is that it lets you build **parsers** easily, just by specifying the **grammar** ... sort of.

Many Parser Combinator libraries actually work by letting you write normal code that looks a bit like a grammar, not by actually specifying a grammar directly. In many situations this is fine, but sometimes it can get clunky and complicated.




