"""Interface commune aux sources et utilitaires HTTP.

RÈGLE ABSOLUE : ces sources ne font que des requêtes GET de lecture. Aucun
POST on-chain, aucune signature, aucun wallet. Si un jour une source
proposait une action d'écriture, elle n'aurait pas sa place ici.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Optional

import requests

from ..models import TokenSnapshot

log = logging.getLogger("veille.sources")


class Source:
    """Classe de base d'une source de scan."""

    nom = "base"

    def __init__(self, timeout_s: float = 15.0, delai_requete_s: float = 1.0) -> None:
        self.timeout_s = timeout_s
        self.delai_requete_s = delai_requete_s
        self._session = requests.Session()
        self._session.headers.update(
            {"User-Agent": "veille-crypto/0.1 (read-only scanner)", "Accept": "application/json"}
        )

    def _get(self, url: str, params: dict[str, Any] | None = None) -> Optional[Any]:
        """GET JSON tolérant aux pannes : renvoie None plutôt que de crasher.

        Un scan est une boucle longue ; une source qui tombe ne doit pas
        arrêter la veille. On log et on continue.
        """
        try:
            resp = self._session.get(url, params=params, timeout=self.timeout_s)
        except requests.RequestException as exc:
            log.warning("[%s] échec réseau %s : %s", self.nom, url, exc)
            return None
        finally:
            # Politesse envers les API gratuites, même en cas d'échec.
            time.sleep(self.delai_requete_s)

        if resp.status_code == 429:
            log.warning("[%s] rate limit (429) sur %s", self.nom, url)
            return None
        if not resp.ok:
            log.warning("[%s] statut %s sur %s", self.nom, resp.status_code, url)
            return None
        try:
            return resp.json()
        except ValueError:
            log.warning("[%s] réponse non-JSON sur %s", self.nom, url)
            return None

    def scanner(self, chaines: list[str], requetes: list[str]) -> list[TokenSnapshot]:
        raise NotImplementedError
