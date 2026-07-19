/**
 * Chiffrement au repos de l'identité du vendeur (livre de police).
 * AES-256-CTR (aes-js, pur JS — fonctionne dans Hermes comme dans Node),
 * IV aléatoire préfixé, sortie hexadécimale. La clé vit dans le coffre de
 * l'appareil (expo-secure-store) — jamais dans la base ni dans les logs.
 */

import aesjs from 'aes-js';

export interface Chiffreur {
  chiffrer(texteClair: string): string;
  dechiffrer(texteChiffre: string): string;
}

export interface IdentiteVendeur {
  nom: string;
  adresse: string;
  /** Type de pièce d'identité : « CNI », « passeport », « titre de séjour », « permis de conduire ». */
  typePiece: string;
  numeroPiece: string;
}

const TAILLE_CLE_OCTETS = 32;
const TAILLE_IV_OCTETS = 16;

export class ChiffreurAes implements Chiffreur {
  private readonly cle: Uint8Array;

  constructor(
    cleHex: string,
    private readonly genererIv: () => Uint8Array,
  ) {
    const cle = aesjs.utils.hex.toBytes(cleHex);
    if (cle.length !== TAILLE_CLE_OCTETS) {
      throw new Error(`Clé de chiffrement invalide : ${cle.length} octets (32 attendus)`);
    }
    this.cle = cle;
  }

  chiffrer(texteClair: string): string {
    const iv = this.genererIv();
    if (iv.length !== TAILLE_IV_OCTETS) {
      throw new Error(`IV invalide : ${iv.length} octets (16 attendus)`);
    }
    const compteur = new aesjs.Counter(iv);
    const aes = new aesjs.ModeOfOperation.ctr(this.cle, compteur);
    const chiffre = aes.encrypt(aesjs.utils.utf8.toBytes(texteClair));
    return aesjs.utils.hex.fromBytes(iv) + aesjs.utils.hex.fromBytes(chiffre);
  }

  dechiffrer(texteChiffre: string): string {
    const octets = aesjs.utils.hex.toBytes(texteChiffre);
    if (octets.length < TAILLE_IV_OCTETS) {
      throw new Error('Données chiffrées tronquées');
    }
    const iv = octets.slice(0, TAILLE_IV_OCTETS);
    const compteur = new aesjs.Counter(iv);
    const aes = new aesjs.ModeOfOperation.ctr(this.cle, compteur);
    return aesjs.utils.utf8.fromBytes(aes.decrypt(octets.slice(TAILLE_IV_OCTETS)));
  }
}

export function chiffrerIdentite(chiffreur: Chiffreur, identite: IdentiteVendeur): string {
  return chiffreur.chiffrer(JSON.stringify(identite));
}

export function dechiffrerIdentite(chiffreur: Chiffreur, texteChiffre: string): IdentiteVendeur {
  const brut: unknown = JSON.parse(chiffreur.dechiffrer(texteChiffre));
  if (
    typeof brut !== 'object' ||
    brut === null ||
    typeof (brut as IdentiteVendeur).nom !== 'string' ||
    typeof (brut as IdentiteVendeur).adresse !== 'string' ||
    typeof (brut as IdentiteVendeur).typePiece !== 'string' ||
    typeof (brut as IdentiteVendeur).numeroPiece !== 'string'
  ) {
    throw new Error('Identité déchiffrée invalide — mauvaise clé ?');
  }
  return brut as IdentiteVendeur;
}
