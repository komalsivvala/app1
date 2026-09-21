import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NodeSqliteDb } from './node-sqlite-db';
import { DATABASE_VERSION, migrate, currentVersion } from '../migrations';

const TABLES = ['meta', 'attempts', 'attempt_answers', 'question_stats', 'bookmarks'];

async function tableNames(db: NodeSqliteDb): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return rows.map((r) => r.name);
}

test('fresh database migrates 0 -> 1 and creates every table', async () => {
  const db = new NodeSqliteDb();
  assert.equal(await currentVersion(db), 0);
  assert.deepEqual(await migrate(db), { from: 0, to: 1 });
  assert.equal(await currentVersion(db), DATABASE_VERSION);
  assert.deepEqual(await tableNames(db), [...TABLES].sort());
});

test('migrate is idempotent: a second run is 1 -> 1 and loses nothing', async () => {
  const db = new NodeSqliteDb();
  await migrate(db);
  await db.runAsync("INSERT INTO meta (key, value) VALUES ('first_launch_at', '123')");
  assert.deepEqual(await migrate(db), { from: 1, to: 1 });
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'first_launch_at'");
  assert.equal(row?.value, '123');
});

test('a database from a NEWER build is refused, not guessed at', async () => {
  const db = new NodeSqliteDb();
  await db.execAsync('PRAGMA user_version = 99');
  await assert.rejects(() => migrate(db), /user_version 99/);
});

test('foreign_keys is ON for a SECOND connection to the same file (per-connection pragma, not a migration step)', async () => {
  // docs/05-Data-Schema.md §3.1: this is the bug where cascade delete silently
  // stops working after first install. A file-backed DB is needed because
  // :memory: databases cannot be shared between connections.
  const dir = mkdtempSync(join(tmpdir(), 'aplld-'));
  const path = join(dir, 'aplld.db');
  try {
    const first = new NodeSqliteDb(path);
    await migrate(first); // first install: 0 -> 1
    first.close();

    const second = new NodeSqliteDb(path);
    assert.deepEqual(await migrate(second), { from: 1, to: 1 }); // every later launch

    const fk = await second.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
    assert.equal(fk?.foreign_keys, 1, 'foreign_keys must be ON on every connection');

    const { lastInsertRowId } = await second.runAsync(
      `INSERT INTO attempts (mode, language, status, started_at, question_count, seed, config_snapshot, content_version)
       VALUES ('mock','en','abandoned', 1, 20, 's', '{}', '2026.09.1')`,
    );
    await second.runAsync(
      `INSERT INTO attempt_answers (attempt_id, position, question_id, topic, correct_index) VALUES (?, 0, 'rs-001', 'road-signs', 2)`,
      [lastInsertRowId],
    );
    await second.runAsync('DELETE FROM attempts WHERE id = ?', [lastInsertRowId]);
    const orphans = await second.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM attempt_answers');
    assert.equal(orphans?.n, 0, 'deleting an attempt must cascade to its answers');
    second.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('schema constraints reject bad data (CHECKs are real)', async () => {
  const db = new NodeSqliteDb();
  await migrate(db);
  await assert.rejects(
    () => db.runAsync(`INSERT INTO attempts (mode, language, status, started_at, question_count, seed, config_snapshot, content_version)
                       VALUES ('quiz','en','completed', 1, 20, 's', '{}', 'v')`),
    /CHECK/,
  );
  await assert.rejects(
    () => db.runAsync(`INSERT INTO question_stats (question_id, topic, last_result) VALUES ('x','road-signs','skipped')`),
    /CHECK/,
  );
});
