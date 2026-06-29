import json
import requests

vllm_host = "http://0.0.0.0:8012/v1"  # Hôte vLLM et chemin API compatible OpenAI
MAX_TOKENS = 10000 # Limite de tokens pour vLLM
MODEL = "openai/gpt-oss-20b"

def get_max_tokens():
    global MAX_TOKENS
    return MAX_TOKENS

def set_max_tokens(mx):
    global MAX_TOKENS
    MAX_TOKENS = mx

def get_host():
    global vllm_host
    return vllm_host

def set_host(hst):
    global vllm_host
    vllm_host = hst

def get_model():
    global MODEL
    return MODEL

def set_model(mdl):
    global MODEL
    MODEL = mdl

def get_key():
    # vLLM ne nécessite généralement pas de clé API pour les connexions locales.
    return "vllm-local"

def set_key(key):
    pass

def call_llm(model, system_prompt, prompt):
    """
    Flux de réponses de chat depuis le serveur vLLM (compatible OpenAI).
    Génère des morceaux de contenu au fur et à mesure de leur réception.
    """
    global vllm_host, MAX_TOKENS

    url = f"{vllm_host}/chat/completions"
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "max_tokens": MAX_TOKENS
    }
    try:
        response = requests.post(url, json=payload, stream=True, timeout=300)
        if response.status_code != 200:
            error_detail = response.text
            try:
                error_json = response.json()
                error_detail = error_json.get('message', error_json.get('detail', response.text))
            except Exception:
                pass
            raise requests.exceptions.HTTPError(
                f"{response.status_code} pour {url}: {error_detail}", response=response)
        for line in response.iter_lines():
            if line:
                try:
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith("data: "):
                        json_data = decoded_line[len("data: "):].strip()
                        if json_data == "[DONE]":
                            break
                        chunk = json.loads(json_data)
                    else:
                        continue
                    if 'choices' in chunk and len(chunk['choices']) > 0 and 'delta' in chunk['choices'][0]:
                        delta = chunk['choices'][0]['delta']
                        content = delta.get('content')
                        if content is None:
                            # Modèles "thinking" (Qwen3, etc.) servis par SGLang/vLLM
                            content = delta.get('reasoning_content')
                        if content is not None:
                            yield content
                except json.JSONDecodeError:
                    continue
    except requests.exceptions.RequestException as e:
        print(f"Erreur de connexion au serveur vLLM (call_llm): {e}")
        raise
    except KeyboardInterrupt:
        print("\nStream interrompu par l'utilisateur (call_llm)")
        raise

def call_llm_chat(model, messages, tools=None, llm_params=None, host=None, api_key=None, max_tokens=None):
    """
    Flux de réponses de chat depuis le serveur vLLM (compatible OpenAI).
    Génère des morceaux de contenu au fur et à mesure de leur réception.
    llm_params: dict optionnel avec temperature, top_p, presence_penalty, llm_max_tokens, extra_body
    """
    _host = host if host is not None else vllm_host
    _max_tokens = max_tokens if max_tokens is not None else MAX_TOKENS
    url = f"{_host}/chat/completions"
    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
        "max_tokens": _max_tokens
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
                # On ne réduit jamais le budget en dessous du max_tokens explicite :
                # on garde la plus grande des deux valeurs.
                if _lp_mt > 0:
                    payload['max_tokens'] = max(_lp_mt, int(payload.get('max_tokens') or 0))
            except (TypeError, ValueError):
                pass
        if 'extra_body' in llm_params and llm_params['extra_body']:
            payload.update(llm_params['extra_body'])
    if tools:
        # Désactiver le streaming quand des tools sont présents
        # pour gérer correctement les tool_calls dans la réponse
        payload["tools"] = tools
        payload["stream"] = False
    try:
        if tools:
            # Mode non-streaming pour les tools
            response = requests.post(url, json=payload, timeout=300)
            if response.status_code != 200:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_detail = error_json.get('message', error_json.get('detail', response.text))
                except Exception:
                    pass
                raise requests.exceptions.HTTPError(
                    f"{response.status_code} pour {url}: {error_detail}", response=response)
            result = response.json()
            if 'choices' in result and len(result['choices']) > 0:
                message = result['choices'][0].get('message', {})
                if 'tool_calls' in message and message['tool_calls']:
                    yield json.dumps(message['tool_calls'])
                elif message.get('content'):
                    reasoning = message.get('reasoning_content')
                    if reasoning:
                        yield f"<think>{reasoning}</think>"
                    yield message['content']
                elif message.get('reasoning_content'):
                    # Modèles "thinking" (Qwen3, etc.) servis par SGLang/vLLM
                    yield f"<think>{message['reasoning_content']}</think>"
        else:
            response = requests.post(url, json=payload, stream=True, timeout=300)
            if response.status_code != 200:
                error_detail = response.text
                try:
                    error_json = response.json()
                    error_detail = error_json.get('message', error_json.get('detail', response.text))
                except Exception:
                    pass
                raise requests.exceptions.HTTPError(
                    f"{response.status_code} pour {url}: {error_detail}", response=response)
            in_thinking = False
            for line in response.iter_lines():
                if line:
                    try:
                        decoded_line = line.decode('utf-8')
                        if decoded_line.startswith("data: "):
                            json_data = decoded_line[len("data: "):].strip()
                            if json_data == "[DONE]":
                                break
                            chunk = json.loads(json_data)
                        else:
                            continue
                        if 'choices' in chunk and len(chunk['choices']) > 0 and 'delta' in chunk['choices'][0]:
                            choice = chunk['choices'][0]
                            delta = choice['delta']
                            reasoning = delta.get('reasoning_content')
                            content = delta.get('content')
                            # Partie "thinking" : encapsulée dans des balises <think>...</think>
                            # Modèles "thinking" (Qwen3, etc.) servis par SGLang/vLLM
                            if reasoning:
                                if not in_thinking:
                                    in_thinking = True
                                    yield "<think>"
                                yield reasoning
                            if content:
                                if in_thinking:
                                    in_thinking = False
                                    yield "</think>"
                                yield content
                    except json.JSONDecodeError:
                        continue
            # Ferme la balise si le flux s'est terminé pendant le raisonnement
            if in_thinking:
                yield "</think>"
    except requests.exceptions.RequestException as e:
        print(f"Erreur de connexion au serveur vLLM (call_llm_chat): {e}")
        raise
    except KeyboardInterrupt:
        print("\nStream interrompu par l'utilisateur (call_llm_chat)")
        raise

def list_models(host=None, api_key=None):
    """
    Liste les modèles vLLM disponibles via son API OpenAI compatible.
    """
    _host = host if host is not None else vllm_host
    url = f"{_host}/models"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return [{"name": m["id"], **{k: v for k, v in m.items() if k != "id"}} for m in data.get('data', [])]
    except requests.exceptions.ConnectionError:
        raise ConnectionError(f"Impossible de se connecter à vLLM sur {vllm_host}. Assurez-vous qu'il est en cours d'exécution.")
    except requests.exceptions.Timeout:
        raise TimeoutError("La requête vers vLLM a expiré.")
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de la liste des modèles vLLM: {e}")
        raise
