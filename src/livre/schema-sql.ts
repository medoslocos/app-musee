/**
 * Schéma SQLite de GemEstim — F3/F4.
 *
 * Livre de police : registre légal inaltérable.
 * - numérotation séquentielle par AUTOINCREMENT (jamais de réutilisation) ;
 * - triggers qui interdisent physiquement UPDATE et DELETE ;
 * - chaîne d'empreintes SHA-256 (chaque ligne scelle la précédente) ;
 * - identité du vendeur chiffrée au repos (colonne identite_chiffree).
 */

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS estimations (
  id TEXT PRIMARY KEY,
  cree_le TEXT NOT NULL,
  statut TEXT NOT NULL CHECK (statut IN ('estime', 'rachete', 'refuse')),
  poids_grammes TEXT NOT NULL,
  code_titre TEXT NOT NULL,
  metal TEXT NOT NULL,
  cours_centimes_par_gramme INTEGER NOT NULL,
  valeur_fonte_centimes INTEGER NOT NULL,
  marge_centimes INTEGER NOT NULL,
  prix_rachat_centimes INTEGER NOT NULL,
  description_objet TEXT NOT NULL,
  signature_svg TEXT
);

CREATE TABLE IF NOT EXISTS livre_police (
  numero INTEGER PRIMARY KEY AUTOINCREMENT,
  type_ligne TEXT NOT NULL CHECK (type_ligne IN ('rachat', 'annulation')),
  numero_annule INTEGER REFERENCES livre_police(numero),
  estimation_id TEXT NOT NULL REFERENCES estimations(id),
  date_iso TEXT NOT NULL,
  description_objet TEXT NOT NULL,
  poids_grammes TEXT NOT NULL,
  nature_metal TEXT NOT NULL,
  identite_chiffree TEXT NOT NULL,
  prix_centimes INTEGER NOT NULL,
  mode_paiement TEXT NOT NULL CHECK (mode_paiement IN ('cheque-barre', 'virement')),
  empreinte_precedente TEXT NOT NULL,
  empreinte TEXT NOT NULL
);

CREATE TRIGGER IF NOT EXISTS livre_police_sans_suppression
BEFORE DELETE ON livre_police
BEGIN
  SELECT RAISE(ABORT, 'Livre de police inaltérable : suppression interdite (annuler par une ligne d''annulation)');
END;

CREATE TRIGGER IF NOT EXISTS livre_police_sans_modification
BEFORE UPDATE ON livre_police
BEGIN
  SELECT RAISE(ABORT, 'Livre de police inaltérable : modification interdite');
END;
`;

/** Empreinte racine de la chaîne (avant la première ligne). */
export const EMPREINTE_RACINE = 'racine-livre-police-gemestim-v1';
