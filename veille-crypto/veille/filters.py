"""Filtres anti-rug minimum (V1).

Un filtre renvoie ``(ok, raison)``. Le token n'est retenu que s'il passe
TOUS les filtres. Les critères de sécurité (LP lock, mint renoncé,
concentration holders) dépendent d'une source qui les fournit ; quand la
donnée est absente (None), le comportement suit ``rejeter_si_inconnu`` :
indulgent en V1 (DexScreener seul ne donne pas ces champs), à durcir dès
qu'une source sécurité (Birdeye) est branchée.

Rien ici n'est une garantie : ces filtres écartent le pire du bruit, ils
ne certifient pas qu'un token est sûr.
"""

from __future__ import annotations

from .config import FiltresConfig
from .models import TokenSnapshot

_MS_PAR_HEURE = 3_600_000


def age_heures(snap: TokenSnapshot, maintenant_ms: int) -> float | None:
    if not snap.pair_created_at_ms:
        return None
    return (maintenant_ms - snap.pair_created_at_ms) / _MS_PAR_HEURE


def passe_filtres(
    snap: TokenSnapshot, cfg: FiltresConfig, maintenant_ms: int
) -> tuple[bool, list[str]]:
    """Renvoie ``(retenu, raisons_de_rejet)``."""
    rejets: list[str] = []

    # -- Liquidité minimum (donnée fiable et présente) ------------------
    if snap.liquidity_usd is None:
        if cfg.rejeter_si_inconnu:
            rejets.append("liquidité inconnue")
    elif snap.liquidity_usd < cfg.liquidite_min_usd:
        rejets.append(
            f"liquidité {snap.liquidity_usd:,.0f}$ < {cfg.liquidite_min_usd:,.0f}$"
        )

    # -- Âge du contrat -------------------------------------------------
    age = age_heures(snap, maintenant_ms)
    if age is None:
        if cfg.rejeter_si_inconnu:
            rejets.append("âge inconnu")
    else:
        if age < cfg.age_min_heures:
            rejets.append(f"trop jeune ({age:.1f}h < {cfg.age_min_heures}h)")
        elif age > cfg.age_max_heures:
            rejets.append(f"trop vieux ({age:.0f}h > {cfg.age_max_heures:.0f}h)")

    # -- Concentration top 10 holders -----------------------------------
    if snap.top10_holders_pct is None:
        if cfg.rejeter_si_inconnu:
            rejets.append("concentration holders inconnue")
    elif snap.top10_holders_pct > cfg.top10_holders_max_pct:
        rejets.append(
            f"top10 = {snap.top10_holders_pct:.0f}% > {cfg.top10_holders_max_pct:.0f}%"
        )

    # -- LP lock --------------------------------------------------------
    if cfg.exiger_lp_lock:
        if snap.lp_locked is None:
            if cfg.rejeter_si_inconnu:
                rejets.append("LP lock inconnu")
        elif not snap.lp_locked:
            rejets.append("LP non verrouillée")

    # -- Mint authority (Solana) / fonction mint (EVM) ------------------
    if cfg.exiger_mint_renonce:
        if snap.mint_renounced is None:
            if cfg.rejeter_si_inconnu:
                rejets.append("mint authority inconnue")
        elif not snap.mint_renounced:
            rejets.append("mint authority non renoncée")

    return (len(rejets) == 0, rejets)
