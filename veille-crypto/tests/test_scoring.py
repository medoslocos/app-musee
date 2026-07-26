"""Tests du scoring."""

from veille.config import ScoringConfig
from veille.models import NewsHit, TokenSnapshot
from veille.scoring import scorer


def _snap(**kw):
    base = dict(chain="solana", token_address="A", symbol="X")
    base.update(kw)
    return TokenSnapshot(**base)


def test_score_borne_0_10():
    cfg = ScoringConfig()
    snap = _snap(
        volume_h1=1_000_000, volume_h24=1_000_000,  # énorme accélération
        liquidity_usd=200_000, market_cap_usd=300_000,
        price_change_h1=200,
    )
    prev = _snap(liquidity_usd=10_000, holders=100)
    st = scorer(snap, prev, cfg)
    assert 0.0 <= st.score <= 10.0


def test_donnees_absentes_score_zero():
    cfg = ScoringConfig()
    snap = _snap()  # aucune métrique
    st = scorer(snap, None, cfg)
    assert st.score == 0.0
    assert st.components == {}


def test_bonus_personnalite_ajoute_des_points():
    cfg = ScoringConfig()
    snap = _snap(
        volume_h1=100_000, volume_h24=1_200_000,
        liquidity_usd=50_000, market_cap_usd=1_000_000,
    )
    prev = _snap(liquidity_usd=45_000)
    sans = scorer(snap, prev, cfg)
    avec = scorer(snap, prev, cfg, news_hit=NewsHit("s", "t", "l", 0, "trump", "X"))
    assert avec.score > sans.score
    assert avec.personality_bonus is True


def test_velocite_volume_croissante():
    cfg = ScoringConfig()
    # rythme moyen = 1.2M/24 = 50k/h ; h1 à 200k = 4x -> composante saturée à 1
    snap = _snap(volume_h1=200_000, volume_h24=1_200_000)
    st = scorer(snap, None, cfg)
    assert st.components["velocite_volume"] == 1.0


def test_amortissement_couverture_un_seul_signal():
    # Un seul signal parfait (vélocité volume) ne doit PAS donner 10/10 :
    # couverture = 3/10 -> facteur = 0.4 + 0.6*0.3 = 0.58 -> ~5.8.
    cfg = ScoringConfig()
    snap = _snap(volume_h1=200_000, volume_h24=1_200_000)
    st = scorer(snap, None, cfg)
    assert st.score < 6.0
    assert st.components["couverture"] == 0.3


def test_couverture_pleine_non_amortie():
    # Toutes les composantes présentes -> couverture 1 -> pas d'amortissement.
    cfg = ScoringConfig()
    snap = _snap(
        volume_h1=200_000, volume_h24=1_200_000,
        liquidity_usd=100_000, market_cap_usd=200_000, holders=200,
        price_change_h1=50,
    )
    prev = _snap(liquidity_usd=50_000, holders=100)
    st = scorer(snap, prev, cfg)
    assert st.components["couverture"] == 1.0
