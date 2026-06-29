# Tamed Agents

**Tamed Agents** is a self-contained web application for interacting with Large Language Models (LLMs) through a rich, multi-panel interface built around programmable agents. It combines a chat interface, a multi-tab system prompt editor, skills and tools definitions, MCP connectors, a built-in LispE scripting engine (compiled to WebAssembly), an embedded BasAIc/Pythonic compiler, and server-side Python execution — all orchestrated from a single page.

The key idea behind Tamed Agents is that **agent behavior is defined in code** (LispE, BasAIc or Pythonic) that runs locally in the browser. When the user sends a message, the agent code decides how to call the LLM, process the response, invoke tools, and chain further interactions — giving you full programmatic control over the conversation flow.

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
  - [Right Panel — Hat Tabs](#right-panel--hat-tabs)
    - [Settings (always visible)](#settings-always-visible)
    - [📝 Prompts group](#-prompts-group)
    - [💻 Code group](#-code-group)
    - [📊 Data group](#-data-group)
- [LLM Server Support](#llm-server-support)
- [The Agent Pipeline](#the-agent-pipeline)
- [File Structure](#file-structure)
- [Troubleshooting](#troubleshooting)

---

## Installation

### Python Dependencies

```bash
pip install fastapi uvicorn requests fastmcp duckduckgo-search feedparser pymupdf
```

| Package | Purpose |
|---------|--------|
| `fastapi` | Web framework serving the backend API |
| `uvicorn` | ASGI server to run the FastAPI application |
| `requests` | HTTP client used by the LLM connector modules |
| `fastmcp` | Client used by the MCP connector proxy |
| `duckduckgo-search` | Optional, used by the built-in web search tool |
| `feedparser` | Parses RSS/Atom feeds for the `/fetch_feed` endpoint |
| `pymupdf` | Optional, used by the `/pdf_ingest` endpoint (PDF text extraction & page rendering) |

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
│  │  Chat UI │  │ Prompts/ │  │  Agents/ │  │  LispE  │   │
│  │ N tabs   │  │ Skills/  │  │ Console/ │  │  WASM   │   │
│  │          │  │ Tools/   │  │  Core    │  │ runtime │   │
│  │          │  │Connectors│  │ editors  │  │         │   │
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

The frontend lives in `templates/` and is split into one HTML shell (`index.html`) plus several modular JS files (`app-core.js`, `app-chat.js`, `app-tabs.js`, `app-agents.js`, `app-editors.js`, `app-sessions.js`, `app-server.js`, `app-search-api.js`, `app-connectors-ui.js`, `app-images.js`, `tools.js`). It communicates with the FastAPI backend exclusively via `fetch` calls. The LispE engine runs entirely in the browser via WebAssembly.

---

## Interface Guide

### Left Sidebar — Session Management

The collapsible left sidebar is the central hub for the session lifecycle. The top row contains a primary **New Session** button next to a **☰** dropdown that exposes all session actions:

| Section | Action | Description |
|--------|--------|-------------|
| Create | **📋 Template** | Create a session from a predefined template |
| Import / Export | **📦 Store sessions** | Export selected sessions as a `.json` dump |
| | **📂 Load sessions** | Import sessions from a previously exported `.json` dump |
| Archive | **🗃️ Archive** | Move sessions to a compressed archive |
| | **📥 Restore** | Restore archived sessions |
| Organisation | **📁 New folder** | Create a folder in the session tree |
| | **↪️ Move to folder** | Move a session into a folder |
| | **✏️ Rename** | Rename the currently selected session |
| Danger | **🗑️ Remove sessions** | Modal selector to permanently delete sessions |
| | **🗑️ Reset all** | Full environment reset (chat, prompts, skills, tools, agents, LispE runtime) |
| | **↩️ Undo delete** | Restore the last deleted session (shown only when applicable) |

Below the action area:
- A hierarchical **session tree view** (`#sessionTreeView`) showing sessions organized in folders. A small badge indicates when the current session has unsaved changes.
- An **LLM Server** dropdown (mirrored in the Settings panel) lets you switch between backends. Sessions are stored per-server in `localStorage`.

### Top Bar

The top bar contains, from left to right:
- **☰** Toggle button to collapse/expand the left sidebar
- **"Tamed Agents"** application title and a **?** button opening an interface overview
- The **current session name** and a "modified" badge
- A central **STOP** button to interrupt the running LispE execution
- On the right:
  - **💾 Save** — save the current session
  - **🌗 Dark** — dark / light theme toggle (persisted)
  - **🖼️ Display** — show / hide the floating Display zone
  - **⚙️ Settings** — opens the Settings panel
  - **Hat tabs**: **📝 Prompts**, **💻 Code**, **📊 Data** — each opens the right panel pre-positioned on the first sub-tab of that group (see below)

### Chat Area

#### Chat Tabs

Multiple independent chat tabs (`Chat 0`, `Chat 1`, …) allow parallel conversations within the same session. A **+** button appends a new chat tab. Each tab maintains its own:
- Message history (displayed as user / assistant bubbles with Markdown rendering)
- System prompt association — every chat tab has its own set of `Sys N` prompt tabs

Switching tabs auto-saves the current chat to memory and loads the target tab's history.

#### Message Display

- Messages are rendered as **collapsible bubbles** (click the arrow to collapse long messages)
- Assistant responses support **Markdown** (via `marked.js`) with **syntax-highlighted code blocks** (via Prism.js for Python)
- Each message has a **copy button** to copy its content to the clipboard

#### Chat Input & Actions Bar

- A **multiline textarea** with a send button (also sends on Enter; Shift+Enter for newline). A hidden file input enables attachments.
- **▲ Undo / ▼ Redo**: remove the last message pair or re-inject a previously undone pair
- **🗑 Clean current chat**: clear the messages of the active chat tab while keeping it
- **🗑 Delete current chat tab**: remove the chat tab itself
- **📋 Copy**: copy the entire chat history to the clipboard
- **🧹 Clean All**: clear all editable fields (prompts, skills, tools, etc.) while preserving sessions and API keys
- **🗑️ Reset**: full environment reset

### Display Zone

A **floating, draggable, resizable** panel pinned to the top-right of the chat area. It serves as an output console for:
- `println` output from LispE / BasAIc / Pythonic agent code (captured from `Module.print`)
- Results from server-side Python execution
- Links opened via the `open_url` tool function

Features:
- **🔍 Search** with match counter and navigation (▲ / ▼)
- **Copy** and **Clean** buttons, **✕** close
- Resizable from all edges and corners; draggable by its header
- Can be toggled from the top bar's **🖼️ Display** button

---

## Right Panel — Hat Tabs

All editor and configuration panels live in the right-hand sliding panel. The panel is opened by clicking one of the top-bar buttons (**⚙️ Settings**, **📝 Prompts**, **💻 Code**, **📊 Data**) and is resizable from its left edge.

Inside the panel, sub-panels are organized as a row of small tabs that are visually grouped into **three "hat" groups** plus the standalone Settings tab:

| Hat group | Sub-tabs |
|-----------|----------|
| ⚙️ **Settings** (standalone) | Settings |
| 📝 **Prompts** | Prompts · Skills · Tools · Connectors |
| 💻 **Code** | Agents · Console · Core |
| 📊 **Data** | User Data · Output · Images |

Clicking a top-bar hat button activates the corresponding group and shows the first sub-tab; you can then switch between sub-tabs of that group. The right-panel header displays the active sub-tab name and offers context-sensitive **?** Help and **Doc** buttons where available.

---

### Settings (always visible)

Configure the connection to the LLM backend:

| Field | Description |
|-------|-------------|
| **Host URL** | The LLM server endpoint (auto-filled per server type) |
| **Max Tokens** | Maximum token limit for LLM responses |
| **Image Quality** | Detail level sent to the LLM for attached images: `Auto`, `Low` (faster, fewer tokens) or `High` (full resolution, more tokens) |
| **API Key** | Authentication key (required for Claude, OpenAI, Mistral; stored in `localStorage` per server) |
| **Model** | Dropdown populated from the server's model list (`/list_*_models` endpoint) |
| **LLM Server** | Select among: vLLM, Ollama, LM Studio, Claude (Anthropic), OpenAI, Mistral. The **Set** button refreshes the connection and reloads the model list. |

Below the main fields:
- **💾 Save** — save the current settings to the active session
- **🔑 Model Keys** — manage per-model API keys
- A collapsible **LLM Parameters** section (visible mostly for vLLM-compatible servers) exposing Temperature, Top P, Presence Penalty, per-request Max Tokens, and a key-value **Extra Body** editor for vLLM-specific options. **Apply LLM Params** commits the values to the backend.

Settings are **saved per server** in `localStorage` and automatically restored when switching servers.

---

### 📝 Prompts group

All four sub-tabs share the same general layout: an action bar (Load / 💾 Save / 🔍 Search / Copy / 🗑️ Clear), a row of colored tabs with a **+** button to add more, an optional search/replace bar, and either textareas or specialized editors.

#### Prompts

Multi-tab system prompt editor for defining the instructions sent to the LLM.
- Default tabs: `Sys 0` … `Sys 4` (expandable). Tabs use a blue palette.
- **System prompts are per-chat-tab**: each chat tab carries its own set of `Sys N` prompts.
- When a message is sent, **all non-empty prompt tabs are concatenated** to form the final system prompt.

#### Skills

Multi-tab textarea editor for reusable skills (instructions, few-shot examples, domain knowledge).
- Default tabs: `Skill 0` … `Skill 4` (expandable). Sky palette.
- Skills are passed to the agent code as a list via the `Initialize` function.

#### Tools

Multi-tab textarea editor for tool schemas (JSON function definitions for function-calling / tool-use).
- Default tabs: `Tool 0` … `Tool 4` (expandable). Cyan palette.
- Tool definitions are sent alongside chat messages when the agent requests tool use.
- Client-side tool implementations live in `templates/tools.js` (JavaScript functions invoked from LispE via `evaljs`). Built-ins include `open_url`, `search_product`, plus Confluence helpers (`confluence_search`, `confluence_get_page`, `confluence_create_page`, …).

#### Connectors

Configures **MCP (Model Context Protocol)** connectors that expose external tool servers to the agent. Each connector is a tab; built-in actions:
- **Connect** / **Disconnect** — open or close the MCP session
- **🔍 Fetch** — list the tools published by the server
- **Test** — ping the server to verify connectivity
- **📋 Copy** — copy the list of enabled tool descriptors to the clipboard
- **⟲ Reset** — restore the current connector to its default template

The connector body is organized as three collapsible zones:
- **▶ MCP Configuration** — JSON describing transport, URL and headers
- **▶ Credentials 🔒** — secrets and variables (never included in dumps)
- **▶ MCP Tools** — accordion of the available tools with per-tool enable checkboxes and a **Select all** toggle

A status bar above the tabs summarizes which connectors are active. Connectors are proxied through the backend route `/mcp_proxy`.

---

### 💻 Code group

The Code group contains the executable side of the application. Each sub-tab uses a **CodeMirror editor** with Scheme/LispE syntax highlighting (or Python / BasAIc when the relevant mode is selected) and supports undo/redo, copy, search-and-replace, load from file and save to session.

#### Agents

Multi-tab editor for writing agent logic.
- Default tabs: `Agent 0` … `Agent 4` (expandable). Purple palette.
- The leftmost button toggles the execution language: **LispE / BasAIc / Pythonic**. When BasAIc or Pythonic is selected, a **Compile** button appears that translates the source to LispE before execution; **Tab→Space** helps normalize whitespace.
- **Set** loads the initialization code (all Core tabs) **and** all Agent tabs into the LispE runtime, then invokes the `Initialize` function with the current Prompts, Skills, Tools and User Data as lists.
- When the user sends a message, the agent's `entry` function is called, which triggers the LLM call and routes the response to `entrypoint`.
- A starter `Agent 0` template is provided:
  ```lisp
  (defun entrypoint(chat)
     (setq chat (convertjs chat))
     (println (@ chat -1 "content")))
  ```

#### Console

Combines a **LispE / BasAIc / Pythonic REPL** with an integrated **Code Runner**:

- **REPL**: a small CodeMirror input, an output area for results/errors, command history (Up / Down arrows), and buttons **Copy**, **🗑️ Clean** (clear output) and **🔄 Reset** (rebuild the LispE runtime).
- **Code Runner** (below the REPL): a multi-tab editor (`Code 0` … `Code 4`, teal palette) for longer scripts. The mode toggle (LispE / BasAIc / Pythonic), **Compile** and **Tab→Space** behave as in the Agents tab. **▶ Run** executes the current tab; standard Load / Save / Search / Clear are available.

#### Core

Multi-tab CodeMirror editor for the **initialization (libs) code** that runs before any agent execution.
- Default tabs: `lib 0` … `lib 4` (expandable). Indigo palette.
- `lib 0` is pre-populated with essential helpers:
  - `convertjs` / `jsjson`: decode base64 JSON coming from JavaScript
  - `jschat` / `jschat64` / `jschatsilent64`: macros to call the LLM from LispE
  - `Initialize`: receives system prompts, skills, tools and user data as lists
  - `systemprompt`: concatenates prompts and skills into a formatted string
  - `callchat` / `callchatsilent` / `calltool`: async wrappers for JavaScript calls
  - `entry`: the main entry point that triggers the LLM call
  - `execute_when`: schedule delayed callbacks
  - `python`: execute Python code on the server
  - `push_message`: inject a message into the chat display
- **Set** compiles and loads all Core tabs into the LispE runtime.
- **⟲ Reset** restores all libs to their default factory contents.
- Two secure inputs sit at the bottom and are accessible from LispE but **never included in session dumps**:
  - **Confidential** (multi-line textarea) — accessible via `getconfidential`
  - **Secret** (password field) — accessible via `getsecret`

---

### 📊 Data group

#### User Data

Multi-tab textarea editor for injecting context data into the conversation.
- Default tabs: `Data 0` … `Data 4` (expandable). Amber palette.
- User data is passed to the agent code and can be used to provide documents, context, or reference material.
- A **🧹 Clean All** button removes the extra tabs and clears all contents in one click.

#### Output

Multi-tab textarea editor used by the agent code (and by you) as a scratchpad for structured output.
- Default tabs: `Out 0` … `Out 4` (expandable). Emerald palette.
- Same toolbar as User Data (Load / Save / Search-Replace / Copy / Clear / 🧹 Clean All).
- Agents typically write results here via dedicated helper functions, so the chat stays focused on the dialogue.

#### Images

A gallery for managing images that can be attached to multimodal conversations.
- Add images via **Load** (local files), **🌐 URL** (remote address), or by **drag & drop**: dropping onto the gallery only stores the image; dropping onto the message box also attaches it to your next message while you keep typing.
- Each image is referenced by a 0-based index shown on its card (`#0`, `#1`, …).
- The **Image Quality** setting (see Settings) controls the `detail` level (`auto`, `low`, `high`) sent to the LLM for every image.
- Agents can inject an image programmatically with `add_image_to_chat(chat, id_image, (prompt))`, optionally bundling a text prompt with the image.

---

## LLM Server Support

| Server | Module | Default Host | API Key Required |
|--------|--------|-------------|-----------------|
| **vLLM** | `call_vllm.py` | `http://10.57.16.43:8012/v1` | No |
| **Ollama** | `call_ollama.py` | `http://localhost:11434` | No |
| **LM Studio** | `call_lmstudio.py` | `http://localhost:1234/v1` | No |
| **Claude** | `call_claude.py` | `https://api.anthropic.com` | Yes |
| **OpenAI** | `call_openai.py` | `https://api.openai.com/v1/chat/completions` | Yes |
| **Mistral** | `call_mistral.py` | `https://api.mistral.ai/v1` | Yes |

Each module implements a uniform interface: `call_llm`, `call_llm_chat`, `list_models`, `get/set_host`, `get/set_key`, `get/set_max_tokens`. The `LLMClient` class in `app.py` dynamically loads the appropriate module and delegates all calls.

All servers support **streaming responses** — the backend proxies the LLM stream chunk-by-chunk to the frontend.

---

## The Agent Pipeline

When the user clicks **Set** on the Agents panel, the following happens:

1. **Initialization code** (all Core tabs concatenated) is loaded into the LispE runtime
2. **Agent code** (all Agent tabs concatenated) is loaded into the LispE runtime — after compilation from BasAIc / Pythonic if needed
3. The `Initialize` function is called with four arguments: system prompts, skills, tools, and user data (as lists)

When the user sends a message:

1. The message is added to the chat history
2. The chat history (as a JSON array) is base64-encoded
3. The LispE `entry` function is called with the encoded chat
4. `entry` calls `call_chat` which triggers a `fetch` to the FastAPI `/chat` endpoint
5. The FastAPI backend forwards the request to the configured LLM server (with streaming)
6. The streamed response is displayed in the chat
7. The `entrypoint` callback receives the full response and can process it further (call tools, chain LLM calls, write to the Output panel, execute Python on the server, …)

This architecture means **you can write arbitrarily complex agent logic** in LispE, BasAIc or Pythonic: multi-step reasoning, MCP tool orchestration, conditional branching, retry loops, parallel LLM calls, server-side Python execution — all from within the browser.

---

## File Structure

```
PREDIBAG/
├── app.py                    # FastAPI backend (API + HTML serving)
├── call_vllm.py              # vLLM connector (OpenAI-compatible)
├── call_ollama.py            # Ollama LLM connector
├── call_lmstudio.py          # LM Studio connector
├── call_claude.py            # Anthropic Claude connector
├── call_openai.py            # OpenAI connector
├── call_mistral.py           # Mistral connector
├── filters.py                # Code block extraction from LLM responses
├── predicate.py              # Predicate / pattern matching utilities
├── tools.py                  # FastAPI APIRouter: MCP proxy & Atlassian / Confluence routes
├── session_store.py          # Server-side session storage helpers
├── validate.py               # Validation utilities
├── lispe/
│   ├── lispe.js              # LispE WASM loader
│   ├── lispe.wasm            # LispE interpreter (WebAssembly)
│   └── lispe_functions.js    # JS ↔ LispE bridge functions
├── templates/
│   ├── index.html            # Main web interface (HTML shell)
│   ├── style.css             # Stylesheet
│   ├── tools.js              # Client-side tool implementations called from LispE
│   ├── app-core.js           # Core boot / state / panel-group orchestration
│   ├── app-chat.js           # Chat tabs, messaging, streaming
│   ├── app-tabs.js           # Generic multi-tab editor logic
│   ├── app-agents.js         # Agents panel, mode toggle, Set & compile flow
│   ├── app-editors.js        # CodeMirror integration & shared editor utilities
│   ├── app-sessions.js       # Session tree, save / load / archive
│   ├── app-server.js         # LLM server selection & backend bridge
│   ├── app-search-api.js     # Search & replace, API helpers
│   ├── app-connectors-ui.js  # Connectors (MCP) panel UI
│   └── app-images.js         # Images gallery, drag & drop, multimodal attach
├── data/                     # Sample data files (JSON, LispE scripts)
├── docs/                     # Documentation and reference materials
├── scripts/                  # Auxiliary scripts
└── Python_lib/               # Python helpers used by server-side execution
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ModuleNotFoundError` on startup | Run `pip install fastapi uvicorn requests fastmcp` |
| `PyMuPDF is not installed` on PDF ingest | Run `pip install pymupdf` |
| Connection error to LLM server | Verify the server is running and the host URL is correct in Settings |
| Model not found | Ensure the model is loaded / available on your LLM server |
| No models in dropdown | Click **Set** next to the LLM Server selector to refresh the connection |
| Agent code not executing | Click **Set** in the Agents panel to (re)load Core + Agent code into the runtime |
| BasAIc / Pythonic code not running | Press **Compile** after toggling the mode, then **Set** / **▶ Run** |
| Session not appearing | Sessions are stored per-server — switch to the correct LLM server |
| API key lost after reload | Set the API key in Settings; it persists in `localStorage` per server |
| MCP tools missing | Open the Connectors sub-tab, **Connect**, then **🔍 Fetch** to refresh the tool list |
