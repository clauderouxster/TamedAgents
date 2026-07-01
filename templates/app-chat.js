// Ingest a PDF (by source: data URL, http(s) URL or disk path) through the
// backend /pdf_ingest endpoint and turn the result into OpenAI-style content
// parts (text and/or image_url). The backend decides, page by page, whether to
// return extracted text or a rendered page image. Returns [] on failure.
function ingestPdfToParts(source) {
    if (typeof pdf_ingest_sync !== 'function' || !source) return [];
    try {
        const spec = { source: source, kind: 'auto', mode: 'auto', dpi: 150 };
        const res = JSON.parse(unicodeAtob(pdf_ingest_sync(unicodeBtoa(JSON.stringify(spec)))));
        if (!res || res.status !== 'success' || !Array.isArray(res.items)) {
            if (res && res.message && typeof displayError === 'function') {
                displayError('PDF ingest error: ' + res.message);
            }
            return [];
        }
        const detail = (typeof getImageDetail === 'function') ? getImageDetail() : 'auto';
        const parts = [];
        res.items.forEach(it => {
            if (it.kind === 'text' && it.text) {
                parts.push({ type: 'text', text: it.text });
            } else if (it.kind === 'image' && it.src) {
                parts.push({ type: 'image_url', image_url: { url: it.src, detail: detail } });
            }
        });
        return parts;
    } catch (e) {
        if (typeof displayError === 'function') displayError('PDF ingest error: ' + e.message);
        return [];
    }
}

sendMessageButton.addEventListener('click', async () => {
    const userMessage = chatInput.value.trim();

    const hasPendingImages = (typeof getPendingImagesCount === 'function') && getPendingImagesCount() > 0;
    const hasPendingPdfs = (typeof getPendingPdfsCount === 'function') && getPendingPdfsCount() > 0;
    const hasPendingTextFiles = (typeof getPendingTextFilesCount === 'function') && getPendingTextFilesCount() > 0;
    if (!userMessage && !hasPendingImages && !hasPendingPdfs && !hasPendingTextFiles) return; // Ne rien faire si message, images, pdf ET fichiers vides
    const history = Array.isArray(chatHistory[currentChatTab])
        ? chatHistory[currentChatTab]
        : (chatHistory[currentChatTab] = []);
    if (history.length > 1) {
        const msg = history[history.length - 1];
        if (msg.sender === "user" && !(Array.isArray(msg.images) && msg.images.length > 0)) {
            history.pop();
            renderChatHistory(); // Render the now almost empty chat history (only initial message)
        }
    }

    // Pre-load Basic transpiler if any agent tab is in Basic or Python mode
    const hasCompilableTabs = agentTabNames.some(name => agentModes[name] === 'basic' || agentModes[name] === 'python');
    if (hasCompilableTabs && !basicTranspilerLoaded) {
        await loadBasicTranspilerFiles();
    }

    // First user message calls entry(prompt), subsequent ones call chat(prompt, chats)            
    if ((chatHistory[currentChatTab] || []).length == 0 || just_loaded) {
        if (!compileAndInitialize(hasCompilableTabs, true)) {
            // compileAndInitialize already displayed errors
        } else {
            if ((chatHistory[currentChatTab] || []).length == 0) {
                res = run_code("(getsystemprompt)");
                if (!chatHistory[currentChatTab]) chatHistory[currentChatTab] = [];
                chatHistory[currentChatTab].push({ sender: 'system', text: unicodeAtob(res) });
                renderChatHistory();
            }
        }
        just_loaded = false;
    }

    // Detach any images staged via drag & drop so they are bound to this message
    const pendingImages = (typeof takePendingImages === 'function') ? takePendingImages() : [];
    // Detach any PDFs staged via drag & drop and ingest them now (the backend
    // decides, page by page, whether to send extracted text or a rendered image).
    const pendingPdfs = (typeof takePendingPdfs === 'function') ? takePendingPdfs() : [];
    let pdfParts = [];
    pendingPdfs.forEach(p => {
        if (p && p.src) pdfParts = pdfParts.concat(ingestPdfToParts(p.src));
    });
    const pdfMeta = pendingPdfs.map(p => ({ name: (p && p.name) ? p.name : 'document.pdf' }));
    // Detach any plain-text files staged via drag & drop. Their content is
    // injected as text parts, in the same content format used for PDFs.
    const pendingTextFiles = (typeof takePendingTextFiles === 'function') ? takePendingTextFiles() : [];
    pendingTextFiles.forEach(f => {
        if (f && typeof f.text === 'string') {
            pdfParts = pdfParts.concat([{ type: 'text', text: `File: ${f.name}\n\n${f.text}` }]);
            pdfMeta.push({ name: (f && f.name) ? f.name : 'file.txt' });
        }
    });
    addMessage(userMessage, 'user', undefined, pendingImages, pdfMeta); // Ajoute le message de l'utilisateur
    if (!chatHistory[currentChatTab]) chatHistory[currentChatTab] = [];
    const userEntry = {
        sender: 'user',
        text: userMessage
    };
    if (pendingImages.length > 0) userEntry.images = pendingImages;
    if (pdfParts.length > 0) userEntry.pdfParts = pdfParts;
    if (pdfMeta.length > 0) userEntry.pdfs = pdfMeta;
    chatHistory[currentChatTab].push(userEntry); // Add to chat history
    markSessionModified();
    autoSaveCurrentChatSession(); // Automatic session save

    if (!undoneChatHistory[currentChatTab]) undoneChatHistory[currentChatTab] = [];
    undoneChatHistory[currentChatTab].length = 0; //we clean the undoneChatHistory
    chatInput.value = ''; // Clear input field

    // Subsequent Sends: call chat with prompt and chat history as JSON
    const formattedHistory = (chatHistory[currentChatTab] || [])
        .map(msg => {
            const hasImages = Array.isArray(msg.images) && msg.images.length > 0;
            const hasPdf = Array.isArray(msg.pdfParts) && msg.pdfParts.length > 0;
            if (hasImages || hasPdf) {
                const parts = [];
                if (msg.text && msg.text.trim()) parts.push({ type: 'text', text: msg.text });
                if (hasImages) {
                    const detail = (typeof getImageDetail === 'function') ? getImageDetail() : 'auto';
                    msg.images.forEach(im => {
                        if (im && im.src) parts.push({ type: 'image_url', image_url: { url: im.src, detail: detail } });
                    });
                }
                if (hasPdf) msg.pdfParts.forEach(p => parts.push(p));
                return { role: msg.sender, content: parts };
            }
            return { role: msg.sender, content: msg.text };
        });
    // Now call entry.
    // Instead of embedding the (potentially multi-MB) base64 payload directly in
    // the LispE source `(entry «...»)`, which forces the interpreter to lex the
    // whole literal, we stash it in a JS global and let LispE fetch it as a
    // runtime value via `getPendingChats()` (same pattern as getImageValue).
    chats = unicodeBtoa(JSON.stringify(formattedHistory));
    window.__pendingChats = chats;
    run_code('(entry (evaljs "getPendingChats();"))');
    window.__pendingChats = null;
    });

// Permet d'envoyer un message avec la touche Entrée
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { // Si la touche Entrée est pressée (sans Shift)
        e.preventDefault(); // Empêche le comportement par défaut (saut de ligne)
        sendMessageButton.click(); // Simule un clic sur le bouton d'envoi
    }
});

// Resize chat input from a bottom-center handle
const chatInputResizeHandle = document.getElementById('chatInputResizeHandle');
if (chatInputResizeHandle) {
    let startY = 0;
    let startHeight = 0;

    const stopResize = () => {
        document.removeEventListener('mousemove', onResizeMove);
        document.removeEventListener('mouseup', stopResize);
        document.body.classList.remove('chat-input-resizing');
    };

    const onResizeMove = (e) => {
        const minHeight = parseFloat(getComputedStyle(chatInput).minHeight) || 63;
        const maxHeight = Math.floor(window.innerHeight * 0.45);
        const delta = e.clientY - startY;
        const nextHeight = Math.min(maxHeight, Math.max(minHeight, startHeight - delta));
        chatInput.style.height = `${nextHeight}px`;
    };

    chatInputResizeHandle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startY = e.clientY;
        startHeight = chatInput.getBoundingClientRect().height;
        document.body.classList.add('chat-input-resizing');
        document.addEventListener('mousemove', onResizeMove);
        document.addEventListener('mouseup', stopResize);
    });
}

// Event listener for the "Reset" button - full environment reset
clearChatButton.addEventListener('click', () => {
    console.log('Reset: Starting full environment reset...');

    // 1. Reset chat history for all tabs
    Object.keys(chatHistory).forEach(k => delete chatHistory[k]);
    Object.keys(undoneChatHistory).forEach(k => delete undoneChatHistory[k]);
    renderChatHistory();
    chatInput.value = '';

    // Clean ALL localStorage chat sessions
    chatTabNames.forEach(chatTab => {
        ['vllm', 'ollama', 'lmstudio', 'claude'].forEach(server => {
            localStorage.removeItem(server + `_chat_${chatTab}_current`);
        });
        localStorage.removeItem(llmServerSelect.value + `_chat_${chatTab}_current`);
    });

    // 2. Reset chat tabs to initial state (5 tabs)
    resetChatTabs();

    // 3. Reset all system prompts (rebuild 5 tabs)
    resetSystemPromptTabs();

    // 4. Reset all skills (rebuild 5 tabs)
    resetSkillTabs();

    // 5. Reset all tools (rebuild 5 tabs)
    resetToolTabs();

    // 6. Reset all user data (rebuild 5 tabs)
    resetUserDataTabs();

    // 6b. Reset all output (rebuild 5 tabs)
    resetOutputTabs();

    // 6c. Reset images gallery
    if (typeof resetImagesGallery === 'function') resetImagesGallery();
    if (typeof resetPdfsGallery === 'function') resetPdfsGallery();
    if (typeof clearPendingImages === 'function') clearPendingImages();

    // 7. Reset agents
    resetAgentTabs();

    // 7b. Reset code runner
    resetCodeRunnerTabs();

    // 8. Reset initialization code to default
    resetInitTabs();

    // 9. Clear confidential field
    document.getElementById('confidentialInput').value = '';

    // 9a. Clear secret field
    document.getElementById('secretInput').value = '';

    // 9b. Clear API Key
    apiKeyInput.value = '';
    fetch(`${API_BASE_URL}/set_key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: '' })
    });

    // 10. Clear Display
    document.getElementById('displayOutput').innerHTML = '<p class="text-gray-400">Output will appear here.</p>';

    // 11. Reset principles
    currentPrinciples = [];
    lastSelectedPrinciple = '';

    // 12. Reset session selection
    currentSessionName = '';
    updateTopBarSessionName();
    clearSessionModified();
    populateSessionSelect();
    updateSaveButtonState();

    // 13. Disconnect all MCP connectors
    disconnectAllConnectors();

    // 13b. Clear extra-body parameters
    if (typeof saveExtraBodyObject === 'function') {
        saveExtraBodyObject({});
        if (typeof updateExtraBodyDisplayText === 'function') updateExtraBodyDisplayText();
        if (typeof renderExtraBodyPairs === 'function') renderExtraBodyPairs();
    }

    // 14. Fetch server defaults from backend and update UI accordingly
    (async () => {
        try {
            // Get the current server type AND all server defaults from FastAPI
            const [serverResp, defaultsResp] = await Promise.all([
                fetch(`${API_BASE_URL}/get_model_server`),
                fetch(`${API_BASE_URL}/get_server_defaults`)
            ]);
            const serverData = await serverResp.json();
            const serverDefaults = await defaultsResp.json();

            const backendServerType = serverData.server_type || 'ollama';
            const defaults = serverDefaults[backendServerType] || {};
            const backendHost = defaults.host || '';

            // Update UI with backend default values for the current server
            llmServerSelect.value = backendServerType;
            if (sidebarLlmServerSelect) sidebarLlmServerSelect.value = backendServerType;
            hostInput.value = backendHost;
            if (maxTokensInput) maxTokensInput.value = defaults.max_tokens || 4096;

            // Restore LLM advanced parameters to defaults (empty = use server default)
            if (vllmTemperatureInput) vllmTemperatureInput.value = defaults.temperature || '';
            if (vllmTopPInput) vllmTopPInput.value = defaults.top_p || '';
            if (vllmPresencePenaltyInput) vllmPresencePenaltyInput.value = defaults.presence_penalty || '';
            if (vllmMaxTokensInput) vllmMaxTokensInput.value = defaults.llm_max_tokens || '';

            // Update localStorage defaults for ALL server types
            for (const [stype, sdefaults] of Object.entries(serverDefaults)) {
                saveHostForServer(stype, sdefaults.host || '');
            }
            saveSelectedLlmServer(backendServerType);
            saveHost(backendHost);
            saveMaxTokens(defaults.max_tokens || 4096);

            // Push the correct values to the backend
            await Promise.all([
                fetch(`${API_BASE_URL}/set_host`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ host: backendHost })
                }),
                fetch(`${API_BASE_URL}/set_max_tokens`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ max_tokens: parseInt(defaults.max_tokens) || 4096 })
                })
            ]);

            // Save LLM params to backend
            if (typeof saveVllmParams === 'function') saveVllmParams();

            // Clear model dropdown
            modelNameSelect.innerHTML = '<option value="">Select a model</option>';

            // Model list is NOT loaded automatically — let the user trigger it
            populateSessionSelect();
        } catch (e) {
            console.error('Reset: Error fetching server defaults from backend:', e);
        }
    })();

    console.log('Reset: Full environment reset complete.');
});

// NEW: Event listener for the "Copy Chat" button
copyChatButton.addEventListener('click', async () => {
    const systemChat = "<System>" + getCurrentSystemPrompt() + "</System>\n";
    const formattedChat = (chatHistory[currentChatTab] || []).map(msg => {
        const prefix = msg.sender === 'user' ? '<User>\n' : '<Assistant>\n';
        const closing = msg.sender === 'user' ? '\n</User>' : '\n</Assistant>';
        return `${prefix} ${msg.text} ${closing}`;
    }).join('\n\n'); // Join messages with double newline for better readability

    if (!formattedChat) {
        showModal('No chat content to copy.', false);
        return;
    }

    const chatprompt = systemChat + formattedChat;
    try {
        await navigator.clipboard.writeText(chatprompt);
        showModal('Chat content copied to clipboard!', true);
    } catch (err) {
        console.error('Failed to copy chat content:', err);
        showModal('Failed to copy chat content to clipboard. Please copy manually.', false);
    }
});

// Event listener for the "Load Prompt from File" button
loadFileButton.addEventListener('click', () => {
    fileInput.click(); // Programmatically click the hidden file input
});

// Event listener when a file is selected for System Prompt
fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const currentInput = getCurrentSystemPromptInput();
            if (currentInput) {
                currentInput.value = e.target.result; // Set textarea content to file content
                
                // Share this prompt to ALL chats for the current system prompt tab
                chatTabNames.forEach(chatTab => {
                    allChatPrompts[chatTab][currentSystemPromptTab] = e.target.result;
                });
                reinitializeLispEVariables(); // Re-read global variables into LispE
            }
        };
        reader.onerror = () => {
            showModal('Error reading file.', false);
        };
        reader.readAsText(file); // Read the file as text
    }
});

// NEW: Event listener when a file is selected for Chat Input
chatFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            chatInput.value = e.target.result; // Set chat input textarea content to file content
        };
        reader.onerror = () => {
            showModal('Error reading chat file.', false);
        };
        reader.readAsText(file); // Read the file as text
    }
});


// NEW: Event listener for the "Clean All" button
cleanAllButton.addEventListener('click', () => {
    console.log('Clean All: Starting complete cleanup...');
    
    // Clean chat histories (but preserve prompts)
    Object.keys(chatHistory).forEach(k => { chatHistory[k] = []; });
    Object.keys(undoneChatHistory).forEach(k => { undoneChatHistory[k] = []; });
    renderChatHistory();
    chatInput.value = '';
    
    // Clean ALL localStorage chat sessions
    chatTabNames.forEach(chatTab => {
        const sessionKey = llmServerSelect.value + `_chat_${chatTab}_current`;
        localStorage.removeItem(sessionKey);
        console.log(`Cleared chat session for ${chatTab}`);
    });
    
    // Clean JSON principles
    currentPrinciples = [];
    lastSelectedPrinciple = '';

    // Clean Display
    document.getElementById('displayOutput').innerHTML = '<p class="text-gray-400">Output will appear here.</p>';

    // Restore API Key from localStorage (connection credential, not session data)
    const cleanApiKey = getApiKeyForServer(llmServerSelect.value);
    apiKeyInput.value = cleanApiKey;
    if (cleanApiKey) {
        fetch(`${API_BASE_URL}/set_key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: cleanApiKey })
        });
    }
    
    console.log('Clean All: Complete cleanup finished.');
});

// Event listener for the "Clear/Delete Current Chat" button
// Renumber chat tabs sequentially (Chat 0, Chat 1, ...) after deletion
function renumberChatTabs() {
    const oldNames = [...chatTabNames];
    const newNames = oldNames.map((_, i) => `Chat ${i}`);

    // Remap chatHistory
    const histories = oldNames.map(name => chatHistory[name] || []);
    Object.keys(chatHistory).forEach(k => delete chatHistory[k]);
    newNames.forEach((name, i) => { chatHistory[name] = histories[i]; });

    // Remap undoneChatHistory
    const undones = oldNames.map(name => undoneChatHistory[name] || []);
    Object.keys(undoneChatHistory).forEach(k => delete undoneChatHistory[k]);
    newNames.forEach((name, i) => { undoneChatHistory[name] = undones[i]; });

    // Remap allChatPrompts
    const prompts = oldNames.map(name => allChatPrompts[name] || {});
    Object.keys(allChatPrompts).forEach(k => delete allChatPrompts[k]);
    newNames.forEach((name, i) => { allChatPrompts[name] = prompts[i]; });

    // Update localStorage keys
    const prefix = llmServerSelect.value;
    oldNames.forEach(name => localStorage.removeItem(prefix + `_chat_${name}_current`));
    newNames.forEach(name => saveChatSessionForTab(name));

    // Update chatTabNames and counter
    chatTabNames.length = 0;
    newNames.forEach(n => chatTabNames.push(n));
    chatCounter = newNames.length - 1;

    // Rebuild DOM
    chatTabsBar.querySelectorAll('.chat-tab-btn').forEach(btn => btn.remove());
    newNames.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'chat-tab-btn tab-btn bg-green-100 text-green-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.chat = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchChatTab(name));
        chatTabsBar.insertBefore(btn, addChatTabButton);
    });
}

// If more than 5 tabs: deletes the current tab entirely
// If 5 or fewer tabs: just clears the current tab's content
// Clean current chat content (red trash): clears messages but stays on the same tab
cleanCurrentChatButton.addEventListener('click', () => {
    chatHistory[currentChatTab] = [];
    undoneChatHistory[currentChatTab] = [];
    renderChatHistory();
    chatInput.value = '';
    const sessionKey = llmServerSelect.value + `_chat_${currentChatTab}_current`;
    localStorage.removeItem(sessionKey);
});

clearCurrentChatButton.addEventListener('click', () => {
    if (chatTabNames.length > 5) {
        // Delete current tab entirely
        const tabToRemove = currentChatTab;
        const idx = chatTabNames.indexOf(tabToRemove);

        // Remove localStorage entry
        const sessionKey = llmServerSelect.value + `_chat_${tabToRemove}_current`;
        localStorage.removeItem(sessionKey);

        // Remove from data structures
        chatTabNames.splice(idx, 1);
        delete chatHistory[tabToRemove];
        delete undoneChatHistory[tabToRemove];
        delete allChatPrompts[tabToRemove];

        // Renumber all remaining tabs sequentially
        renumberChatTabs();

        // Switch to adjacent tab (previous if possible, otherwise next)
        const newIdx = Math.min(idx, chatTabNames.length - 1);
        switchChatTab(chatTabNames[newIdx]);
    } else {
        // Just clear the current tab's content
        chatHistory[currentChatTab] = [];
        undoneChatHistory[currentChatTab] = [];
        renderChatHistory();
        chatInput.value = '';
        const sessionKey = llmServerSelect.value + `_chat_${currentChatTab}_current`;
        localStorage.removeItem(sessionKey);
        // Move to previous tab (unless on tab 0)
        const idx = chatTabNames.indexOf(currentChatTab);
        if (idx > 0) {
            switchChatTab(chatTabNames[idx - 1]);
        }
    }
});

// Modified: Event listener for the "Undo" button (flèche gauche) - now only for destruction
undoButton.addEventListener('click', () => {
    const history = chatHistory[currentChatTab] || [];
    const undone = undoneChatHistory[currentChatTab] || [];
    if (history.length > 1) { // Ensure there are messages beyond the initial greeting
        const Msg = history.pop();
        if (!undoneChatHistory[currentChatTab]) undoneChatHistory[currentChatTab] = [];
        undoneChatHistory[currentChatTab].push(Msg); // Corrected: Push assistant then user
        renderChatHistory();
        if (Msg.sender === "assistant") {
            const dernier = history.at(-1);
            chatInput.value = dernier.text;
        } else
            chatInput.value = Msg.text;

    } else if (history.length === 1 && history[0].sender === 'assistant') {
        // Only the initial assistant message remains, chat is effectively empty
        showModal('The chat is already empty (only initial greeting remains).', false);
    } else {
        // This state should not be reached if chatHistory always has the initial assistant message
        showModal('No more items to destroy.', false);
    }
});

// NEW: Event listener for the "Redo" button (flèche droite) - for re-injection
redoButton.addEventListener('click', () => {
    const undone = undoneChatHistory[currentChatTab] || [];
    if (undone.length >= 1) { // Ensure there's a complete pair (assistant then user)
        // POP user then assistant
        const Msg = undone.pop(); // This will get the assistant message
        if (!chatHistory[currentChatTab]) chatHistory[currentChatTab] = [];
        chatHistory[currentChatTab].push(Msg); // PUSH assistant then user to maintain chronological order in chatHistory
        renderChatHistory();
        if (Msg.sender === "user")
            chatInput.value = Msg.text;
        else
            chatInput.value = '';
    } else {
        showModal('No items to restore. Use the left arrow to destroy items first.', false);
    }
});

// NEW: Session Management Functions
function generateSessionName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `session_${year}_${month}_${day}_${hours}_${minutes}`;
}

// NEW: Function to display the modal for session naming
function promptForSessionName() {
    const defaultName = generateSessionName();
    sessionNameInput.value = defaultName;
    sessionNameModal.classList.remove('hidden');
    sessionNameInput.focus(); // Focus the input field

    return new Promise((resolve) => {
        const handleOk = () => {
            sessionNameModal.classList.add('hidden');
            resolve(sessionNameInput.value.trim());
            sessionNameOkButton.removeEventListener('click', handleOk);
            sessionNameCancelButton.removeEventListener('click', handleCancel);
        };

        const handleCancel = () => {
            sessionNameModal.classList.add('hidden');
            resolve(null); // Indicate cancellation
            sessionNameOkButton.removeEventListener('click', handleOk);
            sessionNameCancelButton.removeEventListener('click', handleCancel);
        };
        
        // Allow "Enter" key to confirm in the modal
        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                handleOk();
                sessionNameInput.removeEventListener('keypress', handleKeyPress);
            }
        };

        sessionNameOkButton.addEventListener('click', handleOk);
        sessionNameCancelButton.addEventListener('click', handleCancel);
        sessionNameInput.addEventListener('keypress', handleKeyPress);
    });
}

// Flash save indicator
function flashSaveIndicator(sessionName) {
    // Flash the tree view
    const treeView = document.getElementById('sessionTreeView');
    if (treeView) {
        treeView.classList.add('save-flash');
        setTimeout(() => treeView.classList.remove('save-flash'), 900);
    }

    // Show brief notification with localStorage size
    let storageInfo = '';
    try {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            total += k.length + localStorage.getItem(k).length;
        }
        storageInfo = ' — ' + (total * 2 / 1024 / 1024).toFixed(2) + ' Mo';
    } catch (e) {}
    const notif = document.getElementById('saveFlashNotif');
    notif.textContent = `✓ "${sessionName}" saved${storageInfo}`;
    notif.classList.add('visible');
    setTimeout(() => notif.classList.remove('visible'), 1200);
}

// Trim trailing empty tabs: keep at least minCount (default 5), remove empty trailing tabs beyond that
function trimTabNames(tabNames, contents, minCount = 5) {
    let lastNonEmpty = -1;
    for (let i = tabNames.length - 1; i >= 0; i--) {
        if ((contents[tabNames[i]] || '').trim() !== '') {
            lastNonEmpty = i;
            break;
        }
    }
    return tabNames.slice(0, Math.max(lastNonEmpty + 1, minCount));
}

// Build a complete session data object from the current in-memory state
function buildCurrentSessionData() {
    autoSaveCurrentChatSession();
    saveCurrentChatPromptsToMemory();
    saveCurrentSkillToMemory();
    saveCurrentToolToMemory();
    saveCurrentUserDataToMemory();
    saveCurrentOutputToMemory();
    saveCurrentInitToMemory();
    saveCurrentAgentToMemory();
    saveCurrentCodeRunnerToMemory();
    const sessionData = {
        chatHistory: chatHistory[currentChatTab] || [],
        systemPrompt: getCurrentSystemPrompt(),
        principles: getPrinciples(),
        setup: getSetupConfig(),
        allChatPrompts: JSON.parse(JSON.stringify(allChatPrompts)),
        chatTabNames: [...chatTabNames],
        systemPromptTabNames: [...systemPromptTabNames],
        currentTab: currentSystemPromptTab,
        currentChatTab: currentChatTab,
        skills: getAllSkillContents(),
        skillTabNames: trimTabNames(skillTabNames, allSkillContents),
        currentSkillTab: currentSkillTab,
        tools: getAllToolContents(),
        toolTabNames: trimTabNames(toolTabNames, allToolContents),
        currentToolTab: currentToolTab,
        userData: getAllUserDataContents(),
        userDataTabNames: trimTabNames(userDataTabNames, allUserDataContents),
        currentUserDataTab: currentUserDataTab,
        outputData: getAllOutputContents(),
        outputDataTabNames: trimTabNames(outputTabNames, allOutputContents),
        currentOutputTab: currentOutputTab,
        imagesGallery: (typeof getAllImagesForStorage === 'function') ? getAllImagesForStorage() : ((typeof getAllImages === 'function') ? getAllImages() : []),
        pdfsGallery: (typeof getAllPdfsForStorage === 'function') ? getAllPdfsForStorage() : ((typeof getAllPdfs === 'function') ? getAllPdfs() : []),
        initialization: getAllInitContents(),
        initTabNames: [...initTabNames],
        currentInitTab: currentInitTab,
        confidential: document.getElementById('confidentialInput').value,
        secret: document.getElementById('secretInput').value,
        help: (typeof getSessionHelp === 'function') ? getSessionHelp() : { hint: '', description: '' },
        // NOTE: the top-level API key is intentionally NOT persisted in the
        // session. It would otherwise leak in exported session JSON files.
        // The key is kept server-scoped in localStorage (saveApiKeyForServer)
        // and can be travel with a session only by being explicitly attached
        // through a Model Key entry in `modelKeys` below.
        displayContent: document.getElementById('displayOutput').innerHTML,
        agents: getAllAgentContents(),
        agentTabNames: [...agentTabNames],
        currentAgentTab: currentAgentTab,
        agentModes: getAllAgentModes(),
        agentMergeMode: (typeof agentMergeMode !== 'undefined') ? agentMergeMode : true,
        activeConnectors: getActiveConnectors(),
        codeRunner: getAllCodeRunnerContents(),
        codeRunnerTabNames: [...codeRunnerTabNames],
        currentCodeRunnerTab: currentCodeRunnerTab,
        codeRunnerModes: getAllCodeRunnerModes(),
        llmParams: {
            temperature: vllmTemperatureInput ? vllmTemperatureInput.value : '',
            top_p: vllmTopPInput ? vllmTopPInput.value : '',
            presence_penalty: vllmPresencePenaltyInput ? vllmPresencePenaltyInput.value : '',
            max_tokens: vllmMaxTokensInput ? vllmMaxTokensInput.value : ''
        },
        extraBody: typeof getExtraBodyRaw === 'function' ? getExtraBodyRaw() : {},
        modelKeys: (typeof getSessionModelKeys === 'function') ? getSessionModelKeys() : {},
        allChatHistories: {}
    };
    chatTabNames.forEach(chatTab => {
        sessionData.allChatHistories[chatTab] = chatHistory[chatTab] || [];
    });
    return sessionData;
}

// NEW: Function to actually save the session after confirmation
function saveSessionConfirmed(sessionName) {
    if (!sessionName) {
        showModal('Session name cannot be empty. Session not saved.', false);
        return;
    }
    const sessionData = buildCurrentSessionData();
    try {
        const isNew = !localStorage.getItem(llmServerSelect.value+`_session_${sessionName}`);
        const stored = compressAndStore(llmServerSelect.value+`_session_${sessionName}`, JSON.stringify(sessionData));
        if (!stored) {
            // localStorage quota was exceeded: the write was skipped. Do NOT
            // report success, and do not register a new session in the tree.
            showModal(`Session "${sessionName}" NOT saved: local storage is full.`, false);
            return;
        }
        // If this is a new session, place it in the current folder of the tree
        if (isNew) {
            const tree = getSessionTree();
            const folder = getFolderAtPath(tree, currentFolderPath);
            if (folder) {
                folder.children.push({ type: 'session', name: sessionName });
                saveSessionTree(tree);
            }
        }
        currentSessionName = sessionName;
        updateTopBarSessionName();
        clearSessionModified();
        populateSessionSelect();
        // Flash the session select and show notification
        flashSaveIndicator(sessionName);
        let storageSize = '';
        try {
            let total = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                total += k.length + localStorage.getItem(k).length;
            }
            storageSize = ' (' + (total * 2 / 1024 / 1024).toFixed(2) + ' Mo)';
        } catch (e) {}
        showModal(`Session "${sessionName}" saved successfully!${storageSize}`, true);
    } catch (e) {
        console.error('Error saving session to localStorage:', e);
        showModal('Error saving session. Local storage might be full.', false);
    }
}


async function loadSession(sessionName) {
    if (!sessionName || sessionName === "") { // Added check for empty string
        // showModal('Please select a session to load.', false); // Removed this to avoid modal on "Select a saved session"
        return; // Do nothing if the empty option is selected
    }
    try {
        const sessionKey = llmServerSelect.value + `_session_${sessionName}`;
        const storedData = loadAndDecompress(sessionKey);
        if (storedData) {
            const sessionData = JSON.parse(storedData);
            
            // Auto-save current session silently before loading another
            if (currentSessionName && currentSessionName !== sessionName) {
                try {
                    const prevData = buildCurrentSessionData();
                    compressAndStore(llmServerSelect.value + `_session_${currentSessionName}`, JSON.stringify(prevData));
                    console.log(`Auto-saved session "${currentSessionName}" before loading "${sessionName}"`);
                } catch (e) {
                    console.error('Error auto-saving current session:', e);
                }
            }

            _loadingSession = true;
            console.log('Loading session: Starting complete cleanup and restore...');
            
            // CLEAN ALL EXISTING DATA FIRST
            // Clear chat history
            Object.keys(chatHistory).forEach(k => delete chatHistory[k]);
            Object.keys(undoneChatHistory).forEach(k => delete undoneChatHistory[k]);
            
            // Clear principles
            currentPrinciples = [];
            
            // Clear ALL system prompt inputs
            systemPromptTabsContent.querySelectorAll('.systemprompt-textarea').forEach(ta => { ta.value = ''; });
            
            // Clear all localStorage chat sessions to avoid conflicts
            // Must clear for current tabs AND for incoming session tabs
            const allTabsToClear = new Set(chatTabNames);
            if (sessionData.chatTabNames) {
                sessionData.chatTabNames.forEach(t => allTabsToClear.add(t));
            }
            allTabsToClear.forEach(chatTab => {
                const ck = llmServerSelect.value + `_chat_${chatTab}_current`;
                localStorage.removeItem(ck);
            });
            
            // Reset all per-chat prompts
            chatTabNames.forEach(tab => {
                const emptyPrompts = {};
                systemPromptTabNames.forEach(name => { emptyPrompts[name] = ''; });
                allChatPrompts[tab] = emptyPrompts;
            });
            
            // Clear all skill contents
            Object.keys(allSkillContents).forEach(k => { allSkillContents[k] = ''; });
            skillTabsContent.querySelectorAll('.skill-textarea').forEach(ta => { ta.value = ''; });
            
            // Clear all tool contents
            Object.keys(allToolContents).forEach(k => { allToolContents[k] = ''; });
            toolTabsContent.querySelectorAll('.tool-textarea').forEach(ta => { ta.value = ''; });
            
            // Clear all user data contents
            Object.keys(allUserDataContents).forEach(k => { allUserDataContents[k] = ''; });
            userDataTabsContent.querySelectorAll('.userdata-textarea').forEach(ta => { ta.value = ''; });
            
            // NOW RESTORE SESSION DATA
            
            // Restore all chat histories into the in-memory dict
            if (sessionData.allChatHistories) {
                // Check if new format (Chat 0-4) or legacy format (Prompt I/II/III/System)
                const hasNewFormat = 'Chat 0' in sessionData.allChatHistories;
                
                // Ensure each restored history is a real Array (JSON may have
                // reconstructed an array-like object, which lacks .at()/.pop()/.map()).
                const asArray = (v) => {
                    if (Array.isArray(v)) return v;
                    if (v && typeof v === 'object') {
                        return typeof v.length === 'number' ? Array.from(v) : Object.values(v);
                    }
                    return [];
                };

                if (hasNewFormat) {
                    // Populate chatHistory dict directly from session data
                    const allTabNames = sessionData.chatTabNames || Object.keys(sessionData.allChatHistories);
                    allTabNames.forEach(chatTab => {
                        chatHistory[chatTab] = asArray(sessionData.allChatHistories[chatTab]);
                    });
                } else {
                    // Legacy format: map prompt tabs to Chat tabs
                    const legacyTabNames = ['Prompt I', 'Prompt II', 'Prompt III', 'System'];
                    legacyTabNames.forEach((tabName, i) => {
                        chatHistory[`Chat ${i}`] = asArray(sessionData.allChatHistories[tabName]);
                    });
                }
            }
            
            // Restore current chat tab's history to active chatHistory
            const targetChatTab = sessionData.currentChatTab || 'Chat 0';

            // Restore chat tab names: clear and rebuild
            if (sessionData.chatTabNames) {
                chatTabsBar.querySelectorAll('.chat-tab-btn').forEach(btn => btn.remove());
                chatTabNames.length = 0;
                Object.keys(allChatPrompts).forEach(k => delete allChatPrompts[k]);
                const ctNames = sessionData.chatTabNames;
                chatCounter = ctNames.length - 1;
                ctNames.forEach(ctName => {
                    chatTabNames.push(ctName);
                    allChatPrompts[ctName] = {};
                    systemPromptTabNames.forEach(sp => { allChatPrompts[ctName][sp] = ''; });
                    const btn = document.createElement('button');
                    btn.className = 'chat-tab-btn tab-btn bg-green-100 text-green-900 text-xs px-3 py-1 rounded-t';
                    btn.dataset.chat = ctName;
                    btn.textContent = ctName;
                    btn.addEventListener('click', () => switchChatTab(ctName));
                    chatTabsBar.insertBefore(btn, addChatTabButton);
                });
            }

            currentChatTab = targetChatTab;
            
            // Ensure targetChatTab has an entry (fallback for legacy sessions)
            if (!chatHistory[targetChatTab]) {
                chatHistory[targetChatTab] = sessionData.chatHistory || [];
            }
            renderChatHistory();
            
            // Update chat tab UI
            chatTabsBar.querySelectorAll('.chat-tab-btn').forEach(btn => {
                btn.classList.remove('bg-green-200', 'font-semibold');
                btn.classList.add('bg-green-100');
            });
            const activeChatBtn = chatTabsBar.querySelector(`.chat-tab-btn[data-chat="${targetChatTab}"]`);
            if (activeChatBtn) {
                activeChatBtn.classList.remove('bg-green-100');
                activeChatBtn.classList.add('bg-green-200', 'font-semibold');
            }

            // Restore per-chat system prompts
            if (sessionData.allChatPrompts) {
                // New format: per-chat prompts (dynamic tabs)
                chatTabNames.forEach(chatTab => {
                    if (sessionData.allChatPrompts[chatTab]) {
                        allChatPrompts[chatTab] = sessionData.allChatPrompts[chatTab];
                    } else {
                        const emptyPrompts = {};
                        systemPromptTabNames.forEach(name => { emptyPrompts[name] = ''; });
                        allChatPrompts[chatTab] = emptyPrompts;
                    }
                });
                // Load the current chat's prompts into textareas
                loadChatPromptsToTextareas(targetChatTab);
                console.log('Restored per-chat system prompts');
            } else if (sessionData.allSystemPrompts) {
                // Legacy format: single set of prompts — map old keys to new tab names
                const legacyMap = { 'principle1': 'Sys 0', 'principle2': 'Sys 1', 'principle3': 'Sys 2', 'system': 'Sys 3' };
                const loadedPrompts = {};
                systemPromptTabNames.forEach(name => { loadedPrompts[name] = ''; });
                Object.entries(legacyMap).forEach(([oldKey, newKey]) => {
                    if (sessionData.allSystemPrompts[oldKey] && loadedPrompts.hasOwnProperty(newKey)) {
                        loadedPrompts[newKey] = sessionData.allSystemPrompts[oldKey];
                    }
                });
                chatTabNames.forEach(chatTab => {
                    allChatPrompts[chatTab] = { ...loadedPrompts };
                });
                loadChatPromptsToTextareas(targetChatTab);
                console.log('Restored system prompts from legacy format (copied to all chats)');
            } else {
                // Fallback: restore only current system prompt
                const currentInput = getCurrentSystemPromptInput();
                if (currentInput) {
                    currentInput.value = sessionData.systemPrompt || '';
                }
                saveCurrentChatPromptsToMemory();
                console.log('Restored current system prompt only (legacy session)');
            }
            
            // Restore principles if available
            if (sessionData.principles && sessionData.principles.length > 0) {
                currentPrinciples = sessionData.principles;
            }

            // Restore setup configuration if available
            if (sessionData.setup) {
                const setup = sessionData.setup;
                if (setup.modelName && modelNameSelect) modelNameSelect.value = setup.modelName;
                if (setup.host && hostInput) hostInput.value = setup.host;
                if (setup.maxTokens && maxTokensInput) maxTokensInput.value = setup.maxTokens;
                if (setup.imageDetail) { const _ids = document.getElementById('imageDetailSelect'); if (_ids) _ids.value = setup.imageDetail; }

                // Sync restored settings with the backend (server type FIRST, then host/tokens)
                try {
                    // 1) Set the LLM server type so subsequent calls target the right module
                    const serverType = setup.llmServer || llmServerSelect.value;
                    await fetch(`${API_BASE_URL}/set_model_server`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ server_type: serverType })
                    }).catch(e => console.error('Error syncing server type:', e));

                    // Update UI dropdowns to match
                    if (llmServerSelect) llmServerSelect.value = serverType;
                    if (sidebarLlmServerSelect) sidebarLlmServerSelect.value = serverType;
                    saveSelectedLlmServer(serverType);

                    // 2) Set host on the now-active module
                    if (setup.host) {
                        await fetch(`${API_BASE_URL}/set_host`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ host: setup.host })
                        }).catch(e => console.error('Error syncing host:', e));
                    }

                    // 3) Set max tokens
                    if (setup.maxTokens) {
                        await fetch(`${API_BASE_URL}/set_max_tokens`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ max_tokens: parseInt(setup.maxTokens) || 4096 })
                        }).catch(e => console.error('Error syncing max_tokens:', e));
                    }

                    // 4) Restore API key for this server
                    const savedApiKey = getApiKeyForServer(serverType);
                    if (savedApiKey) {
                        if (apiKeyInput) apiKeyInput.value = savedApiKey;
                        await fetch(`${API_BASE_URL}/set_key`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ api_key: savedApiKey })
                        }).catch(e => console.error('Error syncing api_key:', e));
                    }

                    // 5) Load available models and re-select the session's model
                    await listAvailableModels();
                    if (setup.modelName && modelNameSelect) {
                        modelNameSelect.value = setup.modelName;
                        saveSelectedModel(setup.modelName);
                    }
                } catch (e) {
                    console.error('Error syncing session setup with backend:', e);
                }
            }

            // Restore LLM parameters if available
            if (sessionData.llmParams) {
                const lp = sessionData.llmParams;
                if (lp.temperature && vllmTemperatureInput) vllmTemperatureInput.value = lp.temperature;
                if (lp.top_p && vllmTopPInput) vllmTopPInput.value = lp.top_p;
                if (lp.presence_penalty && vllmPresencePenaltyInput) vllmPresencePenaltyInput.value = lp.presence_penalty;
                if (lp.max_tokens && vllmMaxTokensInput) vllmMaxTokensInput.value = lp.max_tokens;
                saveVllmParams();
                console.log('Restored LLM parameters from session');
            }

            // Restore extra-body parameters if available
            if (typeof saveExtraBodyObject === 'function') {
                if (sessionData.extraBody && Object.keys(sessionData.extraBody).length > 0) {
                    saveExtraBodyObject(sessionData.extraBody);
                    console.log('Restored extra-body parameters from session');
                } else {
                    // Clear extra body when session has none, to prevent leaking from previous session
                    saveExtraBodyObject({});
                    console.log('Cleared extra-body parameters (not present in session)');
                }
                if (typeof updateExtraBodyDisplayText === 'function') updateExtraBodyDisplayText();
                if (typeof renderExtraBodyPairs === 'function') renderExtraBodyPairs();
            }

            // Restore system prompt tab names: clear and rebuild
            if (sessionData.systemPromptTabNames) {
                systemPromptTabsBar.querySelectorAll('.systemprompt-tab-btn').forEach(btn => btn.remove());
                systemPromptTabsContent.innerHTML = '';
                systemPromptTabNames.length = 0;
                const spNamesFromSession = sessionData.systemPromptTabNames;
                systemPromptCounter = spNamesFromSession.length - 1;
                spNamesFromSession.forEach(spName => {
                    systemPromptTabNames.push(spName);
                    const newBtn = document.createElement('button');
                    newBtn.className = 'systemprompt-tab-btn bg-blue-100 text-blue-900 text-xs px-3 py-1 rounded-t';
                    newBtn.dataset.systemprompt = spName;
                    newBtn.textContent = spName;
                    newBtn.addEventListener('click', () => switchSystemPromptTab(spName));
                    systemPromptTabsBar.insertBefore(newBtn, addSystemPromptTabButton);
                    const newTA = document.createElement('textarea');
                    newTA.className = 'systemprompt-textarea dark-textarea hidden';
                    newTA.dataset.systemprompt = spName;
                    newTA.placeholder = `${spName} prompt...`;
                    systemPromptTabsContent.appendChild(newTA);
                });
            }
            // Reload prompts into textareas (including newly created ones)
            loadChatPromptsToTextareas(targetChatTab);

            // Restore current tab and switch to it
            const targetTab = sessionData.currentTab || 'Sys 0';
            switchSystemPromptTab(targetTab, true); // Switch without loading session to avoid recursion

            // Restore skills if available
            if (sessionData.skills) {
                // Clear all existing skill tabs and textareas
                skillTabsBar.querySelectorAll('.skill-tab-btn').forEach(btn => btn.remove());
                skillTabsContent.innerHTML = '';
                skillTabNames.length = 0;
                Object.keys(allSkillContents).forEach(k => delete allSkillContents[k]);

                const skillNamesFromSession = sessionData.skillTabNames || Object.keys(sessionData.skills);
                skillCounter = skillNamesFromSession.length - 1;

                skillNamesFromSession.forEach((skillName, index) => {
                    skillTabNames.push(skillName);
                    allSkillContents[skillName] = sessionData.skills[skillName] || '';

                    const newBtn = document.createElement('button');
                    newBtn.className = 'skill-tab-btn bg-sky-100 text-sky-900 text-xs px-3 py-1 rounded-t';
                    newBtn.dataset.skill = skillName;
                    newBtn.textContent = skillName;
                    newBtn.addEventListener('click', () => switchSkillTab(skillName));
                    skillTabsBar.insertBefore(newBtn, addSkillTabButton);

                    const newTA = document.createElement('textarea');
                    newTA.className = 'skill-textarea dark-textarea hidden';
                    newTA.dataset.skill = skillName;
                    newTA.placeholder = `${skillName}...`;
                    newTA.id = `skillInput${index}`;
                    newTA.value = allSkillContents[skillName];
                    skillTabsContent.appendChild(newTA);
                });

                const targetSkill = sessionData.currentSkillTab || (skillTabNames[0] || 'Skill 0');
                switchSkillTab(targetSkill);
                console.log('Restored skills');
            }

            // Restore tools if available
            if (sessionData.tools) {
                // Clear all existing tool tabs and textareas
                toolTabsBar.querySelectorAll('.tool-tab-btn').forEach(btn => btn.remove());
                toolTabsContent.innerHTML = '';
                toolTabNames.length = 0;
                Object.keys(allToolContents).forEach(k => delete allToolContents[k]);

                const toolNamesFromSession = sessionData.toolTabNames || Object.keys(sessionData.tools);
                toolCounter = toolNamesFromSession.length - 1;

                toolNamesFromSession.forEach((toolName, index) => {
                    toolTabNames.push(toolName);
                    allToolContents[toolName] = sessionData.tools[toolName] || '';

                    const newBtn = document.createElement('button');
                    newBtn.className = 'tool-tab-btn bg-cyan-100 text-cyan-900 text-xs px-3 py-1 rounded-t';
                    newBtn.dataset.tool = toolName;
                    newBtn.textContent = toolName;
                    newBtn.addEventListener('click', () => switchToolTab(toolName));
                    toolTabsBar.insertBefore(newBtn, addToolTabButton);

                    const newTA = document.createElement('textarea');
                    newTA.className = 'tool-textarea dark-textarea hidden';
                    newTA.dataset.tool = toolName;
                    newTA.placeholder = `${toolName}...`;
                    newTA.id = `toolInput${index}`;
                    newTA.value = allToolContents[toolName];
                    toolTabsContent.appendChild(newTA);
                });

                const targetTool = sessionData.currentToolTab || (toolTabNames[0] || 'Tool 0');
                switchToolTab(targetTool);
                console.log('Restored tools');
            }

            // Restore user data if available
            if (sessionData.userData) {
                // Clear all existing user data tabs and textareas
                userDataTabsBar.querySelectorAll('.userdata-tab-btn').forEach(btn => btn.remove());
                userDataTabsContent.innerHTML = '';
                userDataTabNames.length = 0;
                Object.keys(allUserDataContents).forEach(k => delete allUserDataContents[k]);

                // Determine tab names to restore
                const namesFromSession = sessionData.userDataTabNames || Object.keys(sessionData.userData);
                userDataCounter = namesFromSession.length - 1;

                // Rebuild tabs from session data
                namesFromSession.forEach((dataName, index) => {
                    userDataTabNames.push(dataName);
                    allUserDataContents[dataName] = sessionData.userData[dataName] || '';

                    const newBtn = document.createElement('button');
                    newBtn.className = 'userdata-tab-btn bg-amber-100 text-amber-900 text-xs px-3 py-1 rounded-t';
                    newBtn.dataset.userdata = dataName;
                    newBtn.textContent = dataName;
                    newBtn.addEventListener('click', () => switchUserDataTab(dataName));
                    userDataTabsBar.insertBefore(newBtn, addUserDataTabButton);

                    const newTA = document.createElement('textarea');
                    newTA.className = 'userdata-textarea dark-textarea hidden';
                    newTA.dataset.userdata = dataName;
                    newTA.placeholder = `${dataName}...`;
                    newTA.id = `userDataInput${index}`;
                    newTA.value = allUserDataContents[dataName];
                    userDataTabsContent.appendChild(newTA);
                });

                const targetUserData = sessionData.currentUserDataTab || (userDataTabNames[0] || 'Data 0');
                switchUserDataTab(targetUserData);
                console.log('Restored user data');
            }

            // Restore output data if available
            if (sessionData.outputData) {
                outputTabsBar.querySelectorAll('.output-tab-btn').forEach(btn => btn.remove());
                outputTabsContent.innerHTML = '';
                outputTabNames.length = 0;
                Object.keys(allOutputContents).forEach(k => delete allOutputContents[k]);

                const namesFromSession = sessionData.outputDataTabNames || Object.keys(sessionData.outputData);
                outputCounter = namesFromSession.length - 1;

                namesFromSession.forEach((outName, index) => {
                    outputTabNames.push(outName);
                    allOutputContents[outName] = sessionData.outputData[outName] || '';

                    const newBtn = document.createElement('button');
                    newBtn.className = 'output-tab-btn bg-emerald-100 text-emerald-900 text-xs px-3 py-1 rounded-t';
                    newBtn.dataset.output = outName;
                    newBtn.textContent = outName;
                    newBtn.addEventListener('click', () => switchOutputTab(outName));
                    outputTabsBar.insertBefore(newBtn, addOutputTabButton);

                    const newTA = document.createElement('textarea');
                    newTA.className = 'output-textarea dark-textarea hidden';
                    newTA.dataset.output = outName;
                    newTA.placeholder = `${outName}...`;
                    newTA.id = `outputInput${index}`;
                    newTA.value = allOutputContents[outName];
                    outputTabsContent.appendChild(newTA);
                });

                const targetOutput = sessionData.currentOutputTab || (outputTabNames[0] || 'Out 0');
                switchOutputTab(targetOutput);
                console.log('Restored output data');
            }

            // Restore images gallery if available
            if (typeof setAllImages === 'function') {
                setAllImages(sessionData.imagesGallery || []);
            }

            // Restore PDF gallery if available. For older sessions without a
            // dedicated pdfsGallery, setAllImages above already migrated any
            // legacy kind:'pdf' entries, so we must not overwrite them here.
            if (typeof setAllPdfs === 'function' && sessionData.pdfsGallery !== undefined) {
                setAllPdfs(sessionData.pdfsGallery || []);
            }

            // Restore initialization code if available
            if (sessionData.initialization !== undefined) {
                if (typeof sessionData.initialization === 'object' && sessionData.initTabNames) {
                    // New format: per-tab libs
                    resetInitTabs();
                    sessionData.initTabNames.forEach(libName => {
                        if (!initTabNames.includes(libName)) {
                            initTabNames.push(libName);
                            initCounter++;
                            allInitContents[libName] = '';
                            const newBtn = document.createElement('button');
                            newBtn.className = 'init-tab-btn bg-indigo-100 text-indigo-900 text-xs px-3 py-1 rounded-t';
                            newBtn.dataset.lib = libName;
                            newBtn.textContent = libName;
                            newBtn.addEventListener('click', () => switchInitTab(libName));
                            initTabsBar.insertBefore(newBtn, addInitTabButton);
                        }
                    });
                    Object.entries(sessionData.initialization).forEach(([name, content]) => {
                        allInitContents[name] = content;
                    });
                    const targetLib = sessionData.currentInitTab || 'lib 0';
                    switchInitTab(targetLib, true);
                    console.log('Restored initialization code (multi-tab)');
                } else if (typeof sessionData.initialization === 'string') {
                    // Legacy format: single string
                    setInitializationCode(sessionData.initialization);
                    console.log('Restored initialization code (legacy)');
                }
            }

            // Restore confidential field if available
            if (sessionData.confidential !== undefined) {
                document.getElementById('confidentialInput').value = sessionData.confidential;
                console.log('Restored confidential field');
            } else {
                document.getElementById('confidentialInput').value = '';
            }

            // Restore secret field if available
            if (sessionData.secret !== undefined) {
                document.getElementById('secretInput').value = sessionData.secret;
                console.log('Restored secret field');
            } else {
                document.getElementById('secretInput').value = '';
            }

            // Restore session help (hint + description) and apply the hint to
            // the chat input placeholder.
            if (typeof setSessionHelp === 'function') {
                setSessionHelp(sessionData.help || { hint: '', description: '' });
                console.log('Restored session help');
            }

            if (sessionData.apiKey !== undefined && sessionData.apiKey !== '') {
                apiKeyInput.value = sessionData.apiKey;
                // Also persist to localStorage so it survives future loads/switches
                saveApiKeyForServer(llmServerSelect.value, sessionData.apiKey);
                // Send restored key to backend
                fetch(`${API_BASE_URL}/set_key`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ api_key: sessionData.apiKey })
                });
                console.log('Restored API Key from session');
            } else {
                // Session has no API key (e.g. loaded from dump) — fall back to localStorage
                const fallbackApiKey = getApiKeyForServer(llmServerSelect.value);
                apiKeyInput.value = fallbackApiKey;
                if (fallbackApiKey) {
                    fetch(`${API_BASE_URL}/set_key`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ api_key: fallbackApiKey })
                    });
                }
                console.log('Restored API Key from localStorage (not in session)');
            }

            // Restore Display content if available
            if (sessionData.displayContent !== undefined) {
                document.getElementById('displayOutput').innerHTML = sessionData.displayContent;
                console.log('Restored Display content');
            }

            // Restore agents code if available
            if (sessionData.agents !== undefined) {
                resetAgentTabs();
                if (typeof sessionData.agents === 'object' && sessionData.agentTabNames) {
                    // New format: per-tab agents
                    sessionData.agentTabNames.forEach(agentName => {
                        if (!agentTabNames.includes(agentName)) {
                            agentTabNames.push(agentName);
                            agentCounter++;
                            const newBtn = document.createElement('button');
                            newBtn.className = 'agent-tab-btn bg-purple-100 text-purple-900 text-xs px-3 py-1 rounded-t';
                            newBtn.dataset.agent = agentName;
                            newBtn.textContent = agentName;
                            newBtn.addEventListener('click', () => switchAgentTab(agentName));
                            agentTabsBar.insertBefore(newBtn, addAgentTabButton);
                        }
                    });
                    Object.entries(sessionData.agents).forEach(([name, content]) => {
                        allAgentContents[name] = content;
                    });
                    // Restore agent modes (Basic/LispE) if available
                    if (sessionData.agentModes) {
                        Object.entries(sessionData.agentModes).forEach(([name, mode]) => {
                            agentModes[name] = mode;
                        });
                    }
                    const targetAgent = sessionData.currentAgentTab || 'Agent 0';
                    switchAgentTab(targetAgent, true); // skipSave to preserve loaded contents
                    console.log('Restored agents (multi-tab)');                } else if (typeof sessionData.agents === 'string' && agentsEditor) {
                    // Legacy format: single string
                    allAgentContents['Agent 0'] = sessionData.agents;
                    switchAgentTab('Agent 0', true); // skipSave to preserve loaded contents
                    console.log('Restored agents code (legacy)');
                }
            }

            // Restore agents merge mode / active agent selection
            if (typeof restoreAgentMergeMode === 'function') {
                restoreAgentMergeMode(sessionData.agentMergeMode);
            }

            currentSessionName = sessionName;
            updateTopBarSessionName();
            clearSessionModified();

            // Restore code runner if available
            if (sessionData.codeRunner !== undefined) {
                resetCodeRunnerTabs();
                if (typeof sessionData.codeRunner === 'object' && sessionData.codeRunnerTabNames) {
                    sessionData.codeRunnerTabNames.forEach(codeName => {
                        if (!codeRunnerTabNames.includes(codeName)) {
                            codeRunnerTabNames.push(codeName);
                            codeRunnerCounter++;
                            allCodeRunnerContents[codeName] = '';
                            codeRunnerModes[codeName] = 'lispe';
                            const newBtn = document.createElement('button');
                            newBtn.className = 'coderunner-tab-btn bg-teal-100 text-teal-900 text-xs px-3 py-1 rounded-t';
                            newBtn.dataset.code = codeName;
                            newBtn.textContent = codeName;
                            newBtn.addEventListener('click', () => switchCodeRunnerTab(codeName));
                            codeRunnerTabsBar.insertBefore(newBtn, addCodeRunnerTabButton);
                        }
                    });
                    Object.entries(sessionData.codeRunner).forEach(([name, content]) => {
                        allCodeRunnerContents[name] = content;
                    });
                    if (sessionData.codeRunnerModes) {
                        Object.entries(sessionData.codeRunnerModes).forEach(([name, mode]) => {
                            codeRunnerModes[name] = mode;
                        });
                    }
                    const targetCode = sessionData.currentCodeRunnerTab || 'Code 0';
                    switchCodeRunnerTab(targetCode, true);
                    console.log('Restored code runner (multi-tab)');
                }
            }

            // Restore active connectors
            if (sessionData.activeConnectors) {
                disconnectAllConnectors();
                autoConnectSessionConnectors(sessionData.activeConnectors);
                console.log('Restored active connectors:', sessionData.activeConnectors);
            }

            // Restore the Model Keys attached to this session and reconcile
            // them with the local snapshots store (asks the user if anything
            // is missing or has changed).
            if (typeof setSessionModelKeys === 'function') {
                setSessionModelKeys(sessionData.modelKeys || {});
                if (typeof reconcileSessionModelKeys === 'function') {
                    try { reconcileSessionModelKeys(); }
                    catch (e) { console.error('reconcileSessionModelKeys failed:', e); }
                }
            }

            console.log(`Session "${sessionName}" loaded completely with all sections restored.`);
            just_loaded = true;
            _loadingSession = false;
            clearSessionModified();

            // Re-initialize the LispE interpreter with the new session's data
            // so that theuserdata, theprompts, etc. are immediately up to date
            const hasCompilableTabs = agentTabNames.some(name => agentModes[name] === 'basic' || agentModes[name] === 'python');
            if (hasCompilableTabs && basicTranspilerLoaded) {
                compileAndInitialize(true, true);
            } else {
                compileAndInitialize(false, true);
            }

            // If the session overview window is open, refresh its content
            // to reflect the newly loaded session.
            if (typeof window.refreshRecapIfVisible === 'function') window.refreshRecapIfVisible();

        } else {
            _loadingSession = false;
            showModal(`Session "${sessionName}" not found.`, false);
        }
    } catch (e) {
        _loadingSession = false;
        console.error('Error loading session from localStorage:', e);
        showModal('Error loading session. Data might be corrupted.', false);
    }
}
