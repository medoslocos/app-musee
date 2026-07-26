"""Source GeckoTerminal — pools récents agrégés on-chain.

API publique gratuite (versionnée) :
    GET https://api.geckoterminal.com/api/v2/networks/<net>/new_pools

Sert de source « nouveautés » complémentaire à DexScreener. On mappe la
chaîne DexScreener (« solana ») vers l'identifiant réseau GeckoTerminal
(« solana » aussi, mais « ethereum » diffère de « eth » côté DexScreener).
"""

from __future__ import annotations

from typing import Any, Optional

from ..models import TokenSnapshot
from .base import Source

# DexScreener chainId -> GeckoTerminal network id
_RESEAUX = {
    "solana": "solana",
    "ethereum": "eth",
    "eth": "eth",
    "bsc": "bsc",
    "base": "base",
    "arbitrum": "arbitrum",
    "polygon": "polygon_pos",
}


def _f(x: Any) -> Optional[float]:
    try:
        return float(x) if x is not None and x != "" else None
    except (TypeError, ValueError):
        return None


class GeckoTerminalSource(Source):
    nom = "geckoterminal"
    BASE = "https://api.geckoterminal.com/api/v2"

    def scanner(self, chaines: list[str], requetes: list[str]) -> list[TokenSnapshot]:
        out: list[TokenSnapshot] = []
        vus: set[tuple[str, str]] = set()
        for chaine in chaines:
            net = _RESEAUX.get(chaine.lower())
            if not net:
                continue
            data = self._get(f"{self.BASE}/networks/{net}/new_pools")
            if not data:
                continue
            for pool in data.get("data") or []:
                snap = self._parser_pool(pool, chaine.lower())
                if snap is None:
                    continue
                cle = (snap.chain, snap.token_address)
                if cle in vus:
                    continue
                vus.add(cle)
                out.append(snap)
        return out

    def _parser_pool(self, pool: dict[str, Any], chain: str) -> Optional[TokenSnapshot]:
        attrs = pool.get("attributes") or {}
        rel = pool.get("relationships") or {}
        base_rel = ((rel.get("base_token") or {}).get("data") or {})
        # id de la forme "solana_<address>"
        token_id = base_rel.get("id") or ""
        addr = token_id.split("_", 1)[1] if "_" in token_id else token_id
        if not addr:
            return None

        vol = attrs.get("volume_usd") or {}
        chg = attrs.get("price_change_percentage") or {}
        name = attrs.get("name") or ""  # ex. "WIF / SOL"
        symbol = name.split("/")[0].strip() if "/" in name else name.strip()

        return TokenSnapshot(
            chain=chain,
            token_address=addr,
            symbol=symbol,
            name=name,
            pair_address=attrs.get("address") or "",
            source=self.nom,
            price_usd=_f(attrs.get("base_token_price_usd")),
            market_cap_usd=_f(attrs.get("market_cap_usd") or attrs.get("fdv_usd")),
            fdv_usd=_f(attrs.get("fdv_usd")),
            liquidity_usd=_f(attrs.get("reserve_in_usd")),
            volume_h1=_f(vol.get("h1")),
            volume_h6=_f(vol.get("h6")),
            volume_h24=_f(vol.get("h24")),
            price_change_h1=_f(chg.get("h1")),
            price_change_h6=_f(chg.get("h6")),
            price_change_h24=_f(chg.get("h24")),
            pair_created_at_ms=None,  # champ ISO côté GT ; ignoré en V1
        )
