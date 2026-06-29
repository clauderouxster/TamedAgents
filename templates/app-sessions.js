
// =============================================
// SESSION TREE (hierarchical folder structure)
// =============================================

// Currently selected folder path in the tree (array of folder names, [] = root)
let currentFolderPath = [];

// Undo stack for deleted sessions
const deletedSessionsStack = [];

function updateUndoDeleteSessionButton() {
    const btn = document.getElementById('undoDeleteSessionButton');
    if (btn) btn.style.display = deletedSessionsStack.length > 0 ? '' : 'none';
}

function backupSessionBeforeDelete(sessionName) {
    const sessionPrefix = llmServerSelect.value + '_session_';
    const data = localStorage.getItem(sessionPrefix + sessionName);
    if (!data) return;
    // Find parent path in tree
    const tree = getSessionTree();
    const parentPath = findSessionParentPath(tree, sessionName);
    deletedSessionsStack.push({ name: sessionName, data: data, server: llmServerSelect.value, parentPath: parentPath || [] });
    updateUndoDeleteSessionButton();
}

// Find the folder path containing a session in the tree
function findSessionParentPath(tree, sessionName) {
    function search(node, path) {
        if (!node.children) return null;
        for (const child of node.children) {
            if (child.type === 'session' && child.name === sessionName) return path;
            if (child.type === 'folder') {
                const found = search(child, [...path, child.name]);
                if (found !== null) return found;
            }
        }
        return null;
    }
    return search(tree, []);
}

// Get the session tree from localStorage
function getSessionTree() {
    const key = llmServerSelect.value + '_session_tree';
    try {
        const data = localStorage.getItem(key);
        if (data) return JSON.parse(data);
    } catch (e) {
        console.error('Error reading session tree:', e);
    }
    return { children: [] };
}

// Save the session tree to localStorage
function saveSessionTree(tree) {
    const key = llmServerSelect.value + '_session_tree';
    localStorage.setItem(key, JSON.stringify(tree));
}

// Get all session names that exist in localStorage for the current server
function getAllStoredSessionNames() {
    const sessionPrefix = llmServerSelect.value + '_session_';
    const names = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(sessionPrefix)) {
            const name = key.substring(sessionPrefix.length);
            // Exclude the tree key itself (stored as {server}_session_tree)
            if (name === 'tree') continue;
            names.push(name);
        }
    }
    return names;
}

// Collect all session names referenced in a tree
function collectSessionNamesInTree(node) {
    const names = new Set();
    if (!node || !node.children) return names;
    for (const child of node.children) {
        if (child.type === 'session') {
            names.add(child.name);
        } else if (child.type === 'folder') {
            for (const n of collectSessionNamesInTree(child)) {
                names.add(n);
            }
        }
    }
    return names;
}

// Synchronize tree: add orphan sessions (in localStorage but not in tree) to root
function syncSessionTree() {
    const tree = getSessionTree();
    const inTree = collectSessionNamesInTree(tree);
    const stored = getAllStoredSessionNames();
    let modified = false;
    for (const name of stored) {
        if (!inTree.has(name)) {
            tree.children.push({ type: 'session', name: name });
            modified = true;
        }
    }
    // Remove sessions from tree that no longer exist in localStorage
    function prune(node) {
        if (!node.children) return;
        node.children = node.children.filter(child => {
            if (child.type === 'session') {
                return stored.includes(child.name);
            }
            if (child.type === 'folder') {
                prune(child);
                return true; // keep empty folders
            }
            return false;
        });
    }
    prune(tree);
    saveSessionTree(tree);
    return tree;
}

// Find the folder node at a given path (array of folder names)
function getFolderAtPath(tree, path) {
    let node = tree;
    for (const folderName of path) {
        const found = node.children.find(c => c.type === 'folder' && c.name === folderName);
        if (!found) return null;
        node = found;
    }
    return node;
}

// Remove a session from the tree by name (from wherever it is)
function removeSessionFromTree(tree, sessionName) {
    function removeFrom(node) {
        if (!node.children) return false;
        const idx = node.children.findIndex(c => c.type === 'session' && c.name === sessionName);
        if (idx !== -1) {
            node.children.splice(idx, 1);
            return true;
        }
        for (const child of node.children) {
            if (child.type === 'folder' && removeFrom(child)) return true;
        }
        return false;
    }
    removeFrom(tree);
}

// Remove a folder from the tree by path. Returns the removed folder or null.
function removeFolderFromTree(tree, path) {
    if (path.length === 0) return null;
    const parentPath = path.slice(0, -1);
    const folderName = path[path.length - 1];
    const parent = getFolderAtPath(tree, parentPath);
    if (!parent) return null;
    const idx = parent.children.findIndex(c => c.type === 'folder' && c.name === folderName);
    if (idx !== -1) {
        return parent.children.splice(idx, 1)[0];
    }
    return null;
}

// Collect all folder paths in the tree (for move dialog)
function collectFolderPaths(tree, prefix) {
    const paths = [];
    if (!prefix) prefix = [];
    if (tree.children) {
        for (const child of tree.children) {
            if (child.type === 'folder') {
                const p = [...prefix, child.name];
                paths.push(p);
                paths.push(...collectFolderPaths(child, p));
            }
        }
    }
    return paths;
}

// Sort tree children: folders first (alphabetical), then sessions (reverse alphabetical)
function sortTreeChildren(node) {
    if (!node.children) return;
    node.children.sort((a, b) => {
        if (a.type === 'folder' && b.type !== 'folder') return -1;
        if (a.type !== 'folder' && b.type === 'folder') return 1;
        if (a.type === 'folder' && b.type === 'folder') return a.name.localeCompare(b.name);
        // sessions: reverse alphabetical (newest first by default naming)
        return b.name.localeCompare(a.name);
    });
    for (const child of node.children) {
        if (child.type === 'folder') sortTreeChildren(child);
    }
}

// Render the session tree into the #sessionTreeView div
function renderSessionTree() {
    const treeView = document.getElementById('sessionTreeView');
    treeView.innerHTML = '';
    const tree = syncSessionTree();
    sortTreeChildren(tree);
    saveSessionTree(tree);

    // VS Code-style SVG icons
    const svgChevron = '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M5.7 13.7L5 13l4.6-4.6L5 3.7l.7-.7 5.3 5.3-5.3 5.4z"/></svg>';
    const svgFolderOpen = '<svg viewBox="0 0 16 16" fill="none"><path d="M1.5 2h4.7l1 1H14.5v1.5H1.5V2z" fill="#C09553"/><path d="M1 5h14l-1.5 9H2.5L1 5z" fill="#DCB67A"/></svg>';
    const svgFolderClosed = '<svg viewBox="0 0 16 16" fill="none"><path d="M1.5 2h4.7l1 1H14.5v10h-13V2z" fill="#C09553"/><path d="M1.5 4.5h13V13h-13V4.5z" fill="#DCB67A"/></svg>';
    const svgSession = '<svg viewBox="0 0 16 16" fill="none"><path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v7a1.5 1.5 0 01-1.5 1.5H9l-3 2v-2H3.5A1.5 1.5 0 012 10.5v-7z" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="5.5" cy="7" r="0.8" fill="currentColor"/><circle cx="8" cy="7" r="0.8" fill="currentColor"/><circle cx="10.5" cy="7" r="0.8" fill="currentColor"/></svg>';
    const svgRename = '<svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M13.23 1h-1.46L3.52 9.25l-.16.22L1 13.59 2.41 15l4.12-2.36.22-.16L15 4.23V2.77L13.23 1zM2.41 13.59l1.51-3 1.45 1.45-2.96 1.55zm3.83-2.06L4.47 9.76l8-8 1.77 1.77-8 8z"/></svg>';
    const svgDelete = '<svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M10 3h3v1h-1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V4H3V3h3V2a1 1 0 011-1h2a1 1 0 011 1v1zM5 4v9h6V4H5zm2-1V2H7v1h2V2H7v1zm-1 2h1v7H6V5zm3 0h1v7H9V5z"/></svg>';
    const svgExport = '<svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14"><path d="M8 1L4 5h3v5h2V5h3L8 1zM2 12v2h12v-2H2z"/></svg>';

    function createIndentGuides(depth) {
        const indent = document.createElement('span');
        indent.className = 'tree-indent';
        for (let i = 0; i < depth; i++) {
            const guide = document.createElement('span');
            guide.className = 'tree-indent-guide';
            indent.appendChild(guide);
        }
        return indent;
    }

    function renderNode(node, container, path, depth) {
        for (const child of (node.children || [])) {
            if (child.type === 'folder') {
                const folderPath = [...path, child.name];
                const folderDiv = document.createElement('div');
                folderDiv.className = 'tree-folder-group';

                const item = document.createElement('div');
                item.className = 'tree-item folder-item';
                item.dataset.folderPath = JSON.stringify(folderPath);

                // Indent guides
                item.appendChild(createIndentGuides(depth));

                const toggle = document.createElement('span');
                toggle.className = 'tree-toggle' + (child.collapsed ? '' : ' expanded');
                toggle.innerHTML = svgChevron;

                const icon = document.createElement('span');
                icon.className = 'tree-icon';
                icon.innerHTML = child.collapsed ? svgFolderClosed : svgFolderOpen;

                const label = document.createElement('span');
                label.className = 'tree-label';
                label.textContent = child.name;

                // Context buttons (rename, delete folder)
                const ctx = document.createElement('span');
                ctx.className = 'tree-folder-context';
                const renameBtn = document.createElement('button');
                renameBtn.innerHTML = svgRename;
                renameBtn.title = 'Rename folder';
                renameBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    promptRenameFolderAt(folderPath);
                });
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = svgDelete;
                deleteBtn.title = 'Delete folder';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteFolderAt(folderPath);
                });
                ctx.appendChild(renameBtn);
                ctx.appendChild(deleteBtn);

                item.appendChild(toggle);
                item.appendChild(icon);
                item.appendChild(label);
                item.appendChild(ctx);

                // Drop target: accept session drag onto this folder
                item.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    item.classList.add('drag-over');
                });
                item.addEventListener('dragleave', () => {
                    item.classList.remove('drag-over');
                });
                item.addEventListener('drop', (e) => {
                    e.preventDefault();
                    item.classList.remove('drag-over');
                    const sessionName = e.dataTransfer.getData('text/plain');
                    if (!sessionName) return;
                    const t = getSessionTree();
                    removeSessionFromTree(t, sessionName);
                    const targetFolder = getFolderAtPath(t, folderPath);
                    if (targetFolder) {
                        targetFolder.children.push({ type: 'session', name: sessionName });
                        // auto-expand the folder so user sees the result
                        targetFolder.collapsed = false;
                    }
                    sortTreeChildren(t);
                    saveSessionTree(t);
                    currentFolderPath = folderPath;
                    renderSessionTree();
                });

                // Clicking the folder item selects it as current folder and toggles
                item.addEventListener('click', () => {
                    // Toggle collapsed state
                    child.collapsed = !child.collapsed;
                    saveSessionTree(tree);
                    currentFolderPath = folderPath;
                    renderSessionTree();
                });

                // Highlight if this is the current folder
                if (JSON.stringify(currentFolderPath) === JSON.stringify(folderPath)) {
                    item.classList.add('selected');
                }

                folderDiv.appendChild(item);

                const childrenDiv = document.createElement('div');
                childrenDiv.className = 'tree-children' + (child.collapsed ? ' collapsed' : '');
                renderNode(child, childrenDiv, folderPath, depth + 1);
                folderDiv.appendChild(childrenDiv);

                container.appendChild(folderDiv);
            } else if (child.type === 'session') {
                const item = document.createElement('div');
                item.className = 'tree-item';
                item.dataset.sessionName = child.name;
                item.draggable = true;
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', child.name);
                    e.dataTransfer.effectAllowed = 'move';
                    item.classList.add('dragging');
                });
                item.addEventListener('dragend', () => {
                    item.classList.remove('dragging');
                });

                // Indent guides + spacer for missing toggle
                item.appendChild(createIndentGuides(depth));
                const spacer = document.createElement('span');
                spacer.style.width = '16px';
                spacer.style.flexShrink = '0';
                item.appendChild(spacer);

                const icon = document.createElement('span');
                icon.className = 'tree-icon';
                icon.innerHTML = svgSession;
                icon.style.color = 'var(--text-secondary)';

                const label = document.createElement('span');
                label.className = 'tree-label';
                label.textContent = child.name;

                // Context buttons (rename, delete session)
                const ctx = document.createElement('span');
                ctx.className = 'tree-folder-context';
                const renameBtn = document.createElement('button');
                renameBtn.innerHTML = svgRename;
                renameBtn.title = 'Rename session';
                renameBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    promptRenameSession(child.name);
                });
                const exportBtn = document.createElement('button');
                exportBtn.innerHTML = svgExport;
                exportBtn.title = 'Export session as JSON';
                exportBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    exportSessionAsJSON(child.name);
                });
                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = svgDelete;
                deleteBtn.title = 'Delete session';
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteSessionByName(child.name);
                });
                ctx.appendChild(renameBtn);
                ctx.appendChild(exportBtn);
                ctx.appendChild(deleteBtn);

                item.appendChild(icon);
                item.appendChild(label);
                item.appendChild(ctx);

                if (child.name === currentSessionName) {
                    item.classList.add('selected');
                }

                item.addEventListener('click', async () => {
                    currentFolderPath = path; // remember which folder the session is in
                    await loadSession(child.name);
                    updateSaveButtonState();
                    renderSessionTree();
                });

                container.appendChild(item);
            }
        }
    }

    renderNode(tree, treeView, [], 0);

    // Root tree view is also a drop target (move session to root)
    treeView.addEventListener('dragover', (e) => {
        // Only highlight root if the direct target is the treeView itself (not a folder)
        if (e.target === treeView || e.target.closest('.session-tree-view') === treeView && !e.target.closest('.folder-item')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            treeView.classList.add('drag-over');
        }
    });
    treeView.addEventListener('dragleave', (e) => {
        if (!treeView.contains(e.relatedTarget) || e.relatedTarget === null) {
            treeView.classList.remove('drag-over');
        }
    });
    treeView.addEventListener('drop', (e) => {
        treeView.classList.remove('drag-over');
        // Only handle if not already handled by a folder
        if (e.target.closest('.folder-item')) return;
        e.preventDefault();
        const sessionName = e.dataTransfer.getData('text/plain');
        if (!sessionName) return;
        const t = getSessionTree();
        removeSessionFromTree(t, sessionName);
        t.children.push({ type: 'session', name: sessionName });
        sortTreeChildren(t);
        saveSessionTree(t);
        currentFolderPath = [];
        renderSessionTree();
    });
}

// Prompt to create a new folder in the current folder path
function promptCreateFolder() {
    const modal = document.getElementById('folderNameModal');
    const input = document.getElementById('folderNameInput');
    const okBtn = document.getElementById('folderNameOkButton');
    const cancelBtn = document.getElementById('folderNameCancelButton');
    input.value = '';
    modal.classList.remove('hidden');
    setTimeout(() => input.focus(), 100);

    function cleanup() {
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
        input.removeEventListener('keydown', handleKey);
    }
    function handleOk() {
        const name = input.value.trim();
        if (!name) { showModal('Folder name cannot be empty.', false); return; }
        const tree = getSessionTree();
        const parent = getFolderAtPath(tree, currentFolderPath);
        if (!parent) { showModal('Parent folder not found.', false); cleanup(); modal.classList.add('hidden'); return; }
        // Check for duplicate folder name
        if (parent.children.some(c => c.type === 'folder' && c.name === name)) {
            showModal('A folder with this name already exists here.', false); return;
        }
        parent.children.push({ type: 'folder', name: name, collapsed: false, children: [] });
        saveSessionTree(tree);
        renderSessionTree();
        modal.classList.add('hidden');
        cleanup();
    }
    function handleCancel() { modal.classList.add('hidden'); cleanup(); }
    function handleKey(e) { if (e.key === 'Enter') handleOk(); if (e.key === 'Escape') handleCancel(); }
    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    input.addEventListener('keydown', handleKey);
}

// Rename a folder at a given path
function promptRenameFolderAt(folderPath) {
    const modal = document.getElementById('folderNameModal');
    const input = document.getElementById('folderNameInput');
    const okBtn = document.getElementById('folderNameOkButton');
    const cancelBtn = document.getElementById('folderNameCancelButton');
    const oldName = folderPath[folderPath.length - 1];
    input.value = oldName;
    modal.classList.remove('hidden');
    setTimeout(() => { input.focus(); input.select(); }, 100);

    function cleanup() {
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
        input.removeEventListener('keydown', handleKey);
    }
    function handleOk() {
        const newName = input.value.trim();
        if (!newName) { showModal('Folder name cannot be empty.', false); return; }
        if (newName === oldName) { modal.classList.add('hidden'); cleanup(); return; }
        const tree = getSessionTree();
        const parentPath = folderPath.slice(0, -1);
        const parent = getFolderAtPath(tree, parentPath);
        if (!parent) { modal.classList.add('hidden'); cleanup(); return; }
        if (parent.children.some(c => c.type === 'folder' && c.name === newName)) {
            showModal('A folder with this name already exists here.', false); return;
        }
        const folder = parent.children.find(c => c.type === 'folder' && c.name === oldName);
        if (folder) {
            folder.name = newName;
            saveSessionTree(tree);
            // Update currentFolderPath if needed
            if (JSON.stringify(currentFolderPath.slice(0, folderPath.length)) === JSON.stringify(folderPath)) {
                currentFolderPath = [...parentPath, newName, ...currentFolderPath.slice(folderPath.length)];
            }
            renderSessionTree();
        }
        modal.classList.add('hidden');
        cleanup();
    }
    function handleCancel() { modal.classList.add('hidden'); cleanup(); }
    function handleKey(e) { if (e.key === 'Enter') handleOk(); if (e.key === 'Escape') handleCancel(); }
    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    input.addEventListener('keydown', handleKey);
}

// Delete a folder at a given path (moves contents to parent)
function deleteFolderAt(folderPath) {
    const tree = getSessionTree();
    const parentPath = folderPath.slice(0, -1);
    const folderName = folderPath[folderPath.length - 1];
    const parent = getFolderAtPath(tree, parentPath);
    if (!parent) return;
    const idx = parent.children.findIndex(c => c.type === 'folder' && c.name === folderName);
    if (idx === -1) return;
    const folder = parent.children[idx];
    // Move folder's children to parent (before the folder's position)
    parent.children.splice(idx, 1, ...folder.children);
    saveSessionTree(tree);
    // Reset currentFolderPath if it was inside the deleted folder
    if (JSON.stringify(currentFolderPath.slice(0, folderPath.length)) === JSON.stringify(folderPath)) {
        currentFolderPath = parentPath;
    }
    renderSessionTree();
    showModal(`Folder "${folderName}" deleted. Contents moved to parent.`, true);
}

// Show modal to move a session to a different folder
function promptMoveSession() {
    const sessionName = currentSessionName;
    if (!sessionName) {
        showModal('Please select a session to move.', false);
        return;
    }
    const tree = getSessionTree();
    const folders = collectFolderPaths(tree, []);
    // Add root as an option
    const allPaths = [[]].concat(folders);

    const modal = document.getElementById('moveSessionModal');
    document.getElementById('moveSessionName').textContent = sessionName;
    const list = document.getElementById('moveFolderList');
    list.innerHTML = '';

    allPaths.forEach(p => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer text-sm';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'moveFolder';
        radio.value = JSON.stringify(p);
        radio.className = 'focus:ring-blue-400';
        label.appendChild(radio);
        const text = p.length === 0 ? '/ (root)' : '/ ' + p.join(' / ');
        label.appendChild(document.createTextNode(text));
        list.appendChild(label);
    });

    modal.classList.remove('hidden');

    const okBtn = document.getElementById('moveSessionOkButton');
    const cancelBtn = document.getElementById('moveSessionCancelButton');

    function cleanup() {
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
    }
    function handleOk() {
        const selected = list.querySelector('input[name="moveFolder"]:checked');
        if (!selected) { showModal('Please select a destination folder.', false); return; }
        const destPath = JSON.parse(selected.value);
        const tree = getSessionTree();
        removeSessionFromTree(tree, sessionName);
        const dest = getFolderAtPath(tree, destPath);
        if (dest) {
            dest.children.push({ type: 'session', name: sessionName });
            saveSessionTree(tree);
            currentFolderPath = destPath;
            renderSessionTree();
            const destLabel = destPath.length === 0 ? 'root' : destPath.join(' / ');
            showModal(`Session moved to "${destLabel}".`, true);
        }
        modal.classList.add('hidden');
        cleanup();
    }
    function handleCancel() { modal.classList.add('hidden'); cleanup(); }
    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
}

// Replace the old populateSessionSelect with tree rendering
function populateSessionSelect() {
    // Migration: fix double-prefixed session names from older versions
    const sessionPrefix = llmServerSelect.value + '_session_';
    const serverPrefixes = ['vllm_session_', 'ollama_session_', 'lmstudio_session_', 'claude_session_'];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith(sessionPrefix)) {
            let name = key.substring(sessionPrefix.length);
            let migrated = false;
            for (const sp of serverPrefixes) {
                if (name.startsWith(sp)) {
                    const cleanName = name.substring(sp.length);
                    const newKey = sessionPrefix + cleanName;
                    if (!localStorage.getItem(newKey)) {
                        localStorage.setItem(newKey, localStorage.getItem(key));
                    }
                    localStorage.removeItem(key);
                    migrated = true;
                    break;
                }
            }
            if (migrated) { i = -1; continue; }
        }
    }
    renderSessionTree();
}

// Function to update Save button enabled state
function updateSaveButtonState() {
    createSessionButton.disabled = !currentSessionName;
}

// Event listener for New Session button (creates a new session with name prompt)
// ---- Template Session button: sends a session JSON template into the chat ----
document.getElementById('templateSessionButton').addEventListener('click', () => {
    const template = {
        "_description": "This is a session template for the Tamed Agents platform. Fill in each field and load the resulting JSON as a session. Fields marked with // are comments explaining what to put there.",
        "chatHistory": [],
        "systemPrompt": "",
        "principles": [],
        "setup": {
            "host": "http://localhost:11434",
            "maxTokens": 16000
        },
        "allChatPrompts": {
            "Chat 0": {
                "Sys 0": "(Your main system prompt: describe the AI's role, behavior, constraints)",
                "Sys 1": "",
                "Sys 2": "",
                "Sys 3": "",
                "Sys 4": ""
            }
        },
        "chatTabNames": ["Chat 0"],
        "systemPromptTabNames": ["Sys 0", "Sys 1", "Sys 2", "Sys 3", "Sys 4"],
        "currentTab": "Sys 0",
        "currentChatTab": "Chat 0",
        "skills": {
            "Skill 0": "(Describe a skill the agent can use, e.g. a knowledge domain or a specific capability)",
            "Skill 1": "",
            "Skill 2": "",
            "Skill 3": "",
            "Skill 4": ""
        },
        "skillTabNames": ["Skill 0", "Skill 1", "Skill 2", "Skill 3", "Skill 4"],
        "currentSkillTab": "Skill 0",
        "tools": {
            "Tool 0": "(Describe an external tool the agent can call, in natural language or as a function signature)",
            "Tool 1": "",
            "Tool 2": "",
            "Tool 3": "",
            "Tool 4": ""
        },
        "toolTabNames": ["Tool 0", "Tool 1", "Tool 2", "Tool 3", "Tool 4"],
        "currentToolTab": "Tool 0",
        "userData": {
            "Data 0": "(User-specific data the agent can access: preferences, context, reference documents)",
            "Data 1": "",
            "Data 2": "",
            "Data 3": "",
            "Data 4": ""
        },
        "userDataTabNames": ["Data 0", "Data 1", "Data 2", "Data 3", "Data 4"],
        "currentUserDataTab": "Data 0",
        "outputData": {
            "Out 0": "",
            "Out 1": "",
            "Out 2": "",
            "Out 3": "",
            "Out 4": ""
        },
        "outputDataTabNames": ["Out 0", "Out 1", "Out 2", "Out 3", "Out 4"],
        "currentOutputTab": "Out 0",
        "initialization": {
            "lib 0": "(LispE initialization code: macros, utility functions, loaded automatically before agents run. Leave as-is unless you need custom functions.)",
            "lib 1": "",
            "lib 2": "",
            "lib 3": "",
            "lib 4": ""
        },
        "initTabNames": ["lib 0", "lib 1", "lib 2", "lib 3", "lib 4"],
        "currentInitTab": "lib 0",
        "confidential": "(JSON with credentials, accessible via getconfidential() in code, e.g. {\"api_key\": \"xxx\"})",
        "secret": "",
        "apiKey": "",
        "agents": {
            "Agent 0": "functionjs entrypoint(chat)\n   msg = chat[-1,\"content\"]\n   ; Your agent logic here\n   println(msg)\nendfunction\n endfunctionjs",
            "Agent 1": "",
            "Agent 2": "",
            "Agent 3": "",
            "Agent 4": ""
        },
        "agentTabNames": ["Agent 0", "Agent 1", "Agent 2", "Agent 3", "Agent 4"],
        "currentAgentTab": "Agent 0",
        "agentModes": {
            "Agent 0": "basic",
            "Agent 1": "basic",
            "Agent 2": "basic",
            "Agent 3": "basic",
            "Agent 4": "basic"
        },
        "activeConnectors": [],
        "codeRunner": {
            "Code 0": "(Your standalone code here — executed independently via the Run button)",
            "Code 1": "",
            "Code 2": "",
            "Code 3": "",
            "Code 4": ""
        },
        "codeRunnerTabNames": ["Code 0", "Code 1", "Code 2", "Code 3", "Code 4"],
        "currentCodeRunnerTab": "Code 0",
        "codeRunnerModes": {
            "Code 0": "basic",
            "Code 1": "basic",
            "Code 2": "basic",
            "Code 3": "basic",
            "Code 4": "basic"
        },
        "llmParams": {
            "temperature": "",
            "top_p": "",
            "presence_penalty": "",
            "max_tokens": ""
        },
        "extraBody": {},
        "displayContent": "",
        "allChatHistories": {
            "Chat 0": []
        }
    };

    const explanation = `## Session Template

Here is an empty session template in JSON format. You can ask an AI to fill it to generate a complete session.

**Key fields:**
- **allChatPrompts → Sys 0**: Main system prompt defining the AI's role and behavior
- **skills**: Domain knowledge or capabilities described in natural language  
- **tools**: External tools the agent can call (natural language descriptions or function signatures)
- **userData**: Reference data, user preferences, or context documents
- **outputData**: Output data fields accessible via setOutputData/getOutput in code
- **agents → Agent 0**: The agent code in BasAIc (Basic-like language). This is the entry point called by the LLM
- **initialization → lib 0**: LispE utility library loaded before agents (usually keep the default)
- **confidential**: JSON with secret credentials (API keys, tokens)
- **agentModes**: Set to \"basic\" for BasAIc, \"python\" for Python, or \"lispe\" for LispE
- **chatTabNames**: List of chat tab names (e.g. [\"Chat 0\", \"Chat 1\"])
- **llmParams**: LLM generation parameters (temperature, top_p, presence_penalty, max_tokens)
- **extraBody**: Extra parameters to pass in the LLM API request body (JSON object)
- **allChatHistories**: Chat histories per chat tab (e.g. {\"Chat 0\": []})

**BasAIc quick reference:**
\`\`\`
function entrypoint(chat)
   chat = jsjson(chat)           ; decode the chat from JS
   msg = chat[-1,"content"]      ; last user message
   entry(msg)                    ; send to LLM
endfunction

rule process(chat, msg)          ; pattern matching rule
   "keyword" in msg              ; condition
   ; your logic here
endrule
\`\`\`

**Initialization methods reference:**

| Method | Description |
|--------|-------------|
| \`convertjs(chat)\` | Macro: decodes a Base64-encoded JSON string from JavaScript into a LispE structure. |
| \`jsjson(chat)\` | Macro: same as convertjs — parses a Base64-encoded JSON payload from JS. |
| \`jschat(prompts)\` | Macro: wraps prompts into a \`call_chat(...)\` JS call string. |
| \`jschat64(prompts)\` | Macro: encodes prompts as Base64 JSON, then wraps into a \`call_chat(...)\` JS call. |
| \`jschatsilent64(prompts)\` | Macro: like jschat64 but calls \`call_chat_silent\` (no display in chat). |
| \`clean_html(txt)\` | Strips HTML tags from text via the JS \`strip_html\` helper. |
| \`jsonp(d)\` | Encodes data as a Base64 JSON string (containers become JSON, scalars as-is). |
| \`none(r)\` | No-op callback — logs argument to browser console. |
| \`read_input(msg, endpoint)\` | Displays an input dialog with \`msg\` prompt, sends user reply to \`endpoint\` callback. |
| \`save_session()\` | Triggers a session save from JS. |
| \`jsonextract(cmd, str)\` | Finds the beginning of a JSON structure in \`cmd\` after the substring \`str\`, extracts and parses it. |
| \`jsonextractwith(cmd, str)\` | Finds the beginning of a JSON structure in \`cmd\` starting with the substring \`str\`, extracts and parses it. |
| \`loadjs(str)\` | Finds all JSON structures with \`str\`, extracts and parses them. |
| \`Initialize(systems, skills, tools, user_data)\` | Called automatically at startup — stores system prompts, skills, tools and user data into global variables. |
| \`systemprompt()\` | Returns the full system prompt string (all prompts + skills merged). |
| \`getconfidential()\` | Returns the confidential JSON data defined in the session (API keys, tokens). |
| \`getsecret()\` | Returns the secret string defined in the session. |
| \`getsystemprompt()\` | Returns the system prompt as a Base64-encoded string (for passing to JS). |
| \`callchat(prompts, endpoint, ...)\` | Sends \`prompts\` (chat history) to the LLM and routes the response to \`endpoint\` callback. Supports up to 3 extra arguments forwarded to the endpoint. |
| \`callchatsilent(prompts, endpoint, ...)\` | Like callchat but the LLM response is not displayed in the chat UI. |
| \`calltool(toolcall, data, endpoint, ...)\` | Calls a JavaScript tool function \`toolcall\` with Base64-encoded JSON \`data\`, result goes to \`endpoint\`. |
| \`call_mcp(server, tool, arguments, endpoint, ...)\` | Calls an MCP server tool. \`server\`: connector name, \`tool\`: tool name, \`arguments\`: dict of args. Result goes to \`endpoint\`. |
| \`push_message(msg)\` | Adds a message to the chat display as an assistant message. |
| \`push_request(msg)\` | Adds a message to the chat display as a user message. |
| \`add_to_chat(chat, msg, push_in)\` | Appends a message to the chat list with auto-detected role. If \`push_in\` is true, also displays it. |
| \`execute_when(time, endpoint, data?)\` | Schedules \`endpoint\` to be called after \`time\` milliseconds. Optional \`data\` is passed as argument. |
| \`return_value(res)\` | Default callback that prints the result to the display zone. |
| \`clean_display()\` | Clears the display zone output. |
| \`open_html(html)\` | Opens an HTML string in a new browser tab. |
| \`display_page(url)\` | Fetches a URL and renders its HTML in the Display zone. |
| \`fetch_page(url, endpoint)\` | Fetches a URL and calls \`endpoint\` with the content. |
| \`web_search(query, endpoint, max_results?)\` | Searches the web via DuckDuckGo and calls \`endpoint\` with JSON results (title, href, body). |
| \`setUserData(mydata)\` | Pushes a list of values into the User Data section. |
| \`setUserDataValue(idx, texte)\` | Updates a single User Data field by index (0 = Data 0). |
| \`pushUserDataValue(texte)\` | Adds a new User Data tab with the given value, returns tab id. |
| \`getUserData()\` | Returns a list containing all User Data field values. |
| \`getUserDataValue(idx)\` | Returns the value of a specific User Data field by index. |
| \`getUserDataSize()\` | Returns the number of User Data tabs. |
| \`setOutputData(mydata)\` | Pushes a list of values into the Output section. |
| \`setOutputDataValue(idx, texte)\` | Updates a single Output field by index (0 = Out 0). |
| \`pushOutputDataValue(texte)\` | Adds a new Output tab with the given value, returns tab id. |
| \`getOutputData()\` | Returns a list containing all Output field values. |
| \`getOutputDataValue(idx)\` | Returns the value of a specific Output field by index. |
| \`getOutputSize()\` | Returns the number of Output tabs. |
| \`getImageSize()\` | Returns the number of images in the Images gallery. |
| \`getImageValue(idx)\` | Returns image idx as {"name" "src" "isUrl"} (src = data URL or http URL). |
| \`getImageData()\` | Returns all images as a list of {"name" "src" "isUrl"} dictionaries. |
| \`pushImageValue(img)\` | Adds an image {"name" "src" "isUrl"} to the gallery, returns its index. |
| \`add_image_to_chat(chat, id_image, (prompt))\` | Registers image id_image into chat as a user message, with an optional text prompt (handles local base64 and URL). |
| \`getChatName()\` | Returns the name of the current Chat tab. |
| \`store_session(path)\` | Stores the current session to a file on disk at the given path. |
| \`store_data(path, data)\` | Stores a string to a file on disk at the given path. |
| \`load_data(path)\` | Loads a file from disk and returns its content as a string. |
| \`entry(prompts)\` | **Main entry point for LLM calls** — sends \`prompts\` to the LLM, response routed to \`entrypoint\`. |

\`\`\`json
${JSON.stringify(template, null, 2)}
\`\`\``;

    addMessage(explanation, 'assistant');
    messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
});

newSessionButton.addEventListener('click', async () => {
    const sessionName = await promptForSessionName();
    if (sessionName) { // Only save if a name was provided (not cancelled)
        saveSessionConfirmed(sessionName);
        updateSaveButtonState();
        // Clear API Key field and backend for new session
        apiKeyInput.value = '';
        fetch(`${API_BASE_URL}/set_key`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: '' })
        });
    }
});

// Event listener for Save button (saves to current session)
createSessionButton.addEventListener('click', () => {
    if (!currentSessionName) {
        showModal('Please create a session first using the "New" button.', false);
        return;
    }
    saveSessionConfirmed(currentSessionName);
});

// Save button clone in Agents panel
document.getElementById('saveAgentsSessionButton').addEventListener('click', async () => {
    // Trigger Set first (compile agents)
    document.getElementById('setAgentsButton').click();
    if (!currentSessionName) {
        const sessionName = await promptForSessionName();
        if (sessionName) {
            saveSessionConfirmed(sessionName);
            updateSaveButtonState();
        }
        return;
    }
    saveSessionConfirmed(currentSessionName);
});

// Save button in Prompts panel
document.getElementById('savePromptsSessionButton').addEventListener('click', () => {
    if (!currentSessionName) {
        showModal('Please create a session first using the "New" button.', false);
        return;
    }
    saveSessionConfirmed(currentSessionName);
});

// Save button in Settings panel
document.getElementById('saveSettingsSessionButton').addEventListener('click', async () => {
    if (!currentSessionName) {
        showModal('Please create a session first using the "New" button.', false);
        return;
    }
    await applyAllSettings();
    saveSessionConfirmed(currentSessionName);
});

// Save button in Skills panel
document.getElementById('saveSkillsSessionButton').addEventListener('click', () => {
    if (!currentSessionName) {
        showModal('Please create a session first using the "New" button.', false);
        return;
    }
    saveSessionConfirmed(currentSessionName);
});

// Save button in Tools panel
document.getElementById('saveToolsSessionButton').addEventListener('click', () => {
    if (!currentSessionName) {
        showModal('Please create a session first using the "New" button.', false);
        return;
    }
    saveSessionConfirmed(currentSessionName);
});

// Save button in User Data panel
document.getElementById('saveUserDataSessionButton').addEventListener('click', () => {
    if (!currentSessionName) {
        showModal('Please create a session first using the "New" button.', false);
        return;
    }
    saveSessionConfirmed(currentSessionName);
});

// Save button in Output panel
document.getElementById('saveOutputSessionButton').addEventListener('click', () => {
    if (!currentSessionName) {
        showModal('Please create a session first using the "New" button.', false);
        return;
    }
    saveSessionConfirmed(currentSessionName);
});

// Save button in Init panel
document.getElementById('saveInitSessionButton').addEventListener('click', () => {
    if (!currentSessionName) {
        showModal('Please create a session first using the "New" button.', false);
        return;
    }
    saveSessionConfirmed(currentSessionName);
});

// Event listener for Rename Session button
document.getElementById('renameSessionButton').addEventListener('click', () => {
    const selectedName = currentSessionName;
    if (!selectedName) {
        showModal('Please select a session to rename.', false);
        return;
    }
    promptRenameSession(selectedName);
});

// Reusable function to rename a session
function promptRenameSession(selectedName) {
    const modal = document.getElementById('renameSessionModal');
    document.getElementById('renameSessionOldName').textContent = selectedName;
    const newNameInput = document.getElementById('renameSessionNewName');
    newNameInput.value = selectedName;
    modal.classList.remove('hidden');
    setTimeout(() => { newNameInput.focus(); newNameInput.select(); }, 100);

    const okBtn = document.getElementById('renameSessionOkButton');
    const cancelBtn = document.getElementById('renameSessionCancelButton');

    function cleanup() {
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
        newNameInput.removeEventListener('keydown', handleKey);
    }

    function handleOk() {
        const newName = newNameInput.value.trim();
        if (!newName) {
            showModal('Session name cannot be empty.', false);
            return;
        }
        if (newName === selectedName) {
            modal.classList.add('hidden');
            cleanup();
            return;
        }
        const serverPrefix = llmServerSelect.value + '_session_';
        // Check if new name already exists
        if (localStorage.getItem(serverPrefix + newName)) {
            showModal('A session with this name already exists.', false);
            return;
        }
        // Copy data to new key
        const oldKey = serverPrefix + selectedName;
        const data = localStorage.getItem(oldKey);
        if (data) {
            localStorage.setItem(serverPrefix + newName, data);
            localStorage.removeItem(oldKey);
            // Also rename associated chat tab keys
            chatTabNames.forEach(chatTab => {
                const oldChatKey = llmServerSelect.value + `_chat_${chatTab}_${selectedName}`;
                const newChatKey = llmServerSelect.value + `_chat_${chatTab}_${newName}`;
                const chatData = localStorage.getItem(oldChatKey);
                if (chatData) {
                    localStorage.setItem(newChatKey, chatData);
                    localStorage.removeItem(oldChatKey);
                }
            });
            if (currentSessionName === selectedName) {
                currentSessionName = newName;
                updateTopBarSessionName();
            }
            // Rename in session tree
            const tree = getSessionTree();
            function renameInNode(node) {
                if (!node.children) return false;
                for (const child of node.children) {
                    if (child.type === 'session' && child.name === selectedName) {
                        child.name = newName;
                        return true;
                    }
                    if (child.type === 'folder' && renameInNode(child)) return true;
                }
                return false;
            }
            renameInNode(tree);
            saveSessionTree(tree);
            populateSessionSelect();
            updateSaveButtonState();
            showModal(`Session renamed to "${newName}".`, true);
        }
        modal.classList.add('hidden');
        cleanup();
    }

    function handleCancel() {
        modal.classList.add('hidden');
        cleanup();
    }

    function handleKey(e) {
        if (e.key === 'Enter') handleOk();
        if (e.key === 'Escape') handleCancel();
    }

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
    newNameInput.addEventListener('keydown', handleKey);
}

// Export a single session as a JSON file download
function exportSessionAsJSON(sessionName) {
    if (!sessionName) return;
    const sessionKey = llmServerSelect.value + '_session_' + sessionName;
    const storedData = loadAndDecompress(sessionKey);
    if (!storedData) {
        showModal('Session not found: "' + sessionName + '"', false);
        return;
    }
    try {
        const sessionData = JSON.parse(storedData);
        // Remove sensitive fields
        delete sessionData.confidential;
        delete sessionData.secret;
        delete sessionData.apiKey;
        const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sessionName.replace(/[^a-zA-Z0-9_\-]/g, '_') + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showModal('Session "' + sessionName + '" exported.', true);
    } catch (e) {
        showModal('Error exporting session: ' + e.message, false);
    }
}

// Delete a single session by name (with confirmation)
function deleteSessionByName(sessionName) {
    if (!sessionName) return;
    // Backup before deletion for undo
    backupSessionBeforeDelete(sessionName);
    const sessionPrefix = llmServerSelect.value + '_session_';
    localStorage.removeItem(sessionPrefix + sessionName);
    // Also remove associated chat tab keys
    chatTabNames.forEach(chatTab => {
        localStorage.removeItem(llmServerSelect.value + `_chat_${chatTab}_${sessionName}`);
    });
    // Remove from tree
    const tree = getSessionTree();
    removeSessionFromTree(tree, sessionName);
    saveSessionTree(tree);
    // If current session was the deleted one, reset state
    if (currentSessionName === sessionName) {
        currentSessionName = '';
        updateTopBarSessionName();
        updateSaveButtonState();
        chatHistory.length = 0;
        renderChatHistory();
    }
    populateSessionSelect();
    showModal(`Session "${sessionName}" deleted.`, true);
}

// NEW: Event listener for Remove Session button - opens modal with session list
removeSessionButton.addEventListener('click', () => {
    const removeSessionsModal = document.getElementById('removeSessionsModal');
    const removeSessionsList = document.getElementById('removeSessionsList');
    const removeSessionsConfirmButton = document.getElementById('removeSessionsConfirmButton');
    const removeSessionsCancelButton = document.getElementById('removeSessionsCancelButton');
    const removeSelectAllButton = document.getElementById('removeSelectAllButton');
    const removeDeselectAllButton = document.getElementById('removeDeselectAllButton');

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
        showModal('No saved sessions to delete.', false);
        return;
    }

    // Build checkbox list
    removeSessionsList.innerHTML = '';
    sessions.forEach(name => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-2 py-1 px-2 hover:bg-gray-50 rounded cursor-pointer text-sm';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = name;
        checkbox.className = 'remove-session-checkbox rounded text-red-500 focus:ring-red-400';
        if (name === currentSessionName) {
            label.classList.add('font-semibold', 'text-blue-700');
        }
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(name));
        removeSessionsList.appendChild(label);
    });

    removeSessionsModal.classList.remove('hidden');

    // Select All / Deselect All
    const onSelectAll = () => {
        removeSessionsList.querySelectorAll('.remove-session-checkbox').forEach(cb => cb.checked = true);
    };
    const onDeselectAll = () => {
        removeSessionsList.querySelectorAll('.remove-session-checkbox').forEach(cb => cb.checked = false);
    };

    // Cleanup previous listeners by cloning buttons
    const newSelectAll = removeSelectAllButton.cloneNode(true);
    removeSelectAllButton.parentNode.replaceChild(newSelectAll, removeSelectAllButton);
    newSelectAll.addEventListener('click', onSelectAll);

    const newDeselectAll = removeDeselectAllButton.cloneNode(true);
    removeDeselectAllButton.parentNode.replaceChild(newDeselectAll, removeDeselectAllButton);
    newDeselectAll.addEventListener('click', onDeselectAll);

    const handleConfirm = () => {
        const checked = removeSessionsList.querySelectorAll('.remove-session-checkbox:checked');
        const toDelete = Array.from(checked).map(cb => cb.value);
        if (toDelete.length === 0) {
            showModal('No sessions selected.', false);
            return;
        }
        // Backup all selected sessions before deletion for undo
        toDelete.forEach(name => {
            backupSessionBeforeDelete(name);
        });
        toDelete.forEach(name => {
            localStorage.removeItem(sessionPrefix + name);
        });
        // If current session was among deleted ones, reset state
        if (toDelete.includes(currentSessionName)) {
            currentSessionName = '';
            updateTopBarSessionName();
            updateSaveButtonState();
            chatHistory.length = 0;
            renderChatHistory();
            systemPromptTabsContent.querySelectorAll('.systemprompt-textarea').forEach(ta => { ta.value = ''; });
            chatTabNames.forEach(tab => {
                const emptyPrompts = {};
                systemPromptTabNames.forEach(n => { emptyPrompts[n] = ''; });
                allChatPrompts[tab] = emptyPrompts;
            });
        }
        populateSessionSelect();
        removeSessionsModal.classList.add('hidden');
        showModal(`${toDelete.length} session(s) deleted.`, true);
        cleanup();
    };

    const handleCancel = () => {
        removeSessionsModal.classList.add('hidden');
        cleanup();
    };

    function cleanup() {
        removeSessionsConfirmButton.removeEventListener('click', handleConfirm);
        removeSessionsCancelButton.removeEventListener('click', handleCancel);
    }

    removeSessionsConfirmButton.addEventListener('click', handleConfirm);
    removeSessionsCancelButton.addEventListener('click', handleCancel);
});

// Session selection is now handled by the tree view click handlers

// Undo last session deletion
document.getElementById('undoDeleteSessionButton').addEventListener('click', () => {
    if (deletedSessionsStack.length === 0) return;
    const restored = deletedSessionsStack.pop();
    updateUndoDeleteSessionButton();
    // Restore session data to localStorage
    const sessionPrefix = restored.server + '_session_';
    localStorage.setItem(sessionPrefix + restored.name, restored.data);
    // Restore position in tree
    const tree = getSessionTree();
    // Navigate to the parent folder
    let parent = tree;
    for (const folderName of (restored.parentPath || [])) {
        const folder = (parent.children || []).find(c => c.type === 'folder' && c.name === folderName);
        if (folder) { parent = folder; } else { break; }
    }
    if (!parent.children) parent.children = [];
    // Only add if not already present
    if (!parent.children.some(c => c.type === 'session' && c.name === restored.name)) {
        parent.children.push({ type: 'session', name: restored.name });
    }
    saveSessionTree(tree);
    populateSessionSelect();
    showModal(`Session "${restored.name}" restored.`, true);
});

// Event listener for New Folder button
document.getElementById('newFolderButton').addEventListener('click', () => {
    promptCreateFolder();
});

// Event listener for Move Session button
document.getElementById('moveSessionButton').addEventListener('click', () => {
    promptMoveSession();
});

