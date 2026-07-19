import { beforeEach, describe, expect, it } from 'vitest';
import type { AnalyseBijou } from '../../domaine/analyse.schema';
import { utiliserEstimation } from '../magasin-estimation';

function analyseAvecPoincon(titre: 'or-18k' | null): AnalyseBijou {
  return {
    type_objet: 'chaîne',
    description_courte: 'Chaîne maille gourmette.',
    matiere_probable: 'or jaune probable',
    style_epoque: null,
    confiance: 0.8,
    indices: [],
    soupcon_imitation: false,
    alerte_valeur: false,
    motif_alerte: null,
    poincon:
      titre === null
        ? null
        : { visible: true, description: 'tête d’aigle', titre_suggere: titre, confiance: 0.6 },
    fourchette_centimes: null,
  };
}

describe('appliquerAnalyse — injection F2 → F1', () => {
  beforeEach(() => {
    utiliserEstimation.getState().recommencer();
  });

  it('pré-remplit le titre depuis le poinçon quand rien n’est choisi', () => {
    utiliserEstimation.getState().appliquerAnalyse(analyseAvecPoincon('or-18k'));
    expect(utiliserEstimation.getState().codeTitre).toBe('or-18k');
    expect(utiliserEstimation.getState().analyse?.type_objet).toBe('chaîne');
  });

  it('n’écrase JAMAIS un titre déjà choisi à la main', () => {
    utiliserEstimation.getState().definirTitre('or-14k');
    utiliserEstimation.getState().appliquerAnalyse(analyseAvecPoincon('or-18k'));
    expect(utiliserEstimation.getState().codeTitre).toBe('or-14k');
  });

  it('reste inerte sur le titre si aucun poinçon n’est lu', () => {
    utiliserEstimation.getState().appliquerAnalyse(analyseAvecPoincon(null));
    expect(utiliserEstimation.getState().codeTitre).toBeNull();
  });

  it('le titre pré-rempli reste modifiable (jamais verrouillé)', () => {
    utiliserEstimation.getState().appliquerAnalyse(analyseAvecPoincon('or-18k'));
    utiliserEstimation.getState().definirTitre('or-9k');
    expect(utiliserEstimation.getState().codeTitre).toBe('or-9k');
  });

  it('recommencer efface aussi l’analyse', () => {
    utiliserEstimation.getState().appliquerAnalyse(analyseAvecPoincon('or-18k'));
    utiliserEstimation.getState().recommencer();
    expect(utiliserEstimation.getState().analyse).toBeNull();
  });
});
