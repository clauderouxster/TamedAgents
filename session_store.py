# session_store.py
# Gestion des sessions utilisateur identifiées par UUID.
# Chaque session stocke son propre LLMClient, prompt système, modèle par défaut, etc.
# Les sessions inactives depuis plus de 48h sont nettoyées automatiquement.

import uuid
import threading
from datetime import datetime


class SessionState:
    """État d'une session utilisateur."""

    def __init__(self, llm_client_factory):
        """
        Args:
            llm_client_factory: callable qui crée un LLMClient (ex: lambda: LLMClient("ollama"))
        """
        self.lock = threading.Lock()
        self.llm_client = llm_client_factory()
        self.system_prompt = ""
        self.default_model = "codestral"
        self.mcp_servers_registry = {}


# UUID → SessionState
_sessions = {}
# UUID → datetime du dernier accès
_session_timestamps = {}

# Factory function set by app.py at startup
_llm_client_factory = None


def set_llm_client_factory(factory):
    """Appelé par app.py au démarrage pour fournir la factory LLMClient."""
    global _llm_client_factory
    _llm_client_factory = factory


def create_session() -> str:
    """Crée une nouvelle session, nettoie les anciennes, retourne l'UUID."""
    cleanup_old_sessions()
    sid = str(uuid.uuid4())
    _sessions[sid] = SessionState(_llm_client_factory)
    _session_timestamps[sid] = datetime.now()
    return sid


def get_session(session_id: str):
    """Retourne la SessionState ou None. Met à jour le timestamp (touch)."""
    if session_id in _sessions:
        _session_timestamps[session_id] = datetime.now()
        return _sessions[session_id]
    return None


def cleanup_old_sessions(max_age_hours=48):
    """Supprime les sessions dont le dernier accès date de plus de max_age_hours."""
    now = datetime.now()
    expired = [
        sid for sid, ts in _session_timestamps.items()
        if (now - ts).total_seconds() > max_age_hours * 3600
    ]
    for sid in expired:
        del _sessions[sid]
        del _session_timestamps[sid]
    if expired:
        print(f"[session] {len(expired)} session(s) expirée(s) supprimée(s)")
