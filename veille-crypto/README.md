# Veille Crypto — scanner memecoins (read-only, V1)

Outil **d'information** qui scanne l'univers crypto (nouveaux tokens +
tokens en forte accélération), score les mouvements anormaux et pousse une
alerte Telegram groupée toutes les 3-4h.

> ⚠️ **Outil de veille, pas d'exécution.** Aucun achat automatique, aucun
> wallet connecté, aucune écriture on-chain. La décision reste 100%
> manuelle. Un score élevé = **anomalie statistique détectée**, pas une
> prédiction de gain ni un signal d'achat. La quasi-totalité des tokens
> scannés perdront toute leur valeur (rug pull, absence de liquidité, dump
> du dev).

## Démarrage rapide

```bash
cd veille-crypto
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp config.example.yaml config.yaml     # ajuster les seuils
cp .env.example .env                    # renseigner Telegram (optionnel)

python main.py --once -v                 # un cycle en dry-run (rien n'est envoyé)
python main.py                           # boucle continue (intervalle config)
```

En **dry-run** (défaut), aucune alerte n'est envoyée : le message est
affiché sur la sortie standard. Pour activer Telegram, renseigner
`TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` dans `.env` et mettre
`TELEGRAM_DRY_RUN=false`.

> Note d'installation : `feedparser` dépend de `sgmllib3k`, dont le
> `setup.py` legacy échoue à la compilation avec les setuptools récents.
> Si l'installation casse, utiliser `SETUPTOOLS_USE_DISTUTILS=stdlib pip
> install feedparser`. La brique news se désactive proprement si le paquet
> est absent (le reste de la veille fonctionne).

## Architecture

```
sources (read-only)  ─┐
  DexScreener          │   collecte + dédoublonnage
  GeckoTerminal        │        │
                       ▼        ▼
                 filtres anti-rug  ──►  classificateur memecoin
                       │                        │
                       ▼                        ▼
                  scoring 0-10  ◄── historique SQLite (deltas)
                       │
                       ▼
             notifier Telegram (push groupé 3-4h)
```

| Module | Rôle |
|---|---|
| `veille/sources/` | Interrogation en boucle des API (lecture seule) |
| `veille/filters.py` | Filtres anti-rug minimum (LP lock, mint, holders, âge, liquidité) |
| `veille/classifier.py` | Tag memecoin vs utilitaire (heuristique simple) |
| `veille/scoring.py` | Score 0-10 (anomalie statistique, pas un ordre) |
| `veille/news.py` | Veille RSS : lancement par personnalité connue |
| `veille/notifier.py` | Alerte Telegram groupée, format mobile |
| `veille/storage.py` | Historique SQLite (deltas + backtest) |
| `veille/scanner.py` | Orchestration d'un cycle |
| `main.py` | Boucle / point d'entrée (`--once` pour cron) |

## Filtres anti-rug (V1)

Un token n'est retenu que s'il passe **tous** les filtres :

- **Liquidité minimum** en $ (évite les tokens invendables)
- **Âge du contrat** dans une fenêtre (ni scan à la seconde zéro, ni token trop vieux)
- **Top 10 holders** < seuil (concentration)
- **LP verrouillée**
- **Mint authority renoncée** (Solana) / pas de mint arbitraire (EVM)

DexScreener seul ne fournit pas les champs de sécurité (LP lock, mint,
concentration) ; en V1 les filtres correspondants sont **indulgents**
quand la donnée manque (`rejeter_si_inconnu: false`). Dès qu'une source de
sécurité (Birdeye) est branchée, passer ce flag à `true`.

## Scoring

Score = pondération de composantes normalisées `[0,1]` :

- **vélocité volume** — le volume 1h dépasse-t-il le rythme horaire moyen 24h ?
- **croissance liquidité** — delta % depuis le dernier scan
- **croissance holders** — delta % depuis le dernier scan
- **ratio liquidité / market cap** — détecte les caps gonflées artificiellement
- **momentum prix** — variation 1h

Le score de base est **amorti par la couverture** : un 10/10 exige
plusieurs signaux concordants, pas un seul. Les deltas liquidité/holders
demandent un scan précédent ; le tout premier cycle après déploiement est
donc volontairement prudent, le temps que l'historique se constitue.

Seuls les tokens **tagués memecoin**, qui passent **tous** les filtres et
dépassent `seuil_alerte`, déclenchent une alerte.

### Facteur « lancement par personnalité connue »

Un bonus de score s'ajoute si le token est associé dans les news à une
personnalité identifiée.

> ⚠️ **Point critique, pas un détail.** Un lancement par une personnalité
> connue ne réduit **pas** le risque : il le change de nature. Le pattern
> documenté est que les insiders détiennent une part importante du supply
> et vendent sur les premiers acheteurs une fois le narratif installé —
> souvent **plus rapide et plus violent** qu'un rug anonyme, car le hype
> attire un volume massif qui offre aux insiders une liquidité de sortie
> idéale. Le bonus est donc un facteur **d'attention renforcée** (surveiller
> de très près, réagir vite si on agit), **jamais** un facteur de sécurité.

## Configuration

- `config.example.yaml` → seuils, sources, pondérations (copier en `config.yaml`)
- `.env.example` → secrets Telegram + surcharges (copier en `.env`)

L'environnement a priorité sur le YAML, qui a priorité sur les défauts.
`config.yaml` et `.env` sont ignorés par git.

## Planification

- Boucle interne : `python main.py` (dort `intervalle_heures` entre cycles)
- Ou cron / systemd timer sur `python main.py --once` toutes les 3-4h

Reco du brief : instance **isolée**, pas sur une machine de prod
verrouillée.

## Stockage & backtest

Chaque snapshot et chaque alerte est écrit dans SQLite (`veille.db`) :

- **snapshots** — historique par token (permet les deltas d'un cycle à l'autre)
- **alertes** — chaque alerte envoyée, pour le backtest a posteriori

## Tests

```bash
python -m pytest -q
```

Couvre la logique pure sans réseau : filtres, classificateur, scoring
(dont l'amortissement par couverture et le bonus personnalité), stockage
(deltas + anti-doublon) et association news↔token.

## Ce qu'on ne fait PAS en V1

- Pas d'exécution d'ordre, jamais — pas de wallet connecté
- Pas de scoring social/sentiment (trop bruité, API chère)
- Pas de garantie de détection précoce absolue

## Phase suivante (après 2-4 semaines d'observation)

Backtester le score sur les alertes stockées : combien auraient été
rentables achetées au moment de l'alerte et revendues X heures après ?
C'est cela seul qui dira si le scoring a une valeur réelle ou s'il ne fait
que citer plus de bruit statistique. Pistes complémentaires : source
Pump.fun (lancements Solana ultra-précoces), source sécurité Birdeye
(holders + LP lock réels), durcissement de `rejeter_si_inconnu`.
