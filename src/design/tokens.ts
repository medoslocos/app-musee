/**
 * Direction artistique « sobriété d'orfèvre » — voir CLAUDE.md §3.
 * Aucune couleur ni taille en dur dans les écrans : tout passe par ces tokens.
 */

export const couleurs = {
  noirEncre: '#1A1814',
  blancCraie: '#FAF8F4',
  orMat: '#B8963E',
  grisEtain: '#8A8578',
  vertValidation: '#2E6B4F',
  ambreAlerte: '#B05C1E',
  /** Surfaces posées sur le fond craie (cartes, boutons secondaires). */
  craieProfonde: '#F1EDE5',
} as const;

export const polices = {
  display: 'Fraunces_600SemiBold',
  corps: 'Inter_400Regular',
  corpsMedium: 'Inter_500Medium',
  corpsSemiBold: 'Inter_600SemiBold',
} as const;

export const tailles = {
  /** Montant du ticket : l'élément le plus grand de l'écran, toujours. */
  montantTicket: 64,
  titreEcran: 24,
  corps: 16,
  secondaire: 14,
} as const;

export const espaces = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
} as const;

/** Cible tactile minimale (usage au comptoir, parfois avec des gants fins). */
export const CIBLE_TACTILE_MIN = 48;

export const rayons = {
  bouton: 12,
  carte: 16,
} as const;
