/**
 * Service de cours : cache 15 minutes + repli hors-ligne sur le dernier
 * cours connu (persisté), avec la provenance exposée pour l'affichage
 * (« cours du JJ/MM à HHhMM »).
 */

import { z } from 'zod';
import type { Metal } from '../domaine/metaux';
import { schemaCoursMetal, type CoursMetal, type FournisseurCours } from './fournisseur-cours';

/** Petit stockage clé/valeur injectable (AsyncStorage en prod, Map en test). */
export interface StockageCleValeur {
  lire(cle: string): Promise<string | null>;
  ecrire(cle: string, valeur: string): Promise<void>;
}

const schemaCoursPersiste = z.object({
  cours: schemaCoursMetal,
  /** Date de récupération locale (epoch ms) — sert au calcul de fraîcheur du cache. */
  recupereLe: z.number().int().nonnegative(),
});

type CoursPersiste = z.infer<typeof schemaCoursPersiste>;

export type ProvenanceCours = 'frais' | 'cache' | 'dernier-connu';

export interface CoursAvecProvenance {
  cours: CoursMetal;
  provenance: ProvenanceCours;
}

export const DUREE_CACHE_MS = 15 * 60 * 1000;

export class ErreurCoursIndisponible extends Error {
  constructor(nomFournisseur: string, cause: unknown) {
    super(
      `Le cours n'a pas pu être récupéré auprès de ${nomFournisseur} et aucun cours ` +
        `n'est en mémoire. Vérifier la connexion internet, puis réessayer.`,
    );
    this.name = 'ErreurCoursIndisponible';
    this.cause = cause;
  }
}

export class ServiceCours {
  constructor(
    private readonly fournisseur: FournisseurCours,
    private readonly stockage: StockageCleValeur,
    private readonly horloge: () => number = () => Date.now(),
    private readonly dureeCacheMs: number = DUREE_CACHE_MS,
  ) {}

  private cleStockage(metal: Metal): string {
    return `cours.${metal}`;
  }

  private async lireDernierConnu(metal: Metal): Promise<CoursPersiste | null> {
    const brut = await this.stockage.lire(this.cleStockage(metal));
    if (brut === null) {
      return null;
    }
    try {
      const analyse = schemaCoursPersiste.safeParse(JSON.parse(brut));
      return analyse.success ? analyse.data : null;
    } catch {
      return null;
    }
  }

  /**
   * Retourne le cours du métal :
   * - « cache » si un cours de moins de 15 minutes est disponible ;
   * - « frais » après un appel fournisseur réussi ;
   * - « dernier-connu » (quel que soit son âge) si le fournisseur est injoignable.
   * Rejette avec ErreurCoursIndisponible si rien n'est disponible.
   */
  async obtenirCours(metal: Metal): Promise<CoursAvecProvenance> {
    const dernier = await this.lireDernierConnu(metal);
    const maintenant = this.horloge();

    if (dernier !== null && maintenant - dernier.recupereLe < this.dureeCacheMs) {
      return { cours: dernier.cours as CoursMetal, provenance: 'cache' };
    }

    try {
      const [cours] = await this.fournisseur.recupererCours([metal]);
      if (cours === undefined) {
        throw new Error(`${this.fournisseur.nom} n'a renvoyé aucun cours pour « ${metal} »`);
      }
      const persiste: CoursPersiste = { cours, recupereLe: maintenant };
      await this.stockage.ecrire(this.cleStockage(metal), JSON.stringify(persiste));
      return { cours, provenance: 'frais' };
    } catch (erreur) {
      if (dernier !== null) {
        return { cours: dernier.cours as CoursMetal, provenance: 'dernier-connu' };
      }
      throw new ErreurCoursIndisponible(this.fournisseur.nom, erreur);
    }
  }
}
