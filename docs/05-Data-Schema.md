# Data Schema — AP Learner's Licence Practice App

**Status:** Draft v2 · **Date:** 21 Sep 2026

> There is no server, so "backend schema" here means the two on-device data layers. §7 sketches what a backend *would* look like if you ever add one — read it as a deliberate deferral, not a plan.
>
> **The DDL in §3 and every query in §5 has been executed against SQLite and verified to run, including the cascade-delete behaviour.** The illustrative sketch in §7 has not — it is prose, not runnable SQL.

---

## 1. The two layers

| | **Content** | **User state** |
|---|---|---|
| Mutability | Read-only | Read-write |
| Lives in | JS bundle (`src/content/questions.ts`) | SQLite (`aplld.db`) |
| Updated by | App release or EAS Update | The user, continuously |
| Lost on reinstall | Re-shipped | Yes — acceptable, no accounts |
| Source of truth | AP Transport Dept PDFs | The device |

Plus a third, tiny layer: **kv-store** (`expo-sqlite/kv-store`) holds language and theme only, because those must be read *synchronously at boot*, before SQLite opens, to avoid a flash of the wrong language.

Content and user state never mix. The only link between them is the **stable question ID** — which is why IDs must never be renumbered across content versions (see §2.2).

## 2. Content schema

```ts
type TopicId = 'road-signs' | 'rules-of-road-regulations' | 'general-driving-principles';
type Lang = 'en' | 'te';
type Localized = Record<Lang, string>;

interface Question {
  id: string;                 // 'rs-001' | 'rrr-014' | 'gdp-032' — STABLE FOREVER
  topic: TopicId;
  officialQNo: number;        // provenance only — NEVER the basis for the ID
  signId: string | null;      // key into the sign registry
  text: Localized;
  options: [Localized, Localized, Localized, Localized];
  answerIndex: 0 | 1 | 2 | 3; // 0-based; source PDF is 1-based — convert once, at emit
  explanation: Localized;
  legalRef: string | null;    // null unless verified on indiacode.nic.in
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

interface Sign {
  id: string;                 // 'mandatory-no-entry'
  category: 'mandatory' | 'cautionary' | 'informatory';
  name: Localized;
  meaning: Localized;
}

interface ContentBundle {
  schemaVersion: 1;
  contentVersion: string;     // '2026.09.1'
  sourceAttribution: string;
  sourceUrl: string;          // https://www.aptransport.org/html/llr-question-bank.html
  sourceChecksums: Record<string, string>;  // filename → sha256 of the PDF it came from
  generatedAt: string;
  questions: Question[];
  signs: Sign[];
}
```

### 2.1 Sign artwork is a component registry, not a path string

`react-native-svg-transformer` converts a **static** `import` into a React component at Metro build time. A runtime path string cannot be resolved into a component, so `Sign` deliberately carries no `svg` field. Instead `06_emit.py` generates:

```ts
// src/content/signs/index.ts — GENERATED, DO NOT EDIT
import MandatoryNoEntry from './mandatory-no-entry.svg';
import CautionaryRoundabout from './cautionary-roundabout.svg';
// …

export const SIGN_ART: Record<string, React.FC<SvgProps>> = {
  'mandatory-no-entry': MandatoryNoEntry,
  'cautionary-roundabout': CautionaryRoundabout,
  // …
};
```

Components look artwork up by `signId`. A missing key is a build-time failure, not a blank box at runtime.

### 2.2 Stable IDs — the mechanism, not just the promise

IDs must survive every pipeline re-run, because `question_stats` and `bookmarks` reference them. Assigning IDs from `officialQNo` **does not achieve this**: if the department inserts one question upstream, every later number shifts and every user's history silently attaches to the wrong question.

The pipeline therefore commits `pipeline/id-map.json`:

```jsonc
{ "<sha256 of normalised English text + topic>": "rrr-014", ... }
```

`06_emit.py` looks each extracted question up by content hash, reuses the mapped ID, and mints a new one **only** for unmatched questions. Retired IDs are never reused. Gate `G-IDSTABLE` fails the build if a previously-mapped ID disappears without being explicitly retired in the map.

| Prefix | Topic |
|---|---|
| `rs-` | Road Signs |
| `rrr-` | Rules of Road Regulations |
| `gdp-` | General Driving Principles |

### 2.3 `exam-config.json`

```jsonc
{
  "questionCount": 20,
  "passMark": 12,
  "timing": { "mode": "per-question", "secondsPerQuestion": 30, "totalSeconds": null },
  "allowBackNavigation": false,
  "allowSkip": false,
  "negativeMark": 0,          // marks deducted per wrong answer; 0 = no negative marking
  "sectionMix": {
    "road-signs": 8,
    "rules-of-road-regulations": 7,
    "general-driving-principles": 5
  },
  "formatVerifiedOn": null    // string | null — null until confirmed at an RTO
}
```

`sectionMix` must sum to `questionCount`, and every topic must have enough shippable questions to fill its slot — both asserted in the content test suite (gates `G-MIX`, see `02-TRD.md` §4).

**`formatVerifiedOn` is nullable on purpose.** Until someone has sat the real test, the app must not print "Format as of 21 Sep 2026" — that would assert a verification that never happened. While null, the pre-exam screen reads *"This format hasn't been confirmed at an RTO yet — check locally."*

## 3. User-state schema (SQLite)

### 3.1 Connection pragmas — run these on every connection

```ts
// In SQLiteProvider's onInit, BEFORE the version check.
await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
```

**This is not a migration step.** `foreign_keys` is a *per-connection* setting that defaults OFF and is not stored in the file. Putting it inside a `v === 0` migration block means it runs on first install and never again — after which `ON DELETE CASCADE` silently stops working and deleting an attempt orphans its answer rows. (`journal_mode = WAL` *is* persistent, so it's harmless either way, but keep them together.)

### 3.2 Schema v1

```sql
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Keys: 'content_version_seen', 'first_launch_at'.
-- Language and theme are NOT here — see §1 (kv-store, synchronous boot read).

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
  timeout_count INTEGER NOT NULL DEFAULT 0,  -- ran out of time ≠ didn't know it
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
```

## 4. Design notes worth defending

- **`attempt_answers` is written at attempt creation, not at scoring.** This is what makes resume work: the paper is a database fact, not something re-derived. Re-sampling from `seed` would only reproduce the same paper if `question_stats` were byte-identical — and flashcard or practice use between abandoning and resuming mutates exactly that table. `seed` is kept for reproducing a paper in a bug report, not for resume.
- **`outcome` is an enum, not a boolean.** With a 30-second per-question timer, running out of time will be common, and it is not the same as answering wrongly. A boolean `is_correct` would conflate them and wrongly boost timed-out questions in weak-area sampling. It also gives NULL a clear meaning: not yet reached.
- **`presented_at` per row** is what makes `timing.mode: "per-question"` implementable. An attempt-level `started_at` alone cannot express a per-question deadline.
- **`exam_seen` / `exam_correct` separate from the all-modes counts, and actually used** — the weak-area query in §5 reads the exam columns, so flashcard self-assessment ("I knew that") informs the *display* of progress but never pollutes weak-area targeting.
- **`config_snapshot` per attempt.** When the exam format is corrected after the RTO visit, old attempts stay interpretable rather than being silently rescored against new rules.
- **`timing_reliable`** handles the device-clock-changed edge case: flag the attempt rather than score it wrongly.
- **No FK from `attempt_answers.question_id` to a questions table** — questions live in the JS bundle. Dangling IDs after a content update are filtered at read time.
- **Denormalised `topic`** avoids a bundle lookup per row in aggregates. Worth the redundancy at this size.
- **No `bookmarks.note`.** No screen lets a user write one, so the column would be dead weight. Add it when a UI needs it.

## 5. Key queries — all verified to run

**Per-topic accuracy** — completed mock attempts only

```sql
SELECT aa.topic,
       COUNT(*)                                          AS answered,
       SUM(aa.outcome = 'correct')                       AS correct,
       ROUND(100.0 * SUM(aa.outcome = 'correct') / COUNT(*), 1) AS pct
FROM attempt_answers aa
JOIN attempts a ON a.id = aa.attempt_id
WHERE a.status = 'completed' AND a.mode = 'mock' AND aa.outcome IS NOT NULL
GROUP BY aa.topic;
```

The join matters: without it, abandoned attempts and untimed practice sessions feed the Progress screen's accuracy bars and make them meaningless. `idx_answers_topic_only` serves the `GROUP BY` — the composite `(attempt_id, topic)` index cannot, because `attempt_id` leads.

**Weak-area priority** — feeds `selection.ts` sampling weights

```sql
SELECT question_id, topic,
       CASE WHEN exam_seen = 0                                        THEN 4
            WHEN last_result = 'wrong'                                THEN 3
            WHEN CAST(exam_correct AS REAL) / NULLIF(exam_seen,0) < 0.6 THEN 2
            ELSE 1 END AS weight
FROM question_stats
ORDER BY weight DESC, last_seen_at ASC;
```

Questions absent from `question_stats` entirely are also weight 4 — the engine unions the bundle's full ID list against this table. Note `last_result = 'timeout'` deliberately does **not** score weight 3; a timeout falls through to the accuracy test.

**Resume an interrupted attempt** — reads the paper, never re-samples

```sql
SELECT id, started_at, question_count, config_snapshot
FROM attempts WHERE status = 'in_progress'
ORDER BY started_at DESC LIMIT 1;

SELECT position, question_id, topic, correct_index,
       presented_at, selected_index, outcome
FROM attempt_answers WHERE attempt_id = ? ORDER BY position;
```

**Readiness input** — last 5 completed mocks

```sql
SELECT id, correct_count, question_count, passed,
       ROUND(100.0 * correct_count / question_count, 1) AS pct
FROM attempts
WHERE mode = 'mock' AND status = 'completed'
ORDER BY started_at DESC
LIMIT 5;
```

**Readiness rule** — one predicate, used identically in the PRD, the UI and the code:

```
ready = count(last 5 completed mocks) >= 5  AND  mean(pct of those 5) >= 80
```

UI copy states only what the numbers say: *"The real test needs 12 of 20. You're averaging 78% across your last 5 tests."* No likelihood-of-passing figure — we have no data supporting one.

## 6. Migrations

`PRAGMA user_version`, applied in `SQLiteProvider`'s `onInit`:

```ts
const DATABASE_VERSION = 1;

async function migrate(db: SQLiteDatabase) {
  // Per-connection pragmas FIRST, every launch, outside the version check.
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let v = row?.user_version ?? 0;

  if (v === 0) {
    await db.execAsync(SCHEMA_V1);          // the DDL in §3.2
    v = 1;
  }
  // if (v === 1) { await db.execAsync(MIGRATION_V2); v = 2; }

  await db.execAsync(`PRAGMA user_version = ${v}`);
}
```

Rules: migrations are **forward-only and additive**. Never drop a column holding user history. Every migration gets a test that runs it from each prior version against a populated database — a migration that silently wipes attempt history is indistinguishable, to the user, from losing their progress.

## 7. If you ever add a backend — what it would look like

Deliberately **not** in v1. Documented so the decision is revisited consciously rather than drifted into.

**Triggers that would justify it:** cross-device sync requested by real users; a need for real usage analytics; user-submitted question corrections; other states requiring separate content delivery.

**Minimum shape** — illustrative, not runnable:

```text
users            id, created_at, anon
device_links     user_id, device_id, last_sync_at
attempts_sync    (as local) + user_id, device_id, synced_at
question_reports id, question_id, reporter_device, reason, status, created_at
content_releases version, published_at, manifest_url, checksum
```

**What it would cost you:** a privacy policy that can no longer say "no data collected"; Play Data Safety and Apple App Privacy both become substantive disclosures; auth, sync-conflict resolution, DPDP/GDPR deletion flows, and an operational burden you don't have today.

**The honest read:** the only trigger that genuinely needs a server is cross-device sync, and almost nobody studies for a learner's licence on two devices. `question_reports` is the tempting one — but a `mailto:` link on the About screen solves it for v1 at zero infrastructure cost. Start there.
