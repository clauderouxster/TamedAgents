// Function to fetch and set initial max_tokens
async function getAndSetMaxTokens() {
    try {
        const response = await fetch(`${API_BASE_URL}/get_max_tokens`);
        const data = await response.json();
        if (data.max_tokens !== undefined) {
            maxTokensInput.value = data.max_tokens;
        }
    } catch (error) {
        console.error('Error fetching max_tokens:', error);
        showModal('Error fetching max tokens from server.', false);
    }
}

// Function to apply max tokens to server
async function applyMaxTokens() {
    const maxTokens = parseInt(maxTokensInput.value, 10);
    if (isNaN(maxTokens) || maxTokens <= 0) {
        showModal('Please enter a valid positive number for Max Tokens.', false);
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/set_max_tokens`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                max_tokens: maxTokens
            })
        });
        const data = await response.json();
        if (data.status !== 'success') {
            showModal('Failed to set Max Tokens.', false);
        }
        else
            saveMaxTokens(maxTokens);
    } catch (error) {
        console.error('Error setting max_tokens:', error);
        showModal('Error connecting to server to set Max Tokens.', false);
    }
}

// Function to fetch and set initial host
async function getAndSetHost() {
    try {
        const response = await fetch(`${API_BASE_URL}/get_host`);
        const data = await response.json();
        if (data.host !== undefined) {
            hostInput.value = data.host;
        }
    } catch (error) {
        console.error('Error fetching host:', error);
        showModal('Error fetching host from server.', false);
    }
}

// Function to apply host to server
async function applyHost() {
    const host = hostInput.value.trim();
    if (!host) {
        showModal('Host URL cannot be empty.', false);
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/set_host`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                host: host
            })
        });
        const data = await response.json();
        if (data.status !== 'success') {
            showModal('Failed to set Host URL.', false);
        }
        else {
            saveHost(host);
            saveHostForServer(llmServerSelect.value, host);
        }
    } catch (error) {
        console.error('Error setting host:', error);
        showModal('Error connecting to server to set Host URL.', false);
    }
}

// Function to apply API Key to server
async function applyApiKey() {
    const apiKey = apiKeyInput.value.trim();
    // API Key can be empty if the user wants to clear it
    try {
        const response = await fetch(`${API_BASE_URL}/set_key`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                api_key: apiKey
            })
        });
        const data = await response.json();
        if (data.status === 'success') {
            // Persist API key per server in localStorage
            saveApiKeyForServer(llmServerSelect.value, apiKey);
            showModal('API Key set successfully!', true);
        } else {
            showModal('Failed to set API Key.', false);
        }
    } catch (error) {
        console.error('Error setting API Key:', error);
        showModal('Error connecting to server to set API Key.', false);
    }
}

// Apply all settings to server
async function applyAllSettings() {
    await applyHost();
    await applyMaxTokens();
    await applyApiKey();
}

// NEW: Event listener for toggling settings visibility
toggleSettingsButton.addEventListener('click', () => {
    const isHidden = settingsContent.classList.contains('hidden');
    if (isHidden) {
        settingsContent.classList.remove('hidden');
        settingsContent.classList.add('block');
        toggleIcon.textContent = '▲'; // Change icon to up arrow
    } else {
        settingsContent.classList.remove('block');
        settingsContent.classList.add('hidden');
        toggleIcon.textContent = '▼'; // Change icon to down arrow
    }
});

// =============================================
// SKILLS SECTION - Tab management & dynamic tabs
// =============================================
const skillTabsBar = document.getElementById('skillTabsBar');
const skillTabsContent = document.getElementById('skillTabsContent');
const addSkillTabButton = document.getElementById('addSkillTabButton');
const loadSkillFileButton = document.getElementById('loadSkillFileButton');
const clearSkillButton = document.getElementById('clearSkillButton');
const skillFileInput = document.getElementById('skillFileInput');


// Track skill tab names and current tab
let skillTabNames = ['Skill 0', 'Skill 1', 'Skill 2', 'Skill 3', 'Skill 4'];
let currentSkillTab = 'Skill 0';
let skillCounter = 4; // For generating unique IDs

// Store skill content per tab
const allSkillContents = {};
skillTabNames.forEach(name => { allSkillContents[name] = ''; });

// Undo stack for deleted Skill tabs
const skillDeletedTabsStack = [];
const undoSkillTabButton = document.getElementById('undoSkillTabButton');

function updateUndoSkillButton() {
    undoSkillTabButton.style.display = skillDeletedTabsStack.length > 0 ? '' : 'none';
}

function clearSkillUndoStack() {
    skillDeletedTabsStack.length = 0;
    updateUndoSkillButton();
}

function renumberSkillTabs() {
    const contents = skillTabNames.map(name => allSkillContents[name] || '');
    const newNames = contents.map((_, i) => `Skill ${i}`);

    skillTabNames.length = 0;
    newNames.forEach(n => skillTabNames.push(n));
    Object.keys(allSkillContents).forEach(k => delete allSkillContents[k]);
    newNames.forEach((name, i) => { allSkillContents[name] = contents[i]; });
    skillCounter = newNames.length - 1;

    skillTabsBar.querySelectorAll('.skill-tab-btn').forEach(btn => btn.remove());
    skillTabsContent.innerHTML = '';

    newNames.forEach((name, i) => {
        const btn = document.createElement('button');
        btn.className = 'skill-tab-btn bg-sky-100 text-sky-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.skill = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchSkillTab(btn.dataset.skill));
        skillTabsBar.insertBefore(btn, addSkillTabButton);

        const ta = document.createElement('textarea');
        ta.className = 'skill-textarea dark-textarea hidden';
        ta.dataset.skill = name;
        ta.placeholder = `${name}...`;
        ta.id = `skillInput${i}`;
        ta.value = contents[i];
        ta.addEventListener('input', () => clearSkillUndoStack());
        skillTabsContent.appendChild(ta);
    });
}

function saveCurrentSkillToMemory() {
    const activeTextarea = skillTabsContent.querySelector(`.skill-textarea:not(.hidden)`);
    if (activeTextarea) {
        allSkillContents[currentSkillTab] = activeTextarea.value;
    }
}

function switchSkillTab(tabName) {
    saveCurrentSkillToMemory();
    // Deactivate all tab buttons
    skillTabsBar.querySelectorAll('.skill-tab-btn').forEach(btn => {
        btn.classList.remove('bg-sky-200', 'font-semibold');
        btn.classList.add('bg-sky-100');
    });
    // Hide all textareas
    skillTabsContent.querySelectorAll('.skill-textarea').forEach(ta => {
        ta.classList.add('hidden');
    });
    // Activate selected tab
    const activeBtn = skillTabsBar.querySelector(`.skill-tab-btn[data-skill="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-sky-100');
        activeBtn.classList.add('bg-sky-200', 'font-semibold');
    }
    const activeTA = skillTabsContent.querySelector(`.skill-textarea[data-skill="${tabName}"]`);
    if (activeTA) {
        activeTA.classList.remove('hidden');
        activeTA.value = allSkillContents[tabName] || '';
    }
    currentSkillTab = tabName;
}

// Attach click listeners to initial skill tabs
skillTabsBar.querySelectorAll('.skill-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSkillTab(btn.dataset.skill));
});

// Add new skill tab
addSkillTabButton.addEventListener('click', () => {
    skillCounter++;
    const newName = `Skill ${skillCounter}`;
    skillTabNames.push(newName);
    allSkillContents[newName] = '';

    // Create tab button
    const newBtn = document.createElement('button');
    newBtn.className = 'skill-tab-btn bg-sky-100 text-sky-900 text-xs px-3 py-1 rounded-t';
    newBtn.dataset.skill = newName;
    newBtn.textContent = newName;
    newBtn.addEventListener('click', () => switchSkillTab(newName));
    // Insert before the "+" button
    skillTabsBar.insertBefore(newBtn, addSkillTabButton);

    // Create textarea
    const newTA = document.createElement('textarea');
    newTA.className = 'skill-textarea dark-textarea hidden';
    newTA.dataset.skill = newName;
    newTA.placeholder = `${newName}...`;
    newTA.id = `skillInput${skillCounter}`;
    skillTabsContent.appendChild(newTA);

    // Switch to the new tab
    switchSkillTab(newName);
});

// Load file into current skill tab
loadSkillFileButton.addEventListener('click', () => {
    skillFileInput.click();
});
skillFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const activeTA = skillTabsContent.querySelector(`.skill-textarea:not(.hidden)`);
            if (activeTA) {
                activeTA.value = e.target.result;
                allSkillContents[currentSkillTab] = e.target.result;
                reinitializeLispEVariables(); // Re-read global variables into LispE
            }
        };
        reader.readAsText(file);
    }
    skillFileInput.value = ''; // Reset
});

// Clear/delete current skill tab
clearSkillButton.addEventListener('click', () => {
    const tabCount = skillTabNames.length;
    if (tabCount > 5) {
        saveCurrentSkillToMemory();
        const deletedName = currentSkillTab;
        const deletedContent = allSkillContents[deletedName] || '';
        const deletedIndex = skillTabNames.indexOf(deletedName);
        skillDeletedTabsStack.push({ content: deletedContent, index: deletedIndex });
        updateUndoSkillButton();

        skillTabNames.splice(deletedIndex, 1);
        delete allSkillContents[deletedName];

        renumberSkillTabs();

        const newIndex = Math.min(deletedIndex, skillTabNames.length - 1);
        switchSkillTab(skillTabNames[newIndex]);
    } else {
        saveCurrentSkillToMemory();
        const clearedContent = allSkillContents[currentSkillTab] || '';
        if (clearedContent) {
            skillDeletedTabsStack.push({ content: clearedContent, index: skillTabNames.indexOf(currentSkillTab), cleared: true, tabName: currentSkillTab });
            updateUndoSkillButton();
        }
        const activeTA = skillTabsContent.querySelector(`.skill-textarea:not(.hidden)`);
        if (activeTA) {
            activeTA.value = '';
            allSkillContents[currentSkillTab] = '';
        }
        // Move to previous tab (unless on tab 0)
        const idx = skillTabNames.indexOf(currentSkillTab);
        if (idx > 0) {
            switchSkillTab(skillTabNames[idx - 1]);
        }
    }
});

// Undo last deleted Skill tab
undoSkillTabButton.addEventListener('click', () => {
    if (skillDeletedTabsStack.length === 0) return;
    const restored = skillDeletedTabsStack.pop();
    updateUndoSkillButton();

    if (restored.cleared) {
        const tabName = restored.tabName;
        allSkillContents[tabName] = restored.content;
        // Update the textarea so saveCurrentToMemory won't overwrite with empty value
        const ta = skillTabsContent.querySelector(`.skill-textarea[data-skill="${tabName}"]`);
        if (ta) ta.value = restored.content;
        switchSkillTab(tabName);
        return;
    }

    const insertIndex = Math.min(restored.index, skillTabNames.length);
    const tempName = `Skill __tmp_${Date.now()}`;
    skillTabNames.splice(insertIndex, 0, tempName);
    allSkillContents[tempName] = restored.content;

    renumberSkillTabs();

    switchSkillTab(skillTabNames[insertIndex]);
});

// Copy current skill tab to clipboard
document.getElementById('copySkillButton').addEventListener('click', () => {
    const activeTA = skillTabsContent.querySelector(`.skill-textarea:not(.hidden)`);
    if (activeTA) {
        const btn = document.getElementById('copySkillButton');
        navigator.clipboard.writeText(activeTA.value).then(() => {
            const orig = btn.innerHTML;
            btn.innerHTML = '\u2713';
            setTimeout(() => { btn.innerHTML = orig; }, 1500);
        });
    }
});

// Get all skill contents (for config save/load)
function getAllSkillContents() {
    saveCurrentSkillToMemory();
    return JSON.parse(JSON.stringify(allSkillContents));
}

// Reset all skill tabs to initial state (5 empty tabs)
function resetSkillTabs() {
    skillTabsBar.querySelectorAll('.skill-tab-btn').forEach(btn => btn.remove());
    skillTabsContent.innerHTML = '';
    Object.keys(allSkillContents).forEach(k => delete allSkillContents[k]);
    skillTabNames.length = 0;
    skillCounter = 4;
    skillDeletedTabsStack.length = 0;
    updateUndoSkillButton();
    const defaultNames = ['Skill 0', 'Skill 1', 'Skill 2', 'Skill 3', 'Skill 4'];
    defaultNames.forEach((name, i) => {
        skillTabNames.push(name);
        allSkillContents[name] = '';
        const btn = document.createElement('button');
        btn.className = 'skill-tab-btn bg-sky-100 text-sky-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.skill = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchSkillTab(name));
        skillTabsBar.insertBefore(btn, addSkillTabButton);

        const ta = document.createElement('textarea');
        ta.className = 'skill-textarea dark-textarea hidden';
        ta.dataset.skill = name;
        ta.placeholder = `${name}...`;
        ta.id = `skillInput${i}`;
        skillTabsContent.appendChild(ta);
    });
    currentSkillTab = 'Skill 0';
    switchSkillTab('Skill 0');
}

// =============================================
// TOOLS SECTION - Tab management & dynamic tabs
// =============================================
const toolTabsBar = document.getElementById('toolTabsBar');
const toolTabsContent = document.getElementById('toolTabsContent');
const addToolTabButton = document.getElementById('addToolTabButton');
const loadToolFileButton = document.getElementById('loadToolFileButton');
const clearToolButton = document.getElementById('clearToolButton');
const toolFileInput = document.getElementById('toolFileInput');


// Track tool tab names and current tab
let toolTabNames = ['Tool 0', 'Tool 1', 'Tool 2', 'Tool 3', 'Tool 4'];
let currentToolTab = 'Tool 0';
let toolCounter = 4;

// Store tool content per tab
const allToolContents = {};
toolTabNames.forEach(name => { allToolContents[name] = ''; });

// Undo stack for deleted Tool tabs
const toolDeletedTabsStack = [];
const undoToolTabButton = document.getElementById('undoToolTabButton');

function updateUndoToolButton() {
    undoToolTabButton.style.display = toolDeletedTabsStack.length > 0 ? '' : 'none';
}

function clearToolUndoStack() {
    toolDeletedTabsStack.length = 0;
    updateUndoToolButton();
}

function renumberToolTabs() {
    const contents = toolTabNames.map(name => allToolContents[name] || '');
    const newNames = contents.map((_, i) => `Tool ${i}`);

    toolTabNames.length = 0;
    newNames.forEach(n => toolTabNames.push(n));
    Object.keys(allToolContents).forEach(k => delete allToolContents[k]);
    newNames.forEach((name, i) => { allToolContents[name] = contents[i]; });
    toolCounter = newNames.length - 1;

    toolTabsBar.querySelectorAll('.tool-tab-btn').forEach(btn => btn.remove());
    toolTabsContent.innerHTML = '';

    newNames.forEach((name, i) => {
        const btn = document.createElement('button');
        btn.className = 'tool-tab-btn bg-cyan-100 text-cyan-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.tool = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchToolTab(btn.dataset.tool));
        toolTabsBar.insertBefore(btn, addToolTabButton);

        const ta = document.createElement('textarea');
        ta.className = 'tool-textarea dark-textarea hidden';
        ta.dataset.tool = name;
        ta.placeholder = `${name}...`;
        ta.id = `toolInput${i}`;
        ta.value = contents[i];
        ta.addEventListener('input', () => clearToolUndoStack());
        toolTabsContent.appendChild(ta);
    });
}

function saveCurrentToolToMemory() {
    const activeTextarea = toolTabsContent.querySelector(`.tool-textarea:not(.hidden)`);
    if (activeTextarea) {
        allToolContents[currentToolTab] = activeTextarea.value;
    }
}

function switchToolTab(tabName) {
    saveCurrentToolToMemory();
    // Deactivate all tab buttons
    toolTabsBar.querySelectorAll('.tool-tab-btn').forEach(btn => {
        btn.classList.remove('bg-cyan-200', 'font-semibold');
        btn.classList.add('bg-cyan-100');
    });
    // Hide all textareas
    toolTabsContent.querySelectorAll('.tool-textarea').forEach(ta => {
        ta.classList.add('hidden');
    });
    // Activate selected tab
    const activeBtn = toolTabsBar.querySelector(`.tool-tab-btn[data-tool="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-cyan-100');
        activeBtn.classList.add('bg-cyan-200', 'font-semibold');
    }
    const activeTA = toolTabsContent.querySelector(`.tool-textarea[data-tool="${tabName}"]`);
    if (activeTA) {
        activeTA.classList.remove('hidden');
        activeTA.value = allToolContents[tabName] || '';
    }
    currentToolTab = tabName;
}

// Attach click listeners to initial tool tabs
toolTabsBar.querySelectorAll('.tool-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchToolTab(btn.dataset.tool));
});

// Add new tool tab
addToolTabButton.addEventListener('click', () => {
    toolCounter++;
    const newName = `Tool ${toolCounter}`;
    toolTabNames.push(newName);
    allToolContents[newName] = '';

    // Create tab button
    const newBtn = document.createElement('button');
    newBtn.className = 'tool-tab-btn bg-cyan-100 text-cyan-900 text-xs px-3 py-1 rounded-t';
    newBtn.dataset.tool = newName;
    newBtn.textContent = newName;
    newBtn.addEventListener('click', () => switchToolTab(newName));
    // Insert before the "+" button
    toolTabsBar.insertBefore(newBtn, addToolTabButton);

    // Create textarea
    const newTA = document.createElement('textarea');
    newTA.className = 'tool-textarea dark-textarea hidden';
    newTA.dataset.tool = newName;
    newTA.placeholder = `${newName}...`;
    newTA.id = `toolInput${toolCounter}`;
    toolTabsContent.appendChild(newTA);

    // Switch to the new tab
    switchToolTab(newName);
});

// Load file into current tool tab
loadToolFileButton.addEventListener('click', () => {
    toolFileInput.click();
});
toolFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const activeTA = toolTabsContent.querySelector(`.tool-textarea:not(.hidden)`);
            if (activeTA) {
                activeTA.value = e.target.result;
                allToolContents[currentToolTab] = e.target.result;
                reinitializeLispEVariables(); // Re-read global variables into LispE
            }
        };
        reader.readAsText(file);
    }
    toolFileInput.value = ''; // Reset
});

// Clear/delete current tool tab
clearToolButton.addEventListener('click', () => {
    const tabCount = toolTabNames.length;
    if (tabCount > 5) {
        saveCurrentToolToMemory();
        const deletedName = currentToolTab;
        const deletedContent = allToolContents[deletedName] || '';
        const deletedIndex = toolTabNames.indexOf(deletedName);
        toolDeletedTabsStack.push({ content: deletedContent, index: deletedIndex });
        updateUndoToolButton();

        toolTabNames.splice(deletedIndex, 1);
        delete allToolContents[deletedName];

        renumberToolTabs();

        const newIndex = Math.min(deletedIndex, toolTabNames.length - 1);
        switchToolTab(toolTabNames[newIndex]);
    } else {
        saveCurrentToolToMemory();
        const clearedContent = allToolContents[currentToolTab] || '';
        if (clearedContent) {
            toolDeletedTabsStack.push({ content: clearedContent, index: toolTabNames.indexOf(currentToolTab), cleared: true, tabName: currentToolTab });
            updateUndoToolButton();
        }
        const activeTA = toolTabsContent.querySelector(`.tool-textarea:not(.hidden)`);
        if (activeTA) {
            activeTA.value = '';
            allToolContents[currentToolTab] = '';
        }
        // Move to previous tab (unless on tab 0)
        const idx = toolTabNames.indexOf(currentToolTab);
        if (idx > 0) {
            switchToolTab(toolTabNames[idx - 1]);
        }
    }
});

// Undo last deleted Tool tab
undoToolTabButton.addEventListener('click', () => {
    if (toolDeletedTabsStack.length === 0) return;
    const restored = toolDeletedTabsStack.pop();
    updateUndoToolButton();

    if (restored.cleared) {
        const tabName = restored.tabName;
        allToolContents[tabName] = restored.content;
        const ta = toolTabsContent.querySelector(`.tool-textarea[data-tool="${tabName}"]`);
        if (ta) ta.value = restored.content;
        switchToolTab(tabName);
        return;
    }

    const insertIndex = Math.min(restored.index, toolTabNames.length);
    const tempName = `Tool __tmp_${Date.now()}`;
    toolTabNames.splice(insertIndex, 0, tempName);
    allToolContents[tempName] = restored.content;

    renumberToolTabs();

    switchToolTab(toolTabNames[insertIndex]);
});

// Copy current tool tab to clipboard
document.getElementById('copyToolButton').addEventListener('click', () => {
    const activeTA = toolTabsContent.querySelector(`.tool-textarea:not(.hidden)`);
    if (activeTA) {
        const btn = document.getElementById('copyToolButton');
        navigator.clipboard.writeText(activeTA.value).then(() => {
            const orig = btn.innerHTML;
            btn.innerHTML = '\u2713';
            setTimeout(() => { btn.innerHTML = orig; }, 1500);
        });
    }
});

// Get all tool contents (for config save/load)
function getAllToolContents() {
    saveCurrentToolToMemory();
    return JSON.parse(JSON.stringify(allToolContents));
}

// Reset all tool tabs to initial state (5 empty tabs)
function resetToolTabs() {
    toolTabsBar.querySelectorAll('.tool-tab-btn').forEach(btn => btn.remove());
    toolTabsContent.innerHTML = '';
    Object.keys(allToolContents).forEach(k => delete allToolContents[k]);
    toolTabNames.length = 0;
    toolCounter = 4;
    toolDeletedTabsStack.length = 0;
    updateUndoToolButton();
    const defaultNames = ['Tool 0', 'Tool 1', 'Tool 2', 'Tool 3', 'Tool 4'];
    defaultNames.forEach((name, i) => {
        toolTabNames.push(name);
        allToolContents[name] = '';
        const btn = document.createElement('button');
        btn.className = 'tool-tab-btn bg-cyan-100 text-cyan-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.tool = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchToolTab(name));
        toolTabsBar.insertBefore(btn, addToolTabButton);

        const ta = document.createElement('textarea');
        ta.className = 'tool-textarea dark-textarea hidden';
        ta.dataset.tool = name;
        ta.placeholder = `${name}...`;
        ta.id = `toolInput${i}`;
        toolTabsContent.appendChild(ta);
    });
    currentToolTab = 'Tool 0';
    switchToolTab('Tool 0');
}

// =============================================
// USER DATA SECTION - Tab management & dynamic tabs
// =============================================
const userDataTabsBar = document.getElementById('userDataTabsBar');
const userDataTabsContent = document.getElementById('userDataTabsContent');
const addUserDataTabButton = document.getElementById('addUserDataTabButton');
const loadUserDataFileButton = document.getElementById('loadUserDataFileButton');
const clearUserDataButton = document.getElementById('clearUserDataButton');
const userDataFileInput = document.getElementById('userDataFileInput');


// Track user data tab names and current tab
let userDataTabNames = ['Data 0', 'Data 1', 'Data 2', 'Data 3', 'Data 4'];
let currentUserDataTab = 'Data 0';
let userDataCounter = 4;

// Store user data content per tab
const allUserDataContents = {};
userDataTabNames.forEach(name => { allUserDataContents[name] = ''; });

// Undo stack for deleted User Data tabs
const userDataDeletedTabsStack = [];
const undoUserDataTabButton = document.getElementById('undoUserDataTabButton');

function updateUndoUserDataButton() {
    undoUserDataTabButton.style.display = userDataDeletedTabsStack.length > 0 ? '' : 'none';
}

function clearUserDataUndoStack() {
    userDataDeletedTabsStack.length = 0;
    updateUndoUserDataButton();
}

// Renumber all User Data tabs sequentially: Data 0, Data 1, ...
// Rebuilds DOM completely to ensure consistency between state and DOM order.
function renumberUserDataTabs() {
    // Collect contents in current order
    const contents = userDataTabNames.map(name => allUserDataContents[name] || '');

    // Build new names
    const newNames = contents.map((_, i) => `Data ${i}`);

    // Update state
    userDataTabNames.length = 0;
    newNames.forEach(n => userDataTabNames.push(n));
    Object.keys(allUserDataContents).forEach(k => delete allUserDataContents[k]);
    newNames.forEach((name, i) => { allUserDataContents[name] = contents[i]; });
    userDataCounter = newNames.length - 1;

    // Rebuild DOM: remove all existing tab buttons and textareas
    userDataTabsBar.querySelectorAll('.userdata-tab-btn').forEach(btn => btn.remove());
    userDataTabsContent.innerHTML = '';

    // Recreate buttons and textareas in correct order
    newNames.forEach((name, i) => {
        // Tab button
        const btn = document.createElement('button');
        btn.className = 'userdata-tab-btn bg-amber-100 text-amber-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.userdata = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchUserDataTab(btn.dataset.userdata));
        userDataTabsBar.insertBefore(btn, addUserDataTabButton);

        // Textarea
        const ta = document.createElement('textarea');
        ta.className = 'userdata-textarea dark-textarea hidden';
        ta.dataset.userdata = name;
        ta.placeholder = `${name}...`;
        ta.id = `userDataInput${i}`;
        ta.value = contents[i];
        ta.addEventListener('input', () => clearUserDataUndoStack());
        userDataTabsContent.appendChild(ta);
    });
}

function saveCurrentUserDataToMemory() {
    const activeTextarea = userDataTabsContent.querySelector(`.userdata-textarea:not(.hidden)`);
    if (activeTextarea) {
        allUserDataContents[currentUserDataTab] = activeTextarea.value;
    }
}

function switchUserDataTab(tabName) {
    saveCurrentUserDataToMemory();
    // Deactivate all tab buttons
    userDataTabsBar.querySelectorAll('.userdata-tab-btn').forEach(btn => {
        btn.classList.remove('bg-amber-200', 'font-semibold');
        btn.classList.add('bg-amber-100');
    });
    // Hide all textareas
    userDataTabsContent.querySelectorAll('.userdata-textarea').forEach(ta => {
        ta.classList.add('hidden');
    });
    // Activate selected tab
    const activeBtn = userDataTabsBar.querySelector(`.userdata-tab-btn[data-userdata="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-amber-100');
        activeBtn.classList.add('bg-amber-200', 'font-semibold');
    }
    const activeTA = userDataTabsContent.querySelector(`.userdata-textarea[data-userdata="${tabName}"]`);
    if (activeTA) {
        activeTA.classList.remove('hidden');
        activeTA.value = allUserDataContents[tabName] || '';
    }
    currentUserDataTab = tabName;
}

// Attach click listeners to initial user data tabs
userDataTabsBar.querySelectorAll('.userdata-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchUserDataTab(btn.dataset.userdata));
});
// Attach input listeners to clear undo stack on edit
userDataTabsContent.querySelectorAll('.userdata-textarea').forEach(ta => {
    ta.addEventListener('input', () => clearUserDataUndoStack());
});

// Add new user data tab
addUserDataTabButton.addEventListener('click', () => {
    userDataCounter++;
    const newName = `Data ${userDataCounter}`;
    userDataTabNames.push(newName);
    allUserDataContents[newName] = '';

    // Create tab button
    const newBtn = document.createElement('button');
    newBtn.className = 'userdata-tab-btn bg-amber-100 text-amber-900 text-xs px-3 py-1 rounded-t';
    newBtn.dataset.userdata = newName;
    newBtn.textContent = newName;
    newBtn.addEventListener('click', () => switchUserDataTab(newBtn.dataset.userdata));
    // Insert before the "+" button
    userDataTabsBar.insertBefore(newBtn, addUserDataTabButton);

    // Create textarea
    const newTA = document.createElement('textarea');
    newTA.className = 'userdata-textarea dark-textarea hidden';
    newTA.dataset.userdata = newName;
    newTA.placeholder = `${newName}...`;
    newTA.id = `userDataInput${userDataCounter}`;
    newTA.addEventListener('input', () => clearUserDataUndoStack());
    userDataTabsContent.appendChild(newTA);

    // Switch to the new tab
    switchUserDataTab(newName);
});

// Load file into current user data tab
loadUserDataFileButton.addEventListener('click', () => {
    userDataFileInput.click();
});
userDataFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const activeTA = userDataTabsContent.querySelector(`.userdata-textarea:not(.hidden)`);
            if (activeTA) {
                activeTA.value = e.target.result;
                allUserDataContents[currentUserDataTab] = e.target.result;
                reinitializeLispEVariables(); // Re-read global variables into LispE
            }
        };
        reader.readAsText(file);
    }
    userDataFileInput.value = ''; // Reset
});

// Clear current user data tab (destroy if >5 tabs, else just clear content)
clearUserDataButton.addEventListener('click', () => {
    const tabCount = userDataTabNames.length;
    if (tabCount > 5) {
        // Save to undo stack before destroying
        saveCurrentUserDataToMemory();
        const deletedName = currentUserDataTab;
        const deletedContent = allUserDataContents[deletedName] || '';
        const deletedIndex = userDataTabNames.indexOf(deletedName);
        userDataDeletedTabsStack.push({ content: deletedContent, index: deletedIndex });
        updateUndoUserDataButton();

        // Remove from state
        userDataTabNames.splice(deletedIndex, 1);
        delete allUserDataContents[deletedName];

        // Rebuild DOM with new numbering
        renumberUserDataTabs();

        // Switch to nearest tab
        const newIndex = Math.min(deletedIndex, userDataTabNames.length - 1);
        switchUserDataTab(userDataTabNames[newIndex]);
    } else {
        // Just clear content
        saveCurrentUserDataToMemory();
        const clearedContent = allUserDataContents[currentUserDataTab] || '';
        if (clearedContent) {
            userDataDeletedTabsStack.push({ content: clearedContent, index: userDataTabNames.indexOf(currentUserDataTab), cleared: true, tabName: currentUserDataTab });
            updateUndoUserDataButton();
        }
        const activeTA = userDataTabsContent.querySelector(`.userdata-textarea:not(.hidden)`);
        if (activeTA) {
            activeTA.value = '';
            allUserDataContents[currentUserDataTab] = '';
        }
        // Move to previous tab (unless on tab 0)
        const idx = userDataTabNames.indexOf(currentUserDataTab);
        if (idx > 0) {
            switchUserDataTab(userDataTabNames[idx - 1]);
        }
    }
});

// Clean All User Data: reset to 5 empty tabs
document.getElementById('cleanAllUserDataButton').addEventListener('click', () => {
    resetUserDataTabs();
    markSessionModified();
});

// Undo last deleted User Data tab
undoUserDataTabButton.addEventListener('click', () => {
    if (userDataDeletedTabsStack.length === 0) return;
    const restored = userDataDeletedTabsStack.pop();
    updateUndoUserDataButton();

    if (restored.cleared) {
        const tabName = restored.tabName;
        allUserDataContents[tabName] = restored.content;
        const ta = userDataTabsContent.querySelector(`.userdata-textarea[data-userdata="${tabName}"]`);
        if (ta) ta.value = restored.content;
        switchUserDataTab(tabName);
        return;
    }

    // Re-insert content at original position (clamped)
    const insertIndex = Math.min(restored.index, userDataTabNames.length);
    const tempName = `Data __tmp_${Date.now()}`;
    userDataTabNames.splice(insertIndex, 0, tempName);
    allUserDataContents[tempName] = restored.content;

    // Rebuild DOM with new numbering
    renumberUserDataTabs();

    // Switch to the restored tab (now at insertIndex)
    switchUserDataTab(userDataTabNames[insertIndex]);
});

// Copy current user data tab to clipboard
document.getElementById('copyUserDataButton').addEventListener('click', () => {
    const activeTA = userDataTabsContent.querySelector(`.userdata-textarea:not(.hidden)`);
    if (activeTA) {
        const btn = document.getElementById('copyUserDataButton');
        navigator.clipboard.writeText(activeTA.value).then(() => {
            const orig = btn.innerHTML;
            btn.innerHTML = '\u2713';
            setTimeout(() => { btn.innerHTML = orig; }, 1500);
        });
    }
});

// Get all user data contents (for config save/load)
function getAllUserDataContents() {
    saveCurrentUserDataToMemory();
    return JSON.parse(JSON.stringify(allUserDataContents));
}

// Reset all user data tabs to initial state (5 empty tabs)
function resetUserDataTabs() {
    userDataTabsBar.querySelectorAll('.userdata-tab-btn').forEach(btn => btn.remove());
    userDataTabsContent.innerHTML = '';
    Object.keys(allUserDataContents).forEach(k => delete allUserDataContents[k]);
    userDataTabNames.length = 0;
    userDataCounter = 4;
    userDataDeletedTabsStack.length = 0;
    updateUndoUserDataButton();
    const defaultNames = ['Data 0', 'Data 1', 'Data 2', 'Data 3', 'Data 4'];
    defaultNames.forEach((name, i) => {
        userDataTabNames.push(name);
        allUserDataContents[name] = '';
        const btn = document.createElement('button');
        btn.className = 'userdata-tab-btn bg-amber-100 text-amber-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.userdata = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchUserDataTab(name));
        userDataTabsBar.insertBefore(btn, addUserDataTabButton);

        const ta = document.createElement('textarea');
        ta.className = 'userdata-textarea dark-textarea hidden';
        ta.dataset.userdata = name;
        ta.placeholder = `${name}...`;
        ta.id = `userDataInput${i}`;
        userDataTabsContent.appendChild(ta);
    });
    currentUserDataTab = 'Data 0';
    switchUserDataTab('Data 0');
}

// Rebuild the User Data zone from a base64-encoded JSON list of values
// Input: base64 string encoding a JSON array of strings
// Each element becomes a Data tab: first -> "Data 1", second -> "Data 2", etc.
function setUserData(base64) {
    const items = JSON.parse(unicodeAtob(base64));
    if (!Array.isArray(items)) return;

    // Clear all existing tab buttons and textareas
    userDataTabsBar.querySelectorAll('.userdata-tab-btn').forEach(btn => btn.remove());
    userDataTabsContent.innerHTML = '';

    // Reset state
    userDataTabNames.length = 0;
    Object.keys(allUserDataContents).forEach(k => delete allUserDataContents[k]);
    userDataCounter = items.length - 1;
    clearUserDataUndoStack();

    // Rebuild from the list
    items.forEach((value, index) => {
        const name = `Data ${index}`;
        userDataTabNames.push(name);
        allUserDataContents[name] = String(value);

        // Create tab button
        const btn = document.createElement('button');
        btn.className = 'userdata-tab-btn bg-amber-100 text-amber-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.userdata = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchUserDataTab(btn.dataset.userdata));
        userDataTabsBar.insertBefore(btn, addUserDataTabButton);

        // Create textarea
        const ta = document.createElement('textarea');
        ta.className = 'userdata-textarea dark-textarea hidden';
        ta.dataset.userdata = name;
        ta.placeholder = `${name}...`;
        ta.id = `userDataInput${index}`;
        ta.value = String(value);
        ta.addEventListener('input', () => clearUserDataUndoStack());
        userDataTabsContent.appendChild(ta);
    });

    // Activate first tab if any items exist
    if (userDataTabNames.length > 0) {
        currentUserDataTab = userDataTabNames[0];
        switchUserDataTab(currentUserDataTab);
    }
}

// Update a single User Data tab by 0-based index
// idx: integer (0 = Data 0, 1 = Data 1, ...)
// base64text: base64-encoded string to set as the tab content
// Returns "ok" on success or an error string
function setUserDataValue(idx, base64text) {
    const tabName = `Data ${idx}`;
    if (!userDataTabNames.includes(tabName)) {
        return `Error: User Data tab '${tabName}' (index ${idx}) does not exist`;
    }
    const text = unicodeAtob(base64text);
    allUserDataContents[tabName] = text;
    // Update the textarea in the DOM
    const ta = userDataTabsContent.querySelector(`textarea[data-userdata="${tabName}"]`);
    if (ta) ta.value = text;
    // If this tab is currently visible, refresh it
    if (currentUserDataTab === tabName && ta) {
        ta.value = text;
    }
    markSessionModified();
    return 'ok';
}

// Add a new User Data tab with the given base64-encoded value
// Returns the tab identifier (e.g. "Data 5")
function pushUserDataValue(base64text) {
    const text = unicodeAtob(base64text);
    userDataCounter++;
    const newName = `Data ${userDataCounter}`;
    userDataTabNames.push(newName);
    allUserDataContents[newName] = text;

    const newBtn = document.createElement('button');
    newBtn.className = 'userdata-tab-btn bg-amber-100 text-amber-900 text-xs px-3 py-1 rounded-t';
    newBtn.dataset.userdata = newName;
    newBtn.textContent = newName;
    newBtn.addEventListener('click', () => switchUserDataTab(newBtn.dataset.userdata));
    userDataTabsBar.insertBefore(newBtn, addUserDataTabButton);

    const newTA = document.createElement('textarea');
    newTA.className = 'userdata-textarea dark-textarea hidden';
    newTA.dataset.userdata = newName;
    newTA.placeholder = `${newName}...`;
    newTA.id = `userDataInput${userDataCounter}`;
    newTA.value = text;
    newTA.addEventListener('input', () => clearUserDataUndoStack());
    userDataTabsContent.appendChild(newTA);

    switchUserDataTab(newName);
    markSessionModified();
    return newName;
}

// Get all user data values as a JSON array (base64-encoded)
function getUserData() {
    saveCurrentUserDataToMemory();
    const values = userDataTabNames.map(name => allUserDataContents[name] || '');
    return unicodeBtoa(JSON.stringify(values));
}

// Get a single user data value by 0-based index (base64-encoded)
function getUserDataValue(idx) {
    saveCurrentUserDataToMemory();
    const tabName = `Data ${idx}`;
    if (!userDataTabNames.includes(tabName)) {
        return unicodeBtoa(`Error: User Data tab '${tabName}' (index ${idx}) does not exist`);
    }
    return unicodeBtoa(allUserDataContents[tabName] || '');
}

// Get the number of User Data tabs
function getUserDataSize() {
    return userDataTabNames.length;
}

// =============================================
// OUTPUT SECTION - Tab management & dynamic tabs
// =============================================
const outputTabsBar = document.getElementById('outputTabsBar');
const outputTabsContent = document.getElementById('outputTabsContent');
const addOutputTabButton = document.getElementById('addOutputTabButton');
const loadOutputFileButton = document.getElementById('loadOutputFileButton');
const clearOutputButton = document.getElementById('clearOutputButton');
const outputFileInput = document.getElementById('outputFileInput');

// Track output tab names and current tab
let outputTabNames = ['Out 0', 'Out 1', 'Out 2', 'Out 3', 'Out 4'];
let currentOutputTab = 'Out 0';
let outputCounter = 4;

// Store output content per tab
const allOutputContents = {};
outputTabNames.forEach(name => { allOutputContents[name] = ''; });

// Undo stack for deleted Output tabs
const outputDeletedTabsStack = [];
const undoOutputTabButton = document.getElementById('undoOutputTabButton');

function updateUndoOutputButton() {
    undoOutputTabButton.style.display = outputDeletedTabsStack.length > 0 ? '' : 'none';
}

function clearOutputUndoStack() {
    outputDeletedTabsStack.length = 0;
    updateUndoOutputButton();
}

// Renumber all Output tabs sequentially: Out 0, Out 1, ...
function renumberOutputTabs() {
    const contents = outputTabNames.map(name => allOutputContents[name] || '');
    const newNames = contents.map((_, i) => `Out ${i}`);

    outputTabNames.length = 0;
    newNames.forEach(n => outputTabNames.push(n));
    Object.keys(allOutputContents).forEach(k => delete allOutputContents[k]);
    newNames.forEach((name, i) => { allOutputContents[name] = contents[i]; });
    outputCounter = newNames.length - 1;

    outputTabsBar.querySelectorAll('.output-tab-btn').forEach(btn => btn.remove());
    outputTabsContent.innerHTML = '';

    newNames.forEach((name, i) => {
        const btn = document.createElement('button');
        btn.className = 'output-tab-btn bg-emerald-100 text-emerald-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.output = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchOutputTab(btn.dataset.output));
        outputTabsBar.insertBefore(btn, addOutputTabButton);

        const ta = document.createElement('textarea');
        ta.className = 'output-textarea dark-textarea hidden';
        ta.dataset.output = name;
        ta.placeholder = `${name}...`;
        ta.id = `outputInput${i}`;
        ta.value = contents[i];
        ta.addEventListener('input', () => clearOutputUndoStack());
        outputTabsContent.appendChild(ta);
    });
}

function saveCurrentOutputToMemory() {
    const activeTextarea = outputTabsContent.querySelector(`.output-textarea:not(.hidden)`);
    if (activeTextarea) {
        allOutputContents[currentOutputTab] = activeTextarea.value;
    }
}

function switchOutputTab(tabName) {
    saveCurrentOutputToMemory();
    outputTabsBar.querySelectorAll('.output-tab-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-200', 'font-semibold');
        btn.classList.add('bg-emerald-100');
    });
    outputTabsContent.querySelectorAll('.output-textarea').forEach(ta => {
        ta.classList.add('hidden');
    });
    const activeBtn = outputTabsBar.querySelector(`.output-tab-btn[data-output="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-emerald-100');
        activeBtn.classList.add('bg-emerald-200', 'font-semibold');
    }
    const activeTA = outputTabsContent.querySelector(`.output-textarea[data-output="${tabName}"]`);
    if (activeTA) {
        activeTA.classList.remove('hidden');
        activeTA.value = allOutputContents[tabName] || '';
    }
    currentOutputTab = tabName;
}

// Attach click listeners to initial output tabs
outputTabsBar.querySelectorAll('.output-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchOutputTab(btn.dataset.output));
});
outputTabsContent.querySelectorAll('.output-textarea').forEach(ta => {
    ta.addEventListener('input', () => clearOutputUndoStack());
});

// Add new output tab
addOutputTabButton.addEventListener('click', () => {
    outputCounter++;
    const newName = `Out ${outputCounter}`;
    outputTabNames.push(newName);
    allOutputContents[newName] = '';

    const newBtn = document.createElement('button');
    newBtn.className = 'output-tab-btn bg-emerald-100 text-emerald-900 text-xs px-3 py-1 rounded-t';
    newBtn.dataset.output = newName;
    newBtn.textContent = newName;
    newBtn.addEventListener('click', () => switchOutputTab(newBtn.dataset.output));
    outputTabsBar.insertBefore(newBtn, addOutputTabButton);

    const newTA = document.createElement('textarea');
    newTA.className = 'output-textarea dark-textarea hidden';
    newTA.dataset.output = newName;
    newTA.placeholder = `${newName}...`;
    newTA.id = `outputInput${outputCounter}`;
    newTA.addEventListener('input', () => clearOutputUndoStack());
    outputTabsContent.appendChild(newTA);

    switchOutputTab(newName);
});

// Load file into current output tab
loadOutputFileButton.addEventListener('click', () => {
    outputFileInput.click();
});
outputFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const activeTA = outputTabsContent.querySelector(`.output-textarea:not(.hidden)`);
            if (activeTA) {
                activeTA.value = e.target.result;
                allOutputContents[currentOutputTab] = e.target.result;
            }
        };
        reader.readAsText(file);
    }
    outputFileInput.value = '';
});

// Clear current output tab (destroy if >5 tabs, else just clear content)
clearOutputButton.addEventListener('click', () => {
    const tabCount = outputTabNames.length;
    if (tabCount > 5) {
        saveCurrentOutputToMemory();
        const deletedName = currentOutputTab;
        const deletedContent = allOutputContents[deletedName] || '';
        const deletedIndex = outputTabNames.indexOf(deletedName);
        outputDeletedTabsStack.push({ content: deletedContent, index: deletedIndex });
        updateUndoOutputButton();

        outputTabNames.splice(deletedIndex, 1);
        delete allOutputContents[deletedName];

        renumberOutputTabs();

        const newIndex = Math.min(deletedIndex, outputTabNames.length - 1);
        switchOutputTab(outputTabNames[newIndex]);
    } else {
        saveCurrentOutputToMemory();
        const clearedContent = allOutputContents[currentOutputTab] || '';
        if (clearedContent) {
            outputDeletedTabsStack.push({ content: clearedContent, index: outputTabNames.indexOf(currentOutputTab), cleared: true, tabName: currentOutputTab });
            updateUndoOutputButton();
        }
        const activeTA = outputTabsContent.querySelector(`.output-textarea:not(.hidden)`);
        if (activeTA) {
            activeTA.value = '';
            allOutputContents[currentOutputTab] = '';
        }
        // Move to previous tab (unless on tab 0)
        const idx = outputTabNames.indexOf(currentOutputTab);
        if (idx > 0) {
            switchOutputTab(outputTabNames[idx - 1]);
        }
    }
});

// Clean All Output: reset to 5 empty tabs
document.getElementById('cleanAllOutputButton').addEventListener('click', () => {
    resetOutputTabs();
    markSessionModified();
});

// Undo last deleted Output tab
undoOutputTabButton.addEventListener('click', () => {
    if (outputDeletedTabsStack.length === 0) return;
    const restored = outputDeletedTabsStack.pop();
    updateUndoOutputButton();

    if (restored.cleared) {
        const tabName = restored.tabName;
        allOutputContents[tabName] = restored.content;
        const ta = outputTabsContent.querySelector(`.output-textarea[data-output="${tabName}"]`);
        if (ta) ta.value = restored.content;
        switchOutputTab(tabName);
        return;
    }

    const insertIndex = Math.min(restored.index, outputTabNames.length);
    const tempName = `out__tmp_${Date.now()}`;
    outputTabNames.splice(insertIndex, 0, tempName);
    allOutputContents[tempName] = restored.content;

    renumberOutputTabs();

    switchOutputTab(outputTabNames[insertIndex]);
});

// Copy current output tab to clipboard
document.getElementById('copyOutputButton').addEventListener('click', () => {
    const activeTA = outputTabsContent.querySelector(`.output-textarea:not(.hidden)`);
    if (activeTA) {
        const btn = document.getElementById('copyOutputButton');
        navigator.clipboard.writeText(activeTA.value).then(() => {
            const orig = btn.innerHTML;
            btn.innerHTML = '\u2713';
            setTimeout(() => { btn.innerHTML = orig; }, 1500);
        });
    }
});

// Get all output contents (for config save/load)
function getAllOutputContents() {
    saveCurrentOutputToMemory();
    return JSON.parse(JSON.stringify(allOutputContents));
}

// Reset all output tabs to initial state (5 empty tabs)
function resetOutputTabs() {
    outputTabsBar.querySelectorAll('.output-tab-btn').forEach(btn => btn.remove());
    outputTabsContent.innerHTML = '';
    Object.keys(allOutputContents).forEach(k => delete allOutputContents[k]);
    outputTabNames.length = 0;
    outputCounter = 4;
    outputDeletedTabsStack.length = 0;
    updateUndoOutputButton();
    const defaultNames = ['Out 0', 'Out 1', 'Out 2', 'Out 3', 'Out 4'];
    defaultNames.forEach((name, i) => {
        outputTabNames.push(name);
        allOutputContents[name] = '';
        const btn = document.createElement('button');
        btn.className = 'output-tab-btn bg-emerald-100 text-emerald-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.output = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchOutputTab(name));
        outputTabsBar.insertBefore(btn, addOutputTabButton);

        const ta = document.createElement('textarea');
        ta.className = 'output-textarea dark-textarea hidden';
        ta.dataset.output = name;
        ta.placeholder = `${name}...`;
        ta.id = `outputInput${i}`;
        outputTabsContent.appendChild(ta);
    });
    currentOutputTab = 'Out 0';
    switchOutputTab('Out 0');
}

// Clear ALL Output tabs so that the next pushOutputDataValue starts at "Out 0".
// This lets the Output zone be used like a list one pushes into from index 0.
function resetOutputData() {
    outputTabsBar.querySelectorAll('.output-tab-btn').forEach(btn => btn.remove());
    outputTabsContent.innerHTML = '';
    Object.keys(allOutputContents).forEach(k => delete allOutputContents[k]);
    outputTabNames.length = 0;
    outputCounter = -1;
    outputDeletedTabsStack.length = 0;
    updateUndoOutputButton();
    currentOutputTab = '';
    markSessionModified();
    return 'ok';
}

// Rebuild the Output zone from a base64-encoded JSON list of values
function setOutputData(base64) {
    const items = JSON.parse(unicodeAtob(base64));
    if (!Array.isArray(items)) return;

    outputTabsBar.querySelectorAll('.output-tab-btn').forEach(btn => btn.remove());
    outputTabsContent.innerHTML = '';

    outputTabNames.length = 0;
    Object.keys(allOutputContents).forEach(k => delete allOutputContents[k]);
    outputCounter = items.length - 1;
    clearOutputUndoStack();

    items.forEach((value, index) => {
        const name = `Out ${index}`;
        outputTabNames.push(name);
        allOutputContents[name] = String(value);

        const btn = document.createElement('button');
        btn.className = 'output-tab-btn bg-emerald-100 text-emerald-900 text-xs px-3 py-1 rounded-t';
        btn.dataset.output = name;
        btn.textContent = name;
        btn.addEventListener('click', () => switchOutputTab(btn.dataset.output));
        outputTabsBar.insertBefore(btn, addOutputTabButton);

        const ta = document.createElement('textarea');
        ta.className = 'output-textarea dark-textarea hidden';
        ta.dataset.output = name;
        ta.placeholder = `${name}...`;
        ta.id = `outputInput${index}`;
        ta.value = String(value);
        ta.addEventListener('input', () => clearOutputUndoStack());
        outputTabsContent.appendChild(ta);
    });

    if (outputTabNames.length > 0) {
        currentOutputTab = outputTabNames[0];
        switchOutputTab(currentOutputTab);
    }
}

// Update a single Output tab by 0-based index
function setOutputDataValue(idx, base64text) {
    const tabName = `Out ${idx}`;
    if (!outputTabNames.includes(tabName)) {
        return `Error: Output tab '${tabName}' (index ${idx}) does not exist`;
    }
    const text = unicodeAtob(base64text);
    allOutputContents[tabName] = text;
    const ta = outputTabsContent.querySelector(`textarea[data-output="${tabName}"]`);
    if (ta) ta.value = text;
    if (currentOutputTab === tabName && ta) {
        ta.value = text;
    }
    markSessionModified();
    return 'ok';
}

// Add a new Output tab with the given base64-encoded value
// Returns the tab identifier (e.g. "Out 5")
function pushOutputDataValue(base64text) {
    const text = unicodeAtob(base64text);
    outputCounter++;
    const newName = `Out ${outputCounter}`;
    outputTabNames.push(newName);
    allOutputContents[newName] = text;

    const newBtn = document.createElement('button');
    newBtn.className = 'output-tab-btn bg-emerald-100 text-emerald-900 text-xs px-3 py-1 rounded-t';
    newBtn.dataset.output = newName;
    newBtn.textContent = newName;
    newBtn.addEventListener('click', () => switchOutputTab(newBtn.dataset.output));
    outputTabsBar.insertBefore(newBtn, addOutputTabButton);

    const newTA = document.createElement('textarea');
    newTA.className = 'output-textarea dark-textarea hidden';
    newTA.dataset.output = newName;
    newTA.placeholder = `${newName}...`;
    newTA.id = `outputInput${outputCounter}`;
    newTA.value = text;
    newTA.addEventListener('input', () => clearOutputUndoStack());
    outputTabsContent.appendChild(newTA);

    switchOutputTab(newName);
    markSessionModified();
    return newName;
}

// Get all output values as a JSON array (base64-encoded)
function getOutputData() {
    saveCurrentOutputToMemory();
    const values = outputTabNames.map(name => allOutputContents[name] || '');
    return unicodeBtoa(JSON.stringify(values));
}

// Get a single output value by 0-based index (base64-encoded)
function getOutputDataValue(idx) {
    saveCurrentOutputToMemory();
    const tabName = `Out ${idx}`;
    if (!outputTabNames.includes(tabName)) {
        return unicodeBtoa(`Error: Output tab '${tabName}' (index ${idx}) does not exist`);
    }
    return unicodeBtoa(allOutputContents[tabName] || '');
}

// Get the number of Output tabs
function getOutputSize() {
    return outputTabNames.length;
}

