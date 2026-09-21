# PRD — AP Learner's Licence Practice App

**Doc owner:** Visweswar · **Status:** Draft v2 · **Date:** 21 Sep 2026
**Working title:** *AP Learner's Licence — Practice Test*

---

## Amendments

### A1 — English-only v1 · 21 Sep 2026

**Decision:** v1 ships in English only. Telugu moves to v1.1 as the **first** fast-follow item.

**Why:** The only content in hand is the consolidated English bank (`07-content-assessment.md`).
The AP Telugu PDFs exist, but `aptransport.org` is unreachable from the build environment, and
machine translation is forbidden by §8. This invokes the pre-defined fallback in
`06-Implementation-Plan.md` §10 — *"English-only v1, Telugu v1.1"* — deliberately, with the
paper trail §6 demands, rather than as a quiet drop.

**What it costs, stated honestly:** The primary persona (Ravi, §4) reads Telugu comfortably and
English haltingly. "Genuine Telugu, free" (§3) was a headline differentiator. v1 is a weaker
product for the person it was designed for, and the store listing must not promise Telugu.

**What changes below:** G3 deferred; R2, R3, R7, R12 amended; three launch criteria struck and
two narrowed; §8 and §9 updated. Every edit is marked `[A1]` in place so the original stays
readable. `02-TRD.md`, `03-UIUX-Design.md`, `04-App-Flow.md` and `06-Implementation-Plan.md`
carry matching `[A1]` marks.

**Reversal:** add `"te"` to `languages` in `src/content/content-config.json`, supply the Telugu
content, and every gate re-arms automatically. No code change.

---

## 1. Problem

Getting a Learner's Licence in Andhra Pradesh means passing a computer-based multiple-choice test at the RTO. Candidates fail for a narrow, fixable reason: they have never seen the test format, and the official study material exists only as six plain PDFs on the AP Transport Department website — three topics × two languages — that are hard to find, hard to read on a phone, and impossible to practise against.

The result is a wasted trip to the RTO, a repeat fee, and a lost working day — for a test that is entirely learnable in a few hours of good practice.

Existing apps in this space are pan-India, ad-heavy, visually cluttered, often wrong about AP specifics, and frequently have poor or machine-translated Telugu. None of them are built from the actual AP question bank.

## 2. Solution

A free, offline, bilingual (Telugu + English) app built directly from the **official AP Transport Department LLR question bank**, offering:

- A **mock exam** that reproduces the real test's format, timing and pressure.
- A **learn mode** covering the full official question bank with plain-language explanations of *why* each answer is right.
- A **road signs chart**, **progress tracking**, **bookmarks**, and a **process guide** for the RTO visit itself.

## 3. Why this can win

| Advantage | Why it holds |
|---|---|
| **Built from the official AP bank** | Competitors use generic pan-India question sets. Ours is the actual source material AP draws from. |
| **Genuine Telugu, free** *[A1: v1.1]* | The department publishes Telugu and English versions with matching question numbers. Joining them gives us an officially-sanctioned translation at zero cost and zero translation error. **Deferred to v1.1 — see Amendment A1.** |
| **Fully offline** | Works on a patchy rural connection, in an RTO waiting room, on a bus. No login, no loading spinner. |
| **No ads, no accounts, no tracking** | Faster, calmer, and makes an honest "we collect nothing" privacy claim — rare in this category. |
| **Explanations, not just answers** | Memorising 250 answers fails when wording shifts. Understanding the rule does not. |

## 4. Users

**Primary — Ravi, 18, Guntur.** Just finished 12th. Wants a two-wheeler licence. Owns a ₹10,000 Android phone with 3GB RAM and an unreliable data pack. Reads Telugu comfortably, English haltingly. Nervous about the test; has never sat a computer-based exam. **Needs:** to know exactly what the test looks like, in Telugu, without burning data.

**Secondary — Priya, 24, Vijayawada.** Software support job, English-medium. Wants to drive a car. Time-poor. **Needs:** to cram efficiently in two evenings and know when she's ready.

**Tertiary — Suresh, 41, rural Kurnool.** First smartphone. Low digital literacy. **Needs:** very large text, very obvious buttons, no jargon, nothing that looks like it will charge him money.

**Design consequence:** the app must be usable by Suresh without instruction. That constraint drives the minimalist direction — it is not just an aesthetic preference.

## 5. Goals and non-goals

**Goals**

- G1 — A user averaging ≥80% across their last 5 completed mock tests passes the real test on the first attempt. *(Same predicate as the readiness rule in `05-Data-Schema.md` §5 — one formula, stated identically everywhere.)*
- G2 — From cold install to first question answered in **under 60 seconds**, with no account and no network.
- ~~G3 — Telugu is fully equal to English in coverage and typographic quality.~~ *[A1: deferred to v1.1. The v1 goal in its place: nothing in the codebase makes adding Telugu harder than adding content.]*
- G4 — Ship to both stores as a solo developer within 4 weeks.

**Non-goals for v1 — explicitly out of scope**

- ❌ Accounts, sync, leaderboards, social features
- ❌ Any backend service, analytics pipeline, or hosted database
- ❌ Permanent driving-licence (DL) test prep, or other states
- ❌ **Telugu content** *[A1 — v1.1, first in the fast-follow list. Not a non-goal by choice; see Amendments.]*
- ❌ Hindi (the department publishes it; defer to v1.2)
- ❌ Ads or in-app purchases
- ❌ Video content, live classes, doubt-solving
- ❌ RTO slot booking or any transactional government flow *(regulatory risk — see §9)*

## 6. Requirements

### P0 — must ship in MVP

| ID | Requirement |
|---|---|
| **R1** | Mock exam driven entirely by `exam-config.json`: question count, pass mark, timing model, forward-only navigation, section mix. Changing the file changes the exam; no code edits. |
| **R2** | Complete question bank (~250+ questions across the 3 topics), verified, ~~with Telugu and English~~ **in English** for every question and option. *[A1: Telugu in v1.1. Provenance is the Telangana-published bank pending a diff against AP's PDFs — `07-content-assessment.md` §3.]* |
| **R3** | Plain-language explanation for every question ~~in both languages~~ **in English**. *[A1]* |
| **R4** | Full post-exam review: every question, the user's answer, the correct answer, the explanation. |
| **R5** | Learn mode: browse by topic, flashcard mode, bilingual full-text search. |
| **R6** | Road signs chart — Mandatory / Cautionary / Informatory, searchable, SVG-rendered, with linked questions. |
| **R7** | *[A1: dormant in v1 — with one shipped language the toggle is not rendered. The mechanism is built and re-enables itself when `content-config.json` lists a second language.]* Language switch available from the Home header, Settings and the pre-exam screen — instant, total, persisted. Locked for the duration of an attempt, since switching mid-paper would change the questions under the user. |
| **R8** | On-device progress: attempt history, per-topic accuracy, weak-area practice set. |
| **R9** | Bookmarks from Learn question detail, flashcards, and the post-exam Review. Not during an active exam — the session screen carries no affordance but the primary action. |
| **R10** | Documents & process guide with a `lastVerified` date on every fee and rule. |
| **R11** | Works 100% offline from first launch. No **runtime** permissions requested. (Android's `INTERNET` permission is declared, non-prompting, and required by `expo-updates` — see `02-TRD.md` §11.) |
| **R12** | Full dark mode, designed not inverted; OS dynamic type up to 200% without clipping ~~Telugu~~ *[A1: any script — the Telugu line-heights stay specified for v1.1]*. |
| **R13** | Non-affiliation disclaimer, source attribution, and privacy policy reachable in two taps. |

### P0.5 — should ship, may be cut only by explicit amendment

**R5, R8, R9, R10 and R12** are real MVP scope and appear in the launch criteria. If schedule pressure forces one out, it requires a deliberate PRD amendment *and* removal of the matching launch-criterion checkbox — not a quiet drop. `06-Implementation-Plan.md` §12 lists the cut order.

The two things that are never cuttable: **R1–R4** (the exam engine and the verified ~~bilingual~~ question bank *[A1]*) and **R11** (offline). Those are the product.

### P1 — fast follow (v1.1)

**Telugu — first, see Amendment A1** · Hindi · question difficulty tags and targeted drills · shareable result card · "revise 10 wrong answers" daily nudge (local notification, opt-in) · haptics · tablet layout.

### P2 — later

Permanent DL test prep · other states (Telangana first — shares the Telugu content) · audio read-aloud in Telugu for low-literacy users.

## 7. Success metrics

Because there is no backend, these are measured by **proxy**, not telemetry. Stated honestly:

| Metric | Target | How measured |
|---|---|---|
| Store rating | ≥ 4.5 | Play Console / App Store Connect |
| "Passed on first try" mentions in reviews | ≥ 20 in 90 days | Manual review reading |
| Crash-free sessions | ≥ 99.5% | Play Console vitals / Xcode Organizer (no third-party SDK) |
| Install → 30-day retention | ≥ 15% | Store console aggregate |
| Install size | < 40 MB | Build output |
| Cold start (mid-range Android) | < 2s | Local measurement |

**Deliberate trade-off:** we are giving up product analytics in exchange for a clean privacy story and a simpler build. Accept it or revisit before launch — don't discover it after.

## 8. Content strategy

- **Source of truth:** the AP Transport Department's published question bank (`aptransport.org/html/llr-question-bank.html`) — Road Signs (~94 Q), Rules of Road Regulations (~159 Q), General Driving Principles.
- **Provenance** *[A1]*: the v1 bank is the consolidated English dataset in `pipeline/raw/supplied/`. **No row cites `aptransport.org`** — the rows cite the Telangana-published bank, which AP publishes in the same three parts. The store listing must say exactly that until AP's PDFs have been diffed — `07-content-assessment.md` §3.
- **Bilingual** *[A1: deferred to v1.1 — the plan below stands unchanged for when the Telugu PDFs arrive]:* Telugu and English PDFs are parallel and appear to share question numbering. Join on `(topic, questionNumber)` — but **verify the join, don't trust it**: gate `G-MERGE` checks per-topic count parity and extracts the answer column independently from both languages, and 15 random pairs get a human spot-check. An unverified off-by-one would silently pair the wrong Telugu text to an English question. **Never machine-translate.**
- **Explanations:** written by us, cited to the Motor Vehicles Act 1988 / CMVR 1989 only where the section has been verified on `indiacode.nic.in`. Unverified → no citation.
- **Quality gate:** any question that cannot be extracted cleanly is **quarantined, not shipped**. A 220-question bank we trust beats 260 with 40 wrong keys.
- **Why it matters:** a wrong answer key costs a real person a real fee and a real day off work. This is the app's one unforgivable failure mode.

## 9. Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Store rejection for implied government affiliation** | **High** | Complete Play's Government apps declaration; explicit non-affiliation statement *in the store listing*, not just in-app; cite and link the `gov.in` source; no emblems, no "Official"/"Parivahan"/"Sarathi" in the name. Budget for one rejection cycle. |
| **Telugu PDF text extracts as mojibake** *[A1: not reached — no Telugu source obtained; moves to v1.1]* | ~~High~~ | Automated Telugu-Unicode validation (≥90% chars in U+0C00–U+0C7F); Tesseract `tel` OCR fallback; human-review queue. Resolve before any UI work. |
| **Telugu/English join is silently off-by-one** *[A1: v1.1]* | ~~High~~ | Gate `G-MERGE` + a 15-pair human spot-check at the M1 gate. This is the failure mode that produces confidently wrong content while every other check passes. |
| **Question IDs shift on a pipeline re-run** | Medium | IDs assigned from a content hash via `pipeline/id-map.json`, never from `officialQNo`; gate `G-IDSTABLE`. Otherwise one upstream insertion silently reattaches every user's stats and bookmarks to the wrong questions. |
| **Exam format assumptions wrong** | Medium | Everything in `exam-config.json`; verify at the RTO before launch; ship a visible "format as of \<date\>" note. |
| **Sign images lost in PDF extraction** | Medium | PyMuPDF image extraction, else redraw as SVG from the standard Indian sign set. Missing sign → question quarantined, never a blank. |
| **Official bank changes upstream** | Low | Pipeline records a SHA-256 per source PDF; re-run detects drift; push corrections via EAS Update without a store resubmit. |
| **English-only v1 under-serves the primary persona** *[A1]* | **High** | Accepted knowingly by amendment. Ship Telugu as v1.1 the moment the AP PDFs are obtained. Keep the store listing honest about language. |
| **Telugu clipping at 200% text scale** *[A1: v1.1]* | ~~Medium~~ | Per-role, per-script line heights (`03-UIUX-Design.md` §2 is the authoritative table), multiplied by `PixelRatio.getFontScale()` — RN does **not** scale a numeric `lineHeight` with the OS text setting. Screenshot tests at max scale in CI, verified on a device. |
| **Zero analytics hides real problems** | Medium | Accepted knowingly. Compensate with store vitals and review reading. |

## 10. Launch criteria

Ship only when **all** are true:

- [ ] Every shipped question has 4 options, a valid key, and non-empty verified ~~Telugu **and**~~ English *[A1]*
- ~~[ ] `G-MERGE` passes and 15 random Telugu/English pairs have been checked by a human who reads Telugu~~ *[A1: struck — one language in v1. Restored verbatim for v1.1.]*
- ~~[ ] Telugu-Unicode validation passes on 100% of shipped strings~~ *[A1: struck — restored for v1.1]*
- [ ] Every sign-dependent question renders its sign
- [ ] Airplane-mode test passes on a fresh install, both platforms
- [ ] Exam-engine test suite green (scoring, timer, sampling, no-repeat, forward-only)
- [ ] Screenshot review of every screen × ~~2 languages~~ 1 language *[A1]* × 2 themes
- [ ] 200% dynamic-type pass with no ~~Telugu~~ clipping *[A1]*
- [ ] Cold start < 2s on a real mid-range Android device
- [ ] Privacy policy live; Play Data Safety and Apple App Privacy filled, with the `expo-updates` network call explicitly reasoned about and the reasoning recorded (`02-TRD.md` §11) — not assumed away
- [ ] Government apps declaration submitted; disclaimer present in-app *and* in both listings
- [ ] Exam format personally verified against the real test, and `formatVerifiedOn` set (it ships `null` until then, and the app says so)
- [ ] Ten real AP users have completed a mock test on a physical device without help
