/**
 * Schema v1 — verbatim from docs/05-Data-Schema.md §3.2.
 *
 * Content (questions) lives in the JS bundle, not here. The ONLY link between
 * the two is the stable question ID, which is why IDs are never renumbered.
 * There is deliberately no FK from attempt_answers.question_id to a questions
 * table; dangling IDs after a content update are filtered at read time.
 */

export const DATABASE_NAME = 'aplld.db';

export const SCHEMA_V1 = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Keys: 'content_version_seen', 'first_launch_at'.
-- Language and theme are NOT here — kv-store, read synchronously at boot.

CREATE TABLE IF NOT EXISTS attempts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  mode            TEXT    NOT NULL CHECK (mode IN ('mock','practice')),
  language        TEXT    NOT NULL CHECK (language IN ('en','te')),
  status          TEXT    NOT NULL CHECK (status IN ('in_progress','completed','abandoned')),
  started_at      INTEGER NOT NULL,          -- epoch ms
  finished_at     INTEGER,
  question_count  INTEGER NOT NULL,
  correct_count   INTEGER NOT NULL DEFAULT 0,
  pass_mark       INTEGER,                   -- snapshot; mock only
  passed          INTEGER CHECK (passed IN (0,1)),
  duration_ms     INTEGER,
  timing_reliable INTEGER NOT NULL DEFAULT 1 CHECK (timing_reliable IN (0,1)),
  seed            TEXT    NOT NULL,          -- for bug reports, NOT for resume
  config_snapshot TEXT    NOT NULL,          -- exam-config.json as it was at attempt time
  content_version TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attempts_started ON attempts (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_attempts_status  ON attempts (status);

-- One row per question in the paper, WRITTEN AT ATTEMPT CREATION.
-- This table IS the paper — resume reads it, never re-samples.
CREATE TABLE IF NOT EXISTS attempt_answers (
  attempt_id     INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  position       INTEGER NOT NULL,
  question_id    TEXT    NOT NULL,
  topic          TEXT    NOT NULL,
  correct_index  INTEGER NOT NULL CHECK (correct_index BETWEEN 0 AND 3),
  presented_at   INTEGER,                    -- epoch ms, set when first shown
  selected_index INTEGER CHECK (selected_index BETWEEN 0 AND 3),   -- NULL = not answered
  outcome        TEXT    CHECK (outcome IN ('correct','wrong','timeout','skipped')),
                                             -- NULL = not yet reached
  time_taken_ms  INTEGER,
  PRIMARY KEY (attempt_id, position)
);

CREATE INDEX IF NOT EXISTS idx_answers_question   ON attempt_answers (question_id);
CREATE INDEX IF NOT EXISTS idx_answers_topic_only ON attempt_answers (topic);

CREATE TABLE IF NOT EXISTS question_stats (
  question_id   TEXT    PRIMARY KEY,
  topic         TEXT    NOT NULL,
  seen_count    INTEGER NOT NULL DEFAULT 0,  -- all modes, incl. flashcards
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count   INTEGER NOT NULL DEFAULT 0,
  timeout_count INTEGER NOT NULL DEFAULT 0,  -- ran out of time != didn't know it
  exam_seen     INTEGER NOT NULL DEFAULT 0,  -- mock attempts only
  exam_correct  INTEGER NOT NULL DEFAULT 0,  -- mock attempts only
  last_seen_at  INTEGER,
  last_result   TEXT    CHECK (last_result IN ('correct','wrong','timeout'))
);

CREATE INDEX IF NOT EXISTS idx_stats_topic ON question_stats (topic);
CREATE INDEX IF NOT EXISTS idx_stats_last  ON question_stats (last_result, last_seen_at);

CREATE TABLE IF NOT EXISTS bookmarks (
  question_id TEXT    PRIMARY KEY,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks (created_at DESC);
`;
