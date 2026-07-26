"""Stockage local des scans (SQLite).

Objectif double :
1. Historique — permet de calculer des deltas (croissance liquidité,
   holders, volume) entre deux scans du même token.
2. Backtest a posteriori — on garde chaque alerte envoyée pour vérifier
   plus tard si le score avait une valeur prédictive (phase suivante du brief).

Aucune donnée sensible ici : uniquement des métriques de marché publiques.
"""

from __future__ import annotations

import json
import sqlite3
from typing import Optional

from .models import ScoredToken, TokenSnapshot


_SCHEMA = """
CREATE TABLE IF NOT EXISTS snapshots (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    scanned_at_ms INTEGER NOT NULL,
    chain         TEXT NOT NULL,
    token_address TEXT NOT NULL,
    symbol        TEXT,
    price_usd     REAL,
    market_cap_usd REAL,
    liquidity_usd REAL,
    volume_h1     REAL,
    volume_h24    REAL,
    holders       INTEGER,
    payload       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snap_token
    ON snapshots (chain, token_address, scanned_at_ms);

CREATE TABLE IF NOT EXISTS alertes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    envoyee_at_ms INTEGER NOT NULL,
    chain         TEXT NOT NULL,
    token_address TEXT NOT NULL,
    symbol        TEXT,
    score         REAL NOT NULL,
    tag           TEXT,
    payload       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alerte_token
    ON alertes (chain, token_address, envoyee_at_ms);
"""


class Storage:
    def __init__(self, db_path: str = "veille.db") -> None:
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(_SCHEMA)
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    # -- Snapshots -------------------------------------------------------

    def enregistrer_snapshot(self, snap: TokenSnapshot) -> None:
        self.conn.execute(
            """INSERT INTO snapshots
               (scanned_at_ms, chain, token_address, symbol, price_usd,
                market_cap_usd, liquidity_usd, volume_h1, volume_h24,
                holders, payload)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                snap.scanned_at_ms, snap.chain, snap.token_address, snap.symbol,
                snap.price_usd, snap.market_cap_usd, snap.liquidity_usd,
                snap.volume_h1, snap.volume_h24, snap.holders,
                json.dumps(snap.to_dict()),
            ),
        )
        self.conn.commit()

    def dernier_snapshot_avant(
        self, chain: str, token_address: str, avant_ms: int
    ) -> Optional[TokenSnapshot]:
        """Snapshot le plus récent strictement antérieur à ``avant_ms``.

        Sert à calculer les deltas d'un cycle à l'autre.
        """
        row = self.conn.execute(
            """SELECT payload FROM snapshots
               WHERE chain = ? AND token_address = ? AND scanned_at_ms < ?
               ORDER BY scanned_at_ms DESC LIMIT 1""",
            (chain, token_address, avant_ms),
        ).fetchone()
        if not row:
            return None
        return TokenSnapshot(**json.loads(row["payload"]))

    # -- Alertes ---------------------------------------------------------

    def enregistrer_alerte(self, st: ScoredToken) -> None:
        snap = st.snapshot
        payload = {
            "snapshot": snap.to_dict(),
            "score": st.score,
            "tag": st.tag,
            "components": st.components,
            "reasons": st.reasons,
            "personality": st.news_hit.personality if st.news_hit else "",
        }
        self.conn.execute(
            """INSERT INTO alertes
               (envoyee_at_ms, chain, token_address, symbol, score, tag, payload)
               VALUES (?,?,?,?,?,?,?)""",
            (
                snap.scanned_at_ms, snap.chain, snap.token_address, snap.symbol,
                st.score, st.tag, json.dumps(payload),
            ),
        )
        self.conn.commit()

    def deja_alerte_recemment(
        self, chain: str, token_address: str, depuis_ms: int
    ) -> bool:
        """Anti-doublon : a-t-on déjà alerté sur ce token depuis ``depuis_ms`` ?"""
        row = self.conn.execute(
            """SELECT 1 FROM alertes
               WHERE chain = ? AND token_address = ? AND envoyee_at_ms >= ?
               LIMIT 1""",
            (chain, token_address, depuis_ms),
        ).fetchone()
        return row is not None
