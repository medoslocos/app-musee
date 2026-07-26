"""Notifier Telegram — push groupé, lisible mobile.

Envoie UNE alerte groupée par cycle (pas de spam temps réel). En mode
``dry_run`` (défaut), rien n'est envoyé : le message est écrit sur la
sortie standard, ce qui permet de tester sans bot ni chat_id.

Le pied de message (avertissement) est NON NÉGOCIABLE et ajouté à chaque
envoi : le score est une anomalie statistique, jamais un signal d'achat.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import requests

from .config import TelegramConfig
from .models import ScoredToken

log = logging.getLogger("veille.notifier")

_AVERTISSEMENT = (
    "⚠️ Rappel : un score élevé = anomalie statistique détectée, pas une "
    "prédiction de gain. La quasi-totalité de ces tokens perdront toute "
    "leur valeur (rug pull, absence de liquidité, dump du dev). "
    "Aucune garantie, aucun signal d'achat. Décision 100% manuelle."
)


def _fmt_usd(v: float | None) -> str:
    if v is None:
        return "?"
    if v >= 1_000_000:
        return f"${v/1_000_000:.1f}M"
    if v >= 1_000:
        return f"${v/1_000:.0f}k"
    return f"${v:.0f}"


def _fmt_age(heures: float | None) -> str:
    if heures is None:
        return "?"
    if heures < 48:
        return f"{heures:.0f}h"
    return f"{heures/24:.0f}j"


def construire_message(
    scores: list[ScoredToken], maintenant_ms: int, ages_h: dict[str, float | None]
) -> str:
    ts = datetime.fromtimestamp(maintenant_ms / 1000, tz=timezone.utc).strftime(
        "%Y-%m-%d %H:%M UTC"
    )
    lignes = [f"🔍 VEILLE CRYPTO — {ts}", f"{len(scores)} token(s) détecté(s) cette période", ""]

    for i, st in enumerate(scores, 1):
        s = st.snapshot
        cle = f"{s.chain}:{s.token_address}"
        drapeau = " 🚨PERSO" if st.personality_bonus else ""
        lignes.append(f"{i}. {s.symbol or '?'} — score {st.score}/10{drapeau}")
        lignes.append(
            f"   MC: {_fmt_usd(s.market_cap_usd or s.fdv_usd)} | "
            f"Liq: {_fmt_usd(s.liquidity_usd)} | "
            f"Vol 1h: {_fmt_usd(s.volume_h1)}"
        )
        holders = f"{s.holders}" if s.holders is not None else "?"
        lignes.append(
            f"   Chain: {s.chain} | Âge: {_fmt_age(ages_h.get(cle))} | Holders: {holders}"
        )
        if st.reasons:
            lignes.append(f"   {' · '.join(st.reasons[:3])}")
        lignes.append(f"   {s.url_dexscreener()}")
        lignes.append("")

    lignes.append(_AVERTISSEMENT)
    return "\n".join(lignes)


class TelegramNotifier:
    def __init__(self, cfg: TelegramConfig) -> None:
        self.cfg = cfg

    def envoyer(self, message: str) -> bool:
        if self.cfg.dry_run or not self.cfg.bot_token or not self.cfg.chat_id:
            if not self.cfg.dry_run:
                log.warning("Telegram non configuré (token/chat_id) — bascule en dry-run")
            print("\n----- ALERTE (dry-run) -----")
            print(message)
            print("----- fin alerte -----\n")
            return True

        url = f"https://api.telegram.org/bot{self.cfg.bot_token}/sendMessage"
        try:
            resp = requests.post(
                url,
                json={
                    "chat_id": self.cfg.chat_id,
                    "text": message,
                    "disable_web_page_preview": True,
                },
                timeout=15,
            )
        except requests.RequestException as exc:
            log.error("échec envoi Telegram : %s", exc)
            return False
        if not resp.ok:
            log.error("Telegram a répondu %s : %s", resp.status_code, resp.text[:200])
            return False
        return True
