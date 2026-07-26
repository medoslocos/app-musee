#!/usr/bin/env python3
"""Point d'entrée de la veille crypto.

Usage :
    python main.py --once            # un seul cycle puis sortie (test/cron)
    python main.py                   # boucle continue (intervalle config)
    python main.py --config cfg.yaml # config personnalisée

Même logique que MEDOS-NOTE : boucle + timestamp + logs. La planification
peut aussi être déléguée à cron/systemd en appelant ``--once``.

RAPPEL : outil d'information, read-only. Aucun ordre, aucun wallet.
"""

from __future__ import annotations

import argparse
import logging
import time
from datetime import datetime, timezone

from veille.config import charger_config
from veille.scanner import Scanner
from veille.storage import Storage


def _maintenant_ms() -> int:
    return int(time.time() * 1000)


def configurer_logs(verbeux: bool) -> None:
    logging.basicConfig(
        level=logging.DEBUG if verbeux else logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Veille crypto memecoins (read-only)")
    parser.add_argument("--config", default="config.yaml", help="chemin du YAML de config")
    parser.add_argument("--once", action="store_true", help="un seul cycle puis sortie")
    parser.add_argument("-v", "--verbose", action="store_true", help="logs détaillés")
    args = parser.parse_args()

    configurer_logs(args.verbose)
    log = logging.getLogger("veille")

    cfg = charger_config(args.config)
    storage = Storage(cfg.db_path)
    scanner = Scanner(cfg, storage)

    log.info(
        "Démarrage veille — intervalle %.1fh, chaînes %s, dry_run=%s",
        cfg.intervalle_heures, cfg.sources.chaines, cfg.telegram.dry_run,
    )

    try:
        while True:
            debut = _maintenant_ms()
            horodatage = datetime.fromtimestamp(debut / 1000, tz=timezone.utc).isoformat()
            log.info("=== cycle %s ===", horodatage)
            try:
                alertes = scanner.cycle(debut)
                log.info("cycle terminé : %d alerte(s)", len(alertes))
            except Exception:  # un cycle raté ne doit pas tuer la boucle
                log.exception("cycle en échec, on continue")

            if args.once:
                break

            time.sleep(cfg.intervalle_heures * 3600)
    except KeyboardInterrupt:
        log.info("arrêt demandé (Ctrl-C)")
    finally:
        storage.close()


if __name__ == "__main__":
    main()
