# PREDIBAG BasAIc Language Reference

## Overview

**BasAIc** is a high-level scripting language available in PREDIBAG (Tamed Agents). It is **transpiled to LispE** — it provides a familiar imperative syntax while leveraging the full power of the LispE interpreter running in WebAssembly.

Every BasAIc program is parsed into an abstract syntax tree, then transformed into equivalent LispE code. This means all LispE functions, types, and capabilities are accessible from BasAIc, simply with a different syntax.

**BasAIc** stands for: *Basic Artificial Intelligence code.*

### Two Writing Styles

BasAIc can be written in two styles:

- **Style BasAIc** — with explicit closing keywords (`endif`, `endfunction`, `endfor`, etc.):

```basic
function factorial(n)
    if n == 1 then
        return 1
    else
        return n * factorial(n - 1)
    endif
endfunction
```

- **Style Pythonic** — with indentation and `:` to delimit blocks, without closing keywords:

```python
def factorial(n):
    if n == 1:
        return 1
    else:
        return n * factorial(n - 1)
```

Both styles produce the same LispE code. See the section [Pythonic Style](#pythonic-style) for more details.

### JavaScript ↔ BasAIc: Callback Serialization

In PREDIBAG, BasAIc code runs inside a WebAssembly interpreter, while the surrounding application is in JavaScript. When a BasAIc function is used as a **callback** (e.g. passed to `callchat`, `callchatsilent`, `calltool`, or `execute_when`), JavaScript calls it back with its arguments **serialized as base64-encoded JSON strings**. This means that every callback function receiving data from JavaScript must first decode that argument with `json_parse(atob(...))` before it can be used.

To handle this transparently for callback functions, BasAIc provides two families of function definitions:

- **`function` / `def`** — Standard function definition. If the function is used as a JavaScript callback, you must **manually** decode the first argument: `chat = json_parse(atob(chat))`.
- **`functionjs` / `defjs`** — JavaScript-interop function definition, **designed specifically for callbacks**. The decoding of the first argument is **automatic**: the transpiler injects `(setq arg (json_parse . atob arg))` as the very first instruction. Use this whenever your function is called back from JavaScript.

The same distinction applies to predicate rules: **`rule`** vs **`rulejs`**.

---

## Comments

```basic
REM This is a comment (must start at the beginning of a line)
```

Lines starting with `REM` (case-insensitive) are ignored by the transpiler.

---

## Variables & Assignment

### Simple Assignment

```basic
x = 10
name = "hello"
result = compute(x, 20)
```

Transpiles to `(setq x 10)`, `(setq name "hello")`, etc.

### Global Assignment

```basic
a =: 1
```

The `=:` operator updates a global variable. Transpiles to `(setg a 1)`.

### Walrus Operator (`:=`)

The walrus operator assigns a value to a variable **and returns it**, allowing inline assignment within expressions — just like Python's `:=`.

```basic
if (a := 1) < 3 then
    println "a is", a
endif
```

Transpiles to:
```lisp
(if (< (setqv a 1) 3)
   (println "a is" a))
```

The walrus operator must be enclosed in parentheses `(variable := expression)`. It transpiles to `setqv`, which assigns and returns the value — enabling the surrounding expression (here `< 3`) to use the result directly.

### Type Instantiation

You can instantiate a typed variable directly:

```basic
ele = list(10, 20, 30)
x = float(10)
n = integer(3.7)
s = string(42)
```

Transpiles to `(setq ele (list 10 20 30))`, `(setq x (float 10))`, etc.

### Compound Assignment Operators

```basic
x += 10       REM x = x + 10
x -= 5        REM x = x - 5
x *= 2        REM x = x * 2
x /= 3        REM x = x / 3
x %= 4        REM x = x % 4
x ^= 2        REM x = x ^ 2
x <<= 1       REM x = x << 1
x >>= 1       REM x = x >> 1
x **= 3       REM x = x ** 3
x ^^= 3       REM x = x ^^ 3
x &= 0xFF     REM x = x & 0xFF
x |= 0x01     REM x = x | 0x01
```

Transpiles to `(+= x 10)`, `(-= x 5)`, etc.

---

## Data Types

BasAIc inherits all LispE types. The most commonly used are:

| BasAIc Syntax | LispE Type | Description |
|---|---|---|
| `10`, `-3` | `integer_` | Integer |
| `3.14`, `1e-5` | `number_` / `float_` | Floating-point number |
| `"hello"` | `string_` | String |
| `list(1,2,3)` | `list_` | General list |
| `integers(1,2,3)` | `integers_` | Typed integer list |
| `floats(1.0,2.0)` | `floats_` | Typed float list |
| `strings("a","b")` | `strings_` | Typed string list |
| `dictionary("k","v")` | `dictionary_` | String-keyed dictionary |

### List/Dictionary definitions

```basic
l = [20, 30, 40, 50]
d = {"a":2, "b":33}
```

Transpiles to `(setq l '(20 30 40 50))`. Creates a literal (quoted) list.
Transpiles to `(setq d (dictionary "a" 2 "b" 33))`. Creates a dictionary.

### Quoted Atoms

```basic
u = 'entrypoint
```

Transpiles to `(setq u (atom "entrypoint"))`. Used for referencing function names as values (callbacks).

---

## Operators

### Arithmetic

| BasAIc | LispE | Description |
|---|---|---|
| `a + b` | `(+ a b)` | Addition / String concatenation |
| `a - b` | `(- a b)` | Subtraction |
| `a * b` | `(* a b)` | Multiplication |
| `a / b` | `(/ a b)` | Division |
| `a % b` | `(% a b)` | Modulo |
| `a ^ b` | `(^ a b)` | Bitwise XOR |
| `a ** b` or `a ^^ b` | `(^^ a b)` | Power |
| `a << b` | `(<< a b)` | Left shift |
| `a >> b` | `(>> a b)` | Right shift |
| `a & b` | `(& a b)` | Bitwise AND |
| `a \| b` | `(\| a b)` | Bitwise OR |

### Comparison

| BasAIc | LispE | Description |
|---|---|---|
| `a == b` | `(= a b)` | Equality |
| `a <> b` | `(!= a b)` | Inequality |
| `a < b` | `(< a b)` | Less than |
| `a > b` | `(> a b)` | Greater than |
| `a <= b` | `(<= a b)` | Less than or equal |
| `a >= b` | `(>= a b)` | Greater than or equal |
| `x in y` | `(in y x)` | Membership test |

### Boolean

| BasAIc | LispE | Description |
|---|---|---|
| `a and b` | `(and a b)` | Logical AND |
| `a or b` | `(or a b)` | Logical OR |
| `a xor b` | `(xor a b)` | Logical XOR |

---

## Strings

Strings are enclosed in double quotes:

```basic
s = "hello world"
println s
```

String concatenation uses `+`:

```basic
result = "hello" + " " + "world"
```

All LispE string functions are available: `split`, `join`, `find`, `replace`, `trim`, `lower`, `upper`, `left`, `right`, `middle`, `ngrams`, `format`, etc.

---

## Container Access

### Indexed Access with `[]`

```basic
a = list(10, 20, 30, 40)
x = a[0]            REM first element → (at a 0)
y = a[-1]           REM last element → (at a -1)
```

Transpiles to `(at a 0)`, `(at a -1)`.

### Multi-key / Dictionary Access

```basic
chat[-1, "content"]       REM → (at chat -1 "content")
d["key"]                  REM → (at d "key")
```

Transpiles to `(at chat -1 "content")` — supports nested key access.

### Indexed Assignment

```basic
a[0] = 100                    REM → (set@ a 0 100)
prompts[-1, "content"] = s    REM → (set@ prompts -1 "content" s)
```

### Intervals (Slicing)

```basic
a[1:]         REM from index 1 to end    → (@@ a 1 0)
a[2:-2]       REM from index 2 to -2     → (@@ a 2 -2)
s[0: "/"]     REM from 0 up to "/"       → (@@ s 0 "/")
s["/":0]      REM from "/" to end         → (@@ s "/" 0)
```

Transpiles to `(@@ variable start end)` — the `extract` or `@@` function in LispE.

---

## Control Flow

### If / Then / Elif / Else / EndIf

```basic
if x > 10 then
    println "big"
else
    println "small"
endif
```

Transpiles to:
```lisp
(if (> x 10)
   (println "big")
   (println "small"))
```

The `else` clause is optional:

```basic
if x > 10 then
    println "big"
endif
```

Multiple instructions in `then` or `else` blocks are wrapped in a `block`:

```basic
if x > 10 then
    println "big"
    x = x - 1
else
    println "small"
    x = x + 1
endif
```

Transpiles to:
```lisp
(ife (> x 10)
   (block (println "big") (setq x (- x 1)))
   (setq x (+ x 1))
   (println "small"))
```

### Elif (Else If)

`elif` allows chaining multiple conditions without nesting `if` blocks:

```basic
if x > 100 then
    println "big"
elif x > 10 then
    println "medium"
else
    println "small"
endif
```

Transpiles to nested `if`/`ife`:
```lisp
(ife (> x 100)
   (println "big")
   (if (> x 10)
      (println "medium")
      (println "small")))
```

`elif` can be chained multiple times:

```basic
if x > 100 then
    println "A"
elif x > 50 then
    println "B"
elif x > 10 then
    println "C"
else
    println "D"
endif
```

### Combining Conditions

Conditions can combine comparisons with `and`, `or`, `xor`:

```basic
if x > 10 and y < 20 then
    println "match"
endif
```

A comparison term can also be a **standalone expression** (variable, function call, walrus expression) used as a truth value — no comparator needed:

```basic
if (a := compute()) and a > 0 then
    println "got:", a
endif
```

Transpiles to:
```lisp
(if (and (setqv a (compute)) (> a 0))
   (println "got:" a))
```

Here `(a := compute())` is a comparison term on its own (a walrus returning a value), combined with `a > 0` via `and`.

The `not` operator

```basic
if not "s" in u then
   println("No match)
endif
```

### While / EndWhile

```basic
while x < 100
    x += 1
    println x
endwhile
```

Transpiles to:
```lisp
(while (< x 100)
   (+= x 1)
   (println x))
```

### For-In / EndFor (Iteration)

```basic
for s in mylist
    println s
endfor
```

Transpiles to:
```lisp
(loop s mylist
   (println s))
```

The iterable can be any expression: a variable, a function call like `range(1, 10, 1)`, etc.

### For (C-style) / EndFor

```basic
for i = 0, i < 10, i = i + 1
    println i
endfor
```

Transpiles to:
```lisp
(block
   (setq i 0)
   (while (< i 10)
      (println i)
      (setq i (+ i 1))))
```

---

## Functions

### Function Definition

```basic
function factorial(n)
    if n == 1 then
        return 1
    else
        return n * factorial(n - 1)
    endif
endfunction
```

Transpiles to:
```lisp
(defun factorial (n)
   (if (= n 1)
      1
      (* n (factorial (- n 1)))))
```

Alternative keywords: `def` / `enddef` can be used instead of `function` / `endfunction`.

### JavaScript-Interop Functions (`functionjs` / `defjs`)

When a function is called from JavaScript (e.g. as a callback from `callchat` or `calltool`), its first argument is received as a **base64-encoded JSON string**. The `functionjs` keyword automatically decodes this first argument, so you don't need to do it manually.

```basic
functionjs entrypoint(chat)
    println "Phrase:", chat[-1, "content"]
    save_session()
endfunctionjs
```

Transpiles to:
```lisp
(defun entrypoint (chat)
   (setq chat (json_parse . atob chat))
   (println "Phrase:" (at chat -1 "content"))
   (save_session))
```

The system automatically inserts `(setq firstarg (json_parse . atob firstarg))` as the first instruction, where `firstarg` is the name of the first parameter.

Alternative keywords: `defjs` / `enddefjs` can be used instead of `functionjs` / `endfunctionjs`.

**Comparison: `function` vs `functionjs`**

With `function`, you must decode the argument yourself:

```basic
function entrypoint(chat)
    chat = json_parse(atob(chat))
    println chat[-1, "content"]
endfunction
```

With `functionjs`, the decoding is automatic:

```basic
functionjs entrypoint(chat)
    println chat[-1, "content"]
endfunctionjs
```

Both produce the same LispE code.

### Function Call

```basic
result = factorial(5)
println result
```

Transpiles to:
```lisp
(setq result (factorial 5))
(println result)
```

### Multi-argument Functions (print-style)

When a function name is followed by arguments without parentheses, it transpiles to a multi-argument call:

```basic
println "value:", x, y
```

Transpiles to `(println "value:" x y)`.

### Method Calls (dot notation)

```basic
a.push(10, 20, 30)
t = a.type()
```

Transpiles to:
```lisp
(push a 10 20 30)
(setq t (type a))
```

The object before the dot becomes the first argument of the method.

---

## Lambda Expressions

Lambda expressions require the `lambda` or `λ` keyword inside square brackets:

```basic
A = [lambda (x, y) if x > y then x + y else x * y endif](10, 20)
```

Or using the Unicode symbol:

```basic
A = [λ (x, y) if x > y then x + y else x * y endif](10, 20)
```

Transpiles to a lambda definition and immediate call:
```lisp
(setq A ((lambda (x y) (if (> x y) (+ x y) (* x y))) 10 20))
```

Lambda syntax: `[lambda (parameters) body]` or `[λ (parameters) body]`

Lambdas can also be passed to higher-order functions:

```basic
maplist([lambda (x) x * 2], mylist)
```

Transpiles to:
```lisp
(maplist (lambda (x) (* x 2)) mylist)
```

---

## List Comprehensions

BasAIc supports Python-style list comprehensions using square brackets:

```basic
B = [x * 2 for x in list(1, 2, 3, 4)]
```

Transpiles to:
```lisp
(setq B (mapcar (lambda (x) (* x 2)) (list 1 2 3 4)))
```

You can also add a filtering condition with `if`:

```basic
B = [x ** 2 for x in list(1, 2, 3, 4) if x % 2 == 0]
```

Transpiles to:
```lisp
(setq B (mapcar (lambda (x) (^^ x 2)) (filtercar (lambda (x) (= (% x 2) 0)) (list 1 2 3 4))))
```

**Syntax:** `[expression for variable in iterable]` or `[expression for variable in iterable if condition]`

- Without filter: transpiles to `(mapcar (lambda (var) expr) iterable)`
- With filter: transpiles to `(mapcar (lambda (var) expr) (filtercar (lambda (var) cond) iterable))`

---

## Rules (Predicate Functions)

```basic
rule checkvalue(x)
    x < 100
    println x
endrule
```

Transpiles to:
```lisp
(defpred checkvalue (x)
   (< x 100)
   (println x))
```

Rules use LispE's `defpred` mechanism: each instruction acts as a boolean test. If any test fails, the rule backtracks.

### JavaScript-Interop Rules (`rulejs`)

Just like `functionjs`, a `rulejs` automatically decodes the first argument received from JavaScript:

```basic
rulejs validate(data)
    data["status"] == "ok"
    println "Valid:", data["value"]
endrulejs
```

Transpiles to:
```lisp
(defpred validate (data)
   (setq data (json_parse . atob data))
   (= (at data "status") "ok")
   (println "Valid:" (at data "value")))
```

The automatic `(setq data (json_parse . atob data))` is inserted before the predicate instructions.

## Inserting a LispE expression in the code

You can insert a LispE expression directly into the code with the back quote.

```basic
r = `(+ 10 20)`
```

---

## PREDIBAG-Specific Functions

When BasAIc is used inside PREDIBAG (Tamed Agents), the following functions are available for agent programming:

### LLM Communication

| BasAIc | Description |
|---|---|
| `callchat(prompts, 'callback, ...)` | Send prompts to LLM, auto-display response in chat, call callback with updated chat. Up to 3 extra args forwarded. |
| `callchatsilent(prompts, 'callback, ...)` | Same but without displaying the response (background/parallel processing) |
| `calltool(toolname, data, 'callback)` | Call a custom JS tool function with data, then invoke callback |
| `call_mcp(server, tool, args, 'callback)` | Call an MCP server tool with arguments, then invoke callback |

### Chat Display

| BasAIc | Description |
|---|---|
| `push_message(msg)` | Display a message in the chat as an assistant bubble |
| `push_request(msg)` | Display a message in the chat as a user bubble |
| `add_to_chat(prompts, msg, display)` | Append a message to a prompt list, auto-detect role. If `display` is `true`, also shows in chat. If `false`, hidden from user but visible to LLM. |
| `input_chat(msg)` | Simulate a user message in a chat tab and trigger `entry(prompts)` |

### Chat Tabs

| BasAIc | Description |
|---|---|
| `getChatName()` | Return the name of the current Chat tab |
| `getChatValue(tab_name)` | Return the chat history of a specific tab as a list of dictionaries |
| `pushChatTab()` | Add a new chat tab and return its name |
| `getChatSize()` | Return the number of chat tabs |

### User Data Access

| BasAIc | Description |
|---|---|
| `getUserDataValue(idx)` | Read User Data by index (0 = Data 0) |
| `getUserData()` | Return all User Data values as a list |
| `getUserDataSize()` | Return the number of User Data tabs |
| `setUserDataValue(idx, val)` | Update a single User Data field by index |
| `setUserData(list)` | Set all User Data tabs at once from a list |
| `pushUserDataValue(val)` | Add a new User Data tab with the given value, returns tab name |

### Output Data Access

| BasAIc | Description |
|---|---|
| `getOutputDataValue(idx)` | Read Output field by index (0 = Out 0) |
| `getOutputData()` | Return all Output values as a list |
| `getOutputSize()` | Return the number of Output tabs |
| `setOutputDataValue(idx, val)` | Update a single Output field by index |
| `setOutputData(list)` | Set all Output tabs at once from a list |
| `pushOutputDataValue(val)` | Add a new Output tab with the given value, returns tab name |

### Images & PDFs (multimodal)

The **Images** panel is a single gallery holding both images and PDFs. Each entry has a 0-based index and a `name`; re-adding an item with an existing `name` (same kind) refreshes it rather than creating a duplicate.

| BasAIc | Description |
|---|---|
| `getImageSize()` | Return the number of images in the gallery |
| `getImageValue(idx)` | Return image `idx` as `{name, src, isUrl}` (`src` = data URL or http URL) |
| `getImageData()` | Return all images as a list of `{name, src, isUrl}` |
| `add_image_to_chat(chat, id_image, prompt?)` | Inject gallery image `id_image` into `chat` as a user message, with an optional text `prompt` |
| `getPdfSize()` | Return the number of stored PDFs |
| `getPdfValue(idx)` | Return stored PDF `idx` as `{name, src, isUrl}` |
| `getPdfData()` | Return all stored PDFs as a list of `{name, src, isUrl}` |
| `add_pdf_to_chat(chat, id_pdf, prompt?, mode?)` | Ingest a PDF stored in the PDFs section (by 0-based index) and append its content to `chat`; per page the backend sends extracted text or a rendered page image. `mode` = `auto` / `text` / `vision` |
| `load_pdf(source, mode?)` | Synchronously analyse a PDF and return a list of LLM content parts (text and/or `image_url`) without touching any chat. `mode` = `auto` / `text` / `vision` |

PDF ingestion relies on the backend `/pdf_ingest` endpoint (PyMuPDF): `text` extracts page text, `vision` renders each page to an image, `auto` decides per page.

### Web & External

| BasAIc | Description |
|---|---|
| `web_search(query, 'callback, max?)` | Search the web via DuckDuckGo, call callback with results |
| `fetch_page(url, 'callback)` | Fetch a URL, call callback with page content |
| `display_page(url)` | Render a URL in the Display zone |
| `open_html(html)` | Open an HTML string in a new browser tab |
| `clean_html(text)` | Strip HTML tags from a text string |
| `python(code)` | Execute Python code on the server |

### Display & Debug

| BasAIc | Description |
|---|---|
| `println(...)` | Print to Display zone |
| `clean_display()` | Clear the Display zone |

### Session & Files

| BasAIc | Description |
|---|---|
| `save_session()` | Save the current session |
| `store_session(path)` | Store the current session to a file on disk |
| `store_data(path, data)` | Store a string to a file on disk |
| `load_data(path)` | Load a file from disk and return its content |
| `getconfidential()` | Retrieve the content of the Confidential field |
| `getsecret()` | Retrieve the content of the Secret field |

### Scheduling & UI

| BasAIc | Description |
|---|---|
| `execute_when(ms, 'callback, data?)` | Schedule a delayed callback |
| `read_input(msg, 'callback)` | Open an input dialog, call callback with the response |
| `systemprompt()` | Build the full system prompt from prompts, skills and tools |

### Data Encoding & Parsing

| BasAIc | Description |
|---|---|
| `jsjson(data)` | Decode base64 JSON from JavaScript |
| `convertjs(data)` | Alias for `jsjson` |
| `json(data)` | Convert to JSON string |
| `json_parse(str)` | Parse a JSON string |
| `atob(str)` | Decode base64 |
| `btoa(str)` | Encode to base64 |
| `getstruct(str, open, close)` | Extract a balanced structure from a string |

---

## Transpilation Summary

| BasAIc | LispE |
|---|---|
| `x = value` | `(setq x value)` |
| `x =: value` | `(setg x value)` |
| `(x := value)` | `(setqv x value)` |
| `x[i] = value` | `(set@ x i value)` |
| `x += value` | `(+= x value)` |
| `x[i]` | `(at x i)` |
| `x[i, j]` | `(at x i j)` |
| `x[i:j]` | `(@@ x i j)` |
| `f(a, b)` | `(f a b)` |
| `x.method(a)` | `(method x a)` |
| `'name` | `(atom "name")` |
| `function f(x) ... endfunction` | `(defun f (x) ...)` |
| `functionjs f(x) ... endfunctionjs` | `(defun f (x) (setq x (json_parse . atob x)) ...)` |
| `rule f(x) ... endrule` | `(defpred f (x) ...)` |
| `rulejs f(x) ... endrulejs` | `(defpred f (x) (setq x (json_parse . atob x)) ...)` |
| `if c then ... else ... endif` | `(if c ... ...)` |
| `if c then ... elif c2 then ... endif` | `(if c ... (if c2 ...))` |
| `while c ... endwhile` | `(while c ...)` |
| `for x in lst ... endfor` | `(loop x lst ...)` |
| `for i=0, i<10, i=i+1 ... endfor` | `(block (setq i 0) (while (< i 10) ... (setq i (+ i 1))))` |
| `[lambda (x) body]` | `(lambda (x) body)` |
| `[expr for x in lst]` | `(mapcar (lambda (x) expr) lst)` |
| `[expr for x in lst if cond]` | `(mapcar (lambda (x) expr) (filtercar (lambda (x) cond) lst))` |
| `println x, y` | `(println x y)` |
| `a == b` | `(= a b)` |
| `a <> b` | `(!= a b)` |
| `a and b` | `(and a b)` |
| `a or b` | `(or a b)` |

---

## Complete Example

### BasAIc Code

Using `functionjs` for callbacks from JavaScript (automatic argument decoding):

```basic
functionjs entrypoint(chat)
    println "Phrase:", chat[-2, "content"]
    a = getstruct(chat[-1, "content"], "[", "]")
    println a[0]
    save_session()
endfunctionjs

clean_display()
idx = 0

functionjs entry(prompts)
    d = split(theuserdata[idx], "\n")
    for s in d
        if "/" in s then
            premier = s[0: "/"]
            second = s["/": 0]
            prompts[-1, "content"] = premier
            callchat(prompts, 'entrypoint)
        else
            prompts[-1, "content"] = s
            callchat(prompts, 'entrypoint)
        endif
    endfor
    idx += 1
endfunctionjs
```

### Transpiled LispE

```lisp
(defun entrypoint (chat)
   (setq chat (json_parse . atob chat))
   (println "Phrase:" (at chat -2 "content"))
   (setq a (getstruct (at chat -1 "content") "[" "]"))
   (println (at a 0))
   (save_session))

(clean_display)
(setq idx 0)

(defun entry (prompts)
   (setq prompts (json_parse . atob prompts))
   (setq d (split (at theuserdata idx) "\n"))
   (loop s d
      (ife (in s "/")
         (block
            (setq premier (extract s 0 "/"))
            (setq second (extract s "/" 0))
            (set@ prompts -1 "content" premier)
            (callchat prompts (atom "entrypoint")))
         (set@ prompts -1 "content" s)
         (callchat prompts (atom "entrypoint"))))
   (+= idx 1))
```

### Another Example: Types and Collections

```basic
g = [20, 30, 40, 50]
println(g)

l = list(100, 2000, 3000, "text")
l.push(10, 30, "\n", "abc", "def")
println l, 10, "Test"

a = integers()
a.push(10, 20, 30, 40, 60, 70, 50)
println a, a.type()

u = 'r
b = dictionary()
u = float(20)

b["constant"] = 100
println b, b["constant"], u, type(u), a[1:], a[2:-2]
```

### Lambda and Comprehension Examples

```basic
A = [λ (x, y) if x > y then x + y else x * y endif](10, 20)
println A

B = [x * 2 for x in list(1, 2, 3, 4)]
B = [x ** 2 for x in list(1, 2, 3, 4) if x % 2 == 0]
```

Transpiles to:
```lisp
(setq A ((lambda (x y) (if (> x y) (+ x y) (* x y))) 10 20))
(println A)

(setq B (mapcar (lambda (x) (* x 2)) (list 1 2 3 4)))
(setq B (mapcar (lambda (x) (^^ x 2)) (filtercar (lambda (x) (= (% x 2) 0)) (list 1 2 3 4))))
```

---

## Keywords Reference

### Control Structure Keywords
`function`, `endfunction`, `def`, `enddef`, `functionjs`, `endfunctionjs`, `defjs`, `enddefjs`, `rule`, `endrule`, `rulejs`, `endrulejs`, `if`, `then`, `elif`, `else`, `endif`, `for`, `endfor`, `while`, `endwhile`, `in`, `data`, `enddata`, `and`, `or`, `xor`, `not`, `return`, `lambda`, `λ`

### Built-in Functions
All LispE functions are accessible from BasAIc. Common ones include:
`println`, `print`, `type`, `size`, `push`, `pop`, `split`, `join`, `find`, `replace`, `trim`, `lower`, `upper`, `range`, `map`, `filter`, `sort`, `reverse`, `abs`, `sqrt`, `pow`, `min`, `max`, `json_parse`, `json`, `atob`, `btoa`, `getstruct`

### Operators
`:=` (walrus), `=:` (global assignment), `+=`, `-=`, `*=`, `/=`, `%=`, `^=`, `<<=`, `>>=`, `**=`, `^^=`, `&=`, `|=`

---

# Pythonic Style

BasAIc supports an alternative **Python-like syntax** where indentation defines blocks and `:` terminates block headers — removing the need for explicit closing keywords like `endif`, `endfunction`, etc.

This is the reason why `def`/`enddef` and `defjs`/`enddefjs` were introduced as alternative keywords for `function`/`endfunction` and `functionjs`/`endfunctionjs`.

### How It Works

When BasAIc is compiled in Pythonic mode (via `compilepython`), the transpiler automatically **injects closing tags** based on indentation level. A line ending with `:` opens a new block; the block ends when the indentation returns to the previous level.

For example, `def entrypoint(chat):` at indentation 0 with its body at indentation 4 will automatically get `enddef` injected when the indentation drops back to 0.

### Syntax Comparison

| Standard BasAIc | Pythonic BasAIc |
|---|---|
| `function f(x)` ... `endfunction` | `def f(x):` ... (indentation) |
| `functionjs f(x)` ... `endfunctionjs` | `defjs f(x):` ... (indentation) |
| `rule f(x)` ... `endrule` | `rule f(x):` ... (indentation) |
| `rulejs f(x)` ... `endrulejs` | `rulejs f(x):` ... (indentation) |
| `if cond then` ... `endif` | `if cond:` ... (indentation) |
| `while cond` ... `endwhile` | `while cond:` ... (indentation) |
| `for x in lst` ... `endfor` | `for x in lst:` ... (indentation) |
| `if cond then` ... `else` ... `endif` | `if cond:` ... `else:` ... (indentation) |
| `if cond then` ... `elif` ... `endif` | `if cond:` ... `elif cond2:` ... (indentation) |

### Pythonic Example

```python
def entrypoint(chat):
    chat = jsjson(chat)
    println "Phrase:", chat[-1, "content"]
    a = getstruct(chat[-1, "content"], "[", "]")
    println a[0]
    save_session()

clean_display()
idx = 0

def entry(prompts):
    prompts = json_parse(atob(prompts))
    d = split(theuserdata[idx], "\n")
    for s in d:
        if "/" in s:
            premier = s[0: "/"]
            second = s["/": 0]
            prompts[-1, "content"] = premier
            callchat(prompts, 'entrypoint)
        else:
            prompts[-1, "content"] = s
            callchat(prompts, 'entrypoint)
    idx += 1
    if idx < 3:
        execute_when(20000, name("entry"), prompts.json())
```

This is equivalent to the following standard BasAIc:

```basic
def entrypoint(chat)
    chat = jsjson(chat)
    println "Phrase:", chat[-1, "content"]
    a = getstruct(chat[-1, "content"], "[", "]")
    println a[0]
    save_session()
enddef

clean_display()
idx = 0

def entry(prompts)
    prompts = json_parse(atob(prompts))
    d = split(theuserdata[idx], "\n")
    for s in d
        if "/" in s then
            premier = s[0: "/"]
            second = s["/": 0]
            prompts[-1, "content"] = premier
            callchat(prompts, 'entrypoint)
        else
            prompts[-1, "content"] = s
            callchat(prompts, 'entrypoint)
        endif
    endfor
    idx += 1
    if idx < 3 then
        execute_when(20000, name("entry"), prompts.json())
    endif
enddef
```

### Using `defjs` in Pythonic Style

The `defjs` keyword works the same way — with automatic first-argument decoding and indentation-based blocks:

```python
defjs entrypoint(chat):
    println "Phrase:", chat[-1, "content"]
    save_session()

defjs entry(prompts):
    d = split(theuserdata[idx], "\n")
    for s in d:
        if "/" in s:
            prompts[-1, "content"] = s[0: "/"]
            callchat(prompts, 'entrypoint)
        else:
            prompts[-1, "content"] = s
            callchat(prompts, 'entrypoint)
```

### Rules

- Indentation must be **consistent** within a block (spaces or tabs).
- A `:` at the end of a line signals a block opening.
- `else:` must be at the same indentation level as its matching `if`.
- Comments (`REM` or `#`) and empty lines are skipped during indentation analysis.
- Lines at the top level (indentation 0) that don't end with `:` are executed as standalone statements.
