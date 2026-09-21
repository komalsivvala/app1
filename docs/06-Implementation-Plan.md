# Implementation Plan — AP Learner's Licence Practice App

**Setup:** Solo developer + Claude Code · **Target:** ~4 weeks to submission
**Status:** Draft v2 · **Date:** 21 Sep 2026

> **[A1 — English-only v1, 21 Sep 2026]** Telugu is deferred to v1.1 by PRD Amendment A1. Edits below are marked `[A1]`; the Telugu specification is retained verbatim for v1.1, not deleted.

---

## 0. Read this before anything else

### The critical path is store accounts, not code

You can write this app in three weeks. You cannot make Apple and Google move faster. Both of these must be started **on day 0, before a single line of code**:

**Google Play — register as an organization, not a personal account.**

Google requires personal developer accounts created after 13 Nov 2023 to run a **closed test with 12 testers continuously opted in for 14 days** before they can publish to production. **Organization accounts are exempt.** You have a registered company (Vensai) — register the Play Console account under it and you skip that requirement entirely. Registering personal adds a minimum of two weeks to your launch and makes you recruit a dozen people who keep the app installed daily.

Organization registration needs a D-U-N-S number. It's free, but D&B's standard turnaround runs from a few business days to around a month — Apple's own guidance says allow up to five business days when requesting one through their lookup tool. Treat it as weeks, not days, and start today. If Vensai already has one, you're ahead.

**Apple — enrol immediately and expect it to be slow.** Apple Developer Program enrolment is routine for most people but developer-forum reports of organization enrolments stuck for two to six weeks are common. Organization enrolment also needs the D-U-N-S number.

**Do both today.** Everything else in this plan can run while they process.

### The second constraint: day 2 decides the project

Telugu PDF extraction either works or it doesn't. If it produces mojibake and OCR also struggles, the entire content strategy changes and the timeline moves. Find that out on **day 2**, not week 3. This is why the pipeline is first and the UI is second, even though the UI is more fun.

---

## 1. Milestones

| # | Milestone | Days | Gate to pass |
|---|---|---|---|
| **M0** | Store accounts + repo | 0 | Both enrolments submitted; repo + CI green |
| **M1** | Content pipeline | 1–4 | All nine validation gates pass; Telugu verified real and spot-checked |
| **M2** | App foundation | 5–7 | Navigation, theming, i18n, fonts; Telugu renders correctly on device |
| **M3** | Mock exam | 8–12 | Full exam end-to-end, scored, persisted, reviewable |
| **M4** | Learn + Signs | 13–16 | Browse, search, flashcards, sign chart |
| **M5** | Progress + Guide | 17–19 | Stats, weak areas, bookmarks, process guide |
| **M6** | Explanations + polish | 20–23 | Every question explained; a11y and perf budgets met |
| **M7** | Store submission | 24–28 | Both stores submitted |

---

## 2. M0 — Day 0

- [ ] Apply for a D-U-N-S number if Vensai doesn't have one — **do this first, everything else queues behind it**
- [ ] Start Google Play Console **organization** registration
- [ ] Start Apple Developer Program **organization** enrolment
- [ ] Decide the app name — avoid "Official", "Govt", "RTO", "Parivahan", "Sarathi". Working title: *AP Learner's Licence — Practice Test*
- [ ] Repo, Expo SDK 57 + TypeScript strict, ESLint/Prettier, GitHub Actions (typecheck → lint → test)
- [ ] EAS project; `preview` and `production` channels
- [ ] Commit these six docs into `docs/`

## 3. M1 — Content pipeline · Days 1–4

**This milestone is the product.** Everything downstream is presentation.

**Day 1 — extract**
- [ ] `01_download.py` — fetch all six PDFs, record SHA-256 per file
- [ ] `02_extract.py` — pdfplumber table extraction → raw JSON per (topic, language)
- [ ] Eyeball the English output against the PDF by hand for 10 questions

**Day 2 — the Telugu gate 🚨** *[A1: not reached — no Telugu source obtained. Re-runs at v1.1.]*
- [ ] Run `G-TELUGU`: ≥90% of characters in each Telugu string inside U+0C00–U+0C7F
- [ ] **If it fails:** Tesseract `tel` OCR fallback, then a human-review queue
- [ ] **If OCR also fails:** stop and reassess. Options are manual transcription of ~250 questions, or English-only v1 with Telugu in v1.1. Do not proceed on the assumption it'll be fine later.
- [ ] Render a sample of extracted Telugu on a real device before declaring this passed — validation that passes in a terminal can still render wrong on Android

**Day 3 — signs and merge**
- [ ] `03_extract_signs.py` — PyMuPDF image extraction keyed to question number
- [x] Redraw as SVG anything that extracts poorly, against the standard Indian sign set *(all 68 — nothing could be extracted; `pipeline/03_draw_signs.py` composes them from frames + pictogram primitives; contact sheets in `docs/screenshots/signs-*.png`)*
- [ ] `04_merge.py` — join Telugu ↔ English on `(topic, officialQNo)`
- [ ] Assign stable IDs (`rs-###`, `rrr-###`, `gdp-###`) from a **content hash**, never from `officialQNo` — see `05-Data-Schema.md` §2.2

**Day 4 — validate and emit**
- [ ] `05_validate.py` — all nine gates (`02-TRD.md` §4); quarantine failures to `reports/needs_review.json`
- [ ] `pipeline/id-map.json` — content-hash → stable ID, committed (gate `G-IDSTABLE`)
- [ ] Record the General Driving Principles question count — `G-MIX` needs it, and no source has told us yet
- [ ] Sentence-case the English, preserving RTO / LMV / HMV / MV Act / KMPH / CC / NH
- [ ] `06_emit.py` → `src/content/questions.ts` + `src/content/signs/*.svg`
- [ ] Golden-file snapshots
- [ ] Jest content suite re-asserting every gate against the emitted bundle

**Gate:** all gates pass · Telugu confirmed real on a device · **15 random Telugu/English pairs checked by a human who reads Telugu** · quarantine list reviewed and understood · per-topic counts known and each ≥ its `sectionMix` slot.

## 4. M2 — App foundation · Days 5–7

- [x] Expo Router: 4 tabs + exam stack + modal routes
- [x] `design/tokens.ts` from the UI/UX spec — exact hex values, both themes *(every pair, on-bg and on-fill, asserted ≥ AA in CI; the spec's printed ratios reproduced to 2 dp)*
- [x] `typography.ts` implementing `lineHeightFor(role, script, size, fontScale)` — numbers from `03-UIUX-Design.md` §2, **multiplied by the live font scale** *(the parameter is required, not defaulted, so forgetting it is a compile error)*
- [x] Bundle ~~Noto Sans Telugu +~~ Inter via `expo-font` *[A1]*
- [x] i18n: `en.json` ~~/ `te.json`~~ *[A1]*, `expo-localization` detection, kv-store persistence read synchronously at boot
- [x] CI check: i18n key parity (`G-I18N`) + no hardcoded user-facing strings (`react/jsx-no-literals` as an error)
- [x] SQLite: `SQLiteProvider`, `migrate()`, schema v1, migration test *(against real SQLite; includes the second-connection `foreign_keys` case from `05-Data-Schema.md` §3.1)*
- [x] First-launch language sheet *(built; skipped while one language ships)*; Home shell
- [ ] **Build to a real mid-range Android device and inspect text at 100% and 200% text scale** — *not done: no device in the build environment. Web screenshot matrix captured instead (`docs/screenshots/`). This gate stays open.*

**Gate:** Telugu renders correctly at both scales on physical hardware. Not in a simulator.

## 5. M3 — Mock exam · Days 8–12

- [x] `examEngine.ts` — pure, no React: sampling, scoring, timing *(as `src/engine/{selection,scoring,timing,clock,session}.ts`; the session is a pure reducer that returns state + persistence effects)*
- [x] `selection.ts` — `sectionMix` + weak-area weighting, seeded RNG *(mulberry32 over an FNV-1a hash of the seed)*
- [x] Unit tests: scoring, pass threshold, timer expiry, no-repeat-within-paper, `sectionMix` exactness, deterministic seeding *(48 engine tests, plus a statistical test that never-seen questions are drawn ≈4× as often as mastered ones)*
- [x] Pre-exam screen reading rules from `exam-config.json`
- [x] Exam session screen — `OptionRow`, isolated `ExamTimer` leaf, progress pill
- [x] Forward-only: disable hardware back, swipe-back, header back; exit confirm dialog *(`beforeRemove` intercepts every route out; Discard abandons the attempt)*
- [x] Clock-change detection → `timing_reliable = 0` *(monotonic vs wall clock, 2 s tolerance, latches; time continues from the monotonic source)*
- [x] Write the `attempts` row **and all N `attempt_answers` rows** at attempt creation — the paper is a DB fact, not a re-derivation from `seed` *(one transaction; a bad row rolls back the whole attempt — tested)*
- [x] Per-question `presented_at`; mode-specific background rules (`04-App-Flow.md` §3) *(the real test keeps advancing while you are away: k = ⌊elapsed / perQuestion⌋ questions time out in order; whole-paper scores on return past the deadline)*
- [x] Update `question_stats`, writing `exam_seen`/`exam_correct` only from mock attempts *(a practice attempt is tested to leave both at 0)*
- [x] Result screen — verdict with icon, score, topic breakdown
- [x] Review screen — all questions, both answers marked, explanation block, bookmark *(plus the "Not correct" filter chip)*
- [x] Resume-in-progress-attempt on relaunch *(Home offers Resume / Discard; the session re-reads the paper and reconciles time away)*
- [ ] Maestro E2E: install → language → full mock → review, **in airplane mode** — *not run: no device. The identical flow runs against the static web build with real SQLite (`npm run e2e:web`); airplane mode is moot there since the export makes no network calls.*

**Gate:** a complete mock test works end-to-end in both languages, both themes, offline. This is the moment the app becomes real — screenshot everything.

## 6. M4 — Learn + Signs · Days 13–16

- [x] Topic cards → question list with mastered / unseen / wrong-last-time status *(plus "seen" for flashcard-only history; sign questions show a thumbnail and their description — 68 identical stems would otherwise be indistinguishable)*
- [x] Question detail: reveal answer, explanation, legal ref, bookmark *(try an option or just reveal; writes no stats — only exams and flashcards do)*
- [x] Flashcard ~~swipe~~ deck writing to `question_stats` *(two large buttons rather than swipe-only, so it works with a screen reader; all-modes counters only — tested never to touch `exam_*` or `last_result`)*
- [x] Bilingual search — NFC-normalised index built once ~~at module scope~~ **on first use** (TRD §8), <150 ms *(build asserted <150 ms on the real bank; a sign question is found by its description)*
- [x] Signs grid (`FlashList`, memoised SVG cells), three categories *(one 3-column list, headers span the row; 68 signs drawn by `03_draw_signs.py`)*
- [x] Sign detail: large SVG, ~~both languages shown together~~ *[A1]*, linked questions

**Gate:** signs grid scrolls at 60 fps on the test device *(not measured — no device; tiles are memoised)*; search returns in <150 ms across the full bank *(asserted in `search-bundle.test.ts`)*.

## 7. M5 — Progress + Guide · Days 17–19

- [x] Progress tab: readiness card, attempt history, per-topic accuracy bars *(every figure from completed **mock** attempts only; a history row opens that attempt's review)*
- [x] Weak-area practice session — **untimed, immediate feedback, explanation after each** *(the exam reducer under an untimed config, `mode = 'practice'`; draws 10 from wrong-last-time › accuracy < 60% › never-seen; never touches `exam_*`; leaving abandons quietly, never offered for resume)*
- [x] Bookmarks screen; dangling-ID filtering *(newest first; "Revise these" runs the flashcard deck over the bookmarks)*
- [x] Guide content in `guide.json` with a `lastVerified` date on every fee and rule *(a node test refuses a missing, malformed or future date, or any item not flagged verify-on-portal; links only to `sarathi.parivahan.gov.in` and `aptransport.org`)*
- [x] Settings: language, theme, reset progress with confirm *(M2)*
- [x] About: version, content version, source attribution + `aptransport.org` link, privacy policy link, non-affiliation banner *(M2)*
- [ ] **Guide values checked against the live portal** — *not possible from the build environment (all `gov.in` / `aptransport.org` egress is blocked). Every value is dated 2026-09-20 from the research in `docs/00-phase0-exam-format.md` and shown with a verify-on-the-portal note. Visweswar: confirm the fees and age limits on Sarathi before store submission, then update `lastVerified`.*

## 8. M6 — Explanations + polish · Days 20–23

**Day 20–21 — explanations.** ~~Write a 2–3 sentence bilingual explanation for every question~~ *[A1: English]* — the dataset already carried one for all 277, so M6 **audited** them instead of rewriting (`docs/07-content-assessment.md` §10): 0 contradict the key, 1 leaked compilation framing (fixed via `text-fixes.json`; `G-FRAMING` now covers explanations), 21 position-dependent options verified and locked by the new `G-POSITION` gate. Cite MV Act 1988 / CMVR 1989 sections **only when verified on `indiacode.nic.in`** — otherwise `legalRef: null`. *Still null for all 277: the site is unreachable from the build environment; the 47 citations to check are listed in §10.*

**Day 22 — accessibility.**
- [x] Contrast assertions on the token set in CI *(M2; both on-bg and on-fill pairs)*
- [x] Screen-reader labels on every interactive element, in the active language *(audited; now a zero-dependency gate `G-A11Y` — `scripts/check-a11y.mjs` — in `npm run check` and CI: every Pressable has a role, every icon control, input and pressable Card a label, and no raw `<Text>` outside AppText)*
- [x] Options announce as "Option 2 of 4: …"; timer announces at 50% and 10% only *(OptionRow and ExamTimer tests)*
- [x] 200% dynamic type on every screen~~, Telugu especially~~ *[A1]* — **web matrix at 200% captured (`docs/screenshots/*-light-200.png`) and every screen fixed to it; a device check is still owed.** What 200% broke and how it was fixed: topic-accuracy figures wrapped mid-number (the figure no longer shrinks; the label wraps instead), two-line list rows hid most of a stem (four lines at ≥ 1.5×), the three-column sign grid broke captions mid-word (two columns at ≥ 1.5×). Those two thresholds are the only places the app reads the font scale, and both are layout decisions, never font sizes. M6 also found and fixed a double-scaling bug: line height was multiplied by the font scale in JS although React Native already does it (`03-UIUX-Design.md` §2, M6 correction).
- [x] Reduce-motion honoured *(M2; stack transitions fall back to fade)*

**Day 23 — performance.**
- [ ] Cold start < 2s on a 3GB-RAM Android — *needs a device; not measurable here*
- [ ] AAB under 40 MB — *needs an Android build; not measurable here.* **JS bundle 3.70 MB < 4 MB ✓** (`expo export --platform android`, Hermes bytecode). Bundled assets cut from 10.76 MB to 2.30 MB by deep-importing the one icon font and three Inter weights actually used (`02-TRD.md` §8 M6 measurements)
- [x] Confirm the timer tick doesn't re-render the exam screen *(ExamTimer test: eight 250 ms ticks, parent render count unchanged)*
- [x] Screenshot matrix: every screen × {en~~, te~~ *[A1]*} × {light, dark} × {100%, 200%} — *200% captured in light only; text scale changes layout, not colour*

## 9. M7 — Store submission · Days 24–28

**Day 24 — compliance.** This is where apps in this category die.
- [ ] Play **Government apps declaration** submitted — the answer is *"not developed by or on behalf of a government entity"*. Write that down in `docs/store-submission.md` so the answer is deliberate, not improvised in the console.
- [ ] Non-affiliation statement in the store listing description itself, not only in-app
- [ ] `aptransport.org` source link in both listings
- [ ] Icon audit: no emblem, seal, lion, tricolour, or anything official-looking
- [ ] Privacy policy live on GitHub Pages; linked in-app and in both listings
- [ ] Play Data Safety + Apple App Privacy both filled as "no data collected"
- [ ] Content rating questionnaire

**Day 25 — assets.** Adaptive Android icon, iOS icon set, splash, store screenshots at every required size, listing copy in English and Telugu.

**Day 25–26 — RTO verification.** Go and confirm the real exam format: question count, pass mark, timing model, and whether the test lets you go back. Update `exam-config.json` and set `formatVerifiedOn` — until you do, it ships `null` and the app honestly says the format is unconfirmed. Nothing else in this plan substitutes for seeing the actual test.

**Day 26–27 — real-user test.** Ten AP users complete a mock on a physical device without help. Watch them; don't coach. Fix what confuses them.

Distribute the build via **EAS internal distribution** on Android (an install link, no Play review) and **TestFlight** on iOS — note TestFlight *external* groups need Beta App Review first, which takes a day or two, so use an internal group of up to 100 people on your team instead, or start the external review on day 24.

Give yourself two days here. A one-day window with submission the next morning means any real finding gets ignored, which defeats the point of testing.

**Day 28 — submit.** EAS Build production → EAS Submit both stores.

---

## 10. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| **Play registered as personal account** | **+2 weeks minimum** | Register as organization on day 0. This is the single highest-leverage decision in the plan. |
| **Apple enrolment stuck** | +2–6 weeks | Start day 0. Ship Android first if it drags; the codebase doesn't care. |
| **Telugu extraction fails** | Project-shaping | Day-2 gate. OCR fallback. Predefined fallback: English-only v1, Telugu v1.1. **← Fallback invoked 21 Sep 2026 (PRD A1).** |
| **Store rejection for government affiliation** | +1–2 weeks | Over-comply on day 24. Budget for one rejection cycle. |
| **Exam format wrong** | Credibility | Config-driven; RTO visit day 26; format date shown in-app. |
| **Explanations slip** | Quality | Started day 20, not day 27. Ship with `legalRef: null` rather than invented citations. |
| **Telugu clips at 200% scale** | Accessibility | Per-script line-height from day 5; device test at M2 gate. |
| **Scope creep** | Timeline | The P1 list in the PRD exists to hold things. Nothing moves from P1 to P0 before submission. |

## 11. Definition of done — every milestone

1. Typecheck, lint, and all tests green
2. i18n key parity holds
3. Content validation gates pass
4. Screenshots captured in both languages and both themes
5. Built and run on a **physical mid-range Android device** — not just a simulator
6. Committed and pushed

## 12. If you have to cut

Everything on this list is **P0.5 in the PRD**, not free scope. Cutting any of it requires a deliberate PRD amendment *and* striking the matching launch-criterion checkbox — otherwise you ship against criteria you've quietly stopped meeting. Cut in this order:

1. Flashcard mode *(part of R5; Learn browse covers most of it)*
2. Weak-area practice *(part of R8; progress stats still show where to focus)*
3. Bookmarks *(R9)*
4. Process guide *(R10; the information exists on the official portal)*
5. Dark mode *(R12; ship light-only — halves the screenshot matrix too)*

**Never cut:** R1–R4 (the exam engine, the verified ~~bilingual~~ bank, the explanations, the post-exam review), R11 (offline)~~, or Telugu~~ *[A1: Telugu deferred to v1.1 by amendment, not cut quietly — see PRD Amendments]*. Those are the product. Everything else is furniture.
