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
| M1 — content pipeline | ⛔ **blocked**: `aptransport.org` unreachable from the build environment |
| M2 — app foundation | not started |

**M1 is blocked and it blocks the product.** The six source PDFs cannot be downloaded
here. See [`docs/00-phase0-exam-format.md` §0](docs/00-phase0-exam-format.md) for the
three ways to unblock it. Until then no question enters the bundle — placeholder content
is never substituted, because a fabricated answer key is this project's one unforgivable
failure.

## What you can run today

```bash
git clone <this repo> && cd app1

npm test                      # gate G-CONFIG + its 22 tests (no install needed)
npm run validate:config       # just the gate, with a readable summary
```

Neither needs `npm install` — both run on Node's built-in test runner against zero
dependencies, so the exam config stays gated even before the app exists.

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
Stages `02`–`06` are written once the real PDFs are in hand — their design depends on the
actual table structure, and writing extraction code against a PDF nobody has opened is
how you get a bank full of confidently wrong answers.

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

## Repository layout

```
docs/                 the seven specs above
pipeline/             Python content pipeline
  sources.json        the six official PDF URLs
  01_download.py      fetch + SHA-256 manifest (with --offline mode)
  raw/                the source PDFs — committed for reproducibility
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
