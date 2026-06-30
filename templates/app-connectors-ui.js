// =============================================
// CONNECTORS SECTION
// =============================================

// Pre-defined connector templates
const CONNECTOR_TEMPLATES = {
    // --- Verified official/well-known packages ---
    "GitHub": {
        config: { name: "github", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-github"], env: { "GITHUB_PERSONAL_ACCESS_TOKEN": "$GITHUB_TOKEN" } },
        vars: [ { name: "GITHUB_TOKEN", type: "secret", value: "" } ]
    },
    "GitLab": {
        config: { name: "gitlab", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-gitlab"], env: { "GITLAB_PERSONAL_ACCESS_TOKEN": "$GITLAB_TOKEN", "GITLAB_API_URL": "$GITLAB_URL" } },
        vars: [ { name: "GITLAB_TOKEN", type: "secret", value: "" }, { name: "GITLAB_URL", type: "text", value: "https://gitlab.com/api/v4" } ]
    },
    "Google Drive": {
        config: { name: "gdrive", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-gdrive"], env: {} },
        vars: [ { name: "GDRIVE_CREDENTIALS_PATH", type: "text", value: "~/.config/gdrive-mcp/credentials.json" } ]
    },
    "Slack": {
        config: { name: "slack", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-slack"], env: { "SLACK_BOT_TOKEN": "$SLACK_BOT_TOKEN", "SLACK_TEAM_ID": "$SLACK_TEAM_ID" } },
        vars: [ { name: "SLACK_BOT_TOKEN", type: "secret", value: "" }, { name: "SLACK_TEAM_ID", type: "text", value: "" } ]
    },
    "PostgreSQL": {
        config: { name: "postgresql", transport: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-postgres", "$PG_CONNECTION"], env: {} },
        vars: [ { name: "PG_CONNECTION", type: "secret", value: "postgresql://user:pass@localhost:5432/mydb" } ]
    },
    "Notion": {
        config: { name: "notion", transport: "stdio", command: "npx", args: ["-y", "@notionhq/notion-mcp-server"], env: { "OPENAPI_MCP_HEADERS": "$NOTION_HEADERS" } },
        vars: [ { name: "NOTION_HEADERS", type: "secret", value: "{\"Authorization\":\"Bearer ntn_xxx\",\"Notion-Version\":\"2022-06-28\"}" } ]
    },
    "Stripe": {
        config: { name: "stripe", transport: "stdio", command: "npx", args: ["-y", "@stripe/mcp@latest", "--tools=all"], env: { "STRIPE_SECRET_KEY": "$STRIPE_SECRET_KEY" } },
        vars: [ { name: "STRIPE_SECRET_KEY", type: "secret", value: "" } ]
    },
    "Shopify": {
        config: { name: "shopify", transport: "stdio", command: "npx", args: ["-y", "@shopify/dev-mcp@latest"], env: { "SHOPIFY_ACCESS_TOKEN": "$SHOPIFY_TOKEN", "SHOPIFY_STORE_DOMAIN": "$SHOPIFY_DOMAIN" } },
        vars: [ { name: "SHOPIFY_TOKEN", type: "secret", value: "" }, { name: "SHOPIFY_DOMAIN", type: "text", value: "" } ]
    },
    // --- Atlassian MCP servers ---
    "Confluence": {
        config: { name: "confluence", transport: "stdio", command: "npx", args: ["-y", "confluence-mcp-server"], env: { "CONF_MODE": "cloud", "CONF_BASE_URL": "$ATLASSIAN_URL", "CONF_USERNAME": "$ATLASSIAN_EMAIL", "CONF_TOKEN": "$ATLASSIAN_TOKEN" } },
        vars: [ { name: "ATLASSIAN_EMAIL", type: "text", value: "" }, { name: "ATLASSIAN_TOKEN", type: "secret", value: "" }, { name: "ATLASSIAN_URL", type: "text", value: "https://your-domain.atlassian.net/wiki" } ]
    },
    "Jira": {
        config: { name: "jira", transport: "stdio", command: "uvx", args: ["mcp-atlassian", "--jira-url=$ATLASSIAN_URL", "--jira-username=$ATLASSIAN_EMAIL", "--jira-token=$ATLASSIAN_TOKEN"], env: {} },
        vars: [ { name: "ATLASSIAN_EMAIL", type: "text", value: "" }, { name: "ATLASSIAN_TOKEN", type: "secret", value: "" }, { name: "ATLASSIAN_URL", type: "text", value: "https://your-domain.atlassian.net" } ]
    },
    // --- Google services (community) ---
    "Gmail": {
        config: { name: "gmail", transport: "stdio", command: "npx", args: ["-y", "@gongrzhe/server-gmail-autoauth-mcp"], env: { "GMAIL_CLIENT_ID": "$GOOGLE_CLIENT_ID", "GMAIL_CLIENT_SECRET": "$GOOGLE_CLIENT_SECRET", "GMAIL_REDIRECT_URI": "http://localhost:3000/oauth2callback" } },
        vars: [ { name: "GOOGLE_CLIENT_ID", type: "secret", value: "" }, { name: "GOOGLE_CLIENT_SECRET", type: "secret", value: "" } ]
    },
    "Google Calendar": {
        config: { name: "gcalendar", transport: "stdio", command: "npx", args: ["-y", "@gongrzhe/server-calendar-autoauth-mcp"], env: { "CALENDAR_CLIENT_ID": "$GOOGLE_CLIENT_ID", "CALENDAR_CLIENT_SECRET": "$GOOGLE_CLIENT_SECRET", "CALENDAR_REDIRECT_URI": "http://localhost:3000/oauth2callback" } },
        vars: [ { name: "GOOGLE_CLIENT_ID", type: "secret", value: "" }, { name: "GOOGLE_CLIENT_SECRET", type: "secret", value: "" } ]
    },
    // --- Community npm packages ---
    "MySQL": {
        config: { name: "mysql", transport: "stdio", command: "npx", args: ["-y", "@benborla29/mcp-server-mysql"], env: { "MYSQL_HOST": "$MYSQL_HOST", "MYSQL_PORT": "$MYSQL_PORT", "MYSQL_USER": "$MYSQL_USER", "MYSQL_PASSWORD": "$MYSQL_PASSWORD", "MYSQL_DATABASE": "$MYSQL_DATABASE" } },
        vars: [ { name: "MYSQL_HOST", type: "text", value: "localhost" }, { name: "MYSQL_PORT", type: "text", value: "3306" }, { name: "MYSQL_USER", type: "text", value: "" }, { name: "MYSQL_PASSWORD", type: "secret", value: "" }, { name: "MYSQL_DATABASE", type: "text", value: "" } ]
    },
    "MongoDB": {
        config: { name: "mongodb", transport: "stdio", command: "npx", args: ["-y", "mcp-mongo-server", "$MONGO_URI"], env: {} },
        vars: [ { name: "MONGO_URI", type: "secret", value: "mongodb://localhost:27017/mydb" } ]
    },
    // --- Generic templates ---
    "Salesforce": {
        config: { name: "salesforce", transport: "http", url: "$SF_INSTANCE_URL/mcp" },
        vars: [ { name: "SF_INSTANCE_URL", type: "text", value: "" }, { name: "SF_ACCESS_TOKEN", type: "secret", value: "" } ]
    },
    "Elasticsearch": {
        config: { name: "elasticsearch", transport: "http", url: "$ES_URL/mcp" },
        vars: [ { name: "ES_URL", type: "text", value: "http://localhost:9200" }, { name: "ES_API_KEY", type: "secret", value: "" } ]
    },
    "Custom (HTTP)": {
        config: { name: "custom-http", transport: "http", url: "$SERVER_URL" },
        vars: [ { name: "SERVER_URL", type: "text", value: "http://localhost:8900/mcp" } ]
    },
    "Custom (stdio)": {
        config: { name: "custom-stdio", transport: "stdio", command: "$COMMAND", args: ["$ARGS"] },
        vars: [ { name: "COMMAND", type: "text", value: "npx" }, { name: "ARGS", type: "text", value: "-y @my/mcp-server" } ]
    }
};

// Connectors state
let connectorNames = []; // list of connector names (tab order)
let currentConnector = ''; // currently selected connector tab
const connectorStates = {}; // { name: { connected: bool } }

// DOM references
const connectorTabsBar = document.getElementById('connectorTabsBar');
const connectorContent = document.getElementById('connectorContent');
const connectorConfigTextarea = document.getElementById('connectorConfigTextarea');
const connectorVarsContainer = document.getElementById('connectorVarsContainer');
const connectorToolsList = document.getElementById('connectorToolsList');
const connectorToolsCount = document.getElementById('connectorToolsCount');
const connectorStatusBar = document.getElementById('connectorStatusBar');

// ---- localStorage helpers ----
function connKey(name, suffix) { return `mcp_connector_${suffix}_${name}`; }

function loadConnectorConfig(name) {
    try { return JSON.parse(localStorage.getItem(connKey(name, 'config'))) || null; } catch { return null; }
}
function saveConnectorConfig(name, cfg) {
    localStorage.setItem(connKey(name, 'config'), JSON.stringify(cfg));
}
function loadConnectorVars(name) {
    try { return JSON.parse(localStorage.getItem(connKey(name, 'vars'))) || []; } catch { return []; }
}
function saveConnectorVars(name, vars) {
    localStorage.setItem(connKey(name, 'vars'), JSON.stringify(vars));
}
function loadConnectorTools(name) {
    try { return JSON.parse(localStorage.getItem(connKey(name, 'tools'))) || []; } catch { return []; }
}
function saveConnectorTools(name, tools) {
    localStorage.setItem(connKey(name, 'tools'), JSON.stringify(tools));
}
function loadConnectorNames() {
    try { return JSON.parse(localStorage.getItem('mcp_connector_names')) || []; } catch { return []; }
}
function saveConnectorNames() {
    localStorage.setItem('mcp_connector_names', JSON.stringify(connectorNames));
}

// ---- Template version: bump this when CONNECTOR_TEMPLATES changes ----
const CONNECTOR_TEMPLATES_VERSION = 3;

// ---- Initialize connectors from localStorage or templates ----
function initConnectors() {
    const saved = loadConnectorNames();
    const storedVersion = parseInt(localStorage.getItem('mcp_connector_templates_version') || '0', 10);
    if (saved.length > 0) {
        connectorNames = saved;
        // Migrate: update configs from templates when version changes
        if (storedVersion < CONNECTOR_TEMPLATES_VERSION) {
            connectorNames.forEach(name => {
                if (CONNECTOR_TEMPLATES[name]) {
                    const tpl = CONNECTOR_TEMPLATES[name];
                    // Update config from template, preserve user variables values
                    saveConnectorConfig(name, tpl.config);
                    const oldVars = loadConnectorVars(name);
                    const newVars = tpl.vars.map(v => {
                        const existing = oldVars.find(ov => ov.name === v.name);
                        return existing && existing.value ? existing : v;
                    });
                    saveConnectorVars(name, newVars);
                }
            });
            localStorage.setItem('mcp_connector_templates_version', String(CONNECTOR_TEMPLATES_VERSION));
        }
    } else {
        // First run: create all predefined connectors
        connectorNames = Object.keys(CONNECTOR_TEMPLATES);
        connectorNames.forEach(name => {
            const tpl = CONNECTOR_TEMPLATES[name];
            saveConnectorConfig(name, tpl.config);
            saveConnectorVars(name, tpl.vars);
            saveConnectorTools(name, []);
        });
        saveConnectorNames();
        localStorage.setItem('mcp_connector_templates_version', String(CONNECTOR_TEMPLATES_VERSION));
    }
    connectorNames.forEach(name => {
        connectorStates[name] = { connected: false };
    });
    renderConnectorTabs();
    if (connectorNames.length > 0) {
        switchConnector(connectorNames[0]);
    }
    updateConnectorStatusBar();
}

// ---- Render connector tabs ----
function renderConnectorTabs() {
    connectorTabsBar.innerHTML = '';
    connectorNames.forEach(name => {
        const btn = document.createElement('button');
        const isActive = name === currentConnector;
        btn.className = `connector-tab-btn text-teal-900 text-xs px-3 py-1 rounded-t ${isActive ? 'bg-teal-200 font-semibold' : 'bg-teal-100'}`;
        btn.dataset.connector = name;
        const dot = connectorStates[name]?.connected ? '🟢' : '🔴';
        btn.textContent = `${dot} ${name}`;
        btn.title = name;
        btn.addEventListener('click', () => switchConnector(name));
        // Double-click to rename
        btn.addEventListener('dblclick', () => {
            const newName = prompt('Rename connector:', name);
            if (newName && newName !== name && !connectorNames.includes(newName)) {
                renameConnector(name, newName);
            }
        });
        connectorTabsBar.appendChild(btn);
    });
    // "+" button
    const addBtn = document.createElement('button');
    addBtn.className = 'bg-teal-300 hover:bg-teal-400 text-teal-900 text-xs px-2 py-1 rounded-t font-bold';
    addBtn.title = 'Add connector';
    addBtn.textContent = '+';
    addBtn.addEventListener('click', () => {
        const newName = prompt('New connector name:');
        if (newName && !connectorNames.includes(newName)) {
            addConnector(newName);
        }
    });
    connectorTabsBar.appendChild(addBtn);
    // "✕" button to remove current
    const delBtn = document.createElement('button');
    delBtn.className = 'bg-teal-300 hover:bg-teal-400 text-teal-900 text-xs px-2 py-1 rounded-t font-bold';
    delBtn.title = 'Delete current connector';
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', () => {
        if (currentConnector && confirm(`Delete connector "${currentConnector}"?`)) {
            removeConnector(currentConnector);
        }
    });
    connectorTabsBar.appendChild(delBtn);
}

// ---- Switch to a connector tab ----
function switchConnector(name) {
    if (currentConnector) {
        saveCurrentConnectorToMemory();
    }
    currentConnector = name;
    // Update tab styling
    connectorTabsBar.querySelectorAll('.connector-tab-btn').forEach(btn => {
        const isThis = btn.dataset.connector === name;
        btn.classList.toggle('bg-teal-200', isThis);
        btn.classList.toggle('font-semibold', isThis);
        btn.classList.toggle('bg-teal-100', !isThis);
    });
    // Load data
    const cfg = loadConnectorConfig(name);
    connectorConfigTextarea.value = cfg ? JSON.stringify(cfg, null, 2) : '';
    renderConnectorVars(name);
    renderConnectorTools(name);
}

// ---- Save current connector data to localStorage ----
function saveCurrentConnectorToMemory() {
    if (!currentConnector) return;
    // Save config
    try {
        const cfg = JSON.parse(connectorConfigTextarea.value);
        saveConnectorConfig(currentConnector, cfg);
    } catch { /* invalid JSON, keep old */ }
    // Save vars
    const vars = [];
    connectorVarsContainer.querySelectorAll('.connector-var-row').forEach(row => {
        const nameEl = row.querySelector('.var-name');
        const valueEl = row.querySelector('.var-value');
        const typeEl = row.querySelector('.var-type');
        if (nameEl && valueEl) {
            vars.push({ name: nameEl.textContent, value: valueEl.value, type: typeEl ? typeEl.value : 'text' });
        }
    });
    saveConnectorVars(currentConnector, vars);
    // Save tools (checkbox state & descriptions)
    const tools = loadConnectorTools(currentConnector);
    connectorToolsList.querySelectorAll('.connector-tool-item').forEach((item, idx) => {
        if (tools[idx]) {
            const cb = item.querySelector('input[type="checkbox"]');
            tools[idx].enabled = cb ? cb.checked : true;
        }
    });
    connectorToolsList.querySelectorAll('.connector-tool-detail textarea').forEach((ta, idx) => {
        if (tools[idx]) {
            tools[idx].customDescription = ta.value;
        }
    });
    saveConnectorTools(currentConnector, tools);
}

// ---- Render Zone B: Variables ----
function renderConnectorVars(name) {
    const vars = loadConnectorVars(name);
    connectorVarsContainer.innerHTML = '';
    vars.forEach((v, idx) => {
        const row = document.createElement('div');
        row.className = 'connector-var-row';
        row.innerHTML = `
            <label class="var-name">${v.name}</label>
            <input class="var-value" type="${v.type === 'secret' ? 'password' : 'text'}" value="${escapeHtml(v.value)}" placeholder="${v.name}...">
            <input class="var-type" type="hidden" value="${v.type}">
            <button class="toggle-vis" title="Toggle visibility">${v.type === 'secret' ? '👁' : ''}</button>
            <button class="remove-var" title="Remove">✕</button>
        `;
        // Toggle visibility
        row.querySelector('.toggle-vis').addEventListener('click', () => {
            const inp = row.querySelector('.var-value');
            inp.type = inp.type === 'password' ? 'text' : 'password';
        });
        // Remove variable
        row.querySelector('.remove-var').addEventListener('click', () => {
            row.remove();
            saveCurrentConnectorToMemory();
        });
        connectorVarsContainer.appendChild(row);
    });
}

// ---- Render Zone C: Tools accordion ----
function renderConnectorTools(name) {
    const tools = loadConnectorTools(name);
    connectorToolsList.innerHTML = '';
    let enabledCount = 0;
    tools.forEach((tool, idx) => {
        if (tool.enabled) enabledCount++;
        // Tool header row
        const item = document.createElement('div');
        item.className = 'connector-tool-item';
        item.innerHTML = `
            <input type="checkbox" ${tool.enabled ? 'checked' : ''} title="Activer/Désactiver">
            <span class="tool-arrow">▶</span>
            <span class="tool-name">${escapeHtml(tool.name)}</span>
        `;
        // Detail panel
        const detail = document.createElement('div');
        detail.className = 'connector-tool-detail';
        const desc = tool.customDescription || tool.description || '';
        let paramText = '';
        if (tool.inputSchema && tool.inputSchema.properties) {
            const props = tool.inputSchema.properties;
            const required = tool.inputSchema.required || [];
            paramText = Object.entries(props).map(([k, v]) => {
                const req = required.includes(k) ? ', requis' : '';
                return `  - ${k} (${v.type || 'any'}${req}) : ${v.description || ''}`;
            }).join('\n');
        }
        const fullDesc = desc + (paramText ? '\n\nParamètres :\n' + paramText : '');
        detail.innerHTML = `<textarea>${escapeHtml(fullDesc)}</textarea>`;

        // Toggle accordion
        item.addEventListener('click', (e) => {
            if (e.target.type === 'checkbox') return; // don't toggle on checkbox click
            const isOpen = detail.classList.toggle('open');
            item.querySelector('.tool-arrow').textContent = isOpen ? '▼' : '▶';
        });
        // Checkbox change
        item.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
            tools[idx].enabled = e.target.checked;
            saveConnectorTools(name, tools);
            updateToolsCount(name);
        });

        connectorToolsList.appendChild(item);
        connectorToolsList.appendChild(detail);
    });
    updateToolsCount(name);
    // Update toggle button label
    const allEnabled = tools.length > 0 && tools.every(t => t.enabled);
    const toggleBtn = document.getElementById('connectorToggleAllToolsBtn');
    if (toggleBtn) toggleBtn.textContent = allEnabled ? '☐ Deselect all' : '☑ Select all';
}

function updateToolsCount(name) {
    const tools = loadConnectorTools(name);
    const enabled = tools.filter(t => t.enabled).length;
    connectorToolsCount.textContent = tools.length > 0 ? `[${enabled}/${tools.length} active]` : '';
}

// ---- Add a new connector ----
function addConnector(name) {
    connectorNames.push(name);
    const defaultConfig = { name: name.toLowerCase().replace(/\s+/g, '-'), transport: "http", url: "" };
    saveConnectorConfig(name, defaultConfig);
    saveConnectorVars(name, []);
    saveConnectorTools(name, []);
    connectorStates[name] = { connected: false };
    saveConnectorNames();
    renderConnectorTabs();
    switchConnector(name);
}

// ---- Remove a connector ----
function removeConnector(name) {
    connectorNames = connectorNames.filter(n => n !== name);
    localStorage.removeItem(connKey(name, 'config'));
    localStorage.removeItem(connKey(name, 'vars'));
    localStorage.removeItem(connKey(name, 'tools'));
    delete connectorStates[name];
    saveConnectorNames();
    renderConnectorTabs();
    if (connectorNames.length > 0) {
        switchConnector(connectorNames[0]);
    } else {
        currentConnector = '';
        connectorConfigTextarea.value = '';
        connectorVarsContainer.innerHTML = '';
        connectorToolsList.innerHTML = '';
    }
    updateConnectorStatusBar();
}

// ---- Rename a connector ----
function renameConnector(oldName, newName) {
    const cfg = loadConnectorConfig(oldName);
    const vars = loadConnectorVars(oldName);
    const tools = loadConnectorTools(oldName);
    localStorage.removeItem(connKey(oldName, 'config'));
    localStorage.removeItem(connKey(oldName, 'vars'));
    localStorage.removeItem(connKey(oldName, 'tools'));
    const idx = connectorNames.indexOf(oldName);
    if (idx >= 0) connectorNames[idx] = newName;
    connectorStates[newName] = connectorStates[oldName] || { connected: false };
    delete connectorStates[oldName];
    saveConnectorConfig(newName, cfg);
    saveConnectorVars(newName, vars);
    saveConnectorTools(newName, tools);
    saveConnectorNames();
    if (currentConnector === oldName) currentConnector = newName;
    renderConnectorTabs();
    switchConnector(newName);
    updateConnectorStatusBar();
}

// ---- Resolve $VARIABLES in config ----
function resolveConnectorConfig(name) {
    const cfg = loadConnectorConfig(name);
    const vars = loadConnectorVars(name);
    if (!cfg) return null;
    let cfgStr = JSON.stringify(cfg);
    vars.forEach(v => {
        cfgStr = cfgStr.replaceAll('$' + v.name, v.value);
    });
    try { return JSON.parse(cfgStr); } catch { return null; }
}

// ---- Update status bar ----
function updateConnectorStatusBar() {
    const active = connectorNames.filter(n => connectorStates[n]?.connected);
    if (active.length === 0) {
        connectorStatusBar.textContent = 'No connectors active';
    } else {
        connectorStatusBar.innerHTML = active.map(n => `<span class="connector-status connected"></span>${n}`).join('&nbsp;&nbsp;');
    }
}

// ---- Get list of active connector names (for session save) ----
function getActiveConnectors() {
    return connectorNames.filter(n => connectorStates[n]?.connected);
}

// ---- Zone collapsible toggles ----
document.getElementById('connectorZoneAHeader').addEventListener('click', function() {
    const zone = document.getElementById('connectorZoneA');
    zone.classList.toggle('open');
    this.querySelector('span').textContent = zone.classList.contains('open') ? '▼ MCP Configuration' : '▶ MCP Configuration';
});
document.getElementById('connectorZoneBHeader').addEventListener('click', function() {
    const zone = document.getElementById('connectorZoneB');
    zone.classList.toggle('open');
    this.querySelector('span').textContent = zone.classList.contains('open') ? '▼ Credentials 🔒' : '▶ Credentials 🔒';
});
document.getElementById('connectorZoneCHeader').addEventListener('click', function() {
    const zone = document.getElementById('connectorZoneC');
    zone.classList.toggle('open');
    this.querySelector('span').textContent = zone.classList.contains('open') ? '▼ MCP Tools' : '▶ MCP Tools';
});

// ---- Toggle all tools button ----
document.getElementById('connectorToggleAllToolsBtn').addEventListener('click', () => {
    if (!currentConnector) return;
    const tools = loadConnectorTools(currentConnector);
    if (tools.length === 0) return;
    const allEnabled = tools.every(t => t.enabled);
    tools.forEach(t => { t.enabled = !allEnabled; });
    saveConnectorTools(currentConnector, tools);
    renderConnectorTools(currentConnector);
    // Open Zone C if closed
    document.getElementById('connectorZoneC').classList.add('open');
    document.getElementById('connectorZoneCHeader').querySelector('span').textContent = '▼ MCP Tools';
});

// ---- Add variable button ----
document.getElementById('connectorAddVarBtn').addEventListener('click', () => {
    const varName = prompt('Variable name:');
    if (!varName) return;
    const vars = loadConnectorVars(currentConnector);
    vars.push({ name: varName, value: '', type: 'text' });
    saveConnectorVars(currentConnector, vars);
    renderConnectorVars(currentConnector);
});

// ---- Connect button ----
document.getElementById('connectorConnectBtn').addEventListener('click', async () => {
    const connName = currentConnector;
    if (!connName) return;
    saveCurrentConnectorToMemory();
    const resolved = resolveConnectorConfig(connName);
    if (!resolved) {
        showModal('Invalid JSON configuration.', false);
        return;
    }
    try {
        const data = unicodeBtoa(JSON.stringify(resolved));
        const result = await new Promise((resolve) => {
            const cb = (res) => resolve(res);
            const cmd = `mcp_register_server(\`${data}\`);`;
            const jsResult = eval(cmd);
            if (jsResult && typeof jsResult.then === 'function') {
                jsResult.then(cb).catch(() => resolve(null));
            } else {
                resolve(jsResult);
            }
        });
        connectorStates[connName] = { connected: true };
        updateConnectorStatusBar();
        renderConnectorTabs();
        showModal(`Connected to "${connName}"!`, true);
    } catch (err) {
        showModal(`Connection error: ${err.message}`, false);
    }
});

// ---- Disconnect button ----
document.getElementById('connectorDisconnectBtn').addEventListener('click', async () => {
    const connName = currentConnector;
    if (!connName) return;
    try {
        const cfg = loadConnectorConfig(connName);
        if (cfg && cfg.name) {
            const data = unicodeBtoa(JSON.stringify({ name: cfg.name }));
            eval(`mcp_remove_server(\`${data}\`);`);
        }
        connectorStates[connName] = { connected: false };
        updateConnectorStatusBar();
        renderConnectorTabs();
        showModal(`Disconnected from "${connName}".`, true);
    } catch (err) {
        showModal(`Error: ${err.message}`, false);
    }
});

// ---- Fetch Tools button ----
document.getElementById('connectorFetchBtn').addEventListener('click', async () => {
    const connName = currentConnector;
    if (!connName) return;
    if (!connectorStates[connName]?.connected) {
        showModal('Connect to the server first.', false);
        return;
    }
    try {
        const cfg = loadConnectorConfig(connName);
        const data = unicodeBtoa(JSON.stringify({ server: cfg.name }));
        const rawResult = eval(`mcp_list_tools(\`${data}\`);`);
        let result = rawResult;
        if (result && typeof result.then === 'function') {
            result = await result;
        }
        // Parse the result
        let parsedResult;
        if (typeof result === 'string') {
            try { parsedResult = JSON.parse(unicodeAtob(result)); } catch {
                try { parsedResult = JSON.parse(result); } catch { parsedResult = result; }
            }
        } else {
            parsedResult = result;
        }
        // Extract tools array
        let toolsArray = [];
        if (Array.isArray(parsedResult)) {
            toolsArray = parsedResult;
        } else if (parsedResult && parsedResult.tools) {
            toolsArray = parsedResult.tools;
        } else if (parsedResult && parsedResult.result) {
            toolsArray = Array.isArray(parsedResult.result) ? parsedResult.result : [];
        }
        // Map to our format
        const tools = toolsArray.map(t => ({
            name: t.name || 'unknown',
            description: t.description || '',
            inputSchema: t.inputSchema || t.input_schema || {},
            enabled: true,
            customDescription: ''
        }));
        saveConnectorTools(connName, tools);
        // Only re-render if this connector is still the active tab
        if (currentConnector === connName) {
            renderConnectorTools(connName);
            // Open Zone C
            document.getElementById('connectorZoneC').classList.add('open');
            document.getElementById('connectorZoneCHeader').querySelector('span').textContent = '▼ MCP Tools';
        }
        showModal(`${tools.length} tools fetched for "${connName}".`, true);
    } catch (err) {
        showModal(`Fetch Tools error: ${err.message}`, false);
    }
});

// ---- Test button ----
document.getElementById('connectorTestBtn').addEventListener('click', async () => {
    const connName = currentConnector;
    if (!connName) return;
    saveCurrentConnectorToMemory();
    const resolved = resolveConnectorConfig(connName);
    if (!resolved) {
        showModal('Invalid JSON configuration.', false);
        return;
    }
    try {
        // Try to register, list tools, then unregister
        const data = unicodeBtoa(JSON.stringify(resolved));
        eval(`mcp_register_server(\`${data}\`);`);
        const listData = unicodeBtoa(JSON.stringify({ server: resolved.name }));
        const rawResult = eval(`mcp_list_tools(\`${listData}\`);`);
        let result = rawResult;
        if (result && typeof result.then === 'function') result = await result;
        showModal(`Test succeeded for "${connName}"!`, true);
    } catch (err) {
        showModal(`Test failed: ${err.message}`, false);
    }
});

// ---- Copy button: merge enabled tools as JSON to clipboard ----
document.getElementById('connectorCopyBtn').addEventListener('click', async () => {
    const connName = currentConnector;
    if (!connName) return;
    saveCurrentConnectorToMemory();
    const tools = loadConnectorTools(connName);
    const enabledTools = tools.filter(t => t.enabled);
    if (enabledTools.length === 0) {
        showModal('No enabled tools to copy.', false);
        return;
    }
    const cfg = loadConnectorConfig(connName);
    const serverName = cfg?.name || connName.toLowerCase();
    // Build JSON tool definitions
    const jsonTools = enabledTools.map(tool => {
        const def = {
            name: tool.name,
            description: tool.customDescription || tool.description || ''
        };
        if (tool.inputSchema && Object.keys(tool.inputSchema).length > 0) {
            def.inputSchema = tool.inputSchema;
        }
        return def;
    });
    const output = JSON.stringify({
        tools: jsonTools,
        mcp_server: serverName
    }, null, 2);
    try {
        await navigator.clipboard.writeText(output);
        const btn = document.getElementById('connectorCopyBtn');
        const orig = btn.innerHTML;
        btn.innerHTML = '✓';
        setTimeout(() => { btn.innerHTML = orig; }, 1500);
        showModal('JSON tools copied to clipboard!', true);
    } catch (err) {
        showModal('Copy error: ' + err.message, false);
    }
});

// ---- Reset current connector to its default template ----
document.getElementById('connectorResetBtn').addEventListener('click', () => {
    if (!currentConnector) return;
    const resetName = currentConnector;
    const tpl = CONNECTOR_TEMPLATES[resetName];
    if (!tpl) {
        alert('No default template for "' + resetName + '".');
        return;
    }
    if (!confirm('Reset "' + resetName + '" to default template? Saved credentials for this connector will be lost.')) return;
    // Disconnect if connected
    if (connectorStates[resetName]?.connected) {
        connectorStates[resetName].connected = false;
    }
    // Restore config and vars from template, clear tools
    saveConnectorConfig(resetName, tpl.config);
    saveConnectorVars(resetName, tpl.vars);
    saveConnectorTools(resetName, []);
    // Clear currentConnector so switchConnector won't re-save old UI values
    currentConnector = '';
    // Refresh UI
    switchConnector(resetName);
    updateConnectorStatusBar();
});

// ---- Auto-connect connectors listed in session data ----
async function autoConnectSessionConnectors(activeList) {
    if (!activeList || !Array.isArray(activeList)) return;
    for (const name of activeList) {
        if (!connectorNames.includes(name)) continue;
        const resolved = resolveConnectorConfig(name);
        if (!resolved) continue;
        try {
            const data = unicodeBtoa(JSON.stringify(resolved));
            eval(`mcp_register_server(\`${data}\`);`);
            connectorStates[name] = { connected: true };
        } catch (err) {
            console.error(`Auto-connect failed for ${name}:`, err);
            connectorStates[name] = { connected: false };
        }
    }
    updateConnectorStatusBar();
    renderConnectorTabs();
}

// ---- Disconnect all connectors ----
function disconnectAllConnectors() {
    connectorNames.forEach(name => {
        if (connectorStates[name]?.connected) {
            try {
                const cfg = loadConnectorConfig(name);
                if (cfg && cfg.name) {
                    const data = unicodeBtoa(JSON.stringify({ name: cfg.name }));
                    eval(`mcp_remove_server(\`${data}\`);`);
                }
            } catch { /* ignore */ }
            connectorStates[name] = { connected: false };
        }
    });
    updateConnectorStatusBar();
    renderConnectorTabs();
}

// Initialize connectors on page load
initConnectors();


// =============================================
// RIGHT PANEL & LEFT SIDEBAR MANAGEMENT
// =============================================
const leftSidebar = document.getElementById('leftSidebar');
const toggleLeftSidebarBtn = document.getElementById('toggleLeftSidebar');
const rightPanel = document.getElementById('rightPanel');
const rightPanelOverlay = document.getElementById('rightPanelOverlay');
const closeRightPanelBtn = document.getElementById('closeRightPanel');
const rightPanelTitleEl = document.getElementById('rightPanelTitle');
const rightPanelTabBtns = document.querySelectorAll('.right-panel-tab');
const rpTabBtns = document.querySelectorAll('.rp-tab-btn');

const panelTitles = {
    panelSettings: '⚙️ Settings',
    panelPrompts: '📝 System Prompts',
    panelSkills: '🎯 Skills',
    panelUserData: '📊 User Data',
    panelOutput: '📤 Output',
    panelImages: '🖼️ Images',
    panelPdfs: '📄 PDFs',
    panelTools: '🔧 Tools',
    panelConsole: '🖥️ Console',
    panelInit: '⚡ Core',
    panelAgents: '🤖 Agents',
    panelConnectors: '🔌 Connectors'
};

// Panel groups mapping
const panelGroups = {
    prompts: ['panelPrompts', 'panelSkills', 'panelTools', 'panelConnectors'],
    code: ['panelAgents', 'panelConsole', 'panelInit'],
    data: ['panelUserData', 'panelOutput', 'panelImages', 'panelPdfs']
};

// Toggle left sidebar
toggleLeftSidebarBtn.addEventListener('click', () => {
    leftSidebar.classList.toggle('collapsed');
});

// ===== LEFT SIDEBAR RESIZE (right edge) =====
(function() {
    const sb = document.getElementById('leftSidebar');
    const handle = document.getElementById('sidebarResizeHandle');
    let isResizing = false, startX, startW;

    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startW = sb.getBoundingClientRect().width;
        sb.classList.add('resizing');
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const dx = e.clientX - startX;
        const newW = Math.max(180, Math.min(startW + dx, window.innerWidth * 0.5));
        sb.style.width = newW + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            sb.classList.remove('resizing');
            document.body.style.userSelect = '';
        }
    });
})();

// Open right panel to a specific section
function openRightPanel(sectionId) {
    // Hide all sections
    rightPanel.querySelectorAll('.panel-section').forEach(s => {
        s.classList.remove('active');
    });
    // Show target section
    const target = document.getElementById(sectionId);
    if (target) target.classList.add('active');

    // Update title
    rightPanelTitleEl.textContent = panelTitles[sectionId] || 'Panel';

    // Update help/doc buttons in the header
    const rpHelpBtn = document.getElementById('rpHelpBtn');
    const rpDocBtn = document.getElementById('rpDocBtn');
    const helpMap = {
        panelPrompts: 'prompts', panelSkills: 'skills', panelUserData: 'userdata',
        panelOutput: 'output', panelImages: 'images', panelPdfs: 'pdfs', panelTools: 'tools', panelAgents: 'agents', panelConnectors: 'connectors',
        panelConsole: 'console', panelInit: 'init'
    };
    const docMap = { panelAgents: 'agents', panelConsole: 'console' };
    if (helpMap[sectionId]) {
        rpHelpBtn.dataset.help = helpMap[sectionId];
        rpHelpBtn.style.display = '';
    } else {
        rpHelpBtn.style.display = 'none';
    }
    if (docMap[sectionId]) {
        rpDocBtn.dataset.doc = docMap[sectionId];
        rpDocBtn.style.display = '';
    } else {
        rpDocBtn.style.display = 'none';
    }

    // Update tab buttons (top bar)
    rightPanelTabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.panel === sectionId);
    });

    // Update internal tabs
    rpTabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.rpanel === sectionId);
    });

    // Use consistent wide width for all panels
    rightPanel.style.width = 'var(--right-panel-width-wide)';

    // Open panel
    rightPanel.classList.add('open');
    rightPanelOverlay.classList.add('visible');

    // Refresh CodeMirror editors when their section becomes visible
    if (sectionId === 'panelAgents' && typeof agentsEditor !== 'undefined' && agentsEditor) {
        setTimeout(() => agentsEditor.refresh(), 150);
    }
    if (sectionId === 'panelInit' && typeof initializationEditor !== 'undefined' && initializationEditor) {
        setTimeout(() => initializationEditor.refresh(), 150);
    }
    if (sectionId === 'panelConsole' && typeof consoleEditor !== 'undefined' && consoleEditor) {
        setTimeout(() => consoleEditor.refresh(), 150);
        if (typeof codeRunnerEditor !== 'undefined' && codeRunnerEditor) {
            setTimeout(() => codeRunnerEditor.refresh(), 150);
        }
    }
}

// Close right panel
function closeRightPanel() {
    rightPanel.classList.remove('open');
    rightPanelOverlay.classList.remove('visible');
    rightPanel.style.width = '';
    rightPanelTabBtns.forEach(btn => btn.classList.remove('active'));
}

closeRightPanelBtn.addEventListener('click', closeRightPanel);
rightPanelOverlay.addEventListener('click', closeRightPanel);

// ===== RIGHT PANEL RESIZE (left edge) =====
(function() {
    const rp = document.getElementById('rightPanel');
    const handle = document.getElementById('rpResizeHandle');
    let isResizing = false, startX, startW;

    handle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startW = rp.getBoundingClientRect().width;
        rp.style.transition = 'none'; // disable animation during resize
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const dx = startX - e.clientX; // dragging left = wider
        const newW = Math.max(300, Math.min(startW + dx, window.innerWidth - 100));
        rp.style.width = newW + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            rp.style.transition = '';
            document.body.style.userSelect = '';
            // Refresh CodeMirror editors if visible
            if (typeof agentsEditor !== 'undefined' && agentsEditor) agentsEditor.refresh();
            if (typeof initializationEditor !== 'undefined' && initializationEditor) initializationEditor.refresh();
        }
    });
})();

// Top bar panel trigger buttons (Settings)
rightPanelTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const panelId = btn.dataset.panel;
        const targetSection = document.getElementById(panelId);
        if (rightPanel.classList.contains('open') && targetSection && targetSection.classList.contains('active')) {
            closeRightPanel();
        } else {
            document.querySelector('.right-panel-tabs').classList.remove('visible');
            document.querySelectorAll('.panel-group-btn').forEach(g => g.classList.remove('active'));
            openRightPanel(panelId);
        }
    });
});

// Panel group buttons (Prompts, Code, Data)
document.querySelectorAll('.panel-group-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const groupId = btn.dataset.group;
        const groupPanels = panelGroups[groupId];
        if (!groupPanels) return;

        // If panel is open and this group is already active, close
        if (rightPanel.classList.contains('open') && btn.classList.contains('active')) {
            closeRightPanel();
            return;
        }

        // Activate this group button
        document.querySelectorAll('.panel-group-btn').forEach(g => g.classList.remove('active'));
        btn.classList.add('active');
        rightPanelTabBtns.forEach(b => b.classList.remove('active'));

        // Show/hide internal tabs based on group
        const tabsContainer = document.querySelector('.right-panel-tabs');
        tabsContainer.classList.add('visible');
        rpTabBtns.forEach(tab => {
            tab.style.display = (tab.dataset.group === groupId) ? '' : 'none';
        });

        // Keep current panel if it belongs to this group, else open first
        const currentActive = rightPanel.querySelector('.panel-section.active');
        const currentId = currentActive ? currentActive.id : null;
        if (currentId && groupPanels.includes(currentId)) {
            rpTabBtns.forEach(tab => {
                tab.classList.toggle('active', tab.dataset.rpanel === currentId);
            });
            rightPanel.classList.add('open');
            rightPanelOverlay.classList.add('visible');
            rightPanel.style.width = 'var(--right-panel-width-wide)';
        } else {
            openRightPanel(groupPanels[0]);
        }
    });
});

// Internal panel tab buttons
rpTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const panelId = btn.dataset.rpanel;
        openRightPanel(panelId);
    });
});

// Theme toggle
const themeToggleBtn = document.getElementById('themeToggleBtn');
const savedTheme = localStorage.getItem('ta_theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggleBtn.textContent = '☀️ Light';
}
themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeToggleBtn.textContent = isDark ? '☀️ Light' : '🌗 Dark';
    localStorage.setItem('ta_theme', isDark ? 'dark' : 'light');
});

// Display zone toggle
const toggleDisplayZoneBtn = document.getElementById('toggleDisplayZone');
const displayZone = document.getElementById('displayZone');
const savedDzVisible = localStorage.getItem('ta_displayzone_visible');
if (savedDzVisible === 'false') {
    displayZone.style.display = 'none';
}
toggleDisplayZoneBtn.addEventListener('click', () => {
    const isVisible = displayZone.style.display !== 'none';
    displayZone.style.display = isVisible ? 'none' : 'flex';
    localStorage.setItem('ta_displayzone_visible', !isVisible);
});

// Close display zone from within the zone itself
const closeDisplayZoneBtn = document.getElementById('closeDisplayZoneBtn');
if (closeDisplayZoneBtn) {
    closeDisplayZoneBtn.addEventListener('click', () => {
        displayZone.style.display = 'none';
        localStorage.setItem('ta_displayzone_visible', 'false');
    });
}

// ===== SESSION OVERVIEW ZONE (eye button) =====
// Shows prompts / skills / tools / user data as Python definitions
// (theprompts, theskills, thetools, theuserdata) plus the agents code,
// each in an independent collapsible block, with Python syntax highlighting.
(function () {
    const recapZone = document.getElementById('recapZone');
    const recapContent = document.getElementById('recapContent');
    const toggleRecapBtn = document.getElementById('toggleRecapZone');
    const closeRecapBtn = document.getElementById('closeRecapZoneBtn');
    const copyRecapBtn = document.getElementById('copyRecapButton');
    const refreshRecapBtn = document.getElementById('refreshRecapButton');
    if (!recapZone || !toggleRecapBtn) return;

    // Build a valid Python triple-quoted string literal from arbitrary text.
    function pyTriple(s) {
        s = (s == null ? '' : String(s));
        s = s.replace(/\\/g, '\\\\').replace(/"""/g, '\\"\\"\\"');
        // Avoid a trailing quote colliding with the closing """.
        if (s.endsWith('"')) s = s.slice(0, -1) + '\\"';
        return '"""' + s + '"""';
    }

    // Build a Python list assignment: varName = [ "...", "..." ]
    function pyList(varName, values) {
        const items = values
            .map(v => (v == null ? '' : String(v)))
            .filter(v => v.trim() !== '');
        if (items.length === 0) return varName + ' = []';
        const body = items.map(v => '    ' + pyTriple(v)).join(',\n');
        return varName + ' = [\n' + body + '\n]';
    }

    // Collect the current session values from the global state.
    function gatherSession() {
        if (typeof saveCurrentChatPromptsToMemory === 'function') saveCurrentChatPromptsToMemory();
        if (typeof saveCurrentSkillToMemory === 'function') saveCurrentSkillToMemory();
        if (typeof saveCurrentToolToMemory === 'function') saveCurrentToolToMemory();
        if (typeof saveCurrentUserDataToMemory === 'function') saveCurrentUserDataToMemory();
        if (typeof saveCurrentAgentToMemory === 'function') saveCurrentAgentToMemory();

        const prompts = (typeof allChatPrompts !== 'undefined' && allChatPrompts[currentChatTab]) || {};
        const promptVals = (typeof systemPromptTabNames !== 'undefined' ? systemPromptTabNames : []).map(n => prompts[n] || '');
        const skillVals = (typeof skillTabNames !== 'undefined' ? skillTabNames : []).map(n => (allSkillContents[n] || ''));
        const toolVals = (typeof toolTabNames !== 'undefined' ? toolTabNames : []).map(n => (allToolContents[n] || ''));
        const dataVals = (typeof userDataTabNames !== 'undefined' ? userDataTabNames : []).map(n => (allUserDataContents[n] || ''));

        // Agents: raw code of each tab, prefixed by a comment with its name/mode.
        const agentParts = [];
        (typeof agentTabNames !== 'undefined' ? agentTabNames : []).forEach(n => {
            const code = (allAgentContents[n] || '').trim();
            if (code) {
                const mode = (typeof agentModes !== 'undefined' && agentModes[n]) ? agentModes[n] : 'lispe';
                agentParts.push('# ' + n + ' (' + mode + ')\n' + code);
            }
        });

        return {
            prompts: pyList('theprompts', promptVals),
            skills: pyList('theskills', skillVals),
            tools: pyList('thetools', toolVals),
            userdata: pyList('theuserdata', dataVals),
            agents: agentParts.join('\n\n'),
            counts: {
                prompts: promptVals.filter(v => v.trim() !== '').length,
                skills: skillVals.filter(v => v.trim() !== '').length,
                tools: toolVals.filter(v => v.trim() !== '').length,
                userdata: dataVals.filter(v => v.trim() !== '').length,
                agents: agentParts.length
            }
        };
    }

    // Produce a single Python string combining all the session elements.
    function buildFullPython(data) {
        return [
            data.prompts,
            data.skills,
            data.tools,
            data.userdata,
            '# ===== Agents =====\n' + (data.agents || '# (no agent code)')
        ].join('\n\n') + '\n';
    }

    let lastFullPython = '';

    function renderRecap() {
        const data = gatherSession();
        lastFullPython = buildFullPython(data);

        const blocks = [
            { id: 'prompts', title: 'theprompts', code: data.prompts, count: data.counts.prompts, panel: 'panelPrompts' },
            { id: 'skills', title: 'theskills', code: data.skills, count: data.counts.skills, panel: 'panelSkills' },
            { id: 'tools', title: 'thetools', code: data.tools, count: data.counts.tools, panel: 'panelTools' },
            { id: 'userdata', title: 'theuserdata', code: data.userdata, count: data.counts.userdata, panel: 'panelUserData' },
            { id: 'agents', title: 'agents (code)', code: data.agents || '# (no agent code)', count: data.counts.agents, panel: 'panelAgents' }
        ];

        recapContent.innerHTML = blocks.map(b => `
            <div class="recap-block" data-block="${b.id}">
                <div class="recap-block-header">
                    <span class="recap-block-arrow">▼</span>
                    <span class="recap-block-title">${b.title}</span>
                    <span class="recap-block-count">${b.count} item${b.count === 1 ? '' : 's'}</span>
                    <button class="recap-block-jump" data-panel="${b.panel}" title="Open the matching tabs">↗</button>
                </div>
                <div class="recap-block-body">
                    <pre class="language-python"><code class="language-python"></code></pre>
                </div>
            </div>`).join('');

        // Inject code as text (safe) then let Prism highlight it.
        const codeEls = recapContent.querySelectorAll('.recap-block code');
        blocks.forEach((b, i) => { if (codeEls[i]) codeEls[i].textContent = b.code; });
        if (window.Prism) {
            try { Prism.highlightAllUnder(recapContent); } catch (e) { console.error('Prism highlight failed', e); }
        }

        // Wire collapsible headers.
        recapContent.querySelectorAll('.recap-block-header').forEach(h => {
            h.addEventListener('click', () => {
                const blk = h.parentElement;
                blk.classList.toggle('collapsed');
                const arrow = h.querySelector('.recap-block-arrow');
                if (arrow) arrow.textContent = blk.classList.contains('collapsed') ? '▶' : '▼';
            });
        });

        // Wire the per-block "jump to tabs" buttons.
        recapContent.querySelectorAll('.recap-block-jump').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const panelId = btn.dataset.panel;
                if (panelId && typeof openRightPanel === 'function') openRightPanel(panelId);
                closeRecap();
            });
        });
    }

    // Allow other modules (e.g. session switch) to refresh the overview when visible.
    window.refreshRecapIfVisible = function () {
        if (recapZone.style.display === 'flex') renderRecap();
    };

    function openRecap() {
        renderRecap();
        recapZone.style.display = 'flex';
        localStorage.setItem('ta_recapzone_visible', 'true');
    }
    function closeRecap() {
        recapZone.style.display = 'none';
        localStorage.setItem('ta_recapzone_visible', 'false');
    }

    toggleRecapBtn.addEventListener('click', () => {
        if (recapZone.style.display === 'none' || recapZone.style.display === '') openRecap();
        else closeRecap();
    });
    if (closeRecapBtn) closeRecapBtn.addEventListener('click', closeRecap);
    if (refreshRecapBtn) refreshRecapBtn.addEventListener('click', renderRecap);

    if (copyRecapBtn) {
        copyRecapBtn.addEventListener('click', () => {
            const text = lastFullPython || buildFullPython(gatherSession());
            const done = () => {
                const prev = copyRecapBtn.innerHTML;
                copyRecapBtn.textContent = 'Copied!';
                setTimeout(() => { copyRecapBtn.innerHTML = prev; }, 1200);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done).catch(() => {
                    const ta = document.createElement('textarea');
                    ta.value = text; document.body.appendChild(ta); ta.select();
                    try { document.execCommand('copy'); } catch (e) {}
                    document.body.removeChild(ta); done();
                });
            } else {
                const ta = document.createElement('textarea');
                ta.value = text; document.body.appendChild(ta); ta.select();
                try { document.execCommand('copy'); } catch (e) {}
                document.body.removeChild(ta); done();
            }
        });
    }

    // Drag the overview window by its header.
    (function () {
        const header = recapZone.querySelector('.recap-zone-header');
        let dragging = false, sx, sy, sl, st;
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            dragging = true;
            const rect = recapZone.getBoundingClientRect();
            sx = e.clientX; sy = e.clientY; sl = rect.left; st = rect.top;
            recapZone.style.right = 'auto';
            recapZone.style.left = sl + 'px';
            recapZone.style.top = st + 'px';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            let nl = sl + (e.clientX - sx);
            let nt = st + (e.clientY - sy);
            nl = Math.max(0, Math.min(nl, window.innerWidth - 100));
            nt = Math.max(0, Math.min(nt, window.innerHeight - 40));
            recapZone.style.left = nl + 'px';
            recapZone.style.top = nt + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (dragging) { dragging = false; document.body.style.userSelect = ''; }
        });
    })();

    // Custom resize handle (bottom-right corner) — the native CSS resize grip
    // is hidden behind the inner scrollbar, so we provide our own.
    (function () {
        const handle = document.createElement('div');
        handle.className = 'recap-resize-se';
        recapZone.appendChild(handle);
        let resizing = false, sx, sy, sw, sh;
        handle.addEventListener('mousedown', (e) => {
            resizing = true;
            const rect = recapZone.getBoundingClientRect();
            sx = e.clientX; sy = e.clientY; sw = rect.width; sh = rect.height;
            // Anchor by top-left so growth extends down/right.
            recapZone.style.right = 'auto';
            recapZone.style.left = rect.left + 'px';
            recapZone.style.top = rect.top + 'px';
            document.body.style.userSelect = 'none';
            e.preventDefault();
            e.stopPropagation();
        });
        document.addEventListener('mousemove', (e) => {
            if (!resizing) return;
            const nw = Math.max(320, sw + (e.clientX - sx));
            const nh = Math.max(200, sh + (e.clientY - sy));
            recapZone.style.width = nw + 'px';
            recapZone.style.height = nh + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (resizing) { resizing = false; document.body.style.userSelect = ''; }
        });
    })();
})();

// Keyboard shortcut: Escape closes right panel
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && rightPanel.classList.contains('open')) {
        closeRightPanel();
    }
});

// Fix CodeMirror dimensions after initial render
setTimeout(() => {
    if (typeof agentsEditor !== 'undefined' && agentsEditor) agentsEditor.refresh();
    if (typeof initializationEditor !== 'undefined' && initializationEditor) initializationEditor.refresh();
    if (typeof consoleEditor !== 'undefined' && consoleEditor) consoleEditor.refresh();
    if (typeof codeRunnerEditor !== 'undefined' && codeRunnerEditor) codeRunnerEditor.refresh();
}, 500);

// ===== DRAGGABLE & RESIZABLE DISPLAY ZONE =====
(function() {
    const dz = document.getElementById('displayZone');
    const header = dz.querySelector('.display-zone-header');
    let isDragging = false, startX, startY, startLeft, startTop;

    // --- DRAG ---
    header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = dz.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        dz.style.right = 'auto';
        dz.style.left = startLeft + 'px';
        dz.style.top = startTop + 'px';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let newLeft = startLeft + (e.clientX - startX);
        let newTop = startTop + (e.clientY - startY);
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - 100));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - 40));
        dz.style.left = newLeft + 'px';
        dz.style.top = newTop + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) { isDragging = false; document.body.style.userSelect = ''; }
        if (isResizing) { isResizing = false; resizeDir = ''; document.body.style.userSelect = ''; }
    });

    // --- RESIZE from any edge/corner ---
    let isResizing = false, resizeDir = '';
    let rStartX, rStartY, rStartW, rStartH, rStartL, rStartT;
    const MIN_W = 200, MIN_H = 150;

    dz.querySelectorAll('.dz-resize').forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            resizeDir = handle.dataset.resize;
            rStartX = e.clientX;
            rStartY = e.clientY;
            const rect = dz.getBoundingClientRect();
            rStartW = rect.width;
            rStartH = rect.height;
            rStartL = rect.left;
            rStartT = rect.top;
            // Ensure left/top positioning
            dz.style.right = 'auto';
            dz.style.left = rStartL + 'px';
            dz.style.top = rStartT + 'px';
            document.body.style.userSelect = 'none';
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const dx = e.clientX - rStartX;
        const dy = e.clientY - rStartY;
        let newW = rStartW, newH = rStartH, newL = rStartL, newT = rStartT;

        if (resizeDir.includes('e')) newW = Math.max(MIN_W, rStartW + dx);
        if (resizeDir.includes('s')) newH = Math.max(MIN_H, rStartH + dy);
        if (resizeDir.includes('w')) {
            const w = Math.max(MIN_W, rStartW - dx);
            newL = rStartL + (rStartW - w);
            newW = w;
        }
        if (resizeDir.includes('n')) {
            const h = Math.max(MIN_H, rStartH - dy);
            newT = rStartT + (rStartH - h);
            newH = h;
        }

        dz.style.width = newW + 'px';
        dz.style.height = newH + 'px';
        dz.style.left = newL + 'px';
        dz.style.top = newT + 'px';
    });
})();

// =============================================
// HELP (?) BUTTONS & DOC BUTTONS
// =============================================
const helpTexts = {
    prompts: `<h3>System Prompt</h3>
<p>The <strong>System Prompt</strong> section lets you define the instructions sent to the LLM before every conversation. These prompts shape the behavior, tone and expertise of the model.</p>
<ul>
<li><strong>Multiple tabs</strong> – You can split your system prompt across multiple tabs (Sys 0, Sys 1, …). All non-empty tabs are concatenated and sent together.</li>
<li><strong>Load</strong> – Import a text file from disk into the current tab.</li>
<li><strong>Save</strong> – Save the current session (including all prompts) to local storage.</li>
<li><strong>Search</strong> – Full-text search within the current prompt tab.</li>
<li><strong>+</strong> – Add a new prompt tab for additional instructions.</li>
</ul>
<p>Tip: use separate tabs for different concerns (e.g. personality, formatting rules, domain knowledge).</p>`,

    skills: `<h3>Skills</h3>
<p>The <strong>Skills</strong> section stores reusable knowledge blocks or instructions that can be injected into the system prompt.</p>
<ul>
<li>Each tab can hold a separate skill definition (e.g. coding guidelines, data formats, API references).</li>
<li>Skill content is appended to the system prompt when the session is initialized.</li>
<li><strong>Load</strong> – Import a skill from a text file.</li>
<li><strong>Save</strong> – Persist the current session.</li>
<li><strong>Search</strong> – Find text within the current skill tab.</li>
</ul>
<p>Use skills to modularize your prompt engineering – one skill per expertise area.</p>`,

    tools: `<h3>Tools</h3>
<p>The <strong>Tools</strong> section lets you define tool/function descriptions that are sent to the LLM so it can invoke them (function calling).</p>
<ul>
<li>Each tab can hold one or more tool definitions in JSON format.</li>
<li>The LLM uses these definitions to decide when and how to call external functions.</li>
<li><strong>Load</strong> – Import tool definitions from a file.</li>
<li><strong>Search</strong> – Find text within the current tool tab.</li>
</ul>
<p><strong>Important:</strong> You can retrieve tools automatically from the <strong>Connectors</strong> section. Connect to an MCP server, fetch available tools, and use the <em>📋 Copy</em> button to copy them into this Tools section.</p>`,

    userdata: `<h3>User Data</h3>
<p>The <strong>User Data</strong> section allows you to store structured or free-form data that your agents can access during execution.</p>
<ul>
<li>Each tab holds a separate data block (e.g. reference tables, configuration values, example datasets).</li>
<li>Data is accessible from your agent code via dedicated functions.</li>
<li><strong>Load</strong> – Import data from a file.</li>
<li><strong>Search</strong> – Find text in the current data tab.</li>
<li><strong>🗑️</strong> – If more than 5 tabs exist, deletes the tab; otherwise clears its content.</li>
<li><strong>↩</strong> – Undo the last deleted tab.</li>
</ul>
<p>Tip: use User Data to pass context to your agents without cluttering the system prompt.</p>`,

    console: `<h3>Console</h3>
<p>The <strong>Console</strong> provides a live interactive environment to execute code directly.</p>
<ul>
<li><strong>Top area</strong> – Displays output from executed code (print statements, results, errors).</li>
<li><strong>Bottom input</strong> – Type and execute LispE expressions interactively. Press Enter to run.</li>
<li><strong>Code Runner</strong> – A full code editor below the console for writing longer programs.</li>
<li>The Code Runner supports <strong>LispE</strong>, <strong>BasAIc</strong> and <strong>Pythonic</strong> syntax modes (toggle with the mode button).</li>
<li><strong>▶ Run</strong> – Execute the code in the Code Runner.</li>
<li><strong>Compile</strong> – (BasAIc/Pythonic mode) Compile to LispE to inspect the generated code.</li>
</ul>
<p>Use the console to test functions, debug agent logic, or run standalone scripts.</p>`,

    init: `<h3>Initialization</h3>
<p>The <strong>Initialization</strong> section contains LispE code that runs once when you click <strong>Set</strong> (or the bottom ⚙️ Set button).</p>
<ul>
<li>Use it to define helper functions, load libraries, or set up global variables needed by your agents.</li>
<li>Multiple tabs (lib 0, lib 1, …) let you organize initialization code into separate modules.</li>
<li>All tabs are concatenated and executed in order in the LispE interpreter.</li>
<li><strong>Confidential</strong> – A text field for sensitive data accessible from code via <code>getconfidential()</code>.</li>
<li><strong>Secret</strong> – A password field accessible via <code>getsecret()</code>, never displayed in clear.</li>
</ul>
<p>The initialization code is executed in the same interpreter context as your agents, so all defined functions are available.</p>`,

    agents: `<h3>Agents</h3>
<p>The <strong>Agents</strong> section is where you write the core logic that processes LLM interactions.</p>
<ul>
<li><strong><code>entry</code> is the entry point</strong> – You must define a function named <code>entry(prompts)</code>. Every time the user sends a message, this function is called with the full prompt list.</li>
<li>Each user prompt triggers the execution of <code>entry</code>.</li>
<li>Typically, <code>entry</code> calls <code>callchat</code> to send the prompt to the LLM and specifies a callback function (e.g. <code>entrypoint</code>) to process the response.</li>
<li>You can use multiple tabs to organize your code (all tabs are merged before execution).</li>
<li>Three syntax modes are supported: <strong>LispE</strong> (Lisp), <strong>BasAIc</strong> (Basic-like) and <strong>Pythonic</strong> (Python-like).</li>
<li><strong>Set</strong> – Compiles and loads all agent code + initialization into the interpreter.</li>
<li><strong>Compile</strong> – (BasAIc/Pythonic) Preview the generated LispE code.</li>
</ul>

<p>Example (Pythonic):</p>
<pre>defjs entry(prompts):
    callchat(prompts, 'entrypoint')

defjs entrypoint(chat):
    println(chat[-1,"content"])
</pre>

<h4>Built-in: <code>systemprompt()</code></h4>
<p>The function <code>systemprompt()</code> is defined by default in the initialization. It builds the full system prompt by concatenating the system prompts, skills and tools sections:</p>
<pre>def systemprompt():
   aprompt = "\\n".join(theprompts) + "\\n"
   _sk = filterlist([lambda(x) x.trim() != ""], theskills)
   if len(_sk) != 0:
      aprompt += "&lt;skills&gt;\\n" + "\\n".join(_sk) + "&lt;/skills&gt;\\n"

   _tl = filterlist([lambda(x) x.trim() != ""], thetools)
   if len(_tl) != 0:
      aprompt += "&lt;tools&gt;\\n" + "\\n".join(_tl) + "&lt;/tools&gt;\\n"
   return aprompt
</pre>
<p>It filters out empty entries and wraps skills in <code>&lt;skills&gt;</code> tags and tools in <code>&lt;tools&gt;</code> tags. You can override it in your own code if you need a different prompt structure.</p>

`,

    connectors: `<h3>Connectors</h3>
<p>The <strong>Connectors</strong> section lets you connect to external <strong>MCP (Model Context Protocol)</strong> servers to extend your agents with remote tools.</p>
<ul>
<li><strong>MCP Configuration</strong> – Define the server connection: name, transport type (HTTP/SSE/stdio), and URL.</li>
<li><strong>Connect / Disconnect</strong> – Establish or close a connection to the MCP server.</li>
<li><strong>🔍 Fetch</strong> – Retrieve the list of available tools from the connected server.</li>
<li><strong>Credentials 🔒</strong> – Store secrets and environment variables needed for authentication.</li>
<li><strong>MCP Tools</strong> – Browse, enable/disable, and inspect the tools provided by the server.</li>
<li><strong>📋 Copy</strong> – Copy the enabled tools' JSON definitions to the clipboard, ready to paste into the <em>Tools</em> section.</li>
<li><strong>Test</strong> – Verify the connection to the server.</li>
</ul>
<p>Workflow: Configure → Connect → Fetch tools → Enable the ones you need → Copy to the clipboard. Use it in your tool section.</p>`
};

// Show help modal
function showHelpModal(key) {
    const html = helpTexts[key];
    if (!html) return;
    const overlay = document.createElement('div');
    overlay.className = 'help-modal-overlay';
    overlay.innerHTML = '<div class="help-modal"><button class="help-close-btn">✕</button>' + html + '</div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.help-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
}

// Attach click listeners to all help buttons
document.querySelectorAll('.help-btn[data-help]').forEach(btn => {
    btn.addEventListener('click', () => showHelpModal(btn.dataset.help));
});

// Attach click listener to the right-panel header help button (data-help set dynamically)
document.getElementById('rpHelpBtn').addEventListener('click', function() {
    if (this.dataset.help) showHelpModal(this.dataset.help);
});

// =============================================
// DOC BUTTONS – Load and display documentation
// =============================================
const docFiles = {
    agents: [
        { label: 'BasAIc Reference', file: 'BasAIc_reference.md' },
        { label: 'Documentation', file: 'documentation.md' }
    ],
    console: [
        { label: 'BasAIc Reference', file: 'BasAIc_reference.md' },
        { label: 'Documentation', file: 'documentation.md' }
    ]
};

async function fetchDocFile(filename) {
    try {
        const resp = await fetch(API_BASE_URL + '/docs/' + encodeURIComponent(filename));
        if (!resp.ok) throw new Error('Not found');
        const data = await resp.json();
        return data.content || '';
    } catch (e) {
        return '*Documentation file not found.*';
    }
}

async function showDocModal(key) {
    const files = docFiles[key];
    if (!files || files.length === 0) return;

    const overlay = document.createElement('div');
    overlay.className = 'help-modal-overlay';

    // Build tabs
    let tabsHtml = '<div class="doc-tabs">';
    files.forEach((f, i) => {
        tabsHtml += '<button class="doc-tab-btn' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '">' + f.label + '</button>';
    });
    tabsHtml += '</div>';

    // Search bar
    const searchHtml = '<div class="doc-search-bar">' +
        '<input type="text" class="doc-search-input" placeholder="Search in documentation...">' +
        '<span class="doc-search-count"></span>' +
        '<button class="doc-search-prev">▲</button>' +
        '<button class="doc-search-next">▼</button>' +
        '</div>';

    overlay.innerHTML = '<div class="doc-modal"><button class="help-close-btn">✕</button><h3>📖 Documentation</h3>' + tabsHtml + searchHtml + '<div class="doc-content"><p style="color:var(--text-muted);">Loading...</p></div></div>';
    document.body.appendChild(overlay);

    const modal = overlay.querySelector('.doc-modal');
    const contentDiv = modal.querySelector('.doc-content');
    const tabBtns = modal.querySelectorAll('.doc-tab-btn');
    const searchInput = modal.querySelector('.doc-search-input');
    const searchCount = modal.querySelector('.doc-search-count');
    const searchPrevBtn = modal.querySelector('.doc-search-prev');
    const searchNextBtn = modal.querySelector('.doc-search-next');

    // Close
    overlay.querySelector('.help-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    // Cache loaded docs
    const cache = {};

    // Search state
    let searchMatches = [];
    let searchCurrentIdx = -1;

    function clearDocSearchHighlights() {
        contentDiv.querySelectorAll('.doc-search-highlight, .doc-search-highlight-current').forEach(el => {
            const parent = el.parentNode;
            parent.replaceChild(document.createTextNode(el.textContent), el);
            parent.normalize();
        });
        searchMatches = [];
        searchCurrentIdx = -1;
        searchCount.textContent = '';
    }

    function performDocSearch() {
        clearDocSearchHighlights();
        const query = searchInput.value.trim();
        if (!query) return;
        const lowerQuery = query.toLowerCase();

        // Walk text nodes
        const walker = document.createTreeWalker(contentDiv, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        while (walker.nextNode()) {
            if (walker.currentNode.nodeValue.toLowerCase().includes(lowerQuery)) {
                textNodes.push(walker.currentNode);
            }
        }

        textNodes.forEach(node => {
            const text = node.nodeValue;
            const lower = text.toLowerCase();
            const frag = document.createDocumentFragment();
            let lastIdx = 0;
            let idx = lower.indexOf(lowerQuery);
            while (idx !== -1) {
                if (idx > lastIdx) frag.appendChild(document.createTextNode(text.substring(lastIdx, idx)));
                const span = document.createElement('span');
                span.className = 'doc-search-highlight';
                span.textContent = text.substring(idx, idx + query.length);
                frag.appendChild(span);
                lastIdx = idx + query.length;
                idx = lower.indexOf(lowerQuery, lastIdx);
            }
            if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.substring(lastIdx)));
            node.parentNode.replaceChild(frag, node);
        });

        searchMatches = Array.from(contentDiv.querySelectorAll('.doc-search-highlight'));
        if (searchMatches.length > 0) {
            searchCurrentIdx = 0;
            updateDocSearchCurrent();
        } else {
            searchCount.textContent = '0/0';
        }
    }

    function updateDocSearchCurrent() {
        contentDiv.querySelectorAll('.doc-search-highlight-current').forEach(el => {
            el.classList.remove('doc-search-highlight-current');
            el.classList.add('doc-search-highlight');
        });
        if (searchMatches.length > 0 && searchCurrentIdx >= 0) {
            searchMatches[searchCurrentIdx].classList.remove('doc-search-highlight');
            searchMatches[searchCurrentIdx].classList.add('doc-search-highlight-current');
            searchMatches[searchCurrentIdx].scrollIntoView({ behavior: 'smooth', block: 'center' });
            searchCount.textContent = (searchCurrentIdx + 1) + '/' + searchMatches.length;
        }
    }

    searchInput.addEventListener('input', () => performDocSearch());
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchMatches.length === 0) return;
            if (e.shiftKey) {
                searchCurrentIdx = (searchCurrentIdx - 1 + searchMatches.length) % searchMatches.length;
            } else {
                searchCurrentIdx = (searchCurrentIdx + 1) % searchMatches.length;
            }
            updateDocSearchCurrent();
        } else if (e.key === 'Escape') {
            clearDocSearchHighlights();
            searchInput.value = '';
        }
    });
    searchNextBtn.addEventListener('click', () => {
        if (searchMatches.length === 0) return;
        searchCurrentIdx = (searchCurrentIdx + 1) % searchMatches.length;
        updateDocSearchCurrent();
    });
    searchPrevBtn.addEventListener('click', () => {
        if (searchMatches.length === 0) return;
        searchCurrentIdx = (searchCurrentIdx - 1 + searchMatches.length) % searchMatches.length;
        updateDocSearchCurrent();
    });

    async function loadDoc(idx) {
        const f = files[idx];
        tabBtns.forEach((b, j) => b.classList.toggle('active', j === idx));
        clearDocSearchHighlights();
        searchInput.value = '';
        if (cache[f.file]) {
            contentDiv.innerHTML = cache[f.file];
            return;
        }
        contentDiv.innerHTML = '<p style="color:var(--text-muted);">Loading...</p>';
        const md = await fetchDocFile(f.file);
        const rendered = marked.parse(md);
        cache[f.file] = rendered;
        contentDiv.innerHTML = rendered;
    }

    tabBtns.forEach((btn, i) => {
        btn.addEventListener('click', () => loadDoc(i));
    });

    // Load first doc
    await loadDoc(0);
}

// Attach click listeners to doc buttons
document.querySelectorAll('.doc-btn[data-doc]').forEach(btn => {
    btn.addEventListener('click', () => showDocModal(btn.dataset.doc));
});

// Attach click listener to the right-panel header doc button (data-doc set dynamically)
document.getElementById('rpDocBtn').addEventListener('click', function() {
    if (this.dataset.doc) showDocModal(this.dataset.doc);
});

// =============================================
// APP HELP BUTTON – Interface overview with screenshot
// =============================================
document.getElementById('appHelpBtn').addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'help-modal-overlay';
    overlay.innerHTML = `<div class="doc-modal" style="max-width:900px;">
        <button class="help-close-btn">✕</button>
        <h3>📖 Tamed Agents – Interface Overview</h3>
        <div style="text-align:center;margin-bottom:16px;">
            <img src="${API_BASE_URL}/docs/images/TamedAgents.png" alt="Tamed Agents Interface" style="max-width:100%;border-radius:8px;border:1px solid var(--border-color);cursor:pointer;" id="appHelpScreenshot">
        </div>
        <div class="doc-content" style="font-size:13px;">
            <h3>What is Tamed Agents?</h3>
            <p><strong>Tamed Agents</strong> is an <em>agentification framework</em> built on top of a chat interface. It gives you <strong>fine-grained programmatic control</strong> over the data flow to and from Large Language Models (LLMs). Instead of relying solely on prompt engineering, you write lightweight agent code (in LispE, BasAIc or Pythonic syntax) that intercepts, transforms and routes every LLM request and response. This lets you orchestrate multi-step reasoning, chain multiple LLM calls, inject dynamic context, call external tools via MCP connectors, execute Python on the server, and build sophisticated conversational workflows — all while keeping a simple chat experience for the end user.</p>

            <h3>Interface Zones</h3>

            <h4>🧭 Left Sidebar – Session Management</h4>
            <p>Create, save, load, rename, and delete sessions. Switch between sessions via the dropdown list. You can also store sessions to a JSON file and reload them later. The <strong>LLM Server</strong> selector at the bottom lets you choose which backend to use (vLLM, Ollama, LM Studio, Claude, OpenAI, Mistral).</p>

            <h4>💬 Chat Area – Central Zone</h4>
            <p>The main interaction area. Type your messages in the input field at the bottom and press Enter (or click Send). The conversation is displayed above. You have <strong>10 chat tabs</strong> to maintain parallel conversations within the same session. Use <strong>Undo/Redo</strong> (▲/▼) to remove or re-inject messages. The <strong>⚙️ Set</strong> button compiles and loads your Initialization + Agents code.</p>

            <h4>📺 Display Zone – Top Right</h4>
            <p>A resizable output panel where agent code can print results (via <code>println</code>, <code>clean_display()</code>, etc.). It can also render HTML content. Use the search button (🔍) to find text in the output.</p>

            <h4>⚙️ Settings – Right Panel</h4>
            <p>Configure the LLM connection: <strong>Model</strong> selection, <strong>Host</strong> URL, <strong>API Key</strong>, and <strong>Max Tokens</strong>. These settings are saved per server type.</p>

            <h4>📝 Prompts – System Prompt</h4>
            <p>Define the instructions sent to the LLM before every conversation. Multiple tabs (Sys 0, Sys 1, …) let you organize different aspects of your prompt. All non-empty tabs are concatenated.</p>

            <h4>🎯 Skills</h4>
            <p>Reusable knowledge blocks that are appended to the system prompt. Use separate tabs for different expertise areas (coding rules, domain knowledge, formatting, etc.).</p>

            <h4>🔧 Tools</h4>
            <p>Define tool/function descriptions in JSON format for LLM function calling. Tools can be <strong>imported automatically from the Connectors section</strong> (MCP servers).</p>

            <h4>📊 User Data</h4>
            <p>Store structured data accessible by your agents at runtime. Useful for reference tables, examples, or any context you want to pass without cluttering the system prompt.</p>

            <h4>🖥️ Console</h4>
            <p>Interactive code execution environment. The <strong>Console</strong> at the top lets you run single LispE expressions. The <strong>Code Runner</strong> below is a full editor for longer programs, supporting LispE, BasAIc, and Pythonic syntax.</p>

            <h4>⚡ Initialization</h4>
            <p>LispE code executed once when you click <strong>Set</strong>. Define helper functions, load libraries, and set up variables. Includes <strong>Confidential</strong> and <strong>Secret</strong> fields for sensitive data.</p>

            <h4>🤖 Agents</h4>
            <p>The core logic section. Write the code that processes each user message. <strong><code>entry(prompts)</code></strong> is the entry point — it is called every time the user sends a message. Agents support three syntax modes: <strong>LispE</strong>, <strong>BasAIc</strong>, and <strong>Pythonic</strong>.</p>

            <h4>🔌 Connectors</h4>
            <p>Connect to external <strong>MCP servers</strong> to extend your agents with remote tools. Configure the connection, fetch available tools, enable/disable them, and copy their definitions to the Tools section.</p>

            <hr>
            <p style="color:var(--text-muted);font-size:12px;">Click the <strong>?</strong> button in each section's header for more detailed help.</p>
            <p style="color:var(--text-muted);font-size:12px;margin-top:12px;text-align:right;"><em>Claude Roux PhD — claude.roux@naverlabs.com</em></p>
        </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.help-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    // Click image to open in new tab
    const img = overlay.querySelector('#appHelpScreenshot');
    if (img) img.addEventListener('click', () => window.open(img.src, '_blank'));
});

