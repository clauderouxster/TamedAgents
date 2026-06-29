import json
import requests

# Mistral Configuration
mistral_api_key = ""
mistral_url = "https://api.mistral.ai/v1"
MAX_TOKENS = 4096
MODEL = "mistral-small-latest"

def _chat_url(base=None):
    """Construit l'URL du endpoint chat/completions à partir de mistral_url."""
    b = (base if base is not None else mistral_url).rstrip('/')
    if b.endswith('/chat/completions'):
        return b
    return b + '/chat/completions'

def _models_url(base=None):
    """Construit l'URL du endpoint models à partir de mistral_url."""
    b = (base if base is not None else mistral_url).rstrip('/')
    if b.endswith('/chat/completions'):
        b = b[:-len('/chat/completions')]
    return b + '/models'

def get_max_tokens():
    global MAX_TOKENS
    return MAX_TOKENS

def set_max_tokens(mx):
    global MAX_TOKENS
    MAX_TOKENS = mx

def get_host():
    global mistral_url
    return mistral_url

def set_host(hst):
    global mistral_url
    mistral_url = hst

def get_key():
    global mistral_api_key
    return mistral_api_key

def set_key(key):
    global mistral_api_key
    mistral_api_key = key

def call_llm(model, system_prompt, prompt):
    """
    Appel streaming à l'API Chat de Mistral.
    """
    global mistral_url, MAX_TOKENS

    headers = {
        "Authorization": f"Bearer {mistral_api_key}",
        "Content-Type": "application/json"
    }

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": MAX_TOKENS,
        "stream": True
    }

    url = _chat_url()
    response = requests.post(url, headers=headers, json=payload, stream=True)
    if response.status_code != 200:
        error_detail = response.text
        try:
            error_json = response.json()
            error_detail = error_json.get('message', response.text)
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
    Stream chat response depuis l'API Mistral en utilisant une liste de messages.
    Supporte les tool calls.
    llm_params: dict optionnel avec temperature, top_p, presence_penalty, llm_max_tokens
    """
    _key = api_key if api_key is not None else mistral_api_key
    _max_tokens = max_tokens if max_tokens is not None else MAX_TOKENS

    headers = {
        "Authorization": f"Bearer {_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": _max_tokens,
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
                    payload['max_tokens'] = max(_lp_mt, int(payload.get('max_tokens') or 0))
            except (TypeError, ValueError):
                pass
    if tools:
        payload["tools"] = tools
        payload["stream"] = False

    url = _chat_url(host)
    if tools:
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
                error_detail = error_json.get('message', response.text)
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

# Liste des modèles Mistral courants
MISTRAL_MODELS = [
    "mistral-large-latest",
    "mistral-small-latest",
    "codestral-latest",
    "mistral-embed",
    "open-mistral-nemo",
    "mistral-medium-latest",
]

def get_model():
    global MODEL
    return MODEL

def set_model(mdl):
    global MODEL
    MODEL = mdl

def list_models(host=None, api_key=None):
    """
    Retourne la liste des modèles Mistral disponibles via l'API.
    """
    _key = api_key if api_key is not None else mistral_api_key
    headers = {
        "Authorization": f"Bearer {_key}"
    }

    models_url = _models_url(host)
    try:
        response = requests.get(models_url, headers=headers, timeout=10)
        response.raise_for_status()
        model_data = response.json()
        return [{"name": m["id"]} for m in model_data.get("data", [])]
    except requests.exceptions.ConnectionError:
        raise ConnectionError(f"Impossible de se connecter à l'API Mistral sur {models_url}. Vérifiez l'URL et votre connexion.")
    except requests.exceptions.Timeout:
        raise TimeoutError("La requête vers l'API Mistral a expiré.")
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de la liste des modèles Mistral: {e}")
        return [{"name": m} for m in MISTRAL_MODELS]
