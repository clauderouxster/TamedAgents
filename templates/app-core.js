// ─── Session management & fetch interceptor ───────────────────────────────
// Transparently injects session_id into all API calls to the backend.
// GET requests get ?session_id=xxx, POST JSON bodies get session_id field.
// The interceptor awaits session creation before dispatching requests that
// require a session, so call-site code doesn't need to wait explicitly.
(function() {
    // Compute backend base URL early (same logic as API_BASE_URL below)
    const _API_BASE = (window.location.port === '5200')
        ? window.location.origin
        : 'http://127.0.0.1:5200';

    window._sessionId = null;
    window._sessionReady = null; // Promise resolved when session is ready

    // Endpoints that do NOT need session_id (stateless or static)
    const _NO_SESSION = new Set([
        '/create_session', '/get_server_defaults', '/get_basic_files',
        '/extract_code', '/fetch_webpage', '/fetch_feed', '/web_search', '/run_shell',
        '/store_data', '/load_data', '/store_session', '/chat_with_config'
    ]);

    function _needsSession(pathname) {
        if (_NO_SESSION.has(pathname)) return false;
        // Static files and docs
        if (/\.(js|css|html?|wasm|png|jpe?g|gif|svg|webp|md)$/.test(pathname)) return false;
        if (pathname.startsWith('/docs/')) return false;
        if (pathname.startsWith('/lispe/')) return false;
        if (pathname === '/' || pathname === '/index.htm') return false;
        return true;
    }

    // Check if a URL targets the backend API
    function _isBackendCall(url) {
        return url.startsWith(_API_BASE + '/') || url.startsWith(_API_BASE + '?');
    }

    function _injectSession(input, init) {
        const url = (typeof input === 'string') ? input : (input instanceof Request ? input.url : String(input));
        try {
            const urlObj = new URL(url);
            if (!_needsSession(urlObj.pathname)) return [input, init];
            const method = ((init && init.method) || 'GET').toUpperCase();
            if (method === 'GET' || method === 'HEAD') {
                urlObj.searchParams.set('session_id', window._sessionId);
                return [urlObj.toString(), init];
            } else if (init && init.body && typeof init.body === 'string') {
                try {
                    const body = JSON.parse(init.body);
                    body.session_id = window._sessionId;
                    init = Object.assign({}, init, { body: JSON.stringify(body) });
                } catch(e) { /* not JSON, skip */ }
            }
        } catch(e) { /* URL parse error, skip */ }
        return [input, init];
    }

    const _origFetch = window.fetch;
    window.fetch = function(input, init) {
        const url = (typeof input === 'string') ? input : (input instanceof Request ? input.url : String(input));
        // Only intercept calls targeting the backend API
        if (!_isBackendCall(url)) return _origFetch.call(this, input, init);

        // If session already available, inject synchronously
        if (window._sessionId) {
            const [newInput, newInit] = _injectSession(input, init);
            return _origFetch.call(this, newInput, newInit);
        }

        // Session not yet available — check if this endpoint even needs it
        try {
            const urlObj = new URL(url);
            if (!_needsSession(urlObj.pathname)) {
                return _origFetch.call(this, input, init);
            }
        } catch(e) {
            return _origFetch.call(this, input, init);
        }

        // Wait for session creation, then inject and dispatch
        return window._sessionReady.then(() => {
            const [newInput, newInit] = _injectSession(input, init);
            return _origFetch.call(this, newInput, newInit);
        });
    };

    async function _initSession() {
        try {
            const resp = await _origFetch(_API_BASE + '/create_session', { method: 'POST' });
            const data = await resp.json();
            if (data.session_id) {
                window._sessionId = data.session_id;
                console.log('[session] Session created:', data.session_id);
            }
        } catch(e) {
            console.error('[session] Failed to create session:', e);
        }
    }

    // Start session init immediately, store promise for code that needs to wait
    window._sessionReady = _initSession();
})();

// Unicode-safe base64 encode/decode (supports emojis and all Unicode)
function unicodeBtoa(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
function unicodeAtob(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}

// LZ-String compression helpers for localStorage session data
// Compress JSON string and store in localStorage with quota error handling
function compressAndStore(key, jsonString) {
    const compressed = LZString.compressToUTF16(jsonString);
    localStorage.setItem(key, compressed);
}

// Load from localStorage and auto-detect compressed vs plain JSON (backward compatible)
function loadAndDecompress(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    // Auto-detect: if it starts with { or [, it's uncompressed JSON (old format)
    const first = raw.charAt(0);
    if (first === '{' || first === '[') return raw;
    // Otherwise, decompress
    const decompressed = LZString.decompressFromUTF16(raw);
    // Fallback: if decompression fails, return raw string
    return decompressed !== null ? decompressed : raw;
}

// Obfuscation helpers for confidential config table (XOR + base64)
// Prevents API keys from appearing in plain text in localStorage
const _CFG_OBF_KEY = 'TmdAgtCfgK24xZ9pL';
function _obfuscateConfig(plainText) {
    const bytes = new TextEncoder().encode(plainText);
    const keyBytes = new TextEncoder().encode(_CFG_OBF_KEY);
    const out = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
    }
    let binary = '';
    for (let i = 0; i < out.length; i++) binary += String.fromCharCode(out[i]);
    return btoa(binary);
}
function _deobfuscateConfig(encoded) {
    const binary = atob(encoded);
    const keyBytes = new TextEncoder().encode(_CFG_OBF_KEY);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i) ^ keyBytes[i % keyBytes.length];
    }
    return new TextDecoder().decode(bytes);
}
// Read the obfuscated config snapshots table from localStorage
function _readConfigSnapshotsTable() {
    const raw = localStorage.getItem('confidential_server_configs');
    if (!raw) return {};
    try {
        // Try obfuscated format first
        return JSON.parse(_deobfuscateConfig(raw));
    } catch (e) {
        // Fallback: migration from old plain-JSON format
        try {
            const table = JSON.parse(raw);
            // Re-save in obfuscated format
            localStorage.setItem('confidential_server_configs', _obfuscateConfig(JSON.stringify(table)));
            return table;
        } catch (e2) {
            return {};
        }
    }
}

// LLM Server selection elements
const llmServerSelect = document.getElementById('llmServerSelect');
const sidebarLlmServerSelect = document.getElementById('sidebarLlmServerSelect');

// URL de base pour le backend FastAPI : déduite automatiquement si servie par app.py (port 5200),
// sinon fallback sur 127.0.0.1:5200 (cas Live Server, file://, etc.)
const API_BASE_URL = (window.location.port === '5200') ? window.location.origin : 'http://127.0.0.1:5200';

// Dictionary to store chat history per tab - keyed by tab name
const chatHistory = {};
// Dictionary to store undone chat history per tab for re-injection
const undoneChatHistory = {};
// --- Chat Virtualization (prevents DOM OOM on long sessions) ---
const CHAT_WINDOW_SIZE = 26;  // Max message bubbles in DOM at once
const CHAT_LOAD_BATCH = 13;   // Messages to prepend when scrolling up
const chatViewStart = {};     // Per-tab: index of first message currently in DOM
// Current session name - MOVED TO TOP
let currentSessionName = '';
// Flag: session has unsaved modifications
let sessionModified = false;
// Flag: session just loaded, needs LispE re-initialization
let just_loaded = false;
// Flag: suppress modification tracking during session load
let _loadingSession = false;

// Update top bar with current session name
function updateTopBarSessionName() {
    const el = document.getElementById('topBarSessionName');
    if (el) el.textContent = currentSessionName ? '— ' + currentSessionName : '';
}

// Mark the current session as modified (unsaved changes)
function markSessionModified() {
    if (_loadingSession) return; // suppress during session load
    if (!currentSessionName) return; // no session active, nothing to flag
    if (sessionModified) return; // already flagged
    sessionModified = true;
    document.getElementById('modifiedBadgeBottom').classList.add('visible');
    document.getElementById('modifiedBadgeSidebar').classList.add('visible');
    document.getElementById('modifiedTextSidebar').classList.add('visible');
}

// Clear the modified flag (after save, load, or reset)
function clearSessionModified() {
    sessionModified = false;
    document.getElementById('modifiedBadgeBottom').classList.remove('visible');
    document.getElementById('modifiedBadgeSidebar').classList.remove('visible');
    document.getElementById('modifiedTextSidebar').classList.remove('visible');
}
// Global variable to store principles as a list - ADDED
let currentPrinciples = [];
// Global variable to store the last selected principle - ADDED
let lastSelectedPrinciple = '';
// Chat tab management
let currentChatTab = 'Chat 0';
let chatTabNames = ['Chat 0', 'Chat 1', 'Chat 2', 'Chat 3', 'Chat 4'];
let chatCounter = 4;

// Per-chat system prompts: dynamic per tab
const allChatPrompts = {};
let systemPromptTabNames = ['Sys 0', 'Sys 1', 'Sys 2', 'Sys 3', 'Sys 4'];
let currentSystemPromptTab = 'Sys 0';
let systemPromptCounter = 4;
// Initialize allChatPrompts for each chat tab
chatTabNames.forEach(tab => {
    allChatPrompts[tab] = {};
    systemPromptTabNames.forEach(sp => { allChatPrompts[tab][sp] = ''; });
});

// Références aux éléments du DOM
const systemPromptTabsBar = document.getElementById('systemPromptTabsBar');
const systemPromptTabsContent = document.getElementById('systemPromptTabsContent');
const addSystemPromptTabButton = document.getElementById('addSystemPromptTabButton');
const clearSystemPromptButton = document.getElementById('clearSystemPromptButton');
const messagesDisplay = document.getElementById('messagesDisplay');

// Undo stack for deleted System Prompt tabs
const systemPromptDeletedTabsStack = [];
const undoSystemPromptTabButton = document.getElementById('undoSystemPromptTabButton');
const chatInput = document.getElementById('chatInput');
const sendMessageButton = document.getElementById('sendMessageButton');
const loadingSpinner = document.getElementById('loadingSpinner');
const clearDisplayButton = document.getElementById('clearDisplayButton');
const modelNameSelect = document.getElementById('modelNameSelect');

// Elements for System Prompt file handling
const fileInput = document.getElementById('fileInput');
const loadFileButton = document.getElementById('loadFileButton');
function saveCurrentChatPromptsToMemory() {
    if (!allChatPrompts[currentChatTab]) allChatPrompts[currentChatTab] = {};
    // Save ALL textareas (not just the visible one) to avoid losing
    // hidden tabs' content when allChatPrompts has been cleared
    systemPromptTabsContent.querySelectorAll('.systemprompt-textarea').forEach(ta => {
        const spName = ta.dataset.systemprompt;
        if (spName) {
            allChatPrompts[currentChatTab][spName] = ta.value;
        }
    });
}

function updateUndoSystemPromptButton() {
    undoSystemPromptTabButton.style.display = systemPromptDeletedTabsStack.length > 0 ? '' : 'none';
}

function clearSystemPromptUndoStack() {
    systemPromptDeletedTabsStack.length = 0;
    updateUndoSystemPromptButton();
}

function renumberSystemPromptTabs() {
    // Collect per-chat contents for all tabs
    saveCurrentChatPromptsToMemory();
    const oldNames = [...systemPromptTabNames];
    const newNames = oldNames.map((_, i) => `Sys ${i}`);

    // Remap allChatPrompts for all chat tabs
    chatTabNames.forEach(chatTab => {
        const prompts = allChatPrompts[chatTab] || {};
        const contents = oldNames.map(name => prompts[name] || '');
        allChatPrompts[chatTab] = {};
        newNames.forEach((name, i) => { allChatPrompts[chatTab][name] = contents[i]; });
    });

    systemPromptTabNames.length = 0;
    newNames.forEach(n => systemPromptTabNames.push(n));
    systemPromptCounter = newNames.length - 1;

    // Rebuild DOM
    systemPromptTabsBar.querySelectorAll('.systemprompt-tab-btn').forEach(btn => btn.remove());
    systemPromptTabsContent.innerHTML = '';

    const prompts = allChatPrompts[currentChatTab] || {};
    newNames.forEach((name, i) => {
        const btn = document.createElement('button');
        btn.className = 'systemprompt-tab-btn bg-blue-100 text-blue-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.systemprompt = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchSystemPromptTab(name));
        systemPromptTabsBar.insertBefore(btn, addSystemPromptTabButton);

        const ta = document.createElement('textarea');
        ta.className = 'systemprompt-textarea dark-textarea hidden';
        ta.dataset.systemprompt = name;
        ta.placeholder = `${name} prompt...`;
        ta.value = prompts[name] || '';
        ta.addEventListener('input', () => clearSystemPromptUndoStack());
        systemPromptTabsContent.appendChild(ta);
    });
}

// Load prompts for a given chat tab into textareas
function loadChatPromptsToTextareas(chatTab) {
    const prompts = allChatPrompts[chatTab] || {};
    systemPromptTabsContent.querySelectorAll('.systemprompt-textarea').forEach(ta => {
        const spName = ta.dataset.systemprompt;
        ta.value = prompts[spName] || '';
    });
}

// Get the currently active textarea
function getCurrentSystemPromptInput() {
    return systemPromptTabsContent.querySelector('.systemprompt-textarea:not(.hidden)');
}

// Switch system prompt tab
function switchSystemPromptTab(tabName, skipSessionLoad = false) {
    saveCurrentChatPromptsToMemory();
    // Deactivate all tab buttons
    systemPromptTabsBar.querySelectorAll('.systemprompt-tab-btn').forEach(btn => {
        btn.classList.remove('bg-blue-200', 'font-semibold');
        btn.classList.add('bg-blue-100');
    });
    // Hide all textareas
    systemPromptTabsContent.querySelectorAll('.systemprompt-textarea').forEach(ta => {
        ta.classList.add('hidden');
    });
    // Activate selected tab
    const activeBtn = systemPromptTabsBar.querySelector(`.systemprompt-tab-btn[data-systemprompt="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-blue-100');
        activeBtn.classList.add('bg-blue-200', 'font-semibold');
    }
    const activeTA = systemPromptTabsContent.querySelector(`.systemprompt-textarea[data-systemprompt="${tabName}"]`);
    if (activeTA) {
        activeTA.classList.remove('hidden');
        // Load value from memory
        const prompts = allChatPrompts[currentChatTab] || {};
        activeTA.value = prompts[tabName] || '';
    }
    currentSystemPromptTab = tabName;
}

// Attach click listeners to initial system prompt tabs
systemPromptTabsBar.querySelectorAll('.systemprompt-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSystemPromptTab(btn.dataset.systemprompt));
});

// Add new system prompt tab
addSystemPromptTabButton.addEventListener('click', () => {
    systemPromptCounter++;
    const newName = `Sys ${systemPromptCounter}`;
    systemPromptTabNames.push(newName);
    // Add to all chat prompts
    chatTabNames.forEach(chatTab => {
        if (!allChatPrompts[chatTab]) allChatPrompts[chatTab] = {};
        allChatPrompts[chatTab][newName] = '';
    });

    // Create tab button
    const newBtn = document.createElement('button');
    newBtn.className = 'systemprompt-tab-btn bg-blue-100 text-blue-900 text-xs px-3 py-1 rounded-t';
    newBtn.dataset.systemprompt = newName;
    newBtn.textContent = newName;
    newBtn.addEventListener('click', () => switchSystemPromptTab(newName));
    systemPromptTabsBar.insertBefore(newBtn, addSystemPromptTabButton);

    // Create textarea
    const newTA = document.createElement('textarea');
    newTA.className = 'systemprompt-textarea dark-textarea hidden';
    newTA.dataset.systemprompt = newName;
    newTA.placeholder = `${newName} prompt...`;
    systemPromptTabsContent.appendChild(newTA);

    switchSystemPromptTab(newName);
});

// Initialisation : Sys 0 sélectionné
switchSystemPromptTab('Sys 0');

// Chat tab DOM elements
const chatTabsBar = document.getElementById('chatTabsBar');
const addChatTabButton = document.getElementById('addChatTabButton');

// Fonction pour charger la session de chat associée à un onglet chat
function loadSessionForChat(chatTab) {
    // If chatHistory already has an entry for this tab (even if empty), use it directly
    if (chatTab in chatHistory) {
        renderChatHistory();
        return;
    }
    // Otherwise, load from localStorage (initial page load or first access)
    const sessionKey = llmServerSelect.value + `_chat_${chatTab}_current`;
    const storedData = loadAndDecompress(sessionKey);
    if (storedData) {
        try {
            const sessionData = JSON.parse(storedData);
            chatHistory[chatTab] = sessionData.chatHistory || [];
            undoneChatHistory[chatTab] = [];
            
            // Restore per-chat prompts if available
            if (sessionData.chatPrompts) {
                allChatPrompts[chatTab] = sessionData.chatPrompts;
            }
            
            console.log(`Chat session loaded for ${chatTab}: ${(chatHistory[chatTab] || []).length} messages`);
        } catch (e) {
            console.error('Error loading chat session data:', e);
        }
    } else {
        // No stored data, reset to default
        chatHistory[chatTab] = [];
        undoneChatHistory[chatTab] = [];
        console.log('New chat session created for tab:', chatTab);
    }
    renderChatHistory();
}

// Save chat session for a specific tab to localStorage
function saveChatSessionForTab(tab) {
    const history = chatHistory[tab] || [];
    const sessionKey = llmServerSelect.value + `_chat_${tab}_current`;
    const sessionData = {
        chatHistory: history,
        systemPrompt: getCurrentSystemPrompt(),
        chatPrompts: allChatPrompts[tab]
    };
    try {
        compressAndStore(sessionKey, JSON.stringify(sessionData));
    } catch (e) {
        console.error('Error saving chat session for tab:', tab, e);
    }
}

// Function to automatically save current chat session
function autoSaveCurrentChatSession() {
    saveCurrentChatPromptsToMemory();
    saveChatSessionForTab(currentChatTab);
}

function switchChatTab(tab) {
    // Save current chat session and prompts before switching
    if (currentChatTab) {
        saveCurrentChatPromptsToMemory();
        saveChatSessionForTab(currentChatTab);
    }
    
    // Update tab styling via DOM query
    chatTabsBar.querySelectorAll('.chat-tab-btn').forEach(btn => {
        btn.classList.remove('bg-green-200', 'font-semibold');
        btn.classList.add('bg-green-100');
    });
    const activeBtn = chatTabsBar.querySelector(`.chat-tab-btn[data-chat="${tab}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-green-100');
        activeBtn.classList.add('bg-green-200', 'font-semibold');
    }
    
    currentChatTab = tab;
    
    // Load chat session for the new tab
    loadSessionForChat(tab);
    
    // If all prompts for this tab are empty, inherit from Chat 0
    if (tab !== 'Chat 0') {
        const prompts = allChatPrompts[tab] || {};
        const allEmpty = systemPromptTabNames.every(name => !(prompts[name] || '').trim());
        if (allEmpty) {
            const chat0Prompts = allChatPrompts['Chat 0'] || {};
            systemPromptTabNames.forEach(name => {
                if (!allChatPrompts[tab]) allChatPrompts[tab] = {};
                allChatPrompts[tab][name] = chat0Prompts[name] || '';
            });
        }
    }
    
    // Load the new chat's system prompts into textareas
    loadChatPromptsToTextareas(tab);
    
    // Refresh current prompt tab display
    switchSystemPromptTab(currentSystemPromptTab, true);

    // If the session overview is open, refresh its content for the new session
    if (typeof window.refreshRecapIfVisible === 'function') window.refreshRecapIfVisible();
}

// Attach click listeners to initial chat tabs
chatTabsBar.querySelectorAll('.chat-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchChatTab(btn.dataset.chat));
});

// Add new chat tab
addChatTabButton.addEventListener('click', () => {
    chatCounter++;
    const newName = `Chat ${chatCounter}`;
    chatTabNames.push(newName);
    chatHistory[newName] = [];
    undoneChatHistory[newName] = [];
    allChatPrompts[newName] = {};
    systemPromptTabNames.forEach(sp => { allChatPrompts[newName][sp] = ''; });

    const newBtn = document.createElement('button');
    newBtn.className = 'chat-tab-btn tab-btn bg-green-100 text-green-900 text-xs px-3 py-1 rounded-t';
    newBtn.dataset.chat = newName;
    newBtn.textContent = newName;
    newBtn.addEventListener('click', () => switchChatTab(newName));
    chatTabsBar.insertBefore(newBtn, addChatTabButton);

    switchChatTab(newName);
});

// Reset chat tabs to initial state (5 tabs)
function resetChatTabs() {
    // Remove all tab buttons except the '+' button
    chatTabsBar.querySelectorAll('.chat-tab-btn').forEach(btn => btn.remove());
    // Clear chat prompts and history dictionaries
    Object.keys(allChatPrompts).forEach(k => delete allChatPrompts[k]);
    Object.keys(chatHistory).forEach(k => delete chatHistory[k]);
    Object.keys(undoneChatHistory).forEach(k => delete undoneChatHistory[k]);
    // Reset to 5 default tabs
    chatTabNames.length = 0;
    chatCounter = 4;
    const defaultNames = ['Chat 0', 'Chat 1', 'Chat 2', 'Chat 3', 'Chat 4'];
    defaultNames.forEach((name, i) => {
        chatTabNames.push(name);
        chatHistory[name] = [];
        undoneChatHistory[name] = [];
        allChatPrompts[name] = {};
        systemPromptTabNames.forEach(sp => { allChatPrompts[name][sp] = ''; });
        const btn = document.createElement('button');
        btn.className = 'chat-tab-btn tab-btn bg-green-100 text-green-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.chat = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchChatTab(name));
        chatTabsBar.insertBefore(btn, addChatTabButton);
    });
    currentChatTab = 'Chat 0';
    const firstBtn = chatTabsBar.querySelector('.chat-tab-btn[data-chat="Chat 0"]');
    if (firstBtn) {
        firstBtn.classList.remove('bg-green-100');
        firstBtn.classList.add('bg-green-200', 'font-semibold');
    }
}

// Reset system prompt tabs to initial state (5 tabs)
const DEFAULT_SYSTEM_PROMPT_SYS0 = 'You are a helpful and knowledgeable language assistant. You answer questions clearly, accurately, and concisely. If you are unsure about something, you say so. You adapt your tone and level of detail to the user\'s needs.';

function resetSystemPromptTabs() {
    // Remove all tab buttons except the '+' button
    systemPromptTabsBar.querySelectorAll('.systemprompt-tab-btn').forEach(btn => btn.remove());
    // Remove all textareas
    systemPromptTabsContent.innerHTML = '';
    // Reset to 5 default tabs
    systemPromptTabNames.length = 0;
    systemPromptCounter = 4;
    systemPromptDeletedTabsStack.length = 0;
    updateUndoSystemPromptButton();
    const defaultNames = ['Sys 0', 'Sys 1', 'Sys 2', 'Sys 3', 'Sys 4'];
    defaultNames.forEach(name => {
        systemPromptTabNames.push(name);
        const btn = document.createElement('button');
        btn.className = 'systemprompt-tab-btn bg-blue-100 text-blue-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.systemprompt = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchSystemPromptTab(name));
        systemPromptTabsBar.insertBefore(btn, addSystemPromptTabButton);

        const ta = document.createElement('textarea');
        ta.className = 'systemprompt-textarea dark-textarea hidden';
        ta.dataset.systemprompt = name;
        ta.placeholder = `${name} prompt...`;
        if (name === 'Sys 0') ta.value = DEFAULT_SYSTEM_PROMPT_SYS0;
        systemPromptTabsContent.appendChild(ta);
    });
    // Reset allChatPrompts for all chat tabs
    chatTabNames.forEach(tab => {
        allChatPrompts[tab] = {};
        defaultNames.forEach(sp => { allChatPrompts[tab][sp] = (sp === 'Sys 0') ? DEFAULT_SYSTEM_PROMPT_SYS0 : ''; });
    });
    currentSystemPromptTab = 'Sys 0';
    switchSystemPromptTab('Sys 0');
}

// Fonction pour obtenir le prompt système : concatène tous les onglets non vides
function getCurrentSystemPrompt() {
    saveCurrentChatPromptsToMemory();
    const prompts = allChatPrompts[currentChatTab] || {};
    const parts = systemPromptTabNames
        .map(name => (prompts[name] || '').trim())
        .filter(p => p.length > 0);
    return parts.join('\n\n');
}



// NEW: Reference to the Clear Chat button
const clearChatButton = document.getElementById('clearChatButton');

    // NEW: Reference to the Copy Chat button
    const copyChatButton = document.getElementById('copyChatButton');

// Fonction pour récupérer les principes (depuis Principles)
function getPrinciples() {
    // Retourne toujours un tableau (liste) des principes
    return currentPrinciples || [];
}
// Fonction pour récupérer la config de connexion au serveur
function getSetupConfig() {
    return {
        llmServer: llmServerSelect ? llmServerSelect.value : "",
        modelName: modelNameSelect ? modelNameSelect.value : "",
        host: hostInput ? hostInput.value : "",
        maxTokens: maxTokensInput ? maxTokensInput.value : "",
        imageDetail: (document.getElementById('imageDetailSelect') ? document.getElementById('imageDetailSelect').value : "auto"),
        apiBaseUrl: API_BASE_URL,
        currentSession: currentSessionName || "",
        selectedModel: modelNameSelect ? modelNameSelect.value : ""
    };
}


// Re-read all global variables into LispE (prompts, skills, tools, user data)
// Called after loading a file into any of these sections.
function reinitializeLispEVariables() {
    if (compiled) {
        const initCall = buildInitializeCall();
        run_code(initCall);
    }
}

// Build the LispE Initialize call string from current prompts, skills, tools and user data
function buildInitializeCall() {
    saveCurrentChatPromptsToMemory();
    const prompts = allChatPrompts[currentChatTab] || {};
    const promptsList = systemPromptTabNames
        .map(name => (prompts[name] || '').trim())
        .map(p => '\u00AB' + p + '\u00BB')
        .join(' ');

    saveCurrentSkillToMemory();
    const skillsList = skillTabNames
        .map(name => (allSkillContents[name] || '').trim())
        .map(s => '\u00AB' + s + '\u00BB')
        .join(' ');

    saveCurrentToolToMemory();
    const toolsList = toolTabNames
        .map(name => (allToolContents[name] || '').trim())
        .map(t => '\u00AB' + t + '\u00BB')
        .join(' ');

    saveCurrentUserDataToMemory();
    const userDataList = userDataTabNames
        .map(name => (allUserDataContents[name] || '').trim())
        .map(d => '\u00AB' + d + '\u00BB')
        .join(' ');

    return `(Initialize '(${promptsList}) '(${skillsList}) '(${toolsList}) '(${userDataList}))`;
}

// Display an error/info message in the Display zone
function displayError(message) {
    var element = document.getElementById('displayOutput');
    if (element) {
        if (element.querySelector('p.text-gray-400')) element.innerHTML = '';
        element.textContent += message;
        element.scrollTop = element.scrollHeight;
    }
}

// Full compilation flow: reset + transpiler + compile agents + init + run agents
// Returns true if compilation succeeded, false otherwise.
// Options:
//   withBasic: boolean — whether to handle Basic/Python transpilation
//   withAgents: boolean — whether to run merged agents code after init
function compileAndInitialize(withBasic, withAgents) {
    const initCall = buildInitializeCall();
    const initCode = getInitializationCode();

    compiled = false;
    callResetLispE(0);

    if (withBasic) {
        if (run_code(basicLispSource) === false || run_code(transpilerLispSource) === false) {
            displayError("Failed to load BasAIc transpiler.\n");
            return false;
        }
        if (!compileAllBasicTabs()) {
            displayError("BasAIc compilation failed. See the console\n");
            return false;
        }
        callResetLispE(0);
    }

    if (run_code(initCode) !== false) {
        if (run_code(initCall) !== false) {
            if (withAgents) {
                const agentsCode = getMergedAgentsCode();
                if (agentsCode.trim()) {
                    if (run_code(agentsCode) !== false)
                        compiled = true;
                } else {
                    compiled = true;
                }
            } else {
                compiled = true;
            }
        }
    }

    if (!compiled) {
        displayError("Compiling failed. See the console\n");
    }
    return compiled;
}

//This function executes LispE code
function run_code(code) {
    //We execute our code
    var res;
    try {
        return callEvalLispE(0, code);
    }
    catch (e) {
        console.error(e);
        return false;
    }
};

//function that executes a LispE function after a delay with no arguments
function executewhen0(delayMs, lispFunc) {
    console.log("executewhen0:" + lispFunc)
    return new Promise((resolve) => {
        setTimeout(() => {
            const code = `(${lispFunc})`;
            const result = run_code(code);
            resolve(result);
        }, delayMs);
    });
}

//function that executes a LispE function after a delay
function executewhen(delayMs, lispFunc, data) {
    console.log("executewhen:" + lispFunc)
    return new Promise((resolve) => {
        setTimeout(() => {
            const code = `(${lispFunc} \`${data}\`)`;
            const result = run_code(code);
            resolve(result);
        }, delayMs);
    });
}



// NEW: Reference to the Clean All button
const cleanAllButton = document.getElementById('cleanAllButton');

// NEW: Reference to the Undo button (now exclusively for destruction)
const undoButton = document.getElementById('undoButton');
// NEW: Reference to the Redo button (for re-injection)
const redoButton = document.getElementById('redoButton');
// Reference to the Clear Current Chat Tab button
const clearCurrentChatButton = document.getElementById('clearCurrentChatButton');
// Reference to the Clean Current Chat Content button (red trash, clears without switching tab)
const cleanCurrentChatButton = document.getElementById('cleanCurrentChatButton');

// NEW: Session management elements
const newSessionButton = document.getElementById('newSessionButton');
const createSessionButton = document.getElementById('createSessionButton');
const sessionSelect = document.getElementById('sessionSelect');
// NEW: Reference to the Remove Session button
const removeSessionButton = document.getElementById('removeSessionButton');


// NEW: References for Max Tokens and Host inputs
const maxTokensInput = document.getElementById('maxTokensInput');
const hostInput = document.getElementById('hostInput');

// NEW: References for API Key input
const apiKeyInput = document.getElementById('apiKeyInput');

// Sidebar clones: delegate to original buttons
// Sidebar dropdown menu toggle
(function() {
    const menuBtn = document.getElementById('sidebarMenuButton');
    const dropdown = document.getElementById('sidebarDropdownMenu');
    if (menuBtn && dropdown) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        });
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && e.target !== menuBtn) {
                dropdown.style.display = 'none';
            }
        });
        // Close dropdown when an item is clicked
        dropdown.querySelectorAll('.sidebar-dropdown-item').forEach(item => {
            item.addEventListener('click', () => {
                dropdown.style.display = 'none';
            });
        });
        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dropdown.style.display !== 'none') {
                dropdown.style.display = 'none';
            }
        });
    }
})();

document.getElementById('sidebarDumpButton').addEventListener('click', () => {
    openDumpSessionsModal();
});
document.getElementById('sidebarResetButton').addEventListener('click', () => {
    document.getElementById('clearChatButton').click();
});

// NEW: Reference to the Load Dump button and file input
const loadDumpButton = document.getElementById('loadDumpButton');
const dumpFileInput = document.getElementById('dumpFileInput');

// NEW: Collapsible settings elements
const toggleSettingsButton = document.getElementById('toggleSettingsButton');
const settingsContent = document.getElementById('settingsContent');
const toggleIcon = document.getElementById('toggleIcon');

const chatFileInput = document.getElementById('chatFileInput');

// NEW: LLM Server selection elements (llmServerSelect already declared above)
const setLlmServerButton = document.getElementById('setLlmServerButton');

// NEW: References for the custom session name modal
const sessionNameModal = document.getElementById('sessionNameModal');
const sessionNameInput = document.getElementById('sessionNameInput');
const sessionNameOkButton = document.getElementById('sessionNameOkButton');
const sessionNameCancelButton = document.getElementById('sessionNameCancelButton');

// NEW: Event listener for the Dump All Sessions button
function openDumpSessionsModal() {
    const dumpSessionsModal = document.getElementById('dumpSessionsModal');
    const dumpSessionsList = document.getElementById('dumpSessionsList');
    const dumpSessionsConfirmButton = document.getElementById('dumpSessionsConfirmButton');
    const dumpSessionsCancelButton = document.getElementById('dumpSessionsCancelButton');
    const dumpSelectAllButton = document.getElementById('dumpSelectAllButton');
    const dumpDeselectAllButton = document.getElementById('dumpDeselectAllButton');

    // Gather all sessions
    const sessionPrefix = llmServerSelect.value + '_session_';
    const sessions = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(sessionPrefix)) {
            const name = key.substring(sessionPrefix.length);
            if (name === 'tree') continue;
            sessions.push(name);
        }
    }
    sessions.sort().reverse();

    if (sessions.length === 0) {
        showModal('No sessions to store.', false);
        return;
    }

    // Build checkbox list
    dumpSessionsList.innerHTML = '';
    sessions.forEach(name => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer text-sm';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = name;
        checkbox.className = 'dump-session-checkbox rounded text-orange-500 focus:ring-orange-400';
        if (name === currentSessionName) {
            label.classList.add('font-semibold', 'text-blue-700');
        }
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(name));
        dumpSessionsList.appendChild(label);
    });

    // Set dynamic default dump filename with server name and date
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const serverName = llmServerSelect.value || 'unknown';
    document.getElementById('dumpFileNameInput').value = 'store_' + serverName + '_' + dateStr + '.json';

    dumpSessionsModal.classList.remove('hidden');

    // Select All / Deselect All
    const onSelectAll = () => {
        dumpSessionsList.querySelectorAll('.dump-session-checkbox').forEach(cb => cb.checked = true);
    };
    const onDeselectAll = () => {
        dumpSessionsList.querySelectorAll('.dump-session-checkbox').forEach(cb => cb.checked = false);
    };

    // Cleanup previous listeners by cloning buttons
    const newSelectAll = dumpSelectAllButton.cloneNode(true);
    dumpSelectAllButton.parentNode.replaceChild(newSelectAll, dumpSelectAllButton);
    newSelectAll.addEventListener('click', onSelectAll);

    const newDeselectAll = dumpDeselectAllButton.cloneNode(true);
    dumpDeselectAllButton.parentNode.replaceChild(newDeselectAll, dumpDeselectAllButton);
    newDeselectAll.addEventListener('click', onDeselectAll);

    const handleConfirm = () => {
        const checked = dumpSessionsList.querySelectorAll('.dump-session-checkbox:checked');
        const toDump = Array.from(checked).map(cb => cb.value);
        if (toDump.length === 0) {
            showModal('No sessions selected.', false);
            return;
        }

        // Auto-save current session before dumping so the dump reflects in-memory state
        if (currentSessionName && toDump.includes(currentSessionName)) {
            try {
                const currentData = buildCurrentSessionData();
                compressAndStore(sessionPrefix + currentSessionName, JSON.stringify(currentData));
                console.log(`Auto-saved current session "${currentSessionName}" before dump`);
            } catch (e) {
                console.error('Error auto-saving current session before dump:', e);
            }
        }

        const dumpData = {};
        toDump.forEach(name => {
            const key = sessionPrefix + name;
            try {
                const storedData = loadAndDecompress(key);
                if (storedData) {
                    const parsed = JSON.parse(storedData);
                    // Exclure le champ 'data' du dump
                    delete parsed.data;
                    // Exclure le champ 'confidential' du dump
                    delete parsed.confidential;
                    // Exclure le champ 'secret' du dump
                    delete parsed.secret;
                    // Exclure l'API Key du dump
                    delete parsed.apiKey;
                    dumpData[name] = parsed;
                }
            } catch (e) {
                console.error(`Error processing session ${name}:`, e);
                dumpData[name] = { error: e.message };
            }
        });

        // Sessions are exported flat (no tree hierarchy)
        const dumpWrapper = {
            sessions: dumpData
        };

        const blob = new Blob([JSON.stringify(dumpWrapper, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        let dumpFileName = document.getElementById('dumpFileNameInput').value.trim() || 'store_sessions.json';
        if (!dumpFileName.endsWith('.json')) dumpFileName += '.json';
        a.download = dumpFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        dumpSessionsModal.classList.add('hidden');
        showModal(`${toDump.length} session(s) stored to ${dumpFileName}`, true);
        cleanup();
    };

    const handleCancel = () => {
        dumpSessionsModal.classList.add('hidden');
        cleanup();
    };

    function cleanup() {
        dumpSessionsConfirmButton.removeEventListener('click', handleConfirm);
        dumpSessionsCancelButton.removeEventListener('click', handleCancel);
    }

    dumpSessionsConfirmButton.addEventListener('click', handleConfirm);
    dumpSessionsCancelButton.addEventListener('click', handleCancel);
}

// Event listener for Load Dump button
loadDumpButton.addEventListener('click', () => {
    dumpFileInput.click();
});

// Handle dump file selection
dumpFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const rawData = JSON.parse(e.target.result);
            let count = 0;
            let lastServer = null;

            // Detect if this is an archive file loaded by mistake via Load
            if (rawData.archive && rawData.server && rawData.sessions) {
                showModal('This is an archive file. Please use the "Restore" button instead.', false);
                return;
            }

            // Detect if this is a single session file (has session-specific keys like chatHistory or setup)
            // vs a multi-session dump (keys are session names containing objects with setup/chatHistory)
            let sessionsData;
            if (rawData.sessions) {
                // New dump format with sessions wrapper
                sessionsData = rawData.sessions;
            } else if (rawData.chatHistory !== undefined || rawData.setup !== undefined || rawData.allChatPrompts !== undefined) {
                // Single session file: derive name from filename, wrap it
                const baseName = file.name.replace(/\.json$/i, '').replace(/^store_/, '');
                sessionsData = {};
                sessionsData[baseName] = rawData;
            } else {
                // Old flat format: keys are session names
                sessionsData = rawData;
            }

            // Group sessions by their server type for correct localStorage and tree placement
            const sessionsByServer = {};
            Object.entries(sessionsData).forEach(([name, data]) => {
                if (data && !data.error) {
                    // Use the llmServer from setup config to store under the correct server prefix
                    const server = (data.setup && data.setup.llmServer) || llmServerSelect.value;
                    const sessionPrefix = server + '_session_';
                    compressAndStore(sessionPrefix + name, JSON.stringify(data));
                    if (!sessionsByServer[server]) sessionsByServer[server] = [];
                    sessionsByServer[server].push(name);
                    lastServer = server;
                    count++;
                }
            });
            // Switch to the server from the loaded dump AND sync backend
            if (lastServer && lastServer !== llmServerSelect.value) {
                llmServerSelect.value = lastServer;
                sidebarLlmServerSelect.value = lastServer;
                saveSelectedLlmServer(lastServer);

                // Sync backend: set server type, then host from the imported session
                try {
                    await fetch(`${API_BASE_URL}/set_model_server`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ server_type: lastServer })
                    });
                    // Find the host from the last imported session
                    const lastSessionData = Object.values(sessionsData).find(d => d && d.setup && d.setup.llmServer === lastServer);
                    const importedHost = lastSessionData && lastSessionData.setup && lastSessionData.setup.host;
                    if (importedHost) {
                        hostInput.value = importedHost;
                        await fetch(`${API_BASE_URL}/set_host`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ host: importedHost })
                        });
                    }
                    // Restore saved API key for this server
                    const savedApiKey = getApiKeyForServer(lastServer);
                    if (savedApiKey) {
                        apiKeyInput.value = savedApiKey;
                        await fetch(`${API_BASE_URL}/set_key`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ api_key: savedApiKey })
                        });
                    }
                } catch (e) {
                    console.error('Error syncing backend after dump load:', e);
                }
            }
            // Place imported sessions into the correct server tree for each server
            {
                const savedServer = llmServerSelect.value;
                for (const [server, names] of Object.entries(sessionsByServer)) {
                    // Temporarily set the server so getSessionTree/saveSessionTree target the right tree
                    llmServerSelect.value = server;
                    const tree = getSessionTree();
                    const targetFolder = getFolderAtPath(tree, currentFolderPath) || tree;
                    for (const name of names) {
                        removeSessionFromTree(tree, name);
                        targetFolder.children.push({ type: 'session', name: name });
                    }
                    saveSessionTree(tree);
                }
                // Restore the active server (lastServer or original)
                llmServerSelect.value = lastServer || savedServer;
            }
            populateSessionSelect();
            showModal(`${count} session(s) loaded successfully.`, true);
        } catch (err) {
            console.error('Error loading store file:', err);
            showModal('Error reading store file: ' + err.message, false);
        }
    };
    reader.onerror = () => {
        showModal('Error reading file.', false);
    };
    reader.readAsText(file);
    dumpFileInput.value = ''; // Reset
});

// =============================================
// Archive: save ALL sessions + tree for current server
// =============================================
const archiveButton = document.getElementById('archiveButton');
const archiveFileInput = document.getElementById('archiveFileInput');
const restoreArchiveButton = document.getElementById('restoreArchiveButton');

archiveButton.addEventListener('click', () => {
    const server = llmServerSelect.value;
    const sessionPrefix = server + '_session_';
    const tree = getSessionTree();

    // Auto-save current session before archiving
    if (currentSessionName) {
        try {
            const currentData = buildCurrentSessionData();
            compressAndStore(sessionPrefix + currentSessionName, JSON.stringify(currentData));
        } catch (e) {
            console.error('Error auto-saving current session before archive:', e);
        }
    }

    // Collect all sessions for this server
    const sessions = {};
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(sessionPrefix)) {
            const name = key.substring(sessionPrefix.length);
            if (name === 'tree') continue;
            try {
                const parsed = JSON.parse(loadAndDecompress(key));
                // Exclude sensitive fields
                delete parsed.confidential;
                delete parsed.secret;
                delete parsed.apiKey;
                sessions[name] = parsed;
                count++;
            } catch (e) {
                console.error(`Error reading session ${name}:`, e);
            }
        }
    }

    if (count === 0) {
        showModal('No sessions to archive for server "' + server + '".', false);
        return;
    }

    const archiveData = {
        archive: true,
        server: server,
        tree: tree,
        sessions: sessions
    };

    const now = new Date();
    const dateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const fileName = 'archive_' + server + '_' + dateStr + '.json';

    const blob = new Blob([JSON.stringify(archiveData, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showModal(`Archive saved: ${count} session(s) for "${server}" → ${fileName}`, true);
});

// =============================================
// Restore: load an archive file
// =============================================
restoreArchiveButton.addEventListener('click', () => {
    archiveFileInput.click();
});

archiveFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const archiveData = JSON.parse(e.target.result);

            // Validate archive format
            if (!archiveData.archive || !archiveData.server || !archiveData.sessions) {
                showModal('Invalid archive file format.', false);
                return;
            }

            const server = archiveData.server;
            const sessionPrefix = server + '_session_';
            let count = 0;

            // Store all sessions into localStorage under the correct server prefix
            Object.entries(archiveData.sessions).forEach(([name, data]) => {
                if (data && !data.error) {
                    compressAndStore(sessionPrefix + name, JSON.stringify(data));
                    count++;
                }
            });

            // Restore the tree structure for this server
            if (archiveData.tree) {
                const savedServer = llmServerSelect.value;
                llmServerSelect.value = server;
                saveSessionTree(archiveData.tree);
                llmServerSelect.value = savedServer;
            }

            // Switch to the restored server and sync backend
            if (server !== llmServerSelect.value) {
                llmServerSelect.value = server;
                sidebarLlmServerSelect.value = server;
                saveSelectedLlmServer(server);

                try {
                    await fetch(`${API_BASE_URL}/set_model_server`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ server_type: server })
                    });
                    // Find a host from the restored sessions
                    const sampleSession = Object.values(archiveData.sessions).find(d => d && d.setup && d.setup.host);
                    if (sampleSession && sampleSession.setup.host) {
                        hostInput.value = sampleSession.setup.host;
                        await fetch(`${API_BASE_URL}/set_host`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ host: sampleSession.setup.host })
                        });
                    }
                    // Restore saved API key for this server
                    const savedApiKey = getApiKeyForServer(server);
                    if (savedApiKey) {
                        apiKeyInput.value = savedApiKey;
                        await fetch(`${API_BASE_URL}/set_key`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ api_key: savedApiKey })
                        });
                    }
                } catch (err) {
                    console.error('Error syncing backend after archive restore:', err);
                }
            }

            populateSessionSelect();
            showModal(`Archive restored: ${count} session(s) for "${server}".`, true);
        } catch (err) {
            console.error('Error loading archive file:', err);
            showModal('Error reading archive file: ' + err.message, false);
        }
    };
    reader.onerror = () => {
        showModal('Error reading archive file.', false);
    };
    reader.readAsText(file);
    archiveFileInput.value = '';
});

// --- Helper: create a message bubble DOM element (does NOT append) ---
// Transforme le contenu d'un message assistant en HTML, en isolant les
// blocs de raisonnement <think>...</think> (modèles "thinking" Qwen3, etc.)
// dans un <details> repliable affiché distinctement de la réponse finale.
function _renderAssistantContent(text) {
    const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
    let html = '';
    let lastIndex = 0;
    let match;
    while ((match = thinkRegex.exec(text)) !== null) {
        // Texte de réponse normale avant le bloc de raisonnement
        const before = text.slice(lastIndex, match.index);
        if (before.trim()) {
            html += marked.parse(before);
        }
        const reasoning = match[1];
        if (reasoning.trim()) {
            html += '<details class="think-block">'
                + '<summary>🤔 Raisonnement</summary>'
                + '<div class="think-content">' + marked.parse(reasoning) + '</div>'
                + '</details>';
        }
        lastIndex = thinkRegex.lastIndex;
    }
    // Reste du texte (réponse finale) après le dernier bloc
    const rest = text.slice(lastIndex);
    if (rest.trim() || html === '') {
        html += marked.parse(rest);
    }
    return html;
}

function _createBubbleElement(text, sender, images) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message-bubble');

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('bubble-content');

    if (sender === 'user') {
        messageDiv.classList.add('user-message', 'self-end');
        contentDiv.innerHTML = DOMPurify.sanitize(marked.parse(text));
    } else {
        messageDiv.classList.add('assistant-message', 'self-start');
        contentDiv.innerHTML = DOMPurify.sanitize(_renderAssistantContent(text));
    }

    // Render attached images (if any) as thumbnails inside the bubble
    if (Array.isArray(images) && images.length > 0) {
        const imagesWrap = document.createElement('div');
        imagesWrap.classList.add('bubble-images');
        images.forEach(im => {
            if (!im || !im.src) return;
            const img = document.createElement('img');
            img.classList.add('bubble-image');
            img.src = im.src;
            img.alt = im.name || 'image';
            img.title = im.name || 'image';
            imagesWrap.appendChild(img);
        });
        contentDiv.appendChild(imagesWrap);
    }

    messageDiv.appendChild(contentDiv);

    // Toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.classList.add('bubble-toggle');
    toggleBtn.textContent = '▲ Fold';
    toggleBtn.addEventListener('click', () => {
        messageDiv.classList.toggle('collapsed');
        toggleBtn.textContent = messageDiv.classList.contains('collapsed') ? '▼ Unfold' : '▲ Fold';
    });
    messageDiv.appendChild(toggleBtn);

    // Copy button
    const actionsDiv = document.createElement('div');
    actionsDiv.classList.add('bubble-actions');
    const copyBtn = document.createElement('button');
    copyBtn.classList.add('bubble-copy-btn');
    copyBtn.title = 'Copy to clipboard';
    copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    copyBtn.addEventListener('click', () => {
        const textToCopy = contentDiv.innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            const orig = copyBtn.innerHTML;
            copyBtn.innerHTML = '✓';
            setTimeout(() => { copyBtn.innerHTML = orig; }, 1500);
        });
    });
    actionsDiv.appendChild(copyBtn);
    messageDiv.appendChild(actionsDiv);

    messageDiv.dataset.sender = sender;

    // Mark collapsible after render
    requestAnimationFrame(() => {
        if (contentDiv.scrollHeight > 80) {
            messageDiv.classList.add('collapsible');
        }
    });

    return messageDiv;
}

// --- Helper: add the "load more" sentinel at the top ---
function _addLoadMoreSentinel(count) {
    const sentinel = document.createElement('div');
    sentinel.id = 'chatLoadMoreSentinel';
    sentinel.className = 'chat-load-more';
    sentinel.textContent = `▲ ${count} earlier message(s)`;
    sentinel.addEventListener('click', _loadOlderMessages);
    messagesDisplay.insertBefore(sentinel, messagesDisplay.firstChild);
}

// --- Helper: load older messages when scrolling up ---
function _loadOlderMessages() {
    const start = chatViewStart[currentChatTab] || 0;
    if (start <= 0) return;

    const history = chatHistory[currentChatTab] || [];
    const newStart = Math.max(0, start - CHAT_LOAD_BATCH);
    const prevScrollHeight = messagesDisplay.scrollHeight;

    // Remove old sentinel
    const oldSentinel = messagesDisplay.querySelector('#chatLoadMoreSentinel');
    if (oldSentinel) oldSentinel.remove();

    // Build fragment with new bubbles
    const fragment = document.createDocumentFragment();
    for (let i = newStart; i < start; i++) {
        fragment.appendChild(_createBubbleElement(history[i].text, history[i].sender, history[i].images));
    }

    // Prepend before existing messages
    messagesDisplay.insertBefore(fragment, messagesDisplay.firstChild);

    // Add sentinel if there are still older messages
    if (newStart > 0) {
        _addLoadMoreSentinel(newStart);
    }

    // Maintain scroll position so the view doesn't jump
    messagesDisplay.scrollTop += messagesDisplay.scrollHeight - prevScrollHeight;

    chatViewStart[currentChatTab] = newStart;
}

// Scroll listener: auto-load older messages when near the top
let _chatScrollTimer = null;
messagesDisplay.addEventListener('scroll', () => {
    if (_chatScrollTimer) return;
    _chatScrollTimer = setTimeout(() => {
        _chatScrollTimer = null;
        if (messagesDisplay.scrollTop < 80) {
            _loadOlderMessages();
        }
    }, 150);
});

// Fonction pour ajouter un message à l'affichage du chat
// targetTab: if provided and differs from currentChatTab, skip DOM update
function addMessage(text, sender, targetTab, images) {
    const tab = targetTab || currentChatTab;
    if (tab !== currentChatTab) return;

    const messageDiv = _createBubbleElement(text, sender, images);
    messagesDisplay.appendChild(messageDiv);

    // Trim oldest bubbles from DOM if window is too large
    const bubbles = messagesDisplay.querySelectorAll('.message-bubble');
    if (bubbles.length > CHAT_WINDOW_SIZE) {
        const excess = bubbles.length - CHAT_WINDOW_SIZE;
        for (let i = 0; i < excess; i++) {
            bubbles[i].remove();
        }
        chatViewStart[currentChatTab] = (chatViewStart[currentChatTab] || 0) + excess;
        // Ensure sentinel exists
        if (!messagesDisplay.querySelector('#chatLoadMoreSentinel') && (chatViewStart[currentChatTab] || 0) > 0) {
            _addLoadMoreSentinel(chatViewStart[currentChatTab]);
        }
    }

    messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
}

// Fonction pour ré-afficher l'historique du chat (fenêtré)
function renderChatHistory() {
    messagesDisplay.innerHTML = '';
    const history = chatHistory[currentChatTab] || [];
    const total = history.length;
    const start = Math.max(0, total - CHAT_WINDOW_SIZE);
    chatViewStart[currentChatTab] = start;

    if (start > 0) {
        _addLoadMoreSentinel(start);
    }

    for (let i = start; i < total; i++) {
        messagesDisplay.appendChild(_createBubbleElement(history[i].text, history[i].sender, history[i].images));
    }

    messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
}

// Fonction utilitaire pour échapper le HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Fonction pour afficher une modale personnalisée (remplace alert/confirm)
function showModal(message, isSuccess = true) {
    const notif = document.getElementById('saveFlashNotif');
    const icon = isSuccess ? '✓' : '✗';
    notif.textContent = `${icon} ${message}`;
    notif.style.background = isSuccess ? 'var(--success)' : 'var(--danger)';
    notif.classList.add('visible');
    setTimeout(() => {
        notif.classList.remove('visible');
        notif.style.background = '';
    }, 3000);
}

// NEW: Function to save the selected model to localStorage
function saveSelectedModel(modelName) {
    localStorage.setItem('lastSelectedOllamaModel', modelName);
}

// NEW: Function to get the last selected model from localStorage
function getLastSelectedModel() {
    return localStorage.getItem('lastSelectedOllamaModel');
}

// NEW: Function to save the selected LLM server to localStorage
function saveSelectedLlmServer(serverType) {
    localStorage.setItem('lastSelectedLlmServer', serverType);
}

// NEW: Function to get the last selected LLM server from localStorage
function getLastSelectedLlmServer() {
    return localStorage.getItem('lastSelectedLlmServer');
}


// NEW: Functions to save and get host, max tokens, and API key from localStorage
function saveHost(host) {
    localStorage.setItem('lastSelectedHost', host);
}

function getLastHost() {
    return localStorage.getItem('lastSelectedHost');
}

function saveMaxTokens(maxTokens) {
    localStorage.setItem('lastSelectedMaxTokens', maxTokens);
}

function getLastMaxTokens() {
    return localStorage.getItem('lastSelectedMaxTokens');
}



// Function to send a prompt to the LLM and return the response as a string
async function call_llm(prompt) {
    const modelName = modelNameSelect.value.trim();
    if (!modelName) {
        throw new Error('No model selected. Please select a model first.');
    }

    const messages = [{ role: 'user', content: prompt }];

    const callLlmBody = {
        messages: messages,
        model_name: modelName
    };
    // Inject LLM extra parameters if applicable
    const vllmParamsLlm = getVllmExtraParams();
    if (Object.keys(vllmParamsLlm).length > 0) {
        callLlmBody.llm_params = vllmParamsLlm;
    }

    const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(callLlmBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let result = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
    }

    // Add the response to the chat display and history
    const targetTab = currentChatTab;
    if (!chatHistory[targetTab]) chatHistory[targetTab] = [];
    chatHistory[targetTab].push({ sender: 'assistant', text: result });
    addMessage(result, 'assistant', targetTab);
    saveChatSessionForTab(targetTab);

    return result;
}

// Function to send a chat structure (JSON string) to the LLM and return the response as a string
// The input is a JSON string representing an array of messages: [{"role":"user","content":"..."},{"role":"assistant","content":"..."},...]
async function call_chat(base64) {
    const targetTab = currentChatTab;
    jsonString = unicodeAtob(base64);
    const modelName = modelNameSelect.value.trim();
    if (!modelName) {
        throw new Error('No model selected. Please select a model first.');
    }

    let messages;
    try {
        messages = JSON.parse(jsonString);
    } catch (e) {
        throw new Error('Invalid JSON string: ' + e.message);
    }

    if (!Array.isArray(messages)) {
        throw new Error('Parsed JSON must be an array of message objects.');
    }

    // Collect tools from tool tabs (each tab contains a single JSON tool definition)
    saveCurrentToolToMemory();
    const tools = [];
    toolTabNames.forEach(name => {
        const content = (allToolContents[name] || '').trim();
        if (content.length > 0) {
            try {
                tools.push(JSON.parse(content));
            } catch (e) {
                console.warn(`Tool tab "${name}" contains invalid JSON, skipping: ${e.message}`);
            }
        }
    });

    const requestBody = {
        messages: messages,
        model_name: modelName
    };
    if (tools.length > 0) {
        requestBody.tools = tools;
    }
    // Inject LLM extra parameters if applicable
    const vllmParams = getVllmExtraParams();
    if (Object.keys(vllmParams).length > 0) {
        requestBody.llm_params = vllmParams;
    }

    const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let result = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
    }

    // Add the response to the chat display and history
    if (!chatHistory[targetTab]) chatHistory[targetTab] = [];
    chatHistory[targetTab].push({ sender: 'assistant', text: result });
    addMessage(result, 'assistant', targetTab);
    markSessionModified();
    saveChatSessionForTab(targetTab);

    // Append the assistant response to the messages array and return as JSON string
    messages.push({ role: 'assistant', content: result });
    return unicodeBtoa(JSON.stringify(messages));
}

// call_chat_server: like call_chat but uses a config snapshot key to select server+model
// Uses the dedicated /chat_with_config endpoint — no global state mutation, safe for parallel calls
async function call_chat_server(configKeyB64, base64) {
    const targetTab = currentChatTab;
    const configKey = unicodeAtob(configKeyB64);
    const table = _readConfigSnapshotsTable();
    const config = table[configKey];
    if (!config) {
        throw new Error(`Configuration key "${configKey}" not found.`);
    }

    const jsonString = unicodeAtob(base64);
    let messages;
    try {
        messages = JSON.parse(jsonString);
    } catch (e) {
        throw new Error('Invalid JSON string: ' + e.message);
    }
    if (!Array.isArray(messages)) {
        throw new Error('Parsed JSON must be an array of message objects.');
    }

    // Collect tools from tool tabs
    saveCurrentToolToMemory();
    const tools = [];
    toolTabNames.forEach(name => {
        const content = (allToolContents[name] || '').trim();
        if (content.length > 0) {
            try { tools.push(JSON.parse(content)); } catch (e) { }
        }
    });

    // Build request body with embedded server config
    const requestBody = {
        server_type: config.server,
        host: config.host || '',
        api_key: config.apiKey || '',
        max_tokens: config.maxTokens || '',
        messages: messages,
        model_name: config.model || ''
    };
    if (tools.length > 0) requestBody.tools = tools;

    const llmParams = {};
    if (config.temperature != null) llmParams.temperature = config.temperature;
    if (config.top_p != null) llmParams.top_p = config.top_p;
    if (config.llm_max_tokens != null) llmParams.llm_max_tokens = config.llm_max_tokens;
    if (config.presence_penalty != null && config.server !== 'claude') llmParams.presence_penalty = config.presence_penalty;
    if (config.extra_body) {
        const flatExtra = {};
        for (const [k, entry] of Object.entries(config.extra_body)) {
            if (entry && typeof entry === 'object' && 'value' in entry) {
                if (entry.enabled !== false) flatExtra[k] = entry.value;
            } else {
                flatExtra[k] = entry;
            }
        }
        if (Object.keys(flatExtra).length > 0) llmParams.extra_body = flatExtra;
    }
    if (Object.keys(llmParams).length > 0) requestBody.llm_params = llmParams;

    const response = await fetch(`${API_BASE_URL}/chat_with_config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let result = '';
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
    }

    // Add the response to the chat display and history
    if (!chatHistory[targetTab]) chatHistory[targetTab] = [];
    chatHistory[targetTab].push({ sender: 'assistant', text: result });
    addMessage(result, 'assistant', targetTab);
    markSessionModified();
    saveChatSessionForTab(targetTab);

    messages.push({ role: 'assistant', content: result });
    return unicodeBtoa(JSON.stringify(messages));
}

// call_chat_server_silent: like call_chat_silent but uses a config snapshot key
// Uses the dedicated /chat_with_config endpoint — no global state mutation, safe for parallel calls
async function call_chat_server_silent(configKeyB64, base64) {
    const configKey = unicodeAtob(configKeyB64);
    const table = _readConfigSnapshotsTable();
    const config = table[configKey];
    if (!config) {
        throw new Error(`Configuration key "${configKey}" not found.`);
    }

    const jsonString = unicodeAtob(base64);
    let messages;
    try {
        messages = JSON.parse(jsonString);
    } catch (e) {
        throw new Error('Invalid JSON string: ' + e.message);
    }
    if (!Array.isArray(messages)) {
        throw new Error('Parsed JSON must be an array of message objects.');
    }

    // Collect tools from tool tabs
    saveCurrentToolToMemory();
    const tools = [];
    toolTabNames.forEach(name => {
        const content = (allToolContents[name] || '').trim();
        if (content.length > 0) {
            try { tools.push(JSON.parse(content)); } catch (e) { }
        }
    });

    // Build request body with embedded server config
    const requestBody = {
        server_type: config.server,
        host: config.host || '',
        api_key: config.apiKey || '',
        max_tokens: config.maxTokens || '',
        messages: messages,
        model_name: config.model || ''
    };
    if (tools.length > 0) requestBody.tools = tools;

    const llmParams = {};
    if (config.temperature != null) llmParams.temperature = config.temperature;
    if (config.top_p != null) llmParams.top_p = config.top_p;
    if (config.llm_max_tokens != null) llmParams.llm_max_tokens = config.llm_max_tokens;
    if (config.presence_penalty != null && config.server !== 'claude') llmParams.presence_penalty = config.presence_penalty;
    if (config.extra_body) {
        const flatExtra = {};
        for (const [k, entry] of Object.entries(config.extra_body)) {
            if (entry && typeof entry === 'object' && 'value' in entry) {
                if (entry.enabled !== false) flatExtra[k] = entry.value;
            } else {
                flatExtra[k] = entry;
            }
        }
        if (Object.keys(flatExtra).length > 0) llmParams.extra_body = flatExtra;
    }
    if (Object.keys(llmParams).length > 0) requestBody.llm_params = llmParams;

    const response = await fetch(`${API_BASE_URL}/chat_with_config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let result = '';
    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
    }

    messages.push({ role: 'assistant', content: result });
    return unicodeBtoa(JSON.stringify(messages));
}

function add_message(msg, tab) {
    const targetTab = tab || currentChatTab;
    const result = unicodeAtob(msg);
    if (!chatHistory[targetTab]) chatHistory[targetTab] = [];
    if (chatHistory[targetTab].length == 0)
        chatHistory[targetTab].push({ sender: 'system', text: result });
    else
        chatHistory[targetTab].push({ sender: 'assistant', text: result });
    addMessage(result, 'assistant', targetTab);
    markSessionModified();
    saveChatSessionForTab(targetTab);
}

function add_request(msg, tab) {
    const targetTab = tab || currentChatTab;
    const result = unicodeAtob(msg);
    if (!chatHistory[targetTab]) chatHistory[targetTab] = [];
    chatHistory[targetTab].push({ sender: 'user', text: result });
    addMessage(result, 'user', targetTab);
    markSessionModified();
    saveChatSessionForTab(targetTab);
}

// Simulates a user message in a specific tab and triggers entry(prompts)
function input_chat(msg, tab) {
    const targetTab = tab || currentChatTab;
    if (targetTab !== currentChatTab) {
        switchChatTab(targetTab);
    }
    const userMessage = unicodeAtob(msg);
    if (!chatHistory[targetTab]) chatHistory[targetTab] = [];
    chatHistory[targetTab].push({ sender: 'user', text: userMessage });
    addMessage(userMessage, 'user', targetTab);
    markSessionModified();
    saveChatSessionForTab(targetTab);
    // Build formatted history for this tab and call entry
    const formattedHistory = (chatHistory[targetTab] || [])
        .map(m => ({ role: m.sender, content: m.text }));
    const chats = unicodeBtoa(JSON.stringify(formattedHistory));
    const entryCall = `(entry \u00AB${chats}\u00BB)`;
    setTimeout(() => run_code(entryCall), 0);
}

// Function to send a chat structure (JSON string) to the LLM and return the response as a string
// The input is a JSON string representing an array of messages: [{"role":"user","content":"..."},{"role":"assistant","content":"..."},...]
async function call_chat_silent(base64) {
    jsonString = unicodeAtob(base64);
    const modelName = modelNameSelect.value.trim();
    if (!modelName) {
        throw new Error('No model selected. Please select a model first.');
    }

    let messages;
    try {
        messages = JSON.parse(jsonString);
    } catch (e) {
        throw new Error('Invalid JSON string: ' + e.message);
    }

    if (!Array.isArray(messages)) {
        throw new Error('Parsed JSON must be an array of message objects.');
    }

    // Collect tools from tool tabs (each tab contains a single JSON tool definition)
    saveCurrentToolToMemory();
    const tools = [];
    toolTabNames.forEach(name => {
        const content = (allToolContents[name] || '').trim();
        if (content.length > 0) {
            try {
                tools.push(JSON.parse(content));
            } catch (e) {
                console.warn(`Tool tab "${name}" contains invalid JSON, skipping: ${e.message}`);
            }
        }
    });

    const requestBody = {
        messages: messages,
        model_name: modelName
    };
    if (tools.length > 0) {
        requestBody.tools = tools;
    }
    // Inject LLM extra parameters if applicable
    const vllmParams2 = getVllmExtraParams();
    if (Object.keys(vllmParams2).length > 0) {
        requestBody.llm_params = vllmParams2;
    }

    const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let result = '';

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
    }

    // Append the assistant response to the messages array and return as JSON string
    messages.push({ role: 'assistant', content: result });
    return unicodeBtoa(JSON.stringify(messages));
}

clearSystemPromptButton.addEventListener('click', async () => {
    const tabCount = systemPromptTabNames.length;
    if (tabCount > 5) {
        saveCurrentChatPromptsToMemory();
        const deletedName = currentSystemPromptTab;
        // Save content from all chat tabs for undo
        const deletedContents = {};
        chatTabNames.forEach(chatTab => {
            deletedContents[chatTab] = (allChatPrompts[chatTab] || {})[deletedName] || '';
        });
        const deletedIndex = systemPromptTabNames.indexOf(deletedName);
        systemPromptDeletedTabsStack.push({ contents: deletedContents, index: deletedIndex });
        updateUndoSystemPromptButton();

        systemPromptTabNames.splice(deletedIndex, 1);
        chatTabNames.forEach(chatTab => {
            if (allChatPrompts[chatTab]) delete allChatPrompts[chatTab][deletedName];
        });

        renumberSystemPromptTabs();

        const newIndex = Math.min(deletedIndex, systemPromptTabNames.length - 1);
        switchSystemPromptTab(systemPromptTabNames[newIndex]);
    } else {
        saveCurrentChatPromptsToMemory();
        const clearedContent = (allChatPrompts[currentChatTab] || {})[currentSystemPromptTab] || '';
        if (clearedContent) {
            const clearedContents = {};
            chatTabNames.forEach(chatTab => {
                clearedContents[chatTab] = (allChatPrompts[chatTab] || {})[currentSystemPromptTab] || '';
            });
            systemPromptDeletedTabsStack.push({ contents: clearedContents, index: systemPromptTabNames.indexOf(currentSystemPromptTab), cleared: true, tabName: currentSystemPromptTab });
            updateUndoSystemPromptButton();
        }
        const currentInput = getCurrentSystemPromptInput();
        if (currentInput) {
            currentInput.value = "";
            allChatPrompts[currentChatTab][currentSystemPromptTab] = '';
        }
        // Move to previous tab (unless on tab 0)
        const idx = systemPromptTabNames.indexOf(currentSystemPromptTab);
        if (idx > 0) {
            switchSystemPromptTab(systemPromptTabNames[idx - 1]);
        }
    }
});

// Undo last deleted System Prompt tab
undoSystemPromptTabButton.addEventListener('click', () => {
    if (systemPromptDeletedTabsStack.length === 0) return;
    const restored = systemPromptDeletedTabsStack.pop();
    updateUndoSystemPromptButton();

    if (restored.cleared) {
        const tabName = restored.tabName;
        chatTabNames.forEach(chatTab => {
            if (!allChatPrompts[chatTab]) allChatPrompts[chatTab] = {};
            allChatPrompts[chatTab][tabName] = (restored.contents || {})[chatTab] || '';
        });
        // Update the textarea so saveCurrentChatPromptsToMemory won't overwrite
        const ta = systemPromptTabsContent.querySelector(`.systemprompt-textarea[data-systemprompt="${tabName}"]`);
        if (ta) ta.value = (restored.contents || {})[currentChatTab] || '';
        switchSystemPromptTab(tabName);
    } else {
        const insertIndex = Math.min(restored.index, systemPromptTabNames.length);
        const tempName = `Sys __tmp_${Date.now()}`;
        systemPromptTabNames.splice(insertIndex, 0, tempName);
        chatTabNames.forEach(chatTab => {
            if (!allChatPrompts[chatTab]) allChatPrompts[chatTab] = {};
            allChatPrompts[chatTab][tempName] = (restored.contents || {})[chatTab] || '';
        });

        renumberSystemPromptTabs();

        switchSystemPromptTab(systemPromptTabNames[insertIndex]);
    }
});

// Copy current prompt tab to clipboard
document.getElementById('copyPromptButton').addEventListener('click', () => {
    const currentInput = getCurrentSystemPromptInput();
    if (currentInput) {
        const btn = document.getElementById('copyPromptButton');
        navigator.clipboard.writeText(currentInput.value).then(() => {
            const orig = btn.innerHTML;
            btn.innerHTML = '\u2713';
            setTimeout(() => { btn.innerHTML = orig; }, 1500);
        });
    }
});

// Stop LispE execution
document.getElementById('stopButton').addEventListener('click', () => {
    run_code('(println . stop_)');
});

// Clear Display output
clearDisplayButton.addEventListener('click', () => {
    cleanDisplay();
});

// Copy Display output to clipboard
document.getElementById('copyDisplayButton').addEventListener('click', () => {
    const text = displayOutputEl.innerText;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyDisplayButton');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '✓';
        setTimeout(() => { btn.innerHTML = originalHTML; }, 1500);
    });
});

