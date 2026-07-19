/**
 * Aides de test F3 : adaptateur better-sqlite3 (vrai moteur SQLite en Node)
 * et fabrique de dépôt avec dépendances déterministes.
 */

import Database from 'better-sqlite3';
import { createHash, randomBytes } from 'node:crypto';
import type { BaseSql } from '../base-sql';
import { ChiffreurAes } from '../chiffrement';
import { Depot } from '../depot';
import { calculerEstimation } from '../../domaine/calcul-estimation';
import { titreParCode } from '../../domaine/metaux';

export class BaseSqlNode implements BaseSql {
  readonly db: Database.Database;

  constructor() {
    this.db = new Database(':memory:');
  }

  async executerScript(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  async executer(sql: string, parametres: readonly unknown[] = []): Promise<void> {
    this.db.prepare(sql).run(...parametres);
  }

  async lignes<T>(sql: string, parametres: readonly unknown[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...parametres) as T[];
  }

  async transaction(travail: () => Promise<void>): Promise<void> {
    this.db.exec('BEGIN');
    try {
      await travail();
      this.db.exec('COMMIT');
    } catch (erreur) {
      this.db.exec('ROLLBACK');
      throw erreur;
    }
  }

  /** Accès direct pour les tests de falsification (contourne l'interface). */
  executerBrut(sql: string, parametres: readonly unknown[] = []): void {
    this.db.prepare(sql).run(...parametres);
  }

  executerScriptBrut(sql: string): void {
    this.db.exec(sql);
  }
}

export const CLE_TEST_HEX = 'a'.repeat(64);

export async function creerDepotDeTest(surcharges: { hacher?: (texte: string) => string } = {}): Promise<{
  depot: Depot;
  base: BaseSqlNode;
}> {
  const base = new BaseSqlNode();
  let compteurId = 0;
  const depot = new Depot({
    base,
    hacher: surcharges.hacher ?? ((texte) => createHash('sha256').update(texte).digest('hex')),
    chiffreur: new ChiffreurAes(CLE_TEST_HEX, () => Uint8Array.from(randomBytes(16))),
    horloge: () => '2026-07-19T14:00:00.000Z',
    genererId: () => `estimation-${++compteurId}`,
  });
  await depot.initialiser();
  return { depot, base };
}

export function estimationDeTest(depot: Depot, description = 'Chaîne maille gourmette or jaune'): Promise<string> {
  const resultat = calculerEstimation({
    poids: '12,4',
    titre: titreParCode('or-18k'),
    coursCentimesParGramme: 6800,
    marge: { mode: 'pourcentage', pourMille: 150 },
  });
  return depot.enregistrerEstimation(resultat, description);
}

export const IDENTITE_TEST = {
  nom: 'Martin Dupont',
  adresse: '12 rue des Orfèvres, 75003 Paris',
  typePiece: 'CNI',
  numeroPiece: 'X12AB34567',
} as const;
