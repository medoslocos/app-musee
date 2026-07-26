"""Scoring 0-10 des anomalies.

Le score est une ANOMALIE STATISTIQUE, pas une prédiction de gain ni un
signal d'achat. Il combine des composantes normalisées [0,1] pondérées :

  - vélocité volume : le volume de la dernière heure dépasse-t-il le rythme
    horaire moyen des 24h ? (accélération)
  - croissance liquidité : delta % de la liquidité depuis le dernier scan
  - croissance holders : delta % du nombre de holders depuis le dernier scan
  - ratio liquidité/market cap : détecte les caps gonflées artificiellement
  - momentum prix : variation de prix sur 1h (borne le côté positif)

Amortissement par couverture : un score élevé ne doit pas reposer sur un
seul signal. Le score de base est pondéré par la part des composantes
réellement disponibles (les deltas liquidité/holders exigent un scan
précédent — le tout premier cycle après déploiement est donc volontairement
prudent, faute d'historique). Voir ``plancher_couverture``.

Un bonus additif « personnalité connue » peut s'ajouter (voir config).
⚠️ Ce bonus est un facteur d'ATTENTION renforcée, pas de sécurité : le
pattern documenté est un dump insider rapide et violent. Voir README.
"""

from __future__ import annotations

from typing import Optional

from .config import ScoringConfig
from .models import NewsHit, ScoredToken, TokenSnapshot


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def _croissance_pct(actuel: Optional[float], precedent: Optional[float]) -> Optional[float]:
    if actuel is None or precedent is None or precedent <= 0:
        return None
    return (actuel - precedent) / precedent * 100.0


def _composante_velocite_volume(snap: TokenSnapshot) -> Optional[float]:
    if snap.volume_h1 is None or snap.volume_h24 is None or snap.volume_h24 <= 0:
        return None
    rythme_moyen_h = snap.volume_h24 / 24.0
    if rythme_moyen_h <= 0:
        return None
    ratio = snap.volume_h1 / rythme_moyen_h  # >1 = accélération
    # 1x -> 0 ; 4x -> 1 (sature au-delà de 4x le rythme moyen).
    return _clamp01((ratio - 1.0) / 3.0)


def _composante_croissance(delta_pct: Optional[float], plein: float) -> Optional[float]:
    """Mappe un delta % de croissance sur [0,1]. ``plein`` = % pour atteindre 1."""
    if delta_pct is None:
        return None
    return _clamp01(delta_pct / plein)


def _composante_ratio_liq_mcap(snap: TokenSnapshot) -> Optional[float]:
    mcap = snap.market_cap_usd or snap.fdv_usd
    if snap.liquidity_usd is None or not mcap or mcap <= 0:
        return None
    ratio = snap.liquidity_usd / mcap
    # ratio faible (<2%) = cap gonflée -> proche de 0 ; >=20% -> 1.
    return _clamp01((ratio - 0.02) / 0.18)


def _composante_momentum(snap: TokenSnapshot) -> Optional[float]:
    if snap.price_change_h1 is None:
        return None
    # 0% -> 0 ; +50%/1h -> 1 (on ne récompense pas au-delà).
    return _clamp01(snap.price_change_h1 / 50.0)


def scorer(
    snap: TokenSnapshot,
    precedent: Optional[TokenSnapshot],
    cfg: ScoringConfig,
    tag: str = "memecoin",
    news_hit: Optional[NewsHit] = None,
) -> ScoredToken:
    """Calcule le ScoredToken. Les composantes absentes sont ignorées et
    leur poids retiré du dénominateur (pas de pénalité pour donnée manquante).
    """
    croiss_liq = _croissance_pct(
        snap.liquidity_usd, precedent.liquidity_usd if precedent else None
    )
    croiss_holders = _croissance_pct(
        snap.holders, precedent.holders if precedent else None
    )

    parties: dict[str, tuple[Optional[float], float]] = {
        "velocite_volume": (_composante_velocite_volume(snap), cfg.poids_velocite_volume),
        "croissance_liquidite": (_composante_croissance(croiss_liq, 100.0), cfg.poids_croissance_liquidite),
        "croissance_holders": (_composante_croissance(croiss_holders, 50.0), cfg.poids_croissance_holders),
        "ratio_liq_mcap": (_composante_ratio_liq_mcap(snap), cfg.poids_ratio_liq_mcap),
        "momentum_prix": (_composante_momentum(snap), cfg.poids_momentum_prix),
    }

    poids_total = 0.0
    poids_max = 0.0
    somme = 0.0
    components: dict[str, float] = {}
    for nom, (valeur, poids) in parties.items():
        poids_max += poids
        if valeur is None:
            continue
        components[nom] = round(valeur, 3)
        somme += valeur * poids
        poids_total += poids

    base = (somme / poids_total) * 10.0 if poids_total > 0 else 0.0

    # Amortissement par couverture : un score haut doit reposer sur
    # plusieurs signaux, pas sur une seule composante disponible.
    couverture = poids_total / poids_max if poids_max > 0 else 0.0
    facteur = cfg.plancher_couverture + (1.0 - cfg.plancher_couverture) * couverture
    base *= facteur
    if poids_total > 0:
        components["couverture"] = round(couverture, 3)

    reasons: list[str] = []
    if croiss_liq is not None and croiss_liq > 0:
        reasons.append(f"liquidité +{croiss_liq:.0f}%")
    if croiss_holders is not None and croiss_holders > 0:
        reasons.append(f"holders +{croiss_holders:.0f}%")
    vv = components.get("velocite_volume")
    if vv and vv > 0.5:
        reasons.append("forte accélération du volume")

    score = base
    if news_hit is not None:
        score += cfg.bonus_personnalite
        components["bonus_personnalite"] = cfg.bonus_personnalite
        reasons.append(f"⚠ associé à {news_hit.personality or 'une personnalité'} (attention accrue)")

    score = max(0.0, min(10.0, score))

    return ScoredToken(
        snapshot=snap,
        score=round(score, 1),
        tag=tag,
        components=components,
        reasons=reasons,
        news_hit=news_hit,
    )
