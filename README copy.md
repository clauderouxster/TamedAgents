# Tamed Agents

**Tamed Agents** is a self-contained web application for interacting with Large Language Models (LLMs) through a rich, multi-panel interface built around programmable agents. It combines a chat interface, a multi-tab system prompt editor, skills and tools definitions, a built-in LispE scripting engine (compiled to WebAssembly), and Python execution — all orchestrated from a single page.

The key idea behind Tamed Agents is that **agent behavior is defined in LispE code** that runs locally in the browser. When the user sends a message, the LispE agent code decides how to call the LLM, process the response, invoke tools, and chain further interactions — giving you full programmatic control over the conversation flow.

---

## Table of Contents

- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Architecture Overview](#architecture-overview)
- [Interface Guide](#interface-guide)
  - [Left Sidebar — Session Management](#left-sidebar--session-management)
  - [Top Bar](#top-bar)
  - [Chat Area](#chat-area)
  - [Display Zone](#display-zone)
  - [Right Panel](#right-panel)
    - [Settings](#settings)
    - [Prompts](#prompts)
    - [Skills](#skills)
    - [User Data](#user-data)
    - [Tools](#tools)
    - [Console](#console)
    - [Init / Libs](#init--libs)
    - [Agents](#agents)
- [LLM Server Support](#llm-server-support)
- [The Agent Pipeline](#the-agent-pipeline)
- [File Structure](#file-structure)
- [Troubleshooting](#troubleshooting)

---

## Installation

### Python Dependencies

```bash
pip install fastapi uvicorn requests fastmcp duckduckgo-search
```

| Package | Purpose |
|---------|--------|
| `fastapi` | Web framework serving the backend API |
| `uvicorn` | ASGI server to run the FastAPI application |
| `requests` | HTTP client used by the LLM connector modules |

### WebAssembly Runtime

The LispE interpreter is compiled to WebAssembly and shipped as `lispe/lispe.js` + `lispe/lispe.wasm`. No additional installation is needed — the browser loads them automatically.

---

## Running the Application

```bash
cd PREDIBAG
python app.py server
```

This single command:
1. Starts the **FastAPI backend** (via Uvicorn) on `http://127.0.0.1:5200`
2. Serves the frontend (`templates/index.html`) from the same server
3. Automatically **opens your default browser** to the application

> Without the `server` argument, `app.py` starts the FastAPI API only (useful if you serve the frontend separately via Live Server or another static server).

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     Browser (index.html)                 │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐   │
│  │  Chat UI │  │ Prompts/ │  │  Agents  │  │  LispE  │   │
│  │ 10 tabs  │  │ Skills/  │  │CodeMirror│  │  WASM   │   │
│  │          │  │ Tools/   │  │  editor  │  │ runtime │   │
│  │          │  │ UserData │  │          │  │         │   │
│  └─────┬────┘  └──────────┘  └─────┬────┘  └────┬────┘   │
│        │                           │            │        │
│        └───────────────────────────┼────────────┘        │
│                                    │                     │
│                              JavaScript                  │
│                    (fetch calls, evaljs bridge)          │
└─────────────────────────┬────────────────────────────────┘
                          │  HTTP (streaming)
┌─────────────────────────┴────────────────────────────────┐
│                 FastAPI Backend (app.py)                 │
│                    port 5200                             │
│                                                          │
│  /chat (streaming)    /eval_python    /set_model_server  │
│  /list_*_models       /set_key        /set_host          │
│  /set_max_tokens      /extract_code   /mcp_proxy         │
│  /atlassian_proxy     ...                                │
└─────────────────────────┬────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  Ollama  │   │  Claude  │   │   vLLM   │  ...
    │  server  │   │   API    │   │  server  │
    └──────────┘   └──────────┘   └──────────┘
```

The frontend is a **single HTML file** (~6 000 lines) embedding all CSS, JavaScript, and inline logic. It communicates with the FastAPI backend exclusively via `fetch` calls. The LispE engine runs entirely in the browser via WebAssembly.

---

## Interface Guide

### Left Sidebar — Session Management

The collapsible left sidebar is the central hub for session lifecycle:

| Button | Action |
|--------|--------|
| **New Session** | Creates a new named session (prompts for a name or auto-generates one like `session_2026_03_02_14_30`) |
| **📦 Store** | Opens a modal to select sessions and export them as a `.json` dump file |
| **📂 Load** | Imports sessions from a previously exported `.json` dump |
| **✏️ Rename** | Renames the currently selected session |
| **🗑️ Remove** | Opens a modal to select and permanently delete sessions |
| **🗑️ Reset** | Full environment reset: clears chat, prompts, skills, tools, agents, and resets the LispE runtime |

Below these actions:
- A **session list** (`<select>`) shows all saved sessions for the current LLM server. Clicking a session loads it entirely (chat history, prompts, skills, tools, agents, init code, settings).
- An **LLM Server** dropdown (mirrored in the Settings panel) lets you switch between servers. Sessions are stored per-server in `localStorage`.

### Top Bar

The top bar contains:
- **☰** Toggle button to collapse/expand the left sidebar
- **"Tamed Agents"** application title
- **🌗** Dark/Light theme toggle (preference saved in `localStorage`)
- **Panel trigger buttons** (⚙️ 📝 🎯 📊 🔧 🖥️ ⚡ 🤖) — each opens the right panel to the corresponding section

### Chat Area

The chat area occupies the main viewport and consists of:

#### Chat Tabs (10 tabs)

Ten independent chat tabs (`Chat 1` through `Chat 10`) allow parallel conversations within the same session. Each tab maintains its own:
- Message history (displayed as user/assistant bubbles with Markdown rendering)
- System prompt association (each chat tab has its own set of system prompt tabs)

Switching tabs auto-saves the current chat to memory and loads the target tab's history.

#### Message Display

- Messages are rendered as **collapsible bubbles** (click the toggle arrow to collapse long messages)
- Assistant responses support **Markdown** (via `marked.js`) with **syntax-highlighted code blocks** (via Prism.js for Python)
- Each message has a **copy button** to copy its content to the clipboard

#### Chat Input & Actions Bar

- A **multiline textarea** with a send button (also sends on Enter; Shift+Enter for newline)
- **▲ Undo / ▼ Redo**: Remove the last message pair or re-inject a previously undone pair
- **💾 Save**: Saves the current session to `localStorage`
- **📦 Store**: Quick access to the dump modal
- **📋 Copy**: Copies the entire chat history to clipboard
- **⏹ Stop**: Interrupts the current LispE execution
- **🧹 Clean All**: Clears all fields (prompts, skills, tools, etc.) but preserves sessions and API keys
- **🗑️ Reset**: Full environment reset (same as sidebar Reset)

### Display Zone

A **floating, draggable, and resizable** panel in the top-right corner of the chat area. It serves as an output console for:
- `println` output from LispE agent code (captured from the WASM `Module.print`)
- Results from Python execution
- Links opened via the `open_url` tool function

Features:
- **🔍 Search**: Text search with match highlighting and navigation (▲/▼)
- **Copy** and **Clean** buttons
- Resizable from all edges and corners
- Draggable by its header

### Right Panel

A sliding panel on the right, opened by clicking any panel trigger button in the top bar. Contains tabs for all configuration sections. The panel is resizable from its left edge.

---

#### Settings

Configure the connection to the LLM backend:

| Field | Description |
|-------|-------------|
| **Host URL** | The LLM server endpoint (auto-filled per server type) |
| **Max Tokens** | Maximum token limit for LLM responses |
| **API Key** | Authentication key (required for Claude, OpenAI; stored in `localStorage` per server) |
| **Model** | Dropdown populated from the server's model list (`/list_*_models` endpoint) |
| **LLM Server** | Select among: Ollama, vLLM, LM Studio, Claude (Anthropic), OpenAI |

Settings are **saved per server** in `localStorage` and automatically restored when switching servers.

---

#### Prompts

Multi-tab system prompt editor for defining the system instructions sent to the LLM.

- **5 default tabs** (`Sys 1` to `Sys 5`), expandable with the **+** button
- Each tab is a full-size textarea
- **System prompts are per-chat-tab**: each of the 10 chat tabs has its own independent set of system prompt tabs
- When a message is sent, **all non-empty prompt tabs are concatenated** to form the final system prompt
- Toolbar: **Load** (from file), **💾 Save**, **🔍 Search** (Enter to search, Shift+Enter for previous, Escape to close), **Copy**, **🗑️ Clear**

---

#### Skills

Multi-tab textarea editor for defining reusable skills (instructions, few-shot examples, domain knowledge).

- **5 default tabs** (`Skill 1` to `Skill 5`), expandable with **+**
- Skills are passed to the LispE agent code via the `Initialize` function as a list
- Toolbar: **Load**, **💾 Save**, **🔍 Search**, **Copy**, **🗑️ Clear**

---

#### User Data

Multi-tab textarea editor for injecting context data into the conversation.

- **5 default tabs** (`Data 1` to `Data 5`), expandable with **+**
- User data is passed to the agent code and can be used to provide documents, context, or reference material
- Toolbar: **Load**, **💾 Save**, **🔍 Search**, **Copy**, **🗑️ Clear**

---

#### Tools

Multi-tab textarea editor for defining tool schemas (JSON function definitions for function-calling / tool-use).

- **5 default tabs** (`Tool 1` to `Tool 5`), expandable with **+**
- Tool definitions are sent alongside chat messages when the agent requests tool use
- Tool implementations live in `tools.js` (JavaScript functions called from LispE via `evaljs`)
- Built-in tools include: `open_url`, `search_product`, `confluence_search`, `confluence_get_page`, `confluence_create_page`, etc.
- Toolbar: **Load**, **💾 Save**, **🔍 Search**, **Copy**, **🗑️ Clear**

---

#### Console

An interactive **LispE REPL** (Read-Eval-Print Loop) for testing and debugging:

- **CodeMirror editor** (Scheme syntax highlighting) for input
- Output area showing results and errors with distinct styling
- **Command history** navigation (Up/Down arrows)
- Buttons: **Copy**, **🗑️ Clean** (clears output), **🔄 Reset** (resets the LispE runtime)

---

#### Init / Libs

Multi-tab **CodeMirror editor** (Scheme/LispE syntax) containing the initialization code that runs before agent execution.

- **5 default tabs** (`lib 1` to `lib 5`), expandable with **+**
- `lib 1` comes pre-populated with essential library functions:
  - `convertjs` / `jsjson`: decode base64 JSON from JavaScript
  - `jschat` / `jschat64` / `jschatsilent64`: macros to call the LLM from LispE
  - `Initialize`: receives system prompts, skills, tools, and user data as lists
  - `systemprompt`: concatenates prompts and skills into a formatted string
  - `callchat` / `callchatsilent` / `calltool`: wrappers for async JavaScript calls
  - `entry`: the main entry point that triggers the LLM call
  - `execute_when`: schedule delayed callbacks
  - `python`: execute Python code on the server
  - `push_message`: inject a message into the chat display
- **Set** button: compiles and loads all init tabs into the LispE runtime
- **Confidential** field: a secure textarea at the bottom for storing sensitive data (API keys, tokens) accessible from LispE via `getconfidential()` but never included in session dumps
- Toolbar: **Load**, **Set**, **💾 Save**, **🔍 Search**, **Copy**, **🗑️ Clear**

---

#### Agents

Multi-tab **CodeMirror editor** (Scheme/LispE syntax) for writing agent logic.

- **5 default tabs** (`Agent 1` to `Agent 5`), expandable with **+**
- `Agent 1` comes with a minimal default template:
  ```lisp
  (defun entrypoint(chat)
     (setq chat (convertjs chat))
     (println (@ chat -1 "content")))
  ```
- **Set** button: loads the initialization code (all Init tabs) + all agent tabs into the LispE runtime, and sends the current prompts, skills, tools, and user data to the `Initialize` function
- When the user sends a message, the agent's `entry` function is called, which triggers the LLM call and routes the response to `entrypoint`
- The agent code can process the response, call tools, chain further LLM calls, display results in the Display zone, execute Python on the server, etc.
- Toolbar: **Load**, **Set**, **💾 Save**, **🔍 Search**, **Copy**, **🗑️ Clear**

---

## LLM Server Support

| Server | Module | Default Host | API Key Required |
|--------|--------|-------------|-----------------|
| **Ollama** | `call_ollama.py` | `http://localhost:11434` | No |
| **vLLM** | `call_vllm.py` | `http://10.57.16.43:8012/v1` | No |
| **LM Studio** | `call_lmstudio.py` | `http://localhost:1234/v1` | No |
| **Claude** | `call_claude.py` | `https://api.anthropic.com` | Yes |
| **OpenAI** | `call_openai.py` | `https://api.openai.com/v1/chat/completions` | Yes |

Each module implements a uniform interface: `call_llm`, `call_llm_chat`, `list_models`, `get/set_host`, `get/set_key`, `get/set_max_tokens`. The `LLMClient` class in `app.py` dynamically loads the appropriate module and delegates all calls.

All servers support **streaming responses** — the backend proxies the LLM stream chunk-by-chunk to the frontend.

---

## The Agent Pipeline

When the user clicks **Set** on the Agents panel, the following happens:

1. **Initialization code** (all Init tabs concatenated) is loaded into the LispE runtime
2. **Agent code** (all Agent tabs concatenated) is loaded into the LispE runtime
3. The `Initialize` function is called with four arguments: system prompts, skills, tools, and user data (as lists)

When the user sends a message:

1. The message is added to the chat history
2. The chat history (as a JSON array) is base64-encoded
3. The LispE `entry` function is called with the encoded chat
4. `entry` calls `call_chat` which triggers a `fetch` to the FastAPI `/chat` endpoint
5. The FastAPI backend forwards the request to the configured LLM server (with streaming)
6. The streamed response is displayed in the chat
7. The `entrypoint` callback receives the full response and can process it further (call tools, chain LLM calls, display results, etc.)

This architecture means **you can write arbitrarily complex agent logic** in LispE: multi-step reasoning, tool orchestration, conditional branching, retry loops, parallel LLM calls, Python execution — all from within the browser.

---

## File Structure

```
PREDIBAG/
├── app.py                  # FastAPI backend (API + HTML serving)
├── call_ollama.py          # Ollama LLM connector
├── call_vllm.py            # vLLM connector (OpenAI-compatible)
├── call_lmstudio.py        # LM Studio connector
├── call_claude.py          # Anthropic Claude connector
├── call_openai.py          # OpenAI connector
├── filters.py              # Code block extraction from LLM responses
├── predicate.py            # Predicate/pattern matching utilities
├── tools.py                # FastAPI APIRouter: MCP proxy & Atlassian/Confluence routes
├── tools.js                # Client-side tool implementations (called from LispE)
├── validate.py             # Validation utilities
├── lispe/
│   ├── lispe.js            # LispE WASM loader
│   ├── lispe.wasm          # LispE interpreter (WebAssembly)
│   └── lispe_functions.js  # JS ↔ LispE bridge functions
├── templates/
│   └── index.html          # Main web interface (single-page application)
├── data/                   # Sample data files (JSON, LispE scripts)
└── docs/                   # Documentation and reference materials
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError` on startup | Run `pip install fastapi uvicorn requests` |
| Connection error to LLM server | Verify the server is running and the host URL is correct in Settings |
| Model not found | Ensure the model is loaded/available on your LLM server |
| No models in dropdown | Click **Set** next to the LLM Server selector to refresh the connection |
| Agent code not executing | Click **Set** in the Agents panel to load Init + Agent code into the runtime |
| Session not appearing | Sessions are stored per-server — switch to the correct LLM server |
| API key lost after reload | Set the API key in Settings; it persists in `localStorage` per server |
