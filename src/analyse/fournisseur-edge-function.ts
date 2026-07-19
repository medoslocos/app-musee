/**
 * Implémentation réelle de FournisseurAnalyse : appelle l'edge function
 * Supabase `analyse-bijou`, qui détient seule la clé Anthropic.
 */

import { analyserReponseModele, schemaAnalyseBijou, type AnalyseBijou } from '../domaine/analyse.schema';
import type { FournisseurAnalyse } from './fournisseur-analyse';

export class FournisseurEdgeFunction implements FournisseurAnalyse {
  readonly nom = 'edge function analyse-bijou';

  constructor(
    private readonly urlFonction: string,
    private readonly cleAnonyme?: string,
  ) {}

  async analyser(imageJpegBase64: string): Promise<AnalyseBijou> {
    let reponse: Response;
    try {
      reponse = await fetch(this.urlFonction, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.cleAnonyme !== undefined && { Authorization: `Bearer ${this.cleAnonyme}` }),
        },
        body: JSON.stringify({ image_jpeg_base64: imageJpegBase64 }),
      });
    } catch (erreur) {
      throw new Error(
        "L'analyse n'a pas pu joindre le serveur. Vérifier la connexion internet, puis reprendre la photo.",
        { cause: erreur },
      );
    }
    if (!reponse.ok) {
      throw new Error(
        `Le serveur d'analyse a répondu ${reponse.status}. Réessayer dans un instant ; ` +
          "si le problème persiste, poursuivre l'estimation sans analyse.",
      );
    }
    const brut: unknown = await reponse.json();
    // L'edge function renvoie déjà du JSON structuré ; on revalide côté client
    // pour ne jamais afficher une donnée hors schéma.
    const direct = schemaAnalyseBijou.safeParse(brut);
    if (direct.success) {
      return direct.data;
    }
    if (typeof brut === 'object' && brut !== null && 'texte' in brut && typeof brut.texte === 'string') {
      return analyserReponseModele(brut.texte);
    }
    throw new Error("Réponse du serveur d'analyse invalide — reprendre la photo.");
  }
}
