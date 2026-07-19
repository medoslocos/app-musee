/**
 * Interface minimale d'accès SQLite, pour brancher :
 * - expo-sqlite dans l'app (iOS / Android / web via wasm) — API asynchrone,
 *   la seule disponible sur toutes les plateformes ;
 * - better-sqlite3 dans les tests Node — les tests d'intégration du livre de
 *   police s'exécutent ainsi contre un VRAI moteur SQLite (mêmes DDL, mêmes
 *   triggers) sans dépendre du runtime React Native.
 */

export interface BaseSql {
  /** Exécute un lot d'instructions (DDL, triggers). */
  executerScript(sql: string): Promise<void>;
  /** Exécute une instruction paramétrée sans résultat. */
  executer(sql: string, parametres?: readonly unknown[]): Promise<void>;
  /** Retourne toutes les lignes d'une requête paramétrée. */
  lignes<T>(sql: string, parametres?: readonly unknown[]): Promise<T[]>;
  /** Exécute `travail` dans une transaction (rollback si exception). */
  transaction(travail: () => Promise<void>): Promise<void>;
}

/** Hachage SHA-256 → hexadécimal minuscule (js-sha256 dans l'app, node:crypto en test). */
export type Hacheur = (texte: string) => string;
