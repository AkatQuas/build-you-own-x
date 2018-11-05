# Standard Library

[documents](http://www.buildyourownlisp.com/chapter15_standard_library)

A complete library code could be found [here](../codes/prelude.lspy)

## Minimalism

The Lisp we've built has been purposefully minimal. We've only added the fewest number of core structures and builtins. If we chose these carefully, as we did, then it should allow us to add in everything else required to the language.

The motivation behind minimalism is two-fold. The first advantage is that it makes the core language simple to debug and easy to learn. This is a great benefit to developers and users. Like [Occam's Razor](http://en.wikipedia.org/wiki/Occam%27s_razor) it is almost always better to trim away any waste if it results in a equally expressive language. The second reason is that having a small language is also aesthetically nicer. It is clever, interesting and fun to see how small we can make the core of a language, and still get something useful out of the other side. As hackers, which we should be by now, this is something we enjoy.

## Atoms

When dealing with conditionals we added no new boolean type to the language. Because fo this we didn't add `true` or `false` either. Instead we just used numbers. Readability is still important though, so we can define some constants to represent these values.

On a similar note, many lisps use the word `nil` to represent the empty list `{}`. We can add this in too. These constants are sometimes called **atoms** because they are fundamental and constant.

The user is not forced to use these named constants, and can use numbers and empty lists instead as they like. This choice empowers users.

## Building Blocks

We've already come up with a number of cool functions. One of these is `fun` function that allows us to declare functions in a neater way. We should definitely include this in our standard library. We also had the `unpack` and `pack` functions. These too are going to be essential for users. We should include these along with their `curry` and `uncurry` alias.

```
; Fuction Definitions
(def { fun } ( \ {f b} {
    def (head f) (\ (tail f) b )
}))

; Unpack List for Function
(fun { unpack f l } { 
    eval (join (list f) l)
})

; Pack List for Function
(fun { pack f & xs } { f xs })

; Curried and Uncurried calling
(def { curry } unpack)
(def { uncurry } pack)
```

Say we want to do several things in order. One way we can do this is to put each thing to do as an argument to some function. We know that arguments are evaluated in order from left to right, which is essentially sequencing events. For functions such as `print` and `load` we don't care much about what it evaluates to, but do care about the order in which it happens.

Therefore we can create a `do` function which evaluates a number of expressions in order and returns the last one. This relies an the `last` function, which returns the final element of a list.

```
; Perform Several things in Sequence
(fun { do & l } {
    if ( == l nil) 
    { nil }
    { last l }
})
```

Sometimes we want to save results to local variables using the `=` operator. When we're inside a function this will implicitly only save results locally, but sometimes we want to open up an even more local scope. For this we can create a function `let` which creates an empty function for code to take place in, and evaluates it.

```
; Open new scope
(fun { let b } {
    ((\ {_} b) ())
})
```

We can use this in conjunction with `do` to ensure that variables do not leak out of their scope.

## Logical Operators

We didn't define any logical operators such as `and` and `or` in our language. This might be a good thing to add in later. For now we can use arithmetic operators to emulate them. Think about how these functions work when encountering `0` or `1` for their various inputs.

```
; Logical Functions
(fun {not x} { - 1 x } )
(fun { or x y } { + x y } )
(fun { and x y } { * x y })
```

## Miscellaneous Functions

Here are a couple of miscellaneous functions that don't really fit in anywhere. See if you can guess their intended functionality.

```
(fun { flip f a b } { f b a })
(fun { ghost & xs } { eval xs })
(fun { comp f g x } { f (g x) })
```

The `flip` function takes a function `f` and two arguments `a` and `b`. It then applies `f` to `a` and `b` in the reversed order. This might be useful when we want a function to be **partially evaluated**. If we want to partially evaluate a function by only passing it in it`s second argument we can use `flip` to give us a new function that takes the first two arguments in reversed order.

The `ghost` function is kind of interesting. It simply takes in any number of arguments and evaluates them as if they were the expressions itself. So it just sits at the front of an expression like a ghost, not interacting with or changing the behaviour of the program at all. 

The `comp` function is used to compose two functions. It takes as input `f`, `g`, and an argument to `g`. It then applies this argument to `g` and applies the result again to `f`. This can be used to compose two functions together into a new function that applies both of them in series.

## List Functions

The `head` function is used to get the first element of a list, but what it returns is still wrapped in the list. If we want to actually get the element out of this list we need to extract it somehow.

Single element lists evaluate to just that element, so we can use the `eval` function to do this extraction. We can also define a couple of helper functions for aid extracting the firs, second and third elements of a list. We'll use these function more later.

```
; First, Second, or Third Item in List
(fun {fst l} { eval (head l) })
(fun {snd l} { eval (head (tail l)) })
(fun {trd l} { eval (head (tail (tail l))) })
```

To find the length of a list we can recursive over it adding `1` to the length of the tail. To find the `nth` element af a list we can perform the `tail` operation and count down until we reach `0`. To geth the last element of a list we can just access the element at the length minus one.

```
; List Length
(fun {len l} {
    if (== l nil)
    { 0 } 
    { + 1 (len (tail) l) }
})

; Nth item in List
(fun {nth n l} {
    if (== n 0)
    { fst l }
    { nth (- n 1) (tail l) }
})

; Last item in List
(fun {last l} {nth (- (len l) 1) l}) 
```

There are lots of other useful functions that follow this same pattern. We can define functions for taking and dropping the first so many elements of a list, or functions for checking if a value is an element of a list.

```
; Take N items
(fun {take n l} {
    if (== n 0)
    {nil}
    {join (head l) (take (- n 1) (tail l))}
})

; Drop N items
(fun {drop n l} {
    if (== n 0)
    {l}
    {drop (- n 1) (tail l)}
})

; Split at N
(fun {split n l} {list (take n l) (drop n l)})

; Element of List
(fun {elem x l} {
    if (== l nil)
    {false}
    {if (== x (fst l)) {true} {elem x (tail l)}}
})
```

For example we may want a way we can perform some function on every element of a list. This is a function we can define called `map`. It takes as input some function, and some list. For each item in the list it applies `f` to that item and appends it back onto the front of the list. It then applies `map` to the tail of the list.

```
; Apply Function to List
(fun {map f l} {
    if (== l nil)
    {nil}
    {join (list (f (fst l))) (map f (tail l))}
})
```

An adaptation of this `map` is a `filter` function which takes in some functional condition, and only includes items of a list which match that condition.

```
; Apply Filter to List
(fun {filter f l} {
    if (== l nil)
    {nil}
    {join (if (f (fst l)) {head l} {nil}) (filter f (tail l))}
})
```

## Conditional Functions

By defining the `fun` function we've already shown how powerful the language is in its ability to define functions that look like new syntax. Another example of this is found in emulating the C `switch` and `case` statements. In C these are built into the language, but for our **LISP** we can define them as part of a library.

We can define a function `select` that takes in zero or more two-element lists as input. For each two element list in the arguments it first evaluates the first element of the pair. If this is true then it evaluates and returns the second item, otherwise it performs the same thing again on the rest of the list.

```
(fun {select & cs} {
    if (== cs nil)
    { error "No Selection Found"}
    { if (fst (fst cs)) {snd (fst cs)} {unpack select (tail cs)}}
})
```

We can also define a function `otherwise` to always evaluate to `true`. This works a little bit like the `default` keyword in C.

```
; Default Case
(def {otherwise} true)

; Print Day of Month suffix
(fun {month-day-suffix i} {
    select
    {(== i 0) "st"}
    {(== i 1) "nd"}
    {(== i 2) "rd"}
    {otherwise "th"}
})
```

This is actually more powerful than the C `switch` statement. In C rather than passing in conditions the input value is compared only for equality with a number of constant candidates. We can also define this function in our Lisp, where we compare a value to a number of candidates. In this function we take some value `x` followed by zero or more two-element lists again. If the first element in the two-element list is equal to `x`, the second element is evaluated, otherwise the process continues down the list.

```
(fun {case x & cs} {
    if (== cs nil)
    {error "No case Found"}
    { if (== x (fst (fst cs))) {snd (fst cs)} {
        unpack case(join (list x) (tail cs))}}
})

(fun {day-name x} {
    case x
    {0 "Monday"}
    {1 "Tuesday"}
    {2 "Wendesday"}
    {3 "Thursday"}
    {4 "Friday"}
    {5 "Saturday"}
    {6 "Sunday"}
})
```
