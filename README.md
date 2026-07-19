# GemEstim

App d'estimation assistée pour bijoutiers — rachat d'or et de bijoux d'occasion.
La vision produit, les règles métier et la direction artistique sont dans [CLAUDE.md](CLAUDE.md), source de vérité du projet.

## Démarrer

```bash
npm install
npm start          # Expo (iOS, Android, web)
```

Pour le cours des métaux en temps réel, créer un fichier `.env` :

```bash
EXPO_PUBLIC_METALS_DEV_API_KEY=votre-cle-metals-dev
```

Sans clé, l'app affiche une erreur explicite à l'estimation et fonctionne dès qu'un cours a été mis en cache (repli hors-ligne sur le dernier cours connu, daté).

## Vérifier

```bash
npm test           # tests vitest (logique de calcul couverte à 100 %)
npm run typecheck  # TypeScript strict
```

## Architecture

- `app/` — écrans Expo Router : Saisie (`index`) → Résultat (`resultat`), Réglages (`reglages`).
- `src/domaine/` — logique métier pure : calcul d'estimation (arithmétique entière, centimes), titres et puretés, monnaie. Aucune dépendance React Native : testable en Node.
- `src/cours/` — abstraction `FournisseurCours` (MetalPriceProvider), implémentation metals.dev swappable, service de cache 15 min avec repli hors-ligne persisté.
- `src/etat/` — stores Zustand (estimation en cours, réglages de marge persistés).
- `src/composants/` — composants d'interface, dont le ticket d'estimation (élément signature).
- `src/design/tokens.ts` — palette, typographies, espacements : aucune couleur en dur dans les écrans.

## État d'avancement

- ✅ F1 — Estimation métal : saisie poids/titre, cours avec cache et mode hors-ligne, marge par métal (% ou €/g), ticket de résultat.
- ✅ F2 — Photo & assistance IA : caméra + galerie, carte d'analyse avec badges de confiance, alerte valeur, suggestion de titre par poinçon, edge function `analyse-bijou` (prompt versionné dans `/prompts`).
- ✅ F3 — Reçu PDF & livre de police : rachat avec identité chiffrée, signature tactile, ligne de livre inaltérable (triggers + chaîne d'empreintes SHA-256), reçu PDF, export CSV, espèces bloquées (art. L112-6 CMF).
- ✅ F4 — Historique & tableau de bord : trois chiffres du mois (rachats €, grammes d'or, marge moyenne), liste filtrable par statut, recherche par date, client (identité déchiffrée en mémoire) et type.
