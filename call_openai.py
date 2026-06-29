import json
import requests
import os

# OpenAI Configuration
openai_api_key = ""
openai_url = "https://api.openai.com/v1"
MAX_TOKENS = 4096
MODEL = "gpt-4o"

def _chat_url(base=None):
    """Construit l'URL du endpoint chat/completions à partir de openai_url."""
    base = (base or openai_url).rstrip('/')
    if base.endswith('/chat/completions'):
        return base
    return base + '/chat/completions'

def _models_url(base=None):
    """Construit l'URL du endpoint models à partir de openai_url."""
    base = (base or openai_url).rstrip('/')
    if base.endswith('/chat/completions'):
        base = base[:-len('/chat/completions')]
    return base + '/models'

def get_max_tokens():
    global MAX_TOKENS
    return MAX_TOKENS

def set_max_tokens(mx):
    global MAX_TOKENS
    MAX_TOKENS = mx

def get_host():
    global openai_url
    return openai_url

def set_host(hst):
    global openai_url
    openai_url = hst

def get_key():
    global openai_api_key
    return openai_api_key

def set_key(key):
    global openai_api_key
    openai_api_key = key

def call_llm(model, system_prompt, prompt):
    """
    Call OpenAI Chat Completion API.
    """
    global openai_url, MAX_TOKENS

    headers = {
        "Authorization": f"Bearer {openai_api_key}",
        "Content-Type": "application/json"
    }

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]

    payload = {
        "model": model,  # e.g., "gpt-4" or "gpt-3.5-turbo"
        "messages": messages,
        "max_completion_tokens": MAX_TOKENS,
        "stream": True  # Streamed response
    }

    url = _chat_url()
    response = requests.post(url, headers=headers, json=payload, stream=True)
    if response.status_code != 200:
        error_detail = response.text
        try:
            error_json = response.json()
            error_detail = error_json.get('error', {}).get('message', response.text)
        except Exception:
            pass
        raise requests.exceptions.HTTPError(
            f"{response.status_code} pour {url}: {error_detail}", response=response)

    for line in response.iter_lines():
        if line:
            decoded_line = line.decode("utf-8")
            if decoded_line.startswith("data: "):
                json_data = decoded_line[len("data: "):].strip()
                if json_data == "[DONE]":
                    break
                try:
                    chunk = json.loads(json_data)
                    delta = chunk["choices"][0]["delta"].get("content", "")
                    if delta:
                        yield delta
                except json.JSONDecodeError as e:
                    print("Error processing chunk:", e)

def call_llm_chat(model, messages, tools=None, llm_params=None, host=None, api_key=None, max_tokens=None):
    """
    Stream chat response from OpenAI API using a list of messages.
    llm_params: dict optionnel avec temperature, top_p, presence_penalty, llm_max_tokens
    Each message must be a dict like: {"role": "user" | "assistant" | "system", "content": "text"}
    """
    _url = host if host is not None else openai_url
    _key = api_key if api_key is not None else openai_api_key
    _max_tokens = max_tokens if max_tokens is not None else MAX_TOKENS

    headers = {
        "Authorization": f"Bearer {_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": messages,
        "max_completion_tokens": _max_tokens,
        "stream": True
    }
    # Apply LLM extra parameters if provided
    if llm_params:
        if 'temperature' in llm_params:
            payload['temperature'] = llm_params['temperature']
        if 'top_p' in llm_params:
            payload['top_p'] = llm_params['top_p']
        if 'presence_penalty' in llm_params:
            payload['presence_penalty'] = llm_params['presence_penalty']
        if 'llm_max_tokens' in llm_params:
            try:
                _lp_mt = int(llm_params['llm_max_tokens'])
                if _lp_mt > 0:
                    payload['max_completion_tokens'] = max(_lp_mt, int(payload.get('max_completion_tokens') or 0))
            except (TypeError, ValueError):
                pass
    if tools:
        # Désactiver le streaming quand des tools sont présents
        # pour gérer correctement les tool_calls dans la réponse
        payload["tools"] = tools
        payload["stream"] = False

    url = _chat_url(_url)
    if tools:
        # Mode non-streaming pour les tools
        response = requests.post(url, headers=headers, json=payload, timeout=300)
        response.raise_for_status()
        result = response.json()
        if 'choices' in result and len(result['choices']) > 0:
            message = result['choices'][0].get('message', {})
            if 'tool_calls' in message and message['tool_calls']:
                yield json.dumps(message['tool_calls'])
            elif 'content' in message and message['content']:
                yield message['content']
    else:
        response = requests.post(url, headers=headers, json=payload, stream=True)
        if response.status_code != 200:
            error_detail = response.text
            try:
                error_json = response.json()
                error_detail = error_json.get('error', {}).get('message', response.text)
            except Exception:
                pass
            raise requests.exceptions.HTTPError(
                f"{response.status_code} pour {url}: {error_detail}", response=response)

        for line in response.iter_lines():
            if line:
                decoded_line = line.decode("utf-8")
                if decoded_line.startswith("data: "):
                    json_data = decoded_line[len("data: "):].strip()
                    if json_data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(json_data)
                        delta = chunk["choices"][0]["delta"].get("content", "")
                        if delta:
                            yield delta
                    except json.JSONDecodeError as e:
                        print("Error processing chunk:", e)

# Liste des modèles OpenAI courants
OPENAI_MODELS = [
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4o",
    "gpt-4o-mini",
    "o3",
    "o3-mini",
    "o4-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
]

def get_model():
    global MODEL
    return MODEL

def set_model(mdl):
    global MODEL
    MODEL = mdl

def list_models(host=None, api_key=None):
    """
    Retourne la liste des modèles OpenAI disponibles via l'API.
    On renomme 'id' en 'name' pour cohérence avec les autres modules (Ollama, LM Studio, Claude).
    """
    _key = api_key if api_key is not None else openai_api_key
    _url = host if host is not None else openai_url
    headers = {
        "Authorization": f"Bearer {_key}"
    }

    models_url = _models_url(_url)
    try:
        response = requests.get(models_url, headers=headers, timeout=10)
        response.raise_for_status()
        model_data = response.json()
        return [{"name": m["id"]} for m in model_data.get("data", [])]
    except requests.exceptions.ConnectionError:
        raise ConnectionError(f"Impossible de se connecter à l'API OpenAI sur {models_url}. Vérifiez l'URL et votre connexion.")
    except requests.exceptions.Timeout:
        raise TimeoutError("La requête vers l'API OpenAI a expiré.")
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de la liste des modèles OpenAI: {e}")
        # Fallback: retourner la liste statique
        return [{"name": m} for m in OPENAI_MODELS]
