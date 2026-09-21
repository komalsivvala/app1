/**
 * Forward-only, additive migrations keyed on PRAGMA user_version.
 * docs/05-Data-Schema.md §6.
 */
import { SCHEMA_V1 } from './schema';
import type { Db } from './types';

export const DATABASE_VERSION = 1;

/**
 * Per-connection pragmas. NOT a migration step.
 *
 * `foreign_keys` is a per-connection setting that defaults OFF and is not
 * stored in the file. Put it inside the `v === 0` block and it runs on first
 * install and never again — after which ON DELETE CASCADE silently stops
 * working and deleting an attempt orphans its answer rows. So it runs on every
 * connection, before the version check. (`journal_mode = WAL` is persistent,
 * so it is harmless either way; kept together for clarity.)
 */
export async function applyConnectionPragmas(db: Db): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
}

export async function currentVersion(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  return row?.user_version ?? 0;
}

export async function migrate(db: Db): Promise<{ from: number; to: number }> {
  await applyConnectionPragmas(db);

  const from = await currentVersion(db);
  let v = from;

  if (v === 0) {
    await db.execAsync(SCHEMA_V1);
    v = 1;
  }
  // if (v === 1) { await db.execAsync(MIGRATION_V2); v = 2; }

  if (v !== DATABASE_VERSION) {
    // A file written by a NEWER build than this one. Refuse rather than guess.
    throw new Error(`database is at user_version ${v} but this build understands ${DATABASE_VERSION}`);
  }
  await db.execAsync(`PRAGMA user_version = ${v}`);
  return { from, to: v };
}
