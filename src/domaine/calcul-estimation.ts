/**
 * Cœur de l'app : calcul de la valeur fonte et du prix de rachat.
 *
 * Règles :
 * - valeur fonte = poids × pureté × cours du métal pur ;
 * - marge du bijoutier en pourcentage (pour-mille entier) ou en €/g (centimes) ;
 * - arithmétique entière de bout en bout (BigInt pour le produit intermédiaire),
 *   arrondi au centime le plus proche, résultat jamais négatif.
 */

import type { Centimes } from './monnaie';
import { poidsEnMilligrammes, verifierCentimes } from './monnaie';
import type { Titre } from './metaux';

/** Marge de rachat : soit un pourcentage (en pour-mille : 150 = 15,0 %), soit des centimes par gramme. */
export type Marge =
  | { mode: 'pourcentage'; pourMille: number }
  | { mode: 'euros-par-gramme'; centimesParGramme: number };

export interface ParametresEstimation {
  /** Poids saisi en grammes, décimal string (« 12,4 »). */
  poids: string;
  titre: Titre;
  /** Cours du métal PUR en centimes d'euro par gramme. */
  coursCentimesParGramme: Centimes;
  marge: Marge;
}

export interface ResultatEstimation {
  poidsMilligrammes: number;
  titre: Titre;
  coursCentimesParGramme: Centimes;
  /** Poids de métal fin contenu, en milligrammes (arrondi au mg). */
  poidsFinMilligrammes: number;
  valeurFonteCentimes: Centimes;
  margeCentimes: Centimes;
  prixRachatCentimes: Centimes;
  marge: Marge;
}

function verifierMarge(marge: Marge): void {
  if (marge.mode === 'pourcentage') {
    if (!Number.isSafeInteger(marge.pourMille) || marge.pourMille < 0 || marge.pourMille > 1000) {
      throw new Error(`Marge en pourcentage invalide : ${marge.pourMille} ‰ (entre 0 et 1000)`);
    }
  } else {
    if (!Number.isSafeInteger(marge.centimesParGramme) || marge.centimesParGramme < 0) {
      throw new Error(`Marge en €/g invalide : ${marge.centimesParGramme} centimes/g`);
    }
  }
}

/** Division entière arrondie au plus proche (demi vers le haut), en BigInt. */
function diviserArrondi(numerateur: bigint, denominateur: bigint): number {
  return Number((numerateur + denominateur / 2n) / denominateur);
}

export function calculerEstimation(parametres: ParametresEstimation): ResultatEstimation {
  const { titre, marge } = parametres;
  const poidsMilligrammes = poidsEnMilligrammes(parametres.poids);
  const cours = parametres.coursCentimesParGramme;
  verifierCentimes(cours, 'cours du métal');
  if (cours <= 0) {
    throw new Error(`Cours invalide : ${cours} centimes/g`);
  }
  verifierMarge(marge);

  const poidsFinMilligrammes = diviserArrondi(
    BigInt(poidsMilligrammes) * BigInt(titre.puretePourMille),
    1000n,
  );

  // fonte (centimes) = poids(mg)/1000 × pureté(‰)/1000 × cours(centimes/g)
  const valeurFonteCentimes = diviserArrondi(
    BigInt(poidsMilligrammes) * BigInt(titre.puretePourMille) * BigInt(cours),
    1_000_000n,
  );

  const margeCentimes =
    marge.mode === 'pourcentage'
      ? diviserArrondi(BigInt(valeurFonteCentimes) * BigInt(marge.pourMille), 1000n)
      : diviserArrondi(BigInt(poidsMilligrammes) * BigInt(marge.centimesParGramme), 1000n);

  const prixRachatCentimes = Math.max(0, valeurFonteCentimes - margeCentimes);

  return {
    poidsMilligrammes,
    titre,
    coursCentimesParGramme: cours,
    poidsFinMilligrammes,
    valeurFonteCentimes,
    margeCentimes,
    prixRachatCentimes,
    marge,
  };
}
