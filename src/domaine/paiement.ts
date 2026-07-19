/**
 * Modes de paiement du rachat. Le paiement en espèces des métaux précieux
 * est interdit par l'article L112-6 du Code monétaire et financier :
 * il est BLOQUÉ, pas seulement déconseillé.
 */

export type ModePaiement = 'cheque-barre' | 'virement';

export const LIBELLES_PAIEMENT: Record<ModePaiement, string> = {
  'cheque-barre': 'Chèque barré',
  virement: 'Virement',
};

export const MESSAGE_ESPECES_INTERDITES =
  'Paiement en espèces interdit pour le rachat de métaux précieux ' +
  '(art. L112-6 du Code monétaire et financier). Régler par chèque barré ou virement.';

/** Valide un mode de paiement venu de l'extérieur (formulaire, base). */
export function verifierModePaiement(valeur: string): ModePaiement {
  if (valeur === 'cheque-barre' || valeur === 'virement') {
    return valeur;
  }
  if (valeur === 'especes') {
    throw new Error(MESSAGE_ESPECES_INTERDITES);
  }
  throw new Error(`Mode de paiement inconnu : « ${valeur} »`);
}
