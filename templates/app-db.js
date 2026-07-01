// ============================================================================
// app-db.js — IndexedDB-backed "DB" tab (Data section)
//
// Two-level model:
//   - Top level:  TABLES (named). One table is "current" at a time.
//   - Inside a table: indexed value tabs (DB 0, DB 1, ...) like User Data.
//
// The DB is GLOBAL: not tied to a session or an LLM server, and never written
// into the session JSON.
//
// Async reconciliation: IndexedDB is asynchronous, but the LispE bridge
// (evaljs) is synchronous. We keep an in-memory mirror (dbTables) hydrated once
// from IndexedDB at startup and written-through on every change. Synchronous
// reads serve from the mirror; writes persist to IndexedDB in the background.
//
// IndexedDB layout: object store `tables`, key = table name, value = JSON
// string of the table's array of tab values (["v0","v1",...]).
// ============================================================================

(function () {
    'use strict';

    const DB_NAME = 'predibag_db';
    const DB_STORE = 'tables';
    const OLD_STORE = 'userdb';
    const DB_VERSION = 2;
    const DEFAULT_TABLE = 'default';

    // ---- In-memory mirror -------------------------------------------------
    // dbTables: { tableName: [value, value, ...] }
    let dbTables = {};
    let tableNames = [];
    let currentTable = DEFAULT_TABLE;
    let currentTabIndex = 0; // index of the active value tab within the current table
    let selectedTabs = new Set(); // indices of value tabs checked for export

    function seedDefault() {
        dbTables = { [DEFAULT_TABLE]: ['', '', '', '', ''] };
        tableNames = [DEFAULT_TABLE];
        currentTable = DEFAULT_TABLE;
        currentTabIndex = 0;
    }
    seedDefault();

    function curValues() {
        if (!dbTables[currentTable]) dbTables[currentTable] = ['', '', '', '', ''];
        return dbTables[currentTable];
    }

    // ---- IndexedDB access -------------------------------------------------
    let idbPromise = null;

    function openDB() {
        if (idbPromise) return idbPromise;
        idbPromise = new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                reject(new Error('IndexedDB not supported'));
                return;
            }
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const idb = req.result;
                if (!idb.objectStoreNames.contains(DB_STORE)) {
                    idb.createObjectStore(DB_STORE);
                }
                if (idb.objectStoreNames.contains(OLD_STORE)) {
                    idb.deleteObjectStore(OLD_STORE);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return idbPromise;
    }

    // Read every {tableName: values[]} record from IndexedDB
    function idbReadAll() {
        return openDB().then(idb => new Promise((resolve, reject) => {
            const out = {};
            const tx = idb.transaction(DB_STORE, 'readonly');
            const store = tx.objectStore(DB_STORE);
            const req = store.openCursor();
            req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                    let arr;
                    try { arr = JSON.parse(cursor.value); } catch (e) { arr = []; }
                    if (!Array.isArray(arr)) arr = [];
                    out[cursor.key] = arr;
                    cursor.continue();
                } else {
                    resolve(out);
                }
            };
            req.onerror = () => reject(req.error);
        }));
    }

    // Persist the whole mirror: clear the store then write every table.
    function persistDB() {
        return openDB().then(idb => new Promise((resolve, reject) => {
            const tx = idb.transaction(DB_STORE, 'readwrite');
            const store = tx.objectStore(DB_STORE);
            store.clear();
            tableNames.forEach(name => {
                store.put(JSON.stringify(dbTables[name] || []), name);
            });
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        })).catch(err => console.error('[DB] persist failed:', err));
    }

    // ---- DOM elements (resolved after DOM is ready) -----------------------
    let dbTableSelect, dbTabsBar, dbTabsContent, addDBTabButton, dbFileInput;

    function saveCurrentTabToMemory() {
        const activeTA = dbTabsContent && dbTabsContent.querySelector('.db-textarea:not(.hidden)');
        if (activeTA) {
            const idx = parseInt(activeTA.dataset.idx, 10);
            if (!isNaN(idx)) curValues()[idx] = activeTA.value;
        }
    }

    function tabLabel(i) { return `DB ${i}`; }

    // A value tab is a small unit: a selection checkbox + the switch button.
    function makeTabUnit(i, active) {
        const wrap = document.createElement('span');
        wrap.className = 'db-tab-wrap';
        wrap.style.cssText = 'display:inline-flex;align-items:center;gap:2px;margin-right:2px;';

        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.className = 'db-tab-check';
        chk.dataset.idx = String(i);
        chk.title = 'Select this tab for export to User Data';
        chk.checked = selectedTabs.has(i);
        chk.addEventListener('change', () => {
            if (chk.checked) selectedTabs.add(i); else selectedTabs.delete(i);
        });

        const btn = document.createElement('button');
        btn.className = 'db-tab-btn bg-sky-100 text-sky-900 text-xs px-3 py-1 rounded-t' +
            (active ? ' bg-sky-200 font-semibold' : '');
        btn.dataset.idx = String(i);
        btn.textContent = tabLabel(i);
        btn.addEventListener('click', () => switchDBTab(parseInt(btn.dataset.idx, 10)));

        wrap.appendChild(chk);
        wrap.appendChild(btn);
        return wrap;
    }

    function makeTextarea(i, value) {
        const ta = document.createElement('textarea');
        ta.className = 'db-textarea dark-textarea hidden';
        ta.dataset.idx = String(i);
        ta.placeholder = `${tabLabel(i)}...`;
        ta.value = value || '';
        ta.addEventListener('input', () => {
            curValues()[i] = ta.value;
            persistDB();
        });
        return ta;
    }

    // Rebuild the value-tab bar + contents from the current table
    function rebuildDBTabs() {
        if (!dbTabsBar || !dbTabsContent) return;
        dbTabsBar.querySelectorAll('.db-tab-wrap').forEach(b => b.remove());
        dbTabsContent.innerHTML = '';
        const values = curValues();
        if (currentTabIndex >= values.length) currentTabIndex = 0;
        // Drop selections that no longer point to an existing tab
        selectedTabs.forEach(i => { if (i >= values.length) selectedTabs.delete(i); });
        values.forEach((val, i) => {
            const unit = makeTabUnit(i, i === currentTabIndex);
            dbTabsBar.insertBefore(unit, addDBTabButton);
            const ta = makeTextarea(i, val);
            if (i === currentTabIndex) ta.classList.remove('hidden');
            dbTabsContent.appendChild(ta);
        });
    }

    // Rebuild the table selector dropdown
    function rebuildTableSelect() {
        if (!dbTableSelect) return;
        dbTableSelect.innerHTML = '';
        tableNames.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            if (name === currentTable) opt.selected = true;
            dbTableSelect.appendChild(opt);
        });
    }

    function refreshUI() {
        rebuildTableSelect();
        rebuildDBTabs();
    }

    function switchDBTab(idx) {
        saveCurrentTabToMemory();
        dbTabsBar.querySelectorAll('.db-tab-btn').forEach(btn => {
            btn.classList.remove('bg-sky-200', 'font-semibold');
            btn.classList.add('bg-sky-100');
        });
        dbTabsContent.querySelectorAll('.db-textarea').forEach(ta => ta.classList.add('hidden'));
        const activeBtn = dbTabsBar.querySelector(`.db-tab-btn[data-idx="${idx}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('bg-sky-100');
            activeBtn.classList.add('bg-sky-200', 'font-semibold');
        }
        const activeTA = dbTabsContent.querySelector(`.db-textarea[data-idx="${idx}"]`);
        if (activeTA) {
            activeTA.classList.remove('hidden');
            activeTA.value = curValues()[idx] || '';
        }
        currentTabIndex = idx;
    }

    function addDBTab() {
        saveCurrentTabToMemory();
        const values = curValues();
        values.push('');
        currentTabIndex = values.length - 1;
        rebuildDBTabs();
        switchDBTab(currentTabIndex);
        persistDB();
    }

    // Switch to (creating if needed) a table by name
    function selectTable(name, persist) {
        if (!name) return;
        saveCurrentTabToMemory();
        if (!dbTables[name]) {
            dbTables[name] = ['', '', '', '', ''];
            tableNames.push(name);
        }
        currentTable = name;
        currentTabIndex = 0;
        selectedTabs.clear();
        refreshUI();
        if (persist) persistDB();
    }

    // Append the selected value tabs (or all if none selected) to User Data,
    // filling the first EMPTY User Data slots (Data 0,1,2,...) before creating
    // new tabs, so existing empty tabs are reused instead of skipped.
    function exportSelectedToUserData() {
        saveCurrentTabToMemory();
        if (typeof window.pushUserDataValue !== 'function' ||
            typeof window.getUserData !== 'function' ||
            typeof window.setUserDataValue !== 'function') {
            return 0;
        }
        const values = curValues();
        let indices = Array.from(selectedTabs).filter(i => i < values.length).sort((a, b) => a - b);
        if (indices.length === 0) indices = values.map((_, i) => i); // none checked: export all

        let existing = [];
        try { existing = JSON.parse(unicodeAtob(window.getUserData())); } catch (e) { existing = []; }
        if (!Array.isArray(existing)) existing = [];

        let cursor = 0;
        indices.forEach(i => {
            const val = values[i] || '';
            // Advance to the next empty User Data slot
            while (cursor < existing.length && (existing[cursor] || '').trim() !== '') cursor++;
            if (cursor < existing.length) {
                window.setUserDataValue(cursor, unicodeBtoa(val));
                existing[cursor] = val;
                cursor++;
            } else {
                window.pushUserDataValue(unicodeBtoa(val));
                existing.push(val);
                cursor = existing.length;
            }
        });
        return indices.length;
    }

    function deleteCurrentTable() {
        if (tableNames.length <= 1) {
            // Keep at least one table: reset it to empty
            dbTables[currentTable] = ['', '', '', '', ''];
            currentTabIndex = 0;
            refreshUI();
            persistDB();
            return;
        }
        const idx = tableNames.indexOf(currentTable);
        delete dbTables[currentTable];
        tableNames.splice(idx, 1);
        currentTable = tableNames[Math.max(0, idx - 1)];
        currentTabIndex = 0;
        refreshUI();
        persistDB();
    }

    // ---- Public (global) accessors used by LispE via evaljs ---------------

    // Switch/create the current table by name (base64-encoded). Returns ''.
    window.setTable = function (b64) {
        const name = unicodeAtob(b64);
        selectTable(name, true);
        return '';
    };

    // Return the current table name (plain string, not base64)
    window.getTable = function () {
        return currentTable;
    };

    // Return the list of table names as a base64-encoded JSON array
    window.getTableNames = function () {
        return unicodeBtoa(JSON.stringify(tableNames.slice()));
    };

    // Delete a table by name (base64-encoded). Returns ''.
    window.deleteTable = function (b64) {
        const name = unicodeAtob(b64);
        if (dbTables[name]) {
            if (name === currentTable) {
                deleteCurrentTable();
            } else {
                const idx = tableNames.indexOf(name);
                delete dbTables[name];
                tableNames.splice(idx, 1);
                persistDB();
                rebuildTableSelect();
            }
        }
        return '';
    };

    // Return all values of the current table as a base64-encoded JSON array
    window.getDBData = function () {
        saveCurrentTabToMemory();
        return unicodeBtoa(JSON.stringify(curValues().slice()));
    };

    // Return one value of the current table by index, base64-encoded
    window.getDBDataValue = function (idx) {
        saveCurrentTabToMemory();
        const v = curValues()[idx];
        return unicodeBtoa(v === undefined ? '' : v);
    };

    // Number of value tabs in the current table
    window.getDBSize = function () {
        return curValues().length;
    };

    // Replace all values of the current table from a base64-encoded JSON array
    window.setDBData = function (b64) {
        let arr;
        try { arr = JSON.parse(unicodeAtob(b64)); } catch (e) { arr = []; }
        if (!Array.isArray(arr)) arr = [];
        dbTables[currentTable] = arr.map(v => String(v == null ? '' : v));
        currentTabIndex = 0;
        rebuildDBTabs();
        persistDB();
        return '';
    };

    // Set one value of the current table by index (base64-encoded text)
    window.setDBDataValue = function (idx, b64) {
        const value = unicodeAtob(b64);
        const values = curValues();
        while (values.length <= idx) values.push('');
        values[idx] = value;
        rebuildDBTabs();
        persistDB();
        return '';
    };

    // Append a new value to the current table; returns its tab name ("DB N")
    window.pushDBDataValue = function (b64) {
        const value = unicodeAtob(b64);
        const values = curValues();
        values.push(value);
        const name = tabLabel(values.length - 1);
        rebuildDBTabs();
        persistDB();
        return name;
    };

    // Destroy the ENTIRE DB: wipe IndexedDB and reset to a single empty default table
    window.clearAllDB = function () {
        seedDefault();
        refreshUI();
        persistDB();
        return '';
    };

    // ---- Load / Save (JSON: { tableName: [values...] }) -------------------
    function loadDBFromObject(obj) {
        if (!obj || typeof obj !== 'object') return;
        const names = Object.keys(obj);
        if (names.length === 0) { seedDefault(); refreshUI(); persistDB(); return; }
        dbTables = {};
        tableNames = [];
        names.forEach(name => {
            const arr = obj[name];
            // Accept an array, a plain object {DB 0: v, ...}, or a scalar
            if (Array.isArray(arr)) {
                dbTables[name] = arr.map(v => String(v == null ? '' : v));
            } else if (arr && typeof arr === 'object') {
                dbTables[name] = Object.values(arr).map(v => String(v == null ? '' : v));
            } else {
                dbTables[name] = [String(arr == null ? '' : arr)];
            }
            tableNames.push(name);
        });
        currentTable = tableNames[0];
        currentTabIndex = 0;
        refreshUI();
        persistDB();
    }

    function exportDBObject() {
        saveCurrentTabToMemory();
        const obj = {};
        tableNames.forEach(name => { obj[name] = (dbTables[name] || []).slice(); });
        return obj;
    }

    // ---- Wire up DOM ------------------------------------------------------
    function wireDB() {
        dbTableSelect = document.getElementById('dbTableSelect');
        dbTabsBar = document.getElementById('dbTabsBar');
        dbTabsContent = document.getElementById('dbTabsContent');
        addDBTabButton = document.getElementById('addDBTabButton');
        dbFileInput = document.getElementById('dbFileInput');
        if (!dbTabsBar || !dbTabsContent) return;

        if (addDBTabButton) addDBTabButton.addEventListener('click', addDBTab);

        if (dbTableSelect) {
            dbTableSelect.addEventListener('change', () => selectTable(dbTableSelect.value, false));
        }

        const newTableBtn = document.getElementById('newDBTableButton');
        if (newTableBtn) {
            newTableBtn.addEventListener('click', () => {
                const name = (window.prompt('New table name:') || '').trim();
                if (name) selectTable(name, true);
            });
        }

        const delTableBtn = document.getElementById('deleteDBTableButton');
        if (delTableBtn) {
            delTableBtn.addEventListener('click', () => {
                if (confirm(`Delete table "${currentTable}"?`)) deleteCurrentTable();
            });
        }

        const exportUDBtn = document.getElementById('exportDBToUserDataButton');
        if (exportUDBtn) {
            exportUDBtn.addEventListener('click', () => {
                const n = exportSelectedToUserData();
                if (n > 0) {
                    const orig = exportUDBtn.innerHTML;
                    exportUDBtn.innerHTML = `\u2713 ${n} \u2192 Data`;
                    setTimeout(() => { exportUDBtn.innerHTML = orig; }, 1500);
                }
            });
        }

        const deselectBtn = document.getElementById('deselectDBTabsButton');
        if (deselectBtn) {
            deselectBtn.addEventListener('click', () => {
                selectedTabs.clear();
                dbTabsBar.querySelectorAll('.db-tab-check').forEach(chk => { chk.checked = false; });
            });
        }

        const selectAllBtn = document.getElementById('selectDBTabsButton');
        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                dbTabsBar.querySelectorAll('.db-tab-check').forEach(chk => {
                    chk.checked = true;
                    const i = parseInt(chk.dataset.idx, 10);
                    if (!isNaN(i)) selectedTabs.add(i);
                });
            });
        }

        const loadBtn = document.getElementById('loadDBFileButton');
        if (loadBtn && dbFileInput) {
            loadBtn.addEventListener('click', () => dbFileInput.click());
            dbFileInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            loadDBFromObject(JSON.parse(e.target.result));
                        } catch (err) {
                            alert('Invalid DB JSON file: ' + err.message);
                        }
                    };
                    reader.readAsText(file);
                }
                dbFileInput.value = '';
            });
        }

        const saveBtn = document.getElementById('saveDBFileButton');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const obj = exportDBObject();
                const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'predibag_db.json';
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        const clearBtn = document.getElementById('clearDBButton');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const activeTA = dbTabsContent.querySelector('.db-textarea:not(.hidden)');
                if (activeTA) {
                    const idx = parseInt(activeTA.dataset.idx, 10);
                    activeTA.value = '';
                    if (!isNaN(idx)) curValues()[idx] = '';
                    persistDB();
                }
            });
        }

        const destroyBtn = document.getElementById('destroyDBButton');
        if (destroyBtn) {
            destroyBtn.addEventListener('click', () => {
                if (confirm('Destroy the entire DB? This wipes ALL tables in IndexedDB and cannot be undone.')) {
                    window.clearAllDB();
                }
            });
        }

        const copyBtn = document.getElementById('copyDBButton');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const activeTA = dbTabsContent.querySelector('.db-textarea:not(.hidden)');
                if (activeTA) {
                    navigator.clipboard.writeText(activeTA.value).then(() => {
                        const orig = copyBtn.innerHTML;
                        copyBtn.innerHTML = '\u2713';
                        setTimeout(() => { copyBtn.innerHTML = orig; }, 1500);
                    });
                }
            });
        }

        // Hydrate the mirror from IndexedDB, then rebuild the UI
        idbReadAll().then(stored => {
            const names = Object.keys(stored);
            if (names.length > 0) {
                dbTables = stored;
                tableNames = names.slice();
                currentTable = tableNames[0];
                currentTabIndex = 0;
                refreshUI();
            } else {
                // First run: seed IndexedDB with the default empty table
                refreshUI();
                persistDB();
            }
        }).catch(err => { console.error('[DB] hydrate failed:', err); refreshUI(); });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wireDB);
    } else {
        wireDB();
    }
})();
