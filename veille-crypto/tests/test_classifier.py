"""Tests du classificateur memecoin vs utilitaire."""

from veille.classifier import classifier
from veille.models import TokenSnapshot


def _snap(**kw):
    base = dict(chain="solana", token_address="A", symbol="X")
    base.update(kw)
    return TokenSnapshot(**base)


def test_ticker_meme_sans_doc():
    snap = _snap(symbol="PEPE", name="Pepe the Frog")
    tag, _ = classifier(snap)
    assert tag == "memecoin"


def test_absence_totale_doc_est_signal_meme():
    snap = _snap(symbol="ZZZ", name="ZZZ")  # aucun site, aucune description
    tag, raisons = classifier(snap)
    assert tag == "memecoin"
    assert any("aucune doc" in r for r in raisons)


def test_projet_utilitaire():
    snap = _snap(
        symbol="ORCL",
        name="Oracle Network Protocol",
        description="A decentralized oracle protocol. See our whitepaper and roadmap.",
        websites=["https://example.org"],
    )
    tag, _ = classifier(snap)
    assert tag == "utilitaire"


def test_meme_l_emporte_a_egalite():
    # nom meme + site présent : signaux mixtes, meme >= util -> memecoin.
    snap = _snap(symbol="DOGE", name="Doge Coin", websites=["https://dogecoin.com"])
    tag, _ = classifier(snap)
    assert tag == "memecoin"
