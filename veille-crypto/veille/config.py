"""Chargement de la configuration.

Priorité : variables d'environnement (secrets) > fichier YAML (seuils) >
valeurs par défaut codées ici. Les seuils du brief marqués « à définir »
ont des valeurs de départ raisonnables, toutes surchargeables.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field, fields, is_dataclass
from typing import Any

try:
    import yaml  # type: ignore
except ImportError:  # pragma: no cover - yaml est dans requirements.txt
    yaml = None


@dataclass
class FiltresConfig:
    """Filtres anti-rug minimum (V1). Un token qui échoue à un filtre
    strict est écarté ; les filtres inconnus (données absentes) sont
    traités selon ``rejeter_si_inconnu``."""

    liquidite_min_usd: float = 10_000.0
    age_min_heures: float = 1.0
    age_max_heures: float = 24.0 * 14  # au-delà, ce n'est plus une "nouveauté"
    top10_holders_max_pct: float = 40.0
    exiger_lp_lock: bool = True
    exiger_mint_renonce: bool = True
    # Si une donnée de sécurité est absente (None), faut-il rejeter par
    # prudence ? En V1 on est indulgent (False) car DexScreener seul ne
    # fournit pas ces champs ; passer à True dès qu'une source sécurité
    # (Birdeye) est branchée.
    rejeter_si_inconnu: bool = False


@dataclass
class ScoringConfig:
    """Pondérations du score 0-10. La somme des poids est normalisée."""

    poids_velocite_volume: float = 3.0
    poids_croissance_liquidite: float = 2.0
    poids_croissance_holders: float = 2.0
    poids_ratio_liq_mcap: float = 2.0
    poids_momentum_prix: float = 1.0
    # Bonus additif (points bruts) si le token est associé à une
    # personnalité connue dans les news. ATTENTION : ce n'est PAS un
    # facteur de sécurité — voir README / brief. C'est un signal
    # « surveiller de très près », capé pour ne pas dominer le score.
    bonus_personnalite: float = 1.5
    seuil_alerte: float = 6.0
    # Amortissement par couverture : facteur appliqué au score de base
    # quand toutes les composantes ne sont pas disponibles. À couverture
    # nulle le facteur vaut ``plancher_couverture`` ; à couverture pleine
    # il vaut 1. Évite qu'un seul signal fort ne donne un 10/10 sur des
    # données trop minces (0 = amortissement max, 1 = désactivé).
    plancher_couverture: float = 0.4


@dataclass
class NewsConfig:
    activer: bool = True
    flux_rss: list[str] = field(
        default_factory=lambda: [
            "https://www.coindesk.com/arc/outboundfeeds/rss/",
            "https://cointelegraph.com/rss",
            "https://decrypt.co/feed",
            "https://www.theblock.co/rss.xml",
        ]
    )
    # Personnalités surveillées (matching insensible à la casse). À enrichir.
    personnalites: list[str] = field(
        default_factory=lambda: [
            "trump", "musk", "elon", "ronaldo", "messi", "kardashian",
            "andrew tate", "iggy azalea", "caitlyn jenner", "davido",
        ]
    )
    fenetre_news_heures: float = 48.0


@dataclass
class SourcesConfig:
    dexscreener_activer: bool = True
    geckoterminal_activer: bool = True
    # Chaînes à scanner (identifiants DexScreener/GeckoTerminal)
    chaines: list[str] = field(default_factory=lambda: ["solana"])
    # Requêtes de recherche DexScreener (mots-clés meme fréquents) — sert
    # d'amorce faute d'endpoint « nouveaux tokens » officiel et stable.
    requetes_recherche: list[str] = field(
        default_factory=lambda: ["SOL", "pepe", "cat", "dog", "wif", "moon"]
    )
    timeout_s: float = 15.0
    # Délai entre requêtes HTTP pour rester poli avec les API gratuites.
    delai_requete_s: float = 1.0


@dataclass
class TelegramConfig:
    bot_token: str = ""
    chat_id: str = ""
    # Mode simulation : n'envoie rien, écrit l'alerte sur stdout.
    dry_run: bool = True


@dataclass
class Config:
    intervalle_heures: float = 3.5
    max_alertes_par_cycle: int = 15
    db_path: str = "veille.db"
    filtres: FiltresConfig = field(default_factory=FiltresConfig)
    scoring: ScoringConfig = field(default_factory=ScoringConfig)
    news: NewsConfig = field(default_factory=NewsConfig)
    sources: SourcesConfig = field(default_factory=SourcesConfig)
    telegram: TelegramConfig = field(default_factory=TelegramConfig)


def _appliquer_dict(obj: Any, data: dict[str, Any]) -> None:
    """Applique récursivement un dict sur une dataclass déjà instanciée."""
    champs = {f.name: f for f in fields(obj)}
    for cle, valeur in data.items():
        if cle not in champs:
            continue
        actuel = getattr(obj, cle)
        if is_dataclass(actuel) and isinstance(valeur, dict):
            _appliquer_dict(actuel, valeur)
        else:
            setattr(obj, cle, valeur)


def charger_config(chemin_yaml: str | None = None) -> Config:
    """Construit la config : défauts < YAML < variables d'environnement."""
    cfg = Config()

    if chemin_yaml and os.path.exists(chemin_yaml):
        if yaml is None:
            raise RuntimeError("PyYAML manquant : pip install -r requirements.txt")
        with open(chemin_yaml, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        _appliquer_dict(cfg, data)

    # Secrets et surcharges via l'environnement (jamais dans le YAML versionné).
    if tok := os.getenv("TELEGRAM_BOT_TOKEN"):
        cfg.telegram.bot_token = tok
    if chat := os.getenv("TELEGRAM_CHAT_ID"):
        cfg.telegram.chat_id = chat
    if os.getenv("TELEGRAM_DRY_RUN") is not None:
        cfg.telegram.dry_run = os.getenv("TELEGRAM_DRY_RUN", "").lower() in (
            "1", "true", "yes", "oui"
        )
    if iv := os.getenv("VEILLE_INTERVALLE_HEURES"):
        cfg.intervalle_heures = float(iv)
    if db := os.getenv("VEILLE_DB_PATH"):
        cfg.db_path = db

    return cfg
