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

interface EtatReglages {
  margesParMetal: Record<Metal, Marge>;
  definirMarge: (metal: Metal, marge: Marge) => void;
}

export const utiliserReglages = create<EtatReglages>()(
  persist(
    (set) => ({
      margesParMetal: MARGES_PAR_DEFAUT,
      definirMarge: (metal, marge) =>
        set((etat) => ({
          margesParMetal: { ...etat.margesParMetal, [metal]: marge },
        })),
    }),
    {
      name: 'reglages',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
