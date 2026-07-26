"""Tests du stockage SQLite (deltas et anti-doublon)."""

from veille.models import ScoredToken, TokenSnapshot
from veille.storage import Storage


def _snap(t, **kw):
    base = dict(chain="solana", token_address="A", symbol="X", scanned_at_ms=t)
    base.update(kw)
    return TokenSnapshot(**base)


def test_dernier_snapshot_avant(tmp_path):
    st = Storage(str(tmp_path / "t.db"))
    st.enregistrer_snapshot(_snap(100, liquidity_usd=1000))
    st.enregistrer_snapshot(_snap(200, liquidity_usd=2000))
    prev = st.dernier_snapshot_avant("solana", "A", 300)
    assert prev is not None and prev.liquidity_usd == 2000
    # rien avant 100
    assert st.dernier_snapshot_avant("solana", "A", 100) is None
    st.close()


def test_anti_doublon_alerte(tmp_path):
    st = Storage(str(tmp_path / "t.db"))
    snap = _snap(500, market_cap_usd=1000)
    scored = ScoredToken(snapshot=snap, score=7.0)
    st.enregistrer_alerte(scored)
    assert st.deja_alerte_recemment("solana", "A", 400) is True
    assert st.deja_alerte_recemment("solana", "A", 600) is False
    st.close()
