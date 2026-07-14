# Musée Interactif

Application web interactive de musée — page d'accueil animée avec [GSAP](https://gsap.com).

## Démarrage

```bash
npm install
npm run dev      # serveur de développement (Vite)
npm run build    # build de production dans dist/
npm run preview  # prévisualiser le build
```

## Stack

- [Vite](https://vitejs.dev) — outillage et serveur de dev
- [GSAP](https://gsap.com) — animations (timeline d'intro, lettres en cascade, formes flottantes)
- Vanilla JS + CSS

## Animations

La page d'accueil (`src/main.js`) utilise :

- une **timeline GSAP** pour la séquence d'entrée (kicker → titre lettre par lettre → sous-titre → boutons → cartes → formes) ;
- des animations **en boucle** (`repeat: -1`, `yoyo`) pour les formes décoratives ;
- `gsap.matchMedia()` pour respecter **prefers-reduced-motion** (aucune animation si l'utilisateur préfère un mouvement réduit).

## Skills GSAP

Les skills officielles GSAP sont installées dans `.agents/skills/` (symlinks dans `.claude/skills/`) via :

```bash
npx skills add https://github.com/greensock/gsap-skills
```
