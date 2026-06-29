// NEW: Function to list available models based on selected LLM server and populate the dropdown
async function listAvailableModels() {
    loadingSpinner.classList.remove('hidden'); // Show spinner

    try {
        // Determine which endpoint to use based on selected LLM server
        const serverType = llmServerSelect.value || 'vllm'; // Default to vllm
        let endpoint;
        
        switch(serverType) {
            case 'vllm':
                endpoint = `${API_BASE_URL}/list_vllm_models`;
                break;
            case 'lmstudio':
                endpoint = `${API_BASE_URL}/list_lmstudio_models`;
                break;
            case 'claude':
                endpoint = `${API_BASE_URL}/list_claude_models`;
                break;
            case 'openai':
                endpoint = `${API_BASE_URL}/list_openai_models`;
                break;
            case 'mistral':
                endpoint = `${API_BASE_URL}/list_mistral_models`;
                break;
            case 'ollama':
            default:
                endpoint = `${API_BASE_URL}/list_ollama_models`;
                break;
        }

        const response = await fetch(endpoint);
        if (!response.ok) {
            console.error(`Server returned ${response.status} for ${endpoint}`);
            showModal(`Error listing models: server returned ${response.status}`, false);
            return false;
        }
        const data = await response.json();

        // Clear existing options in the dropdown
        modelNameSelect.innerHTML = '<option value="">Select a model</option>';

        if (data.status === 'success' && data.models && data.models.length > 0) {
            const modelNames = data.models.map(model => model.name).sort(); // Get names and sort them
            modelNames.forEach(modelName => {
                const option = document.createElement('option');
                option.value = modelName;
                option.textContent = modelName;
                modelNameSelect.appendChild(option);
            });
            // Set the dropdown to the last selected model from localStorage
            const lastSelectedModel = getLastSelectedModel();
            const vllmDefaultModel = localStorage.getItem('vllm_default_model');
            
            // Check if we're using vLLM and have a default model for it
            if (llmServerSelect.value === 'vllm' && vllmDefaultModel && modelNames.includes(vllmDefaultModel)) {
                modelNameSelect.value = vllmDefaultModel;
                saveSelectedModel(vllmDefaultModel);
            } else if (lastSelectedModel && modelNames.includes(lastSelectedModel)) {
                modelNameSelect.value = lastSelectedModel;
            } else {
                // If no last selected model or it's not available, try to set the server's default
                try {
                    const defaultModelResponse = await fetch(`${API_BASE_URL}/get_default_model`);
                    const defaultModelData = await defaultModelResponse.json();
                    if (defaultModelData.default_model && modelNames.includes(defaultModelData.default_model)) {
                        modelNameSelect.value = defaultModelData.default_model;
                        saveSelectedModel(defaultModelData.default_model); // Save this as the new last selected
                    }
                } catch (error) {
                    console.error('Error loading default model from server:', error);
                }
            }
        } else if (data.status === 'success' && data.models.length === 0) {
            console.log(`No ${serverType} models found.`);
        } else {
            console.error(`Error listing ${serverType} models: ${data.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error(`Error listing ${llmServerSelect.value || 'LLM'} models:`, error);
        console.error(`Error connecting to ${llmServerSelect.value || 'LLM'} server or listing models: ${error.message}`);
        return false;
    } finally {
        loadingSpinner.classList.add('hidden'); // Hide spinner
    }
}

// Full server defaults cache (will be overwritten by backend values at startup)
let serverDefaultsCache = {};

// Per-server host defaults (will be overwritten by backend values at startup)
let defaultHosts = {
    lmstudio: 'http://127.0.0.1:1234/v1',
    ollama: 'http://127.0.0.1:11434',
    vllm: 'http://10.57.16.43:8012/v1',
    openai: 'https://api.openai.com/v1',
    claude: 'https://api.anthropic.com',
    mistral: 'https://api.mistral.ai/v1'
};

// Fetch server defaults from FastAPI backend and update caches
async function fetchServerDefaults() {
    try {
        const resp = await fetch(`${API_BASE_URL}/get_server_defaults`);
        const data = await resp.json();
        serverDefaultsCache = data;
        for (const [serverType, defaults] of Object.entries(data)) {
            if (defaults.host) {
                defaultHosts[serverType] = defaults.host;
            }
        }
        console.log('Server defaults loaded from backend:', data);
    } catch (e) {
        console.error('Error fetching server defaults:', e);
    }
}

// Load server defaults at page startup
fetchServerDefaults();

// Save host for a specific server type
function saveHostForServer(serverType, host) {
    localStorage.setItem('host_' + serverType, host);
}

// Get saved host for a specific server type, or its default
function getHostForServer(serverType) {
    return localStorage.getItem('host_' + serverType) || defaultHosts[serverType] || '';
}

// Save API key for a specific server type
function saveApiKeyForServer(serverType, apiKey) {
    localStorage.setItem('apikey_' + serverType, apiKey);
}

// Get saved API key for a specific server type
function getApiKeyForServer(serverType) {
    return localStorage.getItem('apikey_' + serverType) || '';
}

// Flag to distinguish sidebar server switch from settings panel switch
let _sidebarServerSwitch = false;

// NEW: Event listener to update models list when LLM server selection changes
llmServerSelect.addEventListener('change', async () => {
    const serverType = llmServerSelect.value;

    // Save current host and API key for the previous server before switching
    const previousServer = getLastSelectedLlmServer();
    if (previousServer) {
        saveHostForServer(previousServer, hostInput.value);
        saveApiKeyForServer(previousServer, apiKeyInput.value.trim());
    }

    if (_sidebarServerSwitch) {
        // Sidebar path: if session is modified, ask to save, then full reset
        if (currentSessionName && previousServer && previousServer !== serverType) {
            if (sessionModified) {
                const wantSave = confirm('Session modified. Save before switching servers?');
                if (wantSave) {
                    try {
                        const sessionData = buildCurrentSessionData();
                        if (sessionData.setup) sessionData.setup.llmServer = previousServer;
                        chatTabNames.forEach(chatTab => {
                            const ck = previousServer + `_chat_${chatTab}_current`;
                            try {
                                const td = loadAndDecompress(ck);
                                sessionData.allChatHistories[chatTab] = td ? (JSON.parse(td).chatHistory || []) : [];
                            } catch (e) {
                                sessionData.allChatHistories[chatTab] = [];
                            }
                        });
                        compressAndStore(previousServer + `_session_${currentSessionName}`, JSON.stringify(sessionData));
                    } catch (e) {
                        console.error('Error saving session before server switch:', e);
                    }
                }
            }
        }

        // Full reset of the environment (like the Reset button)
        chatHistory.length = 0;
        undoneChatHistory.length = 0;
        renderChatHistory();
        chatInput.value = '';

        // Clean localStorage chat sessions for all servers
        chatTabNames.forEach(chatTab => {
            ['vllm', 'ollama', 'lmstudio', 'claude', 'openai', 'mistral'].forEach(server => {
                localStorage.removeItem(server + `_chat_${chatTab}_current`);
            });
        });

        // Reset chat tab to Chat 1
        resetChatTabs();

        // Reset all system prompts (keep default Sys 0 prompt)
        chatTabNames.forEach(tab => {
            const emptyPrompts = {};
            systemPromptTabNames.forEach(name => {
                emptyPrompts[name] = (name === 'Sys 0') ? DEFAULT_SYSTEM_PROMPT_SYS0 : '';
            });
            allChatPrompts[tab] = emptyPrompts;
        });
        systemPromptTabsContent.querySelectorAll('.systemprompt-textarea').forEach(ta => {
            ta.value = (ta.dataset.systemprompt === 'Sys 0') ? DEFAULT_SYSTEM_PROMPT_SYS0 : '';
        });
        switchSystemPromptTab('Sys 0');

        // Reset all skills
        Object.keys(allSkillContents).forEach(k => { allSkillContents[k] = ''; });
        skillTabsContent.querySelectorAll('.skill-textarea').forEach(ta => { ta.value = ''; });
        switchSkillTab(skillTabNames[0]);

        // Reset all tools
        Object.keys(allToolContents).forEach(k => { allToolContents[k] = ''; });
        toolTabsContent.querySelectorAll('.tool-textarea').forEach(ta => { ta.value = ''; });
        switchToolTab(toolTabNames[0]);

        // Reset all user data
        Object.keys(allUserDataContents).forEach(k => { allUserDataContents[k] = ''; });
        userDataTabsContent.querySelectorAll('.userdata-textarea').forEach(ta => { ta.value = ''; });
        switchUserDataTab(userDataTabNames[0]);

        // Reset agents, code runner, initialization
        resetAgentTabs();
        resetCodeRunnerTabs();
        resetInitTabs();

        // Clear confidential and secret fields
        document.getElementById('confidentialInput').value = '';
        document.getElementById('secretInput').value = '';

        // Clear Display
        document.getElementById('displayOutput').innerHTML = '<p class="text-gray-400">Output will appear here.</p>';

        // Reset principles
        currentPrinciples = [];
        lastSelectedPrinciple = '';

        // Reset session selection
        currentSessionName = '';
        updateTopBarSessionName();
        clearSessionModified();
        populateSessionSelect();
        updateSaveButtonState();

        // Disconnect all MCP connectors
        disconnectAllConnectors();
    } else {
        // Settings path: auto-save under previous server, then propose duplication
        if (currentSessionName && previousServer && previousServer !== serverType) {
            const originalSessionName = currentSessionName;

            // Save current session under the previous server
            try {
                const sessionData = buildCurrentSessionData();
                if (sessionData.setup) sessionData.setup.llmServer = previousServer;
                chatTabNames.forEach(chatTab => {
                    const ck = previousServer + `_chat_${chatTab}_current`;
                    try {
                        const td = loadAndDecompress(ck);
                        sessionData.allChatHistories[chatTab] = td ? (JSON.parse(td).chatHistory || []) : [];
                    } catch (e) {
                        sessionData.allChatHistories[chatTab] = [];
                    }
                });
                compressAndStore(previousServer + `_session_${originalSessionName}`, JSON.stringify(sessionData));
            } catch (e) {
                console.error('Error saving session before server switch:', e);
            }

            // Ask for duplication
            const wantDuplicate = await new Promise(resolve => {
                const modal = document.createElement('div');
                modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
                modal.innerHTML = `
                    <div class="bg-white p-6 rounded-lg shadow-xl text-center" style="max-width:420px;">
                        <p class="mb-4" style="color:var(--text-primary);">Cloning the session <strong>"${originalSessionName}"</strong> for the server <strong>${serverType}</strong> ?</p>
                        <div class="flex justify-center gap-3">
                            <button id="dupYes" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Oui</button>
                            <button id="dupNo" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Non</button>
                        </div>
                    </div>`;
                document.body.appendChild(modal);
                modal.querySelector('#dupYes').addEventListener('click', () => { document.body.removeChild(modal); resolve(true); });
                modal.querySelector('#dupNo').addEventListener('click', () => { document.body.removeChild(modal); resolve(false); });
            });

            if (wantDuplicate) {
                const newSessionName = originalSessionName + '_' + serverType;
                try {
                    const sessionData = buildCurrentSessionData();
                    if (sessionData.setup) {
                        sessionData.setup.llmServer = serverType;
                        sessionData.setup.host = getHostForServer(serverType);
                    }
                    // Clear API key: the cloned session should not carry over the previous server's key
                    sessionData.apiKey = '';
                    compressAndStore(serverType + `_session_${newSessionName}`, JSON.stringify(sessionData));
                    currentSessionName = newSessionName;
                    updateTopBarSessionName();
                    clearSessionModified();
                    console.log(`Session duplicated as "${newSessionName}" for server "${serverType}"`);
                } catch (e) {
                    console.error('Error duplicating session for new server:', e);
                }
            } else {
                currentSessionName = '';
                updateTopBarSessionName();
                clearSessionModified();
            }
        }
    }

    // Reset the sidebar flag
    _sidebarServerSwitch = false;

    // Restore saved host for the new server (or use default)
    hostInput.value = getHostForServer(serverType);
    saveHost(hostInput.value);

    // Restore saved API key for the new server
    apiKeyInput.value = getApiKeyForServer(serverType);

    // Clear model dropdown since we switched servers
    modelNameSelect.innerHTML = '<option value="">Select a model</option>';

    try {
        // 1) Set server type on backend first (so set_host targets the right module)
        const resp = await fetch(`${API_BASE_URL}/set_model_server`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ server_type: serverType })
        });
        const data = await resp.json();
        if (data.status === 'success') {
            saveSelectedLlmServer(serverType);
        }

        // 2) Set host on the now-active module
        await fetch(`${API_BASE_URL}/set_host`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ host: hostInput.value })
        });

        // 2b) Send API key for this server to the backend
        const currentApiKey = apiKeyInput.value.trim();
        if (currentApiKey) {
            await fetch(`${API_BASE_URL}/set_key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: currentApiKey })
            });
        }

        // 2c) Re-send max tokens to the new module
        await fetch(`${API_BASE_URL}/set_max_tokens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ max_tokens: parseInt(maxTokensInput.value) || 4096 })
        });

        // 3) Model list is NOT loaded automatically — let session load or user trigger it

        // 4) Update session list and reload current chat session for the new server
        populateSessionSelect();
        loadSessionForChat(currentChatTab);
    } catch (error) {
        console.error('Error switching LLM server:', error);
        showModal('Error switching LLM server: ' + error.message, false);
    }
});

// Synchronisation bidirectionnelle : sidebar → settings
// Sidebar switch: set flag, then trigger Reset + server change
sidebarLlmServerSelect.addEventListener('change', () => {
    _sidebarServerSwitch = true;
    llmServerSelect.value = sidebarLlmServerSelect.value;
    llmServerSelect.dispatchEvent(new Event('change'));
});

// Synchronisation : settings → sidebar (à chaque changement du principal)
llmServerSelect.addEventListener('change', () => {
    sidebarLlmServerSelect.value = llmServerSelect.value;
});

// NEW: Event listener to save the selected model when the dropdown value changes
modelNameSelect.addEventListener('change', () => {
    saveSelectedModel(modelNameSelect.value);
});

// NEW: Event listener to set LLM server type
setLlmServerButton.addEventListener('click', async () => {
    const serverType = llmServerSelect.value;
    
    // Store current user values before they get overwritten
    const currentHost = hostInput.value;
    const currentMaxTokens = maxTokensInput.value;
    const currentApiKey = apiKeyInput.value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/set_model_server`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                server_type: serverType
            })
        });
        if (!response.ok) {
            const errText = await response.text();
            console.error('set_model_server error:', response.status, errText);
            showModal(`Failed to set LLM Server (${response.status})`, false);
            return;
        }
        const data = await response.json();
        if (data.status === 'success') {
            saveSelectedLlmServer(serverType);
            saveHost(currentHost);
            saveMaxTokens(currentMaxTokens);
            // Apply vLLM defaults only if host field is empty or default
            if (serverType === 'vllm' && (!currentHost || currentHost === 'http://127.0.0.1:11434' || currentHost === 'http://127.0.0.1:8080')) {
                applyVllmDefaults();
            } else {
                // Restore user values
                hostInput.value = currentHost;
                maxTokensInput.value = currentMaxTokens;
                apiKeyInput.value = currentApiKey;

                // Send current settings to the new backend module
                const hostResp = await fetch(`${API_BASE_URL}/set_host`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ host: currentHost })
                });
                if (!hostResp.ok) {
                    showModal(`Failed to set host (${hostResp.status})`, false);
                    return;
                }
                if (currentApiKey) {
                    const keyResp = await fetch(`${API_BASE_URL}/set_key`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ api_key: currentApiKey })
                    });
                    if (!keyResp.ok) {
                        showModal(`Failed to set API key (${keyResp.status})`, false);
                        return;
                    }
                }
                const tokResp = await fetch(`${API_BASE_URL}/set_max_tokens`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ max_tokens: parseInt(currentMaxTokens) || 4096 })
                });
                if (!tokResp.ok) {
                    showModal(`Failed to set max tokens (${tokResp.status})`, false);
                    return;
                }
            }
            
            // Load available models for the newly configured server
            const modelsOk = await listAvailableModels();

            if (modelsOk !== false) {
                showModal('LLM Server set successfully!', true);
            }
        } else {
            showModal('Failed to set LLM Server.', false);
        }
    } catch (error) {
        console.error('Error setting LLM Server:', error);
        showModal('Error connecting to server to set LLM Server.', false);
    }
});

// Function to get and set initial LLM server
async function getAndSetLlmServer() {
    try {
        // Check if we have a saved server type in localStorage
        const savedServer = getLastSelectedLlmServer();
        const response = await fetch(`${API_BASE_URL}/get_model_server`);
        const data = await response.json();
        const backendServer = data.server_type;

        // If we have a saved server that differs from backend default, push it
        if (savedServer && savedServer !== backendServer) {
            // Backend restarted — restore saved server type
            const resp = await fetch(`${API_BASE_URL}/set_model_server`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ server_type: savedServer })
            });
            if (!resp.ok) {
                console.error('set_model_server restore error:', resp.status);
            }
            const result = await resp.json().catch(() => ({ status: 'error' }));
            if (result.status === 'success') {
                llmServerSelect.value = savedServer;
                if (sidebarLlmServerSelect) sidebarLlmServerSelect.value = savedServer;

                // Also restore host for this server
                const savedHost = getHostForServer(savedServer);
                if (savedHost) {
                    hostInput.value = savedHost;
                    await fetch(`${API_BASE_URL}/set_host`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ host: savedHost })
                    });
                }
                return; // API key will be restored from session
            }
        }

        // No saved server or same as backend — just apply backend value
        if (backendServer !== undefined) {
            llmServerSelect.value = backendServer;
            if (sidebarLlmServerSelect) sidebarLlmServerSelect.value = backendServer;
            saveSelectedLlmServer(backendServer);
            if (backendServer === 'vllm') {
                applyVllmDefaults();
            }
        }
    } catch (error) {
        console.error('Error fetching LLM Server type:', error);
        showModal('Error fetching LLM Server type from server.', false);
    }
}

// =============================================
// LLM ADVANCED PARAMETERS
// =============================================
const vllmParamsSection = document.getElementById('vllmParamsSection');
const vllmParamsToggle = document.getElementById('vllmParamsToggle');
const vllmParamsArrow = document.getElementById('vllmParamsArrow');
const vllmParamsContent = document.getElementById('vllmParamsContent');
const vllmTemperatureInput = document.getElementById('vllmTemperatureInput');
const vllmTopPInput = document.getElementById('vllmTopPInput');
const vllmPresencePenaltyInput = document.getElementById('vllmPresencePenaltyInput');
const vllmMaxTokensInput = document.getElementById('vllmMaxTokensInput');
const vllmExtraBodyDisplay = document.getElementById('vllmExtraBodyDisplay');
const vllmExtraBodyText = document.getElementById('vllmExtraBodyText');
const vllmExtraBodyEditor = document.getElementById('vllmExtraBodyEditor');
const vllmExtraBodyPairs = document.getElementById('vllmExtraBodyPairs');
const vllmPresencePenaltyGroup = document.getElementById('vllmPresencePenaltyGroup');
const vllmExtraBodyGroup = document.getElementById('vllmExtraBodyGroup');

// Toggle vLLM params collapsible
vllmParamsToggle.addEventListener('click', () => {
    const isOpen = vllmParamsContent.style.display !== 'none';
    vllmParamsContent.style.display = isOpen ? 'none' : 'block';
    vllmParamsArrow.style.transform = isOpen ? '' : 'rotate(90deg)';
});

// Show/hide LLM params section and adapt fields based on server type
function updateVllmParamsVisibility() {
    const server = llmServerSelect.value;
    // Show for all server types
    vllmParamsSection.style.display = 'block';
    // Claude: no presence_penalty, no extra_body
    const isClaude = server === 'claude';
    const isVllm = server === 'vllm';
    vllmPresencePenaltyGroup.style.opacity = isClaude ? '0.4' : '1';
    vllmPresencePenaltyInput.disabled = isClaude;
    vllmExtraBodyGroup.style.opacity = isVllm ? '1' : '0.4';
    vllmExtraBodyGroup.style.pointerEvents = isVllm ? 'auto' : 'none';
}
llmServerSelect.addEventListener('change', () => {
    updateVllmParamsVisibility();
    loadVllmParams();
});

// Per-server default values
const LLM_PARAM_DEFAULTS = {
    vllm:     { temperature: '0.7', top_p: '0.8', presence_penalty: '0.2', max_tokens: '1000' },
    ollama:   { temperature: '0.8', top_p: '0.9', presence_penalty: '0.0', max_tokens: '2048' },
    lmstudio: { temperature: '0.7', top_p: '0.9', presence_penalty: '0.0', max_tokens: '2048' },
    openai:   { temperature: '1.0', top_p: '1.0', presence_penalty: '0.0', max_tokens: '4096' },
    claude:   { temperature: '1.0', top_p: '1.0', presence_penalty: '0.0', max_tokens: '4096' },
    mistral:  { temperature: '0.7', top_p: '1.0', presence_penalty: '0.0', max_tokens: '4096' }
};

// Load LLM params from localStorage (per-server keys)
function loadVllmParams() {
    const server = llmServerSelect.value;
    const defaults = LLM_PARAM_DEFAULTS[server] || LLM_PARAM_DEFAULTS.vllm;
    vllmTemperatureInput.value = localStorage.getItem(`llm_${server}_temperature`) || defaults.temperature;
    vllmTopPInput.value = localStorage.getItem(`llm_${server}_top_p`) || defaults.top_p;
    vllmPresencePenaltyInput.value = localStorage.getItem(`llm_${server}_presence_penalty`) || defaults.presence_penalty;
    vllmMaxTokensInput.value = localStorage.getItem(`llm_${server}_max_tokens_req`) || defaults.max_tokens;
    updateExtraBodyDisplayText();
}

// Save LLM params to localStorage (per-server keys)
function saveVllmParams() {
    const server = llmServerSelect.value;
    localStorage.setItem(`llm_${server}_temperature`, vllmTemperatureInput.value);
    localStorage.setItem(`llm_${server}_top_p`, vllmTopPInput.value);
    localStorage.setItem(`llm_${server}_presence_penalty`, vllmPresencePenaltyInput.value);
    localStorage.setItem(`llm_${server}_max_tokens_req`, vllmMaxTokensInput.value);
}

// Get LLM extra params as an object (for injection into request body)
function getVllmExtraParams() {
    const server = llmServerSelect.value;
    const params = {
        temperature: parseFloat(vllmTemperatureInput.value) || 0.7,
        top_p: parseFloat(vllmTopPInput.value) || 0.8
    };
    // Ne transmettre llm_max_tokens que si le champ est réellement renseigné,
    // sinon on laisse le max_tokens explicite de la requête faire foi.
    const _maxTok = parseInt(vllmMaxTokensInput.value);
    if (!isNaN(_maxTok) && _maxTok > 0) {
        params.llm_max_tokens = _maxTok;
    }
    // presence_penalty: not supported by Claude
    if (server !== 'claude') {
        params.presence_penalty = parseFloat(vllmPresencePenaltyInput.value) || 0.2;
    }
    // extra_body: only for vLLM
    if (server === 'vllm') {
        const extraBody = getExtraBodyObject();
        if (extraBody && Object.keys(extraBody).length > 0) {
            params.extra_body = extraBody;
        }
    }
    return params;
}

// Extra Body management — stored as { key: { value: ..., enabled: bool }, ... }
function getExtraBodyRaw() {
    const stored = localStorage.getItem('vllm_extra_body');
    if (!stored) return {};
    try {
        const parsed = JSON.parse(stored);
        // Migration: if old format (plain key:value), convert to new format
        const keys = Object.keys(parsed);
        if (keys.length > 0 && typeof parsed[keys[0]] !== 'object' || (parsed[keys[0]] && parsed[keys[0]].value === undefined)) {
            const migrated = {};
            for (const [k, v] of Object.entries(parsed)) {
                if (typeof v === 'object' && v !== null && 'value' in v && 'enabled' in v) {
                    migrated[k] = v;
                } else {
                    migrated[k] = { value: v, enabled: true };
                }
            }
            return migrated;
        }
        return parsed;
    } catch { return {}; }
}

function getExtraBodyObject() {
    const raw = getExtraBodyRaw();
    const result = {};
    for (const [k, entry] of Object.entries(raw)) {
        if (entry && entry.enabled) {
            result[k] = entry.value;
        }
    }
    return result;
}

function saveExtraBodyObject(obj) {
    localStorage.setItem('vllm_extra_body', JSON.stringify(obj));
}

function updateExtraBodyDisplayText() {
    const raw = getExtraBodyRaw();
    const keys = Object.keys(raw);
    if (keys.length === 0) {
        vllmExtraBodyText.textContent = 'Click to add key-value pairs...';
    } else {
        vllmExtraBodyText.textContent = keys.map(k => {
            const e = raw[k];
            const prefix = e.enabled ? '' : '(off) ';
            return `${prefix}${k}: ${JSON.stringify(e.value)}`;
        }).join(', ');
    }
}

function renderExtraBodyPairs() {
    const raw = getExtraBodyRaw();
    vllmExtraBodyPairs.innerHTML = '';
    Object.entries(raw).forEach(([key, entry]) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:4px;align-items:center;margin-bottom:4px;';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = entry.enabled !== false;
        checkbox.style.cssText = 'width:16px;height:16px;cursor:pointer;flex-shrink:0;';
        checkbox.title = 'Enable/disable this parameter';
        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.value = key;
        keyInput.className = 'dark-input';
        keyInput.style.cssText = 'width:120px;font-size:11px;padding:3px 6px;';
        keyInput.placeholder = 'attribute';
        const valInput = document.createElement('input');
        valInput.type = 'text';
        const v = entry.value;
        valInput.value = typeof v === 'string' ? v : JSON.stringify(v);
        valInput.className = 'dark-input';
        valInput.style.cssText = 'flex:1;font-size:11px;padding:3px 6px;';
        valInput.placeholder = 'value';
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '✕';
        removeBtn.className = 'dark-btn-secondary';
        removeBtn.style.cssText = 'font-size:10px;padding:2px 6px;';
        removeBtn.addEventListener('click', () => { row.remove(); });
        row.appendChild(checkbox);
        row.appendChild(keyInput);
        row.appendChild(valInput);
        row.appendChild(removeBtn);
        vllmExtraBodyPairs.appendChild(row);
    });
    // Add an empty row if none exist
    if (Object.keys(raw).length === 0) addExtraBodyRow();
}

function addExtraBodyRow() {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:4px;align-items:center;margin-bottom:4px;';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.style.cssText = 'width:16px;height:16px;cursor:pointer;flex-shrink:0;';
    checkbox.title = 'Enable/disable this parameter';
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'dark-input';
    keyInput.style.cssText = 'width:120px;font-size:11px;padding:3px 6px;';
    keyInput.placeholder = 'attribute';
    const valInput = document.createElement('input');
    valInput.type = 'text';
    valInput.className = 'dark-input';
    valInput.style.cssText = 'flex:1;font-size:11px;padding:3px 6px;';
    valInput.placeholder = 'value';
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '✕';
    removeBtn.className = 'dark-btn-secondary';
    removeBtn.style.cssText = 'font-size:10px;padding:2px 6px;';
    removeBtn.addEventListener('click', () => { row.remove(); });
    row.appendChild(checkbox);
    row.appendChild(keyInput);
    row.appendChild(valInput);
    row.appendChild(removeBtn);
    vllmExtraBodyPairs.appendChild(row);
}

function collectExtraBodyFromEditor() {
    const obj = {};
    vllmExtraBodyPairs.querySelectorAll('div').forEach(row => {
        const checkbox = row.querySelector('input[type="checkbox"]');
        const inputs = row.querySelectorAll('input:not([type="checkbox"])');
        if (inputs.length >= 2) {
            const k = inputs[0].value.trim();
            const v = inputs[1].value.trim();
            if (k) {
                let parsedValue;
                try { parsedValue = JSON.parse(v); } catch { parsedValue = v; }
                obj[k] = { value: parsedValue, enabled: checkbox ? checkbox.checked : true };
            }
        }
    });
    return obj;
}

vllmExtraBodyDisplay.addEventListener('click', () => {
    vllmExtraBodyEditor.style.display = 'block';
    vllmExtraBodyDisplay.style.display = 'none';
    renderExtraBodyPairs();
});

document.getElementById('vllmExtraBodyAddBtn').addEventListener('click', () => {
    addExtraBodyRow();
});

document.getElementById('vllmExtraBodyDoneBtn').addEventListener('click', () => {
    const obj = collectExtraBodyFromEditor();
    saveExtraBodyObject(obj);
    updateExtraBodyDisplayText();
    vllmExtraBodyEditor.style.display = 'none';
    vllmExtraBodyDisplay.style.display = 'flex';
});

document.getElementById('vllmParamsSaveBtn').addEventListener('click', () => {
    saveVllmParams();
    // Also save extra_body if editor is open
    if (vllmExtraBodyEditor.style.display !== 'none') {
        const obj = collectExtraBodyFromEditor();
        saveExtraBodyObject(obj);
        updateExtraBodyDisplayText();
        vllmExtraBodyEditor.style.display = 'none';
        vllmExtraBodyDisplay.style.display = 'flex';
    }
    showModal('LLM parameters saved.', true);
});

// Function to apply vLLM default values
function applyVllmDefaults() {
    // Set vLLM default values (note: vLLM needs /v1 path for OpenAI-compatible API)
    hostInput.value = getHostForServer('vllm');

    maxTokensInput.value = getLastMaxTokens();
    if (maxTokensInput.value === "")
        maxTokensInput.value = '100000';

    // Set model name in the model select if available
    // This will be handled when the models are loaded
    localStorage.setItem('vllm_default_model', 'openai/gpt-oss-20b');

    // Also update the backend with these values
    applyHost();
    applyMaxTokens();
    setLlmServerButton.click();
    
    
    showModal('vLLM defaults applied. You can modify these values if needed.', true);
}


// =============================================
// Config Snapshot Management (confidential localStorage table)
// =============================================
const CONFIG_SNAPSHOTS_KEY = 'confidential_server_configs';

// Session-scoped subset: keys (with their configs) attached to the current
// session. Travels with the session when it is saved/exported/loaded.
// Map: keyName -> config (same shape as captureFullConfig()).
let sessionModelKeys = {};

function getSessionModelKeys() { return sessionModelKeys; }
function setSessionModelKeys(obj) {
    sessionModelKeys = (obj && typeof obj === 'object') ? obj : {};
}
function clearSessionModelKeys() { sessionModelKeys = {}; }

// Compare two captured configs for value-equality (order-independent).
function _modelKeyConfigsEqual(a, b) {
    if (!a || !b) return false;
    try {
        return JSON.stringify(a) === JSON.stringify(b);
    } catch (e) { return false; }
}

// Called by loadSession after restoring sessionModelKeys. Walk every key
// attached to the loaded session and reconcile it with the local snapshots
// table. If a key is missing locally, or its stored config differs, the
// user is asked whether to import/update it.
function reconcileSessionModelKeys() {
    const sessionKeys = sessionModelKeys || {};
    const names = Object.keys(sessionKeys);
    if (names.length === 0) return;
    const table = getConfigSnapshotsTable();
    const toImport = [];
    const toUpdate = [];
    for (const name of names) {
        const cfg = sessionKeys[name];
        if (!cfg) continue;
        if (!Object.prototype.hasOwnProperty.call(table, name)) {
            toImport.push(name);
        } else if (!_modelKeyConfigsEqual(table[name], cfg)) {
            toUpdate.push(name);
        }
    }
    if (toImport.length === 0 && toUpdate.length === 0) return;
    let msg = `This session brings ${names.length} Model Key(s).\n`;
    if (toImport.length > 0) msg += `\nNew (not in your local store):\n  - ${toImport.join('\n  - ')}\n`;
    if (toUpdate.length > 0) msg += `\nDiffer from your local store:\n  - ${toUpdate.join('\n  - ')}\n`;
    msg += '\nImport / update them into your local Model Keys store?';
    // Use the native confirm dialog (no custom confirm modal exists).
    if (!window.confirm(msg)) return;
    for (const name of [...toImport, ...toUpdate]) {
        table[name] = JSON.parse(JSON.stringify(sessionKeys[name]));
    }
    saveConfigSnapshotsTable(table);
}

function getConfigSnapshotsTable() {
    return _readConfigSnapshotsTable();
}

function saveConfigSnapshotsTable(table) {
    localStorage.setItem(CONFIG_SNAPSHOTS_KEY, _obfuscateConfig(JSON.stringify(table)));
}

function simplifyModelName(model) {
    if (!model) return '';
    // Keep only the last segment after '/', remove version tags like ':latest'
    let name = model.split('/').pop();
    name = name.split(':')[0];
    // Replace non-alphanumeric chars with underscores
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function buildSnapshotKey(server, model) {
    const s = (server || 'unknown').trim();
    const m = simplifyModelName(model);
    return m ? `${s}_${m}` : s;
}

function captureFullConfig() {
    const server = llmServerSelect ? llmServerSelect.value : '';
    const extraParams = getVllmExtraParams();
    // Capture raw extra-body (with enabled flags) independently of server type
    const rawExtraBody = typeof getExtraBodyRaw === 'function' ? getExtraBodyRaw() : {};
    return {
        server: server,
        host: hostInput ? hostInput.value : '',
        apiKey: apiKeyInput ? apiKeyInput.value : '',
        model: modelNameSelect ? modelNameSelect.value : '',
        maxTokens: maxTokensInput ? maxTokensInput.value : '',
        temperature: extraParams.temperature,
        top_p: extraParams.top_p,
        llm_max_tokens: extraParams.llm_max_tokens,
        presence_penalty: extraParams.presence_penalty || 0,
        extra_body: (rawExtraBody && Object.keys(rawExtraBody).length > 0) ? rawExtraBody : null
    };
}

function _createConfigKeyFromUI(finalKey, refreshModelKeysModal = true) {
    if (!finalKey) {
        showModal('Please enter a key name.', false);
        return;
    }
    const config = captureFullConfig();
    const table = getConfigSnapshotsTable();
    table[finalKey] = config;
    saveConfigSnapshotsTable(table);
    navigator.clipboard.writeText(finalKey).then(() => {
        showModal(`Key "${finalKey}" created & copied!`, true);
    }).catch(() => {
        showModal(`Key "${finalKey}" created.`, true);
    });
    if (refreshModelKeysModal) {
        // Refresh the list in place
        document.getElementById('modelKeysBtn').click();
    }
}

// Open the Model Keys modal
document.getElementById('modelKeysBtn').addEventListener('click', () => {
    const table = getConfigSnapshotsTable();
    const listDiv = document.getElementById('configSnapshotsList');
    const keys = Object.keys(table).sort();

    if (keys.length === 0) {
        listDiv.innerHTML = '<p class="text-xs text-gray-500">No saved configurations.</p>';
    } else {
        listDiv.innerHTML = keys.map(k => {
            const c = table[k];
            const desc = `${c.server} / ${c.model || '?'}`;
            const inSession = Object.prototype.hasOwnProperty.call(sessionModelKeys, k);
            const badge = inSession
                ? '<span class="text-[10px] bg-purple-600 text-white px-1 rounded ml-1" title="Attached to current session">session</span>'
                : '';
            return `<label class="flex items-center gap-1 py-0.5 cursor-pointer text-xs">
                <input type="radio" name="configSnapshotRadio" value="${escapeHtml(k)}" class="config-snapshot-radio" style="width:12px;height:12px;">
                <span class="font-mono text-xs text-blue-700">${escapeHtml(k)}</span>${badge}
                <span class="text-xs text-gray-400 ml-auto">${escapeHtml(desc)}</span>
            </label>`;
        }).join('');
    }

    document.getElementById('manageConfigsModal').classList.remove('hidden');
});

// Add Key modal (create from current UI)
const addModelKeyBtn = document.getElementById('addModelKeyBtn');
const addModelKeyModal = document.getElementById('addModelKeyModal');
const addModelKeyInput = document.getElementById('addModelKeyInput');
const addModelKeyOkButton = document.getElementById('addModelKeyOkButton');
const addModelKeyCancelButton = document.getElementById('addModelKeyCancelButton');

if (addModelKeyBtn && addModelKeyModal && addModelKeyInput && addModelKeyOkButton && addModelKeyCancelButton) {
    addModelKeyBtn.addEventListener('click', () => {
        const cfg = captureFullConfig();
        addModelKeyInput.value = buildSnapshotKey(cfg.server, cfg.model);
        addModelKeyModal.classList.remove('hidden');
        addModelKeyInput.focus();
        addModelKeyInput.select();
    });

    addModelKeyOkButton.addEventListener('click', () => {
        const finalKey = addModelKeyInput.value.trim();
        if (!finalKey) {
            showModal('Please enter a key name.', false);
            addModelKeyInput.focus();
            return;
        }
        _createConfigKeyFromUI(finalKey, false);
        addModelKeyModal.classList.add('hidden');
        addModelKeyInput.value = '';
    });

    addModelKeyCancelButton.addEventListener('click', () => {
        addModelKeyModal.classList.add('hidden');
        addModelKeyInput.value = '';
    });

    addModelKeyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addModelKeyOkButton.click();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            addModelKeyCancelButton.click();
        }
    });
}

document.getElementById('manageConfigsCloseBtn').addEventListener('click', () => {
    document.getElementById('manageConfigsModal').classList.add('hidden');
});

// Load selected config into the UI and sync with backend
document.getElementById('configLoadSelectedBtn').addEventListener('click', async () => {
    const selected = document.querySelector('input[name="configSnapshotRadio"]:checked');
    if (!selected) {
        showModal('No configuration selected.', false);
        return;
    }
    const key = selected.value;
    const table = getConfigSnapshotsTable();
    const config = table[key];
    if (!config) {
        showModal('Configuration not found.', false);
        return;
    }

    // 1) Set server type in UI
    if (config.server && llmServerSelect) {
        llmServerSelect.value = config.server;
    }

    // 2) Set host, API key, max tokens in UI
    if (config.host && hostInput) hostInput.value = config.host;
    if (config.apiKey && apiKeyInput) apiKeyInput.value = config.apiKey;
    if (config.maxTokens && maxTokensInput) maxTokensInput.value = config.maxTokens;

    // 3) Set LLM parameters in UI
    if (config.temperature != null && vllmTemperatureInput) vllmTemperatureInput.value = config.temperature;
    if (config.top_p != null && vllmTopPInput) vllmTopPInput.value = config.top_p;
    if (config.presence_penalty != null && vllmPresencePenaltyInput) vllmPresencePenaltyInput.value = config.presence_penalty;
    if (config.llm_max_tokens != null && vllmMaxTokensInput) vllmMaxTokensInput.value = config.llm_max_tokens;
    saveVllmParams();

    // 3b) Restore extra-body parameters
    if (typeof saveExtraBodyObject === 'function') {
        if (config.extra_body && Object.keys(config.extra_body).length > 0) {
            saveExtraBodyObject(config.extra_body);
        } else {
            saveExtraBodyObject({});
        }
        if (typeof updateExtraBodyDisplayText === 'function') updateExtraBodyDisplayText();
        if (typeof renderExtraBodyPairs === 'function') renderExtraBodyPairs();
    }

    // 4) Set model in UI
    if (config.model && modelNameSelect) {
        // Add option if not present
        if (!modelNameSelect.querySelector(`option[value="${CSS.escape(config.model)}"]`)) {
            const opt = document.createElement('option');
            opt.value = config.model;
            opt.textContent = config.model;
            modelNameSelect.appendChild(opt);
        }
        modelNameSelect.value = config.model;
    }

    // 5) Sync with backend
    try {
        await fetch(`${API_BASE_URL}/set_model_server`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ server_type: config.server })
        });
        if (config.host) {
            await fetch(`${API_BASE_URL}/set_host`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host: config.host })
            });
        }
        if (config.apiKey) {
            await fetch(`${API_BASE_URL}/set_key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: config.apiKey })
            });
        }
        if (config.maxTokens) {
            await fetch(`${API_BASE_URL}/set_max_tokens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ max_tokens: parseInt(config.maxTokens) || 4096 })
            });
        }
        saveSelectedLlmServer(config.server);
        saveHost(config.host);
        saveHostForServer(config.server, config.host);
        saveApiKeyForServer(config.server, config.apiKey);
    } catch (e) {
        console.error('Error syncing loaded config with backend:', e);
    }

    document.getElementById('manageConfigsModal').classList.add('hidden');
    showModal(`Configuration "${key}" loaded.`, true);
});

// Copy selected config key to clipboard
document.getElementById('configCopyKeyBtn').addEventListener('click', () => {
    const selected = document.querySelector('input[name="configSnapshotRadio"]:checked');
    if (!selected) {
        showModal('No configuration selected.', false);
        return;
    }
    navigator.clipboard.writeText(selected.value).then(() => {
        showModal('Key copied to clipboard!', true);
    });
});

// Delete selected config(s)
document.getElementById('configDeleteSelectedBtn').addEventListener('click', () => {
    const selected = document.querySelector('input[name="configSnapshotRadio"]:checked');
    if (!selected) {
        showModal('No configuration selected.', false);
        return;
    }
    const key = selected.value;
    const table = getConfigSnapshotsTable();
    delete table[key];
    saveConfigSnapshotsTable(table);
    // Refresh the list
    document.getElementById('modelKeysBtn').click();
    showModal(`Configuration "${key}" deleted.`, true);
});

// Attach selected key (with its config) to the current session
document.getElementById('configStoreInSessionBtn').addEventListener('click', () => {
    const selected = document.querySelector('input[name="configSnapshotRadio"]:checked');
    if (!selected) {
        showModal('No configuration selected.', false);
        return;
    }
    const key = selected.value;
    const table = getConfigSnapshotsTable();
    const config = table[key];
    if (!config) {
        showModal('Configuration not found.', false);
        return;
    }
    if (typeof currentSessionName !== 'undefined' && !currentSessionName) {
        showModal('No active session. Create or load a session first.', false);
        return;
    }
    // Store a deep copy so later modifications to the table do not mutate
    // the session-attached snapshot.
    sessionModelKeys[key] = JSON.parse(JSON.stringify(config));
    if (typeof markSessionModified === 'function') markSessionModified();
    // Refresh the modal so the badge appears
    document.getElementById('modelKeysBtn').click();
    showModal(`Key "${key}" stored in session "${currentSessionName}". Save the session to persist.`, true);
});

// Detach selected key from the current session
document.getElementById('configUnstoreFromSessionBtn').addEventListener('click', () => {
    const selected = document.querySelector('input[name="configSnapshotRadio"]:checked');
    if (!selected) {
        showModal('No configuration selected.', false);
        return;
    }
    const key = selected.value;
    if (!Object.prototype.hasOwnProperty.call(sessionModelKeys, key)) {
        showModal(`Key "${key}" is not attached to the current session.`, false);
        return;
    }
    delete sessionModelKeys[key];
    if (typeof markSessionModified === 'function') markSessionModified();
    document.getElementById('modelKeysBtn').click();
    showModal(`Key "${key}" detached from the current session.`, true);
});

// =============================================

// Écouteur d'événement pour envoyer le message de chat et gérer le streaming
