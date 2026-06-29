# tools_routes.py
# Routes FastAPI pour les proxies MCP et Atlassian/Confluence,
# extraites de app.py via un APIRouter.
# Inclut également des outils FastMCP pour l'accès MCP.
# Inclut un client MCP générique pour se connecter à des serveurs MCP externes.
from fastapi import APIRouter, Request, Query
from fastapi.responses import JSONResponse
from fastmcp import FastMCP, Client
import requests as http_requests
import json
import session_store

tools_router = APIRouter()

# ─── Helper ─────────────────────────────────────────────────────────────────
def _get_session_or_error(session_id: str):
    """Retourne (session, None) ou (None, JSONResponse)."""
    session = session_store.get_session(session_id)
    if session:
        return session, None
    return None, JSONResponse({"status": "error", "message": "Invalid or missing session_id"}, status_code=401)

# ─── Registre des serveurs MCP externes (maintenant par session) ─────────────
# Le registre est stocké dans session.mcp_servers_registry

# ─── FastMCP tools pour les proxies ─────────────────────────────────────────
tools_mcp_tools = []

# ─── Client MCP générique : connexion à des serveurs MCP externes ────────────

@tools_router.get('/mcp_servers')
async def list_mcp_servers(session_id: str = Query("")):
    """Liste les serveurs MCP externes enregistrés pour cette session."""
    session, err = _get_session_or_error(session_id)
    if err:
        return err
    return {"status": "success", "servers": {
        name: {"transport": cfg.get("transport", "http"), "url": cfg.get("url", ""), "command": cfg.get("command", "")}
        for name, cfg in session.mcp_servers_registry.items()
    }}

@tools_router.post('/mcp_servers/register')
async def register_mcp_server(request: Request):
    """Enregistre un serveur MCP externe dans la session."""
    data = await request.json()
    sid = data.get('session_id', '')
    session, err = _get_session_or_error(sid)
    if err:
        return err
    name = data.get('name', '').strip()
    if not name:
        return JSONResponse({"status": "error", "message": "Le champ 'name' est requis."}, status_code=400)
    session.mcp_servers_registry[name] = data
    print(f"[{sid[:8]}][MCP] Serveur '{name}' enregistré ({data.get('transport', 'http')})")
    return {"status": "success", "message": f"Serveur MCP '{name}' enregistré."}

@tools_router.post('/mcp_servers/remove')
async def remove_mcp_server(request: Request):
    """Supprime un serveur MCP externe du registre de la session."""
    data = await request.json()
    sid = data.get('session_id', '')
    session, err = _get_session_or_error(sid)
    if err:
        return err
    name = data.get('name', '').strip()
    if name in session.mcp_servers_registry:
        del session.mcp_servers_registry[name]
        return {"status": "success", "message": f"Serveur MCP '{name}' supprimé."}
    return JSONResponse({"status": "error", "message": f"Serveur '{name}' introuvable."}, status_code=404)

def _build_client(server_config: dict) -> Client:
    """
    Construit un Client FastMCP à partir d'une config de serveur.
    Supporte les transports HTTP (url) et stdio (command + args).
    """
    transport = server_config.get('transport', 'http')
    if transport == 'stdio':
        from fastmcp.client.transports import StdioTransport
        stdio = StdioTransport(
            command=server_config['command'],
            args=server_config.get('args', []),
            env=server_config.get('env')
        )
        return Client(stdio)
    else:
        # HTTP/SSE : passer l'URL directement
        url = server_config.get('url', '')
        return Client(url)

@tools_router.post('/mcp_client/tools')
async def mcp_client_list_tools(request: Request):
    """Liste les outils disponibles sur un serveur MCP externe."""
    data = await request.json()
    sid = data.get('session_id', '')
    session, err = _get_session_or_error(sid)
    if err:
        return err
    server_name = data.get('server', '')
    
    if server_name and server_name in session.mcp_servers_registry:
        config = session.mcp_servers_registry[server_name]
    elif data.get('url'):
        config = {"url": data['url'], "transport": "http"}
    else:
        return JSONResponse({"status": "error", "message": "Fournir 'server' (enregistré) ou 'url'."}, status_code=400)
    
    try:
        client = _build_client(config)
        async with client:
            tools = await client.list_tools()
            return {"status": "success", "tools": [
                {"name": t.name, "description": t.description or "", 
                 "parameters": t.inputSchema if hasattr(t, 'inputSchema') else {}}
                for t in tools
            ]}
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

@tools_router.post('/mcp_client/call')
async def mcp_client_call_tool(request: Request):
    """Appelle un outil sur un serveur MCP externe."""
    data = await request.json()
    sid = data.get('session_id', '')
    session, err = _get_session_or_error(sid)
    if err:
        return err
    server_name = data.get('server', '')
    tool_name = data.get('tool', '')
    arguments = data.get('arguments', {})
    # arguments peut arriver comme string JSON depuis LispE
    if isinstance(arguments, str):
        try:
            arguments = json.loads(arguments)
        except (json.JSONDecodeError, ValueError):
            arguments = {}
    
    if not tool_name:
        return JSONResponse({"status": "error", "message": "Le champ 'tool' est requis."}, status_code=400)
    
    if server_name and server_name in session.mcp_servers_registry:
        config = session.mcp_servers_registry[server_name]
    elif data.get('url'):
        config = {"url": data['url'], "transport": "http"}
    else:
        return JSONResponse({"status": "error", "message": "Fournir 'server' (enregistré) ou 'url'."}, status_code=400)
    
    try:
        client = _build_client(config)
        async with client:
            result = await client.call_tool(tool_name, arguments)
            # Extraire le contenu textuel des résultats
            content = []
            items = result.content if hasattr(result, 'content') else result if isinstance(result, list) else [result]
            for item in items:
                if hasattr(item, 'text'):
                    # Tenter de parser le JSON pour éviter le double-encodage
                    try:
                        content.append(json.loads(item.text))
                    except (json.JSONDecodeError, ValueError):
                        content.append(item.text)
                elif hasattr(item, 'data'):
                    content.append(item.data)
                else:
                    content.append(str(item))
            # Si un seul élément dans la liste, le retourner directement
            if len(content) == 1:
                return {"status": "success", "result": content[0]}
            return {"status": "success", "result": content}
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

@tools_router.post('/mcp_client/resources')
async def mcp_client_list_resources(request: Request):
    """Liste les ressources disponibles sur un serveur MCP externe."""
    data = await request.json()
    sid = data.get('session_id', '')
    session, err = _get_session_or_error(sid)
    if err:
        return err
    server_name = data.get('server', '')
    
    if server_name and server_name in session.mcp_servers_registry:
        config = session.mcp_servers_registry[server_name]
    elif data.get('url'):
        config = {"url": data['url'], "transport": "http"}
    else:
        return JSONResponse({"status": "error", "message": "Fournir 'server' (enregistré) ou 'url'."}, status_code=400)
    
    try:
        client = _build_client(config)
        async with client:
            resources = await client.list_resources()
            return {"status": "success", "resources": [
                {"uri": str(r.uri), "name": r.name or "", "description": r.description or ""}
                for r in resources
            ]}
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

# (tools_mcp_tools already defined above)
