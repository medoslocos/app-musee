/**
 * Composition racine du service de cours : seul endroit de l'app qui connaît
 * le fournisseur concret. Pour changer de fournisseur, on ne touche qu'ici.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FournisseurMetalsDev } from './fournisseur-metals-dev';
import { ServiceCours, type StockageCleValeur } from './service-cours';
import type { FournisseurCours } from './fournisseur-cours';

const stockageAsync: StockageCleValeur = {
  lire: (cle) => AsyncStorage.getItem(cle),
  ecrire: (cle, valeur) => AsyncStorage.setItem(cle, valeur),
};

function creerFournisseur(): FournisseurCours {
  const cleApi = process.env.EXPO_PUBLIC_METALS_DEV_API_KEY;
  if (cleApi === undefined || cleApi === '') {
    return {
      nom: 'metals.dev (non configuré)',
      recupererCours: async () => {
        throw new Error(
          'Aucune clé metals.dev configurée. Définir EXPO_PUBLIC_METALS_DEV_API_KEY dans un fichier .env.',
        );
      },
    };
  }
  return new FournisseurMetalsDev(cleApi);
}

export const serviceCours = new ServiceCours(creerFournisseur(), stockageAsync);
