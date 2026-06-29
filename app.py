# app.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse, HTMLResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import sys
import os
import requests # Nécessaire pour les types d'exception de requests
import io
import time
import uvicorn
import feedparser
from fastmcp import FastMCP

# Ajoute le répertoire contenant filters.py, predicate.py et llm_client.py au chemin Python
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    import filters
    import predicate
    import call_ollama 
    import call_lmstudio
    import call_vllm
    import call_claude
    import call_mistral
except ImportError as e:
    print(f"Erreur lors de l'importation de filters, predicate ou call_ollama: {e}")
    print("Veuillez vous assurer que 'filters.py', 'predicate.py' et 'llm_client.py' sont dans le même répertoire que 'app.py'.")
    sys.exit(1)

import importlib
import logging

# Configure logging — resilient to closed terminals (SSH disconnect)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stderr)],
)
logger = logging.getLogger("tamed_agents")

# Wrap stdout/stderr so that writes to a closed PTY (after SSH disconnect)
# are silently ignored instead of raising OSError [Errno 5] Input/output error
class _SafeWriter:
    """Wraps a stream and swallows OSError (errno 5 / EIO) on write/flush."""
    def __init__(self, stream):
        self._stream = stream

    def write(self, data):
        try:
            self._stream.write(data)
        except OSError:
            pass

    def flush(self):
        try:
            self._stream.flush()
        except OSError:
            pass

    def __getattr__(self, name):
        return getattr(self._stream, name)

sys.stdout = _SafeWriter(sys.stdout)
sys.stderr = _SafeWriter(sys.stderr)

class LLMClient:
    """
    Une classe unifiée pour interagir avec différents serveurs LLM (Ollama, LM Studio, OpenAI).
    Chaque instance stocke ses propres host/api_key/max_tokens sans toucher aux globals des modules.
    """

    _VALID_SERVERS = ("ollama", "lmstudio", "openai", "vllm", "claude", "mistral")

    def __init__(self, server_type: str):
        self.server_type = server_type.lower()
        self.module = None

        if self.server_type not in self._VALID_SERVERS:
            raise ValueError(f"Type de serveur non supporté: '{server_type}'. Options: {', '.join(self._VALID_SERVERS)}.")

        module_name = f"call_{self.server_type}"
        try:
            self.module = importlib.import_module(module_name)
        except ImportError as e:
            raise ImportError(f"Le module '{module_name}.py' est introuvable. Erreur: {e}")

        # Capture les valeurs par défaut du module comme état d'instance
        self.host = self._mod_get("get_host", "")
        self.api_key = self._mod_get("get_key", "")
        self.max_tokens = self._mod_get("get_max_tokens", 4096)

        print(f"Client LLM initialisé pour le serveur: {self.server_type}")

    def _mod_get(self, func_name, default):
        """Appelle une fonction du module si elle existe, sinon retourne default."""
        fn = getattr(self.module, func_name, None)
        return fn() if fn else default

    def _get_function(self, func_name: str):
        if not hasattr(self.module, func_name):
            raise AttributeError(f"La fonction '{func_name}' n'est pas trouvée dans le module pour '{self.server_type}'.")
        return getattr(self.module, func_name)

    def get_server_type(self):
        return self.server_type

    def call_llm(self, model, system_prompt, prompt):
        func = self._get_function("call_llm")
        return func(model, system_prompt, prompt)

    def call_llm_chat(self, model, messages, tools=None, llm_params=None):
        func = self._get_function("call_llm_chat")
        return func(model, messages, tools=tools, llm_params=llm_params,
                     host=self.host, api_key=self.api_key, max_tokens=self.max_tokens)

    def list_models(self):
        func = self._get_function("list_models")
        return func(host=self.host, api_key=self.api_key)

    def get_max_tokens(self):
        return self.max_tokens

    def set_max_tokens(self, mx):
        self.max_tokens = int(mx)

    def get_host(self):
        return self.host

    def set_host(self, hst):
        self.host = hst

    def get_key(self):
        return self.api_key

    def set_key(self, key):
        self.api_key = key

# ─── Session store ──────────────────────────────────────────────────────────
import session_store
session_store.set_llm_client_factory(lambda: LLMClient("ollama"))

# Capture default values for each server type at startup (read-only)
_server_defaults = {}
for _st in LLMClient._VALID_SERVERS:
    try:
        _tmp = LLMClient(_st)
        _defaults = {
            "host": _tmp.get_host(),
            "max_tokens": _tmp.get_max_tokens(),
            "api_key": _tmp.get_key(),
        }
        try:
            _defaults["default_model"] = _tmp._get_function("get_model")()
        except (AttributeError, Exception):
            _defaults["default_model"] = ""
        _defaults["temperature"] = ""
        _defaults["top_p"] = ""
        _defaults["presence_penalty"] = ""
        _defaults["llm_max_tokens"] = ""
        _server_defaults[_st] = _defaults
    except Exception:
        _server_defaults[_st] = {
            "host": "", "max_tokens": 4096, "api_key": "",
            "default_model": "", "temperature": "", "top_p": "",
            "presence_penalty": "", "llm_max_tokens": ""
        }

app = FastAPI()

# ─── Helper: extract session from request ───────────────────────────────────
from fastapi import Query

def _get_session(session_id: str):
    """Return SessionState or None."""
    return session_store.get_session(session_id)

def _session_error():
    return JSONResponse({"status": "error", "message": "Invalid or missing session_id"}, status_code=401)

# ─── FastMCP Server ─────────────────────────────────────────────────────────
mcp = FastMCP("Tamed Agents")

@mcp.tool()
def chat_with_llm(messages: list[dict], model: str = "", system_prompt: str = "", tools: list[dict] | None = None, session_id: str = "") -> str:
    """
    Envoie une conversation au LLM et retourne la réponse complète.
    messages: liste de dicts {"role": "user"|"assistant"|"system", "content": "..."}
    model: nom du modèle (vide = modèle par défaut)
    system_prompt: prompt système optionnel (ajouté en premier)
    tools: liste optionnelle de définitions d'outils JSON pour function-calling
    session_id: identifiant de session (obligatoire)
    """
    session = _get_session(session_id)
    if not session:
        return "ERROR: Invalid or missing session_id"
    with session.lock:
        model_name = model or session.default_model
        msgs = []
        if system_prompt:
            msgs.append({"role": "system", "content": system_prompt})
        elif session.system_prompt:
            msgs.append({"role": "system", "content": session.system_prompt})
        msgs.extend(messages)
        result_chunks = []
        for chunk in session.llm_client.call_llm_chat(model=model_name, messages=msgs, tools=tools):
            result_chunks.append(chunk)
        return "".join(result_chunks)

@mcp.tool()
def list_models(session_id: str = "") -> list[str]:
    """Liste les modèles disponibles sur le serveur LLM actuellement configuré."""
    session = _get_session(session_id)
    if not session:
        return ["ERROR: Invalid or missing session_id"]
    with session.lock:
        return session.llm_client.list_models()

@mcp.tool()
def switch_llm_server(server_type: str, session_id: str = "") -> str:
    """
    Change le type de serveur LLM.
    server_type: 'ollama', 'lmstudio', 'openai', 'vllm', 'claude' ou 'mistral'
    """
    session = _get_session(session_id)
    if not session:
        return "ERROR: Invalid or missing session_id"
    with session.lock:
        if server_type in LLMClient._VALID_SERVERS:
            session.llm_client = LLMClient(server_type)
            return f"Serveur LLM changé vers '{server_type}'."
        return f"Type de serveur non supporté: '{server_type}'"

@mcp.tool()
def get_server_info(session_id: str = "") -> dict:
    """
    Retourne les informations de connexion au serveur LLM actuel.
    Inclut: server_type, host, max_tokens, model par défaut.
    """
    session = _get_session(session_id)
    if not session:
        return {"error": "Invalid or missing session_id"}
    with session.lock:
        return {
            "server_type": session.llm_client.get_server_type(),
            "host": session.llm_client.get_host(),
            "max_tokens": session.llm_client.get_max_tokens(),
            "default_model": session.default_model
        }

@mcp.tool()
def run_python(code: str) -> dict:
    """
    Exécute du code Python et retourne le résultat.
    Retourne un dict avec: status, result, stdout, stderr.
    """
    import traceback
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    captured_out = io.StringIO()
    captured_err = io.StringIO()
    try:
        lines = code.rstrip().split('\n')
        last_line = lines[-1].strip()
        body = '\n'.join(lines[:-1]) if len(lines) > 1 else ''
        exec_globals = {}
        sys.stdout = captured_out
        sys.stderr = captured_err
        result_value = None
        try:
            compiled_expr = compile(last_line, '<expr>', 'eval')
            if body.strip():
                exec(body, exec_globals)
            result_value = eval(compiled_expr, exec_globals)
        except SyntaxError:
            exec(code, exec_globals)
            result_value = None
        return {
            "status": "success",
            "result": str(result_value) if result_value is not None else "",
            "stdout": captured_out.getvalue(),
            "stderr": captured_err.getvalue()
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc(),
            "stdout": captured_out.getvalue(),
            "stderr": captured_err.getvalue()
        }
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr

@mcp.tool()
def extract_code_blocks(text: str) -> dict:
    """
    Extrait les blocs de code d'un texte (réponse LLM typiquement).
    Retourne un dict avec les blocs extraits.
    """
    extracted_list = filters.extract_structure(text)
    if extracted_list:
        return {"status": "success", "extracted_codes": {"python": extracted_list}}
    return {"status": "no_code_found", "message": "Aucun bloc de code trouvé."}

@mcp.tool()
def run_shell(command: str, timeout: int = 30) -> dict:
    """
    Exécute une commande shell et retourne le résultat.
    command: la commande shell à exécuter
    timeout: délai d'attente en secondes (défaut: 30)
    Retourne un dict avec: status, stdout, stderr, return_code
    """
    import subprocess
    import shlex
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        return {
            "status": "success",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "return_code": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            "status": "error",
            "error": f"La commande a dépassé le délai de {timeout} secondes.",
            "stdout": "",
            "stderr": "",
            "return_code": -1
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "stdout": "",
            "stderr": "",
            "return_code": -1
        }

# Monte le serveur MCP SSE sur l'app FastAPI
app.mount("/mcp_server", mcp.http_app())

# Active CORS pour toutes les origines et toutes les routes par défaut
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Session management endpoint ────────────────────────────────────────────
@app.post('/create_session')
async def create_session_endpoint():
    """Crée une nouvelle session et retourne son UUID."""
    sid = session_store.create_session()
    print(f"[session] Nouvelle session créée: {sid}")
    return {"status": "success", "session_id": sid}

# Variable globale pour stocker le prompt système
# (supprimée — maintenant dans SessionState)

# Variable globale pour stocker le nom du modèle Ollama par défaut
# (supprimée — maintenant dans SessionState)

serve_html = 'server' in sys.argv

# Mount the templates directory for static HTML serving
templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')

@app.get('/')
async def index():
    """Sert la page HTML principale si le mode server est activé."""
    if serve_html:
        return FileResponse(os.path.join(templates_dir, 'index.html'), media_type='text/html')
    return JSONResponse({"status": "error", "message": "HTML serving disabled. Launch with 'server' argument."}, status_code=403)

@app.get('/index.htm')
async def index_htm():
    """Sert la page index.htm (même contenu que index.html)."""
    if serve_html:
        return FileResponse(os.path.join(templates_dir, 'index.html'), media_type='text/html')
    return JSONResponse({"status": "error", "message": "HTML serving disabled. Launch with 'server' argument."}, status_code=403)

@app.get('/style.css')
async def serve_style_css():
    """Sert le fichier CSS de l'application."""
    return FileResponse(os.path.join(templates_dir, 'style.css'), media_type='text/css')

@app.get('/app.js')
async def serve_app_js():
    """Sert le fichier JavaScript de l'application (legacy)."""
    return FileResponse(os.path.join(templates_dir, 'app.js'), media_type='application/javascript')

@app.get('/app-core.js')
async def serve_app_core_js():
    return FileResponse(os.path.join(templates_dir, 'app-core.js'), media_type='application/javascript')

@app.get('/app-search-api.js')
async def serve_app_search_api_js():
    return FileResponse(os.path.join(templates_dir, 'app-search-api.js'), media_type='application/javascript')

@app.get('/app-server.js')
async def serve_app_server_js():
    return FileResponse(os.path.join(templates_dir, 'app-server.js'), media_type='application/javascript')

@app.get('/app-chat.js')
async def serve_app_chat_js():
    return FileResponse(os.path.join(templates_dir, 'app-chat.js'), media_type='application/javascript')

@app.get('/app-sessions.js')
async def serve_app_sessions_js():
    return FileResponse(os.path.join(templates_dir, 'app-sessions.js'), media_type='application/javascript')

@app.get('/app-tabs.js')
async def serve_app_tabs_js():
    return FileResponse(os.path.join(templates_dir, 'app-tabs.js'), media_type='application/javascript')

@app.get('/app-agents.js')
async def serve_app_agents_js():
    return FileResponse(os.path.join(templates_dir, 'app-agents.js'), media_type='application/javascript')

@app.get('/app-editors.js')
async def serve_app_editors_js():
    return FileResponse(os.path.join(templates_dir, 'app-editors.js'), media_type='application/javascript')

@app.get('/app-connectors-ui.js')
async def serve_app_connectors_ui_js():
    return FileResponse(os.path.join(templates_dir, 'app-connectors-ui.js'), media_type='application/javascript')

# Répertoires pour les fichiers statiques supplémentaires
base_dir = os.path.dirname(os.path.abspath(__file__))
lispe_dir = os.path.join(base_dir, 'lispe')

'''
@app.get('/tools.js')
async def serve_tools_js():
    """Sert le fichier tools.js."""
    return FileResponse(os.path.join(base_dir, 'template/tools.js'), media_type='application/javascript')
'''

@app.get('/lispe/{filename}')
async def serve_lispe_file(filename: str):
    """Sert les fichiers du répertoire lispe/ (JS et WASM)."""
    import re
    if not re.match(r'^[\w\-. ]+\.(js|wasm)$', filename, re.IGNORECASE):
        return JSONResponse({"status": "error", "message": "Invalid filename"}, status_code=400)
    filepath = os.path.join(lispe_dir, filename)
    filepath = os.path.realpath(filepath)
    if not filepath.startswith(os.path.realpath(lispe_dir)):
        return JSONResponse({"status": "error", "message": "Access denied"}, status_code=403)
    if not os.path.isfile(filepath):
        return JSONResponse({"status": "error", "message": "File not found"}, status_code=404)
    ext = filename.rsplit('.', 1)[-1].lower()
    media_types = {'js': 'application/javascript', 'wasm': 'application/wasm'}
    return FileResponse(filepath, media_type=media_types.get(ext, 'application/octet-stream'))

# Route to serve documentation markdown files
docs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')

@app.get('/docs/images/{filename}')
async def serve_doc_image(filename: str):
    """Serves an image file from the docs/ directory."""
    import re
    if not re.match(r'^[\w\-. ]+\.(png|jpg|jpeg|gif|svg|webp)$', filename, re.IGNORECASE):
        return JSONResponse({"status": "error", "message": "Invalid filename"}, status_code=400)
    filepath = os.path.join(docs_dir, filename)
    filepath = os.path.realpath(filepath)
    if not filepath.startswith(os.path.realpath(docs_dir)):
        return JSONResponse({"status": "error", "message": "Access denied"}, status_code=403)
    if not os.path.isfile(filepath):
        return JSONResponse({"status": "error", "message": "File not found"}, status_code=404)
    ext = filename.rsplit('.', 1)[-1].lower()
    media_types = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif', 'svg': 'image/svg+xml', 'webp': 'image/webp'}
    return FileResponse(filepath, media_type=media_types.get(ext, 'application/octet-stream'))

@app.get('/docs/{filename}')
async def serve_doc_file(filename: str):
    """Serves a markdown documentation file from the docs/ directory."""
    import re
    if not re.match(r'^[\w\-. ]+\.md$', filename):
        return JSONResponse({"status": "error", "message": "Invalid filename"}, status_code=400)
    filepath = os.path.join(docs_dir, filename)
    filepath = os.path.realpath(filepath)
    if not filepath.startswith(os.path.realpath(docs_dir)):
        return JSONResponse({"status": "error", "message": "Access denied"}, status_code=403)
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        return {"status": "success", "content": content}
    except FileNotFoundError:
        return JSONResponse({"status": "error", "message": "File not found"}, status_code=404)

@app.post('/set_system_prompt')
async def set_system_prompt(request: Request):
    """Endpoint pour définir le prompt système de la session."""
    data = await request.json()
    sid = data.get('session_id', '')
    session = _get_session(sid)
    if not session:
        return _session_error()
    system_prompt = data.get('prompt', '')
    session.system_prompt = system_prompt
    print(f"[{sid[:8]}] Prompt système mis à jour vers: '{session.system_prompt}'")
    return {"status": "success", "message": "Prompt système mis à jour."}

@app.get('/get_system_prompt')
async def get_system_prompt(session_id: str = Query("")):
    """Endpoint pour obtenir le prompt système de la session."""
    session = _get_session(session_id)
    if not session:
        return _session_error()
    return {"system": session.system_prompt}

@app.get('/get_default_model')
async def get_default_model(session_id: str = Query("")):
    """Endpoint pour obtenir le nom du modèle par défaut."""
    session = _get_session(session_id)
    if not session:
        return _session_error()
    return {"default_model": session.default_model}

@app.post('/set_default_model')
async def set_default_model(request: Request):
    """Endpoint pour définir le nom du modèle par défaut."""
    data = await request.json()
    sid = data.get('session_id', '')
    session = _get_session(sid)
    if not session:
        return _session_error()
    model_name = data.get('model_name', '').strip()
    if model_name:
        session.default_model = model_name
        print(f"[{sid[:8]}] Modèle par défaut mis à jour vers: '{session.default_model}'")
        return {"status": "success", "message": f"Modèle par défaut mis à jour vers '{session.default_model}'."}
    else:
        return JSONResponse({"status": "error", "message": "Nom de modèle non valide fourni."}, status_code=400)

@app.get('/list_ollama_models')
async def list_ollama_models(session_id: str = Query("")):
    """Endpoint pour lister les modèles Ollama disponibles."""
    session = _get_session(session_id)
    if not session:
        return _session_error()
    try:
        models = session.llm_client.list_models()
        return {"status": "success", "models": models}
    except requests.exceptions.ConnectionError as e:
        error_message = f"Erreur de connexion à Ollama: {e}"
        print(error_message)
        return JSONResponse({"status": "error", "message": error_message}, status_code=500)
    except Exception as e:
        error_message = f"Erreur inattendue lors de la liste des modèles Ollama: {e}"
        print(error_message)
        return JSONResponse({"status": "error", "message": error_message}, status_code=500)

@app.get('/list_vllm_models')
async def list_vllm_models(session_id: str = Query("")):
    """Endpoint pour lister les modèles vLLM disponibles."""
    session = _get_session(session_id)
    if not session:
        return _session_error()
    try:
        models = session.llm_client.list_models()
        return {"status": "success", "models": models}
    except requests.exceptions.ConnectionError as e:
        error_message = f"Erreur de connexion à vLLM: {e}"
        print(error_message)
        return JSONResponse({"status": "error", "message": error_message}, status_code=500)
    except Exception as e:
        error_message = f"Erreur inattendue lors de la liste des modèles vLLM: {e}"
        print(error_message)
        return JSONResponse({"status": "error", "message": error_message}, status_code=500)

@app.get('/list_lmstudio_models')
async def list_lmstudio_models(session_id: str = Query("")):
    """Endpoint pour lister les modèles LM Studio disponibles."""
    session = _get_session(session_id)
    if not session:
        return _session_error()
    try:
        models = session.llm_client.list_models()
        return {"status": "success", "models": models}
    except requests.exceptions.ConnectionError as e:
        error_message = f"Erreur de connexion à LM Studio: {e}"
        print(error_message)
        return JSONResponse({"status": "error", "message": error_message}, status_code=500)
    except Exception as e:
        error_message = f"Erreur inattendue lors de la liste des modèles LM Studio: {e}"
        print(error_message)
        return JSONResponse({"status": "error", "message": error_message}, status_code=500)

@app.get('/list_claude_models')
async def list_claude_models(session_id: str = Query("")):
    """Endpoint pour lister les modèles Claude disponibles."""
    session = _get_session(session_id)
    if not session:
        return _session_error()
    try:
        models = session.llm_client.list_models()
        return {"status": "success", "models": models}
    except Exception as e:
        error_message = f"Erreur inattendue lors de la liste des modèles Claude: {e}"
        print(error_message)
        return JSONResponse({"status": "error", "message": error_message}, status_code=500)

@app.get('/list_openai_models')
async def list_openai_models(session_id: str = Query("")):
    """Endpoint pour lister les modèles OpenAI disponibles."""
    session = _get_session(session_id)
    if not session:
        return _session_error()
    try:
        models = session.llm_client.list_models()
        return {"status": "success", "models": models}
    except Exception as e:
        error_message = f"Erreur inattendue lors de la liste des modèles OpenAI: {e}"
        print(error_message)
        return JSONResponse({"status": "error", "message": error_message}, status_code=500)

@app.get('/list_mistral_models')
async def list_mistral_models(session_id: str = Query("")):
    """Endpoint pour lister les modèles Mistral disponibles."""
    session = _get_session(session_id)
    if not session:
        return _session_error()
    try:
        models = session.llm_client.list_models()
        return {"status": "success", "models": models}
    except Exception as e:
        error_message = f"Erreur inattendue lors de la liste des modèles Mistral: {e}"
        print(error_message)
        return JSONResponse({"status": "error", "message": error_message}, status_code=500)


@app.post('/chat')
async def chat(request: Request):
    """
    Endpoint pour gérer les messages de chat utilisateur, les envoyer au LLM
    et renvoyer la réponse en streaming.
    """
    data = await request.json()
    sid = data.get('session_id', '')
    session = _get_session(sid)
    if not session:
        return _session_error()

    messages_from_frontend = data.get('messages')
    model_name = data.get('model_name', session.default_model)
    tools_from_frontend = data.get('tools')
    llm_params = data.get('llm_params')

    if not messages_from_frontend:
        return JSONResponse({"error": "No messages provided"}, status_code=400)

    messages_for_ollama = []
    if session.system_prompt:
        messages_for_ollama.append({"role": "system", "content": session.system_prompt})
    messages_for_ollama.extend(messages_from_frontend)

    def generate_stream_chunks():
        """Générateur qui récupère les morceaux du stream du LLM et les renvoie."""
        try:
            for chunk in session.llm_client.call_llm_chat(model=model_name, messages=messages_for_ollama, tools=tools_from_frontend, llm_params=llm_params):
                if chunk is not None:
                    yield chunk # Génère le morceau de contenu brut
        except requests.exceptions.ConnectionError as e:
            error_message = f"Erreur de connexion: Impossible d'établir une connexion. Vérifiez si le serveur LLM est en cours d'exécution et si les pare-feu autorisent la connexion. Détails: {e}"
            print(error_message)
            yield f"ERROR: {error_message}" # Envoie l'erreur au client
        except requests.exceptions.Timeout as e:
            error_message = f"Erreur de délai d'attente avec Ollama: La requête a expiré. Le serveur est-il surchargé ou le réseau est-il lent ? Détails: {e}"
            print(error_message)
            yield f"ERROR: {error_message}"
        except requests.exceptions.HTTPError as e:
            error_message = f"Erreur HTTP: Le serveur a renvoyé une erreur de statut {e.response.status_code}. Vérifiez le modèle '{model_name}' est disponible. Détails: {e}"
            print(error_message)
            yield f"ERROR: {error_message}"
        except requests.exceptions.RequestException as e:
            error_message = f"Erreur générale de requête avec Ollama: Une erreur inattendue s'est produite lors de la communication. Détails: {e}"
            print(error_message)
            yield f"ERROR: {error_message}"
        except Exception as e:
            error_message = f"Une erreur inattendue s'est produite: {e}"
            print(error_message)
            yield f"ERROR: {error_message}"

    # Retourne une réponse en streaming
    return StreamingResponse(generate_stream_chunks(), media_type='text/plain')


@app.post('/chat_with_config')
async def chat_with_config(request: Request):
    """
    Endpoint pour appeler un LLM avec une configuration serveur explicite,
    sans toucher au llm_client global. Permet des appels parallèles sur
    des serveurs/modèles différents.
    Attend: server_type, host, api_key, messages, model_name, tools, llm_params, max_tokens
    """
    data = await request.json()
    server_type = data.get('server_type')
    host = data.get('host', '')
    api_key = data.get('api_key', '')
    max_tokens = data.get('max_tokens')
    messages_from_frontend = data.get('messages')
    model_name = data.get('model_name', '')
    tools_from_frontend = data.get('tools')
    llm_params = data.get('llm_params')

    if not server_type:
        return JSONResponse({"error": "No server_type provided"}, status_code=400)
    if not messages_from_frontend:
        return JSONResponse({"error": "No messages provided"}, status_code=400)

    # Create an ephemeral LLMClient for this request
    try:
        ephemeral_client = LLMClient(server_type)
    except (ValueError, ImportError) as e:
        return JSONResponse({"error": str(e)}, status_code=400)

    # Configure the ephemeral client
    if host:
        try:
            ephemeral_client.set_host(host)
        except Exception:
            pass
    if api_key:
        try:
            ephemeral_client.set_key(api_key)
        except Exception:
            pass
    if max_tokens:
        try:
            ephemeral_client.set_max_tokens(int(max_tokens))
        except Exception:
            pass

    messages_for_llm = list(messages_from_frontend)

    def generate_stream_chunks():
        try:
            for chunk in ephemeral_client.call_llm_chat(model=model_name, messages=messages_for_llm, tools=tools_from_frontend, llm_params=llm_params):
                if chunk is not None:
                    yield chunk
        except requests.exceptions.ConnectionError as e:
            yield f"ERROR: Connection error: {e}"
        except requests.exceptions.Timeout as e:
            yield f"ERROR: Timeout: {e}"
        except requests.exceptions.HTTPError as e:
            yield f"ERROR: HTTP error {e.response.status_code}: {e}"
        except requests.exceptions.RequestException as e:
            yield f"ERROR: Request error: {e}"
        except Exception as e:
            yield f"ERROR: Unexpected error: {e}"

    return StreamingResponse(generate_stream_chunks(), media_type='text/plain')


@app.post('/extract_code')
async def extract_code(request: Request):
    """
    Endpoint pour extraire les blocs de code du texte en utilisant le fichier filters.py fourni.
    """
    data = await request.json()
    text_to_filter = data.get('text', '')

    extracted_codes = {}
    
    extracted_list = filters.extract_structure(text_to_filter)
    if extracted_list:
        extracted_codes["python"] = extracted_list

    if not extracted_codes:
        return {"status": "no_code_found", "message": "Aucun bloc de code trouvé."}
    
    return {"status": "success", "extracted_codes": extracted_codes}

'''
@app.post('/execute_python')
async def execute_python(request: Request):
    """
    Endpoint pour exécuter la concaténation du fichier de contexte Python et du code extrait.
    La sortie de l'exécution est transmise en streaming.
    Utilise un fichier temporaire pour éviter les problèmes de namespace avec exec().
    """
    data = await request.json()
    context_code = data.get('context_code', '')
    extracted_code = data.get('extracted_code', '')

    combined_code = context_code + "\n\n" + extracted_code

    print("COMBINED:" + combined_code)

    def execute_and_stream():
        import tempfile
        import subprocess
        
        # Créer un fichier temporaire avec le code à exécuter
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as temp_file:
                temp_file.write(combined_code)
                temp_file_path = temp_file.name
            
            yield f"Executing code in temporary file: {temp_file_path}\n"
            
            # Exécuter le fichier Python avec subprocess
            process = subprocess.Popen(
                [sys.executable, temp_file_path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=os.path.dirname(os.path.abspath(__file__))  # Exécuter dans le répertoire du projet
            )
            
            # Lire la sortie en temps réel
            stdout, stderr = process.communicate()
            
            # Gérer les erreurs en premier
            if stderr:
                yield f"STDERR:\n{stderr}\n"
            
            # Puis la sortie normale
            if stdout:
                yield f"STDOUT:\n{stdout}\n"
            else:
                yield "No output produced by the code execution.\n"
                
            # Vérifier le code de retour
            if process.returncode != 0:
                yield f"EXECUTION_ERROR: Process exited with code {process.returncode}\n"
                
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            yield f"EXECUTION_ERROR: {str(e)}\n"
            yield f"TRACEBACK:\n{error_details}\n"
        finally:
            # Nettoyer le fichier temporaire
            try:
                if 'temp_file_path' in locals():
                    os.unlink(temp_file_path)
                    yield f"Temporary file {temp_file_path} deleted.\n"
            except Exception as cleanup_error:
                yield f"Warning: Could not delete temporary file: {cleanup_error}\n"

    return StreamingResponse(execute_and_stream(), media_type='text/plain')
'''

@app.post('/fetch_webpage')
async def fetch_webpage(request: Request):
    """
    Endpoint proxy pour récupérer le contenu d'une page web depuis Internet.
    Évite les problèmes CORS en passant par le backend.
    Paramètres JSON: { "url": "https://..." }
    Retourne: { "status": "success", "content": "...", "content_type": "..." } ou { "status": "error", "error": "..." }
    """
    data = await request.json()
    url = data.get('url', '')
    if not url:
        return JSONResponse({"status": "error", "error": "No URL provided"}, status_code=400)

    # Validation basique de l'URL
    from urllib.parse import urlparse
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https'):
        return JSONResponse({"status": "error", "error": "Only http and https URLs are allowed"}, status_code=400)
    if not parsed.hostname:
        return JSONResponse({"status": "error", "error": "Invalid URL"}, status_code=400)

    try:
        resp = requests.get(url, timeout=30, headers={'User-Agent': 'TamedAgents/1.0'})
        resp.raise_for_status()
        content_type = resp.headers.get('Content-Type', 'text/html')
        return {"status": "success", "content": resp.text, "content_type": content_type, "status_code": resp.status_code}
    except requests.exceptions.Timeout:
        return JSONResponse({"status": "error", "error": "Request timed out"}, status_code=504)
    except requests.exceptions.ConnectionError as e:
        return JSONResponse({"status": "error", "error": f"Connection error: {e}"}, status_code=502)
    except requests.exceptions.HTTPError as e:
        return JSONResponse({"status": "error", "error": f"HTTP error: {e.response.status_code}"}, status_code=502)
    except requests.exceptions.RequestException as e:
        return JSONResponse({"status": "error", "error": f"Request error: {e}"}, status_code=500)


@app.post('/fetch_feed')
async def fetch_feed(request: Request):
    """
    Récupère et parse un flux RSS/Atom, renvoie une liste normalisée d'items.
    Paramètres JSON: { "url": "https://...", "max_items": 20 }
    Retourne: { "status": "success", "source": "...", "items": [
        { "titre": "...", "lien": "...", "date": "...", "resume": "..." }, ... ] }
    """
    data = await request.json()
    url = data.get('url', '')
    max_items = data.get('max_items', 20)

    from urllib.parse import urlparse
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https') or not parsed.hostname:
        return JSONResponse({"status": "error", "error": "Invalid URL"}, status_code=400)

    try:
        resp = requests.get(url, timeout=30, headers={
            'User-Agent': 'TamedAgents/1.0',
            'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml'
        })
        resp.raise_for_status()
        # feedparser lit les bytes bruts et résout l'encodage via la déclaration XML
        feed = feedparser.parse(resp.content)

        source = feed.feed.get('title', parsed.hostname)
        items = []
        for entry in feed.entries[:max_items]:
            items.append({
                "titre": entry.get('title', ''),
                "lien": entry.get('link', ''),
                # published_parsed est un time.struct_time normalisé, ou None
                "date": (
                    __import__('time').strftime('%Y-%m-%dT%H:%M:%S', entry.published_parsed)
                    if entry.get('published_parsed') else entry.get('published', '')
                ),
                "resume": entry.get('summary', '')
            })
        return {"status": "success", "source": source, "items": items, "count": len(items)}

    except requests.exceptions.Timeout:
        return JSONResponse({"status": "error", "error": "Request timed out"}, status_code=504)
    except requests.exceptions.RequestException as e:
        return JSONResponse({"status": "error", "error": f"Request error: {e}"}, status_code=502)
    except Exception as e:
        return JSONResponse({"status": "error", "error": f"Parse error: {e}"}, status_code=500)


@app.post('/parse_csv')
async def parse_csv(request: Request):
    """
    Endpoint pour parser une chaîne CSV et retourner les données structurées.
    Paramètres JSON: { "content": "...", "delimiter": ",", "has_header": true }
    Retourne: { "status": "success", "headers": [...], "rows": [[...], ...] }
    """
    import csv
    data = await request.json()
    content = data.get('content', '')
    delimiter = data.get('delimiter', ',')
    has_header = data.get('has_header', True)
    if not content.strip():
        return JSONResponse({"status": "error", "error": "No CSV content provided"}, status_code=400)
    try:
        reader = csv.reader(io.StringIO(content), delimiter=delimiter)
        rows = list(reader)
        if has_header and rows:
            headers = rows[0]
            rows = rows[1:]
        else:
            headers = []
        return {"status": "success", "headers": headers, "rows": rows}
    except Exception as e:
        return JSONResponse({"status": "error", "error": str(e)}, status_code=500)


@app.post('/web_search')
async def web_search(request: Request):
    """
    Endpoint pour effectuer une recherche web via DuckDuckGo.
    Paramètres JSON: { "q": "...", "max_results": 10 }
    Retourne: { "status": "success", "results": [...] }
    Chaque résultat: { "title": "...", "href": "...", "body": "..." }
    """
    data = await request.json()
    query = data.get('q', '')
    max_results = data.get('max_results', 10)
    if not query.strip():
        return JSONResponse({"status": "error", "error": "No query provided"}, status_code=400)
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        return {"status": "success", "results": results}
    except Exception as e:
        return JSONResponse({"status": "error", "error": f"Search error: {e}"}, status_code=500)


@app.post('/run_shell')
async def run_shell_endpoint(request: Request):
    """
    Endpoint pour exécuter une commande shell et retourner le résultat.
    Paramètres JSON: { "command": "...", "timeout": 30 }
    Retourne: { "status": "success", "stdout": "...", "stderr": "...", "return_code": 0 }
    """
    import subprocess
    data = await request.json()
    command = data.get('command', '')
    timeout = data.get('timeout', 30)
    if not command.strip():
        return JSONResponse({"status": "error", "error": "No command provided"}, status_code=400)
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        return {
            "status": "success",
            "stdout": result.stdout,
            "stderr": result.stderr,
            "return_code": result.returncode
        }
    except subprocess.TimeoutExpired:
        return JSONResponse({"status": "error", "error": f"Command timed out after {timeout}s"}, status_code=504)
    except Exception as e:
        return JSONResponse({"status": "error", "error": str(e)}, status_code=500)


'''
@app.post('/eval_python')
async def eval_python(request: Request):
    """
    Endpoint pour exécuter du code Python et renvoyer la valeur du résultat.
    Le code est exécuté via exec(). Si la dernière instruction est une expression,
    sa valeur est renvoyée. Les prints sont capturés séparément.
    """
    data = await request.json()
    code = data.get('code', '')

    if not code.strip():
        return JSONResponse({"status": "error", "error": "No code provided."}, status_code=400)

    import traceback

    # Capture stdout
    old_stdout = sys.stdout
    old_stderr = sys.stderr
    captured_out = io.StringIO()
    captured_err = io.StringIO()

    try:
        # Split code into body and last statement
        # Try to evaluate the last line as an expression for a return value
        lines = code.rstrip().split('\n')
        result_value = None
        
        # Try to compile the last line as an expression
        last_line = lines[-1].strip()
        body = '\n'.join(lines[:-1]) if len(lines) > 1 else ''
        
        exec_globals = {}
        
        sys.stdout = captured_out
        sys.stderr = captured_err
        
        try:
            # Try to compile last line as an expression
            compiled_expr = compile(last_line, '<expr>', 'eval')
            # Execute body first
            if body.strip():
                exec(body, exec_globals)
            # Then evaluate the last expression
            result_value = eval(compiled_expr, exec_globals)
        except SyntaxError:
            # Last line is not an expression, execute everything together
            exec(code, exec_globals)
            result_value = None
        
        stdout_content = captured_out.getvalue()
        stderr_content = captured_err.getvalue()
        
        response = {
            "status": "success",
            "result": str(result_value) if result_value is not None else "",
            "stdout": stdout_content,
            "stderr": stderr_content
        }
        return response
        
    except Exception as e:
        stdout_content = captured_out.getvalue()
        stderr_content = captured_err.getvalue()
        error_details = traceback.format_exc()
        response = {
            "status": "error",
            "error": str(e),
            "traceback": error_details,
            "stdout": stdout_content,
            "stderr": stderr_content
        }
        return response
    finally:
        sys.stdout = old_stdout
        sys.stderr = old_stderr
'''


@app.get('/get_max_tokens')
async def get_max_tokens(session_id: str = Query("")):
    """Endpoint pour obtenir le nombre de tokens max."""
    session = _get_session(session_id)
    if not session:
        return _session_error()
    max_tokens = session.llm_client.get_max_tokens()
    return {"max_tokens": max_tokens}

@app.post('/set_max_tokens')
async def set_max_tokens(request: Request):
    data = await request.json()
    sid = data.get('session_id', '')
    session = _get_session(sid)
    if not session:
        return _session_error()
    mx = data.get('max_tokens', 4096)
    session.llm_client.set_max_tokens(int(mx))
    return {"status": 'success'}

@app.get('/get_host')
async def get_host(session_id: str = Query("")):
    """Endpoint pour obtenir le host du serveur LLM."""
    session = _get_session(session_id)
    if not session:
        return _session_error()
    hst = session.llm_client.get_host()
    return {"host": hst}

@app.post('/set_host')
async def set_host(request: Request):
    """Endpoint pour définir le host du serveur LLM."""
    data = await request.json()
    sid = data.get('session_id', '')
    session = _get_session(sid)
    if not session:
        return _session_error()
    hst = data.get('host', 'http://localhost:11434/v1')
    session.llm_client.set_host(hst)
    return {"status": 'success'}

@app.get('/get_key')
async def get_key(session_id: str = Query("")):
    """Endpoint pour obtenir la clé API du serveur LLM."""
    session = _get_session(session_id)
    if not session:
        return _session_error()
    key = session.llm_client.get_key()
    return {"api_key": key}

@app.post('/set_key')
async def set_key(request: Request):
    """Endpoint pour définir la clé API du serveur LLM."""
    data = await request.json()
    sid = data.get('session_id', '')
    session = _get_session(sid)
    if not session:
        return _session_error()
    key = data.get('api_key') or data.get('key', 'no key')
    print(f"[{sid[:8]}] set_key server={session.llm_client.get_server_type()} key_len={len(key)}")
    session.llm_client.set_key(key)
    return {"status": 'success'}

@app.get('/get_model_server')
async def get_model_server(session_id: str = Query("")):
    """Endpoint pour obtenir le type de serveur LLM."""
    session = _get_session(session_id)
    if not session:
        return _session_error()
    key = session.llm_client.get_server_type()
    return {"server_type": key}

@app.post('/set_model_server')
async def set_model_server(request: Request):
    """Endpoint pour définir le type de serveur LLM."""
    data = await request.json()
    sid = data.get('session_id', '')
    session = _get_session(sid)
    if not session:
        return _session_error()
    key = data.get('server_type', 'vllm')
    if key in LLMClient._VALID_SERVERS:
        try:
            session.llm_client = LLMClient(key)
            return {"status": 'success'}
        except Exception as e:
            return JSONResponse({"status": "error", "message": str(e)}, status_code=500)
    else:
        return JSONResponse({"status": 'fail', "message": f"Unknown server type: {key}"}, status_code=400)


@app.get('/get_server_defaults')
async def get_server_defaults():
    """Returns the default host and max_tokens for each supported server type."""
    return _server_defaults


# Route to serve Basic transpiler files for client-side Basic-to-LispE compilation
@app.get('/get_basic_files')
async def get_basic_files():
    """Serves basic.lisp and transpiler.lisp content for Basic mode in agents."""
    basic_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'basic')
    try:
        with open(os.path.join(basic_dir, 'basic.lisp'), 'r', encoding='utf-8') as f:
            basic_content = f.read()
        with open(os.path.join(basic_dir, 'transpiler.lisp'), 'r', encoding='utf-8') as f:
            transpiler_content = f.read()
        return {
            "status": "success",
            "basic": basic_content,
            "transpiler": transpiler_content
        }
    except FileNotFoundError as e:
        return JSONResponse({"status": "error", "message": f"File not found: {e}"}, status_code=404)
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

@app.post('/load_data')
async def load_data(request: Request):
    """Endpoint pour lire le contenu d'un fichier depuis le disque."""
    data = await request.json()
    file_path = data.get('path', '')
    if not file_path:
        return JSONResponse({"status": "error", "message": "No path provided"}, status_code=400)
    file_path = os.path.expanduser(file_path)
    file_path = os.path.realpath(file_path)
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return {"status": "success", "content": content, "path": file_path}
    except FileNotFoundError:
        return JSONResponse({"status": "error", "message": f"File not found: {file_path}"}, status_code=404)
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

@app.post('/store_data')
async def store_data(request: Request):
    """Endpoint pour sauvegarder une chaîne de caractères sur le disque à un chemin donné."""
    data = await request.json()
    file_path = data.get('path', '')
    content = data.get('content', '')
    if not file_path:
        return JSONResponse({"status": "error", "message": "No path provided"}, status_code=400)
    file_path = os.path.expanduser(file_path)
    file_path = os.path.realpath(file_path)
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return {"status": "success", "path": file_path}
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

@app.post('/pdf_ingest')
async def pdf_ingest(request: Request):
    """Analyse un PDF (chemin disque, URL http(s) ou données base64) et renvoie,
    page par page, soit le texte extrait, soit une image (rendu PNG de la page)
    pour traitement par un modèle de vision.

    Corps JSON attendu :
        source    : chemin, URL, ou données base64 (avec ou sans préfixe data:)
        kind      : 'auto' (défaut) | 'path' | 'url' | 'data'
        mode      : 'auto' (défaut) | 'text' | 'vision'
        dpi       : résolution du rendu image (défaut 150)
        max_pages : nombre maximum de pages traitées (0 = sans limite)

    En mode 'auto', la décision text/vision/mixed dépend de la densité de texte
    par page (un PDF majoritairement textuel -> text, majoritairement scanné ->
    vision, sinon -> mixed, décidé page par page).
    """
    data = await request.json()
    source = data.get('source', '')
    kind = data.get('kind', 'auto')
    mode = data.get('mode', 'auto')
    try:
        dpi = int(data.get('dpi', 150))
    except (TypeError, ValueError):
        dpi = 150
    try:
        max_pages = int(data.get('max_pages', 0))
    except (TypeError, ValueError):
        max_pages = 0

    if not source:
        return JSONResponse({"status": "error", "message": "No source provided"}, status_code=400)

    try:
        import fitz  # PyMuPDF
    except Exception:
        return JSONResponse({"status": "error",
                             "message": "PyMuPDF is not installed. Run: pip install pymupdf"},
                            status_code=500)

    import base64 as _b64

    # Resolve the kind when 'auto'
    if kind == 'auto':
        s = source.strip()
        if s.startswith('http://') or s.startswith('https://'):
            kind = 'url'
        elif s.startswith('data:'):
            kind = 'data'
        elif len(s) > 1024 and '\n' not in s and ' ' not in s:
            kind = 'data'
        else:
            kind = 'path'

    raw = None
    try:
        if kind == 'url':
            resp = requests.get(source, timeout=30)
            resp.raise_for_status()
            raw = resp.content
        elif kind == 'data':
            s = source
            if s.startswith('data:'):
                s = s.split(',', 1)[1]
            raw = _b64.b64decode(s)
        else:  # path
            p = os.path.realpath(os.path.expanduser(source))
            with open(p, 'rb') as f:
                raw = f.read()
    except Exception as e:
        return JSONResponse({"status": "error", "message": f"Cannot read PDF: {e}"}, status_code=400)

    try:
        doc = fitz.open(stream=raw, filetype="pdf")
    except Exception as e:
        return JSONResponse({"status": "error", "message": f"Invalid PDF: {e}"}, status_code=400)

    n = doc.page_count
    if max_pages and max_pages > 0:
        n = min(n, max_pages)

    page_text = []
    for i in range(n):
        txt = doc[i].get_text("text")
        page_text.append(txt)

    textual = sum(1 for t in page_text if len(t.strip()) >= 100)
    ratio = (textual / n) if n else 0.0

    decision = mode
    if mode == 'auto':
        if ratio >= 0.7:
            decision = 'text'
        elif ratio <= 0.3:
            decision = 'vision'
        else:
            decision = 'mixed'

    items = []
    for i in range(n):
        use_text = (decision == 'text') or (decision == 'mixed' and len(page_text[i].strip()) >= 100)
        if use_text:
            items.append({"page": i, "kind": "text", "text": page_text[i]})
        else:
            try:
                pix = doc[i].get_pixmap(dpi=dpi)
                png = pix.tobytes("png")
                url = "data:image/png;base64," + _b64.b64encode(png).decode()
                items.append({"page": i, "kind": "image", "src": url})
            except Exception as e:
                items.append({"page": i, "kind": "text", "text": page_text[i] or f"[page {i}: render error: {e}]"})

    doc.close()
    return {"status": "success", "decision": decision, "pages": n,
            "textual_ratio": ratio, "items": items}

@app.post('/store_session')
async def store_session(request: Request):
    """Endpoint pour sauvegarder une session sur le disque à un chemin donné."""
    data = await request.json()
    file_path = data.get('path', '')
    session_data = data.get('session', {})
    if not file_path:
        return JSONResponse({"status": "error", "message": "No path provided"}, status_code=400)
    # Resolve ~ and normalize
    file_path = os.path.expanduser(file_path)
    file_path = os.path.realpath(file_path)
    if not file_path.endswith('.json'):
        file_path += '.json'
    try:
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, 'w', encoding='utf-8') as f:
            import json as _json
            _json.dump(session_data, f, ensure_ascii=False, indent=2)
        return {"status": "success", "path": file_path}
    except Exception as e:
        return JSONResponse({"status": "error", "message": str(e)}, status_code=500)

# Routes MCP et Atlassian déplacées dans tools_routes.py
from tools import tools_router, tools_mcp_tools
app.include_router(tools_router)

# Enregistre les outils MCP définis dans tools.py
for tool_func in tools_mcp_tools:
    mcp.tool()(tool_func)



if __name__ == '__main__':
    import socket

    def _get_local_ip():
        """Détecte l'adresse IP locale de la machine (accessible sur le réseau)."""
        try:
            # Crée un socket UDP vers une adresse externe (n'envoie rien)
            # pour déterminer l'interface réseau utilisée par défaut.
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "127.0.0.1"

    PORT = 5200
    local_ip = _get_local_ip()
    hostname = socket.gethostname()

    FST_API_URL = f'http://127.0.0.1:{PORT}'
    # S'assure que le répertoire templates existe
    os.makedirs('templates', exist_ok=True)
    if serve_html:
        import webbrowser
        import threading
        # Tente d'ouvrir le navigateur, mais ignore l'erreur si pas d'environnement graphique
        def _open_browser():
            try:
                webbrowser.open(FST_API_URL)
            except Exception:
                pass
        threading.Timer(1.5, _open_browser).start()

    print(f"{'='*60}")
    print(f" Tamed Agents Server")
    print(f" Hostname : {hostname}")
    print(f" Local    : http://127.0.0.1:{PORT}")
    print(f" Network  : http://{local_ip}:{PORT}")
    print(f"{'='*60}")
    uvicorn.run(app, host='0.0.0.0', port=PORT)
