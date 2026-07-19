/**
 * Métaux et titres pris en charge par l'estimation.
 * Les puretés sont exprimées en millièmes (entiers) — jamais de float.
 */

export type Metal = 'or' | 'argent' | 'platine';

export type CodeTitre =
  | 'or-24k'
  | 'or-22k'
  | 'or-18k'
  | 'or-14k'
  | 'or-9k'
  | 'argent-925'
  | 'argent-800'
  | 'platine-950';

export interface Titre {
  code: CodeTitre;
  metal: Metal;
  /** Libellé métier affiché sur les boutons (ex. « Or 18 carats »). */
  libelle: string;
  /** Libellé court pour le ticket (ex. « 18k »). */
  libelleCourt: string;
  /** Pureté en millièmes : 750 = 75,0 %. */
  puretePourMille: number;
}

export const TITRES: readonly Titre[] = [
  { code: 'or-24k', metal: 'or', libelle: 'Or 24 carats', libelleCourt: 'Or 24k', puretePourMille: 999 },
  { code: 'or-22k', metal: 'or', libelle: 'Or 22 carats', libelleCourt: 'Or 22k', puretePourMille: 916 },
  { code: 'or-18k', metal: 'or', libelle: 'Or 18 carats', libelleCourt: 'Or 18k', puretePourMille: 750 },
  { code: 'or-14k', metal: 'or', libelle: 'Or 14 carats', libelleCourt: 'Or 14k', puretePourMille: 585 },
  { code: 'or-9k', metal: 'or', libelle: 'Or 9 carats', libelleCourt: 'Or 9k', puretePourMille: 375 },
  { code: 'argent-925', metal: 'argent', libelle: 'Argent 925', libelleCourt: 'Ag 925', puretePourMille: 925 },
  { code: 'argent-800', metal: 'argent', libelle: 'Argent 800', libelleCourt: 'Ag 800', puretePourMille: 800 },
  { code: 'platine-950', metal: 'platine', libelle: 'Platine 950', libelleCourt: 'Pt 950', puretePourMille: 950 },
] as const;

export function titreParCode(code: CodeTitre): Titre {
  const titre = TITRES.find((t) => t.code === code);
  if (!titre) {
    throw new Error(`Titre inconnu : ${code}`);
  }
  return titre;
}

export const LIBELLES_METAUX: Record<Metal, string> = {
  or: 'Or',
  argent: 'Argent',
  platine: 'Platine',
};
