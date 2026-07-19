# TODO-HUMAIN — décisions et secrets à brancher

> Liste des points qui nécessitent une intervention humaine. Tout le reste
> fonctionne en mode dégradé documenté (fournisseurs de démonstration,
> messages d'erreur actionnables).

## F1 — Cours des métaux

- [ ] Créer un compte metals.dev (ou choisir un autre fournisseur) et renseigner
      `EXPO_PUBLIC_METALS_DEV_API_KEY` dans `.env`. Sans clé : erreur explicite à
      l'estimation, repli sur le dernier cours en cache s'il existe.
      Pour changer de fournisseur : implémenter `FournisseurCours` et ne toucher
      que `src/cours/composition.ts`.

## F2 — Analyse photo IA

- [ ] Provisionner un projet Supabase, puis déployer l'edge function :
      ```bash
      node scripts/synchroniser-prompt.mjs
      supabase functions deploy analyse-bijou
      supabase secrets set CLE_API_ANTHROPIC=sk-ant-…
      # optionnel : supabase secrets set MODELE_ANALYSE=claude-sonnet-5
      ```
- [ ] Renseigner côté app :
      `EXPO_PUBLIC_URL_ANALYSE_BIJOU=https://<projet>.supabase.co/functions/v1/analyse-bijou`
      et `EXPO_PUBLIC_SUPABASE_CLE_ANONYME=<cle-anonyme>`.
      Tant que ces variables sont absentes, l'app utilise le fournisseur de
      démonstration (analyses fictives, clairement signalées dans l'UI).
- [ ] Décision : faut-il exiger l'authentification Supabase sur la function
      (`--no-verify-jwt` ou non) ? Par défaut le JWT est vérifié.
