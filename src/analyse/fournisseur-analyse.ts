/**
 * Abstraction du service d'analyse photo : l'UI ne connaît que cette
 * interface. L'implémentation réelle passe par l'edge function serveur
 * (jamais de clé Anthropic dans le client — CLAUDE.md §4).
 */

import type { AnalyseBijou } from '../domaine/analyse.schema';

export interface FournisseurAnalyse {
  nom: string;
  /**
   * Analyse une photo de bijou (JPEG en base64, déjà compressée, sans pièce
   * d'identité dans le cadre). Rejette avec un message actionnable en cas d'échec.
   */
  analyser(imageJpegBase64: string): Promise<AnalyseBijou>;
}
