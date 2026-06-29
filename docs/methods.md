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
(setq v (input v))
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

It is also possible to keep track of the counter: `(loopcount counter variable instruction1...)`.

In this case, the variable receives the current counter value. Note that if the `counter` is negative, the variable will receive the values in the descendent order.

```Lisp
(loopcount 5 v (print v " ")) ; it prints: 0 1 2 3 4
(loopcount -5 v (print v " ")) ; it prints: 4 3 2 1 0
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
(json (element) Returns the element as a JSON string)
(json_parse (str) Compile a JSON string)
(json_read (filename) Reads a JSON file)
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

## 6. Advanced Integration 🧩

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

# Exploring LispE: A Distinctive Take on Lisp Through Pattern Matching and Logic

LispE, a modern Lisp dialect developed by Naver, introduces innovative constructs—`defpat`, `defmacro`, and `defpred`—that set it apart from traditional Lisp implementations like Common Lisp, Scheme, and Clojure. While Lisp dialects share a heritage of flexibility and macro systems, LispE extends this with advanced pattern matching, enhanced macro capabilities, and logic programming elements. This blog entry examines these features, comparing them to their counterparts in other Lisps with specific examples to highlight LispE’s unique approach.

## `defpat`: Pattern Matching in Function Definitions

LispE’s `defpat` enables defining multiple functions under the same name, each triggered by a specific argument pattern. This offers a declarative way to handle polymorphism beyond type-based dispatching.

**LispE Example 1 (FizzBuzz):**
```lisp
(defun checkmod (v d) (eq (% v d) 0))
(defpat fizzbuzz ([integer_ (checkmod x 15)]) 'fizzbuzz)
(defpat fizzbuzz ([integer_ (checkmod x 3)]) 'fizz)
(defpat fizzbuzz ([integer_ (checkmod x 5)]) 'buzz)
(defpat fizzbuzz (x) x)
(mapcar 'fizzbuzz (range 1 15 1))
```
Output: `(1 2 fizz 4 buzz fizz 7 8 fizz buzz 11 fizz 13 14 fizzbuzz)`. The nested patterns (e.g., `(integer_ (checkmod x 3))`) match integers divisible by 3, with a fallback for unmatched cases.

**LispE Example 2 (Kleene Operator):**
To further illustrate `defpat`’s capabilities, consider its support for Kleene operators (`+`, `*`, `%`), which allow matching sequences of arguments. Here’s an example that processes a list of numbers, collecting those less than 10:
```lisp
(defpat collect-small ([(< x 10)+ $ rest])
   (println "Collected:" x "Remaining:" rest)
   x
)
(defpat collect-small (lst)
   (println "No small numbers in:" lst)
   '()
)
(collect-small '(5 8 12 3 15))
```
Output:
```
Collected: (5 8) Remaining: (12 3 15)
(5 8)
```
Here, `[(< x 10)+ $ rest]` uses the `+` operator to match one or more numbers less than 10, binding them to `x`, while `$ rest` captures the remaining elements. If no numbers match the condition, the fallback definition applies. This demonstrates how `defpat` can concisely handle sequence patterns directly in the parameter list.

- **Common Lisp**: Lacks native pattern matching. Using CLOS generic functions requires defining methods for types, but condition-based or sequence matching needs manual logic:
  ```lisp
  (defun checkmod (v d) (= (mod v d) 0))
  (defgeneric fizzbuzz (x))
  (defmethod fizzbuzz ((x integer))
    (cond ((checkmod x 15) 'fizzbuzz)
          ((checkmod x 3) 'fizz)
          ((checkmod x 5) 'buzz)
          (t x)))
  (mapcar #'fizzbuzz (loop for i from 1 to 15 collect i))
  ```
  For the Kleene-like case:
  ```lisp
  (defun collect-small (lst)
    (let ((small (loop for x in lst while (< x 10) collect x)))
      (if small
          (progn
            (format t "Collected: ~a Remaining: ~a~%" small (nthcdr (length small) lst))
            small)
          (progn
            (format t "No small numbers in: ~a~%" lst)
            '()))))
  (collect-small '(5 8 12 3 15))
  ```
  This requires explicit looping and list manipulation, contrasting with LispE’s concise pattern.

- **Scheme**: Relies on explicit conditionals without pattern matching:
  ```scheme
  (define (checkmod v d) (= (modulo v d) 0))
  (define (fizzbuzz x)
    (cond ((checkmod x 15) 'fizzbuzz)
          ((checkmod x 3) 'fizz)
          ((checkmod x 5) 'buzz)
          (else x)))
  (map fizzbuzz (iota 15 1))
  ```
  For the sequence example:
  ```scheme
  (define (collect-small lst)
    (let loop ((in lst) (small '()))
      (cond ((null? in)
             (if (null? small)
                 (begin (display "No small numbers in: ")A (display lst) (newline) '())
                 (begin (display "Collected: ") (display (reverse small))
                        (display " Remaining: ") (display in) (newline)
                        (reverse small))))
            ((< (car in) 10)
             (loop (cdr in) (cons (car in) small)))
            (else
             (display "Collected: ") (display (reverse small))
             (display " Remaining: ") (display in) (newline)
             (reverse small)))))
  (collect-small '(5 8 12 3 15))
  ```
  The logic is centralized and recursive, lacking LispE’s declarative sequence matching.

- **Clojure**: Multimethods offer dispatching, but complex patterns need custom logic:
  ```clojure
  (defn checkmod [v d] (zero? (mod v d)))
  (defmulti fizzbuzz (fn [x] [(integer? x) x]))
  (defmethod fizzbuzz [true 15] [_] :fizzbuzz)
  (defmethod fizzbuzz [true 3] [_] :fizz)
  (defmethod fizzbuzz [true 5] [_] :buzz)
  (defmethod fizzbuzz :default [x] x)
  (map fizzbuzz (range 1 16))
  ```
  For the Kleene case:
  ```clojure
  (defn collect-small [lst]
    (let [small (take-while #(< % 10) lst)
          rest (drop (count small) lst)]
      (if (seq small)
          (do (println "Collected:" small "Remaining:" rest) small)
          (do (println "No small numbers in:" lst) '()))))
  (collect-small [5 8 12 3 15])
  ```
  This uses functional utilities but lacks the pattern-based brevity of `defpat`.

LispE’s `defpat` stands out with its ability to embed conditions and Kleene operators directly in parameters, offering a more expressive and modular alternative to the manual logic required in other Lisps.

## `defmacro`: Enhanced Macros with Pattern Matching

LispE’s `defmacro` extends the traditional Lisp macro system with pattern matching and a `$` operator, simplifying the creation of custom syntax that adapts to argument structures.

**LispE Example (Custom Loop):**
```lisp
(defmacro tang (('< x y) $ z)
   (loop x (range 0 y 1) $ z)
)
(defmacro tang (('> x y) $ z)
   (loop x (range y 0 -1) $ z)
)
(tang (< x 5) (println (* 2 x)))
```
Expands to `(loop x (range 0 5 1) (println (* 2 x)))`, looping upward. The `$ z` captures and inserts additional arguments.

- **Common Lisp**: Macros require manual destructuring:
  ```lisp
  (defmacro tang (direction-and-vars &rest body)
    (let ((dir (car direction-and-vars))
          (x (cadr direction-and-vars))
          (y (caddr direction-and-vars)))
      (if (eq dir '<)
          `(loop for ,x from 0 below ,y do ,@body)
          `(loop for ,x from ,y downto 0 do ,@body))))
  (tang (< x 5) (format t "~d~%" (* 2 x)))
  ```
  This manually parses the direction and variables, requiring more code than LispE’s pattern-based approach.

- **Scheme**: Hygienic macros limit flexibility, but a traditional macro works similarly:
  ```scheme
  (define-syntax tang
    (lambda (stx)
      (syntax-case stx (< >)
        [(_ (< x y) body ...)
         #'(let loop ((x 0))
             (when (< x y)
               body ...
               (loop (+ x 1))))]
        [(_ (> x y) body ...)
         #'(let loop ((x y))
             (when (>= x 0)
               body ...
               (loop (- x 1))))])))
  (tang (< x 5) (display (* 2 x)) (newline))
  ```
  The syntax-case system requires explicit pattern handling, less streamlined than LispE’s `$`.

- **Clojure**: Macros need manual argument processing:
  ```clojure
  (defmacro tang [[op x y] & body]
    (if (= op '<)
      `(doseq [~x (range 0 ~y)] ~@body)
      `(doseq [~x (range ~y -1 -1)] ~@body)))
  (tang (< x 5) (println (* 2 x)))
  ```
  This parses the operator and constructs the loop, but lacks LispE’s pattern automation.

LispE’s `defmacro` simplifies macro writing with pattern matching and the `$` operator, reducing the manual effort seen in other Lisps and enabling more modular syntax definitions.

## `defpred`: Predicate Logic and Backtracking

LispE’s `defpred` introduces predicate-based functions with automatic backtracking, blending functional and logic programming.

**LispE Example (Filtering Numbers):**
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
```
Output: `1 2 We stop (11 12 13)`. It prints numbers less than 10, backtracking to a catch-all when the condition fails.

- **Common Lisp**: Requires explicit control flow:
  ```lisp
  (defun teste (lst)
    (cond ((null lst) t)
          ((< (car lst) 10)
           (format t "~d~%" (car lst))
           (teste (cdr lst)))
          (t (format t "We stop ~a~%" lst))))
  (teste '(1 2 11 12 13))
  ```
  No automatic backtracking; the logic is hardcoded in one function.

- **Scheme**: Could use continuations, but it’s manual:
  ```scheme
  (define (teste lst)
    (if (null? lst)
        #t
        (if (< (car lst) 10)
            (begin (display (car lst)) (newline) (teste (cdr lst)))
            (begin (display "We stop ") (display (cdr lst)) (newline)))))
  (teste '(1 2 11 12 13))
  ```
  Backtracking requires additional setup, unlike LispE’s built-in mechanism.

- **Clojure**: Needs explicit recursion:
  ```clojure
  (defn teste [lst]
    (cond (empty? lst) true
          (< (first lst) 10) (do (println (first lst)) (teste (rest lst)))
          :else (println "We stop" (rest lst))))
  (teste [1 2 11 12 13])
  ```
  No backtracking support; it’s a straightforward recursive function.

LispE’s `defpred` integrates backtracking and predicate logic natively, a feature absent in other Lisps, offering a declarative approach inspired by logic programming.

## How LispE Stands Apart

- **Pattern Matching**: `defpat` and `defmacro` leverage rich patterns, reducing the manual logic seen in Common Lisp’s conditionals, Scheme’s explicit branching, and Clojure’s custom dispatching.
- **Macro Flexibility**: `defmacro`’s `$` operator and pattern matching streamline transformations compared to the more verbose destructuring in other Lisps.
- **Logic Programming**: `defpred` brings backtracking into LispE, a capability requiring significant effort to replicate in Common Lisp, Scheme, or Clojure.

These examples demonstrate LispE’s focus on expressiveness and modularity, making it a compelling option for tasks involving complex data, custom syntax, or logical reasoning. For those studying programming languages, LispE offers a fresh perspective on Lisp’s evolution.

