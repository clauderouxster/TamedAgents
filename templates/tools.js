/**
 * Ouvre une URL dans un nouvel onglet du navigateur.
 * data_b64 décodé doit contenir :
 *   - url (string) : l'URL à ouvrir
 *   - label (string, optionnel) : texte du lien affiché dans Display
 */
function open_url(data_b64) {
    const data = parseToolData(data_b64);
    const url = data.url ?? data;
    const label = data.label ?? url;

    // Afficher un lien cliquable dans la zone Display
    const display = document.getElementById('displayOutput');
    if (display) {
        if (display.querySelector('p.text-gray-400')) display.innerHTML = '';
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = label;
        link.style.cssText = 'color: #60a5fa; text-decoration: underline; cursor: pointer; display: block; margin: 4px 0;';
        display.appendChild(link);
        display.scrollTop = display.scrollHeight;
    }

    return unicodeBtoa(JSON.stringify({"status": "success", "url": url}));
}


// Utilitaire : décode le base64 et gère le double-encodage JSON de LispE
function parseToolData(data_b64) {
    let data = JSON.parse(unicodeAtob(data_b64));
    if (typeof data === 'string') {
        data = JSON.parse(data);
    }
    return data;
}

/**
 * Nettoie une page HTML de toutes ses balises pour ne garder que le texte.
 * Entrée : texte HTML encodé en Base64
 * Sortie : texte brut encodé en Base64
 */
function strip_html(html_b64) {
    const html = unicodeAtob(html_b64);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body.textContent || '';
    return unicodeBtoa(text);
}


// ─── Client MCP générique : connexion à des serveurs MCP externes ───────────

/**
 * Enregistre un serveur MCP externe dans le registre backend.
 * data_b64 décodé doit contenir :
 *   - name      (string) : nom unique du serveur (ex: "gmail", "github")
 *   - transport (string) : "http" ou "stdio"
 *   Pour http :
 *     - url (string) : URL du serveur MCP (ex: "http://localhost:8811/mcp")
 *   Pour stdio :
 *     - command (string) : commande à exécuter (ex: "npx", "python")
 *     - args (array)     : arguments de la commande
 *     - env (object, opt): variables d'environnement supplémentaires
 */
async function mcp_register_server(data_b64) {
    const data = parseToolData(data_b64);

    const response = await fetch(`${API_BASE_URL}/mcp_servers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await response.json();
    return unicodeBtoa(JSON.stringify(result));
}


/**
 * Supprime un serveur MCP externe du registre.
 * data_b64 décodé doit contenir :
 *   - name (string) : nom du serveur à supprimer
 */
async function mcp_remove_server(data_b64) {
    const data = parseToolData(data_b64);

    const response = await fetch(`${API_BASE_URL}/mcp_servers/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name })
    });

    const result = await response.json();
    return unicodeBtoa(JSON.stringify(result));
}


/**
 * Liste les serveurs MCP externes enregistrés.
 * Aucun paramètre requis (data_b64 peut être vide ou "{}").
 */
async function mcp_list_servers(data_b64) {
    const response = await fetch(`${API_BASE_URL}/mcp_servers`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    });

    const result = await response.json();
    return unicodeBtoa(JSON.stringify(result));
}


/**
 * Liste les outils disponibles sur un serveur MCP externe.
 * data_b64 décodé doit contenir :
 *   - server (string) : nom du serveur enregistré, OU
 *   - url    (string) : URL directe du serveur MCP
 */
async function mcp_list_tools(data_b64) {
    const data = parseToolData(data_b64);

    const response = await fetch(`${API_BASE_URL}/mcp_client/tools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await response.json();
    return unicodeBtoa(JSON.stringify(result));
}


/**
 * Appelle un outil sur un serveur MCP externe et retourne le résultat.
 * data_b64 décodé doit contenir :
 *   - server    (string) : nom du serveur enregistré, OU
 *   - url       (string) : URL directe du serveur MCP
 *   - tool      (string) : nom de l'outil à appeler
 *   - arguments (object) : arguments de l'outil
 */
async function mcp_call_tool(data_b64) {
    const data = parseToolData(data_b64);

    const response = await fetch(`${API_BASE_URL}/mcp_client/call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await response.json();
    return unicodeBtoa(JSON.stringify(result));
}


/**
 * Liste les ressources disponibles sur un serveur MCP externe.
 * data_b64 décodé doit contenir :
 *   - server (string) : nom du serveur enregistré, OU
 *   - url    (string) : URL directe du serveur MCP
 */
async function mcp_list_resources(data_b64) {
    const data = parseToolData(data_b64);

    const response = await fetch(`${API_BASE_URL}/mcp_client/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await response.json();
    return unicodeBtoa(JSON.stringify(result));
}
