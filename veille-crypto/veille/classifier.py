"""Classificateur memecoin vs utilitaire (heuristique simple, V1).

Objectif : filtrer le bruit des tokens utilitaires qui ne correspondent
pas au pattern recherché. Pas de NLP — juste des signaux binaires
pondérés, transparents et faciles à ajuster.

Signaux « memecoin » (score +) :
  - nom/ticker à consonance meme (mots, animaux, tickers connus)
  - absence totale de doc technique / site / description

Signaux « utilitaire » (score -) :
  - présence de mots-clés d'usage (protocol, staking, DeFi, oracle…)
  - présence d'un site web / whitepaper / roadmap déclarée

Sortie : tag ∈ {"memecoin", "utilitaire", "inconnu"}.
"""

from __future__ import annotations

from .models import TokenSnapshot

# Vocabulaire meme fréquent (minuscule, sous-chaîne).
_MOTS_MEME = {
    "pepe", "doge", "shib", "inu", "cat", "wif", "bonk", "moon", "elon",
    "chad", "wojak", "meme", "floki", "based", "giga", "turbo", "pump",
    "frog", "dog", "kitty", "baby", "safe", "rocket", "lambo", "ape",
    "banana", "hat", "coin", "trump", "maga", "boden", "harambe",
}

# Vocabulaire utilitaire fréquent.
_MOTS_UTILITAIRE = {
    "protocol", "network", "finance", "swap", "oracle", "bridge", "staking",
    "stake", "yield", "vault", "lending", "governance", "dao", "layer",
    "chain", "infra", "data", "ai", "compute", "cloud", "storage",
    "identity", "wallet", "exchange", "defi", "rwa", "restaking",
}

# Mots-clés de doc technique dans la description.
_MOTS_DOC = {"whitepaper", "roadmap", "use case", "utility", "protocol", "mainnet"}


def _tokens_texte(*textes: str) -> set[str]:
    mots: set[str] = set()
    for t in textes:
        for brut in t.lower().replace("/", " ").replace("-", " ").split():
            mots.add("".join(c for c in brut if c.isalnum()))
    return {m for m in mots if m}


def classifier(snap: TokenSnapshot) -> tuple[str, list[str]]:
    """Renvoie ``(tag, raisons)``."""
    raisons: list[str] = []
    score_meme = 0
    score_util = 0

    mots = _tokens_texte(snap.symbol, snap.name)

    if mots & _MOTS_MEME:
        score_meme += 2
        raisons.append("nom/ticker à consonance meme")
    if mots & _MOTS_UTILITAIRE:
        score_util += 2
        raisons.append("vocabulaire utilitaire dans le nom")

    desc = (snap.description or "").lower()
    if desc and any(mot in desc for mot in _MOTS_DOC):
        score_util += 2
        raisons.append("doc technique mentionnée")

    a_site = bool(snap.websites)
    a_desc = bool(desc.strip())

    if not a_site and not a_desc:
        # Absence totale de doc technique = signal fort memecoin (cf. brief).
        score_meme += 2
        raisons.append("aucune doc/site (signal fort meme)")
    elif a_site:
        score_util += 1
        raisons.append("site web présent")

    if score_meme == 0 and score_util == 0:
        return "inconnu", ["aucun signal exploitable"]
    if score_meme >= score_util:
        return "memecoin", raisons
    return "utilitaire", raisons
