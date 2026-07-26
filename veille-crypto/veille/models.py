"""Modèles de données partagés par les modules de veille.

On garde des dataclasses simples et sérialisables : elles voyagent des
sources vers le stockage (SQLite), le scoring et le notifier sans couplage.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Optional


@dataclass
class TokenSnapshot:
    """Photo d'un token à un instant T, telle que renvoyée par une source.

    Tous les champs numériques sont optionnels : selon la source, certaines
    métriques ne sont pas disponibles (ex. le nombre de holders n'existe pas
    sur DexScreener). Le scoring et les filtres doivent gérer les ``None``.
    """

    # Identité
    chain: str
    token_address: str
    symbol: str
    name: str = ""
    pair_address: str = ""
    source: str = ""

    # Marché
    price_usd: Optional[float] = None
    market_cap_usd: Optional[float] = None
    fdv_usd: Optional[float] = None
    liquidity_usd: Optional[float] = None

    # Volume par fenêtre (USD)
    volume_h1: Optional[float] = None
    volume_h6: Optional[float] = None
    volume_h24: Optional[float] = None

    # Variation de prix (%) par fenêtre
    price_change_h1: Optional[float] = None
    price_change_h6: Optional[float] = None
    price_change_h24: Optional[float] = None

    # Transactions récentes
    txns_h1_buys: Optional[int] = None
    txns_h1_sells: Optional[int] = None

    # Holders (souvent None hors Birdeye)
    holders: Optional[int] = None

    # Sécurité contrat (souvent None en V1 selon la source)
    lp_locked: Optional[bool] = None
    mint_renounced: Optional[bool] = None
    top10_holders_pct: Optional[float] = None

    # Âge
    pair_created_at_ms: Optional[int] = None

    # Métadonnées pour le classificateur memecoin
    description: str = ""
    websites: list[str] = field(default_factory=list)
    socials: list[str] = field(default_factory=list)

    # Horodatage du scan (ms epoch) — injecté par le scanner
    scanned_at_ms: int = 0

    def url_dexscreener(self) -> str:
        if self.pair_address:
            return f"https://dexscreener.com/{self.chain}/{self.pair_address}"
        return f"https://dexscreener.com/{self.chain}/{self.token_address}"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class NewsHit:
    """Une mention de lancement de token par une personnalité dans les news."""

    source: str
    title: str
    link: str
    published_ms: int
    personality: str = ""
    ticker: str = ""


@dataclass
class ScoredToken:
    """Résultat du scoring : snapshot + score + détail des composantes."""

    snapshot: TokenSnapshot
    score: float
    tag: str = "memecoin"  # "memecoin" | "utilitaire" | "inconnu"
    components: dict[str, float] = field(default_factory=dict)
    reasons: list[str] = field(default_factory=list)
    news_hit: Optional[NewsHit] = None

    @property
    def personality_bonus(self) -> bool:
        return self.news_hit is not None
