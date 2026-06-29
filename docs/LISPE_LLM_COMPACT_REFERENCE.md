# LispE Web Assembly documentation: Compact Reference for LLM Code Generation

**LispE is NOT Common Lisp.** Key differences are highlighted below.

## Comments

Comments in LispE are not like Common Lisp. 
1. A single ";" introduces a comment.
2. A comment bloc can be defined with:
    ";;"
    comments
    etc.
    ";;"
    
## Syntax & Basic Types

### Variables & Assignment
```lisp
(setq var value)       ; Local variable (scoped to function)
(setg var value)       ; Global variable
(setq= var value)      ; Smart assignment (setq/setg/setqi based on context)
(setqi var value)      ; Instance field assignment (for classes)
```

### Numbers & Arithmetic
```lisp
(+ 1 2 3)              ; Addition
(- 10 2)               ; Subtraction (space after minus required!)
(* 3 4)                ; Multiplication
(/ 10 3)               ; Division → 3.33...
(% 10 3)               ; Modulo → 1
(^^ 2 3) or (** 2 3)   ; Power
```

### Lists vs Common Lisp
```lisp
'(1 2 3)               ; Quoted list literal
(list 1 2 3)           ; Create list from args
(cons 'a '(b c))       ; → (a b c)
(car list)             ; First element
(cdr list)             ; Rest (cdar, cadr, caadr combinations supported)
(push list val)        ; Add to end (returns copy if literal)
(pushfirst list val)   ; Add to front (returns copy if literal)
(pop list idx)         ; Remove at index
(insert list val idx)  ; Insert at index
```

### Strings
```lisp
"hello"                ; String literal
(+ "a" "b")            ; String concatenation (UNIQUE TO LispE)
(string val)           ; Convert to string
(explode "abc")        ; → (a b c)
(join '(a b c) "-")    ; → "a-b-c"
(f_ "value={x} {+ 2 3}")  ; Python-style f-strings
```

### Dictionaries
```lisp
(dictionary "k1" "v1" "k2" "v2")      ; String-keyed
(dictionaryi 1 "a" 2 "b")             ; Integer-keyed
(dictionaryn 1 "a" 2 "b")             ; Float-keyed
(key@ d "k")                          ; Access: return nil if "k" is not a key.
(key@ d "k" "newval")                 ; Set
(@ dict key)                          ; Also works for access but fails if key is not a key.
(set@ dict key value)                 ; Set value
```

### Sets
```lisp
(sets "a" "b" "c")     ; String set
(seti 1 2 3)           ; Integer set
(setn 1.5 2.5)         ; Number set
(insert set val)       ; Add to set
(pop set val)          ; Remove from set
(in set val)           ; Check membership
```

## Control Flow - **CRITICAL DIFFERENCES**

### Conditionals
```lisp
(if condition true_form (optional_false_form))
(ife condition true_form else_instruction1 else_instruction2)  ; Multiple else instructions
(cond (c1 a1) (c2 a2) (true final_action))   ; Multi-way branch
(check condition i1 i2...)  ; Execute if true, else nothing
(ncheck condition else_i i1 i2...)  ; Opposite of check
```

### Loops - **COMPLETELY DIFFERENT FROM COMMON LISP**
```lisp
(loop var list i1 i2...)    ; Iterate over list/string
(lloop (x y z) l1 l2 l3...)  ; Parallel iteration (must match counts)
(loopcount n i1 i2...)       ; Iterate n times
(loopcount n into var i1...) ; With counter (negative counts backwards)
(while (cond) i1 i2...)      ; While loop

; Loop returns last evaluated value
(loop i '(1 2 3) (* i 2))   ; → 6
```

### Important: block, catch, maybe
```lisp
(block i1 i2 i3)       ; Evaluate instructions, return last
(catch i1 i2...)       ; Execute, catch errors
(if (maybe err) ...)   ; Check if result is error
(maybe i1 i2 i3 (lambda (e) ...))  ; Execute with error handler
```

## Functions

### Definition
```lisp
(defun name (param1 param2)
   (+ param1 param2))

(defun name (x (y 10) (() rest))    ; Optional args + variadic
   ...)

(lambda (x y) (+ x y))
(\(x y) (+ x y))                    ; Backslash shorthand (unique)
```

### Pattern Functions - **UNIQUE TO LispE**
```lisp
(defpat func ([integer_ x] y)            ; Pattern matching on types
   (+ x y))

(defpat func (x)                    ; Fallback (no type)
   x)

; Parameter matching:
; [type var], [condition var], atom, literal, lists with $
; Use $ to capture rest: (defpat test ([a $ rest]) ...)
```

### Predicate & Prolog-like Functions
```lisp
(defpred func (x)                   ; Like defpat but body is boolean tests
   (< x 10)
   (println x)
   true)

(defprol func (x)                   ; Collects all successful results
   (< x 10)
   (+ x 100))
```

### Macros
```lisp
(defmacro cube (x) (* x x x))
; Code replaced at compile time

(defmacro while_loop (cond $ body)  ; $ captures rest
   (while cond $ body))
```

## Data Types - Unique Features

### Matrices & Tensors
```lisp
(rho 2 3 (iota 6))              ; Create 2×3 matrix from 1..6
(rho 2 (iota 3))                ; 2 rows, cycle through list
(@ matrix i j)                  ; Access element at [i,j]
(set@ matrix i j value)         ; Set element
(transpose matrix) or (⍉ m)    ; Transpose (Greek letter ⍉)
```

### Lists of Specific Types
```lisp
(integers 1 2 3)                ; List of integers type
(floats 1.1 2.2)                ; List of floats type
(strings "a" "b")               ; List of strings type
(numbers 1 1.5 2)               ; List of numbers (mixed)
```

### Linked Lists
```lisp
(llist 1 2 3)                   ; Linked list (can have cycles)
(to_llist regular_list)         ; Convert to linked list
(cyclicp list)                  ; Check for cycles
```

## Key Differences from Common Lisp

| Feature | LispE | Common Lisp |
|---------|-------|-----------|
| String concat | `(+ "a" "b")` | `(concatenate 'string "a" "b")` |
| f-strings | `(f_ "x={x}")` | Not native |
| Loop syntax | `(loop var list ...)` | `(loop for i in ...)` |
| Pattern matching | `(defpat name (pattern) ...)` | Not native |
| Matrices | Native with `rho`, `@` | Not native |
| Lambda shorthand | `\(x) ...` | Not common |
| Type annotations | In function params | Less integrated |
| Operator precedence | Via `infix` | Built-in |
| Classes | `class@` with methods | CLOS (different) |

## Commonly Used Functions

### List Operations
```lisp
(size list)                     ; Length
(reverse list)                  ; Reverse
(flatten nested_list)           ; Flatten all levels
(sort '< list)                  ; Sort with comparator
(unique list)                   ; Remove duplicates
(slice list 3)                  ; Split into chunks of 3
(extract list i j)              ; Sublist from i to j
(find val list)                 ; Position or nil
(in val list)                   ; true or nil
```

### Haskell-like Functions (Auto-composed)
```lisp
(map '+ '(1 2 3))               ; → (2 4 6)
(filter '(< 10) '(1 5 15))     ; → (1 5)
(fold '+ 0 '(1 2 3))            ; → 6
(take 3 (repeat 5))             ; → (5 5 5)
(zipwith '+ '(1 2) '(10 20))   ; → (11 22)
```

### APL-like Operators
```lisp
(iota 5)                        ; → (1 2 3 4 5) [1-indexed]
(iota0 5)                       ; → (0 1 2 3 4) [0-indexed]
(rho dims list)                 ; Reshape
(transpose m) or (⍉ m)         ; Transpose
(scan '+ '(1 2 3))              ; → (1 3 6) [cumulative]
(reduce '+ '(1 2 3))            ; → 6 [fold]
(° '* '(1 2) '(3 4))           ; Outer product
(. '+ '* v1 v2)                 ; Inner product (dot)
(== list1 list2)                ; Element-wise comparison (0/1)
(∈ val values)                  ; Membership (returns 0/1 list)
```

### String Functions
```lisp
(trim str)                      ; Remove spaces
(upper str) (lower str)         ; Case conversion
(split "a,b,c" ",")            ; → ("a" "b" "c")
(ngrams "abc" 2)                ; → ("ab" "bc")
(replace str old new)           ; Replace all occurrences
(format "x=%1 y=%2" 10 20)     ; Printf-style
(f_ "x={x} y={y}")             ; F-string style
```

### Type Checking
```lisp
(atomp x)       ; Is atom
(consp x)       ; Is list
(stringp x)     ; Is string
(numberp x)     ; Is number
(nullp x)       ; Is nil
(type x)        ; Type name
```

## Classes - **UNIQUE SYNTAX**

```lisp
(class@ Name (field1 field2 (optional_field 10))
   (defun method1 (param)
      (+ field1 param))
   
   (defun method2 (param)
      (setqi new_field param)      ; Add/modify field
      method1_result))

; Create instance
(setq obj (Name 5 10))

; Call method
(obj (method1 20))               ; → Result

; Chain methods
(obj (method1 5) (method2 10))   ; Last result returned

; Access field
(@ obj 'field1)                  ; → 5
(@ obj 1)                        ; → 10 (index access)

; Modify field
(set@ obj 'field1 100)
(set@ obj 0 100)

; Inheritance
(class@ Derived (new_field) (from@ Parent))
```

## Important Language Features

### Infix Notation
```lisp
(lambda (x) (infix 10 + 20 - x))   ; Infix math expressions
(• x + 2 * 3)                      ; • or /\ or § or infix
```

### Operators as Shorthand
```lisp
(+= var 10)                        ; var = var + 10
(*= var 2)                         ; Supports all basic ops
(-= var 1)
```

### Namespaces
```lisp
(defspace myspace
   (defun func () 42))

(space myspace
   (func))             ; Call within namespace

(load "file.lisp" myspace)  ; Load into namespace
```

## Comparison & Boolean

```lisp
(= x y)         ; Deep equality (lists too)
(eq x y)        ; Identity (fast, atoms)
(!= x y)        ; Not equal
(< x y) (<= x y) (> x y) (>= x y)
(>=< x y)       ; Returns: -1 if <, 0 if =, 1 if >
(and c1 c2)     ; Boolean AND
(or c1 c2)      ; Boolean OR
(not x)         ; Boolean NOT
```

## I/O & System

```lisp
(print x)                   ; No newline
(println x)                 ; With newline
(println x y z)             ; Multiple args, space-separated
(printerr x)                ; Print to stderr
```

## Error Handling

```lisp
(catch
   (some_function)
   (another_function))        ; Returns error object if failed

(if (maybe result)
   (print "Error:" result)
   (print "Success"))

(maybe
   (op1)
   (op2)
   (lambda (err) (print "Failed:" err)))
```

## Regular Expressions

```lisp
; LispE regex (custom syntax)
(setq r (rgx "%d+%C"))       ; Digits + uppercase letter
(rgx_match r "123A")         ; true
(rgx_find r "test 123A end") ; "123A"
(rgx_findall r str)          ; All matches
(rgx_replace r str "X")      ; Replace matches

; Posix regex (standard)
(setq p (prgx `\w+`))        ; Backquote for Less escaping
(prgx_match p "abc")         ; true
(prgx_find p str)
```

## JSON & WASM-Only Functions

```lisp
(json data)                  ; → JSON string
(json_parse str)             ; ← Parse JSON
(json_read "file.json")      ; Read JSON file
(json_write data "file.json") ; Write JSON file

; WASM-only:
(evaljs "JS_CODE()")         ; Execute JavaScript
(asyncjs "JS_CODE()" callback)  ; Async JS call with callback
```

## Quick Reference: Non-Standard Syntax

| Feature | LispE | Pattern |
|---------|-------|---------|
| Shorthand lambda | `\(x) body` | Not in CL |
| Infix math | `(infix 1 + 2)` | Not in CL |
| F-strings | `(f_ "x={x}")` | Not in CL |
| String concat | `(+ "a" "b")` | Unique |
| Pattern matching | `(defpat name (pat) ...)` | Not in CL |
| Matrices | `(@ m i j)`, `rho` | Not native in CL |
| Operator shorthand | `(+=)`, `(*=)` | Named functions in CL |
| Loop syntax | `(loop var list ...)` | Different from CL |
| Greek symbols | `⍳`, `⍴`, `⍉`, `°` | Not in CL |

## Common Pitfalls

1. **Space after minus**: `(- 10 2)` NOT `(-10 2)`
2. **List literals**: Use `'(...)` or `(list ...)`
3. **String concat**: Use `(+)` NOT `(concatenate)`
4. **Loop returns value**: `(loop i list (+ i 1))` returns last value
5. **Push modifies/copies**: Depends on if list is literal or variable
6. **Pattern order**: Most specific patterns first, fallback last
7. **Class field access**: `(@ obj 'fieldname)` not `(obj fieldname)`
8. **Method chaining**: `(obj (m1) (m2))` - results cascade, return last
9. **setq vs setqi**: `setq` for local, `setqi` for class fields
10. **Function params**: `(defun f ((opt_param 10)) ...)` for defaults

## Example Programs

### Factorial
```lisp
(defun fact (n)
   (if (= n 1) 1 (* n (fact (- n 1)))))

(println (fact 5))  ; 120
```

### Fizzbuzz with Pattern Matching
```lisp
(defpat fb ([integer_ (= (% x 15) 0)]) 'fizzbuzz)
(defpat fb ([integer_ (= (% x 3) 0)]) 'fizz)
(defpat fb ([integer_ (= (% x 5) 0)]) 'buzz)
(defpat fb (x) x)

(mapcar 'fb (range 1 16 1))
```

### List Processing
```lisp
(loop i (iota 10)
   (if (> i 5)
       (println i)
       (* i 2)))

; Or with functional style:
(mapcar '(* 2) (filter '(< 5) (iota 10)))
```

### Class Example
```lisp
(class@ Point (x y)
   (defun distance_to_origin ()
      (sqrt (+ (* x x) (* y y))))
   
   (defun translate (dx dy)
      (setqi x (+ x dx))
      (setqi y (+ y dy))
      (distance_to_origin)))

(setq p (Point 3 4))
(p (distance_to_origin))      ; 5
(p (translate 1 1))            ; ~7.07
```

---

**Remember**: Always check parameter order in pattern functions and know whether you're using local (setq), global (setg), or instance (setqi) assignment.

### LispE Functions
- **@,at,nth**: Access container by keys. Ex:`(@ r 0 1)`→2 for`r=((1 2)(3 4))`.
- **@@,extract**: Extract sublist/substring. Ex:`(@@ "12345" 1 3)`→"23".
- **@@@,atshape**: Access flat list by shape. Ex:`(@@@ fv (3 4 5) 1 2 3)`→33.
- **and,or,xor,not**: Boolean ops. Ex:`(and (< 10 100) (>= 10 10))`→true.
- **apply**: Apply fn to args. Ex:`(apply '+ '(1 2 3 4))`→10.
- **atomp,stringp,numberp,zerop,emptyp**: Type checks. Ex:`(atomp 'e)`→true.
- **break**: Exit loop.
- **car,cdr,cadr**: List access. Ex:`(car '(1 2 3))`→1.
- **catch,maybe**: Error handling. Ex:`(maybe (catch (cons 'a)))`.
- **check,ncheck**: Conditional exec. Ex:`(check (< k 100) (+= k 1))`.
- **clone**: Clone container/string.
- **complex,real,imaginary**: Complex ops. Ex:`(complex 10 -3)`→10,-3i.
- **cond,switch**: Multi-branch. Ex:`(cond ((< x 10) "small") (true "large"))`.
- **cons,consb**: Build lists. Ex:`(cons 'a '())`→(a).
- **count,find,in**: Search/count. Ex:`(find "abcdef" "bc")`→1.
- **cutlist,slice**: Slice list/string. Ex:`(slice '(a b c d) 2)`→((a b)(c d)).
- **data,defmacro,defun,defpat,defpred**: Define structures,macros,fns,patterns,predicates.
- **dictionary,key**: Create/access dicts. Ex:`(dictionary "a" "e")`.
- **droplist,filterlist,maplist,mapcar**: List ops. Ex:`(filterlist '(< _ 10) '(1 4 5 10))`→(1 4 5).
- **enum**: Pair indices/elements. Ex:`(enum '(a b c))`→((0 a)(1 b)(2 c)).
- **eq,neq**: Equality checks.
- **eval**: Eval code. Ex:`(eval "(cons 'a '(1 2))")`→(a 1 2).
- **explode**: String to atoms. Ex:`(explode "abcd")`→(a b c d).
- **flatten**: Flatten list. Ex:`(flatten '((1 2)(3 4)))`→(1 2 3 4).
- **float,integer,number**: Type conversions.
- **flip**: Swap args/dict keys/values. Ex:`(flip (- 10 2))`→-8.
- **heap**: Sorted heap. Ex:`(heap '>=< 10 20 30)`→(10 20 30).
- **if,ife**: Conditional. Ex:`(if (eq x 10) 'true 'false)`.
- **insert,push,pop**: List mods. Ex:`(insert '(1 2 3) 4 1)`→(1 4 2 3).
- **join**: List to string. Ex:`(join '(a b c) '/')`→"a/b/c".
- **lambda**: Anon fn.
- **last**: Last element. Ex:`(last '(1 2 3))`→3.
- **let**: Local vars. Ex:`(let ((x 1)) (+ x 2))`→3.
- **list,llist,to_list**: Create/convert lists. Ex:`(llist 10 20 30)`.
- **load**: Load file. Ex:`(load "file.lisp")`.
- **loop,while**: Iterate. Ex:`(loop x '(1 2 3) (print x))`.
- **mask**: Conditional select. Ex:`(mask '(1 0 1) '(a b c) '(x y z))`→(a y c).
- **max,min**: Max/min elements. Ex:`(max '(1 4 5))`→5.
- **nconc**: Concat lists. Ex:`(nconc '(a b) '(c d))`→(a b c d).
- **print,println**: Output.
- **quote**: Prevent eval. Ex:`(quote (1 2 3))`→(1 2 3).
- **range**: Number seq. Ex:`(range 1 5 1)`→(1 2 3 4).
- **replaceall**: Replace all. Ex:`(replaceall '(1 2 1) 1 10)`→(10 2 10).
- **reverse,rotate (⌽)**: Reverse/rotate. Ex:`(rotate '(1 2 3))`→(3 1 2).
- **set,sets**: Create sets. Ex:`(sets "a" "b")`.
- **set@,set@@,set@@@**: Set container vals. Ex:`(set@ r 0 1 100)`.
- **setg,setq**: Var assign. Ex:`(setq x 10)`.
- **size,tally**: Container size. Ex:`(size '(1 2 3))`→3.
- **sort**: Sort list. Ex:`(sort '< '(3 1 2))`→(1 2 3).
- **string**: To string. Ex:`(string 123)`→"123".
- **swap**: Swap elements. Ex:`(swap '(1 2 3) 0 2)`→(3 2 1).
- **unique**: Remove dups. Ex:`(unique '(1 2 2 3))`→(1 2 3).
- **uuid**: Gen UUID. Ex:`(uuid)`→"80c67c4d-...".

### Haskell-Inspired Fns
**Note**: `map`,`filter`,`take`,`repeat`,`cycle`,`takewhile`,`drop`,`dropwhile`,`fold`,`scan` auto-compose into single loop. Ex:`(map '+ (map '* '(1 2 3)))`→single loop.
- **for**: Apply action. Ex:`(for i '(1 2 3 4) (* i i))`→(1 4 9 16).
- **map**: Apply op. Ex:`(map '(+ 1) '(1 2 3))`→(2 3 4).
- **filter**: Filter by cond. Ex:`(filter '(< 10) '(1 4 5 10 11))`→(1 4 5).
- **drop**: Drop n. Ex:`(drop 2 '(1 2 3 4))`→(3 4).
- **dropwhile**: Drop while cond. Ex:`(dropwhile '(< 10) '(1 3 5 10))`→(10).
- **take**: Take n. Ex:`(take 2 '(1 2 3))`→(1 2).
- **replicate**: Repeat n times. Ex:`(replicate 4 '(1 2))`→((1 2)(1 2)(1 2)(1 2)).
- **repeat**: Infinite repeat. Ex:`(take 3 (repeat 5))`→(5 5 5).
- **cycle**: Cycle list. Ex:`(take 5 (cycle '(1 2)))`→(1 2 1 2 1).
- **takewhile**: Take while cond. Ex:`(takewhile '(< 10) '(1 3 5 10))`→(1 3 5).
- **irange**: Infinite range. Ex:`(takewhile '(< 10) (irange 1 2))`→(1 3 5 7 9).
- **foldl,foldl1**: Left fold. Ex:`(foldl '- 10 '(1 2 3))`→4;`(foldl1 '- '(1 2 3))`→-4.
- **foldr,foldr1**: Right fold. Ex:`(foldr '- 10 '(1 2 3))`→8.
- **scanl,scanl1**: Left scan. Ex:`(scanl '- 10 '(20 30))`→(10 -10 -40).
- **scanr,scanr1**: Right scan. Ex:`(scanr '+ 0 '(3 5))`→(8 5 0).
- **zip**: Combine lists. Ex:`(zip '(1 2) '(3 4))`→((1 3)(2 4)).
- **zipwith**: Apply op to zipped. Ex:`(zipwith '+ '(1 2) '(3 4))`→(4 6).
- **!**: Prevent compose. Ex:`(!map '* (scanl1 '+ '(10 20)))`→(100 900).

### APL-Inspired Ops
- **transpose (⍉)**: Transpose matrix. Ex:`(⍉ (rho 3 4 (iota 5)))`→((1 5 4)(2 1 5)(3 2 1)(4 3 2)).
- **scan (\\)**: Apply op to sublists. Ex:`(\\ '+ '(1 2 3))`→(1 3 6).
- **backscan (⍀,-\\)**: Apply op from end. Ex:`(⍀ '- '(1 2 3))`→(3 1 0).
- **reduce (//)**: Reduce with op. Ex:`(// '+ '(1 2 3))`→6.
- **backreduce (⌿,-//)**: Reduce from end. Ex:`(-// '- '(1 2 3))`→0.
- **iota,iota0 (⍳,⍳0)**: Consecutive vals. Ex:`(iota 3)`→(1 2 3);`(iota0 3)`→(0 1 2).
- **rho (⍴)**: Size/reshape. Ex:`(⍴ 3 3 (iota 4))`→((1 2 3)(4 1 2)(3 4 1)).
- **outer product (°)**: Apply op to pairs. Ex:`(° '* '(2 3) '(1 2))`→((2 6)(3 9)).
- **inner product (.)**: Apply ops to matrices. Ex:`(. '+ '* '(1 2 3) '(4 5 6))`→32.
- **numerical boolean (==)**: Compare to 0/1. Ex:`(== '(1 2 3) '(1 5 3))`→(1 0 1).
- **concatenate (,)**: Flatten/concat. Ex:`(, (iota 3 3))`→(1 2 3 1 2 3).
- **member (∈)**: Check membership. Ex:`(∈ (rho 3 3 (iota 9)) '(1 3))`→((1 0 1)(0 0 0)(0 0 0)).
- **rank (⍤),irank**: Sub-matrix by coords. Ex:`(rank m 1)`→sub-matrix.
- **determinant**: Matrix determinant.
- **ludcmp,lubksb**: LU decomp,solve linear eqs. Ex:`(lubksb m idx)`→inverted matrix.
- **invert,solve (⌹)**: Matrix inversion,linear solve. Ex:`(invert (rho 2 2 (iota 4)))`→((-2 1)(1.5 -0.5)).

### LispE: Pattern Matching & Logic
LispE, a modern Lisp by Naver, excels with `defpat`,`defmacro`,`defpred`, blending pattern matching and logic programming. Compared to Common Lisp, Scheme, Clojure, it’s more expressive.
#### `defpat`: Pattern Matching
Polymorphic fns via patterns, incl. Kleene (`+`,`*`,`%`).
**Ex (FizzBuzz):**
```lisp
(defun checkmod (v d) (eq (% v d) 0))
(defpat fizzbuzz ([integer_ (checkmod x 15)]) 'fizzbuzz)
(defpat fizzbuzz ([integer_ (checkmod x 3)]) 'fizz)
(defpat fizzbuzz ([integer_ (checkmod x 5)]) 'buzz)
(defpat fizzbuzz (x) x)
(mapcar 'fizzbuzz (range 1 15 1))
```
Out:`(1 2 fizz 4 buzz fizz 7 8 fizz buzz 11 fizz 13 14 fizzbuzz)`.
**Ex (Kleene):**
```lisp
(defpat collect-small ([(< x 10)+ $ rest]) (println "Collected:" x) x)
(defpat collect-small (lst) (println "No small:" lst) '())
(collect-small '(5 8 12 3 15))
```
Out:`Collected: (5 8) (5 8)`.
- **Common Lisp**: CLOS, manual logic. Ex:`(defmethod fizzbuzz ((x integer)) (cond ...))`.
- **Scheme**: Explicit conditionals. Ex:`(define (fizzbuzz x) (cond ...))`.
- **Clojure**: Multimethods, less concise. Ex:`(defmulti fizzbuzz ...)`.
`defpat` embeds conditions/sequences, reducing logic.
#### `defmacro`: Pattern-Based Macros
Uses patterns,`$` for flexible syntax.
**Ex:**
```lisp
(defmacro tang (('< x y) $ z) (loop x (range 0 y 1) $ z))
(defmacro tang (('> x y) $ z) (loop x (range y 0 -1) $ z))
(tang (< x 5) (println (* 2 x)))
```
Expands to upward loop.
- **Common Lisp**: Manual destructuring. Ex:`(defmacro tang (dir &rest body) ...)`.
- **Scheme**: Hygienic macros, less streamlined. Ex:`(define-syntax tang ...)`.
- **Clojure**: Manual parsing. Ex:`(defmacro tang [[op x y] & body] ...)`.
`$` and patterns simplify macros.
#### `defpred`: Predicate Logic with Backtracking
Instructions as Boolean tests; failure triggers backtracking.
**Ex:**
```lisp
(defpred teste ([]) true)
(defpred teste ([a $ b]) (< a 10) (println a) (teste b))
(defpred teste (l) (println "Stop" l))
(teste '(1 2 11 12 13))
```
Out:`1 2 Stop (11 12 13)`. Steps:
- `a=1`: `(< 1 10)` true, prints 1, recurses.
- `a=2`: `(< 2 10)` true, prints 2, recurses.
- `a=11`: `(< 11 10)` false, backtracks to `(println "Stop" ...)`.
- **Common Lisp**: Manual recursion. Ex:`(defun teste (lst) (cond ...))`.
- **Scheme**: No backtracking. Ex:`(define (teste lst) (if ...))`.
- **Clojure**: Explicit flow. Ex:`(defn teste [lst] (cond ...))`.
`defpred` adds logic programming.
#### Why LispE Stands Out
- **Pattern Matching**: `defpat`,`defmacro` reduce boilerplate.
- **Macro Power**: `$` enhances modularity.
- **Logic**: `defpred` adds backtracking.

### Formalism
#### Compiling
Programs compile to list with `__root__` as top fn. Ex:
```lisp
(setq v (iota 10))
(println (car v))
```
Compiles:`(__root__ (setq v (iota 10)) (println (car v)))`. Access via `_root`.
#### Composition (.)
Composes fns, reduces parens. Ex:
```lisp
(filterlist (\(x) (< x 10)) . maplist (\(x) (* 2 x)) (iota 10))
```
Vs:`(filterlist (\(x) (< x 10)) (maplist (\(x) (* 2 x)) (iota 10)))`.
Multiple:`(sqrt . sum . iota 10)`→7.4162.
With `flip`:`(flip . / 5 . car '(1))`→0.2.
#### Strings
- **Regular**: `"..."` with `\` escape (`\n`,`\r`,`\t`). Ex:`(setq s "This and that")`.
- **Long**: `` `...` `` for complex. Ex:`(setq s `This " and "`)`.
- **Byte**: UTF-8, via `b"..."` or `stringbyte`. Ex:`(setq s b"test")`, `(string s)`→Unicode.
#### Auto Parentheses
`]` auto-closes parens. Ex:`(setq x (cons 'e '(])`→`(cons 'e '())`.
#### Dictionaries {k:v ...}
String/int/num-indexed (std::unordered_map). Ex:
```lisp
(setq d {12:45 45:67}) ; num
(setq d {"a":2 "b":10}) ; str
```
Use `dictionary`,`key`,`keyi`,`keyn`. Delayed eval allows vars.
#### Data Dicts @{k:v ...}
Compiled str-indexed. Ex:`(setq d @{"a":2 "b":10})` ; no vars.
#### Trees
Sorted (std::map). Ex:`(setq tr (dictionarytree "a" 1 "b" 2))`→`{"a":1 "b":2}`.
#### Sets {v1 v2 ...}
Str/int/num. Ex:`(setq st {1 2 3})` ; `(in st 2)`→true.
#### Heaps
Ordered via op/lambda. See `heap`.
#### Types
- **shorts,floats,numbers,integers,strings**: No ref counting. Ex:`(numbers '(1 2 3))`.
- **Complex**: `(complex real imag)` or `real,imagi`. Ex:`(setq c 12.23,i)` ; `(+ c 0,i)`→12.23,2i.
- **Matrices**: Via `matrix_[type]` or `rho`. Ex:`(matrix_integer 2 3 1)`→((1 1 1)(1 1 1)).
- **Tensors**: Multidim matrices. Ex:`(rho 2 3 3 (iota 18))`→tensor_integer.
### (type v): returns:
string_, stringbyte_, number_, float_, floats_, numbers_, integer_, complex_, short_, strings_, integers_, stringbytes_, shorts_, list_, llist_, matrix_number_, matrix_float_, matrix_integer_, matrix_short_, matrix_string_, matrix_stringbyte_, tensor_number_, tensor_stringbyte_, tensor_string_, tensor_float_, tensor_integer_, tensor_short_, data_, dictionary_, dictionaryjson_, dictionary_n_, dictionary_i_, dictionarytree_, dictionarytree_n_, dictionarytree_i_, set_s_, set_n_, set_i_, set_, atom_, heap_, maybe_, error_. 

#### Default & Variadic Fns
- **Default**: Lists with defaults. Ex:`(defun test (i (j -2)) (+ i j))` ; `(test 10)`→8.
- **Variadic**: Last param `(() l)`. Ex:`(defun test (x y (() l)) (println x y l))` ; `(test 10 20 30 45)`→10 20 (30 45).
#### Predefined Vars
- `_args`: Cmd-line args.
- `_current`: File path.
- `_pi(3.14159)`,`_tau(2*_pi)`,`_e(2.71828)`,`_phi(1.61803)`.
#### Ops
- **Infix**: Math in infix. See [Infix](https://github.com/naver/lispe/wiki/5.1-Operators#infix).

### Strings
- **Trim**:`trim0(str)`: Remove '0'. Ex:`(trim0 "100")`→"1".`trim(str)`: Spaces. Ex:`(trim " hi ")`→"hi".`trimleft/right(str)`: Left/right spaces.
- **Checks**:`vowelp,consonantp`: Vowels/consonants.`lowerp,upperp`: Case.`alphap,digitp,punctuationp`: Alpha/digits/punct.
- **Transform**:`lower,upper`: Case. Ex:`(lower "Hi")`→"hi".`deaccentuate`: Remove accents.`replace(str fnd rep [index])`: Replace. Ex:`(replace "hello" "l" "x")`→"hexxo".
- **Format**:`format(str e1..e9)`: Replace %1-%9. Ex:`(format "It is %1" "nice")`→"It is nice".`f_(frm)`: F-string `{expr}`. Ex:`(f_ "A={a}" [a 10])`→"A=10".
- **Pad**:`fill(c nb)`: Repeat c. Ex:`(fill "x" 3)`→"xxx".`padding(str c nb)`: Pad to nb.
- **Base**:`convert_in_base(val base [from])`: Convert base. Ex:`(convert_in_base 36 2)`→"100100";`(convert_in_base "100100" 2 true)`→36.
- **Substr**:`left/right(str nb)`: Nb chars. Ex:`(left "hello" 2)`→"he".`middle(str pos nb)`: From pos.`split/splite(str fnd)`: Split (splite keeps empty). Ex:`(split "a,b" ",")`→("a" "b").`segment/segment_e(str [point])`: Tokenize (point: 0=.,1=,,2=both). Ex:`(segment "10.5 beer")`→("10.5" "beer").`ngrams(str nb)`: Nb-grams.`getstruct(str o c [pos])`: Extract struct. Ex:`(getstruct "{[a]}" "[" "]")`→("[a]" 1 3).
- **Unicode**:`ord(str)`: Codes. Ex:`(ord "a")`→(97).`chr(nb)`: Char. Ex:`(chr 97)`→"a".
- **Distance**:`editdistance(str1 str2)`: Edit dist.
#### `segment` Note
- `point`: 0(.,default),1(,),2(both). Ex:`(segment "10.5 beer" 1)`→("10" "." "5" "beer");`(segment "10,5 beer" 1)`→("10,5" "beer").
#### `getstruct` Note
Extracts balanced structs. Returns (substr,start,end) or `nil`. Ex:`(setq r "{[a]}") (getstruct r "[" "]")`→("[a]" 1 3). Use `json_parse` for LispE structs.

### JSON
- `json(elem)`: To JSON str.
- `json_parse(str)`: Parse JSON.
- `json_read(file)`: Read JSON file.

### Rule Tokenization
Custom rules via handlers:`tokenizer_main`(LispE code),`segmenter`(for `segment`),`tokenizer`(copy). Ex:
```lisp
(setq h (tokenizer))
(tokenize h "The lady, $345.5") ; →("The" "lady" "," "$" "345.5")
```
- **Rule Mgmt**:`get/set_tokenizer_rules(h)`: Get/set rules.`tokenizer_display(rules)`: Show automata.`get/set_tokenizer_operators(rules)`: Manage %o ops.
#### Rules
`body=action`(action:num/#,unused). Types:
- **Char**: Start with char. Ex:`!=0`.
- **Metarules**: `c:expr`. Ex:`1:{%d #A-F}`(hex).
**Formalism**:
- `x`: Match char.
- `#x`,`#x-y`: Char/code range.
- `%x`: Meta(? any,%a alpha,%d digit,%p punct,etc.).
- `(...)`: Optional seq.
- `[...]`/{...}: Char/meta disjunction.
- `*`,`+`: Repeat 0+/1+.
- `-`: Recognize, don’t store.
- `~...`: Exclude.
Ex:
```lisp
1:{%d #A-F} ; hex
0x%1+(.%1+)=3 ; hex num
%d+(.%d+)=3 ; dec num
```
**Note**: Specific rules first; no spaces except in disjunctions.

### Regular Expressions
LispE offers POSIX and custom regex.
#### POSIX Regex
- `prgx(exp [str])`: Create regex.
- `prgx_find(exp str [pos])`: Find substr.
- `prgx_findall(exp str [pos])`: Find all.
- `prgx_find_i/findall_i(exp str [pos])`: Find positions.
- `prgx_match(exp str)`: Check match.
- `prgx_replace(exp str rep)`: Replace.
- `prgx_split(exp str)`: Split.
**Ex:**
```lisp
(setq r (prgx `\w+`))
(prgx_match r "ABCD") ; →true
(prgx_find r "This is a test: 123A here") ; →"This"
(prgx_findall r "This is a test: 123A and 45T and 67U here") ; →("This" "is" "a" "test" "123A" "and" "45T" "and" "67U" "here")
```
#### LispE Regex
- `rgx(exp [str])`: Create regex.
- `rgx_find/findall(exp str [pos])`: Find substr/all.
- `rgx_find_i/findall_i(exp str [pos])`: Find positions.
- `rgx_match(exp str)`: Check match.
- `rgx_replace(exp str rep)`: Replace.
- `rgx_split(exp str)`: Split.
**Syntax**:
- `%d`: Num, `%x`: Hex, `%p`: Punct, `%c/%C`: Lower/uppercase, `%a`: Letter, `%h`: Greek, `%H`: Asian, `?`: Any, `%s`: Space, `%r`: CR, `%n`: Non-break space.
- `~`: Negate, `\x`: Escape, `\ddd`: 3-digit code, `\xFFFF`: 4-hex code.
- `{...}`: Disjunction, `{a-z}`: Range, `^`: Start, `$`: End.
**Ex:**
```lisp
(setq r (rgx "%d+%C"))
(rgx_match r "123A") ; →true
(rgx_find r "This is a test: 123A here") ; →"123A"
(rgx_findall r "This is a test: 123A and 45T and 67U here") ; →("123A" "45T" "67U")
```
