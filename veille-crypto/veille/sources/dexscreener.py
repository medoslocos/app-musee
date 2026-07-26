"""Source DexScreener — paires DEX multi-chaînes (volume, liquidité, prix).

API publique gratuite, sans clé. Endpoint de recherche :
    GET https://api.dexscreener.com/latest/dex/search?q=<terme>

Faute d'endpoint « nouveaux tokens » officiel stable, on amorce le scan
par une liste de requêtes (config.sources.requetes_recherche) puis on
filtre par chaîne et par âge en aval. C'est volontairement simple pour la
V1 ; une source dédiée aux lancements (Pump.fun) viendra plus tard.
"""

from __future__ import annotations

from typing import Any, Optional

from ..models import TokenSnapshot
from .base import Source


def _f(x: Any) -> Optional[float]:
    """Cast float tolérant (None/'' -> None)."""
    try:
        return float(x) if x is not None and x != "" else None
    except (TypeError, ValueError):
        return None


def _i(x: Any) -> Optional[int]:
    try:
        return int(x) if x is not None and x != "" else None
    except (TypeError, ValueError):
        return None


class DexScreenerSource(Source):
    nom = "dexscreener"
    BASE = "https://api.dexscreener.com"

    def scanner(self, chaines: list[str], requetes: list[str]) -> list[TokenSnapshot]:
        chaines_set = {c.lower() for c in chaines}
        vus: set[tuple[str, str]] = set()
        out: list[TokenSnapshot] = []

        for terme in requetes:
            data = self._get(f"{self.BASE}/latest/dex/search", {"q": terme})
            if not data:
                continue
            for pair in data.get("pairs") or []:
                chain = (pair.get("chainId") or "").lower()
                if chaines_set and chain not in chaines_set:
                    continue
                snap = self._parser_pair(pair)
                if snap is None:
                    continue
                cle = (snap.chain, snap.token_address)
                if cle in vus:
                    continue
                vus.add(cle)
                out.append(snap)
        return out

    def _parser_pair(self, pair: dict[str, Any]) -> Optional[TokenSnapshot]:
        base = pair.get("baseToken") or {}
        addr = base.get("address")
        if not addr:
            return None

        volume = pair.get("volume") or {}
        change = pair.get("priceChange") or {}
        liq = pair.get("liquidity") or {}
        txns = pair.get("txns") or {}
        txn_h1 = txns.get("h1") or {}
        info = pair.get("info") or {}

        websites = [w.get("url", "") for w in (info.get("websites") or []) if w.get("url")]
        socials = [s.get("url") or s.get("handle", "") for s in (info.get("socials") or [])]

        return TokenSnapshot(
            chain=(pair.get("chainId") or "").lower(),
            token_address=addr,
            symbol=base.get("symbol") or "",
            name=base.get("name") or "",
            pair_address=pair.get("pairAddress") or "",
            source=self.nom,
            price_usd=_f(pair.get("priceUsd")),
            market_cap_usd=_f(pair.get("marketCap")),
            fdv_usd=_f(pair.get("fdv")),
            liquidity_usd=_f(liq.get("usd")),
            volume_h1=_f(volume.get("h1")),
            volume_h6=_f(volume.get("h6")),
            volume_h24=_f(volume.get("h24")),
            price_change_h1=_f(change.get("h1")),
            price_change_h6=_f(change.get("h6")),
            price_change_h24=_f(change.get("h24")),
            txns_h1_buys=_i(txn_h1.get("buys")),
            txns_h1_sells=_i(txn_h1.get("sells")),
            pair_created_at_ms=_i(pair.get("pairCreatedAt")),
            description=info.get("description") or "",
            websites=websites,
            socials=[s for s in socials if s],
        )
