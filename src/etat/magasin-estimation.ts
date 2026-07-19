/**
 * État de l'estimation en cours : saisie (poids + titre), cours récupéré,
 * résultat calculé. Un seul flux : Saisie → Résultat.
 */

import { create } from 'zustand';
import { calculerEstimation, type Marge, type ResultatEstimation } from '../domaine/calcul-estimation';
import type { CodeTitre } from '../domaine/metaux';
import { titreParCode } from '../domaine/metaux';
import type { CoursAvecProvenance } from '../cours/service-cours';

interface EtatEstimation {
  poids: string;
  codeTitre: CodeTitre | null;
  coursUtilise: CoursAvecProvenance | null;
  resultat: ResultatEstimation | null;
  /** Numéro local du ticket (indicatif — le n° légal viendra du livre de police). */
  numeroTicket: number;

  definirPoids: (poids: string) => void;
  definirTitre: (code: CodeTitre) => void;
  /** Calcule et mémorise le résultat. Lève si la saisie est invalide. */
  estimer: (cours: CoursAvecProvenance, marge: Marge) => ResultatEstimation;
  recommencer: () => void;
}

export const utiliserEstimation = create<EtatEstimation>()((set, get) => ({
  poids: '',
  codeTitre: null,
  coursUtilise: null,
  resultat: null,
  numeroTicket: 0,

  definirPoids: (poids) => set({ poids }),
  definirTitre: (code) => set({ codeTitre: code }),

  estimer: (cours, marge) => {
    const { poids, codeTitre, numeroTicket } = get();
    if (codeTitre === null) {
      throw new Error('Choisir un titre avant d’estimer');
    }
    const resultat = calculerEstimation({
      poids,
      titre: titreParCode(codeTitre),
      coursCentimesParGramme: cours.cours.centimesParGramme,
      marge,
    });
    set({ resultat, coursUtilise: cours, numeroTicket: numeroTicket + 1 });
    return resultat;
  },

  recommencer: () => set({ poids: '', codeTitre: null, resultat: null, coursUtilise: null }),
}));
