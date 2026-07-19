import { describe, expect, it } from 'vitest';
import { analyserReponseModele, schemaAnalyseBijou } from '../analyse.schema';
import {
  mentionLaboObligatoire,
  niveauBadge,
  niveauConfiance,
} from '../confiance';

const ANALYSE_VALIDE = {
  type_objet: 'bracelet',
  description_courte: 'Bracelet de perles bleues, monture métal doré.',
  matiere_probable: 'lapis-lazuli probable',
  style_epoque: null,
  confiance: 0.8,
  indices: ['couleur bleu profond avec inclusions dorées', 'perles légèrement irrégulières'],
  soupcon_imitation: false,
  alerte_valeur: false,
  motif_alerte: null,
  poincon: {
    visible: true,
    description: 'tête d’aigle probable sur le fermoir',
    titre_suggere: 'or-18k',
    confiance: 0.6,
  },
  fourchette_centimes: { minimum_centimes: 15000, maximum_centimes: 40000 },
};

describe('schemaAnalyseBijou', () => {
  it('accepte une analyse complète valide', () => {
    expect(schemaAnalyseBijou.parse(ANALYSE_VALIDE).type_objet).toBe('bracelet');
  });

  it('accepte une analyse dégradée (tout indéterminé)', () => {
    const degradee = {
      ...ANALYSE_VALIDE,
      matiere_probable: null,
      poincon: null,
      fourchette_centimes: null,
      confiance: 0.2,
      indices: [],
    };
    expect(schemaAnalyseBijou.parse(degradee).poincon).toBeNull();
  });

  it('refuse une confiance hors de [0, 1]', () => {
    expect(schemaAnalyseBijou.safeParse({ ...ANALYSE_VALIDE, confiance: 1.2 }).success).toBe(false);
    expect(schemaAnalyseBijou.safeParse({ ...ANALYSE_VALIDE, confiance: -0.1 }).success).toBe(false);
  });

  it('refuse un titre suggéré inconnu', () => {
    const analyse = {
      ...ANALYSE_VALIDE,
      poincon: { ...ANALYSE_VALIDE.poincon, titre_suggere: 'or-21k' },
    };
    expect(schemaAnalyseBijou.safeParse(analyse).success).toBe(false);
  });

  it('refuse une fourchette inversée ou non entière', () => {
    expect(
      schemaAnalyseBijou.safeParse({
        ...ANALYSE_VALIDE,
        fourchette_centimes: { minimum_centimes: 40000, maximum_centimes: 15000 },
      }).success,
    ).toBe(false);
    expect(
      schemaAnalyseBijou.safeParse({
        ...ANALYSE_VALIDE,
        fourchette_centimes: { minimum_centimes: 150.5, maximum_centimes: 400 },
      }).success,
    ).toBe(false);
  });
});

describe('analyserReponseModele', () => {
  it('accepte le JSON nu et le JSON en clôture ```json```', () => {
    const json = JSON.stringify(ANALYSE_VALIDE);
    expect(analyserReponseModele(json).type_objet).toBe('bracelet');
    expect(analyserReponseModele('```json\n' + json + '\n```').type_objet).toBe('bracelet');
  });

  it('rejette un texte qui n’est pas du JSON avec un message clair', () => {
    expect(() => analyserReponseModele('Je pense que ce bijou est…')).toThrow(
      "ce n'est pas du JSON",
    );
  });

  it('rejette un JSON valide mais hors schéma en nommant le champ', () => {
    expect(() => analyserReponseModele('{"type_objet": ""}')).toThrow('Réponse du modèle invalide');
  });
});

describe('niveauBadge', () => {
  it('mappe la confiance sur les trois badges', () => {
    expect(niveauBadge({ confiance: 0.9, soupcon_imitation: false })).toBe('elevee');
    expect(niveauBadge({ confiance: 0.75, soupcon_imitation: false })).toBe('elevee');
    expect(niveauBadge({ confiance: 0.5, soupcon_imitation: false })).toBe('a-verifier');
    expect(niveauBadge({ confiance: 0.1, soupcon_imitation: false })).toBe('a-verifier');
  });

  it('fait toujours primer les indices d’imitation, même à confiance élevée', () => {
    expect(niveauBadge({ confiance: 0.9, soupcon_imitation: true })).toBe('douteux');
  });
});

describe('niveauConfiance (poinçon)', () => {
  it('retourne élevée / moyenne / faible', () => {
    expect(niveauConfiance(0.8)).toBe('elevee');
    expect(niveauConfiance(0.5)).toBe('moyenne');
    expect(niveauConfiance(0.2)).toBe('faible');
  });
});

describe('mentionLaboObligatoire', () => {
  it('impose la mention labo dès que le haut de fourchette atteint le seuil', () => {
    expect(mentionLaboObligatoire({ minimum_centimes: 10000, maximum_centimes: 50000 })).toBe(true);
    expect(mentionLaboObligatoire({ minimum_centimes: 10000, maximum_centimes: 49999 })).toBe(false);
    expect(mentionLaboObligatoire(null)).toBe(false);
  });

  it('respecte un seuil configuré', () => {
    expect(
      mentionLaboObligatoire({ minimum_centimes: 0, maximum_centimes: 20000 }, 20000),
    ).toBe(true);
  });
});
