/**
 * Fournisseur de démonstration : utilisé tant que l'edge function n'est pas
 * déployée (voir TODO-HUMAIN.md). Permet de tester tout le parcours photo
 * sans réseau. Les analyses retournées sont plausibles mais fictives.
 */

import type { AnalyseBijou } from '../domaine/analyse.schema';
import type { FournisseurAnalyse } from './fournisseur-analyse';

const ANALYSES_DEMONSTRATION: readonly AnalyseBijou[] = [
  {
    type_objet: 'chaîne',
    description_courte: 'Chaîne maille gourmette, or jaune probable, usure régulière.',
    matiere_probable: 'or jaune probable',
    style_epoque: null,
    confiance: 0.8,
    indices: [
      'couleur et patine cohérentes avec de l’or 18k',
      'usure régulière du fermoir, cohérente avec un port ancien',
    ],
    soupcon_imitation: false,
    alerte_valeur: false,
    motif_alerte: null,
    poincon: {
      visible: true,
      description: 'tête d’aigle probable près du fermoir, frappe partielle',
      titre_suggere: 'or-18k',
      confiance: 0.6,
    },
    fourchette_centimes: null,
  },
  {
    type_objet: 'bracelet',
    description_courte: 'Bracelet de perles bleues, monture dorée, style années 1930.',
    matiere_probable: 'lapis-lazuli probable',
    style_epoque: 'Art déco probable',
    confiance: 0.55,
    indices: [
      'bleu profond avec fines inclusions dorées évoquant la pyrite',
      'monture géométrique caractéristique des années 1930',
    ],
    soupcon_imitation: false,
    alerte_valeur: true,
    motif_alerte: 'style Art déco recherché — vérifier avant fonte',
    poincon: null,
    fourchette_centimes: { minimum_centimes: 25000, maximum_centimes: 90000 },
  },
] as const;

export class FournisseurDemonstration implements FournisseurAnalyse {
  readonly nom = 'démonstration (hors-ligne)';
  private prochainIndice = 0;

  async analyser(_imageJpegBase64: string): Promise<AnalyseBijou> {
    // Petite latence pour exercer l'état « squelette » de l'UI.
    await new Promise((resoudre) => setTimeout(resoudre, 900));
    const analyse = ANALYSES_DEMONSTRATION[this.prochainIndice % ANALYSES_DEMONSTRATION.length];
    this.prochainIndice += 1;
    if (analyse === undefined) {
      throw new Error('Aucune analyse de démonstration disponible');
    }
    return analyse;
  }
}
