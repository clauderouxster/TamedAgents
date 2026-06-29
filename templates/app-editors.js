
// =============================================
// INITIALIZATION - Set button logic
// =============================================
const setInitializationButton = document.getElementById('setInitializationButton');

// Undo/Redo in Initialization editor
document.getElementById('undoInitButton').addEventListener('click', () => {
    if (initializationEditor) initializationEditor.undo();
});
document.getElementById('redoInitButton').addEventListener('click', () => {
    if (initializationEditor) initializationEditor.redo();
});

// Search/Replace in Initialization editor (custom bar)
const initSearcher = createCodeMirrorSearcher({
    barId: 'initSearchBar',
    inputId: 'initSearchInput',
    countId: 'initSearchCount',
    prevId: 'initSearchPrev',
    nextId: 'initSearchNext',
    closeId: 'initSearchClose',
    toggleBtnId: 'searchInitButton',
    replaceRowId: 'initReplaceRow',
    replaceInputId: 'initReplaceInput',
    replaceBtnId: 'initReplaceBtn',
    replaceAllBtnId: 'initReplaceAllBtn',
    toggleReplaceBtnId: 'initToggleReplaceBtn',
    getEditor: () => initializationEditor
});

setInitializationButton.addEventListener('click', () => {
    if (!compileAndInitialize(false, false)) {
        showModal('Initialization failed. See the console.', false);
    } else {
        showModal('Initialization compiled successfully.', true);
    }
});

// =============================================
// CONSOLE - Interactive LispE REPL
// =============================================
let consoleEditor = null;
const consoleOutput = document.getElementById('consoleOutputContainer');
const consoleHistory = [];
let consoleHistoryIndex = -1;
let consoleSavedInput = '';

// Initialize CodeMirror for the Console input
consoleEditor = CodeMirror.fromTextArea(document.getElementById('consoleCodeInput'), {
    mode: 'scheme',
    theme: 'dracula',
    lineNumbers: false,
    matchBrackets: true,
    autoCloseBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: true,
    placeholder: 'Enter LispE expression...',
    extraKeys: {
        'Enter': function(cm) {
            const line = cm.getValue().trim();
            if (!line) return;
            // Add to history
            consoleHistory.push(line);
            consoleHistoryIndex = -1;
            consoleSavedInput = '';
            // Display input line in output
            const inputDiv = document.createElement('div');
            inputDiv.className = 'console-line-input';
            inputDiv.textContent = line;
            consoleOutput.appendChild(inputDiv);
            // If no parentheses, wrap in (println ...)
            let code = line;
            if (!line.includes('(') && !line.includes(')')) {
                code = '(return ' + line + ')';
            }
            // Evaluate
            const result = run_code(code);
            // Display result
            const resultDiv = document.createElement('div');
            if (result === false) {
                resultDiv.className = 'console-line-error';
                resultDiv.textContent = 'Error';
            } else {
                resultDiv.className = 'console-line-result';
                resultDiv.textContent = result;
            }
            consoleOutput.appendChild(resultDiv);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
            // Clear input
            cm.setValue('');
        },
        'Up': function(cm) {
            if (consoleHistory.length === 0) return;
            if (consoleHistoryIndex === -1) {
                consoleSavedInput = cm.getValue();
                consoleHistoryIndex = consoleHistory.length - 1;
            } else if (consoleHistoryIndex > 0) {
                consoleHistoryIndex--;
            }
            cm.setValue(consoleHistory[consoleHistoryIndex]);
            cm.setCursor(cm.lineCount(), 0);
        },
        'Down': function(cm) {
            if (consoleHistoryIndex === -1) return;
            if (consoleHistoryIndex < consoleHistory.length - 1) {
                consoleHistoryIndex++;
                cm.setValue(consoleHistory[consoleHistoryIndex]);
            } else {
                consoleHistoryIndex = -1;
                cm.setValue(consoleSavedInput);
            }
            cm.setCursor(cm.lineCount(), 0);
        },
        'Shift-Enter': 'newlineAndIndent'
    }
});
consoleEditor.setSize(null, 80);

// Trigger autocomplete on 3+ character words in console editor (debounced)
(function() {
    let hintTimeout = null;
    consoleEditor.on('inputRead', function(cm, change) {
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

// Clean console button - only clears the output
document.getElementById('cleanConsoleButton').addEventListener('click', () => {
    consoleOutput.innerHTML = '';
});

// Copy console output to clipboard
document.getElementById('copyConsoleButton').addEventListener('click', () => {
    const text = consoleOutput.innerText;
    const btn = document.getElementById('copyConsoleButton');
    navigator.clipboard.writeText(text).then(() => {
        const orig = btn.innerHTML;
        btn.innerHTML = '✓';
        setTimeout(() => { btn.innerHTML = orig; }, 1500);
    });
});

// Reset console button - clears output and resets LispE, then reloads code and data
document.getElementById('resetConsoleButton').addEventListener('click', () => {
    consoleOutput.innerHTML = '';
    compileAndInitialize(false, false);
});

// =============================================
// CODE RUNNER - CodeMirror editor + tab management
// =============================================
const codeRunnerTabsBar = document.getElementById('codeRunnerTabsBar');
const addCodeRunnerTabButton = document.getElementById('addCodeRunnerTabButton');
let codeRunnerEditor = null;

// Track code runner tab names and current tab
let codeRunnerTabNames = ['Code 0', 'Code 1', 'Code 2', 'Code 3', 'Code 4'];
let currentCodeRunnerTab = 'Code 0';
let codeRunnerCounter = 4;

// Store code runner content per tab
const allCodeRunnerContents = {};
codeRunnerTabNames.forEach(name => { allCodeRunnerContents[name] = ''; });

// Mode per code runner tab: 'lispe', 'basic', or 'python'
const codeRunnerModes = {};
codeRunnerTabNames.forEach(name => { codeRunnerModes[name] = 'basic'; });

// Cache for compiled LispE code per tab (only when in Basic/Python mode)
const codeRunnerCompiledCache = {};

// Whether we're viewing compiled output (read-only) vs editing
const codeRunnerViewingCompiled = {};
codeRunnerTabNames.forEach(name => { codeRunnerViewingCompiled[name] = false; });

// Undo stack for deleted Code Runner tabs
const codeRunnerDeletedTabsStack = [];
const undoCodeRunnerTabButton = document.getElementById('undoCodeRunnerTabButton');

function updateUndoCodeRunnerButton() {
    undoCodeRunnerTabButton.style.display = codeRunnerDeletedTabsStack.length > 0 ? '' : 'none';
}

function clearCodeRunnerUndoStack() {
    codeRunnerDeletedTabsStack.length = 0;
    updateUndoCodeRunnerButton();
}

function renumberCodeRunnerTabs() {
    const contents = codeRunnerTabNames.map(name => allCodeRunnerContents[name] || '');
    const modes = codeRunnerTabNames.map(name => codeRunnerModes[name] || 'basic');
    const newNames = contents.map((_, i) => `Code ${i}`);

    codeRunnerTabNames.length = 0;
    newNames.forEach(n => codeRunnerTabNames.push(n));
    Object.keys(allCodeRunnerContents).forEach(k => delete allCodeRunnerContents[k]);
    Object.keys(codeRunnerModes).forEach(k => delete codeRunnerModes[k]);
    Object.keys(codeRunnerCompiledCache).forEach(k => delete codeRunnerCompiledCache[k]);
    Object.keys(codeRunnerViewingCompiled).forEach(k => delete codeRunnerViewingCompiled[k]);
    newNames.forEach((name, i) => {
        allCodeRunnerContents[name] = contents[i];
        codeRunnerModes[name] = modes[i];
        codeRunnerViewingCompiled[name] = false;
    });
    codeRunnerCounter = newNames.length - 1;

    codeRunnerTabsBar.querySelectorAll('.coderunner-tab-btn').forEach(btn => btn.remove());

    newNames.forEach((name) => {
        const btn = document.createElement('button');
        btn.className = 'coderunner-tab-btn bg-teal-100 text-teal-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.code = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchCodeRunnerTab(btn.dataset.code));
        codeRunnerTabsBar.insertBefore(btn, addCodeRunnerTabButton);
    });
}

function saveCurrentCodeRunnerToMemory() {
    if (codeRunnerEditor) {
        // Don't save compiled output back as source
        if (!codeRunnerViewingCompiled[currentCodeRunnerTab]) {
            const newContent = codeRunnerEditor.getValue();
            if (allCodeRunnerContents[currentCodeRunnerTab] !== newContent) {
                delete codeRunnerCompiledCache[currentCodeRunnerTab];
            }
            allCodeRunnerContents[currentCodeRunnerTab] = newContent;
        }
    }
}

function switchCodeRunnerTab(tabName, skipSave = false) {
    if (!skipSave) saveCurrentCodeRunnerToMemory();
    // Deactivate all tab buttons
    codeRunnerTabsBar.querySelectorAll('.coderunner-tab-btn').forEach(btn => {
        btn.classList.remove('bg-teal-200', 'font-semibold');
        btn.classList.add('bg-teal-100');
    });
    // Activate selected tab
    const activeBtn = codeRunnerTabsBar.querySelector(`.coderunner-tab-btn[data-code="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-teal-100');
        activeBtn.classList.add('bg-teal-200', 'font-semibold');
    }
    currentCodeRunnerTab = tabName;
    // Ensure mode exists for this tab
    if (!codeRunnerModes[tabName]) codeRunnerModes[tabName] = 'lispe';
    if (codeRunnerViewingCompiled[tabName] === undefined) codeRunnerViewingCompiled[tabName] = false;

    // Load content into CodeMirror
    if (codeRunnerEditor) {
        if (codeRunnerViewingCompiled[tabName] && codeRunnerCompiledCache[tabName]) {
            codeRunnerEditor.setValue(codeRunnerCompiledCache[tabName]);
        } else {
            codeRunnerEditor.setValue(allCodeRunnerContents[tabName] || '');
        }
    }
    // Update mode toggle button and CodeMirror mode
    updateCodeRunnerModeUI();
}

function updateCodeRunnerModeUI() {
    const toggleBtn = document.getElementById('toggleCodeRunnerModeButton');
    const compileBtn = document.getElementById('compileCodeRunnerButton');
    const mode = codeRunnerModes[currentCodeRunnerTab] || 'lispe';
    const viewing = codeRunnerViewingCompiled[currentCodeRunnerTab] || false;

    if (mode === 'basic') {
        toggleBtn.textContent = 'BasAIc';
    } else if (mode === 'python') {
        toggleBtn.textContent = 'Pythonic';
    } else {
        toggleBtn.textContent = 'LispE';
    }
    toggleBtn.style.background = mode === 'basic' ? '#b35c2a' : mode === 'python' ? '#306998' : '';
    toggleBtn.style.color = (mode === 'basic' || mode === 'python') ? '#fff' : '';

    // Show/hide Compile button
    if (mode === 'basic' || mode === 'python') {
        compileBtn.style.display = '';
        compileBtn.textContent = viewing ? 'Edit' : 'Compile';
    } else {
        compileBtn.style.display = 'none';
    }

    // Show/hide Tab→Space button (Pythonic mode only)
    const tabsBtn = document.getElementById('tabsToSpacesCodeRunnerButton');
    if (tabsBtn) {
        tabsBtn.style.display = (mode === 'python' && !viewing) ? '' : 'none';
    }

    // Update CodeMirror mode
    if (codeRunnerEditor) {
        const wrapper = codeRunnerEditor.getWrapperElement();
        if (viewing) {
            codeRunnerEditor.setOption('mode', 'scheme');
            codeRunnerEditor.setOption('readOnly', true);
            codeRunnerEditor.setOption('indentUnit', 2);
            codeRunnerEditor.setOption('tabSize', 2);
            wrapper.classList.remove('basic-mode');
        } else if (mode === 'python') {
            codeRunnerEditor.setOption('mode', {
                name: 'python',
                version: 3,
                extra_keywords: ['rule', 'rulejs', 'defjs'],
                extra_builtins: ['println', 'callchat', 'callchatsilent', 'calltool',
                    'execute_when', 'read_input', 'push_message',
                    'jsjson', 'jschat', 'convertjs', 'json_parse',
                    'clean_display', 'save_session', 'display_page',
                    'getconfidential', 'getsecret', 'atob', 'btoa']
            });
            codeRunnerEditor.setOption('readOnly', false);
            codeRunnerEditor.setOption('indentUnit', 4);
            codeRunnerEditor.setOption('tabSize', 4);
            wrapper.classList.add('basic-mode');
        } else if (mode === 'basic') {
            codeRunnerEditor.setOption('mode', 'basic');
            codeRunnerEditor.setOption('readOnly', false);
            codeRunnerEditor.setOption('indentUnit', 2);
            codeRunnerEditor.setOption('tabSize', 2);
            wrapper.classList.add('basic-mode');
        } else {
            codeRunnerEditor.setOption('mode', 'scheme');
            codeRunnerEditor.setOption('readOnly', false);
            codeRunnerEditor.setOption('indentUnit', 2);
            codeRunnerEditor.setOption('tabSize', 2);
            wrapper.classList.remove('basic-mode');
        }
    }
}

// Attach click listeners to initial code runner tabs
codeRunnerTabsBar.querySelectorAll('.coderunner-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchCodeRunnerTab(btn.dataset.code));
});

// Add new code runner tab
addCodeRunnerTabButton.addEventListener('click', () => {
    codeRunnerCounter++;
    const newName = `Code ${codeRunnerCounter}`;
    codeRunnerTabNames.push(newName);
    allCodeRunnerContents[newName] = '';
    codeRunnerModes[newName] = 'basic';

    const newBtn = document.createElement('button');
    newBtn.className = 'coderunner-tab-btn bg-teal-100 text-teal-900 text-xs px-3 py-1 rounded-t';
    newBtn.dataset.code = newName;
    newBtn.textContent = newName;
    newBtn.addEventListener('click', () => switchCodeRunnerTab(newName));
    codeRunnerTabsBar.insertBefore(newBtn, addCodeRunnerTabButton);

    switchCodeRunnerTab(newName);
});

// Initialize CodeMirror for the Code Runner section
codeRunnerEditor = CodeMirror.fromTextArea(document.getElementById('codeRunnerCodeInput'), {
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
codeRunnerEditor.setSize(null, 300);

// Set initial mode UI for code runner (default mode is 'basic')
updateCodeRunnerModeUI();

// Track modifications in code runner editor
codeRunnerEditor.on('change', () => {
    // Invalidate compiled cache for current tab on any edit
    delete codeRunnerCompiledCache[currentCodeRunnerTab];
    markSessionModified();
    updateCodeRunnerModeUI();
});

// Autocomplete for code runner editor is attached via attachSmartAutocomplete below

// Drag-to-resize for code runner editor
(function() {
    const handle = document.getElementById('codeRunnerResizeHandle');
    const container = document.getElementById('codeRunnerEditorContainer');
    if (!handle || !container) return;
    let startY, startH;
    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startY = e.clientY;
        startH = container.offsetHeight;
        const onMouseMove = (e2) => {
            const newH = Math.max(100, startH + (e2.clientY - startY));
            container.style.height = newH + 'px';
            if (codeRunnerEditor) codeRunnerEditor.setSize(null, newH);
        };
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
})();

// Toggle LispE/BasAIc/Python mode button for Code Runner
document.getElementById('toggleCodeRunnerModeButton').addEventListener('click', () => {
    saveCurrentCodeRunnerToMemory();
    // Reset compiled state when switching mode
    codeRunnerViewingCompiled[currentCodeRunnerTab] = false;
    delete codeRunnerCompiledCache[currentCodeRunnerTab];
    const mode = codeRunnerModes[currentCodeRunnerTab] || 'lispe';
    if (mode === 'lispe') {
        codeRunnerModes[currentCodeRunnerTab] = 'basic';
    } else if (mode === 'basic') {
        codeRunnerModes[currentCodeRunnerTab] = 'python';
    } else {
        codeRunnerModes[currentCodeRunnerTab] = 'lispe';
    }
    updateCodeRunnerModeUI();
});

// Tab→Space button for Code Runner (Pythonic mode)
document.getElementById('tabsToSpacesCodeRunnerButton').addEventListener('click', () => {
    if (codeRunnerEditor) {
        const code = codeRunnerEditor.getValue();
        const normalized = code.replace(/\t/g, '    ');
        if (code !== normalized) {
            codeRunnerEditor.setValue(normalized);
        }
    }
});

// Compile button: preview transpiled code
document.getElementById('compileCodeRunnerButton').addEventListener('click', async () => {
    const viewing = codeRunnerViewingCompiled[currentCodeRunnerTab] || false;
    if (viewing) {
        // Switch back to editing source
        codeRunnerViewingCompiled[currentCodeRunnerTab] = false;
        if (codeRunnerEditor) {
            codeRunnerEditor.setValue(allCodeRunnerContents[currentCodeRunnerTab] || '');
        }
        updateCodeRunnerModeUI();
    } else {
        // Compile to LispE and show result
        saveCurrentCodeRunnerToMemory();
        const sourceCode = allCodeRunnerContents[currentCodeRunnerTab] || '';
        if (!sourceCode.trim()) return;

        const loaded = await loadBasicTranspilerFiles();
        if (!loaded) {
            alert('Could not load transpiler files from server.');
            return;
        }

        const mode = codeRunnerModes[currentCodeRunnerTab] || 'basic';
        const compiled = mode === 'python' ? compilePythonToLispE(sourceCode) : compileBasicToLispE(sourceCode);
        if (compiled !== null) {
            codeRunnerCompiledCache[currentCodeRunnerTab] = compiled;
            codeRunnerViewingCompiled[currentCodeRunnerTab] = true;
            if (codeRunnerEditor) {
                codeRunnerEditor.setValue(compiled);
            }
            updateCodeRunnerModeUI();
        }
    }
});

// Run button: execute the current code runner tab
document.getElementById('runCodeRunnerButton').addEventListener('click', async () => {
    saveCurrentCodeRunnerToMemory();
    const code = allCodeRunnerContents[currentCodeRunnerTab] || '';
    if (!code.trim()) {
        showModal('No code to run.', false);
        return;
    }

    const mode = codeRunnerModes[currentCodeRunnerTab] || 'lispe';
    let codeToRun = code;

    // If Basic or Python mode, compile first
    if (mode === 'basic' || mode === 'python') {
        if (!basicTranspilerLoaded) {
            const loaded = await loadBasicTranspilerFiles();
            if (!loaded) {
                const inputDiv = document.createElement('div');
                inputDiv.className = 'console-line-error';
                inputDiv.textContent = 'Failed to load BasAIc transpiler files.';
                consoleOutput.appendChild(inputDiv);
                consoleOutput.scrollTop = consoleOutput.scrollHeight;
                return;
            }
        }
        const compiled = mode === 'basic' ? compileBasicToLispE(code) : compilePythonToLispE(code);
        if (!compiled || compiled.startsWith('Error:')) {
            const errDiv = document.createElement('div');
            errDiv.className = 'console-line-error';
            errDiv.textContent = 'Compilation error: ' + (compiled || 'unknown');
            consoleOutput.appendChild(errDiv);
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
            return;
        }
        codeToRun = compiled;
    }

    // Execute the code (mirror print/printErr to console during execution)
    mirrorPrintToConsole = true;
    const result = run_code(codeToRun);
    mirrorPrintToConsole = false;
    if (result === false) {
        const errDiv = document.createElement('div');
        errDiv.className = 'console-line-error';
        errDiv.textContent = result;
        consoleOutput.appendChild(errDiv);
    } else if (result !== undefined && result !== null && result !== '') {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'console-line-result';
        resultDiv.textContent = result;
        consoleOutput.appendChild(resultDiv);
    }
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
});

// =============================================
// Method suggestions for BasAIc / Pythonic editors
// Triggered when the user types a '.' after a variable name
// =============================================
const dotMethodSuggestions = [
    // --- Container methods (lists, strings, dictionaries) ---
    { text: 'push', displayText: 'push(e) — append element to list' },
    { text: 'append', displayText: 'append(e) — append element to list' },
    { text: 'pushfirst', displayText: 'pushfirst(e) — insert at beginning' },
    { text: 'pushlast', displayText: 'pushlast(e) — append at end' },
    { text: 'pushtrue', displayText: 'pushtrue(e) — append if not nil' },
    { text: 'pop', displayText: 'pop(idx) — remove element at index' },
    { text: 'popfirst', displayText: 'popfirst() — remove first element' },
    { text: 'poplast', displayText: 'poplast() — remove last element' },
    { text: 'insert', displayText: 'insert(e, idx) — insert element at position' },
    { text: 'find', displayText: 'find(val, pos) — find position of value' },
    { text: 'findall', displayText: 'findall(val, pos) — find all positions' },
    { text: 'count', displayText: 'count(val, pos) — count occurrences' },
    { text: 'in', displayText: 'in(val) — check if value is present' },
    { text: 'size', displayText: 'size() — return size' },
    { text: 'last', displayText: 'last() — return last element' },
    { text: 'car', displayText: 'car() — return first element' },
    { text: 'cdr', displayText: 'cdr() — return list after first element' },
    { text: 'cadr', displayText: 'cadr() — second element (car of cdr)' },
    { text: 'sort', displayText: 'sort(comp) — sort with comparator' },
    { text: 'reverse', displayText: 'reverse(copy) — reverse in place or copy' },
    { text: 'unique', displayText: 'unique() — remove duplicates' },
    { text: 'flatten', displayText: 'flatten() — flatten nested structure' },
    { text: 'join', displayText: 'join(sep) — join elements with separator' },
    { text: 'clone', displayText: 'clone() — deep copy' },
    { text: 'rotate', displayText: 'rotate(nb, line) — rotate elements' },
    { text: 'swap', displayText: 'swap(p1, p2) — swap elements at positions' },
    { text: 'shift', displayText: 'shift(op, nb) — apply op to shifted list' },
    { text: 'slice', displayText: 'slice(sz) — split into slices of size sz' },
    { text: 'takenb', displayText: 'takenb(nb, beg) — take nb elements' },
    { text: 'over', displayText: 'over(func) — apply func and replace values' },
    { text: 'extend', displayText: 'extend(lst) — extend with another list' },
    { text: 'nconc', displayText: 'nconc(lst) — concatenate lists in place' },
    { text: 'nconcn', displayText: 'nconcn(lst) — concatenate into new list' },
    { text: 'cons', displayText: 'cons(e) — merge element into list' },
    { text: 'consb', displayText: 'consb(e) — reverse cons (append at end)' },
    { text: 'extract', displayText: 'extract(i1, i2) — extract sub-list/string' },
    { text: 'at', displayText: 'at(k1, k2...) — access by key(s)' },
    { text: 'replaceall', displayText: 'replaceall(search, rep) — replace all occurrences' },
    { text: 'filterlist', displayText: 'filterlist(cond) — filter elements by condition' },
    { text: 'maplist', displayText: 'maplist(func) — apply function to each element' },
    { text: 'mapcar', displayText: 'mapcar(func) — map function, return list' },
    { text: 'droplist', displayText: 'droplist(cond) — drop until condition met' },
    { text: 'takelist', displayText: 'takelist(cond) — take while condition' },
    { text: 'scanlist', displayText: 'scanlist(func) — scan and return first non-nil' },
    { text: 'mask@', displayText: 'mask@(bool_list, if_true, if_false) — conditional mask' },
    { text: 'tally', displayText: 'tally() — number of elements in matrix/tensor' },
    // --- Conversion methods ---
    { text: 'type', displayText: 'type() — return the type' },
    { text: 'string', displayText: 'string() — convert to string' },
    { text: 'stringf', displayText: 'stringf(format) — format number as string' },
    { text: 'stringbyte', displayText: 'stringbyte() — convert to byte string' },
    { text: 'integer', displayText: 'integer() — convert to integer' },
    { text: 'float', displayText: 'float() — convert to float' },
    { text: 'number', displayText: 'number() — convert to number' },
    { text: 'short', displayText: 'short() — convert to short' },
    { text: 'integers', displayText: 'integers() — convert to list of integers' },
    { text: 'numbers', displayText: 'numbers() — convert to list of numbers' },
    { text: 'floats', displayText: 'floats() — convert to list of floats' },
    { text: 'strings', displayText: 'strings() — convert to list of strings' },
    { text: 'shorts', displayText: 'shorts() — convert to list of shorts' },
    { text: 'to_list', displayText: 'to_list() — convert to a regular list' },
    { text: 'to_llist', displayText: 'to_llist() — convert to a linked list' },
    { text: 'to_tensor', displayText: 'to_tensor() — convert to tensor/matrix' },
    { text: 'bytes', displayText: 'bytes() — return string as list of shorts' },
    // --- String methods ---
    { text: 'trim', displayText: 'trim() — remove whitespace' },
    { text: 'trimleft', displayText: 'trimleft() — remove left whitespace' },
    { text: 'trimright', displayText: 'trimright() — remove right whitespace' },
    { text: 'trim0', displayText: 'trim0() — remove trailing zeros' },
    { text: 'lower', displayText: 'lower() — convert to lowercase' },
    { text: 'upper', displayText: 'upper() — convert to uppercase' },
    { text: 'deaccentuate', displayText: 'deaccentuate() — remove accents' },
    { text: 'replace', displayText: 'replace(fnd, rep, idx) — replace substrings' },
    { text: 'split', displayText: 'split(sep) — split string by separator' },
    { text: 'splite', displayText: 'splite(sep) — split keeping empty strings' },
    { text: 'segment', displayText: 'segment(point) — tokenize string' },
    { text: 'segment_e', displayText: 'segment_e(point) — tokenize keeping blanks' },
    { text: 'left', displayText: 'left(nb) — return n left characters' },
    { text: 'right', displayText: 'right(nb) — return n right characters' },
    { text: 'middle', displayText: 'middle(pos, nb) — return n chars from pos' },
    { text: 'ngrams', displayText: 'ngrams(nb) — build list of n-grams' },
    { text: 'getstruct', displayText: 'getstruct(open, close, pos) — extract balanced structure' },
    { text: 'fill', displayText: 'fill(nb) — repeat string nb times' },
    { text: 'padding', displayText: 'padding(c, nb) — pad string with c up to nb' },
    { text: 'ord', displayText: 'ord() — return Unicode codes' },
    { text: 'format', displayText: 'format(e1, e2...) — format with %1 %2...' },
    { text: 'editdistance', displayText: 'editdistance(str) — compute edit distance' },
    { text: 'startwith', displayText: 'startwith(sub) — check if starts with' },
    { text: 'endwith', displayText: 'endwith(sub) — check if ends with' },
    { text: 'explode', displayText: 'explode() — string to list of atoms' },
    { text: 'convert_in_base', displayText: 'convert_in_base(base, from) — convert base' },
    // --- Predicate methods ---
    { text: 'emptyp', displayText: 'emptyp() — check if empty' },
    { text: 'consp', displayText: 'consp() — check if is a list' },
    { text: 'nullp', displayText: 'nullp() — check if nil' },
    { text: 'numberp', displayText: 'numberp() — check if number' },
    { text: 'stringp', displayText: 'stringp() — check if string' },
    { text: 'atomp', displayText: 'atomp() — check if atom' },
    { text: 'zerop', displayText: 'zerop() — check if zero' },
    { text: 'cyclicp', displayText: 'cyclicp() — check if cyclic list' },
    { text: 'vowelp', displayText: 'vowelp() — check if only vowels' },
    { text: 'consonantp', displayText: 'consonantp() — check if only consonants' },
    { text: 'lowerp', displayText: 'lowerp() — check if all lowercase' },
    { text: 'upperp', displayText: 'upperp() — check if all uppercase' },
    { text: 'alphap', displayText: 'alphap() — check if only alphabetic' },
    { text: 'digitp', displayText: 'digitp() — check if only digits' },
    { text: 'punctuationp', displayText: 'punctuationp() — check if only punctuation' },
    // --- Dictionary methods ---
    { text: 'keys@', displayText: 'keys@() — return dictionary keys' },
    { text: 'values@', displayText: 'values@() — return dictionary values' },
    { text: 'containerkeys', displayText: 'containerkeys() — return container keys' },
    { text: 'containervalues', displayText: 'containervalues() — return container values' },
    // --- Math methods (applicable to numeric values) ---
    { text: 'abs', displayText: 'abs() — absolute value' },
    { text: 'fabs', displayText: 'fabs() — float absolute value' },
    { text: 'iabs', displayText: 'iabs() — integer absolute value' },
    { text: 'acos', displayText: 'acos() — arc cosine' },
    { text: 'acosh', displayText: 'acosh() — hyperbolic arc cosine' },
    { text: 'asin', displayText: 'asin() — arc sine' },
    { text: 'asinh', displayText: 'asinh() — hyperbolic arc sine' },
    { text: 'atan', displayText: 'atan() — arc tangent' },
    { text: 'atanh', displayText: 'atanh() — hyperbolic arc tangent' },
    { text: 'cbrt', displayText: 'cbrt() — cubic root' },
    { text: 'cos', displayText: 'cos() — cosine' },
    { text: 'cosh', displayText: 'cosh() — hyperbolic cosine' },
    { text: 'exp', displayText: 'exp() — e to the power' },
    { text: 'exp2', displayText: 'exp2() — 2 to the power' },
    { text: 'floor', displayText: 'floor() — nearest lower integer' },
    { text: 'log', displayText: 'log() — natural logarithm' },
    { text: 'log10', displayText: 'log10() — decimal logarithm' },
    { text: 'log2', displayText: 'log2() — binary logarithm' },
    { text: 'round', displayText: 'round() — round to nearest integer' },
    { text: 'sin', displayText: 'sin() — sine' },
    { text: 'sinh', displayText: 'sinh() — hyperbolic sine' },
    { text: 'sqrt', displayText: 'sqrt() — square root' },
    { text: 'tan', displayText: 'tan() — tangent' },
    { text: 'tanh', displayText: 'tanh() — hyperbolic tangent' },
    { text: 'trunc', displayText: 'trunc() — truncate to integer' },
    { text: 'sign', displayText: 'sign() — change sign' },
    { text: 'signp', displayText: 'signp() — return -1, 0, or 1' },
    { text: 'radian', displayText: 'radian() — degrees to radians' },
    { text: 'degree', displayText: 'degree() — radians to degrees' },
    { text: 'gcd', displayText: 'gcd(v) — greatest common divisor' },
    { text: 'hcf', displayText: 'hcf(v) — highest common factor' },
    { text: 'cosine', displayText: 'cosine(v) — cosine similarity' },
    // --- Min/Max ---
    { text: 'min', displayText: 'min() — minimum value' },
    { text: 'max', displayText: 'max() — maximum value' },
    { text: 'minmax', displayText: 'minmax() — return (min, max)' },
    // --- Output ---
    { text: 'print', displayText: 'print() — display value' },
    { text: 'println', displayText: 'println() — display with newline' },
    { text: 'prettify', displayText: 'prettify(mx) — pretty-print structure' },
    // --- JSON ---
    { text: 'json', displayText: 'json() — convert to JSON string' },
    { text: 'json_parse', displayText: 'json_parse() — parse JSON string' },
    // --- Regex ---
    { text: 'rgx_find', displayText: 'rgx_find(exp, pos) — regex find' },
    { text: 'rgx_findall', displayText: 'rgx_findall(exp, pos) — regex find all' },
    { text: 'rgx_match', displayText: 'rgx_match(exp) — regex match' },
    { text: 'rgx_replace', displayText: 'rgx_replace(exp, rep) — regex replace' },
    { text: 'rgx_split', displayText: 'rgx_split(exp) — regex split' },
    { text: 'prgx_find', displayText: 'prgx_find(exp, pos) — posix regex find' },
    { text: 'prgx_findall', displayText: 'prgx_findall(exp, pos) — posix regex find all' },
    { text: 'prgx_match', displayText: 'prgx_match(exp) — posix regex match' },
    { text: 'prgx_replace', displayText: 'prgx_replace(exp, rep) — posix regex replace' },
    { text: 'prgx_split', displayText: 'prgx_split(exp) — posix regex split' },
    // --- Misc ---
    { text: 'eval', displayText: 'eval() — evaluate as expression' },
    { text: 'mark', displayText: 'mark(bool) — mark list for cycle detection' },
    { text: 'resetmark', displayText: 'resetmark() — reset list marks' },
    { text: 'flip', displayText: 'flip() — flip two first arguments / reverse dict' },
    { text: 'enum', displayText: 'enum(start) — associate elements with index' },
    { text: 'shuffle', displayText: 'shuffle() — randomly mix elements' },
    { text: 'real', displayText: 'real() — real part of complex' },
    { text: 'imaginary', displayText: 'imaginary() — imaginary part of complex' },
    { text: 'set@', displayText: 'set@(k1, k2..., val) — set value at keys' },
    { text: 'set@@', displayText: 'set@@(beg, end, val) — replace range' },
    { text: 'name', displayText: 'name() — return element name' },
    // --- Local Functions ---
    { text: 'setUserData', displayText: 'setUserData() — dispatch a list of values across User Data' },
    { text: 'callchat', displayText: 'callchat(endpoint, (d1), (d2), (d3)) — callchat is called on a prompt' },
    { text: 'callchatsilent', displayText: 'callchatsilent(endpoint, (d1), (d2), (d3)) — callchatsilent is called on a prompt in silent mode' },
    { text: 'calltool', displayText: 'calltool(arguments, endpoint, (d1), (d2), (d3)) — calltool is called with a tool name string' },
    { text: 'call_mcp', displayText: 'call_mcp(tool, arguments, endpoint, (d1), (d2), (d3)) — call_mcp is called with a server name string' },
];

// Hint function: provide method suggestions after a dot
function dotMethodHint(editor) {
    const cur = editor.getCursor();
    const line = editor.getLine(cur.line);
    // Find the dot position — search backward from cursor
    let dotPos = cur.ch - 1;
    while (dotPos >= 0 && line[dotPos] !== '.') dotPos--;
    if (dotPos < 0) return null;

    // Extract partial method name typed after the dot
    const partial = line.substring(dotPos + 1, cur.ch).toLowerCase();

    // Filter suggestions based on what's been typed
    const filtered = dotMethodSuggestions.filter(s =>
        s.text.toLowerCase().startsWith(partial)
    );
    if (filtered.length === 0) return null;

    return {
        list: filtered,
        from: CodeMirror.Pos(cur.line, dotPos + 1),
        to: CodeMirror.Pos(cur.line, cur.ch)
    };
}

// Unified autocomplete handler with debouncing for CodeMirror editors.
// Combines dot-method hints (basic/python) and function-name hints (3+ chars)
// into a single handler to avoid conflicts from dual handlers.
function attachSmartAutocomplete(editor, opts) {
    let hintTimeout = null;
    editor.on('inputRead', function(cm, change) {
        if (change.origin !== '+input') return;
        if (opts.isViewingCompiled && opts.isViewingCompiled()) return;
        if (hintTimeout) clearTimeout(hintTimeout);
        hintTimeout = setTimeout(function() {
            const cur = cm.getCursor();
            const line = cm.getLine(cur.line);
            // Check dot context for basic/python mode
            const mode = opts.getMode ? opts.getMode() : 'lispe';
            if (mode === 'basic' || mode === 'python') {
                // Walk back from cursor: if current word is preceded by a dot, use dot hints
                let pos = cur.ch - 1;
                while (pos >= 0 && /\w/.test(line[pos])) pos--;
                if (pos >= 0 && line[pos] === '.') {
                    cm.showHint({ hint: dotMethodHint, completeSingle: false });
                    return;
                }
            }
            // Function name autocomplete (3+ chars)
            let start = cur.ch;
            while (start > 0 && /\w/.test(line[start - 1])) start--;
            const wordLen = cur.ch - start;
            if (wordLen >= 3) {
                cm.showHint({ hint: initFunctionHint, completeSingle: false });
            }
        }, 150);
    });
}

// Attach unified autocomplete to both editors
attachSmartAutocomplete(agentsEditor, {
    getMode: () => agentModes[currentAgentTab] || 'lispe',
    isViewingCompiled: () => agentViewingCompiled[currentAgentTab]
});
attachSmartAutocomplete(codeRunnerEditor, {
    getMode: () => codeRunnerModes[currentCodeRunnerTab] || 'lispe',
    isViewingCompiled: () => codeRunnerViewingCompiled[currentCodeRunnerTab]
});

// Reset all code runner tabs to initial state (5 empty tabs)
function resetCodeRunnerTabs() {
    codeRunnerTabsBar.querySelectorAll('.coderunner-tab-btn').forEach(btn => btn.remove());
    Object.keys(allCodeRunnerContents).forEach(k => delete allCodeRunnerContents[k]);
    Object.keys(codeRunnerModes).forEach(k => delete codeRunnerModes[k]);
    Object.keys(codeRunnerCompiledCache).forEach(k => delete codeRunnerCompiledCache[k]);
    Object.keys(codeRunnerViewingCompiled).forEach(k => delete codeRunnerViewingCompiled[k]);
    codeRunnerTabNames.length = 0;
    codeRunnerCounter = 4;
    codeRunnerDeletedTabsStack.length = 0;
    updateUndoCodeRunnerButton();
    const defaultNames = ['Code 0', 'Code 1', 'Code 2', 'Code 3', 'Code 4'];
    defaultNames.forEach(name => {
        codeRunnerTabNames.push(name);
        allCodeRunnerContents[name] = '';
        codeRunnerModes[name] = 'basic';
        codeRunnerViewingCompiled[name] = false;
        const btn = document.createElement('button');
        btn.className = 'coderunner-tab-btn bg-teal-100 text-teal-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.code = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchCodeRunnerTab(name));
        codeRunnerTabsBar.insertBefore(btn, addCodeRunnerTabButton);
    });
    currentCodeRunnerTab = 'Code 0';
    switchCodeRunnerTab('Code 0', true);
}

// Get all code runner contents (for config save/load)
function getAllCodeRunnerContents() {
    saveCurrentCodeRunnerToMemory();
    return JSON.parse(JSON.stringify(allCodeRunnerContents));
}

// Get all code runner modes (for config save/load)
function getAllCodeRunnerModes() {
    return JSON.parse(JSON.stringify(codeRunnerModes));
}

// Load file into current code runner tab
const loadCodeRunnerFileButton = document.getElementById('loadCodeRunnerFileButton');
const codeRunnerFileInput = document.getElementById('codeRunnerFileInput');
const clearCodeRunnerButton = document.getElementById('clearCodeRunnerButton');

loadCodeRunnerFileButton.addEventListener('click', () => {
    codeRunnerFileInput.click();
});
codeRunnerFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        if (codeRunnerEditor) {
            codeRunnerEditor.setValue(e.target.result);
            saveCurrentCodeRunnerToMemory();
            markSessionModified();
        }
    };
    reader.readAsText(file);
    codeRunnerFileInput.value = '';
});

// Clear/delete current code runner tab
clearCodeRunnerButton.addEventListener('click', () => {
    const tabCount = codeRunnerTabNames.length;
    if (tabCount > 5) {
        saveCurrentCodeRunnerToMemory();
        const deletedName = currentCodeRunnerTab;
        const deletedContent = allCodeRunnerContents[deletedName] || '';
        const deletedMode = codeRunnerModes[deletedName] || 'basic';
        const deletedIndex = codeRunnerTabNames.indexOf(deletedName);
        codeRunnerDeletedTabsStack.push({ content: deletedContent, mode: deletedMode, index: deletedIndex });
        updateUndoCodeRunnerButton();

        codeRunnerTabNames.splice(deletedIndex, 1);
        delete allCodeRunnerContents[deletedName];
        delete codeRunnerModes[deletedName];
        delete codeRunnerCompiledCache[deletedName];
        delete codeRunnerViewingCompiled[deletedName];

        renumberCodeRunnerTabs();

        const newIndex = Math.min(deletedIndex, codeRunnerTabNames.length - 1);
        switchCodeRunnerTab(codeRunnerTabNames[newIndex]);
    } else {
        saveCurrentCodeRunnerToMemory();
        const clearedContent = allCodeRunnerContents[currentCodeRunnerTab] || '';
        if (clearedContent) {
            const clearedMode = codeRunnerModes[currentCodeRunnerTab] || 'basic';
            codeRunnerDeletedTabsStack.push({ content: clearedContent, mode: clearedMode, index: codeRunnerTabNames.indexOf(currentCodeRunnerTab), cleared: true, tabName: currentCodeRunnerTab });
            updateUndoCodeRunnerButton();
        }
        if (codeRunnerEditor) {
            codeRunnerEditor.setValue('');
            saveCurrentCodeRunnerToMemory();
        }
        // Move to previous tab (unless on tab 0)
        const idx = codeRunnerTabNames.indexOf(currentCodeRunnerTab);
        if (idx > 0) {
            switchCodeRunnerTab(codeRunnerTabNames[idx - 1]);
        }
    }
});

// Undo last deleted Code Runner tab
undoCodeRunnerTabButton.addEventListener('click', () => {
    if (codeRunnerDeletedTabsStack.length === 0) return;
    const restored = codeRunnerDeletedTabsStack.pop();
    updateUndoCodeRunnerButton();

    if (restored.cleared) {
        const tabName = restored.tabName;
        allCodeRunnerContents[tabName] = restored.content;
        codeRunnerModes[tabName] = restored.mode || 'basic';
        // Update CodeMirror if we're on the same tab so saveCurrentToMemory won't overwrite
        if (currentCodeRunnerTab === tabName && codeRunnerEditor) {
            codeRunnerEditor.setValue(restored.content);
        }
        switchCodeRunnerTab(tabName);
    } else {
        const insertIndex = Math.min(restored.index, codeRunnerTabNames.length);
        const tempName = `Code __tmp_${Date.now()}`;
        codeRunnerTabNames.splice(insertIndex, 0, tempName);
        allCodeRunnerContents[tempName] = restored.content;
        codeRunnerModes[tempName] = restored.mode;
        codeRunnerViewingCompiled[tempName] = false;

        renumberCodeRunnerTabs();

        switchCodeRunnerTab(codeRunnerTabNames[insertIndex]);
    }
});

// Copy current code runner tab to clipboard
document.getElementById('copyCodeRunnerButton').addEventListener('click', () => {
    if (codeRunnerEditor) {
        const text = codeRunnerEditor.getValue();
        navigator.clipboard.writeText(text).then(() => {
            showModal('Code copied to clipboard.', true);
        }).catch(err => {
            console.error('Copy failed:', err);
            showModal('Copy failed.', false);
        });
    }
});

// Undo/Redo in Code Runner editor
document.getElementById('undoCodeRunnerButton').addEventListener('click', () => {
    if (codeRunnerEditor) codeRunnerEditor.undo();
});
document.getElementById('redoCodeRunnerButton').addEventListener('click', () => {
    if (codeRunnerEditor) codeRunnerEditor.redo();
});

// Search/Replace in Code Runner editor (custom bar)
const codeRunnerSearcher = createCodeMirrorSearcher({
    barId: 'codeRunnerSearchBar',
    inputId: 'codeRunnerSearchInput',
    countId: 'codeRunnerSearchCount',
    prevId: 'codeRunnerSearchPrev',
    nextId: 'codeRunnerSearchNext',
    closeId: 'codeRunnerSearchClose',
    toggleBtnId: 'searchCodeRunnerButton',
    replaceRowId: 'codeRunnerReplaceRow',
    replaceInputId: 'codeRunnerReplaceInput',
    replaceBtnId: 'codeRunnerReplaceBtn',
    replaceAllBtnId: 'codeRunnerReplaceAllBtn',
    toggleReplaceBtnId: 'codeRunnerToggleReplaceBtn',
    getEditor: () => codeRunnerEditor
});

// Save button in Code Runner panel
document.getElementById('saveCodeRunnerSessionButton').addEventListener('click', () => {
    if (currentSessionName) {
        saveCurrentCodeRunnerToMemory();
        saveSessionConfirmed(currentSessionName);
    } else {
        promptForSessionName();
    }
});

// NEW: Function to initialize all settings panel components
async function initializeSettingsPanel() {
    // Wait for backend session to be ready
    if (window._sessionReady) await window._sessionReady;

    // Force render chat history to clear any browser-cached DOM (bfcache)
    renderChatHistory();
    
    // Clear ALL localStorage chat sessions on page load for a clean start
    chatTabNames.forEach(chatTab => {
        // Try all possible server prefixes to clear everything
        ['vllm', 'ollama', 'lmstudio'].forEach(server => {
            localStorage.removeItem(server + `_chat_${chatTab}_current`);
        });
        // Also clear with the current server value
        localStorage.removeItem(llmServerSelect.value + `_chat_${chatTab}_current`);
    });
    
    // Reset allChatPrompts to empty
    chatTabNames.forEach(tab => {
        const emptyPrompts = {};
        systemPromptTabNames.forEach(name => { emptyPrompts[name] = ''; });
        allChatPrompts[tab] = emptyPrompts;
    });

    // Clear confidential and secret fields on page load
    document.getElementById('confidentialInput').value = '';
    document.getElementById('secretInput').value = '';
    
    await getAndSetLlmServer(); // Set the LLM server type first
    // Model list is NOT loaded at startup — let the user trigger it via session load or Set button
    populateSessionSelect(); // Populate session dropdown on load
    await getAndSetMaxTokens(); // Fetch and set initial max_tokens
    await getAndSetHost(); // Fetch and set initial host

    // Restore API Key from per-server localStorage
    const savedApiKey = getApiKeyForServer(llmServerSelect.value);
    apiKeyInput.value = savedApiKey;
    if (savedApiKey) {
        try {
            await fetch(`${API_BASE_URL}/set_key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ api_key: savedApiKey })
            });
        } catch (e) {
            console.error('Error restoring API key:', e);
        }
    }

    // Initialize vLLM params UI
    loadVllmParams();
    updateVllmParamsVisibility();

}

// Load models and set default model when the page loads
document.addEventListener('DOMContentLoaded', initializeSettingsPanel);


