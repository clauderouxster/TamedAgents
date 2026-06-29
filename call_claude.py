import json
import requests

# Anthropic Claude Configuration
claude_api_key = ""
claude_url = "https://api.anthropic.com"
MAX_TOKENS = 4096
MODEL = "claude-sonnet-4-20250514"
ANTHROPIC_VERSION = "2023-06-01"

# Limites max_tokens par famille de modèle
_MODEL_MAX_TOKENS = {
    "claude-3-": 4096,
    "claude-3-5-": 8192,
    "claude-3.5-": 8192,
    "claude-sonnet-4": 16384,
    "claude-opus-4": 16384,
    "claude-haiku-4": 16384,
}

def _cap_max_tokens(model, requested):
    """Plafonne max_tokens selon la limite du modèle Claude."""
    for prefix, limit in _MODEL_MAX_TOKENS.items():
        if model.startswith(prefix):
            return min(requested, limit)
    # Fallback conservateur
    return min(requested, 4096)

# Liste des modèles Claude disponibles
CLAUDE_MODELS = [
    "claude-sonnet-4-20250514",
    "claude-opus-4-20250514",
    "claude-haiku-4-20250514",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
]

def get_max_tokens():
    global MAX_TOKENS
    return MAX_TOKENS

def set_max_tokens(mx):
    global MAX_TOKENS
    MAX_TOKENS = mx

def get_host():
    global claude_url
    return claude_url

def set_host(hst):
    global claude_url
    claude_url = hst

def get_model():
    global MODEL
    return MODEL

def set_model(mdl):
    global MODEL
    MODEL = mdl

def get_key():
    global claude_api_key
    return claude_api_key

def set_key(key):
    global claude_api_key
    claude_api_key = key

def _get_headers():
    """Retourne les headers nécessaires pour l'API Anthropic."""
    masked = claude_api_key[:8] + "..." + claude_api_key[-4:] if len(claude_api_key) > 12 else repr(claude_api_key)
    #print(f"[Claude] Using API key: {masked} (len={len(claude_api_key)})")
    return {
        "x-api-key": claude_api_key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json"
    }

def call_llm(model, system_prompt, prompt):
    """
    Appel streaming à l'API Messages d'Anthropic Claude.
    """
    global claude_url, MAX_TOKENS

    headers = _get_headers()

    effective_max = _cap_max_tokens(model, MAX_TOKENS)

    payload = {
        "model": model,
        "max_tokens": effective_max,
        "stream": True,
        "messages": [
            {"role": "user", "content": prompt}
        ]
    }

    if system_prompt and system_prompt.strip():
        payload["system"] = system_prompt

    url = f"{claude_url}/v1/messages"
    print(f"[Claude call_llm] POST {url} | model={model} | max_tokens={effective_max} | messages={len(payload['messages'])}")
    response = requests.post(url, headers=headers, json=payload, stream=True)
    if response.status_code != 200:
        try:
            error_body = response.json()
        except Exception:
            error_body = response.text
        print(f"[Claude call_llm] Error {response.status_code}: {error_body}")
        response.raise_for_status()

    for line in response.iter_lines():
        if line:
            decoded_line = line.decode("utf-8")
            if not decoded_line.startswith("data: "):
                continue
            data_str = decoded_line[6:]  # Enlever le préfixe "data: "
            if data_str.strip() == "[DONE]":
                break
            try:
                chunk = json.loads(data_str)
                event_type = chunk.get("type", "")
                if event_type == "content_block_delta":
                    delta = chunk.get("delta", {})
                    if delta.get("type") == "text_delta":
                        text = delta.get("text", "")
                        if text:
                            yield text
                elif event_type == "message_delta":
                    # Fin du message, on peut récupérer stop_reason etc.
                    pass
                elif event_type == "error":
                    error_msg = chunk.get("error", {}).get("message", "Unknown error")
                    yield f"\n[Error: {error_msg}]"
                    break
            except json.JSONDecodeError:
                continue

def _convert_messages_for_claude(messages):
    """
    Convertit les messages au format Claude.
    - Extrait le system prompt des messages system
    - S'assure que les messages alternent user/assistant
    - Fusionne les messages consécutifs du même rôle
    """
    system_prompt = ""
    claude_messages = []

    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")

        if role == "system":
            # Claude utilise un paramètre system séparé
            if system_prompt:
                system_prompt += "\n\n" + content
            else:
                system_prompt = content
            continue

        # Normaliser le rôle (tool -> user pour Claude)
        if role not in ("user", "assistant"):
            role = "user"

        # Gérer le contenu (peut être string ou liste pour multimodal)
        if isinstance(content, list):
            # Convertir les content blocks si nécessaire
            claude_content = []
            for block in content:
                if isinstance(block, dict):
                    block_type = block.get("type", "text")
                    if block_type == "text":
                        claude_content.append({"type": "text", "text": block.get("text", "")})
                    elif block_type == "tool_result":
                        claude_content.append(block)
                    else:
                        claude_content.append(block)
                else:
                    claude_content.append({"type": "text", "text": str(block)})
            content = claude_content

        # Fusionner avec le message précédent si même rôle
        if claude_messages and claude_messages[-1]["role"] == role:
            prev = claude_messages[-1]["content"]
            if isinstance(prev, str) and isinstance(content, str):
                claude_messages[-1]["content"] = prev + "\n" + content
            elif isinstance(prev, str):
                claude_messages[-1]["content"] = [{"type": "text", "text": prev}] + (content if isinstance(content, list) else [{"type": "text", "text": content}])
            elif isinstance(content, str):
                prev.append({"type": "text", "text": content})
            else:
                prev.extend(content)
        else:
            claude_messages.append({"role": role, "content": content})

    # S'assurer que le premier message est de rôle "user"
    if claude_messages and claude_messages[0]["role"] != "user":
        claude_messages.insert(0, {"role": "user", "content": "(conversation continues)"})

    return system_prompt, claude_messages

def _convert_tools_for_claude(tools):
    """
    Convertit les tools du format OpenAI vers le format Claude.
    OpenAI: {"type": "function", "function": {"name": ..., "description": ..., "parameters": ...}}
    Claude: {"name": ..., "description": ..., "input_schema": ...}
    """
    if not tools:
        return None

    claude_tools = []
    for tool in tools:
        if tool.get("type") == "function":
            func = tool["function"]
            claude_tools.append({
                "name": func.get("name", ""),
                "description": func.get("description", ""),
                "input_schema": func.get("parameters", {"type": "object", "properties": {}})
            })
        else:
            # Déjà au format Claude ou format inconnu
            claude_tools.append(tool)

    return claude_tools

def call_llm_chat(model, messages, tools=None, llm_params=None, host=None, api_key=None, max_tokens=None):
    """
    Stream chat response depuis l'API Claude en utilisant une liste de messages.
    Supporte les tool calls.
    llm_params: dict optionnel avec temperature, top_p, llm_max_tokens (pas de presence_penalty pour Claude)
    """
    _url = host if host is not None else claude_url
    _key = api_key if api_key is not None else claude_api_key
    _max_tokens = max_tokens if max_tokens is not None else MAX_TOKENS

    headers = {
        "x-api-key": _key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json"
    }

    system_prompt, claude_messages = _convert_messages_for_claude(messages)

    effective_max = _cap_max_tokens(model, _max_tokens)
    # Apply LLM extra parameters if provided
    if llm_params and 'llm_max_tokens' in llm_params:
        try:
            _lp_mt = int(llm_params['llm_max_tokens'])
            if _lp_mt > 0:
                effective_max = _cap_max_tokens(model, max(_lp_mt, _max_tokens))
        except (TypeError, ValueError):
            pass

    payload = {
        "model": model,
        "max_tokens": effective_max,
        "messages": claude_messages,
        "stream": True
    }
    # Apply temperature or top_p (Claude forbids both simultaneously; temperature takes priority)
    if llm_params:
        if 'temperature' in llm_params:
            payload['temperature'] = llm_params['temperature']
        elif 'top_p' in llm_params:
            payload['top_p'] = llm_params['top_p']

    if system_prompt and system_prompt.strip():
        payload["system"] = system_prompt

    if tools:
        claude_tools = _convert_tools_for_claude(tools)
        if claude_tools:
            payload["tools"] = claude_tools
            # Désactiver le streaming pour les tools (comme les autres modules)
            payload["stream"] = False

    url = f"{_url}/v1/messages"
    print(f"[Claude call_llm_chat] POST {url} | model={model} | max_tokens={effective_max} | messages={len(claude_messages)} | tools={bool(tools)} | system={bool(system_prompt)}")
    print(f"[Claude call_llm_chat] Messages: {json.dumps(claude_messages, ensure_ascii=False)[:500]}")

    if tools and payload.get("stream") == False:
        # Mode non-streaming pour les tools
        response = requests.post(url, headers=headers, json=payload, timeout=300)
        if response.status_code != 200:
            try:
                error_body = response.json()
            except Exception:
                error_body = response.text
            print(f"[Claude call_llm_chat] Error {response.status_code}: {error_body}")
        response.raise_for_status()
        result = response.json()

        # Vérifier s'il y a des tool_use dans la réponse
        tool_calls = []
        text_content = ""
        for block in result.get("content", []):
            if block.get("type") == "tool_use":
                # Convertir au format OpenAI tool_calls pour compatibilité
                tool_calls.append({
                    "id": block.get("id", ""),
                    "type": "function",
                    "function": {
                        "name": block.get("name", ""),
                        "arguments": json.dumps(block.get("input", {}))
                    }
                })
            elif block.get("type") == "text":
                text_content += block.get("text", "")

        if tool_calls:
            yield json.dumps(tool_calls)
        elif text_content:
            yield text_content
    else:
        # Mode streaming
        response = requests.post(url, headers=headers, json=payload, stream=True)
        if response.status_code != 200:
            try:
                error_body = response.json()
            except Exception:
                error_body = response.text
            print(f"[Claude call_llm_chat] Streaming error {response.status_code}: {error_body}")
            response.raise_for_status()

        for line in response.iter_lines():
            if line:
                decoded_line = line.decode("utf-8")
                if not decoded_line.startswith("data: "):
                    continue
                data_str = decoded_line[6:]
                if data_str.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(data_str)
                    event_type = chunk.get("type", "")
                    if event_type == "content_block_delta":
                        delta = chunk.get("delta", {})
                        if delta.get("type") == "text_delta":
                            text = delta.get("text", "")
                            if text:
                                yield text
                    elif event_type == "error":
                        error_msg = chunk.get("error", {}).get("message", "Unknown error")
                        yield f"\n[Error: {error_msg}]"
                        break
                except json.JSONDecodeError:
                    continue

def list_models(host=None, api_key=None):
    """
    Retourne la liste des modèles Claude disponibles via l'API Anthropic.
    On renomme 'id' en 'name' pour cohérence avec les autres modules (Ollama, LM Studio).
    """
    _url = host if host is not None else claude_url
    _key = api_key if api_key is not None else claude_api_key
    headers = {
        "x-api-key": _key,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json"
    }
    url = f"{_url}/v1/models"
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        return [{"name": m["id"], **{k: v for k, v in m.items() if k != "id"}} for m in data.get("data", [])]
    except requests.exceptions.ConnectionError:
        raise ConnectionError(f"Impossible de se connecter à l'API Anthropic sur {claude_url}. Vérifiez l'URL et votre connexion.")
    except requests.exceptions.Timeout:
        raise TimeoutError("La requête vers l'API Anthropic a expiré.")
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de la liste des modèles Claude: {e}")
        raise
