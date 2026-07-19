/**
 * Réglages du bijoutier : marge de rachat par métal, persistée sur l'appareil.
 * Préréglages raisonnables par défaut — l'app est utilisable dès la première
 * ouverture, sans configuration obligatoire.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Marge } from '../domaine/calcul-estimation';
import type { Metal } from '../domaine/metaux';

export const MARGES_PAR_DEFAUT: Record<Metal, Marge> = {
  or: { mode: 'pourcentage', pourMille: 150 },
  argent: { mode: 'pourcentage', pourMille: 200 },
  platine: { mode: 'pourcentage', pourMille: 150 },
};

export interface Boutique {
  nom: string;
  adresse: string;
}

interface EtatReglages {
  margesParMetal: Record<Metal, Marge>;
  boutique: Boutique;
  /** Rappel réglementaire (art. L112-6 CMF) déjà lu et compris. */
  rappelLegalVu: boolean;
  definirMarge: (metal: Metal, marge: Marge) => void;
  definirBoutique: (boutique: Boutique) => void;
  marquerRappelLegalVu: () => void;
}

export const utiliserReglages = create<EtatReglages>()(
  persist(
    (set) => ({
      margesParMetal: MARGES_PAR_DEFAUT,
      boutique: { nom: 'Votre bijouterie', adresse: '' },
      rappelLegalVu: false,
      definirMarge: (metal, marge) =>
        set((etat) => ({
          margesParMetal: { ...etat.margesParMetal, [metal]: marge },
        })),
      definirBoutique: (boutique) => set({ boutique }),
      marquerRappelLegalVu: () => set({ rappelLegalVu: true }),
    }),
    {
      name: 'reglages',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
