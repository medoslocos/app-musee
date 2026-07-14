# Musée Interactif

Application de musée interactive — web, iOS et Android (via [Capacitor](https://capacitorjs.com)), avec une page d'accueil animée en [GSAP](https://gsap.com).

## Démarrage (web)

```bash
npm install
npm run dev      # serveur de développement (Vite)
npm run build    # build de production dans dist/
npm run preview  # prévisualiser le build
```

## Mobile (Capacitor)

Le même code web tourne dans les apps natives. Les projets natifs sont dans `android/` et `ios/`.

```bash
npm run mobile:sync     # build web + synchronisation vers android/ et ios/
npm run mobile:android  # build + sync + ouvrir dans Android Studio
npm run mobile:ios      # build + sync + ouvrir dans Xcode (macOS requis)
```

Configuration mobile :

- `capacitor.config.json` — appId `com.medoslocos.appmusee`, fond sombre natif assorti au thème ;
- **plein écran** : la barre d'état passe en overlay (`@capacitor/status-bar`) et les encoches sont compensées en CSS via `env(safe-area-inset-*)` (`viewport-fit=cover`) ;
- **zoom accidentel désactivé** : `user-scalable=no` + `maximum-scale=1` dans le viewport, `touch-action` et `-webkit-tap-highlight-color` en CSS ;
- **animations adaptées au tactile** : le survol des cartes (souris) est remplacé par un retour de pression au doigt, via `gsap.matchMedia()` et la condition `(hover: hover) and (pointer: fine)`.

## Stack

- [Vite](https://vitejs.dev) — outillage et serveur de dev
- [GSAP](https://gsap.com) — animations (timeline d'intro, lettres en cascade, formes flottantes)
- [Capacitor](https://capacitorjs.com) — empaquetage natif iOS / Android
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
