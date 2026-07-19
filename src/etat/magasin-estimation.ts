/**
 * État de l'estimation en cours : saisie (poids + titre), cours récupéré,
 * résultat calculé. Un seul flux : Saisie → Résultat.
 */

import { create } from 'zustand';
import { calculerEstimation, type Marge, type ResultatEstimation } from '../domaine/calcul-estimation';
import type { AnalyseBijou } from '../domaine/analyse.schema';
import type { CodeTitre } from '../domaine/metaux';
import { titreParCode } from '../domaine/metaux';
import type { CoursAvecProvenance } from '../cours/service-cours';

interface EtatEstimation {
  poids: string;
  codeTitre: CodeTitre | null;
  coursUtilise: CoursAvecProvenance | null;
  resultat: ResultatEstimation | null;
  /** Analyse IA associée à l'estimation en cours (jamais obligatoire). */
  analyse: AnalyseBijou | null;
  /** Identifiant de l'estimation persistée en base (écran Résultat). */
  estimationId: string | null;
  /** Numéro local du ticket (indicatif — le n° légal viendra du livre de police). */
  numeroTicket: number;

  definirPoids: (poids: string) => void;
  definirTitre: (code: CodeTitre) => void;
  definirEstimationId: (id: string) => void;
  /**
   * Injecte une analyse IA dans la saisie : le titre suggéré par le poinçon
   * PRÉ-REMPLIT le champ sans jamais l'écraser s'il a déjà été choisi à la
   * main, et sans le verrouiller (garde-fous CLAUDE.md §5).
   */
  appliquerAnalyse: (analyse: AnalyseBijou) => void;
  /** Calcule et mémorise le résultat. Lève si la saisie est invalide. */
  estimer: (cours: CoursAvecProvenance, marge: Marge) => ResultatEstimation;
  recommencer: () => void;
}

export const utiliserEstimation = create<EtatEstimation>()((set, get) => ({
  poids: '',
  codeTitre: null,
  coursUtilise: null,
  resultat: null,
  analyse: null,
  estimationId: null,
  numeroTicket: 0,

  definirPoids: (poids) => set({ poids }),
  definirTitre: (code) => set({ codeTitre: code }),
  definirEstimationId: (id) => set({ estimationId: id }),

  appliquerAnalyse: (analyse) =>
    set((etat) => ({
      analyse,
      codeTitre:
        etat.codeTitre === null && analyse.poincon?.titre_suggere != null
          ? analyse.poincon.titre_suggere
          : etat.codeTitre,
    })),

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
    set({ resultat, coursUtilise: cours, numeroTicket: numeroTicket + 1, estimationId: null });
    return resultat;
  },

  recommencer: () =>
    set({
      poids: '',
      codeTitre: null,
      resultat: null,
      coursUtilise: null,
      analyse: null,
      estimationId: null,
    }),
}));
