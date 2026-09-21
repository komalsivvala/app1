/**
 * `Db` over Node's built-in SQLite. Test-only. Real SQLite, zero dependencies.
 * The production implementation is expo-sqlite's SQLiteDatabase, which
 * satisfies `Db` structurally.
 */
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { BindValue, Db, RunResult } from '../types';

/** SQLite has no boolean; expo-sqlite binds true/false as 1/0 and so do we. */
const bind = (params: BindValue[]): SQLInputValue[] => params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));

export class NodeSqliteDb implements Db {
  readonly raw: DatabaseSync;

  constructor(path = ':memory:') {
    this.raw = new DatabaseSync(path);
  }

  async execAsync(sql: string): Promise<void> {
    this.raw.exec(sql);
  }

  async runAsync(sql: string, params: BindValue[] = []): Promise<RunResult> {
    const r = this.raw.prepare(sql).run(...bind(params));
    return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
  }

  async getFirstAsync<T>(sql: string, params: BindValue[] = []): Promise<T | null> {
    const row = this.raw.prepare(sql).get(...bind(params));
    return row === undefined ? null : ({ ...row } as T);
  }

  async getAllAsync<T>(sql: string, params: BindValue[] = []): Promise<T[]> {
    return this.raw.prepare(sql).all(...bind(params)).map((row) => ({ ...row }) as T);
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.raw.exec('BEGIN');
    try {
      await task();
      this.raw.exec('COMMIT');
    } catch (e) {
      this.raw.exec('ROLLBACK');
      throw e;
    }
  }

  close(): void {
    this.raw.close();
  }
}
