/**
 * Composition racine du service d'analyse : edge function si configurée,
 * sinon fournisseur de démonstration (voir TODO-HUMAIN.md pour le déploiement).
 */

import { FournisseurDemonstration } from './fournisseur-demonstration';
import { FournisseurEdgeFunction } from './fournisseur-edge-function';
import type { FournisseurAnalyse } from './fournisseur-analyse';

function creerFournisseur(): FournisseurAnalyse {
  const url = process.env.EXPO_PUBLIC_URL_ANALYSE_BIJOU;
  if (url !== undefined && url !== '') {
    return new FournisseurEdgeFunction(url, process.env.EXPO_PUBLIC_SUPABASE_CLE_ANONYME);
  }
  return new FournisseurDemonstration();
}

export const fournisseurAnalyse = creerFournisseur();

export function analyseEnModeDemonstration(): boolean {
  return fournisseurAnalyse instanceof FournisseurDemonstration;
}
