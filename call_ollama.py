import json
import requests

ollama_host="http://localhost:11434"
MAX_TOKENS = 50000

def get_max_tokens():
    global MAX_TOKENS
    return MAX_TOKENS

def set_max_tokens(mx):
    global MAX_TOKENS
    MAX_TOKENS = mx


def get_host():
    global ollama_host
    return ollama_host

def set_host(hst):
    global ollama_host
    ollama_host = hst

def get_key():
    return "no key"

def set_key(key):
    pass

# La fonction call_llm n'est pas directement utilisée par app.py pour le chat,
# mais est maintenue pour la cohérence si elle était appelée ailleurs.
def call_llm(model, system_prompt, prompt):
    """
    Flux de réponses de chat depuis le serveur Ollama.
    Génère des morceaux de contenu au fur et à mesure de leur réception.
    """
    global ollama_host, MAX_TOKENS

    url = f"{ollama_host}/api/chat"
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": prompt}
    ]

    payload = {
        "model": model,
        "messages": messages,
        "stream": True, # Activé pour le streaming
        "options": {
            "num_ctx": MAX_TOKENS
        }
    }
    
    try:
        response = requests.post(url, json=payload, stream=True, timeout=300)
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                try:
                    chunk = json.loads(line.decode('utf-8'))
                    
                    if 'message' in chunk and 'content' in chunk['message']:
                        content = chunk['message']['content']
                        yield content # Génère le contenu pour le streaming
                    
                    if chunk.get('done', False):
                        break
                        
                except json.JSONDecodeError:
                    continue
    except requests.exceptions.RequestException as e:
        print(f"Erreur de connexion au serveur Ollama (call_llm): {e}")
        raise # Relance l'exception pour que Flask puisse la gérer
    except KeyboardInterrupt:
        print("\nStream interrompu par l'utilisateur (call_llm)")
        raise # Relance l'exception

# Modifié pour générer le contenu pour le streaming
def call_llm_chat(model, messages, tools=None, llm_params=None, host=None, api_key=None, max_tokens=None):
    """
    Flux de réponses de chat depuis le serveur Ollama.
    Génère des morceaux de contenu au fur et à mesure de leur réception.
    llm_params: dict optionnel avec temperature, top_p, presence_penalty, llm_max_tokens
    
    Args:
        model (str): Le modèle Ollama à utiliser.
        messages (list): Liste des dictionnaires de messages pour l'historique du chat.
        tools (list, optional): Liste de définitions de tools au format JSON.
        llm_params (dict, optional): Paramètres LLM supplémentaires.
        host (str, optional): Hôte Ollama (si None, utilise la globale).
        api_key (str, optional): Non utilisé pour Ollama (ignoré).
        max_tokens (int, optional): Limite de tokens (si None, utilise la globale).
    """
    _host = host if host is not None else ollama_host
    _max_tokens = max_tokens if max_tokens is not None else MAX_TOKENS

    url = f"{_host}/api/chat"
    
    options = {
        "num_ctx": _max_tokens
    }
    # Apply LLM extra parameters into Ollama options
    if llm_params:
        if 'temperature' in llm_params:
            options['temperature'] = llm_params['temperature']
        if 'top_p' in llm_params:
            options['top_p'] = llm_params['top_p']
        if 'presence_penalty' in llm_params:
            options['presence_penalty'] = llm_params['presence_penalty']
        if 'llm_max_tokens' in llm_params:
            try:
                _lp_mt = int(llm_params['llm_max_tokens'])
                if _lp_mt > 0:
                    options['num_predict'] = _lp_mt
            except (TypeError, ValueError):
                pass

    payload = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": options
    }
    try:
        response = requests.post(url, json=payload, stream=True, timeout=3000)
        response.raise_for_status()
        
        for line in response.iter_lines():
            if line:
                try:
                    chunk = json.loads(line.decode('utf-8'))
                    
                    if 'message' in chunk and 'content' in chunk['message']:
                        content = chunk['message']['content']
                        yield content # Génère le contenu pour le streaming
                    
                    if chunk.get('done', False):
                        break
                        
                except json.JSONDecodeError:
                    continue
    except requests.exceptions.RequestException as e:
        print(f"Erreur de connexion au serveur Ollama (call_llm_chat): {e}")
        raise # Relance l'exception pour que Flask puisse la gérer
    except KeyboardInterrupt:
        print("\nStream interrompu par l'utilisateur (call_llm_chat)")
        raise # Relance l'exception

def list_models(host=None, api_key=None):
    """
    Liste les modèles Ollama disponibles.

    Returns:
        list: Une liste de dictionnaires, chaque dictionnaire représentant un modèle
              avec des clés comme 'name', 'model', 'size', etc.
              Retourne une liste vide en cas d'erreur ou si aucun modèle n'est trouvé.
    """
    _host = host if host is not None else ollama_host
    url = f"{_host}/api/tags"
    try:
        response = requests.get(url, timeout=10) # Ajout d'un timeout
        response.raise_for_status()
        data = response.json()
        return data.get('models', [])
    except requests.exceptions.ConnectionError:
        raise ConnectionError(f"Impossible de se connecter à Ollama sur {ollama_host}. Assurez-vous qu'il est en cours d'exécution.")
    except requests.exceptions.Timeout:
        raise TimeoutError("La requête vers Ollama a expiré.")
    except requests.exceptions.RequestException as e:
        print(f"Erreur lors de la liste des modèles Ollama: {e}")
        raise # Rélève l'exception pour qu'elle soit gérée par le code appelant
