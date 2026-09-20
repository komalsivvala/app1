# AP Learner's Licence — Practice Test

An offline, bilingual (తెలుగు / English) practice app for the **Andhra Pradesh Learner's
Licence (LLR) computer test**, built from the question bank published by the AP Transport
Department.

> **This is an unofficial study aid.** It is not affiliated with, endorsed by, or
> connected to the Transport Department, Government of Andhra Pradesh, the Ministry of
> Road Transport & Highways, Parivahan, or Sarathi. Questions are derived from the LLR
> question bank published publicly by the AP Transport Department
> (<https://www.aptransport.org/html/llr-question-bank.html>). Always verify current
> rules, fees and test format on the official portal.

No accounts. No ads. No tracking. No network required — ever.

---

## Status

**Phase 0 complete.** The app itself does not exist yet; it is scaffolded at milestone M2.

| Milestone | State |
|---|---|
| Phase 0 — exam-format research, `exam-config.json`, gate `G-CONFIG` | ✅ done |
| M1 — content pipeline built and tested end-to-end | ✅ done |
| M1 — content **shippable** | ⛔ **blocked: the supplied dataset has no Telugu** |
| M2 — app foundation | not started |

**The pipeline works; the content is one language short.** 277 questions ingest cleanly,
every answer key is valid, every topic clears 3× its `sectionMix` slot — and there are
**zero Telugu characters** in the entire dataset. Bilingual content is never-cuttable
(`01-PRD.md` §6), so the gates fail and nothing ships:

```
$ .venv/bin/python pipeline/05_validate.py
[FAIL] G-BILINGUAL  277 violations — no Telugu for: text, option1..4
  TOTAL   0 of 277 shippable

$ .venv/bin/python pipeline/05_validate.py --allow-english-only
  TOTAL 277 of 277 shippable    quarantined: 0
```

**Read [`docs/07-content-assessment.md`](docs/07-content-assessment.md) before doing
anything else** — it has the five open decisions, including a department-confirmed format
for Telangana that contradicts our timing model.

## What you can run today

```bash
git clone <this repo> && cd app1

npm test                      # gate G-CONFIG + its 22 tests (no install needed)
npm run validate:config       # just the gate, with a readable summary
```

Neither needs `npm install` — both run on Node's built-in test runner against zero
dependencies, so the exam config stays gated even before the app exists.

The content pipeline needs Python:

```bash
python3 -m venv .venv && .venv/bin/pip install -r pipeline/requirements.txt

.venv/bin/python pipeline/test_pipeline.py          # 21 tests, incl. ID stability
npm run content:ingest                              # CSV -> canonical records
npm run content:validate                            # every gate from 02-TRD.md §4
```

```
$ npm run validate:config
G-CONFIG PASS — 20 questions, 12 to pass (60%), per-question,
  UNVERIFIED (formatVerifiedOn: null — app must say so on the pre-exam screen)
```

## Changing the exam format

Everything about the mock exam lives in **`src/content/exam-config.json`**. Question
count, pass mark, timing model, forward-only navigation, topic mix. Change that file and
the exam changes — there is no code to edit.

```bash
$EDITOR src/content/exam-config.json
npm run validate:config        # fails loudly if the edit is internally inconsistent
```

The current values are **unverified guesses**, and sources disagree — notably on whether
the pass bar is 60% or 80%. `formatVerifiedOn` ships `null`, and while it is null the app
must tell the user the format is unconfirmed. `docs/00-phase0-exam-format.md` §3 is a
ten-item checklist to take to the RTO that resolves every one of them.

## Content pipeline

```bash
pip install -r pipeline/requirements.txt

python3 pipeline/01_download.py            # fetch the six PDFs + SHA-256 manifest
python3 pipeline/01_download.py --offline  # or hash PDFs you placed in pipeline/raw/
```

`--offline` is the escape hatch for networks that block `aptransport.org`: download the
six by hand, drop them in `pipeline/raw/`, and every downstream stage behaves identically.

The stages that exist today read the **consolidated CSV** in `pipeline/raw/supplied/`,
since that is how the bank actually arrived:

```
02_ingest_csv.py  CSV -> canonical records (Telugu recorded as absent, never invented)
05_validate.py    the gates from 02-TRD.md §4; quarantines to reports/needs_review.json
06_emit.py        stable IDs via id-map.json; refuses to emit a monolingual bundle
```

`02_extract.py` (PDF tables) and `04_merge.py` (the Telugu↔English join) are written when
the official PDFs arrive — their design depends on the real table structure, and writing
extraction code against a PDF nobody has opened is how a bank fills with confidently wrong
answers.

## Documentation

| Doc | What it holds |
|---|---|
| [`docs/00-phase0-exam-format.md`](docs/00-phase0-exam-format.md) | **Start here.** Format research, the access blocker, the RTO checklist, the assumptions ledger |
| [`docs/01-PRD.md`](docs/01-PRD.md) | Problem, users, requirements, launch criteria |
| [`docs/02-TRD.md`](docs/02-TRD.md) | Stack, pipeline gates, exam engine, performance budgets |
| [`docs/03-UIUX-Design.md`](docs/03-UIUX-Design.md) | Tokens, typography (**authoritative line-height table**), screens, a11y |
| [`docs/04-App-Flow.md`](docs/04-App-Flow.md) | Navigation, exam state machine, edge cases |
| [`docs/05-Data-Schema.md`](docs/05-Data-Schema.md) | Content schema, SQLite schema, key queries, migrations |
| [`docs/06-Implementation-Plan.md`](docs/06-Implementation-Plan.md) | Milestones, gates, risk register, cut order |
| [`docs/07-content-assessment.md`](docs/07-content-assessment.md) | **What the supplied dataset is and is not.** Five open decisions |

## Repository layout

```
docs/                 the seven specs above
pipeline/             Python content pipeline
  sources.json        the six official PDF URLs
  lib_content.py      normalisation, category->topic map, Telugu ratio, content hash
  01_download.py      fetch + SHA-256 manifest (with --offline mode)
  02_ingest_csv.py    consolidated CSV -> canonical records
  05_validate.py      the content gates
  06_emit.py          stable IDs + bundle
  test_pipeline.py    21 tests, incl. the ID-stability property
  id-map.json         content hash -> stable ID. COMMITTED. Never hand-edit
  raw/                source PDFs + supplied/ CSVs — committed for reproducibility
  reports/            validation output, human-review queues
scripts/
  validate-exam-config.mjs   gate G-CONFIG (zero deps)
  __tests__/                 its 22 tests
src/content/
  exam-config.json           the single source of exam-format truth
  exam-config.schema.json    its JSON Schema
```

`src/`, `app/` and the Expo project are filled in at M2, per `docs/02-TRD.md` §3.

## Before you build for the stores

Two things gate the timeline and neither is code — start both on day 0:

- **Google Play** — register as an **organization**, not a personal account. Personal
  accounts created after 13 Nov 2023 must run a 14-day closed test with 12 testers before
  they may publish. Organization accounts are exempt. Needs a D-U-N-S number.
- **Apple Developer Program** — enrol immediately; organization enrolments routinely take
  weeks. Also needs the D-U-N-S number.

See `docs/06-Implementation-Plan.md` §0.
