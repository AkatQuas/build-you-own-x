# Garbage collector

This tutorial comes from [here](http://journal.stuffwithstuff.com/2013/12/08/babys-first-garbage-collector/).

In this post, the author managed to whip up a basic [mark-and-sweep](http://en.wikipedia.org/wiki/Garbage_collection_(computer_science)#Na.C3.AFve_mark-and-sweep) collector that actually collects.

Garbage collection is considered one of the more shark-infested waters of programming, but in this post, the author provide us a nice kiddie pool to paddle around in.

## reduce, reuse, recycle

The basic idea bedind garbage collection is that the language appears to have access to infinte memory. The developer can just keep allocating and allocating and allocating and, as if by magic, it never fails.

Of course, machines don't have infinite memory. So the awy the implementation does this is that when it needs to allocate a bit of memory and realizes it's running low, it collect *garbage*.

*Garbage* in this context means memory it previously allocated that is no longer being used. For the illusion of infinite memory to work, the language needs to be very safe about *no longer being used*. It would be no fun if random objects just stared getting reclaimed while your program was trying to access them.

In order to be collectible, the language has to ensure there's no way for the program to use that object again. If it can't get a reference to object, then it obviously can't use it again. So the definition of *in use* is actually pretty simple:

1. Any object that's being referenced by a variable that's still in scope is in use.

1. Any object that's referenced by another object that's in use is in use.

The second rule is the recursive one. If object A is referenced by a variable, and has some field that references object B, then B is in use since you can get to it through A.

The end result is a graph of *reachable* objects - all of the objects in the world that you can get to by starting at a variable and traversing through objects. Any object *not* in that graph of reachable objects is dead to the program and its memory is ripe for a reaping.

## marking and sweeping

There's a [bunch of different](http://en.wikipedia.org/wiki/Garbage_collection_(computer_science)#Tracing_garbage_collectors) ways you can implement the process of finding and reclaiming all of the unused objects, but the simplest and first algorithm ever invented for it is called **mark-sweep**.

It works almost exactly like our definition of reachability:

1. Starting at the roots, traverse the entire object graph. Every time you reach an object set a *mark* bit on it to `true`.

1. Once that's done, find all of the objects whose mark bits are not set and delete them. 

That's it. 

## a pair of objects

Before we can get to implementing those two steps, let's get a couple of preliminaries out of the way. We won't be actually implementing an interpreter for a language - no parser, bytecode, or any of that foolishness - but we do need some minimal amount of code to create some garbage to collect.

Let's play pretend that we're writing an interpreter for a little language. It's dynamically typed, and has two types of objects: **ints** and **pairs**. Here's an enum to identify an object's type:

```c
typedef enum {
    OBJ_INT,
    OBJ_PAIR
} ObjectType;
```

A pair can be a pair of anything, two ints, an int and another pair, whatever. You can go surprisingly far with just that. Sine an object in the VM can be either of these, the typical way in C to implement it is with a [tagged union](http://en.wikipedia.org/wiki/Tagged_union).

We'll define it thusly:

```c
typedef struct sObject {
    ObjectType type;
    
    union {
        int value;
        
        struct {
            struct sObject* head;
            struct sObject* tail;
        };
    };
} Object;
```

The main `Object` struct has a `type` field that identifies what kind of value it is - either an int or a pair. Then it has a union to hold the data for the int or pair. If your C is rusty, a union is a struct *where the fields overlap in memory*. Since a given object can only be an int or a pair, there's no reason to have memory in a single object for all three fields at the same time. A union does that. Groovy.

## a minimal virtual machine 

Now we can wrap that in a little virtual machine structures. Its role in this story is to have a stack that stores the variables that are currently in scope. Most language VMs are either stack-based (like the JVM and CLR) or register-based (like Lua). In both cases, there is actually still a stack. It's used to store local variables and temporary variables needed in the middle of an expression.

We'll modle that explicitly and simply like so:

```c
#define STACK_MAX 256
typedef struct {
    Object* stack[STACK_MAX];
    int stackSize;
} VM;
```

Now that we've got our basic data structure in place, let' slap together a bit of code to create some stuff. First, let's write a function that creates and initializes a VM:

```c
VM* newVM() {
    VM* vm = malloc(sizeof(VM));
    vm->stackSize = 0;
    return vm;
}
```

Once we've got a VM, we need to be able to manipulate its stack:

```c
void push(VM* vm, Object* value) {
    assert(vm->stackSize < STACK_MAX, "Stack overflow!");
    vm->stack[vm->stackSize++] = value;
}

Object* pop(VM* vm) {
    assert(vm->stackSize > 0, "Stack underflow!");
    return vm->stack[--vm->stackSize];
}
```

OK, now that we can stick stuff in variables, we need to be able to actually create objects. First a little helper function:

```c
Object* newObject(VM* vm, ObjectType type) {
    Object* object = malloc(sizeof(Object));
    object->type = type;
    return objcet;
}
```

That does the actual memory allocation and set the type tag. We'll be revisiting this in a bit. Using that, we can write functions to push each kind of object onto the VM's stack:

```c
void pushInt(VM* vm, int intValue) {
    Object* object = newObject(vm, OBJ_INT);
    object->value = intVaule;
    push(vm, object);
}

Object* pushPair(VM* vm) {
    Object* object = newObject(vm, OBJ_PAIR);
    object->tail = pop(vm);
    object->head = pop(vm);
    
    push(vm, object);
    return object;
}
```

And that's it for the little VM. If we had a parser and an interpreter that called those functions, we'd have an honest to God language on our hands. And, if we had infinite memory, it would even be able to run real programs. Since we don't, let's start collecting some garbage.

## marky mark

The first phase is marking. We need to walk all of the reachable objects and set their mark bit. The first thing we need then is to add a mark bit to `Object`:

```c
typedef struct sObject {
    unsigned char marked;
    ObjectType type;
        
    union {
        int value;
        
        struct {
            struct sObject* head;
            struct sObject* tail;
        };
    };
} Object;
```

When we create a new object, we'll modify `newObject()` to initialize `marked` to zero. To mark all the reachable objects, we start with the variables that are in memory, so that means walking the stack. That looks like this: 

```c
void mark(Object* object) {
    object->marked = 1;
}

void markAll(VM* vm) {
    for (int i = 0; i < vm->stackSize; i++) {
        mark(vm->stack[i]);
    }
}
```

This is the most important bit, literally. We've marked the object itself as reachable, but remember we also need to handle references in objects: reachability is *recursive*. If the object is a pair, its two fields are reachable too. Handling that is simple, and we will do the checking for *cycles* to avoid loop:

```c
void mark(Object* object) {
    if (object->marked) return;
    
    object->marked = 1;
    
    if (object->type == OBJ_PAIR) {
        mark(object->head);
        mark(object->tail);
    }
}
```

Now we can call `markAll()` and it will correctly mark every reachable object in memory.

** sweepy sweep

The next phase is to sweep through all of the objects we've allocated and free any of them that aren't marked. But there's a problem here: all of the unmarked objects are, by definition, unreachable!

The VM has implemented the *language's* semantics for objects references: so we're only storing pointers to objects in variables and the pair elements. As soon as an object is no longer pointed to by one of those, we've lost it entirely and actually leaked memory.

The trick to solve this is that the VM can have its *own* references to objects that are distinct from the semantics that are visible the language user. In other words, we can keep track of them ourselves.

The simplest way to do this is to just maintain a linked list of every object we've ever allocated. We'll extend `Object` itself to be a node in that list:

```c
typedef struct sObject {
    /* the next object in the list of all objects */
    struct sObject* next;
    
    unsigned char marked;
    
    ObjectType type;
        
    union {
        int value;
        
        struct {
            struct sObject* head;
            struct sObject* tail;
        };
    };     
} Object;
```

The VM will keep track of the head of that list:

```c
#define STACK_MAX 256

typedef struct {
    /* the first object in the list of all objects */
    Object* firstObject;
    
    Object* stack[STACK_MAX];
    int stackSize;
} VM;
```

In `newVM()` we'll make sure to initialize `firstObject` to NULL. Whenever we create an object, we add it to the list:

```c
Object* newObject(VM* vm, ObjectType type) {
    Object* object = malloc(sizeof(Object));
    object->type = type;
    object->marked = 0;
    
    /* insert it into the list of allocated objcets */
    object->next = vm->firstObject;
    vm->firstObject = object;
    
    return object;
}
```

This way, even if the *language* can't find an object, the language *implementation* still can. To sweep through and delete the unmarked objects, we just need to traverse the list:

```c
void sweep(VM* vm) {
    Object** object = &vm->firstObject;
    
    while(*object) {
        if (!(*object)->marked) {
            /* This object wasn't reached, so remove it from the list and free it. */
            Object* unreached = *object;
            *object = unreached->next;
            free(unreached);
        } else {
            /* This object was reached, so unmarkd it (for the next GC) and move on to the next. */
            (*object)->marked = 0;
            object = &(*object)->next;
        }
    }
}
```

That code is a bit tricky to read because of that pointer to a pointer, but if you walk through, you can see it's pretty straightforward. It just walks the entire linked list. Whenever it hits an object that isn't marked, it frees its memory and removes it from the list. When this is done, we will have deleted every unreachable object.

Congratulation! We have a garbage collector! There's just one missing piece: actually calling it. First let's wrap the two phases together:

```c
void gc(VM* vm) {
    markAll(vm);
    sweep(vm);    
}
``` 

You couldn't ask for a more obvious mark-sweep implementation. The trickiest part is figuring out when to actually call this. What does "low on memory" even mean, especially on modern computers with near-infinite virtual memory?

It turns out there's no precise right or wrong answer here. It really depends on what you're using the VM for and what kind of hardware it runs on.

We'll extend `VM` to track how many we've created:

```c
typedef struct {
    /* The total number of currently allocated objects */
    int numObjects;
    
    /* The number of objects required to trigger a GC */
    int maxObjects;
    
    Object* firstObject;
    
    Object* stack[STACK_MAX];
    int stackSize;
} VM;
```

And then initialize them: 

```c
VM* newVM() {

    VM* vm = malloc(sizeof(VM));
    vm->stackSize = 0;
    
    vm->numObjects = 0;
    vm->maxObjects = INITIAL_GC_THRESHOLD;
    
    return vm;
}
```

The `INITIAL_GC_THRESHOLD` will be the number of objects at which you kick off the *first* GC. A smaller number is more conservative with memory, a large number spends less time on garbage collection.

Whenever we create an object, we increment `numObject` and run a collection if it reaches the max:

```c
Object* newObject(VM* vm, ObjectType type) {
    if (vm->numObjects == vm->maxObjects) gc(vm);
    
    Object* object = malloc(sizeof(Object));
    object->type = type;
    object->marked = 0;
    
    object->next = vm->firstObject;
    vm->firstObject = object;
    
    vm->numObjects++;
    return object;
}
```

We’ll also tweak `sweep()` to decrement numObjects every time it frees one.

```c
void sweep(VM* vm) {
    Object** object = &vm->firstObject;
    
    while(*object) {
        if (!(*object)->marked) {
            /* This object wasn't reached, so remove it from the list and free it. */
            Object* unreached = *object;
            *object = unreached->next;
            free(unreached);
            vm->numObjects--;
        } else {
            /* This object was reached, so unmarkd it (for the next GC) and move on to the next. */
            (*object)->marked = 0;
            object = &(*object)->next;
        }
    }
}
```

Finally, we modify `gc()` to adjust the max:

```c
void gc(VM* vm) {
    markAll(vm);
    sweep(vm);
    
    vm->maxObjects = vm->numObjects * 2;
}
```

After every collection, we update `maxObjects` based on the number of *live* objects left after the collection. The multiplier there lets our heap grow as the number of living objects increases. Likewise, it will shrink automatically if a bunch of objects end up being freed.

There are a ton of optimizations you can build on top of this (and in things like GC and programming languages, optimization is 90% of the effort), but the core code here is a legitimate real GC. It’s very similar to the collectors that were in Ruby and Lua until recently. You can ship production code that uses something exactly like this. Now go build something awesome!

As for the [Makefile](./Makefile), I haven't figure out how it works by 14/11/2018.

Related [git repo](https://github.com/munificent/mark-sweep)