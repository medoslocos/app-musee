/**
 * Monnaie : tous les montants internes sont des entiers en centimes d'euro.
 * Le formatage fr-FR n'intervient qu'à l'affichage.
 */

export type Centimes = number;

export function verifierCentimes(valeur: number, contexte: string): void {
  if (!Number.isSafeInteger(valeur)) {
    throw new Error(`Montant invalide (${contexte}) : ${valeur} n'est pas un entier de centimes`);
  }
}

const formatEuros = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const formatEurosSansDecimales = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** 123456 → « 1 234,56 € » */
export function formaterCentimes(centimes: Centimes): string {
  verifierCentimes(centimes, 'formaterCentimes');
  return formatEuros.format(centimes / 100);
}

/** 123456 → « 1 235 € » — pour les grands chiffres du ticket. */
export function formaterCentimesArrondis(centimes: Centimes): string {
  verifierCentimes(centimes, 'formaterCentimesArrondis');
  return formatEurosSansDecimales.format(Math.round(centimes / 100));
}

/**
 * Poids légal : décimal string (ex. « 12,4 » ou « 12.4 ») → milligrammes entiers.
 * Refuse tout ce qui n'est pas un poids plausible de comptoir (0 < p ≤ 10 kg).
 */
export function poidsEnMilligrammes(poids: string): number {
  const normalise = poids.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,3})?$/.test(normalise)) {
    throw new Error(`Poids invalide : « ${poids} » (attendu : grammes, 3 décimales max)`);
  }
  const [entier, fraction = ''] = normalise.split('.');
  const milligrammes = Number(entier) * 1000 + Number(fraction.padEnd(3, '0'));
  if (!Number.isSafeInteger(milligrammes) || milligrammes <= 0 || milligrammes > 10_000_000) {
    throw new Error(`Poids hors limites : « ${poids} » (entre 0,001 g et 10 000 g)`);
  }
  return milligrammes;
}

const formatGrammes = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

/** 12400 mg → « 12,4 g » */
export function formaterMilligrammes(milligrammes: number): string {
  return `${formatGrammes.format(milligrammes / 1000)} g`;
}

/**
 * 12400 mg → « 12.4 » : forme canonique du poids légal stocké en base
 * (point décimal, sans séparateur de milliers, sans dépendre d'une locale).
 */
export function grammesCanoniques(milligrammes: number): string {
  if (!Number.isSafeInteger(milligrammes) || milligrammes < 0) {
    throw new Error(`Poids invalide : ${milligrammes} mg`);
  }
  const entier = Math.floor(milligrammes / 1000);
  const fraction = String(milligrammes % 1000).padStart(3, '0').replace(/0+$/, '');
  return fraction === '' ? String(entier) : `${entier}.${fraction}`;
}
