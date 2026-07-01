// =============================================
// AGENTS - CodeMirror editor + tab management
// =============================================
const agentTabsBar = document.getElementById('agentTabsBar');
const addAgentTabButton = document.getElementById('addAgentTabButton');
let agentsEditor = null;

// Track agent tab names and current tab
let agentTabNames = ['Agent 0', 'Agent 1', 'Agent 2', 'Agent 3', 'Agent 4'];
let currentAgentTab = 'Agent 0';
let agentCounter = 4;

// Merge mode: when true (default) all agent tabs are merged into a single code.
// When false, only the "active agent" (currentAgentTab) is compiled / executed.
let agentMergeMode = true;

// Store agent content per tab
const allAgentContents = {};
agentTabNames.forEach(name => { allAgentContents[name] = ''; });

// Undo stack for deleted Agent tabs
const agentDeletedTabsStack = [];
const undoAgentTabButton = document.getElementById('undoAgentTabButton');

function updateUndoAgentButton() {
    undoAgentTabButton.style.display = agentDeletedTabsStack.length > 0 ? '' : 'none';
}

function clearAgentUndoStack() {
    agentDeletedTabsStack.length = 0;
    updateUndoAgentButton();
}

function renumberAgentTabs() {
    const contents = agentTabNames.map(name => allAgentContents[name] || '');
    const modes = agentTabNames.map(name => agentModes[name] || 'basic');
    const compiled = agentTabNames.map(name => agentCompiledCache[name] || null);
    const viewing = agentTabNames.map(name => agentViewingCompiled[name] || false);
    const newNames = contents.map((_, i) => `Agent ${i}`);

    agentTabNames.length = 0;
    newNames.forEach(n => agentTabNames.push(n));
    Object.keys(allAgentContents).forEach(k => delete allAgentContents[k]);
    Object.keys(agentModes).forEach(k => delete agentModes[k]);
    Object.keys(agentCompiledCache).forEach(k => delete agentCompiledCache[k]);
    Object.keys(agentViewingCompiled).forEach(k => delete agentViewingCompiled[k]);
    newNames.forEach((name, i) => {
        allAgentContents[name] = contents[i];
        agentModes[name] = modes[i];
        if (compiled[i]) agentCompiledCache[name] = compiled[i];
        agentViewingCompiled[name] = viewing[i];
    });
    agentCounter = newNames.length - 1;

    agentTabsBar.querySelectorAll('.agent-tab-btn').forEach(btn => btn.remove());

    newNames.forEach((name) => {
        const btn = document.createElement('button');
        btn.className = 'agent-tab-btn bg-purple-100 text-purple-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.agent = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchAgentTab(name));
        agentTabsBar.insertBefore(btn, addAgentTabButton);
    });
}

// Default code for LispE and Basic modes
const lispeDefaultCode = `
; THIS THE ENTRY POINT OF THE LMM CALL
(defun entry(chat)
    (setq chat (jsjson chat)) ; conversion from JS
    (callchat chat 'entrypoint))

(defun entrypoint(chat)
    (setq chat (jsjson chat)) ; conversion from JS
    (println (@ chat -1 "content")))

; Build the full system prompt by concatenating prompts, skills and tools sections
(defun systemprompt()
   (setq aprompt (+ (join theprompts "\\n") "\\n"))
   (setq _sk (filterlist (lambda(x) (neq (trim x) "")) theskills))
   (if _sk
      (+= aprompt "<skills>\\n" (join _sk "\\n") "</skills>\\n")
   )
   (setq _tl (filterlist (lambda(x) (neq (trim x) "")) thetools))
   (if _tl
      (+= aprompt "<tools>\\n" (join _tl "\\n") "</tools>\\n")
   )
   aprompt
)
`;

const basicDefaultCode = `
REM THIS THE ENTRY POINT OF THE LMM CALL
functionjs entry(chat)
    callchat(chat, 'entrypoint')
endfunctionjs

functionjs entrypoint(chat)
   println(chat[-1,"content"])
endfunctionjs

REM Build the full system prompt by concatenating prompts, skills and tools sections
function systemprompt()
   aprompt = theprompts.join("\\n") + "\\n"
   _sk = filterlist([lambda(x) x.trim() != ""], theskills)
   if len(_sk) != 0
      aprompt += "<skills>\\n" + _sk.join("\\n") + "</skills>\\n"
   endif
   _tl = filterlist([lambda(x) x.trim() != ""], thetools)
   if len(_tl) != 0
      aprompt += "<tools>\\n" + _tl.join("\\n") + "</tools>\\n"
   endif
   return aprompt
endfunction

`;

const pythonDefaultCode = `
# THIS THE ENTRY POINT OF THE LMM CALL
defjs entry(chat):
    callchat(chat, 'entrypoint')

defjs entrypoint(chat):
    println(chat[-1,"content"])


# Build the full system prompt by concatenating prompts, skills and tools sections
def systemprompt():
   aprompt = "\\n".join(theprompts) + "\\n"
   _sk = filterlist([lambda(x) x.trim() != ""], theskills)
   if len(_sk) != 0:
      aprompt += "<skills>\\n" + "\\n".join(_sk) + "</skills>\\n"

   _tl = filterlist([lambda(x) x.trim() != ""], thetools)
   if len(_tl) != 0:
      aprompt += "<tools>\\n" + "\\n".join(_tl) + "</tools>\\n"
   return aprompt

`;

allAgentContents['Agent 0'] = pythonDefaultCode;

// =============================================
// BASIC MODE: per-tab mode tracking and transpiler cache
// =============================================
// Mode per agent tab: 'lispe' or 'basic'
const agentModes = {};
agentTabNames.forEach(name => { agentModes[name] = 'python'; });

// Cache for compiled LispE code per tab (only when in Basic mode)
const agentCompiledCache = {};

// Whether we're viewing compiled output (read-only) vs editing
const agentViewingCompiled = {};
agentTabNames.forEach(name => { agentViewingCompiled[name] = false; });

// Cache for Basic transpiler source files (loaded once)
let basicTranspilerLoaded = false;
let basicLispSource = '';
let transpilerLispSource = '';

// Load basic.lisp and transpiler.lisp from server
async function loadBasicTranspilerFiles() {
    if (basicTranspilerLoaded) return true;
    try {
        const resp = await fetch(API_BASE_URL + '/get_basic_files');
        const data = await resp.json();
        if (data.status === 'success') {
            basicLispSource = data.basic;
            transpilerLispSource = data.transpiler;
            basicTranspilerLoaded = true;
            return true;
        } else {
            console.error('Failed to load basic files:', data.message);
            return false;
        }
    } catch (e) {
        console.error('Error loading basic transpiler files:', e);
        return false;
    }
}

// Compile Basic code to LispE using the WASM LispE interpreter
function compileBasicToLispE(basicCode) {
    if (!basicTranspilerLoaded) {
        console.error('BasAIc transpiler not loaded');
        return null;
    }
    try {
        // We use a secondary LispE interpreter to avoid polluting the main one
        const tempIdx = callCreateLispE();
        try {
            // Load the Basic parser
            callEvalLispE(tempIdx, basicLispSource);
            // Load the transpiler
            callEvalLispE(tempIdx, transpilerLispSource);
            // Call compile with the Basic code, encoding it to avoid quote issues
            const encoded = unicodeBtoa(basicCode);
            const result = callEvalLispE(tempIdx, `(compile (atob \u00AB${encoded}\u00BB))`);
            return result;
        } finally {
            callCleanLispE(tempIdx);
        }
    } catch (e) {
        console.error('BasAIc compilation error:', e);
        return 'Error: ' + (e.message || e);
    }
}

// Compile Python-mode Basic code to LispE using compilepython
function compilePythonToLispE(pythonCode) {
    if (!basicTranspilerLoaded) {
        console.error('BasAIc transpiler not loaded');
        return null;
    }
    try {
        const tempIdx = callCreateLispE();
        try {
            callEvalLispE(tempIdx, basicLispSource);
            callEvalLispE(tempIdx, transpilerLispSource);
            const encoded = unicodeBtoa(pythonCode);
            const result = callEvalLispE(tempIdx, `(compilepython (atob \u00AB${encoded}\u00BB))`);
            return result;
        } finally {
            callCleanLispE(tempIdx);
        }
    } catch (e) {
        console.error('Python compilation error:', e);
        return 'Error: ' + (e.message || e);
    }
}

// Evaluate Python-mode code: compile to LispE then execute
function evalPythonToLispE(pythonCode) {
    pythonCode = unicodeAtob(pythonCode);

    const lispeCode = compilePythonToLispE(pythonCode);
    if (!lispeCode || lispeCode.startsWith('Error:')) {
        return lispeCode;
    }

    try {
        const tempIdx = callCreateLispE();
        try {
            return callEvalLispE(tempIdx, lispeCode);
        } finally {
            callCleanLispE(tempIdx);
        }
    } catch (e) {
        console.error('Python evaluation error:', e);
        return 'Error: ' + (e.message || e);
    }
}

// Evaluate a LispE code string in a fresh dedicated interpreter
function evalLispECode(code) {
    code = unicodeAtob(code);
    try {
        const tempIdx = callCreateLispE();
        try {
            return callEvalLispE(tempIdx, code);
        } finally {
            callCleanLispE(tempIdx);
        }
    } catch (e) {
        console.error('LispE evaluation error:', e);
        return 'Error: ' + (e.message || e);
    }
}

// Update the toggle button label and Compile button visibility
function updateBasicModeUI() {
    const toggleBtn = document.getElementById('toggleBasicModeButton');
    const compileBtn = document.getElementById('compileBasicButton');
    const mode = agentModes[currentAgentTab] || 'lispe';
    const viewing = agentViewingCompiled[currentAgentTab] || false;

    // Check if toggle is allowed: content must be empty or match the default for the current mode
    const content = agentsEditor ? agentsEditor.getValue().trim() : (allAgentContents[currentAgentTab] || '').trim();
    const defaultForMode = { 'lispe': lispeDefaultCode, 'basic': basicDefaultCode, 'python': pythonDefaultCode };
    const isDefault = !content || content === (defaultForMode[mode] || lispeDefaultCode).trim();

    const modeLabels = { 'lispe': 'LispE', 'basic': 'BasAIc', 'python': 'Pythonic' };
    toggleBtn.textContent = modeLabels[mode] || 'LispE';
    toggleBtn.style.background = mode === 'basic' ? '#b35c2a' : mode === 'python' ? '#306998' : '';
    toggleBtn.style.color = (mode === 'basic' || mode === 'python') ? '#fff' : '';
    toggleBtn.disabled = !isDefault;
    toggleBtn.style.opacity = isDefault ? '1' : '0.5';
    toggleBtn.style.cursor = isDefault ? 'pointer' : 'not-allowed';

    if (mode === 'basic' || mode === 'python') {
        compileBtn.style.display = '';
        compileBtn.textContent = viewing ? 'Edit' : 'Compile';
    } else {
        compileBtn.style.display = 'none';
    }

    // Show/hide Tab→Space button (Pythonic mode only)
    const tabsBtn = document.getElementById('tabsToSpacesAgentsButton');
    if (tabsBtn) {
        tabsBtn.style.display = (mode === 'python' && !viewing) ? '' : 'none';
    }

    // Update CodeMirror mode
    if (agentsEditor) {
        const wrapper = agentsEditor.getWrapperElement();
        if (viewing) {
            agentsEditor.setOption('mode', 'scheme');
            agentsEditor.setOption('readOnly', true);
            agentsEditor.setOption('indentUnit', 2);
            agentsEditor.setOption('tabSize', 2);
            wrapper.classList.remove('basic-mode');
        } else if (mode === 'python') {
            agentsEditor.setOption('mode', {
                name: 'python',
                version: 3,
                extra_keywords: ['rule', 'rulejs', 'defjs', 'pattern', 'patternjs', 'true', 'false'],
                extra_builtins: ['println', 'callchat', 'callchatsilent', 'calltool',
                    'execute_when', 'read_input', 'push_message',
                    'jsjson', 'jschat', 'convertjs', 'json_parse',
                    'clean_display', 'save_session', 'display_page',
                    'getconfidential', 'getsecret', 'atob', 'btoa']
            });
            agentsEditor.setOption('readOnly', false);
            agentsEditor.setOption('indentUnit', 4);
            agentsEditor.setOption('tabSize', 4);
            agentsEditor.setOption('indentWithTabs', false);
            wrapper.classList.add('basic-mode');
        } else if (mode === 'basic') {
            agentsEditor.setOption('mode', 'basic');
            agentsEditor.setOption('readOnly', false);
            agentsEditor.setOption('indentUnit', 2);
            agentsEditor.setOption('tabSize', 2);
            wrapper.classList.add('basic-mode');
        } else {
            agentsEditor.setOption('mode', 'scheme');
            agentsEditor.setOption('readOnly', false);
            agentsEditor.setOption('indentUnit', 2);
            agentsEditor.setOption('tabSize', 2);
            wrapper.classList.remove('basic-mode');
        }
    }
}

// Toggle LispE/BasAIc/Python mode button
document.getElementById('toggleBasicModeButton').addEventListener('click', () => {
    saveCurrentAgentToMemory();
    const mode = agentModes[currentAgentTab] || 'lispe';
    const content = (allAgentContents[currentAgentTab] || '').trim();

    // Only allow toggle if content is empty or matches the default for current mode
    const defaultForMode = { 'lispe': lispeDefaultCode, 'basic': basicDefaultCode, 'python': pythonDefaultCode };
    const isDefault = !content || content === (defaultForMode[mode] || lispeDefaultCode).trim();
    if (!isDefault) return;

    // Cycle through modes: lispe → basic → python → lispe
    const modeCycle = { 'lispe': 'basic', 'basic': 'python', 'python': 'lispe' };
    const newMode = modeCycle[mode] || 'basic';
    agentModes[currentAgentTab] = newMode;
    agentViewingCompiled[currentAgentTab] = false;
    delete agentCompiledCache[currentAgentTab];

    // Replace content with the default code for the new mode (only for Agent 0)
    if (currentAgentTab === 'Agent 0') {
        const newDefault = defaultForMode[newMode] || lispeDefaultCode;
        allAgentContents[currentAgentTab] = newDefault;
        if (agentsEditor) agentsEditor.setValue(newDefault);
    } else {
        allAgentContents[currentAgentTab] = '';
        if (agentsEditor) agentsEditor.setValue('');
    }

    updateBasicModeUI();
});

// Tab→Space button for Agents (Pythonic mode)
document.getElementById('tabsToSpacesAgentsButton').addEventListener('click', () => {
    if (agentsEditor) {
        const code = agentsEditor.getValue();
        const normalized = code.replace(/\t/g, '    ');
        if (code !== normalized) {
            agentsEditor.setValue(normalized);
        }
    }
});

// Compile / Edit button
document.getElementById('compileBasicButton').addEventListener('click', async () => {
    const viewing = agentViewingCompiled[currentAgentTab] || false;
    if (viewing) {
        // Switch back to editing source
        agentViewingCompiled[currentAgentTab] = false;
        if (agentsEditor) {
            agentsEditor.setValue(allAgentContents[currentAgentTab] || '');
        }
        updateBasicModeUI();
    } else {
        // Compile to LispE and show result
        saveCurrentAgentToMemory();
        const basicCode = allAgentContents[currentAgentTab] || '';
        if (!basicCode.trim()) return;

        // Ensure transpiler files are loaded
        const loaded = await loadBasicTranspilerFiles();
        if (!loaded) {
            alert('Could not load transpiler files from server.');
            return;
        }

        const mode = agentModes[currentAgentTab] || 'basic';
        const compiled = mode === 'python' ? compilePythonToLispE(basicCode) : compileBasicToLispE(basicCode);
        if (compiled !== null) {
            agentCompiledCache[currentAgentTab] = compiled;
            agentViewingCompiled[currentAgentTab] = true;
            if (agentsEditor) {
                agentsEditor.setValue(compiled);
            }
            updateBasicModeUI();
        }
    }
});

// Initialize CodeMirror for the Agents section
agentsEditor = CodeMirror.fromTextArea(document.getElementById('agentsCodeInput'), {
    mode: 'scheme',
    theme: 'dracula',
    lineNumbers: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    lineWrapping: true
});
agentsEditor.setSize(null, '100%');
agentsEditor.setValue(allAgentContents['Agent 0']);

// Set initial mode UI for agents (default mode is 'python')
updateBasicModeUI();

// Update toggle button state when editor content changes
agentsEditor.on('change', () => {
    // Invalidate compiled cache for current tab on any edit
    delete agentCompiledCache[currentAgentTab];
    markSessionModified();
    updateBasicModeUI();
});

// =============================================
// AUTOCOMPLETE: suggest function names from Initialize tabs
// =============================================

// Built-in system functions available for 3-char autocomplete
const builtinFunctionSuggestions = {
    'typestr(o)': 'returns the type of an object as a string',
    'add_to_chat(chat msg (push_in) (tab))': 'Add a msg to the chat. The role is chosen according to the last role in the chat',
    'pushUserDataValue(texte)': 'Add a new User Data tab with the given value, returns tab id (e.g. "Data 5")',
    'getUserData()': 'Return a list containing all User Data field values',
    'getUserDataValue(idx)': 'Return the value of a specific User Data field by index (0 = Data 0)',
    'pushOutputDataValue(texte)': 'Add a new Output tab with the given value, returns tab id (e.g. "Out 5")',
    'resetOutputData()': 'Clear all Output tabs so the next pushOutputDataValue starts at "Out 0" (use Output like a list)',
    'setUserData(mydata)': 'Push a list of values into the User Data section',
    'setUserDataValue(idx texte)': 'Update a single User Data field by index (0 = Data 0)',
    'setOutputData(mydata)': 'Push a list of values into the Output section',
    'setOutputDataValue(idx texte)': 'Update a single Output field by index (0 = Out 0)',
    'getOutputData()': 'Return a list containing all Output field values',
    'getOutputDataValue(idx)': 'Return the value of a specific Output field by index (0 = Out 0)',
    'getUserDataSize()': 'Return the number of User Data tabs',
    'getOutputSize()': 'Return the number of Output tabs',
    'getImageSize()': 'Return the number of images in the Images gallery',
    'getImageValue(idx)': 'Return image idx as {"name" "src" "isUrl"} (src = data URL or http URL)',
    'getImageData()': 'Return all images as a list of {"name" "src" "isUrl"} dictionaries',
    'pushImageValue(img)': 'Add an image {"name" "src" "isUrl"} to the gallery, returns its index',
    'add_image_to_chat(chat id_image (prompt))': 'Register image id_image into chat as a user message, with an optional text prompt (local or URL)',
    'callchat(prompts endpoint (a1) (a2) (a3))': 'Send prompts to the LLM and call endpoint with the response',
    'callchatsilent(prompts endpoint (a1) (a2) (a3))': 'Send prompts to the LLM silently and call endpoint with the response',
    'callchatserver(key prompts endpoint (a1) (a2) (a3))': 'Send prompts to a specific server/model and call endpoint with the response',
    'callchatserversilent(key prompts endpoint (a1) (a2) (a3))': 'Send prompts silently to a specific server/model and call endpoint',
    'calltool(toolcall data endpoint (a1) (a2) (a3))': 'Call a custom JS tool function with data, then invoke endpoint',
    'call_mcp(server tool arguments endpoint (a1) (a2) (a3))': 'Call an MCP server tool with arguments, then invoke endpoint',
    'push_message(msg (tab))': 'Display a message in the chat as an assistant bubble',
    'push_request(msg (tab))': 'Display a message in the chat as a user bubble',
    'input_chat(msg (tab))': 'Simulate a user message in a chat tab and trigger entry(prompts)',
    'clean_display()': 'Clear the Display output zone',
    'execute_when(time endpoint (data))': 'Schedule a function call after a delay (in ms)',
    'read_input(msg endpoint)': 'Open an input dialog, then call endpoint with the response',
    'save_session()': 'Save the current session',
    'web_search(query endpoint (max_results))': 'Search the web via DuckDuckGo and call endpoint with results',
    'fetch_page(url endpoint)': 'Fetch a URL and call endpoint with the content',
    'fetch_feed(url endpoint (max_items))': 'Fetch and parse a RSS/Atom feed and call endpoint with the normalized items',
    'shell(command endpoint (timeout))': 'Execute a shell command and call endpoint with the result',
    'parse_csv(content (delimiter) (has_header))': 'Parse a CSV string and return a dict with headers and rows',
    'getconfidential()': 'Retrieve the content of the Confidential field',
    'getsecret()': 'Retrieve the content of the Secret field',
    'getChatName()': 'Return the name of the current Chat tab',
    'getChatValue(tab_name)': 'Return the chat history of a specific tab as a list of dictionaries',
    'setChatValue(tab_name chat)': 'Replace a chat tab content with a list of {role, content} dicts',
    'pushChatTab()': 'Add a new chat tab and return its name',
    'getChatSize()': 'Return the number of chat tabs',
    'systemprompt()': 'Build the full system prompt from prompts, skills and tools',
    'clean_html(txt)': 'Strip HTML tags from a text string',
    'open_html(html)': 'Open an HTML string in a new browser tab',
    'display_page(url)': 'Fetch a URL and render its HTML in the Display zone',
    'store_session(path)': 'Store the current session to a file on disk (server side)',
    'store_data(path data)': 'Store a string to a file on disk (server side, where app.py runs)',
    'upload_data(data name (directory))': 'Save data on the user\'s machine. Empty/omitted directory = silent download to Downloads folder (works everywhere). Non-empty directory opens a native Save As dialog on Chrome/Edge/Brave/Opera (directory may be desktop, documents, downloads, music, pictures, videos to start there); ignored on Safari/Firefox.',
    'load_data(path)': 'Load a file from disk and return its content',
    'eval_python(code)': 'Evaluate Pythonic code: compile to LispE then execute synchronously',
    'eval_code(code)': 'Evaluate a LispE code string in a fresh dedicated interpreter',
    'add_pdf_to_chat(chat id_pdf (prompt) (mode))': 'Ingest a PDF stored in the PDF section (by 0-based index) into a chat; per page the backend sends extracted text or a rendered image. mode: auto|text|vision',
    'load_pdf(source (mode))': 'Synchronously analyse a PDF (disk path, http(s) URL or base64 data URL) and return a list of LLM content parts (text and/or image_url), without touching any chat. mode: auto|text|vision',
    'getPdfSize()': 'Return the number of stored PDFs (dropped or added by URL/path)',
    'getPdfValue(idx)': 'Return a stored PDF as a dict {name, src, isUrl}',
    'getPdfData()': 'Return all stored PDFs as a list of dicts {name, src, isUrl}',
};

// Extract all function/macro names with descriptions from Initialize tabs
function getInitFunctionNames() {
    const funcs = Object.assign({}, builtinFunctionSuggestions);
    for (const tabName of initTabNames) {
        const code = allInitContents[tabName] || '';
        const lines = code.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(/\(\s*(?:defun|defmacro|defpat|deflib)\s+(\w+(?:\([^)]*\))?)/);
            if (!match) continue;
            const signature = match[1];
            // Skip if a key with the same function name already exists
            const baseName = signature.split('(')[0];
            const alreadyExists = Object.keys(funcs).some(k => k.split('(')[0] === baseName);
            if (alreadyExists) continue;
            // Collect comment lines immediately above the definition
            let desc = '';
            let j = i - 1;
            while (j >= 0 && /^\s*;/.test(lines[j])) {
                desc = lines[j].replace(/^\s*;+\s*/, '').trim();
                j--;
            }
            funcs[signature] = desc;
        }
    }
    return funcs;
}

// Hint function for Initialize function names
function initFunctionHint(editor) {
    const cur = editor.getCursor();
    const line = editor.getLine(cur.line);
    // Walk backward from cursor to find the start of the current word
    let start = cur.ch;
    while (start > 0 && /\w/.test(line[start - 1])) start--;
    const partial = line.substring(start, cur.ch).toLowerCase();
    if (partial.length < 3) return null;

    const funcs = getInitFunctionNames();
    const filtered = Object.keys(funcs)
        .filter(n => n.split('(')[0].toLowerCase().startsWith(partial))
        .sort();
    if (filtered.length === 0) return null;

    return {
        list: filtered.map(n => ({
            text: n.split('(')[0],
            displayText: funcs[n] ? n + ' — ' + funcs[n] : n
        })),
        from: CodeMirror.Pos(cur.line, start),
        to: CodeMirror.Pos(cur.line, cur.ch)
    };
}

// Autocomplete for agents editor is attached via attachSmartAutocomplete in app-editors.js

// Drag-to-resize for agents editor
(function() {
    const container = document.getElementById('agentsEditorContainer');
    const handle = document.getElementById('agentsResizeHandle');
    let startY, startH;
    handle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        startY = e.clientY;
        startH = container.offsetHeight;
        function onMove(e) {
            const newH = Math.max(150, startH + (e.clientY - startY));
            container.style.height = newH + 'px';
            agentsEditor.setSize(null, newH);
        }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
})();

// Drag-to-resize for chat section
(function() {
    const chatSection = document.getElementById('chatSection');
    const handle = document.getElementById('chatResizeHandle');
    let startY, startH;
    handle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        startY = e.clientY;
        startH = chatSection.offsetHeight;
        function onMove(e) {
            const newH = Math.max(300, startH + (e.clientY - startY));
            chatSection.style.height = newH + 'px';
        }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
})();

function saveCurrentAgentToMemory() {
    if (agentsEditor) {
        // Don't save compiled output back as source
        if (!agentViewingCompiled[currentAgentTab]) {
            const newContent = agentsEditor.getValue();
            // In Active Agent mode we display the default init code for an empty
            // tab; if it was left untouched, keep the tab empty (don't persist it).
            if (!agentMergeMode && (allAgentContents[currentAgentTab] || '') === '' && newContent === pythonDefaultCode) {
                return;
            }
            // Invalidate cache if content changed
            if (allAgentContents[currentAgentTab] !== newContent) {
                delete agentCompiledCache[currentAgentTab];
            }
            allAgentContents[currentAgentTab] = newContent;
        }
    }
}

function switchAgentTab(tabName, skipSave = false) {
    if (!skipSave) saveCurrentAgentToMemory();
    // Deactivate all tab buttons
    agentTabsBar.querySelectorAll('.agent-tab-btn').forEach(btn => {
        btn.classList.remove('bg-purple-200', 'font-semibold');
        btn.classList.add('bg-purple-100');
    });
    // Activate selected tab
    const activeBtn = agentTabsBar.querySelector(`.agent-tab-btn[data-agent="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-purple-100');
        activeBtn.classList.add('bg-purple-200', 'font-semibold');
    }
    currentAgentTab = tabName;
    // Ensure mode exists for this tab
    if (!agentModes[tabName]) agentModes[tabName] = 'python';
    if (agentViewingCompiled[tabName] === undefined) agentViewingCompiled[tabName] = false;

    // Load content into CodeMirror
    if (agentsEditor) {
        if (agentViewingCompiled[tabName] && agentCompiledCache[tabName]) {
            agentsEditor.setValue(agentCompiledCache[tabName]);
        } else {
            let val = allAgentContents[tabName] || '';
            // In Active Agent mode, show the default init code for an empty tab
            if (!val && !agentMergeMode) val = pythonDefaultCode;
            agentsEditor.setValue(val);
        }
    }
    // Update Basic mode UI for the new tab
    updateBasicModeUI();
    // Keep the "active agent" field in sync when merge mode is off
    if (typeof syncActiveAgentField === 'function') syncActiveAgentField();
}

// Attach click listeners to initial agent tabs
agentTabsBar.querySelectorAll('.agent-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchAgentTab(btn.dataset.agent));
});

// Add new agent tab
addAgentTabButton.addEventListener('click', () => {
    agentCounter++;
    const newName = `Agent ${agentCounter}`;
    agentTabNames.push(newName);
    allAgentContents[newName] = '';
    agentModes[newName] = 'python';
    agentViewingCompiled[newName] = false;

    const newBtn = document.createElement('button');
    newBtn.className = 'agent-tab-btn bg-purple-100 text-purple-900 text-xs px-3 py-1 rounded-t';
    newBtn.dataset.agent = newName;
    newBtn.textContent = newName;
    newBtn.addEventListener('click', () => switchAgentTab(newName));
    agentTabsBar.insertBefore(newBtn, addAgentTabButton);

    switchAgentTab(newName);
});

// Reset all agent tabs to initial state (5 empty tabs)
function resetAgentTabs() {
    // Remove all tab buttons except the '+' button
    agentTabsBar.querySelectorAll('.agent-tab-btn').forEach(btn => btn.remove());
    // Clear contents
    Object.keys(allAgentContents).forEach(k => delete allAgentContents[k]);
    // Clear modes
    Object.keys(agentModes).forEach(k => delete agentModes[k]);
    Object.keys(agentCompiledCache).forEach(k => delete agentCompiledCache[k]);
    Object.keys(agentViewingCompiled).forEach(k => delete agentViewingCompiled[k]);
    // Reset to 5 default tabs
    agentTabNames.length = 0;
    agentCounter = 4;
    agentDeletedTabsStack.length = 0;
    updateUndoAgentButton();
    const defaultNames = ['Agent 0', 'Agent 1', 'Agent 2', 'Agent 3', 'Agent 4'];
    defaultNames.forEach(name => {
        agentTabNames.push(name);
        allAgentContents[name] = '';
        agentModes[name] = 'python';
        agentViewingCompiled[name] = false;
        const btn = document.createElement('button');
        btn.className = 'agent-tab-btn bg-purple-100 text-purple-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.agent = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchAgentTab(name));
        agentTabsBar.insertBefore(btn, addAgentTabButton);
    });
    // Restore default code for Agent 0
    allAgentContents['Agent 0'] = pythonDefaultCode;
    currentAgentTab = 'Agent 0';
    switchAgentTab('Agent 0', true); // skipSave to avoid overwriting with stale editor content
}

// Get all agent contents (for config save/load)
function getAllAgentContents() {
    saveCurrentAgentToMemory();
    return JSON.parse(JSON.stringify(allAgentContents));
}

// Get all agent modes (for config save/load)
function getAllAgentModes() {
    return JSON.parse(JSON.stringify(agentModes));
}

// Get merged agent code (all tabs concatenated)
// For Basic/Python mode tabs, compile to LispE first
async function getMergedAgentsCodeAsync() {
    saveCurrentAgentToMemory();
    const parts = [];
    const names = agentMergeMode ? agentTabNames : [currentAgentTab];
    for (const name of names) {
        let code = (allAgentContents[name] || '').trim();
        let mode = agentModes[name] || 'lispe';
        if (!code) {
            // In Active Agent mode, an empty agent falls back to the default init code
            if (!agentMergeMode) { code = pythonDefaultCode.trim(); mode = 'python'; }
            else continue;
        }
        if (mode === 'basic' || mode === 'python') {
            // Compile to LispE using secondary interpreter (for preview)
            const loaded = await loadBasicTranspilerFiles();
            if (!loaded) {
                console.error('Cannot load transpiler for tab', name);
                continue;
            }
            const compiled = mode === 'python' ? compilePythonToLispE(code) : compileBasicToLispE(code);
            if (compiled && !compiled.startsWith('Error:')) {
                parts.push(compiled);
            } else {
                console.error('Compile error in tab', name, ':', compiled);
            }
        } else {
            parts.push(code);
        }
    }
    return parts.join('\n\n');
}

// Compile all Basic/Python tabs using interpreter 0 (transpiler must already be loaded in it)
// Returns true if all compilations succeeded, false otherwise
function compileAllBasicTabs() {
    saveCurrentAgentToMemory();
    const names = agentMergeMode ? agentTabNames : [currentAgentTab];
    for (const name of names) {
        let code = (allAgentContents[name] || '').trim();
        let mode = agentModes[name] || 'lispe';
        if (!code) {
            // In Active Agent mode, an empty agent falls back to the default init code
            if (!agentMergeMode) { code = pythonDefaultCode.trim(); mode = 'python'; }
            else continue;
        }
        if (mode === 'basic' || mode === 'python') {
            try {
                const encoded = unicodeBtoa(code);
                const compileFunc = mode === 'python' ? 'compilepython' : 'compile';
                const compiled = callEvalLispE(0, `(${compileFunc} (atob \u00AB${encoded}\u00BB))`);
                if (compiled && !compiled.startsWith('Error:')) {
                    agentCompiledCache[name] = compiled;
                } else {
                    console.error('Compile error in tab', name, ':', compiled);
                    return false;
                }
            } catch (e) {
                console.error('Compilation error in tab', name, ':', e);
                return false;
            }
        }
    }
    return true;
}

// Get merged agents code: uses cached compiled code for Basic/Python tabs, raw code for LispE tabs
// Must be called after compileAllBasicTabs() for Basic/Python tabs
function getMergedAgentsCode() {
    saveCurrentAgentToMemory();
    const parts = [];
    const names = agentMergeMode ? agentTabNames : [currentAgentTab];
    for (const name of names) {
        let code = (allAgentContents[name] || '').trim();
        let mode = agentModes[name] || 'lispe';
        if (!code) {
            // In Active Agent mode, an empty agent falls back to the default init code
            if (!agentMergeMode) { code = pythonDefaultCode.trim(); mode = 'python'; }
            else continue;
        }
        if (mode === 'basic' || mode === 'python') {
            if (agentCompiledCache[name]) {
                parts.push(agentCompiledCache[name]);
            } else {
                console.error('No compiled cache for tab', name);
            }
        } else {
            parts.push(code);
        }
    }
    return parts.join('\n\n');
}

// Load file into current agent tab
const loadAgentsFileButton = document.getElementById('loadAgentsFileButton');
const agentsFileInput = document.getElementById('agentsFileInput');
const clearAgentsButton = document.getElementById('clearAgentsButton');

loadAgentsFileButton.addEventListener('click', () => {
    agentsFileInput.click();
});
agentsFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (agentsEditor) {
                agentsEditor.setValue(e.target.result);
                allAgentContents[currentAgentTab] = e.target.result;
            }
        };
        reader.readAsText(file);
    }
    agentsFileInput.value = '';
});

// Clear/delete current agent tab (destroy if >5 tabs, else just clear content)
clearAgentsButton.addEventListener('click', () => {
    const tabCount = agentTabNames.length;
    if (tabCount > 5) {
        saveCurrentAgentToMemory();
        const deletedName = currentAgentTab;
        const deletedContent = allAgentContents[deletedName] || '';
        const deletedMode = agentModes[deletedName] || 'basic';
        const deletedIndex = agentTabNames.indexOf(deletedName);
        agentDeletedTabsStack.push({ content: deletedContent, mode: deletedMode, index: deletedIndex });
        updateUndoAgentButton();

        agentTabNames.splice(deletedIndex, 1);
        delete allAgentContents[deletedName];
        delete agentModes[deletedName];
        delete agentCompiledCache[deletedName];
        delete agentViewingCompiled[deletedName];

        renumberAgentTabs();

        const newIndex = Math.min(deletedIndex, agentTabNames.length - 1);
        switchAgentTab(agentTabNames[newIndex]);
    } else {
        saveCurrentAgentToMemory();
        const clearedContent = allAgentContents[currentAgentTab] || '';
        if (clearedContent) {
            const clearedName = currentAgentTab;
            const clearedMode = agentModes[clearedName] || 'basic';
            agentDeletedTabsStack.push({ content: clearedContent, mode: clearedMode, index: agentTabNames.indexOf(clearedName), cleared: true, tabName: clearedName });
            updateUndoAgentButton();
        }
        if (agentsEditor) {
            agentsEditor.setValue('');
            allAgentContents[currentAgentTab] = '';
        }
        // Move to previous tab (unless on tab 0)
        const idx = agentTabNames.indexOf(currentAgentTab);
        if (idx > 0) {
            switchAgentTab(agentTabNames[idx - 1]);
        }
    }
});

// Undo last deleted Agent tab
undoAgentTabButton.addEventListener('click', () => {
    if (agentDeletedTabsStack.length === 0) return;
    const restored = agentDeletedTabsStack.pop();
    updateUndoAgentButton();

    if (restored.cleared) {
        // Restore content in the original tab
        const tabName = restored.tabName;
        allAgentContents[tabName] = restored.content;
        agentModes[tabName] = restored.mode || 'basic';
        // Update CodeMirror if we're on the same tab so saveCurrentToMemory won't overwrite
        if (currentAgentTab === tabName && agentsEditor) {
            agentsEditor.setValue(restored.content);
        }
        switchAgentTab(tabName);
    } else {
        const insertIndex = Math.min(restored.index, agentTabNames.length);
        const tempName = `Agent __tmp_${Date.now()}`;
        agentTabNames.splice(insertIndex, 0, tempName);
        allAgentContents[tempName] = restored.content;
        agentModes[tempName] = restored.mode || 'basic';
        agentViewingCompiled[tempName] = false;

        renumberAgentTabs();

        switchAgentTab(agentTabNames[insertIndex]);
    }
});

// Copy current agent tab to clipboard
document.getElementById('copyAgentsButton').addEventListener('click', () => {
    if (agentsEditor) {
        const text = agentsEditor.getValue();
        const btn = document.getElementById('copyAgentsButton');
        navigator.clipboard.writeText(text).then(() => {
            const orig = btn.innerHTML;
            btn.innerHTML = '✓';
            setTimeout(() => { btn.innerHTML = orig; }, 1500);
        });
    }
});

// Undo/Redo in Agents editor
document.getElementById('undoAgentsButton').addEventListener('click', () => {
    if (agentsEditor) agentsEditor.undo();
});
document.getElementById('redoAgentsButton').addEventListener('click', () => {
    if (agentsEditor) agentsEditor.redo();
});

// Search/Replace in Agents editor (custom bar)
const agentsSearcher = createCodeMirrorSearcher({
    barId: 'agentsSearchBar',
    inputId: 'agentsSearchInput',
    countId: 'agentsSearchCount',
    prevId: 'agentsSearchPrev',
    nextId: 'agentsSearchNext',
    closeId: 'agentsSearchClose',
    toggleBtnId: 'searchAgentsButton',
    replaceRowId: 'agentsReplaceRow',
    replaceInputId: 'agentsReplaceInput',
    replaceBtnId: 'agentsReplaceBtn',
    replaceAllBtnId: 'agentsReplaceAllBtn',
    toggleReplaceBtnId: 'agentsToggleReplaceBtn',
    getEditor: () => agentsEditor
});

// INITIALIZATION - CodeMirror editor + tab management
// =============================================
const initTabsBar = document.getElementById('initTabsBar');
const addInitTabButton = document.getElementById('addInitTabButton');
let initializationEditor = null;

// Track init tab names and current tab
let initTabNames = ['lib 0', 'lib 1', 'lib 2', 'lib 3', 'lib 4'];
let currentInitTab = 'lib 0';
let initCounter = 4;

// Store init content per tab
const allInitContents = {};
initTabNames.forEach(name => { allInitContents[name] = ''; });

// ---- lib 1: Macros, Initialize, callchat, callchatsilent, calltool, call_mcp ----
const initDefaultCode_lib1 = `
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

; Build a JS call_chat_server expression from a config key and prompts object
(defmacro jschatserver64(key prompts)
    (+ "call_chat_server(\`" (btoa key) "\`,\`" (btoa (json prompts)) "\`);")
)

; Build a JS call_chat_server_silent expression from a config key and prompts object
(defmacro jschatserversilent64(key prompts)
    (+ "call_chat_server_silent(\`" (btoa key) "\`,\`" (btoa (json prompts)) "\`);")
)

; Strip HTML tags from a text string via the JS strip_html function
(defun clean_html(txt) (atob . evaljs (+ "strip_html(\`" (btoa txt) "\`);")))

; Encode data as base64: converts containers to JSON first, leaves strings as-is
(defun jsonp(d)
      (btoa (if (containerp d) (json d) d)))

; Extract a JSON object from a string, starting after a given command marker
(defun jsonextract(cmd str)
       (setq pos (find cmd str))
       (+= pos (size str))
       (json_parse (@ (getstruct cmd "{" "}" pos) 0)))

; Extract a JSON object from a string, starting after a given command marker
; str is the begining of this json string
(defun jsonextractwith(cmd str)
       (setq pos (find cmd str))
       (json_parse (@ (getstruct cmd "{" "}" pos) 0)))

; extract all JSON objects in a string
(defun loadjs(s)
   (setq i 0)
   (setq closing {"{":"}" "[":"]"})
   (setq l ())
   (while (>= i 0)
      (setq a (find s "{" i))
      (setq b (find s "[" i))
      (setq p (cond ((nullp a) b) ((nullp b) a) (true (min a b))))
      (ncheck p
         (setq i -1)
         (setq c (@ s p))
         (setq struc (getstruct s c (@ closing c) p))
         (maybe 
            (push l (json_parse (@ struc 0)))
            (setq i (@ struc 2))
            (setq i -1))))
   l
)

; No-op callback that logs the result to the console
(defun none(r) (console_log r))

; Default callback that prints the result to the Display zone
(defun return_value(res) (println res))

; A function to get the type of an object as a string
(defun typestr(x) (string . type x))

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

; Send prompts to a specific server/model (identified by config key) and call endpoint with the response
; The config key references a saved configuration in the confidential_server_configs table
(defun callchatserver(key prompts endpoint (a1) (a2) (a3))
    (setq endpoint (atom endpoint))
    (cond
       (a3 (asyncjs (jschatserver64 key prompts) endpoint a1 a2 a3))
       (a2 (asyncjs (jschatserver64 key prompts) endpoint a1 a2))
       (a1 (asyncjs (jschatserver64 key prompts) endpoint a1))
       (true (asyncjs (jschatserver64 key prompts) endpoint))))

; Send prompts silently to a specific server/model (identified by config key) and call endpoint with the response
(defun callchatserversilent(key prompts endpoint (a1) (a2) (a3))
    (setq endpoint (atom endpoint))
    (cond
       (a3 (asyncjs (jschatserversilent64 key prompts) endpoint a1 a2 a3))
       (a2 (asyncjs (jschatserversilent64 key prompts) endpoint a1 a2))
       (a1 (asyncjs (jschatserversilent64 key prompts) endpoint a1))
       (true (asyncjs (jschatserversilent64 key prompts) endpoint))))

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
`;

// ---- lib 2: System prompt & secrets ----
const initDefaultCode_lib2 = `

; Return the full system prompt as a base64-encoded string
(defun getsystemprompt()
   (btoa . systemprompt))

; Add a msg to the chat. The role is chosen according to the last role in the chat
(defun add_to_chat(chat msg (push_in) (tab))
    (if chat
        (block
            (setq role (@ chat -1 "role"))
            (if (eq role "user")
                (setq role "assistant")
                (setq role "user")
            )
        )
        (setq role "system")
    )
    (push chat (dictionary "role" role "content" msg))
    (if push_in
        (if (eq role "user")
            (push_request msg tab)
            (push_message msg tab)
        )
    )
    true
)

; Retrieve the content of the Confidential field from the UI
(defun getconfidential()
    (atob . evaljs "getconfidential();"))

; Retrieve the content of the Secret field from the UI
(defun getsecret()
    (atob . evaljs "getsecret();"))

; Return the name of the current Chat tab
(defun getChatName()
    (evaljs "getChatName();"))

; Return the chat history of a specific tab as a list of dictionaries
(defun getChatValue(tab_name)
    (json_parse (atob . evaljs (f_ "getChatValue(\`{btoa tab_name}\`);"))))

; Replace the chat history of a tab with a list of dicts: {role:content}
(defun setChatValue(tab_name chat)
    (evaljs (f_ "setChatValue(\`{btoa tab_name}\`, \`{btoa . json chat}\`);")))  

; Add a new chat tab and return its name
(defun pushChatTab()
    (evaljs "pushChatTab();"))

; Return the number of chat tabs
(defun getChatSize()
    (integer . evaljs "getChatSize();"))
`;

// ---- lib 3: UI interaction (chat display, user data, clean display, open HTML) ----
const initDefaultCode_lib3 = `
; Push a list of values into the User Data section 
(defun setUserData(mydata)
    (setq args (btoa . json mydata))
    (evaljs (f_ "setUserData(\`{args}\`);"))
)

; Update a single User Data field by index (0 = Data 0)
; Returns "ok" or an error message if the index is invalid
(defun setUserDataValue(idx texte)
    (setq args (btoa texte))
    (evaljs (f_ "setUserDataValue({idx}, \`{args}\`);"))
)

; Add a new User Data tab with the given value, returns the tab identifier (e.g. "Data 5")
(defun pushUserDataValue(texte)
    (setq args (btoa texte))
    (evaljs (f_ "pushUserDataValue(\`{args}\`);"))
)

; Return a list containing all User Data field values
(defun getUserData()
    (json_parse (atob . evaljs "getUserData();")))

; Return the value of a specific User Data field by index (0 = Data 0)
(defun getUserDataValue(idx)
    (atob . evaljs (f_ "getUserDataValue({idx});")))

; Return the number of User Data tabs
(defun getUserDataSize()
    (integer . evaljs "getUserDataSize();"))

; Display a message in the chat as an assistant bubble
(defun push_message(msg (tab))
    (if (nullp tab)
        (setq tab (getChatName))
    )
    (setq cmd (f_ "add_message(\' {btoa msg}\', \'{tab}\');"))
    (evaljs cmd)
)

; Display a message in the chat as a user bubble
(defun push_request(msg (tab))
    (if (nullp tab)
        (setq tab (getChatName))
    )
    (setq cmd (f_ "add_request(\' {btoa msg} \', \'{tab}\');"))
    (evaljs cmd)
)

; Simulate a user message in a chat tab and trigger entry(prompts)
(defun input_chat(msg (tab))
    (if (nullp tab)
        (setq tab (getChatName))
    )
    (setq cmd (f_ "input_chat(\' {btoa msg} \', \'{tab}\');"))
    (evaljs cmd)
)

; Clear the Display output zone
(defun clean_display()
    (evaljs "cleanDisplay();")
)

; Open an HTML string in a new browser tab
(defun open_html(html)
   (evaljs (f_ "open_html_in_tab(\`{btoa html}\`);"))
)

; Push a list of values into the Output section
(defun setOutputData(mydata)
    (setq args (btoa . json mydata))
    (evaljs (f_ "setOutputData(\`{args}\`);"))
)

; Update a single Output field by index (0 = Out 0)
; Returns "ok" or an error message if the index is invalid
(defun setOutputDataValue(idx texte)
    (setq args (btoa texte))
    (evaljs (f_ "setOutputDataValue({idx}, \`{args}\`);"))
)

; Add a new Output tab with the given value, returns the tab identifier (e.g. "Out 5")
(defun pushOutputDataValue(texte)
    (setq args (btoa texte))
    (evaljs (f_ "pushOutputDataValue(\`{args}\`);")))    

; Clear all Output tabs so the next pushOutputDataValue starts at "Out 0"
; Lets the Output zone be used like a list one pushes into from index 0
(defun resetOutputData()
    (evaljs "resetOutputData();"))

; Return a list containing all Output field values
(defun getOutputData()
    (json_parse (atob . evaljs "getOutputData();")))

; Return the value of a specific Output field by index (0 = Out 0)
(defun getOutputDataValue(idx)
    (atob . evaljs (f_ "getOutputDataValue({idx});")))

; Return the number of Output tabs
(defun getOutputSize()
    (integer . evaljs "getOutputSize();"))

; ---- Images section ----

; Return the number of images currently in the Images gallery
(defun getImageSize()
    (integer . evaljs "getImageSize();"))

; Return a specific image as a dictionary {"name":.. "src":.. "isUrl":..}
; src is a data URL (base64) for a local image, or an http(s) URL for a remote one
(defun getImageValue(idx)
    (json_parse (atob . evaljs (f_ "getImageValue({idx});"))))

; Return all images as a list of dictionaries {"name":.. "src":.. "isUrl":..}
(defun getImageData()
    (json_parse (atob . evaljs "getImageData();")))

; Add an image to the gallery from a dictionary {"name":.. "src":.. "isUrl":..}
; Returns the index of the newly added image
(defun pushImageValue(img)
    (integer . evaljs (f_ "pushImageValue(\`{btoa . json img}\`);")))

; ---- PDF store ----

; Return the number of PDFs currently stored (dropped or added by URL/path)
(defun getPdfSize()
    (integer . evaljs "getPdfSize();"))

; Return a specific stored PDF as a dictionary {"name":.. "src":.. "isUrl":..}
; src is a base64 data URL for a dropped local PDF, or an http(s) URL / path
; reference for a remote one. Pass its index to add_pdf_to_chat for processing.
(defun getPdfValue(idx)
    (json_parse (atob . evaljs (f_ "getPdfValue({idx});"))))

; Return all stored PDFs as a list of dictionaries {"name":.. "src":.. "isUrl":..}
(defun getPdfData()
    (json_parse (atob . evaljs "getPdfData();")))

; Register the image at index id_image into the given chat, as a user message,
; using the OpenAI multimodal "image_url" format. An optional text prompt is
; added as a "text" part alongside the image. Handles both local images
; (base64 data URL) and remote images (http URL) transparently, since the image
; "src" already carries the right form. Returns the updated chat.
(defun add_image_to_chat(chat id_image (prompt))
    (setq img (getImageValue id_image))
    (setq url (@ img "src"))
    (if (eq url "")
        chat
        (block
            (setq content ())
            (if (and prompt (neq prompt ""))
                (push content (dictionary "type" "text" "text" prompt))
            )
            (setq detail (getImageDetail))
            (push content (dictionary "type" "image_url"
                                      "image_url" (dictionary "url" url "detail" detail)))
            (push chat (dictionary "role" "user" "content" content))
            chat
        )
    )
)
`;

// ---- lib 4: File & session I/O ----
const initDefaultCode_lib4 = `
; Open an input dialog with a label, then call endpoint with the user's base64-encoded response
(defun read_input(msg endpoint)
    (asyncjs (f_ "read_input(\`{msg}\`);") (atom endpoint))
)

; Save the current session (prompts for a name if no session is active)
(defun save_session()
    (asyncjs "save_session();" 'none)
)

; Store the current session to a file on disk at the given path
(defun store_session(path)
    (asyncjs (+ "store_session_to_disk(\`" (btoa path) "\`);") 'return_value)
)

; Store a string to a file on disk at the given path (synchronous to avoid session reset)
; NOTE: this writes on the SERVER side (where app.py runs). To save on the
; client machine (the browser host), use upload_data below instead.
(defun store_data(path data)
    (evaljs (+ "store_data_to_disk_sync(\`" (btoa path) "\`,\`" (btoa data) "\`);"))
)

; Save \"data\" as a file named \"name\" on the USER's machine (the browser host).
;   - directory empty (or omitted): silently saved in the browser Downloads
;     folder. Works everywhere, including Safari and Firefox.
;   - directory non-empty AND browser supports the File System Access API
;     (Chrome / Edge / Brave / Opera): opens a native \"Save As\" dialog.
;     If directory is one of 'desktop', 'documents', 'downloads', 'music',
;     'pictures', 'videos', the picker starts there.
;   - On Safari and Firefox \"directory\" is ignored and the file goes to
;     the Downloads folder. No browser API allows writing to an arbitrary
;     path without user consent.
(defun upload_data(data name (directory))
    (if (nullp directory) (setq directory ""))
    (asyncjs (+ "upload_data_to_browser(\`" (btoa name) "\`,\`" (btoa data) "\`,\`" (btoa directory) "\`);") 'none)
)

; Load a file from disk and return its content as a string
(defun load_data(path)
    (atob . evaljs (+ "load_data_from_disk(\`" (btoa path) "\`);"))
)

`;

// ---- lib 5: Async, scheduling, Python, web ----
const initDefaultCode_lib5 = `
; Schedule a function call after a delay (in ms); optionally pass data to the callback
(defun execute_when(time endpoint (data))
    (if data
        (setq cmd (f_ "executewhen({time},\`{endpoint}\`, \`{jsonp data}\`);"))
        (setq cmd (f_ "executewhen0({time},\`{endpoint}\`);"))
    )
    (evaljs cmd)
)

; Fetch a URL and render its HTML content in the Display zone, then call endpoint
(defun display_page(url)
   (asyncjs (f_ "open_url(\`{btoa url}\`);") 'none)                    
)

; Fetch a URL and return its content as base64, then call endpoint
(defun fetch_page(url endpoint)
   (asyncjs (f_ "fetch_webpage(\`{btoa url}\`);") (atom endpoint))
)

; Fetch and parse a RSS/Atom feed, then call endpoint with the normalized items
; Returns a dict with keys: source, items (list of dicts with titre, lien, date, resume), count
(defun fetch_feed(url endpoint (max_items))
   (if (nullp max_items) (setq max_items 20))
   (asyncjs (f_ "fetch_feed(\`{btoa url}\`, {max_items});") (atom endpoint))
)

; Search the web via DuckDuckGo and call endpoint with the JSON results
; Returns a list of dictionaries with keys: title, href, body
(defun web_search(query endpoint (max_results))
   (if (nullp max_results) (setq max_results 10))
   (asyncjs (f_ "web_search(\`{btoa query}\`, {max_results});") (atom endpoint))
)

; Execute a shell command and call endpoint with the JSON result
; Returns a dictionary with keys: status, stdout, stderr, return_code
(defun shell(command endpoint (timeout))
   (if (nullp timeout) (setq timeout 30))
   (asyncjs (f_ "run_shell(\`{btoa command}\`, {timeout});") (atom endpoint))
)

; Parse a CSV string and return structured data (synchronous)
; Returns a dictionary with keys: headers (list of strings), rows (list of lists)
; delimiter: optional separator character (default ",")
; has_header: optional boolean, true if first row is a header (default true)
(defun parse_csv(content (delimiter) (has_header))
   (if (nullp delimiter) (setq delimiter ","))
   (if (nullp has_header) (setq has_header true))
   (json_parse . atob . evaljs (f_ "parse_csv(\`{btoa content}\`, \`{delimiter}\`, {has_header});"))
)

; Evaluate a Pythonic code string: compile to LispE then execute synchronously
(defun eval_python(code)
   (evaljs (+ "evalPythonToLispE(\`" (btoa code) "\`);")))

; Evaluate a LispE code string in a fresh dedicated interpreter
(defun eval_code(code)
   (evaljs (+ "evalLispECode(\`" (btoa code) "\`);")))

; Ingest a PDF stored in the PDF section (by its 0-based index) into the given
; chat as a single user message. The PDF source is resolved from the dedicated
; PDF gallery via getPdfValue. The backend decides, page by page, whether to
; send extracted text or a rendered image (vision), according to 'mode'
; ("auto" | "text" | "vision", default "auto"). An optional text prompt is
; added first. Returns the updated chat.
(defun add_pdf_to_chat(chat id_pdf (prompt) (mode))
   (if (nullp mode) (setq mode "auto"))
   (setq pdf (getPdfValue id_pdf))
   (setq source (@ pdf "src"))
   (if (eq source "")
      chat
      (block
         (setq spec (dictionary "source" source "kind" "auto" "mode" mode "dpi" 150))
         (setq res (json_parse (atob (evaljs (f_ "pdf_ingest_sync(\`{btoa . json spec}\`);")))))
         (if (neq (@ res "status") "success")
            chat
            (block
               (setq content ())
               (if (and prompt (neq prompt ""))
                  (push content (dictionary "type" "text" "text" prompt))
               )
               (setq detail (getImageDetail))
               (loop item (@ res "items")
                  (if (eq (@ item "kind") "text")
                     (push content (dictionary "type" "text" "text" (@ item "text")))
                     (push content (dictionary "type" "image_url"
                                               "image_url" (dictionary "url" (@ item "src") "detail" detail)))
                  )
               )
               (push chat (dictionary "role" "user" "content" content))
               chat
            )
         )
      )
   )
)

; Analyse a PDF and return its content as a list of LLM content parts, WITHOUT
; touching any chat. 'source' is a disk path, an http(s) URL, or a base64 data
; URL. The backend decides, page by page, whether to return extracted text or a
; rendered image (vision), according to 'mode' ("auto" | "text" | "vision",
; default "auto"). The result is a list whose elements are either
; (dictionary "type" "text" "text" ...) or
; (dictionary "type" "image_url" "image_url" (dictionary "url" ... "detail" ...)).
; Returns an empty list on error. This function is synchronous.
(defun load_pdf(source (mode))
   (if (nullp mode) (setq mode "auto"))
   (setq spec (dictionary "source" source "kind" "auto" "mode" mode "dpi" 150))
   (setq res (json_parse (atob (evaljs (f_ "pdf_ingest_sync(\`{btoa . json spec}\`);")))))
   (if (neq (@ res "status") "success")
      ()
      (block
         (setq content ())
         (setq detail (getImageDetail))
         (loop item (@ res "items")
            (if (eq (@ item "kind") "text")
               (push content (dictionary "type" "text" "text" (@ item "text")))
               (push content (dictionary "type" "image_url"
                                         "image_url" (dictionary "url" (@ item "src") "detail" detail)))
            )
         )
         content
      )
   )
)

`;
// Store default code in each lib tab
allInitContents['lib 0'] = initDefaultCode_lib1.trim();
allInitContents['lib 1'] = initDefaultCode_lib2.trim();
allInitContents['lib 2'] = initDefaultCode_lib3.trim();
allInitContents['lib 3'] = initDefaultCode_lib4.trim();
allInitContents['lib 4'] = initDefaultCode_lib5.trim();

initializationEditor = CodeMirror.fromTextArea(document.getElementById('initializationInput'), {
    mode: 'scheme',
    theme: 'dracula',
    lineNumbers: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    lineWrapping: true
});
initializationEditor.setSize(null, 400);
initializationEditor.setValue(allInitContents['lib 0']);

// Track modifications in initialization editor
initializationEditor.on('change', () => {
    markSessionModified();
});

// Trigger autocomplete on 3+ character words in initialization editor (debounced)
(function() {
    let hintTimeout = null;
    initializationEditor.on('inputRead', function(cm, change) {
        if (change.origin !== '+input') return;
        if (hintTimeout) clearTimeout(hintTimeout);
        hintTimeout = setTimeout(function() {
            const cur = cm.getCursor();
            const line = cm.getLine(cur.line);
            let start = cur.ch;
            while (start > 0 && /\w/.test(line[start - 1])) start--;
            const wordLen = cur.ch - start;
            if (wordLen >= 3) {
                cm.showHint({
                    hint: initFunctionHint,
                    completeSingle: false
                });
            }
        }, 150);
    });
})();

// Track modifications in all textareas (prompts, skills, tools, user data)
['systemPromptTabsContent', 'skillTabsContent', 'toolTabsContent', 'userDataTabsContent', 'outputTabsContent'].forEach(containerId => {
    document.getElementById(containerId).addEventListener('input', () => {
        markSessionModified();
    });
});

// Track modifications in confidential, secret, principles fields
['confidentialInput', 'secretInput'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => markSessionModified());
});

// Drag-to-resize for initialization editor
(function() {
    const container = document.getElementById('initializationEditorContainer');
    const handle = document.getElementById('initializationResizeHandle');
    let startY, startH;
    handle.addEventListener('mousedown', function(e) {
        e.preventDefault();
        startY = e.clientY;
        startH = container.offsetHeight;
        function onMove(e) {
            const newH = Math.max(150, startH + (e.clientY - startY));
            container.style.height = newH + 'px';
            initializationEditor.setSize(null, newH);
        }
        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
})();

function saveCurrentInitToMemory() {
    if (initializationEditor) {
        allInitContents[currentInitTab] = initializationEditor.getValue();
    }
}

function switchInitTab(tabName, skipSave = false) {
    if (!skipSave) saveCurrentInitToMemory();
    // Deactivate all tab buttons
    initTabsBar.querySelectorAll('.init-tab-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-200', 'font-semibold');
        btn.classList.add('bg-indigo-100');
    });
    // Activate selected tab
    const activeBtn = initTabsBar.querySelector(`.init-tab-btn[data-lib="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-indigo-100');
        activeBtn.classList.add('bg-indigo-200', 'font-semibold');
    }
    currentInitTab = tabName;
    // Load content into CodeMirror
    if (initializationEditor) {
        initializationEditor.setValue(allInitContents[tabName] || '');
    }
}

// Attach click listeners to initial init tabs
initTabsBar.querySelectorAll('.init-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchInitTab(btn.dataset.lib));
});

// Add new init tab
addInitTabButton.addEventListener('click', () => {
    initCounter++;
    const newName = `lib ${initCounter}`;
    initTabNames.push(newName);
    allInitContents[newName] = '';

    const newBtn = document.createElement('button');
    newBtn.className = 'init-tab-btn bg-indigo-100 text-indigo-900 text-xs px-3 py-1 rounded-t';
    newBtn.dataset.lib = newName;
    newBtn.textContent = newName;
    newBtn.addEventListener('click', () => switchInitTab(newName));
    initTabsBar.insertBefore(newBtn, addInitTabButton);

    switchInitTab(newName);
});

// Reset all init tabs to initial state (5 tabs, lib 1 gets default code)
function resetInitTabs() {
    // Remove all tab buttons except the '+' button
    initTabsBar.querySelectorAll('.init-tab-btn').forEach(btn => btn.remove());
    // Clear contents
    Object.keys(allInitContents).forEach(k => delete allInitContents[k]);
    // Reset to 5 default tabs
    initTabNames.length = 0;
    initCounter = 4;
    const defaultNames = ['lib 0', 'lib 1', 'lib 2', 'lib 3', 'lib 4'];
    defaultNames.forEach(name => {
        initTabNames.push(name);
        allInitContents[name] = '';
        const btn = document.createElement('button');
        btn.className = 'init-tab-btn bg-indigo-100 text-indigo-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.lib = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchInitTab(name));
        initTabsBar.insertBefore(btn, addInitTabButton);
    });
    // Restore default code for all lib tabs
    allInitContents['lib 0'] = initDefaultCode_lib1.trim();
    allInitContents['lib 1'] = initDefaultCode_lib2.trim();
    allInitContents['lib 2'] = initDefaultCode_lib3.trim();
    allInitContents['lib 3'] = initDefaultCode_lib4.trim();
    allInitContents['lib 4'] = initDefaultCode_lib5.trim();
    currentInitTab = 'lib 0';
    switchInitTab('lib 0', true);
}

// Get all init contents (for config save/load)
function getAllInitContents() {
    saveCurrentInitToMemory();
    return JSON.parse(JSON.stringify(allInitContents));
}

// Helper to get merged initialization code (all tabs concatenated)
function getInitializationCode() {
    saveCurrentInitToMemory();
    return initTabNames
        .map(name => (allInitContents[name] || '').trim())
        .filter(c => c.length > 0)
        .join('\n\n');
}

// Backward-compatible setter: loads code into lib 1 (legacy single-string format)
function setInitializationCode(code) {
    if (typeof code === 'string') {
        allInitContents['lib 0'] = code;
        if (currentInitTab === 'lib 0' && initializationEditor) {
            initializationEditor.setValue(code);
        }
    }
}

// Load file into current init tab
const loadInitFileButton = document.getElementById('loadInitFileButton');
const initFileInput = document.getElementById('initFileInput');
const clearInitButton = document.getElementById('clearInitButton');

loadInitFileButton.addEventListener('click', () => {
    initFileInput.click();
});
initFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (initializationEditor) {
                initializationEditor.setValue(e.target.result);
                allInitContents[currentInitTab] = e.target.result;
            }
        };
        reader.readAsText(file);
    }
    initFileInput.value = '';
});

// Clear current init tab
clearInitButton.addEventListener('click', () => {
    if (initializationEditor) {
        initializationEditor.setValue('');
        allInitContents[currentInitTab] = '';
    }
});

// Reset all init tabs to their default code
document.getElementById('resetInitButton').addEventListener('click', () => {
    resetInitTabs();
    showModal('Initialization libs reset to defaults.', true);
});

// Copy current init tab to clipboard
document.getElementById('copyInitButton').addEventListener('click', () => {
    if (initializationEditor) {
        const text = initializationEditor.getValue();
        const btn = document.getElementById('copyInitButton');
        navigator.clipboard.writeText(text).then(() => {
            const orig = btn.innerHTML;
            btn.innerHTML = '✓';
            setTimeout(() => { btn.innerHTML = orig; }, 1500);
        });
    }
});

// Set Agents button: runs Initialization + ALL agent tabs merged code
const setAgentsButton = document.getElementById('setAgentsButton');
setAgentsButton.addEventListener('click', async () => {
    // Check if any agent tab is in Basic or Python mode and load transpiler if needed
    const hasBasicTabs = agentTabNames.some(name => agentModes[name] === 'basic' || agentModes[name] === 'python');
    if (hasBasicTabs) {
        const loaded = await loadBasicTranspilerFiles();
        if (!loaded) {
            displayError("Failed to load BasAIc transpiler files.\n");
            return;
        }
    }

    try {
        if (!compileAndInitialize(hasBasicTabs, true)) {
            showModal('Compilation failed. See the console.', false);
        } else {
            showModal('Agents compiled successfully.', true);
        }
    } catch (e) {
        console.error('Agents Set error:', e);
        showModal('Agents Set error: ' + e.message, false);
    }
});

// ===== MERGE MODE / ACTIVE AGENT SELECTION =====
const agentMergeCheckbox = document.getElementById('agentMergeCheckbox');
const activeAgentField = document.getElementById('activeAgentField');
const activeAgentInput = document.getElementById('activeAgentInput');
const chatActiveAgentField = document.getElementById('chatActiveAgentField');
const chatActiveAgentInput = document.getElementById('chatActiveAgentInput');
const chatActiveAgentName = document.getElementById('chatActiveAgentName');

// Rebuild the <option> list of a select to match the current agent tabs
function populateAgentSelect(select) {
    if (!select) return;
    const current = select.value;
    select.innerHTML = '';
    agentTabNames.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
    // Restore a valid selection
    if (agentTabNames.indexOf(current) >= 0) select.value = current;
}

// Reflect the current active agent (currentAgentTab) into the selectors
function syncActiveAgentField() {
    if (activeAgentInput) {
        populateAgentSelect(activeAgentInput);
        if (agentTabNames.indexOf(currentAgentTab) >= 0) activeAgentInput.value = currentAgentTab;
    }
    // Mirror into the control shown under the message box
    if (chatActiveAgentField) chatActiveAgentField.style.display = agentMergeMode ? 'none' : 'flex';
    if (chatActiveAgentInput) {
        populateAgentSelect(chatActiveAgentInput);
        if (agentTabNames.indexOf(currentAgentTab) >= 0) chatActiveAgentInput.value = currentAgentTab;
    }
}

// Change the active agent from a selected agent name (used by both selectors)
function setActiveAgentByName(name) {
    if (agentTabNames.indexOf(name) >= 0 && name !== currentAgentTab) {
        switchAgentTab(name);
    } else {
        syncActiveAgentField();
    }
    if (typeof markSessionModified === 'function') markSessionModified();
}

if (agentMergeCheckbox) {
    agentMergeCheckbox.addEventListener('change', () => {
        // Persist current editor content before we potentially swap the view
        saveCurrentAgentToMemory();
        agentMergeMode = agentMergeCheckbox.checked;
        if (activeAgentField) activeAgentField.style.display = agentMergeMode ? 'none' : 'flex';
        if (!agentMergeMode) syncActiveAgentField();
        if (chatActiveAgentField) chatActiveAgentField.style.display = agentMergeMode ? 'none' : 'flex';
        // Reload the current tab so an empty active agent shows the default code
        // (and switching back to merge clears the placeholder default).
        switchAgentTab(currentAgentTab, true);
        if (typeof markSessionModified === 'function') markSessionModified();
    });
}

if (activeAgentInput) {
    activeAgentInput.addEventListener('change', () => {
        setActiveAgentByName(activeAgentInput.value);
    });
}

if (chatActiveAgentInput) {
    chatActiveAgentInput.addEventListener('change', () => {
        setActiveAgentByName(chatActiveAgentInput.value);
    });
}

// Restore merge mode from a loaded session (defaults to merge = true)
function restoreAgentMergeMode(value) {
    agentMergeMode = (value === undefined) ? true : !!value;
    if (agentMergeCheckbox) agentMergeCheckbox.checked = agentMergeMode;
    if (activeAgentField) activeAgentField.style.display = agentMergeMode ? 'none' : 'flex';
    if (chatActiveAgentField) chatActiveAgentField.style.display = agentMergeMode ? 'none' : 'flex';
    if (!agentMergeMode) syncActiveAgentField();
}

