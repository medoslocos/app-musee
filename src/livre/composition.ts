/**
 * Composition racine du dépôt local : SQLite + clé de chiffrement dans le
 * coffre de l'appareil + hachage SHA-256. Initialisation paresseuse pour ne
 * payer l'ouverture de la base qu'au premier usage.
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { sha256 } from 'js-sha256';
import { BaseSqlExpo } from './adaptateur-expo-sqlite';
import { ChiffreurAes } from './chiffrement';
import { Depot } from './depot';

const CLE_STOCKAGE = 'gemestim.cle-livre-police';

function octetsVersHex(octets: Uint8Array): string {
  return Array.from(octets, (octet) => octet.toString(16).padStart(2, '0')).join('');
}

/**
 * Récupère (ou crée) la clé AES-256 de chiffrement de l'identité.
 * Natif : coffre matériel via expo-secure-store. Web : localStorage —
 * acceptable pour le développement uniquement (voir TODO-HUMAIN.md).
 */
function obtenirCleChiffrement(): string {
  if (Platform.OS === 'web') {
    const existante = globalThis.localStorage?.getItem(CLE_STOCKAGE);
    if (existante !== null && existante !== undefined && existante.length === 64) {
      return existante;
    }
    const nouvelle = octetsVersHex(Crypto.getRandomBytes(32));
    globalThis.localStorage?.setItem(CLE_STOCKAGE, nouvelle);
    return nouvelle;
  }
  const existante = SecureStore.getItem(CLE_STOCKAGE);
  if (existante !== null && existante.length === 64) {
    return existante;
  }
  const nouvelle = octetsVersHex(Crypto.getRandomBytes(32));
  SecureStore.setItem(CLE_STOCKAGE, nouvelle);
  return nouvelle;
}

let instance: Promise<Depot> | null = null;

export function obtenirDepot(): Promise<Depot> {
  if (instance === null) {
    const depot = new Depot({
      base: new BaseSqlExpo(),
      hacher: (texte) => sha256(texte),
      chiffreur: new ChiffreurAes(obtenirCleChiffrement(), () => Crypto.getRandomBytes(16)),
      horloge: () => new Date().toISOString(),
      genererId: () => Crypto.randomUUID(),
    });
    instance = depot.initialiser().then(() => depot);
  }
  return instance;
}
