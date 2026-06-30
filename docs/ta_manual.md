# Tamed Agents — Developer Manual

## You Already Know This

If you've ever written a bot for Slack or Discord, you already know how Tamed Agents works.

A Discord bot has an `on_message` handler. Every message from every user flows through it. You look at the content, decide what to do — run a command, call an API, query a database, or just respond. The infrastructure (WebSockets, message queuing, authentication) is absorbed by the platform. You write business logic.

Tamed Agents is the same model, but your bot talks to an LLM instead of a weather API.

```
Discord:   on_message(msg) → parse → dispatch → call API → callback → channel.send
Slack:     on_event(event) → parse → dispatch → call API → callback → post_message
TA:        entry(prompts)  → parse → dispatch → callchat → callback → push_message
```

You write one function called `entry`. Every message the user types flows through it. You decide what happens — forward to the LLM, trigger a web search, process a command, or respond directly. The infrastructure (WebAssembly runtime, async dispatch, LLM communication, prompt management) is absorbed by the platform. You write business logic.

That's Tamed Agents. If you can write a bot handler, you can write an AI agent.

## What Makes It Different

Tamed Agents operates in the same space as LangGraph, CrewAI, and OpenAI's function calling — building agents that use large language models to accomplish tasks. The difference is architectural.

In most frameworks, the LLM is the orchestrator. You give it tools, and it decides what to call and when. Safety comes from prompt instructions — you tell the LLM not to do harmful things and hope it complies. And the developer writes a significant amount of infrastructure code: state schemas, graph definitions, conditional edges, orchestration configuration.

TA inverts this. The LLM is a powerful but **contained component** — it produces text when asked, nothing more. Your code decides what happens. Every external action — web search, API call, file access — passes through your `entry` function and the callbacks you define. Safety isn't a prompt instruction; it's enforced by the code itself, through deterministic rules (`rulejs`) that the LLM cannot bypass.

The result: **you write business rules, not infrastructure.** No threading libraries, no state management frameworks, no orchestration boilerplate. Just a message handler and the logic that makes your agent useful.

And just like Discord bots are shared as scripts you install on a server, TA agents are shared as **session files** — single JSON files you send to a colleague, they load it, and it runs.

---

## The Session File

Everything in TA lives in a **session** — a single JSON file that contains:

- **System prompts**: who the agent is and how it behaves
- **Skills**: domain knowledge described in natural language
- **Tools**: descriptions of external capabilities the agent can use
- **User Data**: reference data, configuration, datasets
- **Agent code**: the Pythonic logic that controls the agent's behavior
- **Output slots**: persistent storage for results
- **LLM configuration**: server, model, generation parameters

A session is self-contained, portable, and auditable. You can hand someone a JSON file and they can read the system prompt, inspect every safety rule, verify which tools are declared, check what data the agent accesses, and trace the full control flow. No hidden state, no implicit permissions.

To share a workflow with a colleague, you share the session file. They open it, connect to the same LLM server (the connection details are in the file), and they're running. It's the same gesture as adding a bot to a Discord server — except the bot is an AI agent, and the "server" is the TA platform.

---

## The Execution Model

### `entry` — Where Everything Begins

Just like a Discord bot's `on_message` handler, TA has one mandatory function that receives everything:

```python
defjs entry(prompts):
   # prompts is the full chat history as a list of {role, content} dicts
   # prompts[0] is always the system prompt
   # prompts[-1] is the user's latest message
   msg = prompts[-1]["content"]
   # ... decide what to do
```

Every time the user types something in the chat window, the platform rebuilds the complete prompt list from the chat window content — system prompt plus all visible messages — and passes it to `entry`.

`entry` is a **command dispatcher**, not a chat handler. Just like a Discord bot that handles `!search`, `!play`, `!help` alongside regular conversation, your `entry` function decides what each input means:

- A message to forward to the LLM
- A keyword that triggers a web search
- A command like "Go 5" that processes a data record
- A configuration directive
- Anything else you decide to handle

The agent code in `entry` decides what each input means. The LLM is just one of many possible destinations.

### Talking to the LLM

In a Discord bot, you call an external API and handle the response in a callback. In TA, the LLM is your external API. Two functions send prompts to it:

**`callchat(prompts, 'callback', ...)`** sends the prompt list to the LLM and **automatically displays the response in the chat window**. Then it calls your callback function with the updated chat.

**`callchatsilent(prompts, 'callback', ...)`** does the same but **does not display the response**. The result goes only to your callback. Use this for background processing, intermediate analysis steps, or parallel operations where you don't want to flood the chat.

This distinction matters: what appears in the chat window becomes part of the prompt on the next cycle, because the platform rebuilds prompts from the chat content. `callchat` modifies the conversational state; `callchatsilent` doesn't.

### The Minimal Agent

The simplest possible agent forwards everything to the LLM:

```python
defjs entry(prompts):
   callchat(prompts, 'entrypoint')

defjs entrypoint(chat):
   println chat[-1,"content"]
```

`entry` sends the full prompt list to the LLM. `callchat` displays the response in the chat. `entrypoint` prints the response to the Display zone. Three lines, and you have a working chatbot.

The name `entrypoint` is just a convention — you can name your callback anything. It's a regular function, not a platform keyword.

### The Chat Window as Source of Truth

The chat window is both an I/O surface and the prompt's persistent state. Several functions modify what appears in the chat:

**`push_message(msg)`** displays text as an assistant message. It becomes part of the prompt history — the LLM will see it in future turns.

**`push_request(msg)`** displays text as a user message. The LLM will see it as if the user said it. This lets the agent inject user-role messages into the conversation programmatically.

**`add_to_chat(prompts, msg, display)`** appends a message to a prompt list, auto-detecting the role based on the last message. The `display` parameter controls visibility:
- `true`: the message appears in the chat window and becomes part of the persistent prompt
- `false`: the message is added to the prompt list but **not displayed** — hidden context that the LLM sees but the user doesn't

This last pattern is important. You can inject reference data, instructions, or context into a prompt without cluttering the user's conversation:

```python
defjs entry(prompts):
   # Build a fresh prompt from just the system prompt
   fresh = [prompts[0]]
   # Inject hidden context
   context = getUserDataValue(0)
   add_to_chat(fresh, "Reference data: " + context, false)
   # Add the user's message
   add_to_chat(fresh, prompts[-1]["content"], false)
   # Send to LLM — it sees the context, the user doesn't
   callchat(fresh, 'entrypoint')
```

---

## Callbacks and Async Operations

### How Callbacks Work

All external operations in TA are asynchronous. `callchat`, `callchatsilent`, `web_search`, `fetch_page`, `call_mcp` — each takes a **callback name as a single-quoted string**:

```python
web_search("climate change", 'on_results', 5)
```

When the operation completes, the platform calls your function `on_results` with the result.

**Important**: callbacks must always be single-quoted strings: `'on_results'`. Never use double quotes or bare identifiers for callback names.

### Forwarding Extra Arguments

You can pass up to three extra arguments through a callback chain:

```python
callchat(prompts, 'next_step', idx, extra_data)
```

Your callback receives them after the main result:

```python
defjs next_step(chat, idx, extra_data):
   # chat is the LLM response
   # idx and extra_data were forwarded from the original call
```

This is how you thread state through multi-step pipelines without using global variables.

### Multi-Step Pipelines

Callbacks can chain — each step processes a result and dispatches the next operation:

```python
defjs entry(prompts):
   idx = integer(prompts[-1]["content"][3:])
   d = theuserdata[idx].trim().json_parse()
   fresh = [prompts[0]]
   add_to_chat(fresh, "Analyze: " + d["data"].json(), false)
   callchat(fresh, 'step2', idx)

defjs step2(chat, idx):
   # First LLM response is in the chat. Build a follow-up.
   msg = "Now generate five variations."
   add_to_chat(chat, msg, true)
   callchat(chat, 'step3', idx)

defjs step3(chat, idx):
   # Collect both responses and store
   first = chat[-3]["content"]
   second = chat[-1]["content"]
   result = first + "\n\n---\n\n" + second
   setOutputDataValue(idx, result)
```

---

## Parallelism Without Pain

This is one of TA's most distinctive features. You get genuine parallel execution with no threads, no locks, no race conditions, and no complex async/await patterns.

### How It Works

Under the hood, TA compiles Pythonic code to LispE, which runs as WebAssembly in the browser. All async operations (LLM calls, web searches, API calls) are dispatched as JavaScript Promises. The browser's event loop runs them concurrently. When each Promise resolves, the corresponding callback executes in LispE. Since the event loop is single-threaded, callbacks always run one at a time — parallel I/O, sequential processing, zero synchronization overhead.

As a developer, you don't need to know any of this. You just write multiple calls:

```python
defjs entry(prompts):
   msg = prompts[-1]["content"]
   callchatsilent([{"role":"user","content":"Extract entities: " + msg}], 'on_entities')
   callchatsilent([{"role":"user","content":"Analyze sentiment: " + msg}], 'on_sentiment')
   callchatsilent([{"role":"user","content":"Summarize: " + msg}], 'on_summary')
```

Three lines. Three parallel LLM calls. They execute concurrently on the network and their callbacks fire as results arrive. No threading library, no task queue, no state management framework.

### Why It's Safe

In traditional multi-threaded programming, parallel code is dangerous because two threads can modify the same data simultaneously, causing race conditions, deadlocks, and data corruption. Languages like Python need a Global Interpreter Lock (GIL) to prevent this, which limits true parallelism.

TA eliminates these problems architecturally:

- **No shared mutable state between concurrent operations**: each callback runs to completion before the next one starts (event loop guarantee)
- **No GIL**: there's nothing to lock, because two pieces of code can never run at the same time
- **No garbage collector**: memory is managed deterministically through reference counting, with no unpredictable pauses
- **No deadlocks**: no locks exist to deadlock on

You get the benefits of concurrent I/O without any of the hazards of concurrent code execution.

### Synchronization Patterns

When you need to wait for multiple parallel operations to complete before proceeding, TA offers two clean approaches.

**Pattern 1: Variable accumulation** (recommended for known number of results)

```python
results = []

defjs entry(prompts):
   msg = prompts[-1]["content"]
   results.clear()
   callchatsilent([{"role":"user","content":"Entities: " + msg}], 'collect')
   callchatsilent([{"role":"user","content":"Sentiment: " + msg}], 'collect')
   callchatsilent([{"role":"user","content":"Summary: " + msg}], 'collect')

defjs collect(chat):
   results.push(chat[-1]["content"])
   if len(results) == 3:
      # All three have arrived — merge
      report = results[0] + "\n\n" + results[1] + "\n\n" + results[2]
      push_message(report)
      setOutputDataValue(0, report)
```

All three parallel calls share the same callback. Each callback pushes its result and checks if all results are in. Since the event loop guarantees sequential callback execution, there's no race condition on `results`.

**Pattern 2: Scheduled merge** (useful when timing is uncertain)

```python
defjs entry(prompts):
   msg = prompts[-1]["content"]
   callchatsilent([{"role":"user","content":"Entities: " + msg}], 'on_entities')
   callchatsilent([{"role":"user","content":"Sentiment: " + msg}], 'on_sentiment')
   # Schedule a merge after a delay
   execute_when(5000, 'merge', msg)

defjs on_entities(result):
   setOutputDataValue(0, str(result))

defjs on_sentiment(result):
   setOutputDataValue(1, str(result))

defjs merge(original):
   entities = getOutputDataValue(0)
   sentiment = getOutputDataValue(1)
   push_message("Entities: " + entities + "\nSentiment: " + sentiment)
```

**Pattern 3: Output slots as mailboxes**

Each parallel callback writes to its own Output slot. A subsequent step reads them all. The Output tabs serve as persistent shared storage without any concurrency issues.

---

## Rules — Structural Safety

### Why Rules Matter

In most agentic frameworks, safety is behavioral — you tell the LLM not to do harmful things through prompt instructions. The LLM might comply, or it might reason its way around your instructions. You can't be sure.

TA offers a different approach: `rulejs` predicates. These are **deterministic code gates** that execute before any LLM call. They can't be bypassed by clever prompting because they're not instructions to the LLM — they're code that runs in your agent.

### How Rules Work

Rules are defined with `rulejs` and evaluated **top-to-bottom**. The first rule whose condition is satisfied fires. Always end with a `True` rule as a default fallback — without it, unmatched messages are silently dropped.

```python
defjs entry(prompts):
   msg = prompts[-1]["content"]
   route(prompts, msg)

rulejs route(prompts, msg):
   "password" in msg.lower() or "credit card" in msg.lower()
   push_message("I cannot process requests involving sensitive personal data.")

rulejs route(prompts, msg):
   "drop " in msg.lower() or "truncate" in msg.lower()
   push_message("Destructive database operations are blocked.")

rulejs route(prompts, msg):
   msg.startswith("/search ")
   web_search(msg[8:], 'on_results', 5)

rulejs route(prompts, msg):
   True
   # Default: forward to LLM
   callchat(prompts, 'entrypoint')
```

The first two rules are safety gates — they block dangerous inputs before they ever reach the LLM. The third routes search commands. The fourth is the fallback for normal conversation. This is readable, auditable, and deterministic.

### Rules vs. Prompt Instructions

| Aspect | Prompt instructions | `rulejs` predicates |
|--------|-------------------|-------------------|
| Enforcement | Behavioral (LLM may ignore) | Structural (code, deterministic) |
| Auditability | Hidden in prompt text | Visible in agent code |
| Bypass risk | Prompt injection possible | Cannot be bypassed by user input |
| Debugging | Opaque (LLM reasoning) | Transparent (code execution) |

Use prompt instructions for nuance and tone. Use rules for hard boundaries.

---

## The Language: Pythonic

TA agent code is written in **Pythonic** — a Python-like language that transpiles to LispE and compiles to WebAssembly.

### Syntax Essentials

```python
# Comments use hash
msg = "strings use double quotes"
concatenated = "hello" + " " + "world"
callbacks = 'use single quotes'      # for callback names only

# Array/dict access
last_msg = chat[-1]["content"]       # last element, key "content"
third = chat[-3,"content"]           # alternative syntax

# Boolean
if True:
   # ...

# No import statements — all functions are globally available
```

### `defjs` and `rulejs`

These are the standard function definitions for agent code:

- **`defjs`**: defines a function whose first parameter is automatically decoded from Base64 JSON. Use this for any function that receives data from the platform — LLM responses, tool results, web search results, user input.
- **`rulejs`**: defines a pattern-matching rule with the same auto-decoding.
- **`def`** and **`rule`**: available for internal helpers that receive already-decoded data.

```python
# Receives data from JavaScript (LLM, tools, etc.) — use defjs
defjs entry(prompts):
   msg = prompts[-1]["content"]

# Internal helper, receives already-decoded data — use def
def format_result(text, idx):
   return "Result " + str(idx) + ": " + text
```

### Available String Methods

`.strip()`, `.trim()`, `.lower()`, `.split(sep)`, `.startswith(s)`, `.find(s)`, `.json()` (serialize to JSON string), `.json_parse()` (parse JSON string)

### Method Name Disambiguation

Because LispE treats everything as atoms, some method names can collide with variables. When this happens, append `@` to the method name:

```python
menu = json_parse(data)
keys = menu.keys@()       # keys@ instead of keys, to avoid atom collision
values = menu.values@()
```

Common methods like `.size()`, `.strip()`, `.json()` rarely need this.

---

## Data Architecture

### User Data — Your Agent's Reference Material

User Data tabs hold information the agent can read at runtime. Access them through the API or directly as a global list:

```python
# API access
value = getUserDataValue(0)        # Data 0
count = getUserDataSize()          # number of tabs

# Global list access (equivalent)
value = theuserdata[0]
count = theuserdata.size()
```

Use User Data for:
- Product catalogs, schemas, configuration
- Training data records (one per tab)
- Templates and reference documents
- Lookup tables

### Output Data — Persistent Results

Output tabs are writable slots for storing results:

```python
setOutputDataValue(0, "analysis result")   # write to Out 0
result = getOutputDataValue(0)             # read back
pushOutputDataValue("new result")          # add a new tab
```

Output data persists across interactions. The agent can write incrementally and read back results later. Use Output tabs for:
- Analysis results
- Generated content
- Intermediate pipeline state
- Exported data

### Four Output Channels

TA has four distinct output surfaces:

| Channel | Purpose | Feeds back to prompt? |
|---------|---------|----------------------|
| **Chat window** | Conversational UI — LLM responses, agent messages | Yes |
| **Display zone** | Rendered HTML, fetched pages, `println` output | No |
| **JS Console** | Debug output | No |
| **Output tabs** | Persistent structured storage | No (but readable by agent) |

Choose the right channel for each output. Use the chat for user-facing interaction. Use Output tabs for data you want to keep. Use the Display zone for visual or debug output.

### Global Variables

The platform initializes four global lists from the session content:

| Variable | Content |
|----------|---------|
| `theuserdata` | All User Data field values |
| `theprompts` | All system prompt values |
| `theskills` | All skill values |
| `thetools` | All tool values |

These are available alongside the `getUserDataValue()`/`setOutputDataValue()` API.

---

## Code Organization

### Agent Tabs — Code Partitions

Agent tabs (Agent 0, Agent 1, Agent 2, ...) are **not separate agents**. At runtime, all tabs are merged into a single program sharing one global namespace. The tabs exist for code organization only — to keep your editor windows manageable.

A typical organization:

| Tab | Content |
|-----|---------|
| Agent 0 | `defjs entry(prompts)` and main routing |
| Agent 1 | Callback functions |
| Agent 2 | `rulejs` safety gates and routing rules |
| Agent 3+ | Helper functions |

You can create as many Agent tabs as your code complexity requires. Five is the default starting point, not a limit.

### Code Runner — Manual Utilities

The Code Runner is a separate area for scripts you execute manually via a Run button. It's not triggered by the chat loop. It has access to the same API functions and global variables as agent code.

Use it for:

- **Data preparation**: splitting or reformatting User Data before processing
- **Initialization**: setting up Output tabs to match data size
- **Export**: saving results to disk
- **Testing**: one-off commands to verify data or agent behavior

```python
# Code 0: Initialize Output tabs to match User Data count
lst = take(getUserDataSize(), repeat("x"))
setOutputData(lst)

# Code 1: Save results to disk
store_data("/path/to/results.json", getOutputData().json())
```

---

## Multiple Chat Tabs

A session can have multiple independent chat tabs. Each tab has its own conversation history and can have its own system prompts, but all tabs share the same agent code and data.

Use multiple chat tabs when:
- Processing multiple data records in parallel (one chat per record)
- Running different conversation contexts with shared logic
- Batch workflows where each chat handles a different input

The agent can detect which chat triggered the call:

```python
defjs entry(prompts):
   tab = getChatName()
   if tab == "Chat 0":
      # handle differently
```

Or simpler: give each chat tab a different system prompt (via `allChatPrompts`), and the LLM naturally behaves differently per tab without any branching in your code.

---

## External Services

### Web Search

```python
web_search("query", 'on_results', 5)    # max 5 results

defjs on_results(results):
   # results is a list of {title, href, body} dicts
   setOutputDataValue(0, str(results))
```

### Fetching Web Pages

```python
fetch_page("https://example.com", 'on_page')

defjs on_page(content):
   push_message("Page loaded: " + str(content)[:200])
```

### MCP Connectors

MCP (Model Context Protocol) connectors provide access to external services — APIs, databases, custom tools. Connectors are activated in the GUI with per-user credentials.

```python
call_mcp("service_name", "tool_name", {"param": "value"}, 'on_result')

defjs on_result(data):
   push_message("Result from connector: " + str(data))
```

### User Input Dialogs

```python
read_input("Enter your API endpoint:", 'on_input')

defjs on_input(user_response):
   push_message("You entered: " + str(user_response))
   setOutputDataValue(0, str(user_response))
```

### Scheduling

```python
# Call 'check_status' after 5 seconds
execute_when(5000, 'check_status', some_data)

defjs check_status(data):
   push_message("Checking... " + str(data))
```

### File Operations

```python
store_data("/path/to/file.json", data_string)    # save to disk
content = load_data("/path/to/file.json")         # load from disk
save_session()                                     # save current session
```

---

## LLM Configuration

### Server Setup

TA supports multiple LLM providers: Ollama, vLLM, LM-Studio, Anthropic, OpenAI, and Mistral. You configure the connection through the Settings panel in the GUI:

- **Host URL**: the server endpoint
- **LLM Server**: provider type
- **Model**: which model to use
- **API Key**: your credentials

The session file stores this configuration, so colleagues sharing the same session connect to the same server automatically.

### Generation Parameters

| Parameter | Description | Typical values |
|-----------|-------------|----------------|
| Temperature | Randomness of output | 0.2 (precise) to 0.8 (creative) |
| Top P | Nucleus sampling threshold | 0.8–0.95 |
| Presence Penalty | Discourages repetition | 0.0–0.5 |
| Max Tokens | Maximum response length | 500–4000 per request |

For vLLM servers, an Extra Body field allows provider-specific parameters like LoRA adapter paths. You can activate and deactivate adapters directly in the interface, switching between the base model and fine-tuned variants at runtime.

---

## Complete Example: Data Augmentation Pipeline

This example shows TA as a **data processing tool** — the chat is a command interface, not a conversation. It's based on a real production workflow.

### The Task

Process training data for a coffee ordering assistant. Each data record contains a "rejected" (incorrect) response and an "accepted" (correct) response. The agent analyzes the difference, then generates variations of the error pattern for data augmentation.

### Session Structure

- **Sys 0**: "We are working on an augmentation model. Our task is to understand the underlying difference between a wrongly evaluated utterance given by a user and the corrected value, which was provided by a human annotator."
- **Data 0**: Product catalog (JSON with drink names and their customization options)
- **Data 1–N**: One training record per tab (JSON with `messages_rejected` and `messages_accepted`)
- **Out 1–N**: One output per record
- **Chat 0–N**: Multiple chat tabs for parallel batch processing
- **llmParams**: `temperature: 0.7`, `top_p: 0.8`, `presence_penalty: 0.2`

### Agent Code

```python
# Agent 0 — Entry point

defjs entry(prompts):
   clean_display()
   cmd = prompts[-1]["content"]
   if not "Go" in cmd:
      push_message("Type 'Go N' to process record N.")
   else:
      idx = integer(cmd[3:])
      if idx < 1:
         idx = 1
      elif idx >= theuserdata.size():
         idx = theuserdata.size() - 1
      println("Processing record", idx)
      # Build fresh prompt from system prompt only
      fresh = [prompts[0]]
      d = theuserdata[idx].trim().json_parse()
      msg = "Rejected: " + d["messages_rejected"].json() + "\n"
      msg += "Corrected: " + d["messages_accepted"].json()
      # Hidden context — LLM sees it, user doesn't
      add_to_chat(fresh, msg, false)
      callchat(fresh, 'entrypoint', idx)
```

```python
# Agent 1 — Callbacks

defjs entrypoint(chat, idx):
   # First LLM response analyzed the difference.
   # Now ask for variations.
   msg = "Provide five examples that would mimic this wrong entry.\n"
   menu = json_parse(theuserdata[0].strip())
   choices = random_choice(10, menu.keys@(), menu.size())
   msg += "Use these products: " + choices.json() + "\n"
   msg += "Use these quantities: [2,3,4,5]"
   add_to_chat(chat, msg, true)
   callchat(chat, 'fin', idx)

defjs fin(chat, idx):
   # Merge both LLM responses and store
   analysis = chat[-3]["content"]
   variations = chat[-1]["content"]
   result = analysis + "\n\n---\n\n" + variations
   println(result)
   setOutputDataValue(idx, result)
```

### Code Runner Utilities

```python
# Code 0: Initialize Output tabs
lst = take(getUserDataSize(), repeat("x"))
setOutputData(lst)

# Code 1: Export results
store_data("/path/to/augmented_data.json", getOutputData().json())
```

### How It Works

1. User types `Go 5` in any chat tab
2. `entry` parses the command, loads record 5 from User Data
3. Builds a fresh prompt with only the system prompt + hidden training data
4. First `callchat` sends to LLM → LLM analyzes the difference between rejected and accepted
5. `entrypoint` callback builds a follow-up instruction with randomized product variations
6. Second `callchat` sends to LLM → LLM generates five error pattern variations
7. `fin` callback merges both responses and stores in Output slot 5

The user can open Chat 0, type `Go 1`, switch to Chat 1, type `Go 2`, switch to Chat 2, type `Go 3` — processing multiple records in parallel across chat tabs, all driven by the same three functions.

---

## API Reference

### LLM Communication

| Function | Description |
|----------|-------------|
| `callchat(prompts, 'callback', ...)` | Send to LLM. Auto-displays response. Up to 3 extra args forwarded. |
| `callchatsilent(prompts, 'callback', ...)` | Send to LLM. Silent — no display. Up to 3 extra args forwarded. |

### Chat Display

| Function | Description |
|----------|-------------|
| `push_message(msg)` | Display as assistant message (enters prompt history) |
| `push_request(msg)` | Display as user message (enters prompt history) |
| `add_to_chat(list, msg, display)` | Append to prompt list. `display=true` shows in chat; `false` is hidden. |
| `input_chat(msg)` | Simulate a user message in a chat tab and trigger `entry(prompts)` |

### Data Access

| Function | Description |
|----------|-------------|
| `getUserDataValue(idx)` | Read User Data by index (0 = Data 0) |
| `getUserData()` | All User Data as list |
| `getUserDataSize()` | Number of User Data tabs |
| `setUserDataValue(idx, val)` | Update User Data field |
| `pushUserDataValue(val)` | Add new User Data tab |
| `setOutputDataValue(idx, val)` | Write to Output field |
| `getOutputDataValue(idx)` | Read Output field |
| `getOutputData()` | All Output values as list |
| `getOutputSize()` | Number of Output tabs |
| `pushOutputDataValue(val)` | Add new Output tab |
| `setOutputData(list)` | Set all Output tabs at once |
| `setUserData(list)` | Set all User Data tabs at once |

### Images & PDFs (multimodal)

The **Images** panel stores both images and PDFs in one gallery. Each entry has a 0-based index and a `name`; re-adding an item with an existing `name` (same kind) refreshes it instead of duplicating it.

| Function | Description |
|----------|-------------|
| `getImageSize()` | Number of images in the gallery |
| `getImageValue(idx)` | Image `idx` as `{name, src, isUrl}` (`src` = data URL or http URL) |
| `getImageData()` | All images as a list of `{name, src, isUrl}` |
| `add_image_to_chat(chat, id_image, prompt?)` | Inject gallery image `id_image` into `chat` as a user message, with an optional text `prompt` |
| `getPdfSize()` | Number of stored PDFs |
| `getPdfValue(idx)` | Stored PDF `idx` as `{name, src, isUrl}` |
| `getPdfData()` | All stored PDFs as a list of `{name, src, isUrl}` |
| `add_pdf_to_chat(chat, id_pdf, prompt?, mode?)` | Ingest a PDF stored in the PDFs section (by 0-based index) and append its content to `chat`; per page the backend sends extracted text or a rendered page image. `mode` = `auto` / `text` / `vision` |
| `load_pdf(source, mode?)` | Synchronously analyse a PDF and **return** a list of LLM content parts (text and/or `image_url`) without touching any chat. `mode` = `auto` / `text` / `vision` |

PDFs are ingested through the backend `/pdf_ingest` endpoint (PyMuPDF): `text` sends each page's extracted text, `vision` renders each page to an image, and `auto` chooses per page.

### Web & External

| Function | Description |
|----------|-------------|
| `web_search(query, 'callback', max?)` | Search web via DuckDuckGo. Returns list of `{title, href, body}`. |
| `fetch_page(url, 'callback')` | Fetch URL content |
| `display_page(url)` | Render URL in Display zone |
| `open_html(html)` | Open HTML in new browser tab |
| `clean_html(text)` | Strip HTML tags from a text string |
| `call_mcp(server, tool, args, 'callback')` | Call MCP connector |

### Display & Debug

| Function | Description |
|----------|-------------|
| `println(...)` | Print to Display zone |
| `clean_display()` | Clear Display zone |

### Session & Files

| Function | Description |
|----------|-------------|
| `getconfidential()` | Access credentials from confidential field |
| `getsecret()` | Access secret string |
| `save_session()` | Trigger session save |
| `store_data(path, data)` | Save string to disk |
| `load_data(path)` | Load file from disk |
| `store_session(path)` | Save session to file |
| `getChatName()` | Current chat tab name |
| `getChatValue(tab_name)` | Chat history of a specific tab (list of dictionaries) |
| `pushChatTab()` | Add a new chat tab, returns its name |
| `getChatSize()` | Number of chat tabs |
| `systemprompt()` | Full system prompt string |

### Scheduling & UI

| Function | Description |
|----------|-------------|
| `execute_when(ms, 'callback', data?)` | Schedule callback after delay |
| `read_input(msg, 'callback')` | Show input dialog, reply to callback |

---

## Session JSON Structure

A complete session file contains these top-level keys:

```
_description          One-sentence summary
chatHistory           [] (empty on creation)
systemPrompt          "" (legacy — prompts live in allChatPrompts)
principles            [] (legacy)
setup                 {host, maxTokens, ...}
allChatPrompts        {Chat N: {Sys 0: "...", Sys 1: "", ...}}
chatTabNames          ["Chat 0", ...]
systemPromptTabNames  ["Sys 0", "Sys 1", "Sys 2", "Sys 3", "Sys 4"]
skills                {Skill N: "..."}
skillTabNames         ["Skill 0", ...]
tools                 {Tool N: "..."}
toolTabNames          ["Tool 0", ...]
userData              {Data N: "..."}
userDataTabNames      ["Data 0", ...]
outputData            {Out N: ""}
outputDataTabNames    ["Out 0", ...]
initialization        {lib 0: "", lib 1: "", ...} — ALWAYS EMPTY
initTabNames          ["lib 0", ...]
agents                {Agent N: "code..."}
agentTabNames         ["Agent 0", ...]
agentModes            {Agent N: "python"} — ALWAYS "python"
activeConnectors      []
confidential          ""
secret                ""
apiKey                ""
codeRunner            {Code N: "..."}
codeRunnerTabNames    ["Code 0", ...]
codeRunnerModes       {Code N: "python"}
llmParams             {temperature, top_p, presence_penalty, max_tokens}
displayContent        "" (legacy)
allChatHistories      {}
```

The `*TabNames` arrays must match the keys in their corresponding objects. You can have as many tabs as needed — five is the default starting point, not a limit.

The `initialization` section must always be left empty. The platform loads its own default libraries providing all the functions documented in this manual.

---

## Key Differences from Other Frameworks

| Aspect | LangGraph / CrewAI | Tamed Agents |
|--------|-------------------|--------------|
| LLM role | Orchestrator — decides which tools to call | Signal source — produces text when asked |
| Safety model | Behavioral (prompt instructions) | Structural (code gates via `rulejs`) |
| Tool access | LLM calls tools directly | Agent code mediates all tool access |
| Parallelism | Framework-managed, complex state merging | Three lines of code, zero synchronization |
| Threading | Threads/async with GIL, race conditions | Event loop, no GIL, no GC, no locks |
| Deployment unit | Python code + config + env vars | Single JSON file |
| Auditability | Scattered across files and framework internals | One file — read it and know everything |
| Developer writes | Infrastructure glue + business rules | Business rules only |
