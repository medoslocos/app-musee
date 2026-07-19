/**
 * Implémentation metals.dev de FournisseurCours.
 * Swappable : rien d'autre dans l'app n'importe ce fichier que la composition racine.
 */

import { z } from 'zod';
import type { Metal } from '../domaine/metaux';
import type { CoursMetal, FournisseurCours } from './fournisseur-cours';

const CLES_METALS_DEV: Record<Metal, string> = {
  or: 'gold',
  argent: 'silver',
  platine: 'platinum',
};

const schemaReponseMetalsDev = z.object({
  status: z.literal('success'),
  currency: z.literal('EUR'),
  unit: z.literal('g'),
  timestamp: z.string(),
  metals: z.record(z.string(), z.number().positive()),
});

export class FournisseurMetalsDev implements FournisseurCours {
  readonly nom = 'metals.dev';

  constructor(
    private readonly cleApi: string,
    private readonly urlBase = 'https://api.metals.dev/v1',
  ) {}

  async recupererCours(metaux: readonly Metal[]): Promise<CoursMetal[]> {
    const url = `${this.urlBase}/latest?api_key=${encodeURIComponent(this.cleApi)}&currency=EUR&unit=g`;
    const reponse = await fetch(url);
    if (!reponse.ok) {
      throw new Error(`metals.dev a répondu ${reponse.status} — cours indisponible`);
    }
    const brut: unknown = await reponse.json();
    const analyse = schemaReponseMetalsDev.safeParse(brut);
    if (!analyse.success) {
      throw new Error(`Réponse metals.dev inattendue : ${analyse.error.issues[0]?.message ?? 'format inconnu'}`);
    }

    const horodatage = new Date(analyse.data.timestamp);
    const horodatageIso = Number.isNaN(horodatage.getTime())
      ? new Date().toISOString()
      : horodatage.toISOString();

    return metaux.map((metal) => {
      const eurosParGramme = analyse.data.metals[CLES_METALS_DEV[metal]];
      if (eurosParGramme === undefined) {
        throw new Error(`metals.dev ne fournit pas le cours du métal « ${metal} »`);
      }
      return {
        metal,
        centimesParGramme: Math.round(eurosParGramme * 100),
        horodatageIso,
      };
    });
  }
}
