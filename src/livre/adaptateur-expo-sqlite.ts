/**
 * Adaptateur BaseSql pour expo-sqlite (iOS, Android, web via wasm).
 * API asynchrone uniquement : le pont synchrone n'existe pas sur le web.
 */

import { openDatabaseAsync, type SQLiteBindValue, type SQLiteDatabase } from 'expo-sqlite';
import type { BaseSql } from './base-sql';

export class BaseSqlExpo implements BaseSql {
  private readonly db: Promise<SQLiteDatabase>;

  constructor(nomFichier = 'gemestim.db') {
    this.db = openDatabaseAsync(nomFichier);
  }

  async executerScript(sql: string): Promise<void> {
    await (await this.db).execAsync(sql);
  }

  async executer(sql: string, parametres: readonly unknown[] = []): Promise<void> {
    await (await this.db).runAsync(sql, parametres as SQLiteBindValue[]);
  }

  async lignes<T>(sql: string, parametres: readonly unknown[] = []): Promise<T[]> {
    return (await this.db).getAllAsync<T>(sql, parametres as SQLiteBindValue[]);
  }

  async transaction(travail: () => Promise<void>): Promise<void> {
    await (await this.db).withTransactionAsync(async () => {
      await travail();
    });
  }
}
