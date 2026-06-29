import json
import requests

lmstudio_host = "http://localhost:1234/v1"  # Default LM Studio host and OpenAI-compatible API path
MAX_TOKENS = 50000 # This will be passed as 'max_tokens' to LM Studio

def get_max_tokens():
    global MAX_TOKENS
    return MAX_TOKENS

def set_max_tokens(mx):
    global MAX_TOKENS
    MAX_TOKENS = mx

def get_host():
    global lmstudio_host
    return lmstudio_host

def set_host(hst):
    global lmstudio_host
    lmstudio_host = hst

def get_key():
    # LM Studio typically doesn't require an API key for local connections.
    # However, some integrations might expect one, so we can return a placeholder.
    return "lm-studio" 

def set_key(key):
    pass

def _extract_error_detail(response):
    """Extrait le message d'erreur renvoyé par LM Studio dans le corps de la réponse.

    LM Studio (compatible OpenAI) renvoie les erreurs sous la forme
    {"error": "..."} ou {"error": {"message": "..."}}. Cette fonction tente
    d'en extraire un texte lisible, sinon retourne le corps brut.
    """
    try:
        data = response.json()
    except (ValueError, AttributeError):
        try:
            return (response.text or "").strip()
        except Exception:
            return ""
    err = data.get("error", data) if isinstance(data, dict) else data
    if isinstance(err, dict):
        return err.get("message") or err.get("error") or json.dumps(err)
    return str(err)

# The call_llm function is adapted for LM Studio's chat completions endpoint.
def call_llm(model, system_prompt, prompt):
    """
    Flux de réponses de chat depuis le serveur LM Studio (compatible OpenAI).
    Génère des morceaux de contenu au fur et à mesure de leur réception.
    """
    global lmstudio_host, MAX_TOKENS

    url = f"{lmstudio_host}/chat/completions" # LM Studio uses /v1/chat/completions
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]

    payload = {
        "model": model,
        "messages": messages,
        "stream": True, # Activé pour le streaming
        "max_tokens": MAX_TOKENS # LM Studio uses 'max_tokens' for context window
    }
    
    try:
        response = requests.post(url, json=payload, stream=True, timeout=300)
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                try:
                    # LM Studio (OpenAI compatible) sends data in "data: {json_object}\n\n" format
                    decoded_line = line.decode('utf-8')
                    if decoded_line.startswith("data: "):
                        json_data = decoded_line[len("data: "):].strip()
                        if json_data == "[DONE]":
                            break
                        chunk = json.loads(json_data)
                    else:
                        continue # Skip lines that don't start with "data: "

                    if 'choices' in chunk and len(chunk['choices']) > 0 and 'delta' in chunk['choices'][0] and 'content' in chunk['choices'][0]['delta']:
                        content = chunk['choices'][0]['delta']['content']
                        yield content # Génère le contenu pour le streaming
                        
                except json.JSONDecodeError:
                    continue
    except requests.exceptions.HTTPError as e:
        detail = _extract_error_detail(e.response)
        status = e.response.status_code if e.response is not None else "?"
        message = f"Erreur LM Studio (HTTP {status}): {detail}" if detail else str(e)
        print(message)
        raise RuntimeError(message) from e
    except requests.exceptions.RequestException as e:
        print(f"Erreur de connexion au serveur LM Studio (call_llm): {e}")
        raise # Relance l'exception pour que Flask puisse la gérer
    except KeyboardInterrupt:
        print("\nStream interrompu par l'utilisateur (call_llm)")
        raise # Relance l'exception

# Modifié pour générer le contenu pour le streaming
def call_llm_chat(model, messages, tools=None, llm_params=None, host=None, api_key=None, max_tokens=None):
    """
    Flux de réponses de chat depuis le serveur LM Studio (compatible OpenAI).
    Génère des morceaux de contenu au fur et à mesure de leur réception.
    llm_params: dict optionnel avec temperature, top_p, presence_penalty, llm_max_tokens
    
    Args:
        model (str): Le modèle LM Studio à utiliser.
        messages (list): Liste des dictionnaires de messages pour l'historique du chat.
        tools (list, optional): Liste de définitions de tools au format JSON.
        llm_params (dict, optional): Paramètres LLM supplémentaires.
        host (str, optional): Hôte LM Studio (si None, utilise la globale).
        api_key (str, optional): Non utilisé pour LM Studio (ignoré).
        max_tokens (int, optional): Limite de tokens (si None, utilise la globale).
    """
    _host = host if host is not None else lmstudio_host
    _max_tokens = max_tokens if max_tokens is not None else MAX_TOKENS

    url = f"{_host}/chat/completions" # LM Studio uses /v1/chat/completions
    
    print(messages)
    payload = {
        "model": model,
        "messages": messages,
        "stream": True, # Activé pour le streaming
        "max_tokens": _max_tokens # LM Studio uses 'max_tokens' for context window
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

    try:
        response = requests.post(url, json=payload, stream=True, timeout=300)
        response.raise_for_status()
        
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

                    if isinstance(chunk, dict) and chunk.get('error'):
                        err = chunk['error']
                        msg = err.get('message') if isinstance(err, dict) else str(err)
                        raise RuntimeError(f"Erreur LM Studio: {msg}")

                    if 'choices' in chunk and len(chunk['choices']) > 0 and 'delta' in chunk['choices'][0] and 'content' in chunk['choices'][0]['delta']:
                        content = chunk['choices'][0]['delta']['content']
                        yield content # Génère le contenu pour le streaming
                        
                except json.JSONDecodeError:
                    continue
    except requests.exceptions.HTTPError as e:
        detail = _extract_error_detail(e.response)
        status = e.response.status_code if e.response is not None else "?"
        message = f"Erreur LM Studio (HTTP {status}): {detail}" if detail else str(e)
        print(message)
        raise RuntimeError(message) from e
    except requests.exceptions.RequestException as e:
        print(f"Erreur de connexion au serveur LM Studio (call_llm_chat): {e}")
        raise # Relance l'exception pour que Flask puisse la gérer
    except KeyboardInterrupt:
        print("\nStream interrompu par l'utilisateur (call_llm_chat)")
        raise # Relance l'exception

def list_models(host=None, api_key=None):
    """
    Liste les modèles LM Studio disponibles via son API OpenAI compatible.

    Returns:
        list: Une liste de dictionnaires, chaque dictionnaire représentant un modèle
              avec des clés comme 'id' (équivalent à 'name' pour Ollama), etc.
              Retourne une liste vide en cas d'erreur ou si aucun modèle n'est trouvé.
    """
    _host = host if host is not None else lmstudio_host
    url = f"{_host}/models" # lmstudio_host already contains /v1
    try:
        response = requests.get(url, timeout=10) # Ajout d'un timeout
        response.raise_for_status()
        data = response.json()
        # LM Studio's /v1/models endpoint returns a dictionary with a 'data' key,
        # where 'data' is a list of model objects.
        # We also rename 'id' to 'name' for consistency with the Ollama output structure.
        return [{"name": m["id"], **{k: v for k, v in m.items() if k != "id"}} for m in data.get('data', [])]
    except requests.exceptions.ConnectionError:
        raise ConnectionError(f"Impossible de se connecter à LM Studio sur {lmstudio_host}. Assurez-vous qu'il est en cours d'exécution.")
    except requests.exceptions.Timeout:
        raise TimeoutError("La requête vers LM Studio a expiré.")
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de la liste des modèles LM Studio: {e}")
        raise # Rélève l'exception pour qu'elle soit gérée par le code appelant
