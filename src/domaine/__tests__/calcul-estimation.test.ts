import { describe, expect, it } from 'vitest';
import { calculerEstimation, type Marge } from '../calcul-estimation';
import { titreParCode } from '../metaux';

const SANS_MARGE: Marge = { mode: 'pourcentage', pourMille: 0 };

describe('calculerEstimation — valeur fonte', () => {
  it('vérifie le cas de référence du CLAUDE.md : chaîne 18k de 12,4 g, cours à 68 €/g', () => {
    // À la main : 12,4 × 0,750 × 68 = 632,40 €
    const resultat = calculerEstimation({
      poids: '12,4',
      titre: titreParCode('or-18k'),
      coursCentimesParGramme: 6800,
      marge: SANS_MARGE,
    });
    expect(resultat.valeurFonteCentimes).toBe(63240);
    expect(resultat.poidsFinMilligrammes).toBe(9300);
    expect(resultat.prixRachatCentimes).toBe(63240);
  });

  it('accepte le point comme séparateur décimal', () => {
    const virgule = calculerEstimation({
      poids: '12,4',
      titre: titreParCode('or-18k'),
      coursCentimesParGramme: 6800,
      marge: SANS_MARGE,
    });
    const point = calculerEstimation({
      poids: '12.4',
      titre: titreParCode('or-18k'),
      coursCentimesParGramme: 6800,
      marge: SANS_MARGE,
    });
    expect(point.valeurFonteCentimes).toBe(virgule.valeurFonteCentimes);
  });

  it('calcule chaque titre pris en charge sur 10 g à 100 €/g', () => {
    const attendus: Record<string, number> = {
      'or-24k': 99900,
      'or-22k': 91600,
      'or-18k': 75000,
      'or-14k': 58500,
      'or-9k': 37500,
      'argent-925': 92500,
      'argent-800': 80000,
      'platine-950': 95000,
    };
    for (const [code, attendu] of Object.entries(attendus)) {
      const resultat = calculerEstimation({
        poids: '10',
        titre: titreParCode(code as Parameters<typeof titreParCode>[0]),
        coursCentimesParGramme: 10000,
        marge: SANS_MARGE,
      });
      expect(resultat.valeurFonteCentimes, code).toBe(attendu);
    }
  });

  it('arrondit au centime le plus proche (demi vers le haut)', () => {
    // 0,001 g × 999 ‰ × 6800 c/g = 6,7932 centimes → 7
    const resultat = calculerEstimation({
      poids: '0,001',
      titre: titreParCode('or-24k'),
      coursCentimesParGramme: 6800,
      marge: SANS_MARGE,
    });
    expect(resultat.valeurFonteCentimes).toBe(7);
  });

  it('reste exact sur un poids maximal sans dépassement d’entier', () => {
    // 10 000 g × 999 ‰ × 999 999,99 €/g — produit intermédiaire > Number.MAX_SAFE_INTEGER
    const resultat = calculerEstimation({
      poids: '10000',
      titre: titreParCode('or-24k'),
      coursCentimesParGramme: 99_999_999,
      marge: SANS_MARGE,
    });
    // 10 000 × 0,999 × 999 999,99 € = 998 999 990 010 centimes
    expect(resultat.valeurFonteCentimes).toBe(998_999_990_010);
    expect(Number.isSafeInteger(resultat.valeurFonteCentimes)).toBe(true);
  });
});

describe('calculerEstimation — marge', () => {
  it('applique une marge en pourcentage (15 % sur le cas de référence)', () => {
    const resultat = calculerEstimation({
      poids: '12,4',
      titre: titreParCode('or-18k'),
      coursCentimesParGramme: 6800,
      marge: { mode: 'pourcentage', pourMille: 150 },
    });
    // 632,40 € − 15 % = 537,54 €
    expect(resultat.margeCentimes).toBe(9486);
    expect(resultat.prixRachatCentimes).toBe(53754);
  });

  it('applique une marge en €/g (2,50 €/g sur 12,4 g)', () => {
    const resultat = calculerEstimation({
      poids: '12,4',
      titre: titreParCode('or-18k'),
      coursCentimesParGramme: 6800,
      marge: { mode: 'euros-par-gramme', centimesParGramme: 250 },
    });
    // 12,4 × 2,50 = 31,00 € de marge
    expect(resultat.margeCentimes).toBe(3100);
    expect(resultat.prixRachatCentimes).toBe(60140);
  });

  it('ne descend jamais sous zéro quand la marge dépasse la valeur fonte', () => {
    const resultat = calculerEstimation({
      poids: '1',
      titre: titreParCode('argent-800'),
      coursCentimesParGramme: 80,
      marge: { mode: 'euros-par-gramme', centimesParGramme: 10_000 },
    });
    expect(resultat.prixRachatCentimes).toBe(0);
  });

  it('accepte les bornes 0 ‰ et 1000 ‰', () => {
    const totale = calculerEstimation({
      poids: '10',
      titre: titreParCode('or-18k'),
      coursCentimesParGramme: 6800,
      marge: { mode: 'pourcentage', pourMille: 1000 },
    });
    expect(totale.prixRachatCentimes).toBe(0);
  });

  it('refuse une marge en pourcentage hors bornes ou non entière', () => {
    for (const pourMille of [-1, 1001, 12.5]) {
      expect(() =>
        calculerEstimation({
          poids: '10',
          titre: titreParCode('or-18k'),
          coursCentimesParGramme: 6800,
          marge: { mode: 'pourcentage', pourMille },
        }),
      ).toThrow('Marge en pourcentage invalide');
    }
  });

  it('refuse une marge en €/g négative ou non entière', () => {
    for (const centimesParGramme of [-1, 2.5]) {
      expect(() =>
        calculerEstimation({
          poids: '10',
          titre: titreParCode('or-18k'),
          coursCentimesParGramme: 6800,
          marge: { mode: 'euros-par-gramme', centimesParGramme },
        }),
      ).toThrow('Marge en €/g invalide');
    }
  });
});

describe('calculerEstimation — entrées invalides', () => {
  it('refuse un cours nul, négatif ou non entier', () => {
    for (const cours of [0, -100]) {
      expect(() =>
        calculerEstimation({
          poids: '10',
          titre: titreParCode('or-18k'),
          coursCentimesParGramme: cours,
          marge: SANS_MARGE,
        }),
      ).toThrow('Cours invalide');
    }
    expect(() =>
      calculerEstimation({
        poids: '10',
        titre: titreParCode('or-18k'),
        coursCentimesParGramme: 68.5,
        marge: SANS_MARGE,
      }),
    ).toThrow('Montant invalide');
  });

  it('refuse un poids mal formé ou hors limites', () => {
    for (const poids of ['', 'abc', '12,4567', '-5', '0', '10001']) {
      expect(() =>
        calculerEstimation({
          poids,
          titre: titreParCode('or-18k'),
          coursCentimesParGramme: 6800,
          marge: SANS_MARGE,
        }),
      ).toThrow(/Poids/);
    }
  });
});
