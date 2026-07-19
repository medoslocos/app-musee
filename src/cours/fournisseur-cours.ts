/**
 * Abstraction MetalPriceProvider : le reste de l'app ne connaît jamais
 * le fournisseur concret (metals.dev, GoldAPI…) — uniquement cette interface.
 */

import { z } from 'zod';
import type { Metal } from '../domaine/metaux';
import type { Centimes } from '../domaine/monnaie';

export const schemaCoursMetal = z.object({
  metal: z.enum(['or', 'argent', 'platine']),
  /** Cours du métal PUR, en centimes d'euro par gramme (entier). */
  centimesParGramme: z.number().int().positive(),
  /** Date du cours chez le fournisseur, ISO 8601. */
  horodatageIso: z.string().datetime({ offset: true }),
});

export type CoursMetal = z.infer<typeof schemaCoursMetal> & {
  centimesParGramme: Centimes;
  metal: Metal;
};

export interface FournisseurCours {
  /** Nom affichable du fournisseur (pour les réglages et les erreurs). */
  nom: string;
  /** Récupère les cours à l'instant T. Rejette en cas d'échec réseau ou de réponse invalide. */
  recupererCours(metaux: readonly Metal[]): Promise<CoursMetal[]>;
}
