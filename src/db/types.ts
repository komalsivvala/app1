/**
 * The slice of expo-sqlite's SQLiteDatabase that this app's data layer uses.
 *
 * Every migration and query is written against THIS interface rather than
 * against expo-sqlite directly, for one reason: the SQL is the artefact worth
 * testing, and expo-sqlite cannot run in Node. Tests satisfy this interface
 * with a thin adapter over `node:sqlite` (real SQLite, zero dependencies), so
 * the DDL, the cascade behaviour and every query in docs/05-Data-Schema.md §5
 * are executed for real on every CI run — not mocked.
 *
 * Method names and shapes mirror expo-sqlite's async API on purpose, so the
 * production SQLiteDatabase satisfies `Db` structurally with no adapter.
 */

export type BindValue = string | number | boolean | null | Uint8Array;

export interface RunResult {
  readonly lastInsertRowId: number;
  readonly changes: number;
}

export interface Db {
  /** Execute one or more statements; no results. Used for DDL and pragmas. */
  execAsync(sql: string): Promise<void>;
  /** `params` is required (pass `[]`) so the production SQLiteDatabase — whose
   *  overloads take a non-optional array — satisfies this interface structurally. */
  runAsync(sql: string, params: BindValue[]): Promise<RunResult>;
  getFirstAsync<T>(sql: string, params: BindValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params: BindValue[]): Promise<T[]>;
  /** Runs `task` inside BEGIN/COMMIT, rolling back if it throws. */
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
