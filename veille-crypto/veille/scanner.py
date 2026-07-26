"""Orchestrateur d'un cycle de veille.

Enchaîne : collecte sources -> dédoublonnage -> filtres anti-rug ->
classification memecoin -> scoring (avec deltas issus de l'historique) ->
tri -> alerte groupée. Tout est read-only.

Un cycle prend ``maintenant_ms`` en paramètre (injecté par la boucle) pour
rester testable sans horloge réelle.
"""

from __future__ import annotations

import logging

from .classifier import classifier
from .config import Config
from .filters import age_heures, passe_filtres
from .models import ScoredToken, TokenSnapshot
from .news import associer_news, collecter_news
from .notifier import TelegramNotifier, construire_message
from .scoring import scorer
from .sources import DexScreenerSource, GeckoTerminalSource
from .storage import Storage

log = logging.getLogger("veille.scanner")


class Scanner:
    def __init__(self, cfg: Config, storage: Storage) -> None:
        self.cfg = cfg
        self.storage = storage
        self.sources = []
        if cfg.sources.dexscreener_activer:
            self.sources.append(
                DexScreenerSource(cfg.sources.timeout_s, cfg.sources.delai_requete_s)
            )
        if cfg.sources.geckoterminal_activer:
            self.sources.append(
                GeckoTerminalSource(cfg.sources.timeout_s, cfg.sources.delai_requete_s)
            )
        self.notifier = TelegramNotifier(cfg.telegram)

    def collecter(self) -> list[TokenSnapshot]:
        """Interroge toutes les sources et dédoublonne par (chain, address).

        En cas de doublon, on garde le snapshot le plus riche en liquidité
        (proxy simple de la paire la plus pertinente)."""
        par_cle: dict[tuple[str, str], TokenSnapshot] = {}
        for src in self.sources:
            try:
                snaps = src.scanner(self.cfg.sources.chaines, self.cfg.sources.requetes_recherche)
            except Exception as exc:  # une source ne doit jamais tuer le cycle
                log.exception("source %s en échec : %s", getattr(src, "nom", "?"), exc)
                continue
            for snap in snaps:
                cle = (snap.chain, snap.token_address)
                ancien = par_cle.get(cle)
                if ancien is None or (snap.liquidity_usd or 0) > (ancien.liquidity_usd or 0):
                    par_cle[cle] = snap
        return list(par_cle.values())

    def cycle(self, maintenant_ms: int) -> list[ScoredToken]:
        """Exécute un cycle complet et renvoie les tokens alertés."""
        news = collecter_news(self.cfg.news, maintenant_ms)
        if news:
            log.info("%d mention(s) news avec personnalité", len(news))

        candidats = self.collecter()
        log.info("%d token(s) collecté(s)", len(candidats))

        retenus: list[ScoredToken] = []
        for snap in candidats:
            snap.scanned_at_ms = maintenant_ms

            ok, rejets = passe_filtres(snap, self.cfg.filtres, maintenant_ms)
            # On enregistre TOUJOURS le snapshot (historique/backtest) avant de filtrer.
            precedent = self.storage.dernier_snapshot_avant(
                snap.chain, snap.token_address, maintenant_ms
            )
            self.storage.enregistrer_snapshot(snap)
            if not ok:
                continue

            tag, _ = classifier(snap)
            if tag != "memecoin":
                continue  # on ne cible que le pattern memecoin (cf. brief)

            hit = associer_news(snap.symbol, news)
            st = scorer(snap, precedent, self.cfg.scoring, tag=tag, news_hit=hit)
            if st.score >= self.cfg.scoring.seuil_alerte:
                retenus.append(st)

        retenus.sort(key=lambda s: s.score, reverse=True)
        retenus = retenus[: self.cfg.max_alertes_par_cycle]

        # Anti-doublon : n'alerte pas deux fois le même token dans une fenêtre
        # d'un cycle (évite de re-pousser un token déjà signalé la période d'avant).
        fenetre_ms = int(self.cfg.intervalle_heures * 3_600_000 * 0.9)
        finaux: list[ScoredToken] = []
        for st in retenus:
            s = st.snapshot
            if self.storage.deja_alerte_recemment(
                s.chain, s.token_address, maintenant_ms - fenetre_ms
            ):
                continue
            finaux.append(st)

        if finaux:
            ages = {
                f"{st.snapshot.chain}:{st.snapshot.token_address}": age_heures(
                    st.snapshot, maintenant_ms
                )
                for st in finaux
            }
            message = construire_message(finaux, maintenant_ms, ages)
            if self.notifier.envoyer(message):
                for st in finaux:
                    self.storage.enregistrer_alerte(st)
        else:
            log.info("aucune anomalie au-dessus du seuil ce cycle")

        return finaux
