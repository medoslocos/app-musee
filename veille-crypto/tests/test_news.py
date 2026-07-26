"""Tests de l'association news <-> token (sans réseau)."""

from veille.models import NewsHit
from veille.news import associer_news


def test_associe_ticker_exact():
    hits = [NewsHit("CoinDesk", "Trump launches $MAGA", "http://x", 0, "trump", "MAGA")]
    hit = associer_news("MAGA", hits)
    assert hit is not None
    assert hit.personality == "trump"


def test_associe_insensible_casse_et_dollar():
    hits = [NewsHit("s", "t", "l", 0, "musk", "DOGE")]
    assert associer_news("$doge", hits) is not None


def test_pas_d_association_si_ticker_absent():
    hits = [NewsHit("s", "t", "l", 0, "trump", "MAGA")]
    assert associer_news("PEPE", hits) is None


def test_pas_d_association_sans_symbole():
    hits = [NewsHit("s", "t", "l", 0, "trump", "MAGA")]
    assert associer_news("", hits) is None
