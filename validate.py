def check_all(principles, knowledge_base):
    utterances = principles.split("\n")
    responses= {}
    for u in utterances:
        responses[u] = check_principle(u, knowledge_base)
    return responses
