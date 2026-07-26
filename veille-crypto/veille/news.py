"""Brique veille news/blogs.

Scanne des flux RSS crypto reconnus pour détecter tôt l'annonce d'un
lancement de token par une personnalité connue. Extraction basique (V1) :
nom de la personnalité (depuis une watchlist) + ticker mentionné ($XXX) +
lien source. Pas d'analyse de sentiment.

Le résultat sert de bonus de score et d'alerte « attention renforcée ».
"""

from __future__ import annotations

import logging
import re
from calendar import timegm
from typing import Optional

try:
    import feedparser  # type: ignore
except ImportError:  # pragma: no cover
    feedparser = None

from .config import NewsConfig
from .models import NewsHit

log = logging.getLogger("veille.news")

# Ticker en $MAJUSCULES (2 à 10 caractères).
_RE_TICKER = re.compile(r"\$([A-Z]{2,10})\b")


def _published_ms(entry) -> int:
    for attr in ("published_parsed", "updated_parsed"):
        t = getattr(entry, attr, None)
        if t:
            return timegm(t) * 1000
    return 0


def collecter_news(cfg: NewsConfig, maintenant_ms: int) -> list[NewsHit]:
    """Renvoie les mentions récentes (< fenetre_news_heures) associant une
    personnalité surveillée à un lancement de token."""
    if not cfg.activer:
        return []
    if feedparser is None:
        log.warning("feedparser manquant : brique news désactivée")
        return []

    seuil_ms = maintenant_ms - int(cfg.fenetre_news_heures * 3_600_000)
    personnalites = [p.lower() for p in cfg.personnalites]
    hits: list[NewsHit] = []

    for url in cfg.flux_rss:
        try:
            flux = feedparser.parse(url)
        except Exception as exc:  # feedparser est tolérant mais on blinde
            log.warning("échec flux %s : %s", url, exc)
            continue

        source = flux.feed.get("title", url) if getattr(flux, "feed", None) else url
        for entry in getattr(flux, "entries", []):
            pub_ms = _published_ms(entry)
            if pub_ms and pub_ms < seuil_ms:
                continue
            titre = entry.get("title", "") or ""
            resume = entry.get("summary", "") or ""
            texte = f"{titre} {resume}"
            texte_bas = texte.lower()

            perso = next((p for p in personnalites if p in texte_bas), None)
            if not perso:
                continue

            m = _RE_TICKER.search(texte)
            ticker = m.group(1) if m else ""

            hits.append(
                NewsHit(
                    source=source,
                    title=titre,
                    link=entry.get("link", "") or "",
                    published_ms=pub_ms,
                    personality=perso,
                    ticker=ticker,
                )
            )
    return hits


def associer_news(symbol: str, hits: list[NewsHit]) -> Optional[NewsHit]:
    """Associe un token à une news si son ticker correspond (match exact,
    insensible à la casse)."""
    if not symbol:
        return None
    sym = symbol.upper().lstrip("$")
    for h in hits:
        if h.ticker and h.ticker.upper() == sym:
            return h
    return None
