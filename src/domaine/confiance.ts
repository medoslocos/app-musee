/**
 * Mapping confiance IA → badge affiché. Jamais de verdict binaire « FAKE » :
 * le badge le plus sévère reste « Douteux — indices d'imitation », et les
 * indices observables sont toujours listés à côté.
 */

import type { AnalyseBijou } from './analyse.schema';

export type NiveauBadge = 'elevee' | 'a-verifier' | 'douteux';

export const SEUIL_CONFIANCE_ELEVEE = 0.75;

export function niveauBadge(analyse: Pick<AnalyseBijou, 'confiance' | 'soupcon_imitation'>): NiveauBadge {
  if (analyse.soupcon_imitation) {
    return 'douteux';
  }
  return analyse.confiance >= SEUIL_CONFIANCE_ELEVEE ? 'elevee' : 'a-verifier';
}

export const LIBELLES_BADGE: Record<NiveauBadge, string> = {
  elevee: 'Confiance élevée',
  'a-verifier': 'À vérifier',
  douteux: 'Douteux — indices d’imitation',
};

/** Indicateur élevée / moyenne / faible pour une confiance ponctuelle (poinçon…). */
export type NiveauConfiance = 'elevee' | 'moyenne' | 'faible';

export function niveauConfiance(confiance: number): NiveauConfiance {
  if (confiance >= SEUIL_CONFIANCE_ELEVEE) {
    return 'elevee';
  }
  return confiance >= 0.4 ? 'moyenne' : 'faible';
}

export const LIBELLES_CONFIANCE: Record<NiveauConfiance, string> = {
  elevee: 'confiance élevée',
  moyenne: 'confiance moyenne',
  faible: 'confiance faible',
};

/** Seuil (centimes) au-delà duquel la mention laboratoire est obligatoire — défaut 500 €. */
export const SEUIL_MENTION_LABO_CENTIMES_DEFAUT = 50_000;

export const MENTION_ESTIMATION_VISUELLE = 'Estimation visuelle';
export const MENTION_LABO = 'Expertise en laboratoire recommandée';

export function mentionLaboObligatoire(
  fourchette: AnalyseBijou['fourchette_centimes'],
  seuilCentimes: number = SEUIL_MENTION_LABO_CENTIMES_DEFAUT,
): boolean {
  return fourchette !== null && fourchette.maximum_centimes >= seuilCentimes;
}
