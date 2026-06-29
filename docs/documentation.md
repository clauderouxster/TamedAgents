# Operators

[back](https://github.com/naver/lispe/wiki/5.-Description-of-Functions,-Operators-and-Libraries)

Here is an exhaustive description of the operators provided by LispE.
Note that when these operators can applied to one single list, in which case, they apply this operation to all elements inside.

### %: remainder of an integer division
```Lisp
(% 10 3) ; gives 1
```

### *: multiplication
```Lisp
(* 10 2) ; gives 20
```
### +: numerical addition or concatenation of strings

```Lisp
(+ 10 20) ; gives 30
(+ "test" "=" "empty") ; gives "test=empty".
```

### -: subtraction

Be careful to put a space after the minus, otherwise the interpretation will be that of a negative number.
```Lisp
(- 10 2) ; gives 8
```

### /: division
```Lisp
(/ 10 6) ; gives 1.66667
```
### <<: left shift

```Lisp
(<< 10 1) ; gives 20
```

### >>: right shift

```Lisp
(>> 10 1) ; gives 5
```

### ^^: power
```Lisp
(^^ 10 2) ; gives 100
```

### **: power (an alternative to ^^)
```Lisp
(** 10 2) ; gives 100
```

### &: bitwise and
```Lisp
(& 10 2) ; gives 2
```

### &~: bitwise and not

```Lisp
(&~ 10 2) ; gives 8
```


### |: bitwise or
```Lisp
(| 10 6) ; gives 14
```

### ^: bitwise xor
```Lisp
(^ 10 2) ; gives 8
```

### ~: bitwise not
```Lisp
(~ 10) ; gives -11
```

### !: factorial of n
```
(! 6) ; yields 720
```
## Operation and local modification

All operators can be used in the form: +=, *=, /= etc.

The only constraint is that the first element must be a variable.

```Lisp
; We create a variable:

(setq r 10)
(+= r 10)

; r is now 20
```
## Operators on Lists

The following operators take two lists, sets or strings and apply an intersection, a union, or an exclusive union (xor).
These operators then generate a new element, which contains some elements from both objects, without any duplicates.

### intersection: (&&& o1 o2)

The intersection returns a list (string or set), which contains the elements that exist in both objects.

```Lisp
(setq r '(10 20 30 40 30 40))
(setq v '(10 2 2 60 30 4 50 60))

(&&& r v) ; (10 30)

; With sets
(setq r (seti 10 20 30 40))
(setq v (seti 10 2 30 4 50 60))

(&&& r v) ; {10 30}

; with strings
(setq r "aabbccdfedefghij")
(setq v "acaeeegik")

(&&& r v) ; acegi
```

### union: (||| o1 o2)

The union returns a list (string or set), which contains all the elements from both objects.

```Lisp
(setq r '(10 20 30 40 30 40))
(setq v '(10 2 2 60 30 4 50 60))

(||| r v) ; (10 20 30 40 2 60 4 50)

; With sets
(setq r (seti 10 20 30 40))
(setq v (seti 10 2 30 4 50 60))

(||| r v) ; {2 4 10 20 30 40 50 60}

; with strings
(setq r "aabbccdfedefghij")
(setq v "acaeeegik")

(||| r v) ; abcdfeghijk

```

### exclusive union: (^^^ o1 o2)

The exclusive union returns a list (string or set), which contains a union of both lists minus the common elements.

```Lisp
(setq r '(10 20 30 40 30 40))
(setq v '(10 2 2 60 30 4 50 60))

(^^^ r v) ; (20 40 2 60 4 50)

; With sets
(setq r (seti 10 20 30 40))
(setq v (seti 10 2 30 4 50 60))

(^^^ r v) ; {2 4 20 40 50 60}

; with strings
(setq r "aabbccdfedefghij")
(setq v "acaeeegik")

(^^^ r v) ; bdfhjk
```

## Infix

The way mathematical formulas are written in _LispE_ do not always make the expressions very readable.
_LispE_ provides a specific operator: _infix_ that allows mathematical expressions to be written infixed.
The only constraint is that operators and operands must be separated with a space.

These expressions are compiled on the fly and replaced in the code with their actual _LispE_ interpretation.
The way the expression is compiled takes into account the traditional notion of operator precedence.

It is also possible to have an idea of how these expressions are actually compiled if you put them in a lambda in the console, which is then compiled into the final expression.
Furthermore, note that the _infix_ operator only applies to the top expression in parentheses. 
If you have a sub-expression within the expression, you will need to use the infix operator again.

### infix _or_ /\\ _or_ • _or_ §

Each of these four operators is equivalent.

```Lisp
; This is compiled as (lambda (x) (- (+ 10 20) (* 4 x)))
(lambda (x) (infix 10 + 20 - 4 * x)) 

; This is compiled as (lambda (x) (- (+ (^^ x 3) (* 10 (^^ x 2)) (* 2 x)) 1))
(lambda (x) (• x ^^ 3 + 10 * x ^^ 2 + 2 * x - 1)) 

; This is compiled as (lambda (x) (- (+ (* 10 (^^ (- x 1) 2)) (* 2 (- 4 x))) 1))
; If you don't use the infix operator in an expression, you need to write it as usual
(lambda (x) (/\ 10 * (§ x - 1) ^^ 2 + 2 * (- 4 x) - 1)) 
```

### (infix list)

If _infix_ is provided with a list or a variable, then the transformation is _applied during the execution_.

```Lisp
(infix '(12 + 30)) ; (+ 12 30)
```

## Operations With Lists

Note that all these operators can _recursively_ apply between lists:

```Lisp
; Operation between two or more lists
(+ '(1 2 3) '(4 5 6) '(3 2 1)) ; yields (8 9 10)

; Operation with a scalar
(- '(10 9 8) 4) ; yields (6 5 4)

; Operation with a list of lists and another list
(+ '((1 2 3) (4 5 6 7) (1 1 1)) '(2 2 2)) ; yields ((3 4 5) (6 7 8 9) (3 3 3))
```

## Comparisons

The comparison operators are as follows:

### =: equal

The difference with _eq_ is that _eq_ does not recursively compare lists or dictionaries, while _=_ does.
 
```Lisp
(= 10 10) ; yields true
(= '(1 2 3) '(1 2 3)) ; yields true
```

### !=: different
```Lisp
(!= 10 20) ; yields true
(!= '(1 2 R) '(1 2 A)) ; yields true
```


### <: less
```Lisp
(< 10 100) ;gives true
```
### <= : less or equal

```Lisp
(<= 10 10) ;gives true
```

### >: more

```Lisp
(> 10 5) ; gives true
```

### >=: greater or equal
```Lisp
(>= 10 10) ; gives true
```

### >=<: GEL operator (>=< x y)

The GEL operator (_g_ is pronounced as in _get_) is mainly used with heaps.

* It returns -1 is x is lower than y.
* It returns 0 is x is equal to y.
* It returns 1 is x is greater than y.

```Lisp
(>=< 10 10) ; yields 0
(>=< 10 11) ; yields -1
(>=< 11 10) ; yields 1

```

# Functions

[back](https://github.com/naver/lispe/wiki/5.-Description-of-Functions,-Operators-and-Libraries)

Here is an exhaustive description of the functions provided by LispE.

### @: (@ container k1 k2 k3...kn)
Returns the value corresponding to a sequence of keys.
The container can be a list, a matrix, a tensor or a dictionary.

```Lisp
(setq r (rho 2 2 (iota 5))) ; r = ((1 2) (3 4))
(println (@ r 0 1)) ; is 2
```

### @@: (@@ container b e)

This operator is a synonym of [extract](https://github.com/naver/lispe/wiki/5.2-Functions#extract-extract-e-i1-i2-i2-is-optional)

### @@@: (@@@ container shape k1 k2...)

This operator is a synonym of [atshape](https://github.com/naver/lispe/wiki/5.2-Functions#atshape-atshape-container-shape-k1-k2-k3kn)

### and: (and cond1 cond2 cond3)

Boolean _AND_

```Lisp
(and (< 10 100) (>= 10 10)) ; gives true 
```

### andvalue: (andvalue cond1 cond2 value)

Boolean _AND_ that returns a value

```Lisp
(andvalue (< 10 100) (>= 10 10) 21) ; returns 21
```

### apply: (apply fonc list)

applies a function to the following arguments
```Lisp
(apply '+ '(1 2 3 4)) ; gives 10

(setq f '*)
(apply f '(2 3 4)) ; gives 24
```

### asyncjs

**Important, this function is only available in LispE WASM.**

Applies an asynchrone function associated with a LispE callback function with arguments:

```
(asyncjs "call_my_js_script(10,20)" lispecallback arg1 arg2)
```

The callback function is optional. `asyncjs` launches a Promise, which once it is executed will call the lispecallback.

```Lisp

(defun rappel(val id)
   (setg test val)
   (println id ":" val)
)

(setq url "http://localhost:1234")
(setq system "You are a specialist in programming languages.")
(setq prompt "Give me the code to multiply two complex numbers.")
(setq model "qwen2-math-1.5b-instruct@q8_0")

(setq query (f_ `call_lm_studio("{url}", "{model}", "{system}", "{prompt}");`))
(asyncjs query 'rappel 1)
```

### at: (at container k1 k2 k3...kn)

Returns the value corresponding to a sequence of keys.
The container can be a list, a matrix, a tensor or a dictionary.

_at is the official name for the operator @_

```Lisp
(setq r (rho 2 2 (iota 5))) ; r = ((1 2) (3 4))
(println (at r 0 1)) ; is 2
```

### atshape: (atshape container shape k1 k2 k3...kn)

Returns the value corresponding to a sequence of keys, according to a _shape_.
The container should be a flat list of values. _shape_ should be a list of values that provides the virtual dimensions that are projected onto the flat list of values.

When _keys_ are negative then _LispE_ iterates on all lines or columns.

* if _key_ is -1 then it iterates on lines.
* if _key_ is -2 then it iterates on columns.

__Important__: If you interpolate negative and positive dimensions, the result is unpredictable. Negative dimensions should always be together. The line or column extraction _is defined by the last negative key_.

_atshape is the official name for the operator @@@_

```Lisp
(setq fv (range 0 60 1))

(setq sh (integers 3 4 5))

(@@@ fv sh  1 2 3) ;33
(@@@ fv sh 1 2) ;(30,31,32,33,34)
(@@@ fv sh -1 -1 1) ;(1,6,11,16,21,26,31,36,41,46,51,56)
(@@@ fv sh -1 -2 1) ;(1 21 41 6 26 46 11 31 51 16 36 56)
(@@@ fv sh -1 -1) ;(0..59)
(@@@ fv sh -1 -2) ;(0,1,2,3,4,20,21,22,23,24,40,41,42,43,44,5,6,7,8,9,25,26,27,28,29,45,46,47,48,49...)

```

### atomp: (atomp e)

returns true if the argument is an atom

```Lisp
(atomp 'e) ; returns true
```

### atoms: (atoms)

returns the list of atoms stored at the top of the execution stack

```Lisp
(atoms) ; at the root returns:

(fpiecewise_linear_distribution piecewise_constant_distribution discrete_distribution log cosh cos cbrt asin alphap second hour etc.).
```

### block

allows the evaluation of a list of lists

```Lisp
(if (eq x 10)
     (block 
           (print x)
            1
      )
      (+ x 1) 
)
```

#### `__root__`

`__root__` is a specific kind of _block_, which is used to enclose the initial code before evaluation. 
Basically, we use this instruction to push the whole code within a single block.

This instruction is usually hidden within LispE's compiler, however it can be used in some cases when evaluating a block of instructions.


### bodies: (bodies name)

Returns the list of bodies for _defpat_ function definitions


### break

Allows you to exit a "loop".

### car, cdr, cadr, caadr
* _car_ returns the first element of a list
* _cdr_ returns the list following the first item. 

Variations can also be made by mixing the _a_ and _r_. For example _caadr_ corresponds to _(car (car (cdr l)))_.

```Lisp
(car '(1 2 3)) ; gives 1
(cdr '(1 2 3)) ; gives '(2 3))
(cdar '((1 5) 2 3)) ; gives (5) equivalent to (cdr (car '((1 5) 2 3)))

```

### Classes

LispE provides a class implementation (see [classes](https://github.com/naver/lispe/wiki/6.21-Classes))

```Lisp
(class@ myclass (x y) ; we define our class

   (defun myfunc(a)
      (return (+ a x y))))

(setq c (myclass 10 20)) ; we create an instance
(c (myfunc 20)) ; we call a method
```


### bappend
Appends a list of shorts to a file, byte by byte.

### bread
reads a text file (UTF8) and returns the content as a list of shorts.

### bwrite
Writes a list of shorts to a file, byte by byte.

### bytes

This method returns the content of a string as a list of shorts, corresponding to the internal encoding of the string.

```Lisp
(setq s b"This is a string")
(bytes s) ; (84 104 105 115 32 105 115 32 97 32 115 116 114 105 110 103)
```

### catch

_catch_ is used to _capture_ errors as a way to prevent programs from stopping.

_catch_ acts as a _block_. It takes a list of instructions and stops at the first error. It then returns a _maybe_ object that contains the error message. You can then use the instruction _maybe_ to check if an error occurred while running the code.

```Lisp
(setq c
    (catch
        (setq e 10)
        (setq v 0)
        (cons ' a)
    )
)

(if
    (maybe c)
    (print Error: c)
    (print No error)
)
```

### check: (check CONDITION I1...In)

If CONDITION is _true_, execute the list of instructions: `I1,I2... to In`.

```Lisp
(setq k 10)

; if k < 100, we increment it
(check (< k 100)
       (println k)
       (+= k 1)
)

``` 

### (clone struct)

Clones a container or a string.

### complex

This instruction is used to create complex numbers. It takes two arguments of type _number_ to create a complex number.

A complex number can also be created with the following pattern: r,ni, where is _r_ and _n_ are actual values.

Complex numbers can be used in any types of numerical expressions.

It is possible to extract the [_real_](https://github.com/naver/lispe/wiki/5.2-Functions#real) and the [_imaginary_](https://github.com/naver/lispe/wiki/5.2-Functions#imaginary) part with the function: `real and imaginary`.

```Lisp

;These two instructions are equivalent
(setq c (complex 10 -3))
(setq cc 10,-3i)

```

### cond: (cond (cond1 action1) (cond2 action2)...(true final_action)) 

Allows to chain multiple conditions

```Lisp
(cond
    (
        (< x 10)
        (print x is smaller than 10)
    )
    (
        (< x 100)
        (print x is smaller than 100)
    )
    (true
        (print x is greater than 100)
    )
)
```

### cons: (cons e l)

It creates a new list by merging the first item into the next one.

```Lisp
(cons 'a ()) ; gives (a)
```

### consb: (consb l e) 

_consb_ works as a reverse _cons_. 

(_consb_ means *cons_back*)

It creates a new list with the first element as the initial list.

```Lisp
; Compares cons to consb on a simple example

(cons '(a b) '(c d)); is ((a b) c d)
(consb '(a b) '(c d)); is (a b (c d))
```

### consp: (consp e)

returns true if the argument is a list
```Lisp
(consp '(1 2 3)) ; returns true 
```

### containerkeys: (containerkeys dict)

Returns the keys of a container.
Same as [_keys@_](https://github.com/naver/lispe/wiki/5.2-Functions#keys-keys-dict)

```Lisp
(print (containerkeys d)) 
```

### containervalues: (containervalues dict)

Returns values from a dictionary (see _containerkeys_)

Same as [_values@_](https://github.com/naver/lispe/wiki/5.2-Functions#values-values-dict)

### count: (count o u pos)

Counts the number of times u is in o

```Lisp
(count "abcdefabdefabghabtr" "ab") ; yields 4
```

### cutlist: (cutlist lst size)

This instruction slices a list or a string into a list of slices of same size.

(see `slice` for the original name)

```Lisp
(cutlist '(a b c d e f g h i j k l) 3) ; ((a b c) (d e f) (g h i) (j k l))
```

### cyclicp: (cyclicp e)

returns true if the argument is a linked list that contains cycles
```Lisp
(setq l (llist 10 20 30))
(extend l l)
(cyclicp l) ; yields true
```

### data: Define data structures

_data@_ is used to defined data structures, which can be used to organise data and types.

see: [Data Structures](https://github.com/naver/lispe/wiki/6.7-Data-Structures) for more information.

### defmacro

_defmacro_ helps define your own macros. A macro is a piece of code that is replaced on the fly within your functions. When you use a macro, there is no call to a function, since the code has been replaced with the macro instructions.

_Note_: You can use any variable names in the macros. Actually, when the macro is compiled, its variable names are replaced with specific macro names that cannot be confused with LispE _declarable_ names.

```Lisp

; this macro returns true if a value is in a list
(defmacro in_list (x l) (not (nullp (find l x))))

; You simply use the name as if it was a function name.
(println (in_list 1 '(1 2 3 4)))

; whose underlying structure is now:
(println (not (nullp (find '(1 2 3 4) 1))))
```

see: [Macro Functions](https://github.com/naver/lispe/wiki/6.1.1-Macro-Functions) for more information.

### deflib: Internal interpreter use: 
see [Enrich LispE](https://github.com/naver/lispe/wiki/3.1-How-to-enrich-LispE)

### defun: (defun label (param1 param2...) code)

allows you to define a function. _defun_ consists of a name followed by a list of arguments and the body of the function.

```Lisp
(defun add (x y) (+ x y))
```

### defpat: (defpat label (param1 param2...) code)

allows you to define pattern matching functions. Note that the function name can be defined more than once, each with a different pattern.

see: [Pattern Functions](https://github.com/naver/lispe/wiki/6.1-Pattern-Functions) for more information.

### defpred: (defpred label (param1 param2...) code)

`defpred` is a function definition mechanism in LispE that extends pattern matching with predicate-based function selection, _pred_ stands for `predicate` in this context. Similar to `defpat`, it allows multiple function definitions with the same name that are selected based on pattern matching.

Key Differences from `defpat`:
- In `defpred`, each instruction in the function body is evaluated as a Boolean
- If any instruction returns false (nil or 0), the function fails
- Upon failure, the system attempts the next function definition
- Provides built-in backtracking similar to Prolog's logical programming approach

Parameter Matching:
- Supports type-based and pattern-based parameter matching like `defpat`
- Uses the same parameter definition rules
- Can match against lists, dictionaries, and custom data types

Execution Behavior:
- Functions are tried in order of definition
- Each function body is a series of boolean tests
- Successful execution stops further function searching
- Failed tests trigger searching for alternative function definitions

```lisp
(defpred teste ([]) 
   true
)

(defpred teste ([a $ b])
   (< a 10)
   (println a)
   (teste b)
)

(defpred teste (l)
   (println "We stop" l)
)

(teste '(1 2 11 12 13))

; yields

1
2
We stop (11 12 13)
```

### defprol: (defprol label (param1 param2...) code)
`defprol` is a function definition mechanism in LispE that enables a mini-Prolog-like behavior, allowing multiple function definitions with the same name to be attempted. Unlike defpred, which stops on the first successful definition, defprol collects results from all definitions that successfully execute their body. prol stands for prolog in this context.

#### Key Differences from defpred and defpat:

Similar to defpred, each instruction in the function body is evaluated.

If any instruction in a defprol body evaluates to false (nil or 0), that specific function definition fails, and its execution path is abandoned for the current call.

If a function body successfully executes all its instructions, the last evaluated value of the body is collected.

All function definitions matching the label and parameters are attempted in order.

The final result of a `defprol` call is a list containing the collected last evaluated values from all successful function definitions for that specific call.

Parameter Matching:

* Supports type-based and pattern-based parameter matching like defpat and defpred.
* Uses the same parameter definition rules.
* Can match against lists, dictionaries, and custom data types.

Execution Behavior:

* Functions are tried in order of definition.
* Each function body is a series of instructions.
* If a function body completes without any instruction evaluating to false, its last evaluated value is added to a list of results.
* If a function body encounters an instruction that evaluates to false, that definition's execution stops, and no value is collected from it. After attempting all matching function definitions, the system returns the list of collected values from all successful definitions.

* Two special predicates, `cut_` and `fail_`, are available within defprol bodies to control execution flow. fail_ explicitly causes the current definition to fail, prompting the system to try the next definition. cut_ means that no further tests with the next remaining functions will be done. 

```Lisp
(defprol test(a b)
   (< a b)
   (+ a b)
)

(defprol test(a b)
   (= (- b a) 2)
   cut_
   (* a b)
)

(defprol test(a b)
   (< (+ a b) 100)
   (- b a)
)

(test 10 12) ; returns (22 120)
(test 10 14) ; return (24 4)
```

### dethread: (dethread label (param1 param2...) code)

_dethread_ allows you to declare a thread. The main thread can then wait for all these threads to end their execution.

```Lisp

; we define a thread
(dethread call(s i)
   (loop e (range 0 i 1)
      (+= s (string e))
   )
   (println s)
)

; We call 3 threads with different arguments
(call "l:" 10)
(call "x:" 20)
(call "y:" 30)

; we wait for these threads to end
(wait)
```

### defspace: (defspace namespace ...)

_defspace_ defines a _namespace_, in which every function defined in the body is stored.

These functions can only be accessed with the [_space_](https://github.com/naver/lispe/wiki/5.2-Functions#space-space-namespace-) operator.

Note: _namespace_ is always an atom.

A _namespace_ is a way to ensure that different function implementation sharing the same name can coexist in the same program.

A _namespace_ can be created with _defspace_ but also [_load_](https://github.com/naver/lispe/wiki/5.2-Functions#load-load-filename-namespace) or [_use_](https://github.com/naver/lispe/wiki/5.2-Functions#use-use-bib-namespace).
Thanks to _namespace_, function name collisions can then be avoided.


```Lisp

(defspace truc

   (defun calculus (x y)
      (+ x y)
   )

   (defun toto (u v)
      (* u v)
   )
)

(println (space truc (calculus 10 20)))
```

### dictionary: Dictionary indexed on strings

`(dictionary k v k' v' k" v"...)`: Creates a dictionary with _key/value couples_

```Lisp
; We create a dictionary
(setq d (dictionary "a" "e" "b" "c" "d" "e"))

; We display the value for the key "a". 
(println (@ d "a"))
```

### dictionaryi: Dictionary indexed on integers

`(dictionaryi k v k' v' k" v"...)`: Creates a dictionary with _key/value couples_

```Lisp
; We create a dictionary
(setq d (dictionaryi 12 "e" 17 "b" 15 "hh"))

; We display the value for the key 12. 
(println (@ d 12))
```

### dictionaryn: Dictionary indexed on numbers

`(dictionaryn k v k' v' k" v"...)`: Creates a dictionary with _key/value couples_

```Lisp
; We create a dictionary
(setq d (dictionaryn 12 "e" 17 "b" 15 "hh"))

; We display the value for the key 12. 
(println (@ d 12))
```

### dictionarytree: Dictionary indexed on sorted strings

`(dictionarytree k v k' v' k" v"...)`: Creates a dictionary with _key/value couples_

```Lisp
; We create a dictionary
(setq d (dictionarytree "a" "e" "b" "c" "d" "e"))

; We display the value for the key "a". 
(println (@ d "a"))
```

### dictionarytreei: Dictionary indexed on sorted integers

`(dictionarytreei k v k' v' k" v"...)`: Creates a dictionary with _key/value couples_

```Lisp
; We create a dictionary
(setq d (dictionarytreei 12 "e" 17 "b" 15 "hh"))

; We display the value for the key 12. 
(println (@ d 12))
```

### dictionarytreen: Dictionary indexed on sorted numbers

`(dictionarytreen k v k' v' k" v"...)`: Creates a dictionary with _key/value couples_

```Lisp
; We create a dictionary
(setq d (dictionarytreen 12 "e" 17 "b" 15 "hh"))

; We display the value for the key 12. 
(println (@ d 12))
```

### droplist: (droplist condition list)

* This function is very similar to [_dropwhile_](https://github.com/naver/lispe/wiki/5.4-A-la-Haskell#dropwhile-dropwhile-condition-list) however, it cannot compose with other high level functions such as _map_, _takewhile_ or _drop_.
* Second, the value from the list is always appended _at the end_ of the condition, unless you use `_` as a slot filler.

As such, it is not expanded into a _loop_ instruction as _dropwhile_ and is much faster.

_droplist_ drops elements from a list until the condition complies with a value. It then returns the remainder of the list.

```Lisp
(droplist '(< 10) '(1 4 5 11 9 11 20)) returns (11 9 11 20) ; it applies (< 10 x)
(droplist '(< _ 10) '(1 4 5 11 9 11 20)) returns (1 4 5 11 9 11 20) ; it applies (< x 10)


(droplist (lambda (x) (> x 10)) '(1 4 5 10 11 9 20)) returns (11 9 20)
```

### endwith

This function checks if a string ends with a specific substring:

```Lisp

(endwith "test" "st") ; true
(endwith "test" "at") ; nil

```

### enum

This function takes as input a list and returns another list, where each element is associated with its index.
This function takes a second optional parameter, which is the index initial value. By default the value is 0.

```Lisp
(setq a '(a b c))
(loop c (enum a)
    println(c)
)

; (0 a)
; (1 b)
; (2 c)

(loop c (enum a 3)
    println(c)
)

; (3 a)
; (4 b)
; (5 c)
```

### eq/neq: (eq e1 e2)

comparison between two elements to verify equality
`neq`corresponds to `(not (eq ..))`

```Lisp
(setq x 100)
(eq x 100) ; returns true
```

### emptyp: checks if a list is empty

```Lisp
(emptyp '()) ; true
```
 
### eval

Allows to evaluate a string as a Lisp expression or to evaluate a list.

```Lisp
(eval (list 'cons ''a '''(1 2 3))) ; gives (a 1 2 3)

(eval "(cons 'a '(1 2 3))") ; also gives  
```
### explode: (explode string)

allows to transform a string into a list of atoms.

```Lisp
(explode "abcd") ; yields (a b c d)
```

### evaljs

**IMPORTANT** _this function is only available in LispE WASM library._

Applies the JavaScript interpreter on a string. Always returns a string.

```Lisp
(evals "10+30") ; returns 40
```

### explode: (explode string)

allows to transform a string into a list of atoms.

```Lisp
(explode "abcd") ; yields (a b c d)
```


### extract: (extract e i1 (i2)), i2 is optional

Makes it possible to extract a sub-list between two indexes or a sub-string between numerical indexes or sub-strings.
It is possible to give negative indexes which are then calculated from the end of the list or the string. 

In the case of a string if the first index is also a string and the second index a number, then this number defines the number of characters to be extracted. 

If only one argument is given, the function is equivalent to "@".

The operator "@@" is equivalent.

#### operators: +, -

_These two operators must be placed just before the double-quotes._

* The `+` indicates that the searched string must be part of the final string.
* The `-` indicates that the search must be done reverse from the end of the string. 
* The `-+` combines the two operators. The search is done reverse with it being part of the final string.

*Note that "-" used at the last argument, without any value, indicates that we extract up to the end*

```Lisp
(extract '(1 2 3 4 5) 1 3) ; gives (2 3)
(extract "12345" 1 3) ; gives "23". 
(extract "abcdefghij" "b" "e") ; gives "cd".
(extract "abcdefghij" +"b" +"e") ; gives "bcde".
(extract "abcdefghij" "b" 3) ; gives "cde".
(extract "abcdefghij" +"b" 3) ; gives "bcde".
(extract "12345" -2) ; gives "4".
(extract "12345" 1 -1) ; gives "234". 
(extract "/home/test/titi/toto/name.txt" -"/" -) ; yields "name.txt"
(extract "/home/test/titi/toto/name.txt" -+"/" -) ; yields "/name.txt"

; We can also use @@ in lieue of extract
(@@ "/home/test/titi/toto/name.txt" -"/" -) ; yields "name.txt"
(@@ "/home/test/titi/toto/name.txt" -+"/" -) ; yields "/name.txt"

```

### fappend: (fappend pathname data)
writes a string at the end of a file

### filterlist: (filterlist condition list)

* This function is very similar to [_filter_](https://github.com/naver/lispe/wiki/5.4-A-la-Haskell#filter-filter-condition-list) however, it cannot compose with other high level functions such as _map_, _takewhile_ or _drop_.
* Second, the value from the list is always appended _at the end_ of the condition, unless you use `_` as a slot filler.

As such, it is not expanded into a _loop_ instruction as _filter_ and is much faster.

```Lisp
(filterlist '(< 10) '(1 4 5 10 11 20)) returns (11 20), we test (< 10 list_value)
(filterlist '(< _ 10) '(1 4 5 10 11 20)) returns (1 4 5), we test (< list_value 10)

; Note that (filter '(< 10) '(1 4 5 10 11 20)) returns (1 4 5)

(filterlist (lambda (x) (< x 10)) '(1 4 5 10 11 20)) returns (1 4 5)
```

Note that: `(filterlist '(< 10) '(1 4 5 10 11 20))` is equivalent to `(filterlist '(< 10 _) '(1 4 5 10 11 20))`.

### find: (find e o pos)

returns the position of `e` in `o` or `nil`. `o` is either a list or a string.  

```Lisp
(find "abcdef" "bc") ; gives 1
(find "abcdef" "bd") ; gives nil
```

### findall: (findall string string pos)

returns a list of all positions of the sub-string in the string. 

```Lisp
(findall "abcdefabdefabghabtr" "ab") ; gives (0 6 11 15)
```

### flatten: (flatten l)

_Flatten_ a list or a dictionary.


```Lisp
(flatten '( ( (1 2) (3 4)) (5 6))) ; yields (1 2 3 4 5 6) 
```

### float: (float e)

converts a string into a float (32 bits)

```Lisp
(float "12.3") ; gives 12.3
``` 

### floats: (floats e)

Converts a list into a list of floats.
_e_ can also be more than one elements.

```Lisp
(floats '(1.2 3.3 4 5))
(floats 1.2 3.3 4 5) ; is also acceptable
``` 

### flip: (flip (f x y))

flips the two first arguments of a function.

_Note:_ If you use _flip_ on a dictionary, it will reverse keys and values.

```Lisp
(flip (- 10 2)) ; yields: -8
```

### fopen: (fopen pathname op)
Open a text file with its pathname:

`op` is:
* 'r': read mode
* 'w': write mode
* 'a': append mode 

```Lisp
(setq fe (fopen "/home/user/toto" "r")
```

It returns a specific object of type `file_element_`, which can be used with other methods.

### fclose: (fclose fe)

```Lisp
(setq fe (fopen "/home/user/toto" "r")
(fclose fe)
```

Close a `file_element_` object.

### fgetchars: (fgetchars fe nb)

Reads nb bytes from the current `file_element_` object. 

```Lisp
(setq fe (fopen "/home/user/toto" "r")
(fgetchars fe 100)

```


### fputchars: (fputchar fe str)

Write `str` at the current position in the `file_element_` object.

```Lisp
(setq fe (fopen "/home/user/toto" "r")
(fputchars fe "test")
```


### from@: class derivation or method access

This operator is used to either derive a class from another or to call the mother class function. (see [classes](https://github.com/naver/lispe/wiki/6.21-Classes))

```Lisp
(class@ mother (x y)
   (defun displaying()
      (println x y)
    )
   
    (defun test(a)
       (if (eq a x) y x)))

(class@ daughter (u) (from@ mother) ; we have now: u x y as arguments
    (defun test(a) ; this function replaces the mother function...
       (if (eq a x) u x))

    (defun call_mother(a)
        (from@ mother (test a)))

; note that, if the class doesn't add arguments:

(class@ daughterbis (from@ mother) ; we have now: x y as arguments
    (defun test(a) ; this function replaces the mother function...
       (if (eq a x) (+ x y) x))

    (defun call_mother(a)
        (from@ mother (test a)))
```

### fsize: (fsize pathname|fe)

Return the size of the file either through its pathname or a `file_element_` object.

```Lisp
(setq fe (fopen "/home/user/toto" "r")
(fsize fe)
```

### fseek: (fseek fe pos)

Position the reading head within the `file_element_` object at pos.

```Lisp
(setq fe (fopen "/home/user/toto" "r")
(fseek fe 100)
```

### ftell: (ftell fe)

Return the position of the current head position in the `file_element_` object.

```Lisp
(setq fe (fopen "/home/user/toto" "r")
(ftell fe)
```

### fwrite: (fwrite pathname data)
writes a string to a file

### fread: (fread pathname)
reads a text file (UTF8) and returns the content as a string of bytes: (fread "file")

### fwrite: (fwrite pathname data)
writes a string to a file

### heap: (heap comparison v1 v2 ...)

A heap is a structure in which element are automatically sorted out according to the comparison provided. The _heap_ is implemented with a binary tree, where elements are compared through the _comparison operator or lambda_.

* A heap can be created with a first list of values.
* An element is inserted in a heap with: _insert_.
* An element is removed from a heap with: _pop_, _popfirst_, _poplast_.
* _car_ returns the first element of the structure
* _cdr_ does not apply in this context.
* @ works, the index is used to traverse the structure in a prefix way (top-down).

* If _comparison_ is _nil_ or _()_, then the default comparator is: `>=<`. Note that `(>=< x y)`  returns:
> * -1 if x is lower than y
> * 0 if x is equal to y
> * 1 if x is greater than y

* If comparison is a lambda expression, then it must return
> * -1 if x is lower than y
> * 0 if x is equal to y
> * 1 if x is greater than y

```Lisp
(setq h (heap '>=< 10 30 20 19 12)) ; h is (10 12 19 20 30)
(insert h 2) ; h is (2 10 12 19 20 30)
(pop h 19) ; h is (2 10 12 20 30)

; We sort out elements according to their first element
(setq comparison (\(x y) (>=< (car x) (car y))))
(setq h (heap comparison '(16 (0 3)) '(11 (0 2)) '(11 (1 1)) '(18 (2 0))))

; h is now ((11 (0 2)) (11 (1 1)) (16 (0 3)) (18 (2 0)))

(car h) ; is (11 (0 2))

(@ h 0) ; is (16 (0 3)), which is the root of the tree
(@ h 1) ; is ((11 (0 2)) (11 (1 1))) since they share the same first element
(@ h 2) ; is (18 (2 0))
(@ h -1) ; is (18 (2 0)), the last node of the tree

; You can loop on values
(loop c h
   (print c)
)

(to_list h) ; is ((11 (0 2)) (11 (1 1)) (16 (0 3)) (18 (2 0)))
; Note that the node that contains two values has been reverted compared to to_list
(to_llist h) ; is ((11 (1 1)) (11 (0 2)) (16 (0 3)) (18 (2 0)))

```

### if: (if (predicate) THEN ELSE) 

test the predicate, if it's true execute THEN if not ELSE. _ELSE_ is optional.

```Lisp
(if (eq x 10) (println true) (println false))
```

### ife: (ife (predicate) THEN ELSE_BLOCK) 

test the predicate, if it's true execute THEN if not ELSE. The _ELSE_ is actually a block of instructions.

```Lisp
; if x ≠ 10 then (setq x 20) and (println false) will be executed
; otherwise only (println true)

(ife (eq x 10) (println true) (setq x 20) (println false))
```

### imaginary

This method returns the _imaginary_ part of a [complex number](https://github.com/naver/lispe/wiki/5.2-Functions#complex).

```Lisp
(setq c 12,-3i)
(set r (imaginary c)) ; r is -3
```

### in: (in e o pos)

returns _true_ or `nil` if `e` in `o`. `o` is either a list or a string.  

```Lisp
(in "abcdef" "bc") ; gives true
(in "abcdef" "bd") ; gives nil
```

### input@

Allows to read an input from keyboard. 
You can also provide a string that can be modified in `input`

```Lisp
; keyboard reading of a string
(setq v (input@))

; We can also modify the content of v again
(setq v (input@ v))
```

### integer: (integer e)

converts a string into an integer value

```Lisp
(integer "12") ; gives 12
``` 

### integers: (integers e)

converts a list into a list of integers.
_e_ can also be more than one elements.

```Lisp
(integers '(1 3 4 5))
(integers 1 3 4 5) ; is also acceptable
``` 

### insert: (insert l e idx)

Inserts the _e_ element in _l_ at the idx position.

_l_ can be a list or a string

```Lisp
(insert '(1 2 3) 4 1) ; gives (1 4 2 3)
```

#### (insert l e function)

There is a second use of _insert_ with a _function_. In this case, the _function_ is used to determine where to add the element.

__IMPORTANT__: _insert_ uses a _dichotomy_ algorithm to store elements in a list. However, if you have a large number of elements, it is much more efficient to use a [_heap_](https://github.com/naver/lispe/wiki/5.2-Functions#heap-heap-comparison-v1-v2-)

```Lisp
(setq r '(10 20 30 40 50))
(insert r 15 '<) ; yields (10 15 20 30 40 50)
(insert r 35 '<) ; yields (10 15 20 30 35 40 50)
```

### join: (join l sep)

transforms a list of atoms into a string

```Lisp

(join '(a b c) '/) ; gives "a/b/c". 

```
### key@: Dictionary indexed on strings of characters

Four actions:

1. `(key@)`: creates a dictionary
1. `(key@ k v k' v' k" v"...)`: Creates a dictionary with _key/value couples_
1. `(key@ d k v k' v' k" v"...)`: sets _key/value couples_ in dictionary _d_
1. `(key@ d k)`: returns the value in the dictionary _d_ for key _k_

__Note:__ However, _key_ can create a dictionary indexed on strings, it is better to use [_dictionary_](https://github.com/naver/lispe/wiki/5.2-Functions#dictionary-dictionary-indexed-on-strings) for this purpose.

```Lisp
; We create a dictionary
(setq d (key@))

; Values are added to the dictionary
(key@ d "a" "e" "b" "c" "d" "e")

; We display the value for the key "a". 
(println (key@ d "a"))
```

### keyi@: Dictionary indexed on integers


1. `(keyi@)`: creates a dictionary
1. `(keyi@ k v k' v' k" v"...)`: Creates a dictionary with _key/value couples_
1. `(keyi@ d k v k' v' k" v"...)`: sets _key/value couples_ in dictionary _d_
1. `(keyi@ d k)`: returns the value in the dictionary _d_ for key _k_

__Note:__ However, _keyi_ can create a dictionary indexed on integers, it is better to use [_dictionaryi_](https://github.com/naver/lispe/wiki/5.2-Functions#dictionaryi-dictionary-indexed-on-integers) for this purpose.


```Lisp
; We create a dictionary
(setq d (keyi@))
; We add a value in the dictionary
(keyi@ d 12 "e" 17 "b" 15 "hh")

; The value for key 12 is displayed.
(println (keyi@ d 12))
```

### keyn: Dictionary indexed on numbers

1. `(keyn@)`: creates a dictionary
1. `(keyn@ k v k' v' k" v"...)`: Creates a dictionary with _key/value couples_
1. `(keyn@ d k v k' v' k" v"...)`: sets _key/value couples_ in dictionary _d_
1. `(keyn@ d k)`: returns the value in the dictionary _d_ for key _k_

__Note:__ However, _keyn_ can create a dictionary indexed on numbers, it is better to use [_dictionaryn_](https://github.com/naver/lispe/wiki/5.2-Functions#dictionaryn-dictionary-indexed-on-numbers) for this purpose.

```Lisp
; We create a dictionary
(setq d (keyn@))
; We add a value in the dictionary
(keyn@ d 12 "e" 17 "b" 15 "hh")

; The value for key 12 is displayed.
(println (keyn@ d 12))
```

### keys@: (keys@ dict)

Returns the keys of a container

```Lisp
(print (keys@ d)) 
```

### label: (label lab exp)

Saves the argument under the provided label

```Lisp
(label myLabel (lambda (x) (eq x 10))
``` 

### lambda: definition of a lambda function

Note that we accept `\` and `λ (Unicode 955)` as substitute characters for the keyword lambda

```Lisp
( (lambda (x y) (+ x y)) 10 20)
( (\ (x y) (+ x y)) 10 20)
( (λ (x y) (+ x y)) 10 20)

```

### last: (last e)

returns the last element of a list or the last character of a string.

```Lisp
(last '(1 2 3)) ; returns 3

```

### let: (let ( (var1 value1) .. (varn valuen)) i1...in)

_let_ is a combination of _setq_ and _block_. It allows you to create local variables, which only exists within the confines of this instruction. When the _let_ is terminated, these variables are removed from the stack.

```lisp
(setq r 1000)

(let ((r 22) 
      (v 10)) 
   (if (< r v)
       (+= r 1)
       (+= r 20))
   r) ; returns 42 

(println r) ; however when back r is still 1000

```

### link: (link str atom)

Create a string that shares the same id as a given atom. This is especially useful to modify the behaviour of the tokeniser in LispE.

(see [cosine](https://github.com/naver/lispe/blob/master/examples/haskellish/cosine.lisp) for an example)

```Lisp

; "BEGIN" and "END" have now the same ids as '( and ')
(link "BEGIN" (atom "("))
(link "END" (atom ")"))

; It is now possible to evaluate as if it was: (+ 10 20)
BEGIN + 10 20 END

; we replace the + sign with the *
(link "+" '*)
(+ 10 20) ; is now 200

```

### list: (list e1 e2 ..)

creates a list from the arguments

```Lisp

(list 'a 12 34) ; gives (a 12 34)
```

### llist: (llist e1 e2 ..)

Creates a linked list from the arguments.

A linked list is a list where each element is linked to the next through a pointer.

A linked list can contain cycles.

* _push_ and _pop_ push and remove an element at the _beginning_ of a linked list by default.
* _cdr_ can indefinitely loop if the list contains a cycle.
* _loop_ will detect any cycle and will stop once all elements have been visited.

```Lisp
; or a list of elements as for a regular list operation
(setq ll (llist 10 20 30))
(push ll 100) ; yields (100 10 20 30)
(extend ll ll) ; connects then end of the list with its beginning creating a cycle

; The following code will loop 6 times in this 4 elements cyclic list
(loopcount 6
   (setq ll (cdr ll))
   (println ll)
)

; To create a linked list out of a list
(setq lbis (to_llist (list 20 30 40 50)))


; the ... indicates that the list contains a cycle

(10 20 30 100 ...)
(20 30 100 10 ...)
(30 100 10 20 ...)
(100 10 20 30 ...)
(10 20 30 100 ...)
(20 30 100 10 ...)
```


### load: (load filename)

loads and runs a LispE program provided as a file.

```Lisp
(setq tst (load "file.lisp"))
```

#### load: (load filename namespace)

To avoid some name conflicts, it is possible to load a file within a _namespace_. Functions then will be accessed with the [_space_](https://github.com/naver/lispe/wiki/5.2-Functions#space-space-namespace-) operator.

Note: _namespace_ in this case is an atom.

```Lisp
(load "file.lisp" truc)
```

### loadcode: (loadcode str (namespace))

Same as _load_, but takes a string as input.

### lock: (lock key instructions)

This instruction protects a block of instructions in a thread. _key_ is a string that is used to identify the lock. _It is implemented as a recursive mutex._

### loop: (loop var list instruction1 instruction2...)

allows to iterate on a list or a string: `(loop var list instruction)`. The last element of the iteration returns the final result.

```Lisp

(loop i '(1 2 3) 
        (print i)
        (+ i 2)
)
```

### (lloop (x1 x2 x3...) l1 l2 l3... instructions)

_lloop_ is used to iterate in parallel among different lists.

To iterate on different types, such as dictionaries, use: _mloop_.

In that case, you need to provide as first argument, _a list of variables_ and next to it a succession of lists, whose number must match the number of variables.

```Lisp
; x will loop on (1 3 4)
; y will loop on (5 6 7)
; z will loop on (9 10 13)
(lloop (x y z) '(1 3 4) '(5 6 7) '(9 10 13) (println (+ x y z)))

; 15
; 19
; 24
```

### loopcount: (loopcount nb instruction1 instruction2...)

allows to iterate nb times. The last element of the iteration returns the final result.

```Lisp

(setq i 0)
(loopcount 10 
        (print i)
        (+= i 2)
)
```

It is also possible to keep track of the counter: `(loopcount counter into variable instruction1...)`.

In this case, the variable receives the current counter value. Note that if the `counter` is negative, the variable will receive the values in the descendent order.

```Lisp
(loopcount 5 into v (print v " ")) ; it prints: 0 1 2 3 4
(loopcount -5 into v (print v " ")) ; it prints: 4 3 2 1 0

; Note omitting "into" is also possible but might create some confusion.
(loopcount 5 v (print v " ")) 
```

### mask@: (mask@ Boolean_list list_if_true (list_if_false))

The mask@ instruction works as a collection of if/then/else values, which are collected as a list of Boolean values:

If the last part of the expression is missing, then the default value is `nil`.

```Lisp
(setq s "abcdefghi") 
(setq v (mapcar 'vowelp s)) ; v is (1 0 0 0 1 0 0 0 1)

(mapcar 'upper (filtercar 'vowelp s))  ; is ("A" "E" "I")
(filtercar 'consonantp s) ; is ("b" "c" "d" "f" "g" "h")

; each vowel is then replaced with its uppercase

(mask@ '(1 0 0 0 1 0 0 0 1) (mapcar 'upper (filtercar 'vowelp s)) (filtercar 'consonantp s))

; ---> ("A" "b" "c" "d" "E" "f" "g" "h" "I")

```

### maplist

This instruction is similar to [_map_](https://github.com/naver/lispe/wiki/5.4-A-la-Haskell#map-map-op-list).
It offers a much faster implementation.
However, it cannot compose with other high level functions such as _filter_ or _takewhile_.
Furthermore, it can only apply functions of arity 1.

```Lisp
(maplist (lambda(x) (+ x x)) (iota 10)) ; (2 4 6 8 10 12 14 16 18 20)
```

By default, _maplist_ utilises the first element produced by the lambda to define the type of list that will be built.
For instance, if this element is a string, _maplist_ will create a _strings_ object.

_maplist_ can take a fourth parameter, which when _false_ forces the output to be a regular _list_.

```Lisp
(type (maplist (lambda(x) (+ x x)) (iota 10))) ; yields integers_
(type (maplist (lambda(x) (+ x x)) (iota 10) false)) ; yields list_
```

Furthermore, you can use `maplist` with a simple list containing an operator with values. You use then `_` as a slot filler.

```Lisp

(maplist (- 10 _) (iota 10)) ; (9 8 7 6 5 4 3 2 1 0) 
(maplist (- _ 10) (iota 10)) ; (-9 -8 -7 -6 -5 -4 -3 -2 -1 0)

```

Note that: `(maplist (- 10 _) (iota 10))` is equivalent to `(maplist (- 10) (iota 10))`.

#### mapcar

_mapcar_ shares the same implementation as _maplist_, however it systematically returns a regular list.

This function has been implemented to keep some consistency with other _Lisp_ implementations.

```Lisp
(mapcar (\(x) (+ x 1)) (integers 1 2 3)) ; is equivalent to 
(maplist (\(x) (+ x 1)) (integers 1 2 3) false)
```

### mark

This instruction is used with lists to handle potential list infinite loops. It has two different utilisations:

1. `(mark l B)`: marks the list with the Boolean value: B
1. `(mark l)`: returns the Boolean value attached to this list...

Note that in the case of an infinite loop, the list is displayed with: '...' instead of the element that is infinitely repeated:

```Lisp

(setq a '(1 2 3))
(setq b '(10 20 30))
; we create an infinite loop
(push a b)
(push b a)

(println a) ; display: (1 2 3 (10 20 30 ...))
(println b) ; display: (10 20 30 (1 2 3 ...))

; Looping in the structure
; when mark is true, we stop ans display a warning message
(defun traverse (l)
   (check (consp l)
      (ife (mark l)
         (println "Warning: infinite loop")
         (println (at l 0))
         (mark l true)
         (traverse (car l))
         (traverse (cdr l))
         (mark l false)
      )
   )
)

(traverse a)

```

### maybe

This instruction checks whether a value returned by _catch_ was an error or detects errors in a sequence of instructions.

_maybe_ exposes two different modes:

1. It has one single argument, then it returns _true_ if the value is a _maybe_ object returned by a _catch_.
1. It has at least two arguments. Each instruction is executed in sequence except for the last one. If one instruction fails, then the last one is executed.
1. If the last argument is a lambda, then it receives as argument the error message

```Lisp
(setq c
    (catch
        (cons ' a)
    )
)

; With one parameter, we can then use the caught value to display an error message
(if
    (maybe c)
    (print Error: c)
    (print No error)
)

; with more than one parameters
; if an error occurs in one of the instructions, then the last instruction is executed...
(maybe (cons 'a ())
       (cons 'b ())
       (cons 'c)
       (println "An error occurred")
)

; If the last element is a lambda function then it takes the error message as argument:

(maybe (cons 'a ())
       (cons 'b ())
       (cons 'c)
       (\(err) (println "An error occurred:" err)) : this a lambda, whose argument is the error message
)

```

### max: (max a1 a2 a3) / (max '(e1 e2 e3))

Returns the largest element in a string of arguments or the largest element in a list.

```Lisp
(max 1 4 5 10 8) ; returns 10
(max '(1 4 5 10 8)) ; returns 10
```

### min: (min a1 a2 a3) / (min '(e1 e2 e3))

Returns the smallest element in a string of arguments or the smallest element in a list

```Lisp
(min 1 4 5 10 8) ; returns 1
(min '(1 4 5 10 8)) ; returns 1
```

### minmax: (min a1 a2 a3) / (minmax '(e1 e2 e3))

Returns a list containing the largest and the smallest element in a list
```Lisp
(minmax 1 4 5 10 8) ; returns (1 10)
```

### mloop : (mloop (x1 x2 x3...) c1 c2 c3... instructions)

_mloop_ is used to iterate in parallel among different containers that are not all lists.

In that case, you need to provide as first argument, _a list of variables_ and next to it a succession of lists, whose number must match the number of variables.

```Lisp
; x will loop on (1 3 4)
; y will loop on {"a":10 "b":20 "c":4} (actually on the values not the keys)
; z will loop on (9 10 13)
(mloop (x y z) '(1 3 4) {"a":10 "b":20 "c":4} '(9 10 13) (print (+ x y z)))

; 14
; 33
; 27
```

### ncheck: (ncheck CONDITION ELSE_I I1...In)

If CONDITION is _true_, execute the list of instructions: `I1,I2... to In`.

If CONDITION is _nil_, execute `ELSE_I`.

```Lisp
(setq k 10)

; if k < 100, we increment it
(ncheck (< k 100)
       (println 'end) ; if k == 100, we stop and display a message
       (println k)
       (+= k 1)
)

``` 

### nconc: (nconc l1 l2 l3...x)

List concatenation. All arguments should be a list except for the last one. The concatenation is made into the first argument...

```Lisp
 
 (nconc) is  nil
 (setq x '(a b c)) =>  (a b c)
 (setq y '(d e f)) =>  (d e f)
 (nconc x y) =>  (a b c d e f)

; x is now  (A B C D E F)


```

### nconcn: (nconcn l1 l2 l3...x)

List concatenation. All arguments should be a list except for the last one. The concatenation creates a new list...
_nconcn_ is identical to _nconc_ except for the fact that it creates a new list.

```Lisp
 
 (nconcn) is  nil
 (setq x '(a b c)) =>  (a b c)
 (setq y '(d e f)) =>  (d e f)
 (nconcn x y) =>  (a b c d e f)

; x is not modified

```

### not: (not e)

Boolean Negation: (not true) gives false

### nullp: test if the argument is nil

### number: (number e)

converts a string into a number

```Lisp
(number "12") ; gives 12
``` 

### nth:

Returns the value corresponding to a sequence of keys.
The container can be a list, a matrix, a tensor or a dictionary.
Other name to `at`.

```Lisp
(setq r (rho 2 2 (iota 5))) ; r = ((1 2) (3 4))
(println (nth r 0 1)) ; is 2
```

### numberp: check if the argument is a number

### numbers: (numbers e)

converts a list into a list of numbers.
_e_ can also be more than one elements.

```Lisp
(numbers '(1.2 3.3 4 5))
(numbers 1.2 3.3 4 5) ; is also acceptable
``` 

### or: or Boolean

```Lisp
(or (eq 10 20) (eq 20 20)) ; returns true
``` 

### over: (over 'function list)

`over` applies a function or a lambda to _list_, and replaces the value of _list_ with the new values.

```Lisp
(setq l '(1 2 3))
(over 'rotate l) ; l is now (3 1 2)
```

### pattern@: (pattern@ pattern element)

`pattern@` applies the same pattern as those described in [Pattern Functions](https://github.com/naver/lispe/wiki/6.1-Pattern-Functions).
It can instantiate variables directly in the template.
If `pattern@`fails, then it returns `nil`.

```Lisp

(pattern@ (a $ b) (list 1 2 3 4)) ; a is now 1 and b is '(2 3 4)

```



### pipe: (pipe)

Read the `pipe` on the command line...
Return `nil` when the pipe is empty...

```Lisp
; As long as there is data in the pipe, we read it...
(setq p (pipe))
(while p (setq p (pipe))

```

### pop: (pop e cle)

Removes a value from a list, a dictionary or a string.

```Lisp
(pop '(A b c) 1) ; gives (A c)
(pop {12:34} 12) ; gives {}.
(pop "abc" 2) ; gives "ab".    
``` 

### popfirst: (popfirst e)

Removes the first value from a list or a string.

```Lisp
(popfirst '(A b c)) ; gives (b c)
(popfirst "abc") ; gives "ab".    
``` 

### poplast: (poplast e)

Removes the last value from a list or a string.

```Lisp
(poplast '(A b c) 1) ; gives (A b)
(poplast "abc" 2) ; gives "ab".    
```


### prettify: (prettify l mx)

Displays in a more readable form a parenthesized structure.
The last parameter _mx_ is optional. It defines the longest string that can be produced on a line by concatenating different sub-lists.

### print: (print e1 e2 .. en)

Displays the values on the screen

### println: (println e1 e2 .. en)

Displays the values on the screen by separating them with a space and placing a carriage return at the end.

### printerr: (printerr e1 e2 .. en)

Displays the values on the screen on _stderr_.

### printerrln: (printerrln e1 e2 .. en)

Displays the values on the screen by separating them with a space and placing a carriage return at the end, on stderr.

### push: (push l a)

adds an item to the l list. Be careful, if the list is a constant element, this operation returns a copy.

```Lisp
(push '(1 2 3) 4) ; returns (1 2 3 4) which is a copy of the initial list.

; So, pay attention to the following code:
(push '(1 2 3) 12) ; returns a copy of the list
```

### pushfirst: (pushfirst l a)

adds an item at the beginning of the l list. Be careful, if the list is a constant element, this operation returns a copy.

```Lisp
(pushfirst '(1 2 3) 4) ; returns (4 1 2 3) which is a copy of the initial list.

; So, pay attention to the following code:
(pushfirst '(1 2 3) 12) ; returns a copy of the list
```

### pushlast: (pushlast l a)

adds an item at the end of the l list. Be careful, if the list is a constant element, this operation returns a copy.

```Lisp
(pushlast '(1 2 3) 4) ; returns (1 2 3 4) which is a copy of the initial list.

; So, pay attention to the following code:
(pushlast '(1 2 3) 12) ; returns a copy of the list
```

### pushtrue: (pushtrue l a)

adds an item to the l list, if this value is not _nil_. Be careful, if the list is a constant element, this operation returns a copy.

```Lisp
(pushtrue r 4 (<1 9) (< 3 1)) ; returns (4 true) (< 3 1) is skipped

; pushtrue can be combined with andvalue

(setq l ())
(loop r (irange 0 10 1)
   (pushtrue l 
       (andvalue
          (eq (% r 2) 0)
          (* 2 r)
       )
    )
)

; The result is then: (0 4 8 12 16)

This is equivalent to:
(loop r (irange 0 10 1)
   (if (eq (% r 2) 0)
       (push l (* 2 r)
    )
)
```

### quote: (quote arg)

The operator associated with '. Returns without evaluating its argument.

### range: (range initial limit step)

Returns a list of values starting at _initial_, ending at _limit_ in _steps_.

These lists are either a _numbers_ type or an _integers_ type according to the different values given as arguments

```Lisp
(range 1 10 1) ; yieds (1 2 3 4 5 6 7 8 9), which is an 'integers' type
```

### rangein: (rangein initial limit step)

Returns a list of values starting at _initial_, ending at _limit_ in _steps_.

The difference with _range_ is that the _limit_ is part of the values.

These lists are either a _numbers_ type or an _integers_ type according to the different values given as arguments

```Lisp
(rangein 1 10 1) ; yieds (1 2 3 4 5 6 7 8 9 10), which is an 'integers' type
```
  
Exits a loop or a function and returns its argument.

### replaceall: (replaceall object search replace)

Replaces all the occurrences of _search_ in _object_ with _replace_.
Returns the number of replacements.

_object_ can be any container or a string.

```Lisp
(setq l (integers 10 20 10 40))
(setq nb (replaceall l 10 100)) ; nb is 2 and l is now: (100 20 100 40)
``` 

### real

This method returns the _real_ part of a [complex number](https://github.com/naver/lispe/wiki/5.2-Functions#complex).

```Lisp
(setq c 12,3i)
(set r (real c)) ; r is 12
```

### resetmark

Resets the marks on lists for control over infinite loops.

### ⌽: rotate: (rotate l nb (line))

* l is a list, a matrix or a tensor
* nb:
   1. nb < 0: the container is rotated to the right of nb increments
   1. nb > 0: the container is rotated to the left of nb increments
   1. _false_ or _absent_: the container is rotated to the right of 1 increment
   1. _true_: the container is rotated to the left of 1 increment
* line:
   1. _false_  or _absent_: if the container is a matrix or a tensor, the matrix is rotated along the columns
   1. _true_: if the container is a matrix or a tensor, the matrix is rotated along the lines
   

```Lisp
(rotate "abcde") ; yields "eabcd"
(rotate "abcde" true) ; yields "bcdea"
(⌽ (iota 10)) ; yields (2 3 4 5 6 7 8 9 10 1)
(⌽ (iota 10) true) ; yields (10 1 2 3 4 5 6 7 8 9)

(iota 10) ; (1 2 3 4 5 6 7 8 9 10)
(rotate (iota 10) -2) ; (9 10 1 2 3 4 5 6 7 8)
(rotate (iota 10) 2) ; (3 4 5 6 7 8 9 10 1 2)
```
 
### return: (return a)

Exit a function and return a value

```Lisp

(function call(i)
   (while (< i 10)
      (if (eq i 5)
          (return i)
          (-= i 1)
      )
   )
)

```

### reverse: (reverse l local)

Reverse a string or a list.

_local_ can be either:

* false: in this case the list is reversed _locally_ (the default value).
* true: in this case, a duplicate of the list is returned

```Lisp

(reverse '(a b c)) ; gives (c b a)

(reverse "abc") ; gives "cba". 

(setq l (iota 10)) ; l is (1 2 3 4 5 6 7 8 9 10) 

(reverse l true) ; l is now (10 9 8 7 6 5 4 3 2 1)
```

### rfind: (find string subch)

Search for a sub-string of characters from the end.

### scanlist: (scanlist action lst)

Applies _action_ to each element of _lst_ and returns the first value that is not null.

```Lisp

(scanlist (\(x) (if (> x 5) (* 2 x))) (range 1 10 1)) ; returns 12 (2 x 6)
```

### select: (select c1 c2 c3...)

Returns the first non `nil` value.

```Lisp

; returns either a value in the dico if the key is present of the key itself
(select (key dico k) k)

```

### self: (self e1 e2...)

Allows to make a recursive call in a function or lambda.

```Lisp
( lambda (x) (if (eq x 1) 1 (+ x (self (- x 1))))) 12))  

```

### set: set, sets, setn, seti

Creates sets of elements. 

_sets, setn, seti_ create respectivement:
* sets: _set of strings_
* seti: _set of integers_
* setn: _set of numbers_

_set_ is used to create sets of objects.

An element is pushed into a set with either _insert_ or _push_.

An element is removed from a set with _pop_.

* You can check if an element belong to a set with _in_.
* You can access an element in a set with _@_.
* You can _loop_ on all values in a set.

```Lisp

(setq strset (sets "ab" "cd" "ef"))
(push strset "ok")
(if (in s "ok") 'ok 'no)

(setq o_set (set '(1 2 3) '(1 2) '(8 9))
(println (type (@ o_set '(1 2))) ; list_

```


### set@: (set@ container k1 k2 k3...kn value)
Set a value at the position corresponding to the sequence of keys

```Lisp
(setq r (rho 2 2 (iota 5))) ; r = ((1 2) (3 4))
(set@ r 0 1 100)) ; r is now ((1 100) (3 4))
```

### set@@: (set@@ container beg end value)
Replaces a range of values between _beg_ and _end_ with value.

_set@@_ is a synonym to [_setrange_](https://github.com/naver/lispe/wiki/5.2-Functions#setrange-setrange-container-beg-end-value).

```Lisp
(setq r '(1 2 3 4 5 6))
(set@@ r 0 3 100) ; r is now (100 4 5 6)
```

### set@@@: (set@@@ container shape k1 k2 k3...kn value)

Replace a value or a sequence of values corresponding to a sequence of keys, according to a _shape_.
The container should be a flat list of values. _shape_ should be a list of values that provides the virtual dimensions that are projected onto the flat list of values. This is the pendant of _atshape_.

_set@@@_ is a synonym to [_setshape_](https://github.com/naver/lispe/wiki/5.2-Functions#setshape-setshape-container-shape-k1-k2-k3kn-value).

### setg: (setg label value)

Initialization of a _global_ variable with a value.
If _label_ is a function, then it replaces the function body with _value_.

#### (setg (a b c..) list)

_setg_ has a second mode, in which you can set a list of variables from within a list of values. The only constraints is that the two lists must have the same size:

```Lisp
(setg (a b c) '(1 2 3))
; a is 1
; b is 2
; c is 3
```

### setshape: (setshape container shape k1 k2 k3...kn value)

Replace a value or a sequence of values corresponding to a sequence of keys, according to a _shape_.
The container should be a flat list of values. _shape_ should be a list of values that provides the virtual dimensions that are projected onto the flat list of values. This is the pendant of _atshape_.

_keys_ cannot be negative.

_setshape is the official name for the operator set@@@_

```Lisp
(setq fv (range 0 60 1))

(setq sh (integers 3 4 5))

; changing one value
(set@@@ fv sh 1 2 3 100)

;changing a sequence of values
(set@@@ fv sh 1 2  '(-1 -2 -3 -4 -5))

```

### setq: (setq label value)

Initialization of a variable with a value. The variable is always local to the context in which it is created. If you use `setq` in a function then the variable will erased when leaving the function.

```Lisp
(setq c 10)
```

#### (setq (a b c..) list)

_setq_ has a second mode, in which you can set a list of variables from within a list of values. The only constraints is that the two lists must have the same size:

```Lisp
(setq (a b c) '(1 2 3))
; a is 1
; b is 2
; c is 3
```

### setqv

`setqv`behaves like `setq`, however it returns the value that was stored in the variable as output.

```lisp
(println (setqv test 10)) ; displays 10
```

### setqi

`setqi` is used to create new instances in a [class](https://github.com/naver/lispe/wiki/6.21-Classes) or to modify an existing field.

```lisp
(class@ test (x y)
   (defun configure()
      (setqi v 100))) ; test contains now 3 fields

(setq c (test 10 20))
(c (configure))
(println c) ; (test 10 20 100)aaa
```


### seth: (set a value in the common thread space)

_seth_ can only be used in conjunction with [_threadspace_](https://github.com/naver/lispe/wiki/5.2-Functions#threadspace).
It creates a variable in the common thread space.

The access to this variable is automatically protected with an internal _lock_.
Note that this _lock_ is the same as in _threadstore, threadretrieve and threadclear_.
Once a variable has been created with _seth_, it can only been accessed within [_threadspace_](https://github.com/naver/lispe/wiki/5.2-Functions#threadspace).
However, it is then treated as a regular variable as shown below.

```Lisp
; We create in the main section two specific thread safe variables titi and toto
(threadspace
   (seth titi 10)
   (seth toto (rho 4 4 '(0)))
)

; titi and toto are accessed via threadspace in this thread
(dethread tst(x y)
   (threadspace
      (+= titi x)
      (set@ toto 0 y titi)
   )
)

; We call our threads
(tst 10 0)
(tst 20 1)
(tst 30 2)
(tst 40 3)

; we wait for their completion
(wait)

; again titi and toto are only available in threadspace
; Note that threadspace is equivalent to space thread...
(space thread
   (println titi)
   (println toto)
)

```

#### (seth (a b c..) list)

_seth_ has a second mode, in which you can set a list of variables from within a list of values. The only constraints is that the two lists must have the same size:

```Lisp
(threadspace
    (seth (a b c) '(1 2 3))
)
; a is 1
; b is 2
; c is 3
```

### setq=

`setq=` updates a variable according to its status.

1. If the variable is an instance of a class then `setq=` is a `setqi`.
2. If the variable is global then it is a `setg`
3. Else it acts as a `setq`.

```lisp
(setq v 100)


(defun test(x y)
   (setq= x 10)
   (setq= y 100)
   (setq= u 1000)
   (setq= v 200)
   (println x y v u)
)

(test 12 21)
(println v)

; it displays
; 10 100 200 1000 
; 200
```

### setrange: (setrange container beg end value)
Replaces a range of values between _beg_ and _end_ with value.

This method utilizes the same interval description as _extract_.

_setrange_ can also be written: [_set@@_](https://github.com/naver/lispe/wiki/5.2-Functions#set-set-container-beg-end-value)

```Lisp
(setq r '(1 2 3 4 5 6))
(setrange r 0 3 100) ; r is now (100 4 5 6)
```

### shift: (shift op lst (nb))

This method applies an operator to a list that is transformed into two lists shifted by `nb` elements.

```Lisp
(setq l (integers 1 3 5 7 9))

(shift '- l 2) -> (-4 -4 -4)
; this is equivalent to
(- (1 3 5) (5 7 9))

; When nb is negative, we do it in reverse:
(shift '- l -2) -> (4 4 4)
; this is equivalent to
(- (5 7 9) (1 3 5))

```

### short: (short e)

converts a string into a short (16 bits)

```Lisp
(short "12") ; gives 123
``` 

### shorts: (shorts e)

Converts a list into a list of shorts.
_e_ can also be more than one elements.

```Lisp
(shorts '(12 33 4 5))
(shorts 12 33 4 5) ; is also acceptable
``` 
### sign: (sign e)

Changes the sign of _e_.

```Lisp
(sign 10) ; -10
(sign -10) ; 10
```

### signp: (signp e)

* If _e_ is negative: returns -1
* If _e_ is 0: returns 0
* If _e_ is positive: returns 1

### size: (size e)

Returns the size of a list or a string

### sleep: (sleep tm)

Put a thread in sleep mode for _tm_ milliseconds.


### slice: (slice lst size)

This instruction slices a list or a string into a list of slices of same size.

```Lisp
(slice '(a b c d e f g h i j k l) 3) ; ((a b c) (d e f) (g h i) (j k l))
```

### sort: (sort comparator list)

Sort a list. Important, the comparator must not return true in case of a tie. Thus `<=` is a bad comparison operator.

```Lisp
(sort '< '(1 7 9 4 3)) (1 3 4 7 9)
(sort '> '(1 7 9 4 3)) (9 7 4 3 1)
```

### space: (space namespace ...)

The _space_ operator makes it possible to execute functions that were defined in a _namespace_ with [_defspace_](https://github.com/naver/lispe/wiki/5.2-Functions#defspace-defspace-namespace-) or [_load_](https://github.com/naver/lispe/wiki/5.2-Functions#load-load-filename-namespace) or [_use_](https://github.com/naver/lispe/wiki/5.2-Functions#use-use-bib-namespace).

This operator works as a _block_.

The main namespace is called: *mainspace_*.

It is possible to embed different space calls within a space.

__Note__: _space thread_ is actually equivalent to [_threadspace_](https://github.com/naver/lispe/wiki/5.2-Functions#threadspace).


```Lisp
; We define some functions in a space named truc
(defspace truc

   (defun calculus (x y)
      (+ x y)
   )

   (defun toto (u v)
      (* u v)
   )
)

(defun calculus (x y)
   (+ x (* x y))
)

(space truc 
   (setq r (calculus 10 20))
   (setq v (toto 100 200))
 ; here we force the call to the global implementation of calculus within another space definition
   (setq x (space mainspace_ (calculus 10 5)))
)

(setq o (calculus 10 20)) ; Note that in this case we call the local version of calculus
```

### startwith

This function checks if a string starts with a specific substring:

```Lisp

(startwith "test" "te") ; true
(startwith "test" "at") ; nil

```

### string: (string e)
Converts its argument into a string

### stringbyte: (stringbyte e)
Converts its argument into a string of bytes.
A string byte can also be created with the `b""` notation:

```Lisp
(setq s b"This is a string byte")
```


### stringf: (stringf n format)
Converts its argument (a number) into a string with a format based on C function _printf_.

```Lisp
(stringf 123 "0x%X") ; is 0x7B
```

### stringp: (stringp e)
Check if `e` is a string

### strings: (strings e)

converts a list into a list of strings.
_e_ can also be more than one elements.

```Lisp
(strings '("a" "b" "c" "d"))
(strings "a" "b" "c" "d") ; is also acceptable
``` 

### stringbytes: (stringbytes e)

converts a list into a list of byte strings.
_e_ can also be more than one elements.

```Lisp
(stringbytes '("a" "b" "c" "d"))
(stringbytes "a" "b" "c" "d") ; is also acceptable
``` 

### swap : (swap lst p1 (p2))

_swap_ the elements in a list _in place_ at position `p1` and `p2`. If `p2` is not provided then `p2 = p1 + 1`.

```lisp
(setq l (integers 1 2 3 4))
(swap l 1) ; (1 3 2 4)
(swap l 0 3); (4 3 2 1)
```

### switch: (switch v (c0 codes) (c1 codes).. (true final_action))

* _c0...cn_ are either _strings_ or _numbers_.
* _codes_ is a _block of code_

This method works as a switch in C++ or Java.
It checks _v_ against the different case values in the structure.

However, _switch_ uses an internal dictionary, which makes this comparison straightforward.

The _default_ value is implemented as in [_cond_](https://github.com/naver/lispe/wiki/5.2-Functions#cond-cond-cond1-action1-cond2-action2true-final_action), with _true_.

```Lisp
(setq c 10)

(switch c 
   (0 1) 
   (10 'yes) 
   (true 'unknown)
) ; yields yes
```

### takelist: (takelist condition list)

* This function is very similar to [_takewhile_](https://github.com/naver/lispe/wiki/5.4-A-la-Haskell#takewhile-takewhile-condition-list) however, it cannot compose with other high level functions such as _map_, _takewhile_ or _drop_.
* Second, the value from the list is always appended _at the end_ of the condition, unless you use `_` as a slot filler..

As such, it is not expanded into a _loop_ instruction as _takewhile_ and is much faster.
_takelist_ extracts elements from a list that comply with the condition. It stops when an element does not comply anymore.

```Lisp
(takelist '(> 10) '(1 4 5 10 9 11 20)) returns (1 4 5) ; it applies (> 10 x)
(takelist '(> _ 1) '(4 5 1 10 9 11 20)) returns (4 5) ; it applies (> x 1)

(takelist (lambda (x) (< x 10)) '(1 4 5 10 11 20)) returns (1 4 5)
```

### takenb: (takenb nb lst (beginning true))

Extracts nb elements from the beginning of _lst_. If `beginning` is _false_, then extracts the last _nb_ values from _lst_.

**Note** that if _nb_ is negative and _beginning_ is true, then the elements are also extracted at the end.

```Lisp
(takenb 3 '(1 2 3 4 5)) ; (1 2 3)

(takenb 3 '(1 2 3 4 5) false) ; (3 4 5)

(takenb -3 '(1 2 3 4 5)) ; (3 4 5)
```

### tally

`tally` returns the number of elements of a matrix or a tensor. Applied to a list, it simply returns its size.

```lisp
(setq r (rho 3 4 5 (iota 60)))

(tally r) ; 60
```

### toclean: (toclean 'clean_function)

This function is used within class configuration to add a final function to be called when an isntance is deleted.

```lisp

(@class test (init)
     (defun config()
         ; we define a clean function
         (toclean 'clean)
     )

     (defun clean() (println "This instance is deleted"))

)

(test (config))
```

### to_list: (to_list object)

This instruction transforms any kind of container into a _list_.

```Lisp
(to_list (numbers 10 20 30)) ; is now a list
```

#### to_list: (to_list value nb)

These is a second implementation of this method with three parameters.

In this case, _LispE_ creates a list of _nb_ values.

```Lisp
(to_list "a" 10) ; ("a" "a" "a" "a" "a" "a" "a" "a" "a" "a")
```

### to_llist: (to_llist object)

This instruction transforms any kind of container into a _llist_ (linked list).

```Lisp
(to_llist (list 10 20 30)) ; is now a llist
```

### to_tensor

This function transforms a list of values into value lists, matrices or tensors.

A list can be transformed into these elements only they present a regularity in types and sizes.

```Lisp

(setq l '((1 2 3) (4 5 6)))
(to_tensor l) ; a matrix_integer

(setq l '((1 2 3) (4 5 6 8)))
(to_tensor l) ; returns a list, the sublists have different sizes
```

### threadretrieve: (threadretrieve namespace)

This instruction returns the data that were stored in the protected list with _threadstore_, within a thread.
_namespace_ is a string that defines a namespace in which your data is stored. You can implement as many namespaces as you want.

If you use `threadretrieve` without any _namespace_, it returns a dictionary containing all the namespaces and their values.

```Lisp
(dethread call(i)
   (setq l (range 1 i 1))
   ; our namespace is "here":
   (threadstore "here" l)
)

(call 10)
(call 100)
(call 20)

(wait)

(println (threadretrieve "here"))

```

### threadstore: (threadstore namespace e)

This instruction should be used in a thread to store elements that should survive the thread itself. This instruction stores the information in a protected list that can be accessed through _retrieve_.
_namespace_ is a string that defines a namespace in which your data is stored. You can implement as many namespaces as you want.

```Lisp
(dethread call(i)
   (setq l (range 1 i 1))
   (threadstore "other" l)
)
```

### threadclear: (threadclear namespace)

Clear the protected list used in threads to keep data alive. _namespace_ is a string that defines a namespace in which your data is stored. You can implement as many namespaces as you want.

If you do not provide any namespace, then all spaces will be deleted.

```Lisp
(dethread call(i)
   (setq l (range 1 i 1))
   (threadstore "tobecleared" l)
)

(call 10)
(call 100)
(call 20)

(wait)

(println (threadretrieve "tobecleared"))

; we clear the namespace: "tobecleared"
(threadclear "tobecleared")
```

### threadspace

_threadspace_ works as a block in which thread safe variables can be created and manipulated.
Variables in _threadspace_ are created with [_seth_](https://github.com/naver/lispe/wiki/5.2-Functions#seth-set-a-value-in-the-common-thread-space). However their access is similar to any variables henceforth. 

__Note__: _threadspace_ is actually equivalent to [_space thread_](https://github.com/naver/lispe/wiki/5.2-Functions#space-space-namespace-).

```Lisp
; We create in the main section two specific thread safe variables titi and toto
(threadspace
   (seth titi 10)
   (seth toto (rho 4 4 '(0)))
)

; titi and toto are accessed via threadspace in this thread
(dethread tst(x y)
   (threadspace
      (+= titi x)
      (set@ toto 0 y titi)
   )
)

; We call our threads
(tst 10 0)
(tst 20 1)
(tst 30 2)
(tst 40 3)

; we wait for their completion
(wait)

; again titi and toto are only available in threadspace
; Note that threadspace is equivalent to space thread...
(space thread
   (println titi)
   (println toto)
)

```

### trace: (bool trace)

Activates the trace during execution: (trace true)


### type: (type e)

Returns the type of its argument

### unique: (unique lst)

Remove the duplicates in lst. The comparison is done with: _==_

### use: (use bib)

Loads a dynamic library whose path is given by the environment variable: LISPEPATH.

#### use: (use bib namespace)

It is also possible to load this library within a namespace. 

Use [_space_](https://github.com/naver/lispe/wiki/5.2-Functions#space-space-namespace-) to access the different functions.

### uuid: Universally Unique Identifier
This function returns an UUID in agreement with UUID RFC 4122, version 4 (fully random).
It returns a string value containing hexadecimal values of the form: XXXXXXXX- 4XXX- 1XXX- XXXX- XXXX

```Lisp
(setq u (uuid)) ; u is 80c67c4d-4c4d-14cd-e58d-eb3364cd
```
### trigger: (trigger key)

Wake up all threads waiting on _key_.

### values@: (values@ dict)

Returns values from a dictionary (see [_keys@_](https://github.com/naver/lispe/wiki/5.2-Functions#keys-keys-dict))

### wait: wait for threads to end

This instruction allows you to wait for all threads to finish. See [dethread](https://github.com/naver/lispe/wiki/5.2-Functions#dethread-dethread-label-param1-param2-code) for an example.


### waiton: (waiton key)

Put a thread on hold until it is woken up with _trigger_ on that key.

### while: (while (condition) instruction1 instruction2 ...) 

Allows looping as long as a condition is true.

```Lisp
(setq v 10)
(while (> v 0) (setq v (- v 1))
```

### whilein: (whilein var lst (condition) instruction1 instruction2 ...) 

Allows looping in a list with _var_ as long as a condition is true.

```Lisp
(setq v (iota 10))
(whilein x v (< x 10) (print x))
```


### xor: or Boolean exclusive

### zerop: checks if a value is zero

# Operators à la APL

[back](https://github.com/naver/lispe/wiki/5.-Description-of-Functions,-Operators-and-Libraries)


We have implemented some operators, which draw their inspiration from APL

### transpose: ⍉

This method transposes a matrix row/column.

```Lisp

(rho 3 4 (iota 5)) ; is ((1 2 3 4) (5 1 2 3) (4 5 1 2))
(transpose (rho 3 4 (iota 5))) ; yields ((1 5 4) (2 1 5) (3 2 1) (4 3 2))

; you can also use the operator: ⍉
(⍉ (rho 3 4 (iota 5))) ; yields ((1 5 4) (2 1 5) (3 2 1) (4 3 2))

```

### scan: \\\\

* (\\\\ 'op list (slice)) : applies a function to sublists of _slice_ elements. Default value for _slice_ is 2.
* (\\\\ (λ(acc x) ..) list (slice)) : applies a lambda expression to the list with _acc_ as an accumulator
* (\\\\ 'integers list) either extend nb times the corresponding element. When the value in _integers_ is 0 add 0 to the list.

_slice is an optional parameter that can be used to apply the operator to sublists of size **slice**_

```Lisp
; apply an operator

(\\ '+ '(1 2 3)) ; yields (1 3 6) [1 (1+2) ((1+2)+3)
(\\ '(2 0 3) '(45 26)) ; yields (45 45 0 26 26 26)

(\\ (λ(acc x) (- acc x)) '(1 2 3)) ; yields (1 -1 -4)

; You can also use the actual name

(scan '+ '(1 2 3)) ; yields (1 3 6) [1 (1+2) ((1+2)+3)
```

### backscan: ⍀ _or_ -\\\\ 

* (-\\\\ 'op list (slice)) : applies a function to sublists of _slice_ elements from the end. Default value for _slice_ is 2.
* (-\\\\ (λ(acc x)..) list (slice)) : applies a lambda-expression to the list
* (-\\\\ 'boolean_list list) either keep the corresponding element or add a zero from the end

_slice is an optional parameter that can be used to apply the operator to sublists of size **slice**_

```Lisp
; apply an operator

(-\\ '- '(1 2 3)) ; yields (3 1 0)
(-\\ (λ(acc x) (- acc x)) '(1 2 3)) ; yields (3 1 0) as well

; You can also use the actual name

(backscan '- '(1 2 3)) ; yields (3 1 0)
; or 

(⍀ '- '(1 2 3)) ; yields (3 1 0)
```

### reduce: //

* (// list) : duplicates the list
* (// 'op list (slice)): applies a function to sublists of _slice_ elements. Default value for _slice_ is 2.
* (// (λ(acc x) ..) list (slice) : applies a lambda expression to the list with _acc_ as an accumulator
* (// integers list): extend the list according to the list of integers

_slice is an optional parameter that can be used to apply the operator to sublists of size **slice**_

```Lisp

(// '+ '(1 2 3)) ; yields 6
(// '(1 0 2) '(1 2 3)) ; yields (1 3 3)

(// (λ(acc x)  (- x acc)) (iota 10)) ; yields 5

; You can also use the alphabetical name
(reduce '+ '(1 2 3)) ; yields 6
```

### backreduce: ⌿ _or_ -//

* (-// list) : reverse the list
* (-// 'op list (slice)): applies a function to sublists of _slice_ elements from the end. Default value for _slice_ is 2.
* (-// (λ(acc x) ..) list (slice)) : applies a lambda expression to the list with _acc_ as an accumulator
* (-// boolean_list list): keeps only the element for which a 1 is provided, from the end

_slice is an optional parameter that can be used to apply the operator to sublists of size **slice**_

```Lisp

(// '- '(1 2 3)) ; yields -4 : 1-2-3
(-// '- '(1 2 3)) ; yields 0 : 3-2-1

(-// (λ(acc x)  (- x acc)) (iota 10)) ; yields -5

; You can also use the alphabetical name
(backreduce '+ '(1 2 3)) ; yields 6

; or

(⌿ + '(1 2 3)) 
```

### iota, iota0 (⍳, ⍳0): list of consecutive numerical values

* _(iota n)_ :returns a list of numerical values starting at 1 up to n included
* _(iota0 n)_ :returns a list of numerical values starting at 0 up to n excluded

You can also put more than one _n_ in iota:

_iota n n' n"..._: returns a list of nb lists of n, n' and n'' elements 

_Note_ that if your seed value is a decimal value, then the list will be a _list of numbers_, otherwise it will be a list of integers.

```Lisp

(iota 10) ; yields (1 2 3 4 5 6 7 8 9 10)
(iota0 10) ; yields (0 1 2 3 4 5 6 7 8 9)

; If your value seed value is a decimal number, then the list will be a list of numbers
(iota 10.1) ; yields (1.1 2.1 3.1 4.1 5.1 6.1 7.1 8.1 9.1 10.1)
(iota0 10.1) ; yields (0.1 1.1 2.1 3.1 4.1 5.1 6.1 7.1 8.1 9.1)

; We can also use the corresponding Greek letter
(⍳ 3 4) ; yields ( (1 2 3) (1 2 3 4) )
```

### rho (⍴): size
_rho_ can be used in three different ways:

* (rho list): it returns the size of the list. If the list is a matrix, it returns its two dimensions
* (rho sz list): builds a list of size _sz_ out of list
* (rho sz1 sz2 list): builds a matrix of dimension sz1,sz2 out of list

```Lisp

(rho (iota 2 2)) ; yields (2 2)
(rho 10 (iota 3)) ; yields (1 2 3 1 2 3 1 2 3 1)

; We can also use the corresponding Greek letter
(⍴ 3 3 (iota 4)) ; yields ((1 2 3) (4 1 2) (3 4 1))


; rho can also be used to create a linked list. 
; If the input list is a linked list
; The list is then built backwards
(rho 2 3 (llist 1 2 3)); ((3 2 1) (3 2 1))

; The same for lists
(rho 2 3 (list 1 2 3)); ((1 2 3) (1 2 3))  
```

### ° : outer product

This involves two data items and a function. The function can be any dyadic function, including user-defined functions. The function operates on pairs of elements, one taken from the left argument and one from the right, till every possible combination of two elements has been used.

```Lisp
(° '* '(2 3 4)  '(1 2 3 4))
; Multiplies every number in X by every
; number in Y generating a multiplication
; table

((2 4 6 8) (3 6 9 12) (4 8 12 16))

```
### .: inner product

Inner product takes the form:

          (. FN1 FN2 DATA1 DATA2)

Where the operands, FN1 and FN2, are both dyadic functions, including user-defined functions. Inner product first combines the data along the last axis of the left argument with the data along the first axis of the right argument in an 'Outer Product' operation with the right operand. Finally a 'reduction' operation is applied to each element of the result.

If the two arguments are vectors of the same size, then the inner product gives the same result as FN2 being applied to the data and then FN1 being applied to the result in a reduction operation.

```Lisp
(. '+ '* '(1 2 3) '(4 5 6)); yields 32

```

When applied to data of more than one dimension, such as matrices, the operation is more complex. For matrix arguments the shape of the result of the operation is given by deleting the two inner axes and joining the others in order. For example if we have:

             TABA of 4 rows and  columns
and          TABB of 5 rows and 6 columns
The inner dimensions are used by the inner product operation, and the result will be a 4-row 6-column matrix.

The operations take place between the rows and columns of the two matrices and are therefore the same as inner product operations between vectors as described above.
```
             TABLE1                         TABLE2
             1    2                         6  2  3  4
             5    4                         7  0  1  8
             3    0
```

Which we can write with the inner product as:

```Lisp

(.  '+ '* '((1 2) (5 4) (3 0)) '((6 2 3 4) (7 0 1 8)))

; which yields:

((20 2 5 20) (58 10 19 52) (18 6 9 12))
```

### == : numerical Boolean

This operator returns either 0 or 1 for a comparison between two values. If the comparison is done with lists, then it returns a list with 1 and 0 where values are the same.

Note that if you use the operator `=` in a _à la APL_ instruction, it will be replaced with `==`.

```Lisp

(== '(1 2 3) '(1 5 3)) ; yields (1 0 1) 

; Here the = is automatically replaced with == in order to return numerical Boolean value
(° (iota 3) '= (iota 3)) ; yields ((1 0 0) (0 1 0) (0 0 1))
```

### , : concatenate operator

* As a monadic operator, it actually works as [_flatten_](https://github.com/naver/lispe/wiki/6.1-Description-of-methods-and-operators#flatten-flatten-l). 

* As a dyadic operator, it concatenates lists together

```Lisp
(, (iota 3 3)) ; yields (1 2 3 1 2 3)

(, (iota 4) 5) ; yields ((1 5) (2 5) (3 5) (4 5))

(, (iota 2 2) (iota 2 2)) ; yields ((1 2 1 2) (1 2 1 2))
```

### ∈: (member m values)

This operator scans a container for elements that are part of the _values_ list. It then returns a container, in which the elements that are part of _values_ are set to 1 or 0 else.

```Lisp
(setq m (rho 3 3 (iota 9))) ; m is ((1 2 3) (4 5 6) (7 8 9))

(setq r (∈ m '(1 3 4))) ; r is ((1 0 1) (1 0 0) (0 0 0))

```

### ⍤: (rank@ m D1 D2...)

This operator applies to matrices and tensors. It returns a sub-matrix corresponding to the provided coordinates.
Replacing a dimension with -1 skips it in the final matrix or in the final tensor. 
In this case, _LispE_ returns a specific axe from the tensor object.
 
```Lisp
(setq m (rho 3 4 5 (iota 60)))
;(((1 2 3 4 5) (6 7 8 9 10) (11 12 13 14 15) (16 17 18 19 20)) 
; ((21 22 23 24 25) (26 27 28 29 30) (31 32 33 34 35) (36 37 38 39 40)) 
; ((41 42 43 44 45) (46 47 48 49 50) (51 52 53 54 55) (56 57 58 59 60)))


(rank@ m 1) ; yields ((21 22 23 24 25) (26 27 28 29 30) (31 32 33 34 35) (36 37 38 39 40))
(rank@ m 1 1) ; (26 27 28 29 30)
(rank@ m -1 1) ; yields ((6 7 8 9 10) (26 27 28 29 30) (46 47 48 49 50))
(rank@ m -1 -1 1) ; yields (2 22 42 7 27 47 12 32 52 17 37 57)
```

### (irank@ D1 D2...)
This function gives the same result as _rank@_.
It should be used to loop across different dimensions
```Lisp
(setq m (rho 3 4 5 (iota 60)))

(loop d (irank@ m -1 -1) (print d))
; Displays:
;((1 6 11 16) (21 26 31 36) (41 46 51 56))
;((2 7 12 17) (22 27 32 37) (42 47 52 57))
;((3 8 13 18) (23 28 33 38) (43 48 53 58))
;((4 9 14 19) (24 29 34 39) (44 49 54 59))
;((5 10 15 20) (25 30 35 40) (45 50 55 60))

```

### (determinant m)

Computes the matrix determinant of a square matrix m

### (ludcmp m)

_ludcmp_ applies to a matrix and returns a list of indexes.
_ludcmp_ replaces a real n-by-n matrix, _m_, with the LU decomposition of a row-wise permutation of itself.
__Important__: the matrix is _modified_ by the process.

```Lisp
(setq m (rho 2 2 (iota 4)))
(setq idx (ludcmp m)) 
; idx is (1 1) and m is now: ((3 4) (0.333333 0.666667))
```

### (lubksb m idx y)

Solves the set of n linear equations `mx = y`. (lubksb must be used with the procedure ludcmp to do this.)
_y_ is optional. When _y_ is not provided, then by default it will be the identity matrix, and it will act as a matrix inversion.

```Lisp
(setq m (rho 2 2 (iota 4))) 
(setq idx (ludcmp m)) ; m is modified
(setq y (lubksb m idx)) ; here the matrix is inverted

(setq m (matrix '((1 9 8) (2 3 4) (12 21 34))))
(setq y (matrix '((1 2 3) (4 5 6) (7 8 9))))
(setq idx (ludcmp m))
(setq x (lubksb m idx y)) ; here we solve the linear equations
```

### ⌹: (invert m), (solve w y)

* _invert_ provides the inversion of a matrix.
* _solve_ provides a way to solve linear equations such as: _W×X = Y_. It returns _X_. "×" is the matrix multiplication. 

The _inversion_ and the _solver_ are based on a LUDCMP decomposition followed with a LUBKSB decomposition.
Basically, _inverting a matrix_ is to solve linear equations where Y is the identity matrix.

```Lisp
(invert (rho 2 2 (iota 4))) ; yields ((-2 1) (1.5 -0.5))

(setq w (matrix '((1 9 8) (2 3 4) (12 21 34))))
(setq y (matrix '((1 2 3) (4 5 6) (7 8 9))))
 
(setq x (solve  w y))
; yields x is ((3.94737 4.89474 5.84211) (1.61404 2.22807 2.84211) (-2.18421 -2.86842 -3.55263))
(. w + * x) ; yields ((1 2 3) (4 5 6) (7 8 9)) 
```

# Functions inspired by Haskell

[back](https://github.com/naver/lispe/wiki/5.-Description-of-Functions,-Operators-and-Libraries)

__Important:__ The methods: _map, filter, take, repeat, cycle, takewhile, drop, dropwhile, fold, scan_ are automatically composed one with the others.

```Lisp

(map '+ (map '* '(1 2 3))) 
; is actually transformed into one single loop,
; which takes the following form:
(setq #recipient1 ()) 
(loop #i1 (quote (1 2 3))
      (setq #accu1 (+ (* #i1 #i1) (* #i1 #i1)))
      (push #recipient1 #accu1)
)

```

Hence, when a sequence of calls to these methods is made, the system automatically factorizes them into one single loop.

```
 Hence, thanks to that implementation, it is possible to perform lazy evaluations
```

### Note On Composition

If you want to know how your different functions have been composed, the easiest way is to store them in a function and to display the content of that function.

```Lisp

(defun tst(x) (map '* (map '+ x)))

; Displaying the content of 'tst'
(prettify tst)

(defun tst (x)
   (block
      (setq %content0 ())
      (loop %i0 x
         (setq %v0 (* (+ %i0 %i0) (+ %i0 %i0)))
         (push %content0 %v0)
      )
      %content0
   )
)
```

### for: (for x list action)

Applies _action_ to each element from _list_ and yields a list out of the results.

```Lisp
(for i '(1 2 3 4) (* i i)) ; (1 4 9 16)
```

### map: (map op list)

Applies an operation to each item in a list

```Lisp

(map '+ '(1 2 3)) returns (2 4 6)
(map '(+ 1) '(1 2 3)) returns (2 3 4)

; important, we interpret (1 -) as (- x 1)
(map '(1 -) '(1 2 3)) returns (0 1 2)

; Important, we interpret (- 1) as (- 1 x)
(map '(- 1) '(1 2 3)) returns (0 -1 -2)
 
(map (lambda (x) (+ x 1)) '(1 2 3)) returns (2 3 4)

;An amusing example, we execute a shell command
!v=ls

; But 'v' contains strings ending in carriage return.
; This is how you can initialize all the strings at once.

(setq v (map 'trim v))

```

### filter: (filter condition list)

Filters the items in a list. 
The condition can be a _lambda_.

```Lisp
(filter '(< 10) '(1 4 5 10 11 20)) returns (1 4 5)
(filter (lambda (x) (< x 10)) '(1 4 5 10 11 20)) returns (1 4 5)
``` 

### drop: (drop nb list)

Drops nb elements from a list and returns the remainder.

### dropwhile: (dropwhile condition list)

Skips all items meeting the condition, then returns the rest.

```Lisp
(dropwhile '( < 10) '(1 3 5 9 10 3 4 12)) returns (10 3 4 12)
```

### take: (take nb list)

Take _nb_ elements from a list.

### replicate: (replicate nb value)

Create a list, in which _value_ is repeated nb times.

```Lisp
(replicate 4 '(1 2)) ; yields ((1 2) (1 2) (1 2) (1 2))
```

### repeat: (repeat value)

Create a list, in which _value_ is stored over and over again.
It should be associated with a _take_ for instance.

```Lisp
(take 10 (repeat 5)) ; yields: (5 5 5 5 5 5 5 5 5 5)
```

### cycle: (cycle list)

Create a list, in which we cycle through _liste_ to store in.
It should be associated with a _take_ for instance.

```Lisp
(take 10 (cycle '(1 2 3)) ; yields: (1 2 3 1 2 3 1 2 3 1)
```

### takewhile: (takewhile condition list)

Keeps all the elements satisfying the condition and then removes the rest.

```Lisp
(takewhile '( < 10) '(1 3 5 9 10 3 4 12))) ; returns (1 3 5 9)
```

### irange: (irange initial increment)

Infinite range, starting at _initial_ by _increment_ step.

```Lisp
(takewhile '(< 10) (irange 1 2)) ; yields: (1 3 5 7 9)

(takewhile '(< 100) (map '* (irange 1 2))) ; yields: (1 9 25 49 81)
```

#### (irange initial bound increment)

This specific irange is used to avoid creating a list of integers beforehand in a loop with range.
It implements an increment-based loop. 

```Lisp

(loop i (irange 0 100 1)
   (println i)
)
```

### (irangein initial bound increment)

This specific _irangein_ is used to avoid creating a list of integers beforehand in a loop with range.
It implements an increment-based loop. 
The difference with _irange_ is that the bound is part of the values.

```Lisp

(loop i (irangein 0 5 1)
   (println i)
)

;0
;1
;2
;3
;4
;5
```

### foldl: (foldl op initial list)

applies an operation on a list, providing an initial value from the beginning of the list

```Lisp
(foldl '- 10 '(1 2 3)) ; gives 4
```
### foldl1: (foldl1 op list)

Same as _foldl_ but takes the first item in the list as first value
```Lisp
(foldl1 '- '(1 2 3)) ; gives -4
```

### foldr: (foldr op initial list)

as foldl but starts from the end of the list

### foldr1: (foldr1 op list)

as foldl1 but starts from the end of the list

### scanl: (scanl op initial list)

Keeps the list of intermediate items in a list

```Lisp
(scanl '- 10 '(20 30 40)) ; gives (10 -10 -40 -80)
```
### scanl1: (scanl1 op list)

Same thing, but we use the first element of the list for the calculation.

```Lisp
(scanl1 '- '(20 30 40)) ; gives (20 -10 -50)
```

### scanr: (scanr op initial list)

We start from the end of the list for the accumulation

```Lisp
(scanr '+ 0 '(3 5 2 1)) ; gives (11 8 3 1 0)
```
### scanr1: (scanr1 op list)

We start from the end of the list for the accumulation and use the last item for the operations

### zip: (zip l1 l2 l3...)

Allows to make a list from the list elements given as arguments.

```Lisp
(zip '(1 2 3) '(4 5 6) '(7 8 9)) ; gives ((1 4 7) (2 5 8) (3 6 9))
```

### zipwith: (zipwith op l1 l2 l3...)

Allows to apply an operator between list items.

```Lisp
(zipwith '+ '(1 2 3) '(4 5 6) '(7 8 9)) ; yields (12 15 18)
```

_zipwith_ creates a list based on the type of the first element that is returned by the lambda or the operation. For instance, in the above example, _zipwith_ will return a list of integers: _integers_.

_zipwith_ can take a last parameter, which can be _true_ or _false_ to force the output to be a regular list:

```Lisp
(type (zipwith '+ '(1 2 3) '(4 5 6) '(7 8 9))) ; yields integers_
(type (zipwith '+ '(1 2 3) '(4 5 6) '(7 8 9) false)) ; yields list_

```


### Non Composition Operator: an example

The non composition operator: `!`prevents LispE from combining two structures:

```Lisp
; We let LispE compose the following expression.
; At each step it processes both the scanl1 and the map
(map '* (scanl1 '+ '(10 20 30))) ; result is (10 900 864900)

; We prevent LispE from composing in the following expression:
(!map '* (scanl1 '+ '(10 20 30))) ; result is (100 900 3600)

```
### Lambdas With: __scan/fold__

There are two different sorts of _scan/fold_ functions: 

* from the left (indicated with an `l` at the end of the function name)
* from the right (indicated with an `r` at the end of the function name)

These two sorts of function not only process lists in a reverse order, they also compute their values in a reverse order.

Compare for instance:

```Lisp

(foldl1 '- '(1 2 3)) ; yields -4

(foldr1 '- '(1 2 3)) ; yields 2

```

If you use a lambda function then this lambda must take two arguments, but the order of the arguments depends on the type of functions.

* left function, the accumulator is the first argument
* right function, the accumulator is the second argument

```Lisp
; left function, the accumulator is the first argument
(scanl1 (lambda (accu x) (+ accu x 1)) '(1 2 3))

; right function, the accumulator is the second argument
(scanr1 (lambda (x accu) (+ accu x 1)) '(1 2 3))
```

# Math

[back](https://github.com/naver/lispe/wiki/5.-Description-of-Functions,-Operators-and-Libraries)

```Lisp
(fabs (val) calculates the absolute value of a float)
(iabs (val) calculates the absolute value of an integer)
(acos (val) calculates the arc cosine)
(acosh (val) calculates the hyperbolic arc cosine)
(asin (val) calculates the sine arc)
(asinh (val) calculates the hyperbolic sine arc)
(atan (val) calculates the tangent arc)
(atanh (val) calculates the hyperbolic arc tangent)
(cbrt (val) calculates the cubic root)
(cos (val) calculates the cosine)
(cosh (val) calculates the hyperbolic cosine)
(cosine (val1 val2) computes the cosine similarity between val1 and val2, both should be either floats or numbers and have the same size)
(erf (val) calculates the error function)
(erfc (val) calculates the complementary error function)
(exp (val) returns e high to the requested power)
(exp2 (val) returns 2 high to the requested power)
(expm1 (val) returns high e to the requested power minus 1)
(floor (val) returns the nearest lower integer)
(lgamma (val) calculates the natural logarithm of the absolute value of the gamma function)
(log (val) calculates the natural logarithm (in base e))
(log10 (val) calculates the logarithmic decimal (base 10))
(log1p (val) calculates the natural logarithm (in base e) of 1 plus the given number)
(log2 (val) calculates the binary logarithm (base 2))
(logb (val) extracts the exponent of a number)
(nearbyint (val) returns the nearest integer using the current rounding method)
(rint (val) returns the closest integer using the current rounding method with exception if the result is different)
(round (val) returns the nearest integer, following the rounding rules)
(sin (val) calculates the sinus)
(sinh (val) calculates the hyperbolic sinus)
(sqrt (val) calculates the square root)
(tan (val) calculates the tangent)
(tanh (val) calculates the hyperbolic tangent)
(tgamma (val) calculates the gamma function)
(trunc (val) returns the nearest integer whose absolute value is lower)
(radian (val) converts from degree into radian)
(degree (val) converts from radian into degree)
(gcd v1 v2) Greater Common Divison
(hcf v1 v2) Higher Common Factor
```

# Random
```Lisp
(random (nb) returns a random value between 0 and nb)
(shuffle (list) randomly mixes items in a list) 
(random_choice (nb list initial) returns a list of nb random values among the elements in 'list', and (initial/size list) > 1)
(uniform_distribution (nb (alpha 0) (beta 1)) Uniform discrete distribution)
(bernoulli_distribution (nb (alpha 0.5)) Bernoulli distribution)
(binomial_distribution (nb (alpha 1) (beta 0.5)) binomial distribution)
(negative_binomial_distribution (nb (alpha 1) (beta 0.5)) Negative binomial distribution)
(geometric_distribution (nb (alpha 0.5)) Geometric_distribution)
(fish_distribution (nb (alpha 1)) Fish_distribution (alpha = 1))
(exponential_distribution (nb alpha) Exponential distribution)
(gamma_distribution (nb alpha beta) Gamma distribution)
(poisson_distribution (nb (alpha 1) Poisson distribution)
(weibull_distribution (nb (alpha 1) (beta 1)) weibull distribution)
(extreme_value_distribution (nb (alpha 0) (beta 1)) Extreme Value distribution)
(normal_distribution (nb (alpha 0) (beta 1)) Normal distribution)
(lognormal_distribution (nb (alpha 0) (beta 1)) Lognormal_distribution)
(chi_squared_distribution (nb alpha) Chi-squared distribution )
(cauchy_distribution (nb (alpha 0) (beta 1)) Cauchy distribution)
(fisher_distribution (nb (alpha 1) (beta 1)) Fisher F-distribution)
(student_distribution (nb (alpha 1)) Student T-Distribution)
(discrete_distribution (nb list) Discrete distribution)
(piecewise_constant_distribution (nb inter) Piecewise constant distribution )
(piecewise_linear_distribution (nb inter) Piecewise linear distribution )
```
# Strings

[back](https://github.com/naver/lispe/wiki/5.-Description-of-Functions,-Operators-and-Libraries)


```Lisp
(trim0 (str) remove '0' at the end of the string)
(trim (str) Cuts all 'space' characters)
(trimleft (str) Trim all 'space' characters to the left)
(trimright (str) Cuts all 'space' characters to the right)

;------------------------------------------------------------------------

(vowelp (str) Checks if the string only contains vowels)
(consonantp (str) Checks if the string only contains consonants)
(lowerp (str) Checks if the string is only lowercase)
(upperp (str) Checks if the string is only capitalized)
(alphap (str) Checks if the string contains only alphabetic characters)
(digitp (str) Checks if the string contains only digits)
(punctuationp (str) Checks if the string contains only punctuation)

;------------------------------------------------------------------------

(lower (str) puts in lower case)
(upper (str) is capitalized)
(deaccentuate (str) Replaces accented letters with their non-accented form)
(replace (str fnd rep (index)) Replaces all sub-strings from index (default value is 0)

;------------------------------------------------------------------------

(format str e1 e2 ... e9) str must contains variables of the form: %I, 
where 1 <= i <= 9, which will be replaced with their corresponding element. 
Ex. (format "It is a %1 %2" "nice" "car") ; yields It is a nice car

;------------------------------------------------------------------------

(f_ frm) ; "frm" is a string where variables can be inserted into {..} sections as in Python f".."
; Note for complex expressions then "{..}" act as parentheses: "(..)".
; Note that the '%' escapes a '{' or a '}'.

Ex.
(setq a 0)
(setq b 10)
(f_ "A={a} and B={b}") ; A=0 and B=10
(f_ "A={a} and B={+ b 10}") ; A=0 and B=20
(f_ "%{{a}%}") ; {a}

;------------------------------------------------------------------------

(fill c nb): Returns a string, which contains the string 'c' 'nb' times)
(padding str c nb): Pads the string str with c string up to nb characters. If nb < 0 is left padding.

;------------------------------------------------------------------------

; Converts a value into a different base or from a value in different base
(convert_in_base value base (convert_from) 

Ex. 
(convert_in_base 36 2) ; yields 100100
(convert_in_base "100100" 2 true) ; yields 36, in this case the initial value is in base 2

;------------------------------------------------------------------------

(left (str nb) Returns the 'n' characters on the left)
(right (str nb) Returns the last 'n' characters on the right)
(middle (str pos nb) Returns the 'n' characters from the 'p' position)
(split (str fnd) Splits the string into sub-strings according to a given string)
(splite (str fnd) Same as split but keeps the empty strings)
(segment (str (point) Splits the string into a list of tokens)
(segment_e (str (point) same as 'segment' but keeps the blanks)
(ngrams (str nb)) Builds a lists of ngrams of size nb
(getstruct (str o c (pos)) Read an embedded structure in a string that starts at openning character 'o' and stops at closing character, from position 'pos') 

;------------------------------------------------------------------------

(ord (str) Returns the Unicode codes of each character of 'str')
(chr (nb) Returns the Unicode character corresponding to the code 'nb')

;------------------------------------------------------------------------

(editdistance str strbis Computes the edit distance between 'str' and 'strbis')

```
### Note on segment

The last argument of segment: _point_ takes three possible values:

* point = 0: the decimal separator is ".", it is also the default value
* point = 1: the decimal separator is ","
* point = 2: the decimal separator is potentially both

```Lisp
(segment "10.5 bottles of beer") ; is ("10.5" "bottles" "of" "beer")
(segment "10.5 bottles of beer" 0) ; is ("10.5" "bottles" "of" "beer")
(segment "10.5 bottles of beer" 1) ; is ("10" "." "5" "bottles" "of" "beer")
(segment "10,5 bottles of beer" 1) ; is ("10,5" "bottles" "of" "beer")

(segment "10,5 bottles and 10.5 bottles" 2) ; is ("10,5" "bottles" "and" "10.5" "bottles")
```

### Note on: *getstruct*

*getstruct* can extract successive structures from a _string_, which starts with a specific character and ends with another, from a specific position.

`(getstruct str "{" "}" 0)`

The _string_ can contain sub-structures of the same sort, which means that the method will only stop when all sub-structures have been consumed.

Hence, *getstruct* can return: `{{a:b} {c:d}}`.

This method can be called as many times as necessary to read all balanced structures. 
At each step, it returns a _list_, which contains the sub-string extracted so far, its initial position and its final position in the string.
When the last structure has been read, the system returns _nil_.

**Important**: The first element, which is returned by *getstruct* is a _string_ object. If this _string_ matches some _LispE_ structures such as lists or dictionaries, you can use *json_parse* to transform it into actual _LispE_ containers.

```Lisp

(setq r "{[a [b c d]] [[e f] g h]}")

(getstruct r "[" "]"); yields ("[a [b c d]]" 1 12)
(getstruct r "[" "]" 12); yields ("[[e f] g h]" 13 24)
(getstruct r "[" "]" 24); yields nil

```

## JSON Instructions

```Lisp
(json (element)) ; Returns the element as a JSON string
(json_parse (str) (raw)) ; Compile a JSON string
(json_read (filename (raw)) ; Reads a JSON file
(json_write (data filename)) ; write data into a JSON file
(json_dictionary (lst)) ; create a dictionaryjson_, values can be added from a list of an even number of values
```

**raw** means that the structure will be parsed in a regular dictionary, otherwise a JSON dictionary is created.
A Json Dictionary is a dictionary where the keys are stored in the order of insertion.

```lisp
(json_dictionary) ; returns a json dictionary
(json_dictionary '("a" 10 "b" 20 "c" 40)) ; values will be kept in the order of insertion

(json_parse `{"a":2 "b":3 "c":4}`) ; returns a json dictionary
(json_parse `{"a":2 "b":3 "c":4}` true) ; returns a regular dictionary
```

## Rule Tokenization

_LispE_ also provides another mechanism to handle tokenisation.
In this case, we use a set of pre-defined rules that can be modified.

```Lisp
; Tokenization with rules
(deflib tokenizer_main (), returns the main tokenizer of LispE, which used to tokenize LispE code)
(deflib segmenter (keepblanks point), returns the segmenter which is used in instruction segment)
(deflib tokenizer (), returns a copy of the main tokenizer)
(deflib tokenizer_display (rules), display the rules as indented automata)
(deflib tokenize (rules str (types)), tokenize a string using a specific tokenizer, can also returns the type of each element)
(deflib get_tokenizer_rules (rules), returns a vector of all rules in memory)
(deflib set_tokenizer_rules (rules lst), change the rules in memory to a new ensemble. Rules are then recompiled on the fly)
(deflib get_tokenizer_operators (rules), "%o" is associated with a set of operators)
(deflib set_tokenizer_operators (rules a_set), modify the set of operators with which "%o" is associated)
```

Basically, when you need to tokenize a string with a specific set of rules, you need first to access the _rule controller_ with either: *tokenizer_main, segmenter or tokenizer*. These methods return a handler to these different tokenizers.

Note that if you modify the handler returned by *tokenizer_main*, you can modify the actual rules that are used to tokenize _LispE_ code. In the same way, if you use the handler returned by *segmenter*, you can modify the behavior of _segment_.


Here is an example:

```Lisp
; We need first a rule tokenizer handler
(setq rule_handler (tokenizer))
; which we apply to a string
(tokenize rule_handler "The lady, who lives here, bought this picture in 2000 for $345.5")
; ("The" "lady" "," "who" "lives" "here" "," "bought" "this" "picture" "in" "2000" "for" "$" "345.5")
```

This underlying set of rules can be loaded and modified to change or enrich the tokenization process, thanks to _tokenizer_rules_.

```Lisp
(setq rules_list (get_tokenizer_rules rule_handler))
```

The rules are compiled into an automaton, which is used to tokenize a string. 
There are two sorts of rules:

* character rules: the rule starts with a specific character
* metarules: the rule pattern is associated with an id that is used in other rules.

#### IMPORTANT

__The rules should always be ordered with the most specific rules ahead__.

### Metarules
A metarule is composed of two parts: 

* c:expression, where c is the metacharacter that is accessed through %c and expression is a single body rule.
for instance, we could have encoded %o as: "o:[≠ ∨ ∧ ÷ × 2 3 ¬]"

#### IMPORTANT: 

These rules should be declared with one single operation.
Their body will replace the call to a _%c_ in other rules (see the test on metas in the parse section)
If you use a character that is already a meta-character (such as "a" or "d"), then the meta-character will be replaced with this new description... 

However, its content might still use the standard declaration:

"1:{%a %d %p}": "%1 is a combination of alphabetical characters, digits and punctuations

### Formalism

A rule is composed of two parts: `body=action`.

N.B The action is not used for the moment, but is required.
It can be a number or a '#'.

_body_ uses the following instructions:

* x   is a character that should be recognized
* #x     comparison with character of code x...
* #x-y   comparison between x and y. x and y should be ascii characters...
     
* %x  is a meta-character with the following possibilities:
1. ?  is any character
1. %a  is any alphabetical character (including unicode ones such as éè)
1. %C  is any uppercase character
1. %c  is any lowercase character
1. %d  is any digits
1. %e  is an emoji
1. %E  is an emoji complement (cannot start a rule)
1. %h  is a Greek letter
1. %H  is any hangul character
1. %n  is a non-breaking space
1. %o  is any operators
1. %p  is any punctuations
1. %r  is a carriage return both \n and \r
1. %s  is a space (32) or a tab (09)
1. %S  is both a carriage return or a space (%s or %r)
1. %nn  you can create new metarules associated with any OTHER characters...

__Rule formalism__:

1. (..) is a sequence of optional instructions
1. [..] is a sequence of characters in a disjunction
1. {..} is a disjunction of meta-characters
1. x*   means that the instruction can be repeated zero or n times
1. x+   means that the instruction can be repeated at least once
1. x-   means that the character should be recognized but not stored in the parsing string
1. ~..  means that all character will be recognized except for those in the list after the tilda.
     
IMPORTANT: do not add any spaces as they would be considered as a character to test... 
Except in disjunction: `{%d%d}` is the same as `{%d %d}`, as it makes the expression more readable.
Note that if you want to force a space as a potential target for your rule, you can either use: `%s` or `#32`, since 32 is the actual ASCII code for space.
 

```Lisp
; A meta-rule for hexadecimal characters
; It can be a digit, ABCDEF or abcdef
1:{%d #A-F #a-f}

; This is a basic rule to handle regular characters
!=0

; We escape the following characters as they are used as actions
%(=0
%)=0
%[=0
%]=0

; This rule detects a comment that starts with //
; any characters up to a carriage return
//?*%r=#

; These rules detects a number
; Hexadecimal starting with 0x
0x%1+(.%1+)({p P}({%- %+})%d+)=3

; regular number, + and - are escaped
%d+(.%d+({e E}({%- %+})%d+))=3

```

# Regular Expressions

[back](https://github.com/naver/lispe/wiki/5.-Description-of-Functions,-Operators-and-Libraries)

_LispE_ provides different means of regular expressions, both traditional (e.g. posix) and designed for _LispE_ specifically.

## Posix Regular Expressions

```Lisp
(deflib prgx (exp (str)) Creates a posix regular expression from a string)
(deflib prgx_find (exp str (pos 0)) Searches in 'str' for the sub-string that matches the posix regular expression from 'pos'.)
(deflib prgx_findall (exp str (pos 0)) Searches in 'str' all the sub-strings that matches the posix regular expression)
(deflib prgx_find_i (exp str (pos 0)) Returns the positions in 'str' of the sub-string that matches the regular expression from 'pos')
(deflib prgx_findall_i (exp str (pos 0)) Returns the positions in 'str' of all the sub-strings that matches the regular expression.)
(deflib prgx_match (exp str) Checks that 'str' matches the posix regular expression)
(deflib prgx_replace (exp str rep) Replaces 'str' by 'rep' via a posix regular expression)
(deflib prgx_split (exp str) Split 'str' via a posix regular expression)
```

### Examples

```Lisp

; We create our regular expression
; It is preferable to use the low accent (backquote) to avoid having to double the \
(setq r (prgx `\w+`))
true

; We're checking to see if it's a match
(prgx_match r "ABCD")
true

; We are looking for the first matching string.
(prgx_find r "This is a test: 123A here")
This


; We're looking for all occurrences
(prgx_findall r "This is a test: 123A and 45T and 67U here")
("This" "is" "a" "test" "123A" "and" "45T" "and" "67U" "here")

```
## LispE Regular Expressions

```Lisp
(deflib rgx (exp (str)) Create a regular expression from a string)
(deflib rgx_find (exp str (pos 0)) Searches in 'str' the sub-string that matches the regular expression from 'pos')
(deflib rgx_findall (exp str (pos 0)) Searches in 'str' all the sub-strings that matches the regular expression.)
(deflib rgx_find_i (exp str (pos 0)) Returns the positions in 'str' of the sub-string that matches the regular expression from 'pos')
(deflib rgx_findall_i (exp str (pos 0)) Returns the positions in 'str' of all the sub-strings that matches the regular expression.)
(deflib rgx_match (exp str) Checks that 'str' matches the regular expression)
(deflib rgx_replace (exp str rep) Replaces 'str' by 'rep' via a regular expression)
(deflib rgx_split (exp str) Split 'str' via a regular expression)
```


### Description of regular expressions

```
       - %d is any number
       - %x is a hexadecimal digit (abcdef0123456789ABCDEF)
       - %p represents any punctuation
       - %c represents any lowercase letter
       - %C is any uppercase letter
       - %a represents any letter
       - %h is a Greek letter
       - %H is an Asian character (Chinese, Korean or Japanese)
       - ? represents any character
       - %? is the character "?" itself
       - %% is the "%" character itself
       - %s represents any space character, including unbreakable space.
       - %r is the carriage return
       - %n represents an unbreakable space
       - ~ negation
       - \x escape character
        - \ddd character code on 3 integers.    
       - \xFFFF character code of 4 hexas exactly
       - {...} character disjunction
       - character sequence
       - {a-z} between a and z included
       - ^ the expression must start at the beginning of the string
       - $ the expression must match to the end of the string

   Examples :
       - dog%c corresponds to dogs or dogg
       - m%d corresponds to m0, m1,...,m9
       - {%dab} corresponds to 1, a, 2, b
       - {%dab}+ corresponds to 1111a, a22a90ab

```

### Examples

```Lisp

; We create our regular expression
(setq r (rgx "%d+%C"))
true

; We're checking to see if it's a match
(rgx_match r "123A")
true

; We are looking for the first matching string.
(rgx_find r "This is a test: 123A here")
123A

; We're looking for all occurrences
(rgx_findall r "This is a test: 123A and 45T and 67U here")
("123A" "45T" "67U")

```

# Ontologies

[back](https://github.com/naver/lispe/wiki/5.-Description-of-Functions,-Operators-and-Libraries)


An ontology is a defined as a set of concepts that can be combined one with the others with the following operators:

* eq : compare two concepts together
* &  : intersection of concepts
* |  : union of concepts
* ^  : exclusive union of concepts (same concepts are discarded)
* &~ : We keep only the concepts that the concepts does not have
* ~  : The set of all the concepts that are different from the current concept

Each ontology exposes by default the *_absurd* concept, which is the empty set.

**Important** : this ontology is by no way _hierarchical_, as in traditional ontologies. Concepts can be combined throughout the whole ontology, whatever their place or definition.

```Lisp
(ontology_absurd (h) Returns the '_absurd' concept for this ontology)
(ontology_find (h conc) Checks if a concept list has a name in the ontology)
(ontology_ontology (conc) Returns the ontology in which this concept is declared)
(ontology (name) Creates an ontology)
(ontology_list (conc) Returns the list of concepts stored in concepts)
(ontology_remove (conc a) Removes a concept from another concept definition in the ontology)
(ontology_add (conc a) Enriches the concept definition in the ontology with the other concept)
(ontology_intersect (conc a) Checks if two concepts have concepts in common)
(ontology_contain (large_conc conc) Check if large_conc contains conc)
(ontology_concept (h name) Returns the concept associated with this name)
(ontology_all (h) Returns the list of all concepts)
(ontology_absurdp (conc) Checks if the concept is '_absurd')
(ontology_create (h name (conc)) Creates a new concept definition with a name. The concept description can also be provided)
```


## Example

```Lisp
; We create an ontology: colors
(setq h (ontology "colors"))

; Our top concept is: color
(setq color (ontology_create h "color"))

; different colors, which all share the concept color
(setq red (ontology_create h "red" color))
(setq green (ontology_create h "green" color))
(setq blue (ontology_create h "blue" color))
(setq violet (ontology_create h "violet" color))
(setq indigo (ontology_create h "indigo" color))
(setq yellow (ontology_create h "yellow" color))
(setq orange (ontology_create h "orange" color))

; We can also combine two color concepts together
(ontology_add violet (list color indigo))
(ontology_add yellow (list color indigo))

; we can intersect two concepts
(println (ontology_list (& violet yellow)))
(println (ontology_list (| violet yellow)))

; We can remove a concept from a concept definition
(ontology_remove violet color)
(println "Sans color:" (ontology_list violet))

; These two calls return the same value
(println (ontology_concept h "orange") orange)

; We create a color black by combining red, green and blue
(ontology_create h "black" (| red green blue))

(println (ontology_list (ontology_concept h "black")))

; We display all concepts in the ontology
(println (ontology_all h))

; We can compare concepts
(if (eq 
      (& red (| red green))
      (ontology_concept h "red")
   )
   (println 'ok)
   (println 'non)
)

; When an intersection is empty we return _absurd
(if (ontology_absurdp (& red green))
   (println 'Oui)
   (println 'Non)
)

; In this case yellow is just yellow
(ontology_remove yellow yellow)
```

# Argument Definition in Functions

LispE provides many mechanisms to define function arguments and how they are called.

## Default Parameters and Variadic Functions

When defining the parameters of a function, via _defun_ or _lambda_, it is possible to declare certain parameters as optional.

To do this, simply declare the parameters as a list. If these lists contain two items, then the second one is considered as the default value.

```Lisp

(defun test (i (j -2)) (+ i j))

(print test(10 20))
30

(print test(10))
8
```

### Variadic Functions

LispE provides a specific notation for functions that can take a variable number of arguments. This notation is also a list where the first element is the empty list and the second is a parameter in which supernumerary arguments are stored as in a list. __This description should be the last element of your parameter definition.__

```Lisp
; All arguments after 'x' are stored in 'l'
(defun variadic(x (() l)) ...)
```

#### Example

```Lisp

; this function takes at least two arguments
(defun test(x y (() l))
    (println x y l)
)

(test 10 20 30 45 90 900 10) ; displays: 10 20 (30 45 90 900 10)

```

__Important:__ These list items should always be declared at the end of the parameter list, not in the middle.

### Instantiating function arguments by name

It is also possible to call a function and to instantiate the arguments by their name in the function definition. We use then the `?` operator, which takes as input the argument name and its value. Note, that in this case the order, in which elements are called is not longer important.

```Lisp
(defun teste(a b (c 10) (d 20)) (println a b c d))

; You can then call teste with its arguments named:
(teste 10 20 (? c 3) (? d 4))

; In which order you want:
(teste 10 20 (? d 3) (? c 4))

; if an argument is optional, then you can skip it...
(teste 10 20 (? d 4)) ; here c is 10
```

# Pattern Functions: _defpat_

_defpat_ stands for: _function pattern definition_.

_defpat_ helps define functions that can share the same name but differs on their parameter definition (_polymorphism_). _LispE_ will choose the first function in the list that matches your arguments.

## (defpat name (P1...Pn) ...)

A pattern function can take as many parameters (Pi) as you want (well... actually up to 15). A parameter is defined as followed:

### Parameter Definition Rules

1. `P -> (type P1...Pn)` where _type_ is a data type or a basic type
1. `P -> (condition v1...vN P1)` where _condition_ is either a function call or a basic instruction. `v1...vn` are values, there can be only one _parameter_, __always at the end of the condition__
1.  `P -> atom` a simple variable, which can be unified with an argument. 
1. `P -> value` that should match the argument. _Note_ that value can be a list, if the _first element_ of that list is not a type, a function or an instruction.

Of course, all these definition can be nested one into the others.

__Important:__ The order in which functions are applied is constrained by the presence of a type on the first parameter. If this type is missing, when P is only a condition or an atom, then this function is considered as a fallback and will only be applied once all the corresponding typed functions have been tested. The selection is done according to the argument type...
 
```Lisp
; The famous FIZZBUZZ example

; check if the rest of v/d is 0
(defun checkmod (v d) (eq (% v d) 0))

; We have here a nested declaration:
; we start with: P -> (type P)
; P   -> (integer_ P')
; P'  -> (checkmod v P'')
; P'' -> atom
; hence: (integer_ (checkmod value atom))

; if the element can be divided by 15 we return fizzbuzz
(defpat fizzbuzz ( [integer_ (not (% x 15))] ) 'fizzbuzz)

; if the element can be divided by 3 we return fizz
(defpat fizzbuzz ( [integer_ (checkmod x 3)] ) 'fizz)

; if the element can be divided by 5 we return buzz
(defpat fizzbuzz ( [integer_ (checkmod x 5)] ) 'buzz)

; rollback function, no type, we return x
; This function will only be called, if none of the above did apply
(defpat fizzbuzz (x) x)

; we apply 'fizzbuzz' to the first 100 elements.
; The argument type is: integer_

(mapcar 'fizzbuzz (range 1 100 1))
```

_Note_ that if you use a macro instead of a function, the last element of the macro should also be a variable that will be the one with which the argument will be unified.

```Lisp
; We replace 'checkmod' with a macro...

(defmacro checkmod (var val) (eq 0 (% var val)))

; Since checkmod is a macro, it will be inserted in each function parameter list,
; which imposes that the last parameter be the variable
; that will be unified with the argument: here var

; Hence, after application of the macro,
; fizzbuzz functions would have the following actual implementation:

(defpat fizzbuzz ( [integer_ (eq 0 (% x 3)) ] ) 'fizz)

```

### With Data Type

Of course, a pattern function can accept data types as parameters:

```Lisp

; Let's define our data type first

(data@ (Circle integer_) (Rectangle integer_ integer_) )

; We define the surface function according to the object type:
; Here is the surface of a circle: 
(defpat Surface ([Circle r]) (* _pi r r))

; Here is the surface of a rectangle
(defpat Surface ([Rectangle w h]) (* w h))

; The triangle is equilateral here, one single value is enough
(data@ Shape (Triangle _) (Square _))

; We define a pattern function that takes a Shape as argument
(defpat dim( [Shape dimension] )
    (println 'Dimension dimension)
)
```

We have defined our data type together with two definitions for _Surface_, one for a circle, the other one for a rectangle. Now, the system will automatically choose the right function according to its arguments:

```Lisp

(println (Surface [Circle 10])) yields : 314.159

; If we provide a Rectangle structure

(println (Surface [Rectangle 10 20] )) yields: 200

; These two calls do match as they belong to Shape 

(dim (Triangle 10))
(dim (Square 20))

```

When you define your function, you can also replace some fields with a _nil_.

```Lisp

(defpat Width ( [Rectangle w _] ) w)

```

The second parameter for _Rectangle_ is not necessary here, it is simple skipped.

## Enforcing Argument Type

First, the basic types are actually all implemented as basic data type, which means that you can use them to add a constraint on the argument types. The implementation is exactly the same as above, you simply replace your data type name with the required type.

```Lisp

(defpat addnumbers ( [integer_ x] [integer_ y] )
       (+ x y)
)

(addnumbers 10 20) ; is valid
(addnumbers 10 'x) ; is invalid

```

## Checking Argument Through a Function

It is actually possible to force an argument to match a pattern function through a call to a function that will either return `true` or `nil`.

In particular, one might want to check a regular expression pattern on an argument to trigger the execution of a function. 

Again, the formalism is the same as above, we simply replace the data type with a function call.

__IMPORTANT__ When using a function in a pattern, the argument that is used is always the last one in the argument list.

```Lisp

; This method compares two elements in a list
(defun checkless (x) (< (car x) (cdar x)))

; This pattern method expects the first argument to comply
; with the regular expression: \d\d (two digits)
(defpat action ( [prgx `\d\d` x] u)
   (println 'ok u)
)

; This pattern method expects the first argument to comply
; with the regular expression: %a+ (a sequence of alphabetical characters)
(defpat action ( [rgx `%a+` x] u)
   (println 'Alpha u)
)

; This pattern checks if the list x complies with checkless
(defpat action ( [checkless x] u)
   (println 'Yooo u)
)

; these three calls work fine
(action '(200 220) 'first)
(action "12" 'finally)
(action "Test" 'thing)

; this one fails: checkless fails
(action '(280 220) 'first)
```

The following example demonstrates a case when the comparison is not in the right order:

```Lisp

; The last element in the argument list is 's'
(defpat parcours ([string_ (in s "restaurant")] )
   (println 'ok s)
)

(defpat parcours ([string_ s])
     (println "No restaurant")
)

(parcours "la ville contient un bon restaurant italien")
```

__Note:__ `An important remark should be made on the above example. When you define a pattern function, the type of the first element of the definition is used as a key to access these functions. This type should be either a basic type (integer_, string_ list_ etc.) or a data type, otherwise it is nil. If we remove the 'string_' definition in the first function, then it will be considered as a callback function, which then will be indexed on 'nil'. By putting this constraint, we add this first function to the list of functions that can apply to a string`

## Pattern Matching against Lists and Dictionaries

It is of course possible to match a structure against dictionaries and lists.

```Lisp
; With dictionaries
(defpat tst({"12":y x:y})
   (println  x y)
)

; This call will display: bidule and machine
; "12" triggers the unification of y with "machine" 
; and only "bidule" as a key matches "machine" as a value
(tst {"12":"machine" "truc":"machin" "bidule":"machine"})

```

### The separator operator: `$`

It is in particular possible to use the `$` operator to match against sub-lists. This operator can be used within a pattern parameter. It tries to match the left part of the parameter list with the list argument. The rest of the list is then stored into the final variable as demonstrated with the following code:

```Lisp

; 1. A parameter pattern, `z` is the rest of the list
(defpat tst ( [x y $ z] )
   (println x y z)
)

; 2. The list should contain only one element
(defpat tst ((x))
   (println 'unique x)
)

; 3. matching against the empty list
(defpat tst ( ())
   (println 'empty)
)

(tst ()) ; triggers 3. and displays empty
(tst '(1 2 3 4 5)) ; triggers 1. and displays: 1 2 (3 4 5)
(tst '(1 2)) ; triggers 1. and displays: 1 2 ()
(tst '(1)) ; triggers 2. and displays: unique 1
```

### The `$` Operator in Dictionaries
The `$` operator can also be used with dictionaries. However, in this case it is considered as a `key`.

```Lisp

; the $ is followed with the :

(defpat tst({_:y _:y $:z})
   (println y z)
)


(setq d {"12":"machine" "truc":"machin" "bidule":"machine"})

; displays: machine {"truc":"machin"}
(tst d)

```

## Kleene Operators: _+ * %_

The _Pattern Functions_ also accept the used of the _Kleene Operators_ with variables or function constraints.

### With Variables

If a variable is associated with a _Kleene operator_, then the _next element in the pattern_ will be used as a constraint.

* a% : means that the element is optional
* a* : means that this element can be present 0 or n times
* a+ : means that this element should be present at least once

```Lisp

; the "]" is used as a constraint on the right
(defpat test( ["[" a* "]" $ res] )
   (println a res)
)

(test '("[" a b c d e f "]" i j k)) ; displays (a b c d e f) (i j k)
```

### With Conditions

It also possible to add a _Kleene operator_ to a condition.
In that case, the constraint only bears on the current element.


```Lisp
; This function will gather all the elements that comply with the constraint
; and will store the rest in r
(defpat nm ( [ ">" (< a 31)+ $ r])
   (println a r)
)
(nm '(">" 1 2 3 10 20 30 40 50 70)) ; displays (1 2 3 10 20 30) (40 50 60)
```

# Predicate Functions: _defpred_ and _defprol_

## defpred: Predicate-like Approach Based on Pattern Matching

`defpred` is a function definition mechanism in LispE that extends pattern matching with predicate-based function selection, _pred_ stands for predicate in this context. Similar to `defpat`, it allows multiple function definitions with the same name that are selected based on pattern matching.

### (defpred name (P1...Pn) ...)

A predicate function can take as many parameters (Pi) as you want (well... actually up to 15). A parameter is defined as followed:

### Parameter Definition Rules

1. `P -> (type P1...Pn)` where _type_ is a data type or a basic type
1. `P -> (condition v1...vN P1)` where _condition_ is either a function call or a basic instruction. `v1...vn` are values, there can be only one _parameter_, __always at the end of the condition__
1.  `P -> atom` a simple variable, which can be unified with an argument. 
1. `P -> value` that should match the argument. _Note_ that value can be a list, if the _first element_ of that list is not a type, a function or an instruction.

Of course, all these definition can be nested one into the others.

__Important:__ The order in which functions are applied is constrained by the presence of a type on the first parameter. If this type is missing, when P is only a condition or an atom, then this function is considered as a fallback and will only be applied once all the corresponding typed functions have been tested. The selection is done according to the argument type...

### Key Differences from `defpat`

1. In `defpred`, each instruction in the function body is evaluated as a Boolean.
2. If any instruction returns false (nil or 0), the function fails
3. Upon failure, the system attempts the next function definition
4. It provides built-in backtracking similar to Prolog's logical programming approach

### Parameter Matching:

1. Supports type-based and pattern-based parameter matching like `defpat`
2. Uses the same parameter definition rules
3. Can match against lists, dictionaries, and custom data types

Example:

```Lisp
; Functions are tried in order of definition
; Each function body is a series of boolean tests
; Successful execution stops further function searching
; Failed tests trigger searching for alternative function definitions

(defpred teste ([]) 
   true
)

(defpred teste ([a $ b])
   (< a 10)
   (println a)
   (teste b)
)

(defpred teste (l)
   (println "We stop" l)
)

(teste '(1 2 11 12 13))

; yields

1
2
We stop (11 12 13)
```

### Operator '@': non unifiable parameter

`defpred` also adds another operator, the _non unifiable operator._
This operator is used to indicate that an element is _not unifiable,_ which means that if you switch to another function, its value will not be reset to the value it had in the previous call.

Basically, to ensure proper backtracking, arguments are duplicated in a same session, so that each new call to a different body, will start with the same values as the previous calls.

You can also use this operator to avoid duplication, if you know that this value will remain constant through out the execution.

```Lisp

; b here is a non unifiable parameter
; which means that any modification of it is kept through the execution
; i is a unifiable parameter, any modification to it is lost when executing the next
; function
(defpred non_unif(i b@)
   (println "1" i b) ; display 1 () ()
   (push i 1)
   (push b 10)
; false is used here to force the execution of the next function
   false
)

; i value remains the same through out the execution
(defpred non_unif(i b@)
   (println "2" i b) ; display 2 () (10)
   (push i 2)
   (push b 20)
   false
)

(defpred non_unif(i b@)
   (println "3" i b) ; display 3 () (10 20)
   (push i 3)
   (push b 30)
   false
)

(setq x())
(non_unif (list) x)
(println x) ; display (10 20 30)

```

## defprol : Prolog-like implementation

`defprol` allows defining multiple functions with the same name, similar to `defpred`. When a `defprol` function is called, each definition is attempted in order. For a given definition, the code body is executed sequentially. If any instruction in the body evaluates to false, that definition fails, and the system moves to the next definition. If a definition's body executes completely without failing, the last evaluated value of the body is collected. The final result of a `defprol` call is a list containing the collected values from all definitions that successfully completed their execution for that call.

The `cut_` predicate can be used within a `defprol` body. If a definition successfully reaches a `cut_`, no further `defprol` definitions with the same name will be attempted for that call, regardless of whether the instructions *after* the `cut_` in the same definition succeed or fail.

```lisp
(defprol test(a b)
   (< a b)
   (+ a b)
)

(defprol test(a b)
   (= (- b a) 2)
   cut_
   (* a b)
)

(defprol test(a b)
   (< (+ a b) 100)
   (- b a)
)

(test 10 12) ; returns (22 120)
(test 10 14) ; return (24 4)
```

# Macro Functions: _defmacro_

A macro is a function that is applied at _compile time_ to replace a piece of code with another. Macro functions in LispE are based on the same principle as _pattern programming_ as demonstrated with [_defpat_](https://github.com/naver/lispe/wiki/6.1-Pattern-Functions) functions.

A macro can be divided into different functions, each with its own set of parameters.

Note that the `$` operator in macros are used both in the parameter list and as a _macro operator_ in the code.

## (defmacro name (P1...Pn) code)

A macro is a way to replace code with a more complex definition.

```Lisp
; this macro computes the cube of a number:

(defmacro cube(x) (* x x x))

```

If we apply this macro in a piece of code:

```Lisp
(cube 10)
```

_cube_ will be replaced with its definition:

```Lisp
(* 10 10 10)
```

### More Complicated Patterns

The patterns that are available for [_defpat_](https://github.com/naver/lispe/wiki/6.1-Pattern-Functions) are also available for _defmacro_.

```Lisp
(defmacro tantque (x $ z)
   (while x $ z)
)

(setq x 0)
(tantque (< x 11) (+= x 1) (println x))

```

The `$` operator is used here twice.
* In the pattern definition, it is used to extract the final list of elements.
* In the function definition, it is used to _insert_ the content of this final list into the code.

Let's compare with and without the `$` in the macro body:

```Lisp
; Without the $
(defmacro tantque (x $ z)
   (while x z)
)

; the extended code is now:
; (note the surrounding list around  (+= x &) (println x)
(while (< x 11) ((+= x 1) (println x)))

; With the $
(defmacro tantque (x $ z)
   (while x $ z)
)

; the extended code is now:
(while (< x 11) (+= x 1) (println x)
```

Basically, the `$` extends the code with the content of the list that was extracted by the pattern.
Note that you can add elements after the `$ z`:

```Lisp
(defmacro tantque (x $ z)
   (while x $ z (println x))
)
```
 
### Multiple patterns

You can also use multiple patterns to introduce some variety in your code:

```Lisp
; The only difference is how the range is created

; Here it is an upward range
(defmacro tang(('< x y) $ z)
   (loop x (range 0 y 1) $ z)
)

; Here the range is downward
(defmacro tang(('> x y) $ z)
   (loop x (range y 0 -1) $ z)
)

```

if we apply these macros to:

```Lisp
(defun tst1(x)
   (tang (< x 5) (println (* 2 x)))
)

(defun tst2(x)
   (tang (> x 5) (println (* 2 x)))
)
```

We get:

```Lisp
; The first function contains a "<" and matches with the first macro
(defun tst1 (x) (loop x (range 0 5 1) (println (* 2 x))))

; The second function contains a ">" and matches with the second macro
(defun tst2 (x) (loop x (range 5 0 -1) (println (* 2 x))))
```


# Creating and Handling Data Types in LispE through Pattern Matching Functions

[Version française](https://github.com/naver/lispe/wiki/6.7-Structure-de-données-et-programmation-par-motif)

_LispE_ provides a way to handle _data structures_ through functional _data type_ definition.

## Data Types

A data type in _LispE_ is created with the keyword: _data@_ followed with a list of descriptors: 

```Lisp
; Basic data types
(data@ (D1 p1 p2 ...) (D2 p1 p2 ...) (D3 p1 p2...) ...)

; Group of data type identified with 'name'
(data@ name (D1 p1 p2 ...) (D2 p1 p2 ...) (D3 p1 p2...) ...)
```

Each descriptor _Dd_ is an atom followed with a list of parameters.

You can optionally add a name to a group of data type definitions.

#### Example:

```Lisp

; Some basic data types
(data@ (Point _ _) (Circle _ ) (Rectangle _ _) )

; We create a Shape, which is either a Triangle or a Square
(data@ Shape (Triangle _ _ _) (Square _))

```

We use '_' as a placeholder when the parameter type is irrelevant. 

_Note_ '_' is actually an alias for _nil_. Hence, you can replace this description with:

```Lisp
(data@ (Point nil nil) (Circle nil ) (Rectangle nil nil) )
```

We use '_' as a bit of a tradition in this case.

### Visual cue: []

As a side note, since parentheses are a bit too many in these contexts, you can replace them with `[]` if you wish. This is also true for pattern functions. Hence, you can replace the above definitions with:

```Lisp
; Some basic data types
(data@ [Point _ _] [Circle _] [Rectangle _ _] )

; We create a Shape, which is either a Triangle or a Square
(data@ Shape [Triangle _ _ _] [Square _])

``` 

This notation does not change the semantics of these definitions, however it acts as a visual cue and makes the code more readable. Note that if you open with a `[` you have to close with a `]`.
  
### Creation

The creation of an instance is very simple. You simply implement a list that contains your data type name with its arguments. _LispE_ checks then if the structure matches its definition.

```Lisp
(setq v (Point 10 20))

(setq v (Point 10)) 
; --> Error: Size mismatch between argument list and data type definition
```

### Types

It is actually possible to put a constraint on the placeholders. _LispE_ already provides the following list of basic types:

* atom_
* data_
* dictionary_
* dictionary_i_
* dictionary_n_
* float_
* floats_
* heap_
* integer_
* integers_
* list_
* llist_
* matrix_
* matrix_float
* number_
* numbers_
* set_
* set_i_
* set_n_
* set_s_
* short_
* shorts_
* string_
* strings_
* tensor_
* tensor_float_

In that case, you can force the arguments to be of a certain type. For instance, you might force _Point_ to only accept *integers*.

```Lisp
(data@ [Point integer_ integer_])
```

If you try to create a data type that does not match, an error will be sent back.

```Lisp
(setq v (Point 10 'test)) 

; yields: Error: mismatch on data structure argument: 2 (integer_ required)
```

Of course, you can define nested definitions:

```Lisp

(data@ [Point _ _] [Circle [Point _ _] _] [Rectangle (Point _ _) _ _] )

```

which will be again enforced by _LispE_.

# LispE Class System Documentation

The LispE class system provides a simple yet powerful way to create and manage objects. It integrates seamlessly with other language features like pattern matching and predicates.

## 1. Defining a Class ✏️

You define a class using the **`class@`** macro. The definition includes the class name, its fields, and its methods.

### Syntax

(class@ ClassName (field1 field2 ...)(defun method1 ...)(defun method2 ...))

### Fields

Fields are the data members of the class. They are defined in a list following the class name. We also call them state variables since they are defined at creation time.

* **Simple Fields**: Declared as a simple atom (e.g., `x`, `y`). Their initial value is provided during instantiation.

* **Fields with Default Values**: Declared as a list containing the atom and its default value (e.g., `(z 1)`). This value is used if one is not provided during instantiation.

### Methods

Methods are functions bound to a class that operate on its instances. They are defined using **`defun`** inside the `class` block. Methods have direct access to the fields of their instance.

### Example

```Lisp
; Defines a class named 'truc' with fields x, y, and z
(class@ truc (x y z)

   (defun appel(u)
      (setq x 100)
      (println x y z)
      (+ x y z u)
   )
)

; Defines a class named 'machin' with fields x, y, and z (with a default value of 1).

(class@ machin (x y (z 1))
    ; Defines a method 'appel' that takes one argument 'u'.
    (defun appel(u)
       (println 'machin)(+ x y z u)) 

    ; Defines a method 'configure' that takes one argument 'e'.
    (defun configure(e)
        (setqi x e)
        (setqi v 100))) ; add a new field: `v`
```

## 2. Creating an Instance (Instantiation) ✨

You create an instance of a class by calling the class name as if it were a function.

### Syntax

```Lisp
(ClassName arg1 arg2 ...)
```

The arguments are mapped positionally to the fields defined in the class.

* `(setq r (truc 10 20 30))` creates an instance of `truc`, setting `x` to 10, `y` to 20, and `z` to 30.

* `(setq m (machin 10 12))` creates an instance of `machin`, setting `x` to 10, `y` to 12, and `z` to its default value of 1.

## 3. Working with Instances ⚙️

Once you have an instance, you can call its methods and access or modify its fields.

### Calling Methods

To call a method, you use the instance variable as a function, passing the method call as an argument.

* **Single Call**: `(r (appel 10))` calls the `appel` method on the `r` instance with the argument 10.

* **Chained Calls**: You can chain multiple method calls. The value of the *last* call in the chain is returned.

  * `(m (configure 1000) (appel 20))` first calls `configure` on `m` and then calls `appel`. The final result is the value returned by `(appel 20)`.

### Call with class definition
**Note** that in order to speed processing, you can also provide the class definition in the call: `(instance class (call) (call)...)`.
This call is a bit more verbose, but it allows the interpreter to know in advance the type of the instance and the execution is then more efficient.

```lisp

(r truc (appel 10)) ; we add the class definition in the call itself

```

### Accessing Fields: The `@` Operator

To access field values from outside the class, use the **`@`** operator.

* **Access by Name**: `(@ m 'x)` retrieves the value of field `x` from instance `m`.

* **Access by Index**: `(@ m 1)` retrieves the value of the second field (0-indexed), which is `y`, from instance `m`.

### Modifying Fields: `setq` vs. `setqi`

You can modify an instance's fields from within its methods.

* **`setq`**: This is the standard assignment operator. It will modify the value of an **existing** field locally in the function, but won't modify the field itself.

* **`setqi`**: This is a special "instance" assignment operator with dual functionality.

  * **Modify**: If the field exists, `setqi` modifies the existing field `x`. 

  * **Create**: If the field does **not** exist, `setqi` dynamically adds the new field to the instance. `(setqi v 100)` creates a new field `v` on the instance and sets its value to 100.

* **Access by Name**: `(set@ m 'x 1000)` modifies the value of field `x` from instance `m`.

* **Access by Index**: `(set@ m 1 23)` modifies the value of the second field (0-indexed), which is `y`, from instance `m`.

## 4. Derivation

You can derive a class from another class with the operator: `from@`. `from@` replaces the argument definition of your class. When you derive from another class, the arguments are copied into the new class. You can then add other arguments after:

```Lisp

(class@ mother (x y)
   (defun displaying()
      (println x y)
    )
   
    (defun test(a)
       (if (eq a x) y x)))

(class@ daughter (u) (from@ mother) ; we have now: u x y as arguments
    (defun test(a) ; this function replaces the mother function...
       (if (eq a x) u x))

    (defun call_mother(a)
        (from@ mother (test a)))

; note that, if the class doesn't add arguments:

(class@ daughterbis (from@ mother) ; we have now: x y as arguments
    (defun test(a) ; this function replaces the mother function...
       (if (eq a x) (+ x y) x))

    (defun call_mother(a)
        (from@ mother (test a)))

```

Note that the `from@` can also be used to call the mother function of a derived class.

## 5. Constructor and destructor

It is possible to define constructor and destructor functions. However, contrary to most languages, there is no specific name for these functions. The constructor is simply a function that can be called when creating an instance. While the destructor is a function, which is defined with `(toclean 'destructor)`.

```Lisp
(@class test(x init)
     (defun config() 
          ; clean is now the function that will be called when the instance is deleted
          (toclean 'clean)
          100
      )
      (defun clean()
          (println 'cleaning)
      )
)

(test 10 (config)) ; the constructor is an inner method in test called as an argument. The result of config is stored in: init

; At the end of the process:
; x is 10
; init is 100
```
Any functions in the class can be used either as a constructor or as a destructor.

## 6. Instantiating a class with argument names: `?`

The `?` operator, which is used to instantiate function call arguments through their name is also available in classes:

```Lisp
(class@ thetest(x (y 3) (z 10))
   (defun show()
      (println x y z)
   )
)

(thetest 10 (? z 2)) ; y will have its default value

; returns (thetest "x":10 "y":3 "z":10)
``` 

**Note:** It is also possible to use `setqi` in this context:

```Lisp
(class@ thetest(x (y 3) (z 10))
   (defun show()
      (println x y z)
   )
)

(thetest 10 (setqi z 2)) ; y will have its default value

; returns (thetest "x":10 "y":3 "z":10)
``` 

## 7. Advanced Integration 🧩

LispE classes are first-class citizens and work with other parts of the language.

### Pattern Matching with `defpat`

You can deconstruct class instances using **`defpat`**. This allows you to write functions that react differently based on the class of their argument.


```Lisp
; Defines a pattern for 'teste' that matches instances of the 'truc' class,
; binding its fields to local variables x, y, and z.

 (defpat teste([truc x y z])
     (println 'TRUC x y z))

; Provides a different behavior for instances of 'machin'.

 (defpat teste([machin x y z u])
     (println 'MACHIN x y z u))
```

### Usage in Control Flow

Method calls can be used as conditions in `if` statements or within predicates defined with **`defpred`**. A non-`nil` return value is treated as true.

* **Predicate**: `(defpred pred (x) (m (appel x)) ...)` defines a predicate `pred` that succeeds if the `(m (appel x))` call returns a true value.

* **Conditional**: `(if (r (appel 10)) (println 'ok) ...)` executes the first branch because the result of the `appel` method is a number (160), which is treated as true.


# PREDIBAG Code

Here is the list of instructions, which are available in the PREDIBAG environment.

```Lisp
; Decode a base64-encoded JSON chat structure from JS into a LispE object
(defmacro convertjs(chat)
    (json_parse (atob chat)))

; Decode a base64-encoded JSON chat structure from JS into a LispE object (alias)
(defmacro jsjson(chat)
    (json_parse (atob chat)))

; Build a JS call_chat expression from a raw prompts string
(defmacro jschat(prompts)
    (+ "call_chat(\`" prompts "\`);")
)

; Build a JS call_chat expression from a prompts object, encoding it as base64 JSON
(defmacro jschat64(prompts)
    (+ "call_chat(\`" (btoa (json prompts)) "\`);")
)

; Build a JS call_chat_silent expression from a prompts object, encoding it as base64 JSON
(defmacro jschatsilent64(prompts)
    (+ "call_chat_silent(\`" (btoa (json prompts)) "\`);")
)

; Strip HTML tags from a text string via the JS strip_html function
(defun clean_html(txt) (atob . evaljs (+ "strip_html(\`" (btoa txt) "\`);")))

; Encode data as base64: converts containers to JSON first, leaves strings as-is
(defun jsonp(d)
      (btoa (if (containerp d) (json d) d)))

; No-op callback that logs the result to the console
(defun none(r) (console_log r))

; Open an input dialog with a label, then call endpoint with the user's base64-encoded response
(defun read_input(msg endpoint)
    (asyncjs (f_ "read_input(\`{msg}\`);") endpoint)
)

; Save the current session (prompts for a name if no session is active)
(defun save_session()
    (asyncjs "save_session();" 'none)
)

; Store the current session to a file on disk at the given path
(defun store_session(path)
    (asyncjs (+ "store_session_to_disk(\`" (btoa path) "\`);") 'return_value)
)

; Store a string to a file on disk at the given path
(defun store_data(path data)
    (asyncjs (+ "store_data_to_disk(\`" (btoa path) "\`,\`" (btoa data) "\`);") 'return_value)
)

; Load a file from disk and return its content as a string
(defun load_data(path)
    (atob . evaljs (+ "load_data_from_disk(\`" (btoa path) "\`);"))
)

; Extract a JSON object from a string, starting after a given command marker
(defun jsonextract(cmd str)
       (setq pos (find cmd str))
       (+= pos (size str))
       (json_parse (@ (getstruct cmd "{" "}" pos) 0)))

; Global variables holding the current session's tools, skills, prompts and user data
(setq  thetools ())
(setq  theskills ())
(setq theprompts ())
(setq theuserdata ())

; Initialize the global session state with system prompts, skills, tools and user data
(defun Initialize(systems skills tools user_data)
      (setg thetools tools)
      (setg theskills skills)
      (setg theprompts systems)
      (setg theuserdata user_data)
      (println "System is set")
)

; Build the full system prompt by concatenating prompts, skills and tools sections
(defun systemprompt()
   (setq aprompt (+ (join theprompts "\\n") "\\n"))
   (if theskills
      (+= aprompt "<skills>\\n" (join theskills "\\n") "</skills>\\n")
   )
   (if thetools
      (+= aprompt "<tools>\\n" (join thetools "\\n") "</tools>\\n")
   )
   aprompt
)

; Retrieve the content of the Confidential field from the UI
(defun getconfidential()
    (atob . evaljs "getconfidential();"))

; Retrieve the content of the Secret field from the UI
(defun getsecret()
    (atob . evaljs "getsecret();"))

; Return the full system prompt as a base64-encoded string
(defun getsystemprompt()
   (btoa . systemprompt))

; Send prompts to the LLM via call_chat and call endpoint with the response
; Accepts up to 3 optional extra arguments forwarded to the async callback
(defun callchat(prompts endpoint (a1) (a2) (a3))
    (setq endpoint (atom endpoint))
    (cond
       (a3 (asyncjs (jschat64 prompts) endpoint a1 a2 a3))
       (a2 (asyncjs (jschat64 prompts) endpoint a1 a2))
       (a1 (asyncjs (jschat64 prompts) endpoint a1))
       (true (asyncjs (jschat64 prompts) endpoint))))

; Send prompts to the LLM silently (no chat display) and call endpoint with the response
; Accepts up to 3 optional extra arguments forwarded to the async callback
(defun callchatsilent(prompts endpoint (a1) (a2) (a3))
    (setq endpoint (atom endpoint))
    (cond
       (a3 (asyncjs (jschatsilent64 prompts) endpoint a1 a2 a3))
       (a2 (asyncjs (jschatsilent64 prompts) endpoint a1 a2))
       (a1 (asyncjs (jschatsilent64 prompts) endpoint a1))
       (true (asyncjs (jschatsilent64 prompts) endpoint))))

; Call a custom JS tool function with base64-encoded data, then invoke endpoint with the result
; Accepts up to 3 optional extra arguments forwarded to the async callback
(defun calltool(toolcall data endpoint (a1) (a2) (a3))
    (setq endpoint (atom endpoint))
    (setq d (btoa . json data))
    (setq calling_tool (f_ "{toolcall}(\`{d}\`);")) 
    (cond
       (a3 (asyncjs calling_tool endpoint a1 a2 a3))
       (a2 (asyncjs calling_tool endpoint a1 a2))
       (a1 (asyncjs calling_tool endpoint a1))
       (true (asyncjs calling_tool endpoint))))

; Call an MCP server tool with the given arguments, then invoke endpoint with the result
; Accepts up to 3 optional extra arguments forwarded to the async callback
(defun call_mcp(server tool arguments endpoint (a1) (a2) (a3))
    (setq endpoint (atom endpoint))
    (setq args {"server": server "tool":tool "arguments": (json arguments)})
    (setq args (btoa . json args))
    (setq calling_tool (f_ "mcp_call_tool(\`{args}\`);"))
    (cond
       (a3 (asyncjs calling_tool endpoint a1 a2 a3))
       (a2 (asyncjs calling_tool endpoint a1 a2))
       (a1 (asyncjs calling_tool endpoint a1))
       (true (asyncjs calling_tool endpoint))))

; Push a list of values into the User Data section 
(defun setUserData(mydata)
    (setq args (btoa . json mydata))
    (evaljs (f_ "setUserData(\`{args}\`);"))
)

; Display a message in the chat as an assistant bubble
(defun push_message(msg)
    (setq cmd (f_ "add_message(\' {btoa msg} \');"))
    (evaljs cmd)
)

; Display a message in the chat as a user bubble
(defun push_request(msg)
    (setq cmd (f_ "add_request(\' {btoa msg} \');"))
    (evaljs cmd)
)

; Schedule a function call after a delay (in ms); optionally pass data to the callback
(defun execute_when(time endpoint (data))
    (setq endpoint (atom endpoint))
    (if data
        (setq cmd (f_ "executewhen({time},\`{endpoint}\`, \`{jsonp data}\`);"))
        (setq cmd (f_ "executewhen0({time},\`{endpoint}\`);"))
    )
    (evaljs cmd)
)

; Default callback that prints the result to the Display zone
(defun return_value(res) (println res))

; Execute Python code via the FastAPI backend; optionally call endpoint with the result
(defun python(code (endpoint))
    (setq endpoint (atom endpoint))
    (setq code (+ "execute_python(\`" (btoa code) "\`);"))
    (if (nullp endpoint)
        (asyncjs code 'return_value)
        (asyncjs  code endpoint))
)

; Clear the Display output zone
(defun clean_display()
    (evaljs "cleanDisplay();")
)

; Fetch a URL and render its HTML content in the Display zone, then call endpoint
(defun display_page(url endpoint)
   (setq endpoint (atom endpoint))
   (asyncjs (f_ "open_url(\`{btoa url}\`);") endpoint)                    
)

; Fetch a URL and return its content as base64, then call endpoint
(defun fetch_page(url endpoint)
   (setq endpoint (atom endpoint))
   (asyncjs (f_ "fetch_webpage(\`{btoa url}\`);") endpoint)                    
)

; Open an HTML string in a new browser tab
(defun open_html(html)
   (evaljs (f_ "open_html_in_tab(\`{btoa html}\`);"))
)
````

