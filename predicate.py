import functools

# Les registres et l'exception restent les mêmes
_predicate_registry = {}
_predicate_wrappers = {}

class PredicateFailed(Exception):
    """Custom exception to signal failure within a predicate clause."""
    pass

def p_fail():
    """Helper function to explicitly signal failure within a predicate body."""
    raise PredicateFailed()

def p_check(condition, message=None):
    """
    Performs a boolean check within a predicate clause.
    If the condition is false, signals predicate clause failure
    by raising PredicateFailed.
    """
    if not condition:
        raise PredicateFailed(message)
    # If condition is true, the function simply returns, allowing execution to continue.

def predicate(guard=None):
    """
    Decorator to define a predicate function clause.

    Args:
        guard: An optional function that takes the predicate arguments
               and returns True if this clause should be attempted, False otherwise.
               If None, this clause is attempted if no prior guarded clauses matched.
    """
    def decorator(func):
        pred_name = func.__name__

        if pred_name not in _predicate_registry:
            _predicate_registry[pred_name] = []

            @functools.wraps(func)
            def predicate_wrapper(*args, **kwargs):
                definitions = _predicate_registry.get(pred_name, [])

                for current_guard, pred_func in definitions:
                    try:
                        guard_ok = (current_guard is None) or current_guard(*args, **kwargs)
                    except Exception as e:
                        guard_ok = False

                    if guard_ok:
                        try:
                            # Exécuter le corps de la clause.
                            # Si cette ligne se termine sans exception, c'est un succès pour la clause.
                            pred_func(*args, **kwargs)

                            # === Branche Succès ===
                            # Si nous arrivons ici, cela signifie que pred_func a terminé
                            # sans lever PredicateFailed. La clause a réussi.
                            return True # Succès du prédicat global (Coupure implicite)

                        except PredicateFailed as e:
                            # === Branche Échec ===
                            # La clause a explicitement signalé un échec via p_check() ou p_fail().
                            # print(f"Clause {pred_func.__name__} pour {pred_name} a échoué: {e}") # Debug optionnel
                            continue # Passer à la clause suivante (backtracking)

                        except Exception as e:
                             # Gérer d'autres erreurs inattendues.
                             print(f"Erreur inattendue dans la clause du prédicat {pred_name} ({pred_func.__name__}): {e}")
                             continue # Traiter comme un échec de clause

                # Si la boucle se termine, aucune clause n'a réussi.
                return False # Échec du prédicat global.

            _predicate_wrappers[pred_name] = predicate_wrapper

        # Ajouter la clause au registre (ordre de déclaration)
        _predicate_registry[pred_name].append((guard, func))

        # Retourner le wrapper unique pour ce nom.
        return _predicate_wrappers[pred_name]

    return decorator

# === Registries and Decorator for the AND-like behavior ('principles') ===
_principles_registry = {}
_principles_wrappers = {}

def principles(guard=None):
    """
    Decorator to define a predicate clause for the 'principles' (strict AND) logic.

    For a principles to be True, ALL registered clauses for its name
    (guard AND body) must succeed sequentially. If any guard fails OR any
    body fails after its guard passes, the whole principles is False.

    Args:
        guard: An optional function (args -> bool) determining if this clause
               is applicable. If the guard fails, the entire principles fails.
               If None, the guard always passes.
    """
    def decorator(func):
        pred_name = func.__name__

        # Si c'est la première fois que ce nom de prédicatfull est vu,
        # initialiser son registre et créer le wrapper unique.
        if pred_name not in _principles_registry:
            _principles_registry[pred_name] = []

            # === Création de l'instance unique du wrapper pour ce nom ===
            # Ce wrapper est la fonction qui sera réellement appelée par l'utilisateur (ex: is_special_number(...)).
            @functools.wraps(func) # Copie le nom, docstring, etc., de la première fonction décorée
            def principles_wrapper(*args, **kwargs):
                # Accède à la liste des clauses enregistrées pour ce nom (construite par les décorateurs successifs).
                definitions = _principles_registry.get(pred_name, [])

                # Dans cette interprétation de l'ET strict, on itère. Si la garde OU le corps d'une clause échoue,
                # l'ensemble du principles échoue immédiatement.
                for current_guard, pred_func in definitions:
                    # Pour chaque clause, vérifier garde PUIS corps.

                    # 1. Vérifier la Garde (fait partie de la condition globale qui doit réussir)
                    try:
                        # Si guard est None, la garde est considérée comme toujours réussie pour cette partie de l'AND.
                        guard_ok = (current_guard is None) or current_guard(*args, **kwargs)
                    except Exception as e:
                        # Si l'évaluation de la garde lève une erreur, c'est un échec de cette partie de l'AND global.
                        print(f"Erreur lors de l'exécution de la garde pour principles {pred_name} (clause {pred_func.__name__}): {e}")
                        return False # Échec global immédiat

                    if not guard_ok:
                        # === Échec basé sur la GARDE ===
                        # La garde elle-même a retourné False. Dans cet ET strict, l'ensemble du principles échoue.
                        # print(f"Guard failed for principles {pred_name} (clause {pred_func.__name__}). Overall failure.") # Debug
                        return False # Échec global immédiat

                    # 2. Si la Garde a réussi, vérifier le Corps (l'autre partie de l'AND pour cette clause)
                    try:
                        # Exécuter le corps de la clause. Il utilise check/fail et lève PredicateFailed en cas d'échec.
                        pred_func(*args, **kwargs)
                        # Si on atteint cette ligne, la garde A réussi ET le corps A réussi.
                        # On continue la boucle pour vérifier la clause enregistrée suivante.

                    except PredicateFailed as e:
                        # === Échec basé sur le CORPS ===
                        # Le corps a explicitement signalé un échec (via check/fail).
                        # Dans cet ET strict, l'ensemble du principles échoue.
                        # print(f"Body failed for principles {pred_name} (clause {pred_func.__name__}): {e}. Overall failure.") # Debug
                        return False # Échec global immédiat

                    except Exception as e:
                         # Une erreur inattendue dans le corps d'une clause. On la traite comme un échec de l'AND.
                         print(f"Erreur inattendue dans la clause principles {pred_name} ({pred_func.__name__}): {e}. Overall failure.") # Debug
                         return False # Échec global immédiat


                # Si la boucle s'est terminée sans qu'aucune clause (garde OU corps) ne renvoie False :
                # Cela signifie que toutes les clauses ont réussi leur garde ET leur corps séquentiellement.
                return True # SUCCÈS GLOBAL (l'ET de toutes les clauses est VRAI)

            # Enregistrer cette instance unique du wrapper pour ce nom de prédicatfull.
            _principles_wrappers[pred_name] = principles_wrapper

        # Ajouter la fonction décorée et sa garde à la liste des clauses pour ce nom.
        # Utilise append() pour stocker dans l'ordre de déclaration (ordre type Prolog).
        _principles_registry[pred_name].append((guard, func))

        # Le décorateur retourne TOUJOURS l'instance unique du wrapper pour ce nom.
        # C'est ce qui sera assigné au nom de la fonction (ex: is_special_number).
        return _principles_wrappers[pred_name]

    return decorator

# --- NEW: Sentinel value and helper function for the Cut ---
# Nous n'avons plus besoin de l'exception PredicateCut si p_cut ne la lève pas.
# Cependant, l'exception PredicateFailed reste nécessaire pour les échecs de check/fail.

# Valeur unique pour signaler la coupe lors du yield
_PREDICATE_CUT_SENTINEL = object()

def p_cut():
    """
    Signals a Prolog-like cut by returning a special sentinel value.
    Must be used as 'yield p_cut()' inside a p_prolog generator.
    Execution continues after the yield in the clause body.
    """
    # print("p_cut() called (returns sentinel)") # Debug
    return _PREDICATE_CUT_SENTINEL

# === Registries et Décorateur pour le comportement à la Prolog ('p_prolog') ===
_p_prolog_registry = {}
_p_prolog_wrappers = {}

def p_prolog(guard=None):
    """
    Decorator for Prolog-like logic using generators. Attempts all clauses,
    collects yielded results, allowing backtracking and cut.
    Decorated functions must be generators (use 'yield').

    Args:
        guard: An optional function (args -> bool) determining if this clause
               is applicable. If the guard fails, this clause is skipped.
               If None, the guard always passes.
    """
    def decorator(func):
        pred_name = func.__name__

        if pred_name not in _p_prolog_registry:
            _p_prolog_registry[pred_name] = []

            @functools.wraps(func) # Wraps the *first* func definition
            def p_prolog_wrapper(*args, **kwargs):
                definitions = _p_prolog_registry.get(pred_name, [])
                solutions = [] # Liste pour collecter toutes les solutions produites (yielded)

                cut_encountered = False # Flag pour indiquer si une coupe a été rencontrée

                # Itérer sur TOUTES les clauses enregistrées, sauf si une coupe arrête la recherche plus tôt.
                for current_clause_index, (current_guard, pred_func) in enumerate(definitions):
                    # Si une coupe a été rencontrée dans une clause *précédente*, on arrête d'essayer les clauses *suivantes*.
                    if cut_encountered:
                         break # Sort de la boucle principale d'exploration des clauses

                    # --- Vérifier la Garde de la clause actuelle. ---
                    # Le try/except ici gère les erreurs d'exécution *dans la garde elle-même*.
                    try:
                        guard_ok = (current_guard is None) or current_guard(*args, **kwargs)
                    except Exception as e:
                        print(f"Error in guard for p_prolog {pred_name} (clause {pred_func.__name__}): {e}")
                        guard_ok = False # Une erreur dans la garde rend cette clause non applicable

                    # Si la garde a réussi (ou n'existait pas)...
                    if guard_ok:
                        # --- Essayer d'exécuter le Corps de la clause (qui doit être un générateur). ---
                        # Le try/except ici gère les exceptions levées *par le code À L'INTÉRIEUR du générateur*
                        # (PredicateFailed ou toute autre Exception).
                        try:
                            # Appeler la fonction décorée pour obtenir l'objet générateur
                            result_generator = pred_func(*args, **kwargs)

                            # Itérer sur les valeurs produites (yielded) par ce générateur.
                            # Cette boucle interne gère l'exécution et les exceptions du générateur.
                            for result in result_generator:
                                # Si une valeur spéciale (sentinel) est produite, c'est une coupe.
                                if result is _PREDICATE_CUT_SENTINEL:
                                    cut_encountered = True # Met le flag de coupe
                                    # On NE collecte PAS le sentinel dans la liste des solutions.
                                    # L'exécution du générateur (corps de la clause) continue APRÈS le yield p_cut().
                                    # La boucle 'for result in...' continue de consommer le générateur.
                                else:
                                    # Si une valeur normale est produite, c'est une solution trouvée par ce chemin.
                                    solutions.append(result) # Collecte la solution

                                # Si le générateur se termine normalement (StopIteration implicite),
                                # cela signifie que ce chemin de la clause a été exploré sans échec.
                                # Si une coupe a été rencontrée via yield p_cut(), cut_encountered est True.
                                # La boucle 'for result in result_generator' se termine.

                            # Si on atteint ici, le générateur a terminé SANS lever PredicateFailed ou une autre Exception.
                            # Si une coupe a été yieldée, cut_encountered est True. Le flag est mis.
                            # La boucle EXTERNE vérifiera ce flag avant la prochaine itération.

                        except PredicateFailed as e:
                            # === Branche Échec (dans le Corps) ===
                            # Une fonction check() ou fail() a été appelée À L'INTÉRIEUR du générateur.
                            # print(f"Clause {pred_func.__name__} pour {pred_name} a échoué durant l'exécution: {e}") # Debug
                            # Ce chemin d'exploration a échoué. On l'abandonne.
                            # Le 'pass' gère l'exception. La boucle EXTERNE continue vers la prochaine définition de clause.
                            pass # Gère l'échec de la clause - continue la recherche avec la clause suivante

                        except Exception as e:
                             # Une erreur inattendue s'est produite À L'INTÉRIEUR du générateur.
                             print(f"Erreur inattendue dans la clause p_prolog {pred_name} ({pred_func.__name__}): {e}")
                             # On la traite comme un échec pour ce chemin d'exploration.
                             # Le 'pass' gère l'exception, et la boucle EXTERNE continue à la clause suivante.
                             pass # Gère l'erreur inattendue - traitée comme échec de clause

                    # Else (guard_ok est False): La garde n'a pas réussi. Cette clause n'est pas applicable pour ces arguments.
                    # L'exécution passe simplement à la prochaine clause dans la boucle EXTERNE.

                # La boucle EXTERNE se termine soit parce que toutes les clauses ont été vérifiées,
                # soit parce que le flag 'cut_encountered' est passé à True.
                # Retourne la liste de toutes les solutions collectées à partir des chemins d'exploration.
                return solutions

            _p_prolog_wrappers[pred_name] = p_prolog_wrapper # Stocke l'instance unique du wrapper

        # Ajoute la fonction décorée actuelle et sa garde à la liste des clauses
        # pour ce nom de prédicat_prolog dans le registre.
        # Utilise append() pour stocker dans l'ordre de déclaration (ordre type Prolog).
        _p_prolog_registry[pred_name].append((guard, func))

        # Le décorateur retourne TOUJOURS l'instance unique du wrapper pour ce nom.
        # C'est ce qui sera assigné au nom de la fonction (ex: find_in_list).
        return _p_prolog_wrappers[pred_name]

    return decorator
