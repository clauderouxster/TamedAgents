// =============================================
// Display Search functionality
// =============================================
const displaySearchButton = document.getElementById('searchDisplayButton');
const displaySearchBar = document.getElementById('displaySearchBar');
const displaySearchInput = document.getElementById('displaySearchInput');
const displaySearchCount = document.getElementById('displaySearchCount');
const displaySearchPrev = document.getElementById('displaySearchPrev');
const displaySearchNext = document.getElementById('displaySearchNext');
const displaySearchClose = document.getElementById('displaySearchClose');
const displayOutputEl = document.getElementById('displayOutput');
let displaySearchMatches = [];
let displaySearchCurrentIndex = -1;

function clearDisplaySearchHighlights() {
    // Restore original text by removing highlight spans
    displayOutputEl.querySelectorAll('.display-search-highlight').forEach(span => {
        const parent = span.parentNode;
        parent.replaceChild(document.createTextNode(span.textContent), span);
        parent.normalize();
    });
    displaySearchMatches = [];
    displaySearchCurrentIndex = -1;
    displaySearchCount.textContent = '';
}

function performDisplaySearch() {
    clearDisplaySearchHighlights();
    const query = displaySearchInput.value.trim();
    if (!query) return;

    const walker = document.createTreeWalker(displayOutputEl, NodeFilter.SHOW_TEXT, null);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    const queryLower = query.toLowerCase();
    textNodes.forEach(node => {
        const text = node.textContent;
        const textLower = text.toLowerCase();
        let idx = textLower.indexOf(queryLower);
        if (idx === -1) return;

        const frag = document.createDocumentFragment();
        let lastIdx = 0;
        while (idx !== -1) {
            if (idx > lastIdx) frag.appendChild(document.createTextNode(text.substring(lastIdx, idx)));
            const span = document.createElement('span');
            span.className = 'display-search-highlight';
            span.textContent = text.substring(idx, idx + query.length);
            frag.appendChild(span);
            lastIdx = idx + query.length;
            idx = textLower.indexOf(queryLower, lastIdx);
        }
        if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.substring(lastIdx)));
        node.parentNode.replaceChild(frag, node);
    });

    displaySearchMatches = Array.from(displayOutputEl.querySelectorAll('.display-search-highlight'));
    if (displaySearchMatches.length > 0) {
        displaySearchCurrentIndex = 0;
        updateDisplaySearchCurrent();
    } else {
        displaySearchCount.textContent = '0/0';
    }
}

function updateDisplaySearchCurrent() {
    displaySearchMatches.forEach(m => m.classList.remove('current'));
    if (displaySearchCurrentIndex >= 0 && displaySearchCurrentIndex < displaySearchMatches.length) {
        displaySearchMatches[displaySearchCurrentIndex].classList.add('current');
        displaySearchMatches[displaySearchCurrentIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    displaySearchCount.textContent = displaySearchMatches.length > 0
        ? `${displaySearchCurrentIndex + 1}/${displaySearchMatches.length}`
        : '0/0';
}

displaySearchButton.addEventListener('click', () => {
    const visible = displaySearchBar.style.display === 'flex';
    displaySearchBar.style.display = visible ? 'none' : 'flex';
    if (!visible) {
        displaySearchInput.focus();
        displaySearchInput.select();
    } else {
        clearDisplaySearchHighlights();
    }
});

displaySearchInput.addEventListener('input', () => {
    performDisplaySearch();
});

displaySearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
            // Previous
            if (displaySearchMatches.length > 0) {
                displaySearchCurrentIndex = (displaySearchCurrentIndex - 1 + displaySearchMatches.length) % displaySearchMatches.length;
                updateDisplaySearchCurrent();
            }
        } else {
            // Next
            if (displaySearchMatches.length > 0) {
                displaySearchCurrentIndex = (displaySearchCurrentIndex + 1) % displaySearchMatches.length;
                updateDisplaySearchCurrent();
            }
        }
    }
    if (e.key === 'Escape') {
        displaySearchBar.style.display = 'none';
        clearDisplaySearchHighlights();
    }
});

displaySearchNext.addEventListener('click', () => {
    if (displaySearchMatches.length > 0) {
        displaySearchCurrentIndex = (displaySearchCurrentIndex + 1) % displaySearchMatches.length;
        updateDisplaySearchCurrent();
    }
});

displaySearchPrev.addEventListener('click', () => {
    if (displaySearchMatches.length > 0) {
        displaySearchCurrentIndex = (displaySearchCurrentIndex - 1 + displaySearchMatches.length) % displaySearchMatches.length;
        updateDisplaySearchCurrent();
    }
});

displaySearchClose.addEventListener('click', () => {
    displaySearchBar.style.display = 'none';
    clearDisplaySearchHighlights();
});

// =============================================
// TEXTAREA SEARCH (Prompts, Skills, User Data, Tools)
// =============================================
// Generic textarea search engine: reusable for any section with tabbed textareas
function createTextareaSearcher(config) {
    const state = {
        matches: [],      // array of {start, end} positions
        currentIndex: -1,
        lastQuery: ''
    };

    const bar = document.getElementById(config.barId);
    const input = document.getElementById(config.inputId);
    const count = document.getElementById(config.countId);
    const prevBtn = document.getElementById(config.prevId);
    const nextBtn = document.getElementById(config.nextId);
    const closeBtn = document.getElementById(config.closeId);
    const toggleBtn = document.getElementById(config.toggleBtnId);

    // Replace elements
    const replaceRow = document.getElementById(config.replaceRowId);
    const replaceInput = document.getElementById(config.replaceInputId);
    const replaceBtn = document.getElementById(config.replaceBtnId);
    const replaceAllBtn = document.getElementById(config.replaceAllBtnId);
    const toggleReplaceBtn = document.getElementById(config.toggleReplaceBtnId);
    let replaceVisible = false;

    function getActiveTextarea() {
        const container = document.getElementById(config.contentId);
        return container.querySelector(config.textareaSelector + ':not(.hidden)');
    }

    function performSearch() {
        const query = input.value.toLowerCase();
        state.matches = [];
        state.currentIndex = -1;
        state.lastQuery = query;

        if (!query) {
            count.textContent = '0/0';
            return;
        }

        const ta = getActiveTextarea();
        if (!ta) { count.textContent = '0/0'; return; }

        const text = ta.value.toLowerCase();
        let idx = 0;
        while ((idx = text.indexOf(query, idx)) !== -1) {
            state.matches.push({ start: idx, end: idx + query.length });
            idx += 1; // advance by 1 to find overlapping matches
        }

        if (state.matches.length > 0) {
            state.currentIndex = 0;
            highlightCurrent(ta);
        }
        updateCount();
    }

    function updateCount() {
        if (state.matches.length === 0) {
            count.textContent = '0/0';
        } else {
            count.textContent = (state.currentIndex + 1) + '/' + state.matches.length;
        }
    }

    function highlightCurrent(ta) {
        if (!ta) ta = getActiveTextarea();
        if (!ta || state.currentIndex < 0) return;
        const m = state.matches[state.currentIndex];
        ta.focus();
        ta.setSelectionRange(m.start, m.end);
        // Scroll to selection: set scrollTop so the match is visible
        const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 20;
        const textBefore = ta.value.substring(0, m.start);
        const lineNumber = textBefore.split('\n').length - 1;
        const targetScroll = lineNumber * lineHeight - ta.clientHeight / 3;
        ta.scrollTop = Math.max(0, targetScroll);
    }

    function goNext() {
        if (state.matches.length === 0) return;
        state.currentIndex = (state.currentIndex + 1) % state.matches.length;
        updateCount();
        highlightCurrent();
    }

    function goPrev() {
        if (state.matches.length === 0) return;
        state.currentIndex = (state.currentIndex - 1 + state.matches.length) % state.matches.length;
        updateCount();
        highlightCurrent();
    }

    function replaceCurrent() {
        const ta = getActiveTextarea();
        if (!ta || state.currentIndex < 0 || state.matches.length === 0) return;
        const m = state.matches[state.currentIndex];
        const replacement = replaceInput.value;
        const replacePos = m.start;
        const before = ta.value.substring(0, m.start);
        const after = ta.value.substring(m.end);
        ta.value = before + replacement + after;
        // Trigger input event so any change listeners fire
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        // Re-run search to update matches with new text
        performSearch();
        // Position on the next match at or after the replacement position
        if (state.matches.length > 0) {
            const nextPos = replacePos + replacement.length;
            let found = state.matches.findIndex(m => m.start >= nextPos);
            state.currentIndex = found >= 0 ? found : 0;
            highlightCurrent(ta);
            updateCount();
        }
    }

    function replaceAll() {
        const ta = getActiveTextarea();
        if (!ta || state.matches.length === 0) return;
        const query = input.value;
        const replacement = replaceInput.value;
        if (!query) return;
        // Replace all occurrences (case-insensitive)
        const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        ta.value = ta.value.replace(regex, replacement);
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        // Re-run search (should find 0 matches now if replacement differs)
        performSearch();
    }

    function toggleReplace() {
        replaceVisible = !replaceVisible;
        replaceRow.style.display = replaceVisible ? 'flex' : 'none';
        if (replaceVisible) replaceInput.focus();
    }

    function closeSearch() {
        bar.style.display = 'none';
        input.value = '';
        state.matches = [];
        state.currentIndex = -1;
        state.lastQuery = '';
        count.textContent = '0/0';
        replaceVisible = false;
        if (replaceRow) replaceRow.style.display = 'none';
    }

    // Event listeners
    toggleBtn.addEventListener('click', () => {
        if (bar.style.display === 'none') {
            bar.style.display = '';
            input.focus();
        } else {
            closeSearch();
        }
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Enter: launch search or navigate results
            if (state.matches.length === 0 || input.value.toLowerCase() !== state.lastQuery) {
                performSearch();
            } else {
                if (e.shiftKey) { goPrev(); } else { goNext(); }
            }
        }
        if (e.key === 'Escape') {
            closeSearch();
        }
    });

    if (replaceInput) {
        replaceInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) { replaceAll(); } else { replaceCurrent(); }
            }
            if (e.key === 'Escape') {
                closeSearch();
            }
        });
    }

    nextBtn.addEventListener('click', goNext);
    prevBtn.addEventListener('click', goPrev);
    closeBtn.addEventListener('click', closeSearch);
    if (replaceBtn) replaceBtn.addEventListener('click', replaceCurrent);
    if (replaceAllBtn) replaceAllBtn.addEventListener('click', replaceAll);
    if (toggleReplaceBtn) toggleReplaceBtn.addEventListener('click', toggleReplace);

    return { performSearch, closeSearch, state };
}

// Instantiate search for each section
const promptSearcher = createTextareaSearcher({
    barId: 'promptSearchBar',
    inputId: 'promptSearchInput',
    countId: 'promptSearchCount',
    prevId: 'promptSearchPrev',
    nextId: 'promptSearchNext',
    closeId: 'promptSearchClose',
    toggleBtnId: 'searchPromptButton',
    contentId: 'systemPromptTabsContent',
    textareaSelector: '.systemprompt-textarea',
    replaceRowId: 'promptReplaceRow',
    replaceInputId: 'promptReplaceInput',
    replaceBtnId: 'promptReplaceBtn',
    replaceAllBtnId: 'promptReplaceAllBtn',
    toggleReplaceBtnId: 'promptToggleReplaceBtn'
});

const skillSearcher = createTextareaSearcher({
    barId: 'skillSearchBar',
    inputId: 'skillSearchInput',
    countId: 'skillSearchCount',
    prevId: 'skillSearchPrev',
    nextId: 'skillSearchNext',
    closeId: 'skillSearchClose',
    toggleBtnId: 'searchSkillButton',
    contentId: 'skillTabsContent',
    textareaSelector: '.skill-textarea',
    replaceRowId: 'skillReplaceRow',
    replaceInputId: 'skillReplaceInput',
    replaceBtnId: 'skillReplaceBtn',
    replaceAllBtnId: 'skillReplaceAllBtn',
    toggleReplaceBtnId: 'skillToggleReplaceBtn'
});

const userDataSearcher = createTextareaSearcher({
    barId: 'userDataSearchBar',
    inputId: 'userDataSearchInput',
    countId: 'userDataSearchCount',
    prevId: 'userDataSearchPrev',
    nextId: 'userDataSearchNext',
    closeId: 'userDataSearchClose',
    toggleBtnId: 'searchUserDataButton',
    contentId: 'userDataTabsContent',
    textareaSelector: '.userdata-textarea',
    replaceRowId: 'userDataReplaceRow',
    replaceInputId: 'userDataReplaceInput',
    replaceBtnId: 'userDataReplaceBtn',
    replaceAllBtnId: 'userDataReplaceAllBtn',
    toggleReplaceBtnId: 'userDataToggleReplaceBtn'
});

const toolSearcher = createTextareaSearcher({
    barId: 'toolSearchBar',
    inputId: 'toolSearchInput',
    countId: 'toolSearchCount',
    prevId: 'toolSearchPrev',
    nextId: 'toolSearchNext',
    closeId: 'toolSearchClose',
    toggleBtnId: 'searchToolButton',
    contentId: 'toolTabsContent',
    textareaSelector: '.tool-textarea',
    replaceRowId: 'toolReplaceRow',
    replaceInputId: 'toolReplaceInput',
    replaceBtnId: 'toolReplaceBtn',
    replaceAllBtnId: 'toolReplaceAllBtn',
    toggleReplaceBtnId: 'toolToggleReplaceBtn'
});

const outputSearcher = createTextareaSearcher({
    barId: 'outputSearchBar',
    inputId: 'outputSearchInput',
    countId: 'outputSearchCount',
    prevId: 'outputSearchPrev',
    nextId: 'outputSearchNext',
    closeId: 'outputSearchClose',
    toggleBtnId: 'searchOutputButton',
    contentId: 'outputTabsContent',
    textareaSelector: '.output-textarea',
    replaceRowId: 'outputReplaceRow',
    replaceInputId: 'outputReplaceInput',
    replaceBtnId: 'outputReplaceBtn',
    replaceAllBtnId: 'outputReplaceAllBtn',
    toggleReplaceBtnId: 'outputToggleReplaceBtn'
});

// =============================================
// CODEMIRROR SEARCH (Agents, Init, Code Runner)
// =============================================
// Generic CodeMirror search engine using SearchCursor API
function createCodeMirrorSearcher(config) {
    const state = {
        matches: [],      // array of {from, to} CodeMirror positions
        currentIndex: -1,
        lastQuery: '',
        marker: null      // current highlight overlay marker
    };

    const bar = document.getElementById(config.barId);
    const input = document.getElementById(config.inputId);
    const count = document.getElementById(config.countId);
    const prevBtn = document.getElementById(config.prevId);
    const nextBtn = document.getElementById(config.nextId);
    const closeBtn = document.getElementById(config.closeId);
    const toggleBtn = document.getElementById(config.toggleBtnId);

    // Replace elements
    const replaceRow = document.getElementById(config.replaceRowId);
    const replaceInput = document.getElementById(config.replaceInputId);
    const replaceBtn = document.getElementById(config.replaceBtnId);
    const replaceAllBtn = document.getElementById(config.replaceAllBtnId);
    const toggleReplaceBtn = document.getElementById(config.toggleReplaceBtnId);
    let replaceVisible = false;

    function getEditor() {
        return config.getEditor();
    }

    let markers = [];

    function clearMarkers() {
        markers.forEach(m => m.clear());
        markers = [];
    }

    function performSearch() {
        clearMarkers();
        const editor = getEditor();
        if (!editor) { count.textContent = '0/0'; return; }

        const query = input.value;
        state.matches = [];
        state.currentIndex = -1;
        state.lastQuery = query.toLowerCase();

        if (!query) {
            count.textContent = '0/0';
            return;
        }

        const queryLower = query.toLowerCase();
        const cursor = editor.getSearchCursor(query, null, { caseFold: true });
        while (cursor.findNext()) {
            state.matches.push({ from: cursor.from(), to: cursor.to() });
        }

        // Highlight all matches
        state.matches.forEach(m => {
            markers.push(editor.markText(m.from, m.to, { className: 'cm-search-highlight' }));
        });

        if (state.matches.length > 0) {
            state.currentIndex = 0;
            highlightCurrent();
        }
        updateCount();
    }

    function updateCount() {
        if (state.matches.length === 0) {
            count.textContent = '0/0';
        } else {
            count.textContent = (state.currentIndex + 1) + '/' + state.matches.length;
        }
    }

    function highlightCurrent() {
        const editor = getEditor();
        if (!editor || state.currentIndex < 0) return;
        const m = state.matches[state.currentIndex];
        editor.setSelection(m.from, m.to);
        editor.scrollIntoView({ from: m.from, to: m.to }, 100);
    }

    function goNext() {
        if (state.matches.length === 0) return;
        state.currentIndex = (state.currentIndex + 1) % state.matches.length;
        updateCount();
        highlightCurrent();
    }

    function goPrev() {
        if (state.matches.length === 0) return;
        state.currentIndex = (state.currentIndex - 1 + state.matches.length) % state.matches.length;
        updateCount();
        highlightCurrent();
    }

    function replaceCurrent() {
        const editor = getEditor();
        if (!editor || state.currentIndex < 0 || state.matches.length === 0) return;
        const m = state.matches[state.currentIndex];
        const replacement = replaceInput.value;
        // Remember the position where replacement happens
        const replaceLine = m.from.line;
        const replaceCh = m.from.ch + replacement.length;
        editor.replaceRange(replacement, m.from, m.to);
        // Re-run search to update matches
        performSearch();
        // Position on the next match after the replacement
        if (state.matches.length > 0) {
            let found = state.matches.findIndex(match =>
                match.from.line > replaceLine ||
                (match.from.line === replaceLine && match.from.ch >= replaceCh)
            );
            state.currentIndex = found >= 0 ? found : 0;
            highlightCurrent();
            updateCount();
        }
    }

    function replaceAll() {
        const editor = getEditor();
        if (!editor || state.matches.length === 0) return;
        const query = input.value;
        const replacement = replaceInput.value;
        if (!query) return;
        // Replace from bottom to top to preserve positions
        for (let i = state.matches.length - 1; i >= 0; i--) {
            editor.replaceRange(replacement, state.matches[i].from, state.matches[i].to);
        }
        performSearch();
    }

    function toggleReplace() {
        replaceVisible = !replaceVisible;
        replaceRow.style.display = replaceVisible ? 'flex' : 'none';
        if (replaceVisible) replaceInput.focus();
    }

    function closeSearch() {
        bar.style.display = 'none';
        input.value = '';
        clearMarkers();
        state.matches = [];
        state.currentIndex = -1;
        state.lastQuery = '';
        count.textContent = '0/0';
        replaceVisible = false;
        if (replaceRow) replaceRow.style.display = 'none';
    }

    // Event listeners
    toggleBtn.addEventListener('click', () => {
        if (bar.style.display === 'none' || bar.style.display === '') {
            bar.style.display = 'block';
            input.focus();
            input.select();
        } else {
            closeSearch();
        }
    });

    input.addEventListener('input', () => {
        performSearch();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (state.matches.length === 0 || input.value.toLowerCase() !== state.lastQuery) {
                performSearch();
            } else {
                if (e.shiftKey) { goPrev(); } else { goNext(); }
            }
        }
        if (e.key === 'Escape') {
            closeSearch();
        }
    });

    if (replaceInput) {
        replaceInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) { replaceAll(); } else { replaceCurrent(); }
            }
            if (e.key === 'Escape') {
                closeSearch();
            }
        });
    }

    nextBtn.addEventListener('click', goNext);
    prevBtn.addEventListener('click', goPrev);
    closeBtn.addEventListener('click', closeSearch);
    if (replaceBtn) replaceBtn.addEventListener('click', replaceCurrent);
    if (replaceAllBtn) replaceAllBtn.addEventListener('click', replaceAll);
    if (toggleReplaceBtn) toggleReplaceBtn.addEventListener('click', toggleReplace);

    return { performSearch, closeSearch, state };
}

// Function to clear Display output (callable from LispE)
function cleanDisplay() {
    document.getElementById('displayOutput').innerHTML = '<p class="text-gray-400">Output will appear here.</p>';
}

// Function to get the Confidential field content as base64 (callable from LispE)
function getconfidential() {
    return unicodeBtoa(document.getElementById('confidentialInput').value);
}

// Function to get the Secret field content as base64 (callable from LispE)
function getsecret() {
    return unicodeBtoa(document.getElementById('secretInput').value);
}

// Function to get the current chat tab name (callable from LispE)
function getChatName() {
    return currentChatTab;
}

// Function to get the chat history of a specific tab as base64-encoded JSON (callable from LispE)
function getChatValue(base64tabName) {
    const tabName = unicodeAtob(base64tabName);
    const history = chatHistory[tabName] || [];
    // Convert internal {sender, text} format to LLM-standard {role, content} format
    const exported = history.map(m => ({
        role: m.sender,
        content: m.text
    }));
    return unicodeBtoa(JSON.stringify(exported));
}

// Function to replace the chat history of a specific tab with a list of {role, content} dicts
// chat: base64-encoded JSON array of {role: "system"|"user"|"assistant", content: "..."}
function setChatValue(base64tabName, base64chat) {
    const tabName = unicodeAtob(base64tabName);
    const messages = JSON.parse(unicodeAtob(base64chat));
    // Convert {role, content} format to internal {sender, text} format
    chatHistory[tabName] = messages.map(m => ({
        sender: m.role || m.sender,
        text: m.content || m.text
    }));
    if (!undoneChatHistory[tabName]) undoneChatHistory[tabName] = [];
    undoneChatHistory[tabName].length = 0;
    // Re-render if this is the currently visible tab
    if (tabName === currentChatTab) {
        renderChatHistory();
    }
    return 'true';
}

// Function to add a new chat tab programmatically and return its name (callable from LispE)
function pushChatTab() {
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
    return newName;
}

// Function to get the number of chat tabs (callable from LispE)
function getChatSize() {
    return Object.keys(chatHistory).length;
}

// Function to open an input dialog and return the user's input as a base64 string (callable from LispE)
// label: a string displayed as indication/prompt to the user
// Returns a Promise that resolves to theunicode btoa-encoded user input, or "" if cancelled
function read_input(label) {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;';

        // Create modal box
        const box = document.createElement('div');
        box.style.cssText = 'background:var(--bg-elevated);border:1px solid var(--border-color);border-radius:12px;padding:24px;min-width:400px;max-width:600px;box-shadow:0 8px 32px rgba(0,0,0,0.3);';

        // Label
        const labelEl = document.createElement('p');
        labelEl.textContent = label;
        labelEl.style.cssText = 'color:var(--text-primary);font-size:14px;margin:0 0 16px 0;font-family:Inter,sans-serif;';

        // Input field
        const input = document.createElement('input');
        input.type = 'text';
        input.style.cssText = 'width:100%;padding:10px 12px;background:var(--bg-surface);border:1px solid var(--border-color);border-radius:8px;color:var(--text-primary);font-size:14px;font-family:Inter,sans-serif;outline:none;box-sizing:border-box;';
        input.addEventListener('focus', () => { input.style.borderColor = 'var(--accent)'; });
        input.addEventListener('blur', () => { input.style.borderColor = 'var(--border-color)'; });

        // Button row
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:16px;';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = 'padding:8px 16px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-surface);color:var(--text-secondary);cursor:pointer;font-size:13px;font-family:Inter,sans-serif;';
        cancelBtn.addEventListener('mouseenter', () => { cancelBtn.style.background = 'var(--bg-hover)'; });
        cancelBtn.addEventListener('mouseleave', () => { cancelBtn.style.background = 'var(--bg-surface)'; });

        const okBtn = document.createElement('button');
        okBtn.textContent = 'OK';
        okBtn.style.cssText = 'padding:8px 16px;border-radius:8px;border:none;background:var(--accent);color:#fff;cursor:pointer;font-size:13px;font-family:Inter,sans-serif;';
        okBtn.addEventListener('mouseenter', () => { okBtn.style.background = 'var(--accent-hover)'; });
        okBtn.addEventListener('mouseleave', () => { okBtn.style.background = 'var(--accent)'; });

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(okBtn);
        box.appendChild(labelEl);
        box.appendChild(input);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Focus the input
        setTimeout(() => input.focus(), 50);

        function cleanup(result) {
            document.body.removeChild(overlay);
            resolve(result);
        }

        okBtn.addEventListener('click', () => cleanup(unicodeBtoa(input.value)));
        cancelBtn.addEventListener('click', () => cleanup(''));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') cleanup(unicodeBtoa(input.value));
            if (e.key === 'Escape') cleanup('');
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup('');
        });
    });
}

// Function to save the current session (callable from LispE / JS)
// Saves to the current session if one is active, otherwise prompts for a name.
function save_session() {
    if (currentSessionName) {
        saveSessionConfirmed(currentSessionName);
    } else {
        promptForSessionName();
    }
}

// Function to store the current session to a file on disk via the backend
// path: base64-encoded file path string
// Returns a Promise resolving to "success" or an error message
async function store_session_to_disk(path) {
    const filePath = unicodeAtob(path);
    const sessionData = buildCurrentSessionData();
    // Remove sensitive fields
    delete sessionData.confidential;
    delete sessionData.secret;
    delete sessionData.apiKey;
    try {
        const response = await fetch(`${API_BASE_URL}/store_session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: filePath, session: sessionData })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showModal(`Session stored to ${result.path}`, true);
            return 'success';
        } else {
            showModal(`Error: ${result.message}`, false);
            return result.message;
        }
    } catch (e) {
        showModal(`Error: ${e.message}`, false);
        return e.message;
    }
}

// Function to store a string to a file on disk via the backend
// path: base64-encoded file path, data: base64-encoded string content
// Returns a Promise resolving to "success" or an error message
async function store_data_to_disk(path, data) {
    const filePath = unicodeAtob(path);
    const content = unicodeAtob(data);
    try {
        const response = await fetch(`${API_BASE_URL}/store_data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: filePath, content: content })
        });
        const result = await response.json();
        if (result.status === 'success') {
            showModal(`Data stored to ${result.path}`, true);
            return 'success';
        } else {
            showModal(`Error: ${result.message}`, false);
            return result.message;
        }
    } catch (e) {
        showModal(`Error: ${e.message}`, false);
        return e.message;
    }
}

// Synchronous version of store_data_to_disk (avoids async/session reset race condition)
// path: base64-encoded file path, data: base64-encoded string content
// Returns "success" or an error message
function store_data_to_disk_sync(path, data) {
    const filePath = unicodeAtob(path);
    const content = unicodeAtob(data);
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/store_data`, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({ path: filePath, content: content }));
        if (xhr.status === 200) {
            const result = JSON.parse(xhr.responseText);
            if (result.status === 'success') {
                showModal(`Data stored to ${result.path}`, true);
                return 'success';
            } else {
                showModal(`Error: ${result.message}`, false);
                return result.message;
            }
        }
        showModal(`Error: HTTP ${xhr.status}`, false);
        return `HTTP error ${xhr.status}`;
    } catch (e) {
        showModal(`Error: ${e.message}`, false);
        return e.message;
    }
}

// Trigger a browser-side save of `data` as a file on the USER's local
// machine (the browser host), not on the machine that runs app.py.
//
// Arguments (all base64-encoded by the LispE wrapper):
//   name      — suggested filename (only the basename is kept).
//   data      — string content to save.
//   directory — optional hint. When empty, the file is silently saved into
//               the browser's configured Downloads folder. When non-empty
//               AND the browser exposes the File System Access API
//               (Chrome / Edge / Brave / Opera — NOT Safari, NOT Firefox),
//               a native "Save As" dialog is opened so the user can choose
//               the destination. If `directory` matches one of the
//               well-known locations ('desktop', 'documents', 'downloads',
//               'music', 'pictures', 'videos'), the dialog starts there.
//               Otherwise it starts in the last used location.
//
// Safari (desktop & iOS) and Firefox do not expose showSaveFilePicker; in
// those cases the `directory` argument is silently ignored and the file is
// downloaded to the browser's Downloads folder. No browser API allows
// writing to an arbitrary path without user consent.
//
// Returns 'success', 'cancelled' (user aborted the Save As dialog), or an
// error message string. The function is async; callers from LispE go
// through asyncjs.
async function upload_data_to_browser(name, data, directory) {
    try {
        const rawName = unicodeAtob(name);
        const content = unicodeAtob(data);
        const rawDir = directory ? unicodeAtob(directory) : '';
        const safeName = (rawName || 'download').toString().split(/[\\/]/).pop() || 'download';
        const wellKnown = new Set(['desktop', 'documents', 'downloads', 'music', 'pictures', 'videos']);

        // Path A: programmatic "Save As" dialog (Chrome / Edge / Brave / Opera).
        // The browser still requires user consent via its native picker;
        // there is no way to write to an arbitrary path silently.
        if (rawDir && typeof window.showSaveFilePicker === 'function') {
            try {
                const opts = { suggestedName: safeName };
                const dirLower = rawDir.toLowerCase();
                if (wellKnown.has(dirLower)) {
                    opts.startIn = dirLower;
                }
                const handle = await window.showSaveFilePicker(opts);
                const writable = await handle.createWritable();
                await writable.write(content);
                await writable.close();
                showModal(`Data saved as ${handle.name}`, true);
                return 'success';
            } catch (e) {
                if (e && (e.name === 'AbortError' || e.code === 20)) {
                    return 'cancelled';
                }
                // Any other failure falls back to the silent download path.
                console.warn('showSaveFilePicker failed, falling back to download:', e);
            }
        }

        // Path B: silent Blob download to the browser's Downloads folder.
        // Used: when directory is empty, on Safari / Firefox, and as a
        // fallback when the File System Access API is unavailable.
        const blob = new Blob([content], { type: 'application/octet-stream;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Some browsers cancel the download if the URL is revoked synchronously.
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showModal(`Data downloaded as ${safeName}`, true);
        return 'success';
    } catch (e) {
        showModal(`Error: ${e.message}`, false);
        return e.message;
    }
}

// Synchronous PDF ingest via the backend (callable from LispE).
// spec: base64-encoded JSON { source, kind?, mode?, dpi?, max_pages? }
//   source: a disk path, an http(s) URL, or base64 PDF data (with or without
//           a "data:" prefix). kind defaults to "auto".
// Returns base64-encoded JSON: { status, decision, pages, textual_ratio,
//   items:[{page, kind:'text'|'image', text|src}] } or an error object.
function pdf_ingest_sync(spec) {
    try {
        const payload = JSON.parse(unicodeAtob(spec));
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/pdf_ingest`, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(payload));
        if (xhr.status === 200) {
            return unicodeBtoa(xhr.responseText);
        }
        let msg = `HTTP ${xhr.status}`;
        try { msg = JSON.parse(xhr.responseText).message || msg; } catch (e) {}
        return unicodeBtoa(JSON.stringify({ status: 'error', message: msg }));
    } catch (e) {
        return unicodeBtoa(JSON.stringify({ status: 'error', message: e.message }));
    }
}

// Function to load a file from disk via the backend (synchronous)
// path: base64-encoded file path
// Returns the file content as a base64-encoded string
function load_data_from_disk(path) {
    const filePath = unicodeAtob(path);
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/load_data`, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify({ path: filePath }));
        if (xhr.status === 200) {
            const result = JSON.parse(xhr.responseText);
            if (result.status === 'success') {
                return unicodeBtoa(result.content);
            }
        }
        return '';
    } catch (e) {
        return '';
    }
}

/*
// Function to execute Python code via the FastAPI backend (callable from LispE)
// code: base64-encoded Python code
// Returns the result value of the last expression as a string
// stdout is displayed in the Display zone, result is returned
async function execute_python(code) {
    const decodedCode = unicodeAtob(code);

    try {
        const response = await fetch(`${API_BASE_URL}/eval_python`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: decodedCode })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();

        // Display stdout in the Display zone if any
        if (data.stdout) {
            displayError(data.stdout);
        }

        // Display stderr in the Display zone if any
        if (data.stderr) {
            displayError(data.stderr);
        }

        if (data.status === 'error') {
            console.error('Python error:', data.error);
            return 'Error: ' + data.error;
        }

        // Return the result value (last expression)
        return data
    } catch (e) {
        console.error('execute_python error:', e);
        return {"stderr":"", "stdout":"", "result":e.message};
    }
}
*/

// Function to fetch a web page from the internet via the backend proxy
// url: base64-encoded URL string
// Returns a Promise resolving to the page content as a string
async function fetch_webpage(url) {
    const decodedUrl = unicodeAtob(url);
    try {
        const response = await fetch(`${API_BASE_URL}/fetch_webpage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: decodedUrl })
        });
        const data = await response.json();
        if (data.status === 'success') {
            return unicodeBtoa(data.content);
        } else {
            console.error('fetch_webpage error:', data.error);
            return unicodeBtoa('Error: ' + data.error);
        }
    } catch (e) {
        console.error('fetch_webpage error:', e);
        return unicodeBtoa('Error: ' + e.message);
    }
}

// Function to fetch and parse RSS/Atom feeds
// url: base64-encoded feed URL
// max_items: optional maximum number of items to return (default 20)
// Returns a Promise resolving to the feed data as a base64-encoded JSON string
async function fetch_feed(url, max_items = 20) {
    const decodedUrl = unicodeAtob(url);
    try {
        const response = await fetch(`${API_BASE_URL}/fetch_feed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: decodedUrl, max_items: max_items })
        });
        const data = await response.json();
        if (data.status === 'success') {
            return unicodeBtoa(JSON.stringify({
                source: data.source,
                items: data.items,
                count: data.count
            }));
        } else {
            console.error('fetch_feed error:', data.error);
            return unicodeBtoa(JSON.stringify({ error: data.error }));
        }
    } catch (e) {
        console.error('fetch_feed error:', e);
        return unicodeBtoa(JSON.stringify({ error: e.message }));
    }
}

// Function to search the web via DuckDuckGo (backend proxy)
// query: base64-encoded search query string
// max_results: optional number of results (default 10)
// Returns a Promise resolving to the search results as a base64-encoded JSON string
async function web_search(query, max_results = 10) {
    const decodedQuery = unicodeAtob(query);
    try {
        const response = await fetch(`${API_BASE_URL}/web_search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: decodedQuery, max_results: max_results })
        });
        const data = await response.json();
        if (data.status === 'success') {
            return unicodeBtoa(JSON.stringify(data.results));
        } else {
            console.error('web_search error:', data.error);
            return unicodeBtoa(JSON.stringify({ error: data.error }));
        }
    } catch (e) {
        console.error('web_search error:', e);
        return unicodeBtoa(JSON.stringify({ error: e.message }));
    }
}

// Function to parse CSV content locally (synchronous, no backend call)
// csv_content: base64-encoded CSV string
// delimiter: optional delimiter character (default ',')
// has_header: optional boolean (default true)
// Returns base64-encoded JSON string with { headers, rows }
function parse_csv(csv_content, delimiter = ',', has_header = true) {
    const content = unicodeAtob(csv_content);
    try {
        const rows = [];
        let current = [];
        let field = '';
        let inQuotes = false;
        for (let i = 0; i < content.length; i++) {
            const ch = content[i];
            if (inQuotes) {
                if (ch === '"' && i + 1 < content.length && content[i + 1] === '"') {
                    field += '"';
                    i++;
                } else if (ch === '"') {
                    inQuotes = false;
                } else {
                    field += ch;
                }
            } else if (ch === '"') {
                inQuotes = true;
            } else if (ch === delimiter) {
                current.push(field);
                field = '';
            } else if (ch === '\r') {
                // skip \r, handled with \n
            } else if (ch === '\n') {
                current.push(field);
                field = '';
                if (current.length > 0) rows.push(current);
                current = [];
            } else {
                field += ch;
            }
        }
        current.push(field);
        if (current.some(f => f !== '')) rows.push(current);
        let headers = [];
        let dataRows = rows;
        if (has_header && rows.length > 0) {
            headers = rows[0];
            dataRows = rows.slice(1);
        }
        return unicodeBtoa(JSON.stringify({ headers: headers, rows: dataRows }));
    } catch (e) {
        console.error('parse_csv error:', e);
        return unicodeBtoa(JSON.stringify({ error: e.message }));
    }
}

// Function to open a URL in the display zone (renders HTML content)
async function open_url(url) {
    const decodedUrl = unicodeAtob(url);
    try {
        const response = await fetch(`${API_BASE_URL}/fetch_webpage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: decodedUrl })
        });
        const data = await response.json();
        const element = document.getElementById('displayOutput');
        if (data.status === 'success') {
            if (element) {
                element.innerHTML = data.content;
            }
            return unicodeBtoa(data.content);
        } else {
            const errMsg = 'Error: ' + data.error;
            if (element) {
                element.textContent = errMsg;
            }
            return unicodeBtoa(errMsg);
        }
    } catch (e) {
        console.error('open_url error:', e);
        return unicodeBtoa('Error: ' + e.message);
    }
}

// Open a new browser tab displaying the given HTML string
function open_html_in_tab(html) {
    const decoded = unicodeAtob(html);
    const blob = new Blob([decoded], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}

// Function to execute a shell command via the backend
// command: base64-encoded shell command string
// timeout: optional timeout in seconds (default 30)
// Returns a Promise resolving to the result as a base64-encoded JSON string
async function run_shell(command, timeout = 30) {
    const decodedCommand = unicodeAtob(command);
    try {
        const response = await fetch(`${API_BASE_URL}/run_shell`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: decodedCommand, timeout: timeout })
        });
        const data = await response.json();
        return unicodeBtoa(JSON.stringify(data));
    } catch (e) {
        console.error('run_shell error:', e);
        return unicodeBtoa(JSON.stringify({ status: 'error', error: e.message }));
    }
}

