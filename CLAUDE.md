# CLAUDE.md — GemEstim (nom de travail)
> App d'estimation assistée pour bijoutiers — rachat d'or et de bijoux d'occasion.
> Ce fichier est la source de vérité du projet. Lis-le intégralement avant toute session de code. En cas de conflit entre une demande ponctuelle et ce fichier, signale-le avant d'agir.

---

## 1. Vision produit

**Une phrase.** L'outil quotidien du bijoutier au comptoir : il pose le bijou sur la balance, prend une photo, et obtient en moins de 30 secondes une estimation fiable du métal, une fourchette pour le reste, un reçu client et la ligne du livre de police — sans jamais quitter l'écran.

**Utilisateur cible.** Bijoutier indépendant ou comptoir de rachat d'or, 45-65 ans en moyenne, peu technophile, pressé, avec un client en face de lui. Il n'a jamais lu un manuel de sa vie et ne le fera pas.

**Conséquence design n°1.** Chaque écran a UN seul travail. Zéro friction, zéro jargon logiciel, zéro configuration obligatoire avant la première estimation. L'app doit être utilisable à la première ouverture sans onboarding.

**Ce que l'app N'EST PAS.**
- Pas un outil de certification gemmologique. L'IA ne certifie jamais une pierre.
- Pas un ERP complet. Pas de compta, pas de paie, pas de e-commerce (v1).
- Pas une app grand public. Le client final ne la voit que via le reçu.

---

## 2. Fonctionnalités MVP (dans cet ordre de priorité)

### F1 — Estimation métal (le cœur, fiable à 100 %)
- Saisie : poids (g, décimales), titre (24k / 22k / 18k / 14k / 9k / argent 925 / 800 / platine 950), via gros boutons tactiles — pas de dropdown.
- Cours du métal en temps réel (API type metals.dev ou GoldAPI, cache 15 min, affichage de l'heure du cours et bandeau si cours indisponible → dernier cours connu daté).
- Calcul : valeur fonte = poids × pureté × cours. Marge de rachat configurable par le bijoutier (% ou €/g), avec préréglages par métal.
- Résultat affiché en GROS : prix de rachat proposé. En dessous, plus petit : valeur fonte brute et détail du calcul (transparence = confiance).

### F2 — Photo & assistance IA (l'assistance, jamais la magie)
- Photo du bijou → l'IA propose : type d'objet (bague, chaîne, gourmette…), style/époque probable, présence visible de poinçons ou signature.
- **Alerte valeur** : si l'IA détecte un indice de bijou signé ou ancien (Cartier, VCA, Art déco…), bandeau ambre « Ce bijou pourrait valoir plus que son poids — vérifier avant fonte ». C'est LA fonctionnalité qui fait gagner de l'argent au bijoutier.
- Photo macro du poinçon → suggestion du titre (tête d'aigle = or 18k, etc.) avec score de confiance affiché. La suggestion pré-remplit le champ, ne le verrouille jamais.
- Pierres : fourchette indicative UNIQUEMENT, toujours accompagnée du libellé « estimation visuelle — expertise en laboratoire recommandée » au-dessus d'un seuil configurable (défaut 500 €). Ne jamais afficher une valeur de pierre sans cette mention.

### F3 — Reçu & livre de police (le verrou légal)
- Chaque estimation validée en « rachat » génère :
  1. Le reçu client (PDF, logo de la boutique, détail, mentions légales, signature tactile).
  2. La ligne du livre de police : n° d'ordre séquentiel infalsifiable, date, description de l'objet, poids, nature du métal, identité du vendeur (nom, adresse, pièce d'identité type + numéro), prix, mode de paiement.
- Livre de police : export PDF et CSV, horodatage, aucune suppression possible (annulation = ligne d'annulation, jamais d'effacement). Chiffrement au repos des données d'identité.
- Rappel réglementaire affiché à la première utilisation : paiement des métaux précieux obligatoirement par chèque barré ou virement (interdiction espèces, art. L112-6 CMF) — bloquer « espèces » comme mode de paiement pour l'or.

### F4 — Historique & tableau de bord (simple)
- Liste des estimations (recherche par date, client, type). Statuts : estimé / racheté / refusé.
- Trois chiffres en haut, pas plus : rachats du mois (€), grammes d'or rachetés, marge moyenne.

### Hors MVP (ne pas coder sans demande explicite)
Multi-boutiques, rôles utilisateurs, synchronisation temps réel multi-postes, ventes/revente, intégration comptable, essayage AR.

---

## 3. Design — direction artistique

**Intention.** Sobriété d'orfèvre : l'app doit avoir la retenue d'un écrin et la lisibilité d'une balance professionnelle. Moderne mais jamais gadget. L'utilisateur doit se sentir face à un instrument de précision, pas à une app de startup.

### Palette (mode clair par défaut, mode sombre en v1.1)
- `--noir-encre: #1A1814` — texte principal, fond des éléments forts
- `--blanc-craie: #FAF8F4` — fond principal (chaud, pas de blanc pur clinique)
- `--or-mat: #B8963E` — accent UNIQUE : actions principales, valeurs monétaires. Jamais en grande surface.
- `--gris-etain: #8A8578` — texte secondaire, bordures
- `--vert-validation: #2E6B4F` — confirmations, statut « racheté »
- `--ambre-alerte: #B05C1E` — alertes valeur, avertissements pierre
- Interdits : dégradés décoratifs, glassmorphism, ombres colorées, violet/bleu SaaS générique.

### Typographie
- Display (chiffres d'estimation, montants) : **Fraunces** ou une serif à fort contraste, en poids 600, tabular-nums obligatoire pour tous les montants.
- Corps/UI : **Inter** ou **Söhne**, 16 px minimum (utilisateurs 45+), interlignage 1.5.
- Les montants en euros sont TOUJOURS l'élément le plus grand de l'écran où ils apparaissent.

### Élément signature
Le « ticket d'estimation » : le résultat s'affiche comme un ticket de pesée physique — fond craie, bord perforé subtil en CSS, numéro d'ordre, montant en display serif géant. C'est l'identité visuelle mémorable de l'app, réutilisée sur le reçu PDF. Une seule animation soignée : le ticket glisse vers le haut à la validation (300 ms, ease-out, désactivée si prefers-reduced-motion).

### Règles UX non négociables
- Cibles tactiles ≥ 48 px (usage au comptoir, parfois avec des gants fins).
- Une estimation complète = 3 écrans maximum : Saisie → Résultat → Rachat/Reçu.
- Jamais plus d'une action principale par écran. Le bouton principal est toujours en bas, pleine largeur, pouce droit.
- Tous les états prévus : vide (invitation à agir), chargement (squelettes, pas de spinners), erreur (cause + solution, jamais « une erreur est survenue »), hors-ligne (l'estimation métal fonctionne avec le dernier cours en cache, badge « cours du JJ/MM à HHhMM »).
- Libellés en français métier : « Poids », « Titre », « Prix de rachat », « Livre de police ». Jamais « Submit », « Dashboard », « Settings » → « Valider », « Aujourd'hui », « Réglages ».
- Sentence case partout, verbes d'action sur les boutons (« Générer le reçu », pas « OK »).

---

## 4. Stack technique

- **Front : React Native + Expo** (cible iOS + Android, le bijoutier a souvent un iPad au comptoir — layout responsive tablette prioritaire au même titre que téléphone).
- **State : Zustand** (pas de Redux). **Navigation : Expo Router.**
- **Local-first : SQLite (expo-sqlite) + file de synchro** vers le back. L'app doit fonctionner intégralement hors-ligne sauf cours temps réel et analyse IA.
- **Back : Supabase** (Postgres, Auth, Storage pour les photos, RLS activé sur toutes les tables).
- **IA : API Anthropic** (analyse photo via messages multimodaux). Les appels IA passent par une edge function côté serveur — JAMAIS de clé API dans le client.
- **PDF : react-native-pdf-lib** ou génération côté serveur si mise en page complexe.
- **Cours métaux : abstraction `MetalPriceProvider`** avec implémentation swappable (ne pas coupler le code à un fournisseur).

### Conventions de code
- TypeScript strict, zéro `any`. Zod pour valider toute donnée externe (API cours, réponses IA, formulaires).
- Montants : entiers en centimes partout en interne, formatage `Intl.NumberFormat('fr-FR')` uniquement à l'affichage.
- Poids : grammes en décimal string en base (pas de float pour les valeurs légales du livre de police).
- Tests : logique de calcul d'estimation couverte à 100 % (c'est le cœur de la confiance), tests d'intégration sur la génération du livre de police.
- Commits conventionnels en français : `feat: ajout du calcul de marge par métal`.

---

## 5. Garde-fous IA (à respecter dans le produit)

1. Toute sortie IA affichée à l'utilisateur porte un indicateur de confiance (élevée / moyenne / faible) et est modifiable.
2. L'IA suggère, l'humain décide : aucune valeur issue de l'IA n'entre dans le livre de police sans validation manuelle du bijoutier.
3. Pierre > seuil configuré → mention labo obligatoire, non désactivable.
4. Les photos envoyées à l'IA ne contiennent jamais la pièce d'identité du client (flux séparés, la photo d'identité reste locale/chiffrée).
5. Prompt d'analyse côté serveur versionné dans le repo (`/prompts/analyse-bijou.md`) — jamais de prompt en dur dans le code.

---

## 6. Définition de « terminé » pour chaque feature

- Fonctionne hors-ligne (ou dégrade proprement avec message clair).
- États vide / chargement / erreur implémentés.
- Utilisable d'une main sur téléphone ET confortable sur iPad paysage.
- Textes relus : français métier, zéro anglicisme.
- Testée avec des valeurs réelles (ex. : chaîne 18k de 12,4 g, cours à 68 €/g → vérifier le calcul à la main).
- Aucune donnée sensible (identité client, clé API) en clair dans les logs ou le client.

---

## 7. Ce que Claude Code doit faire à chaque session

1. Lire ce fichier en entier.
2. Avant toute feature : proposer un plan court (fichiers touchés, schéma de données si besoin) et attendre validation.
3. Après chaque feature : lancer les tests, vérifier TypeScript strict, et lister ce qui reste à faire.
4. Ne jamais introduire de dépendance nouvelle sans la justifier en une phrase.
5. En cas de doute sur une règle métier (calcul, légal, livre de police) : poser la question plutôt que supposer.
