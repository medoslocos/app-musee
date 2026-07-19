/**
 * Schéma partagé de l'analyse IA d'un bijou — utilisé par le client ET par
 * l'edge function : toute réponse du modèle est validée par ce schéma avant
 * d'atteindre un écran. L'IA suggère, l'humain décide (CLAUDE.md §5).
 */

import { z } from 'zod';

const CODES_TITRE = [
  'or-24k',
  'or-22k',
  'or-18k',
  'or-14k',
  'or-9k',
  'argent-925',
  'argent-800',
  'platine-950',
] as const;

export const schemaPoincon = z.object({
  /** Un poinçon (ou une signature) est-il visible sur la photo ? */
  visible: z.boolean(),
  /** Description de ce qui est vu (« tête d'aigle probable, fond usé »). */
  description: z.string().min(1).nullable(),
  /** Titre suggéré — pré-remplit la F1, ne la verrouille jamais. */
  titre_suggere: z.enum(CODES_TITRE).nullable(),
  /** Confiance du modèle dans la lecture du poinçon, entre 0 et 1. */
  confiance: z.number().min(0).max(1),
});

export const schemaFourchette = z
  .object({
    minimum_centimes: z.number().int().nonnegative(),
    maximum_centimes: z.number().int().nonnegative(),
  })
  .refine((f) => f.minimum_centimes <= f.maximum_centimes, {
    message: 'La fourchette doit vérifier minimum ≤ maximum',
  });

export const schemaAnalyseBijou = z.object({
  /** Type d'objet en français métier : « bague », « chaîne », « gourmette »… */
  type_objet: z.string().min(1),
  /** Une phrase de description, comme la dirait un confrère prudent. */
  description_courte: z.string().min(1),
  /** Matière probable (« or jaune probable », « lapis-lazuli probable ») ou null si indéterminé. */
  matiere_probable: z.string().min(1).nullable(),
  /** Style ou époque probable (« Art déco », « années 1970 ») ou null. */
  style_epoque: z.string().min(1).nullable(),
  /** Confiance globale du modèle, entre 0 et 1. */
  confiance: z.number().min(0).max(1),
  /** Indices observables qui fondent l'analyse — jamais d'affirmation sans indice. */
  indices: z.array(z.string().min(1)),
  /** Vrai si des indices d'imitation sont observés (couleur trop uniforme…). */
  soupcon_imitation: z.boolean(),
  /** Vrai si indice de bijou signé ou ancien → bandeau « pourrait valoir plus que son poids ». */
  alerte_valeur: z.boolean(),
  /** Motif de l'alerte valeur (« signature Cartier possible sur le fermoir ») ou null. */
  motif_alerte: z.string().min(1).nullable(),
  poincon: schemaPoincon.nullable(),
  /** Fourchette indicative de valeur — toujours affichée comme estimation visuelle. */
  fourchette_centimes: schemaFourchette.nullable(),
});

export type AnalyseBijou = z.infer<typeof schemaAnalyseBijou>;
export type PoinconAnalyse = z.infer<typeof schemaPoincon>;

/**
 * Analyse une réponse brute (texte du modèle) : accepte le JSON nu ou entouré
 * d'une clôture ```json``` et rejette tout le reste.
 */
export function analyserReponseModele(texte: string): AnalyseBijou {
  const nettoye = texte
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  let brut: unknown;
  try {
    brut = JSON.parse(nettoye);
  } catch {
    throw new Error("Réponse du modèle illisible : ce n'est pas du JSON");
  }
  const resultat = schemaAnalyseBijou.safeParse(brut);
  if (!resultat.success) {
    const probleme = resultat.error.issues[0];
    throw new Error(
      `Réponse du modèle invalide : ${probleme?.path.join('.') ?? '?'} — ${probleme?.message ?? 'format inattendu'}`,
    );
  }
  return resultat.data;
}
