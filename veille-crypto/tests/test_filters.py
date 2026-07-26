"""Tests des filtres anti-rug (logique pure, sans réseau)."""

from veille.config import FiltresConfig
from veille.filters import passe_filtres
from veille.models import TokenSnapshot

MS_H = 3_600_000
MAINTENANT = 1_000 * MS_H  # t arbitraire


def _snap(**kw):
    base = dict(chain="solana", token_address="A", symbol="X")
    base.update(kw)
    return TokenSnapshot(**base)


def test_rejette_liquidite_insuffisante():
    cfg = FiltresConfig(exiger_lp_lock=False, exiger_mint_renonce=False)
    snap = _snap(liquidity_usd=500, pair_created_at_ms=MAINTENANT - 5 * MS_H)
    ok, rejets = passe_filtres(snap, cfg, MAINTENANT)
    assert not ok
    assert any("liquidité" in r for r in rejets)


def test_rejette_trop_jeune():
    cfg = FiltresConfig(exiger_lp_lock=False, exiger_mint_renonce=False)
    snap = _snap(liquidity_usd=50_000, pair_created_at_ms=MAINTENANT - 10 * 60_000)  # 10 min
    ok, rejets = passe_filtres(snap, cfg, MAINTENANT)
    assert not ok
    assert any("jeune" in r for r in rejets)


def test_rejette_concentration_holders():
    cfg = FiltresConfig(exiger_lp_lock=False, exiger_mint_renonce=False)
    snap = _snap(
        liquidity_usd=50_000, pair_created_at_ms=MAINTENANT - 5 * MS_H, top10_holders_pct=80
    )
    ok, rejets = passe_filtres(snap, cfg, MAINTENANT)
    assert not ok
    assert any("top10" in r for r in rejets)


def test_indulgent_si_inconnu_par_defaut():
    # LP/mint/concentration inconnus -> accepté en V1 (rejeter_si_inconnu=False).
    cfg = FiltresConfig()
    snap = _snap(liquidity_usd=50_000, pair_created_at_ms=MAINTENANT - 5 * MS_H)
    ok, rejets = passe_filtres(snap, cfg, MAINTENANT)
    assert ok, rejets


def test_strict_rejette_si_inconnu():
    cfg = FiltresConfig(rejeter_si_inconnu=True)
    snap = _snap(liquidity_usd=50_000, pair_created_at_ms=MAINTENANT - 5 * MS_H)
    ok, rejets = passe_filtres(snap, cfg, MAINTENANT)
    assert not ok
    assert len(rejets) >= 1


def test_accepte_token_sain():
    cfg = FiltresConfig()
    snap = _snap(
        liquidity_usd=50_000,
        pair_created_at_ms=MAINTENANT - 5 * MS_H,
        top10_holders_pct=20,
        lp_locked=True,
        mint_renounced=True,
    )
    ok, rejets = passe_filtres(snap, cfg, MAINTENANT)
    assert ok, rejets
