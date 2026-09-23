# TRD — AP Learner's Licence Practice App

**Status:** Draft v2 · **Date:** 21 Sep 2026 · **Companion to:** `01-PRD.md`

> **[A1 — English-only v1, 21 Sep 2026]** Telugu is deferred to v1.1 by PRD Amendment A1. Edits below are marked `[A1]`; the Telugu specification is retained verbatim for v1.1, not deleted.

---

## 1. Architecture at a glance

A **zero-backend, content-bundled mobile app**. Everything ships inside the binary; the only thing that ever crosses the network is an optional over-the-air JS bundle update.

```
┌─────────────────────── Device ───────────────────────┐
│                                                      │
│  UI (React Native / Expo Router)                     │
│       │                                              │
│  ┌────┴─────────┬─────────────────┬────────────┐    │
│  │ Content      │ User state      │ kv-store   │    │
│  │ READ-ONLY    │ READ-WRITE      │ sync read  │    │
│  │ questions.ts │ SQLite aplld.db │ at boot    │    │
│  │ signs/*.svg  │ attempts        │ language   │    │
│  │ exam-config  │ attempt_answers │ theme      │    │
│  │ guide.json   │ question_stats  │            │    │
│  │              │ bookmarks, meta │            │    │
│  └──────────────┴─────────────────┴────────────┘    │
│       ▲                                              │
└───────┼──────────────────────────────────────────────┘
        │ EAS Update (optional, content fixes only)
     Expo CDN
```

**The one rule that keeps this simple:** content is immutable and ships with the build; user state is mutable and never leaves the device. They live in different stores and never mix.

## 2. Stack — decided

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Expo SDK 57** (React Native 0.86) | Current stable, released 30 Jun 2026. One codebase, both stores. |
| Language | **TypeScript, strict** | `strict: true`, `noUncheckedIndexedAccess: true`. No `any`. |
| Navigation | **expo-router** | File-based; typed routes; deep-link ready. |
| Build & ship | **EAS Build + EAS Submit** | Produces iOS and Android store binaries with no Mac in the loop. |
| Content updates | **EAS Update** | Push corrected questions without a store resubmit. Apple permits JS-bundle updates that don't change the app's primary purpose; ours don't. |
| User state | **expo-sqlite** (async API) | `SQLiteProvider` / `useSQLiteContext`, `PRAGMA user_version` migrations. |
| Lightweight prefs | **expo-sqlite/kv-store** | Language and theme — read synchronously at boot, avoids a first-paint flash. |
| Content | **TS module `import`** | Questions compile into the JS bundle → fully OTA-updatable, no async load, no parse step. |
| Signs | **react-native-svg** + `react-native-svg-transformer` | Import `.svg` directly; crisp at any size; themeable; kilobytes not megabytes. |
| State | **Zustand** | Exam session state is ephemeral and local. No React Query — there is no server to cache. Nothing more is warranted. |
| i18n | **i18n-js** + **expo-localization** | Detect device locale, allow manual override, persist. *[A1: one locale in v1; `content-config.json` decides, the toggle is dormant]* |
| Fonts | **expo-font** | Bundle ~~Noto Sans Telugu +~~ Inter. *[A1: Noto Sans Telugu not bundled in v1 (~0.4 MB saved); re-add with the Telugu content]* |
| Lists | **@shopify/flash-list** | Sign grid and question lists; keeps 60fps on low-end Android. |
| Bundle analysis | **expo-atlas** | Enforces the JS-bundle budget in CI. |
| Testing | **Jest** + **React Native Testing Library** + **Maestro** (E2E) | |
| Lint | **ESLint** + **Prettier** + **TypeScript** in CI | |

**Rejected:** Flutter (worse content-update story — every question fix becomes a store review); a bundled prepopulated SQLite content DB (adds a migration surface and blocks OTA content updates for no benefit at this data size); any analytics or crash SDK (breaks the "no data collected" claim; store vitals suffice).

## 3. Project structure

> **[M2 note]** Expo SDK 57's template places routes under **`src/app/`**, and this project follows it. Read every `app/` path below as `src/app/`. Everything else in the tree is as shown.

```
app/                          # expo-router routes
  (tabs)/
    index.tsx                 # Home
    learn.tsx
    signs.tsx
    progress.tsx
    _layout.tsx
  exam/
    intro.tsx
    session.tsx               # full-screen, gestures disabled
    result.tsx
    review/[attemptId].tsx    # parameterised — also serves history review
  practice/
    session.tsx               # untimed, immediate feedback
    summary.tsx
  learn/
    [topic].tsx
    flashcards.tsx
  question/[id].tsx
  signs/[signId].tsx
  bookmarks.tsx
  guide/index.tsx
  settings.tsx
  about.tsx
  _layout.tsx

src/
  content/
    questions.ts              # generated — DO NOT EDIT BY HAND
    exam-config.json
    guide.json
    signs/*.svg               # generated
  engine/
    examEngine.ts             # pure: sampling, scoring, timing
    selection.ts              # weighted weak-area sampling
    readiness.ts
  db/
    schema.ts  migrations.ts  queries.ts
  i18n/
    en.json  te.json  index.ts
  design/
    tokens.ts  typography.ts  theme.ts
  components/
  hooks/

pipeline/                     # Python — content extraction (see §4 below)
docs/                         # these documents
```

## 4. Content pipeline (technical)

Python 3.11+, committed and re-runnable. `pdfplumber` for tables, `PyMuPDF` for embedded images, `pytesseract` (`tel`) as OCR fallback.

```
01_download.py   → pipeline/raw/*.pdf + sha256 manifest
02_extract.py    → raw JSON per (topic, language)
03_extract_signs.py → sign images keyed by question number
04_merge.py      → join te+en on (topic, qno) → canonical records
05_validate.py   → gates below; writes reports/needs_review.json
06_emit.py       → src/content/questions.ts, src/content/signs/*.svg
```

**Validation gates — the build fails if any is violated:**

| Gate | Rule |
|---|---|
| `G-STRUCT` | Exactly 4 non-empty options; `answerIndex` ∈ 0..3 |
| `G-BILINGUAL` | Non-empty text and all 4 options in **every language listed in `src/content/content-config.json`** (v1: `en`). Adding `te` to the config re-arms the Telugu check with no code change. *[A1]* |
| `G-TELUGU` | ≥90% of characters in each `te` string fall in U+0C00–U+0C7F *[A1: vacuous until `te` ships]* |
| `G-ASSET` | Both directions. If `signId` is set, the artwork exists in `SIGN_ART` and is non-trivial. **And** any question whose text matches a sign-reference pattern (`/this sign|the sign (shown|below)/i`) must have a non-null `signId` — otherwise a question asking "what does this sign mean?" ships with no sign and is unanswerable. |
| `G-DEDUP` | No two questions share the same `(normalised English text, signId)` pair. **Text alone is wrong** — all ~94 road-sign questions read "WHAT DOES THIS SIGN MEAN?" and a text-only key would quarantine the entire topic. |
| `G-KEY` | Answer index matches the source PDF's 1-based answer column, off-by-one checked |
| `G-MERGE` | *[A1: vacuous with one language; re-arms with `te`]* **The gate that protects the one unforgivable bug.** Per-topic question-count parity between the Telugu and English PDFs, plus the answer column extracted *independently from both* — any mismatch quarantines the pair. Without this, a systematic off-by-one in the join would attach the wrong Telugu text to an English question and pass every other gate silently. Backed by a mandatory human spot-check of 15 random pairs at the M1 gate. |
| `G-MIX` | For every topic, shippable question count ≥ `sectionMix[topic]`, and ideally ≥ 3×, or papers repeat. Also asserts `sum(sectionMix) === questionCount`. Quarantine removes questions, so this must run *after* it. |
| `G-IDSTABLE` | Every ID in `pipeline/id-map.json` is either present in this run or explicitly retired. Protects user stats and bookmarks across re-runs — see `05-Data-Schema.md` §2.2. |

Anything failing → `needs_review.json`, **excluded from the emitted bundle**, never shipped blank. Golden-file snapshots prevent a silent content change on re-run.

> **[M4 notes]**
> - **All 68 sign images are redrawn**, not extracted: the bank reached us as text. `pipeline/signs.json` is the hand-authored registry (id, category, name, meaning, the CSV rows that describe each sign); `03_draw_signs.py` composes every SVG from a small primitive library so the set shares one stroke weight and palette. `G-SIGNS` gates the registry and `G-ASSET` now checks both directions for real.
> - **The official stem is restored.** The 68 described-in-words rows become *"What does this sign mean?"* with artwork, and the prose becomes `signAlt` — the image's accessibility text. Because that makes left-curve and right-curve textually identical, **`signId` is part of the content hash**; the rewrite itself is carried across by `previousContentHash` at emit, so no ID changed (0 minted, 68 carried).
> - **`pipeline/text-fixes.json`** holds the two edits that remove compilation framing ("under the Telangana bank…") from text a candidate reads; a new gate `G-FRAMING` blocks any such stem. Never used for answer keys.

**Known hazards, handled explicitly:**

- Telugu PDFs often use non-Unicode/custom-mapped fonts. `G-TELUGU` catches this; OCR is the fallback; a human reviews the queue. **Resolve this before writing any UI.**
- Road-sign questions ("WHAT DOES THIS SIGN MEAN?") depend on an image that text extraction drops. Extract with PyMuPDF; where unreliable, redraw as SVG against the standard Indian sign set (mandatory / cautionary / informatory, IRC-style conventions).
- Source text is ALL-CAPS. Convert English to sentence case, preserving RTO, LMV, HMV, MV Act, KMPH, CC, NH.

## 5. Exam engine

> **[M3 notes]** Implemented as `src/engine/`. Two deliberate refinements of this section, both tested:
> - **Session state is a pure reducer, not a Zustand store.** `reduce(state, action) → { state, effects }` returns the next state *and* the SQLite writes it implies; the screen persists the effects in order. Every transition — including backgrounding and clock jumps — is exercised without React or timers. Zustand (§2) is not installed until something needs cross-screen ephemeral state; nothing yet does.
> - **Persistence is write-behind by a few milliseconds.** The screen advances optimistically (the <100 ms transition budget in §8) and the reducer's effects are written to SQLite in order immediately after. A process kill inside that window loses at most the last effect; on resume the paper re-reads from the database and that question is asked again with its clock re-anchored — never a corrupt or skipped question. The web E2E settles 500 ms before simulating a kill for exactly this reason.
> - **A tapped-but-unsubmitted option counts as the answer when the per-question timer expires**, recorded correct/wrong rather than `timeout`. The real test's auto-advance takes whatever is selected, and losing a tapped answer to the clock is the wrong pressure to rehearse. Nothing tapped → `timeout`. Product decision, easy to reverse in `session.ts`.

Pure TypeScript, no React, fully unit-testable.

```ts
interface ExamConfig {
  questionCount: number;
  passMark: number;
  timing: { mode: 'per-question' | 'whole-paper'; secondsPerQuestion: number | null; totalSeconds: number | null };
  allowBackNavigation: boolean;
  allowSkip: boolean;
  negativeMark: number;            // marks deducted per wrong answer; 0 = none
  sectionMix: Record<TopicId, number>;
  formatVerifiedOn: string | null; // null until confirmed at an RTO — see below
}
```

**Sampling (`selection.ts`).** Honour `sectionMix` exactly; never repeat within a paper; weight candidates by priority: `never seen` (4×) → `answered wrong last time` (3×) → `accuracy < 60%` (2×) → `everything else` (1×). Seeded RNG so tests are deterministic.

**Timing.** Single `setInterval` at 250 ms driving a derived countdown — never one timer per question.

Per-question mode needs a per-question anchor, so the engine writes `attempt_answers.presented_at` when each question is first shown and derives the deadline as `presented_at + secondsPerQuestion * 1000`. An attempt-level `started_at` alone cannot express this.

**Backgrounding** is the subtle case, and the rule differs by mode:

| Mode | On resume |
|---|---|
| `whole-paper` | Recompute remaining from `attempts.started_at` against wall clock. If the paper's time elapsed while away, go straight to scoring. |
| `per-question` | Every question whose deadline passed while backgrounded is auto-recorded as `outcome = 'timeout'`, in order, and the session advances to the first question still live. If that consumes the whole paper, go to scoring. |

Never trust accumulated ticks — always recompute from persisted wall-clock timestamps. If the device clock jumps backwards mid-attempt, fall back to monotonic elapsed time and set `attempts.timing_reliable = 0` rather than scoring on bad data.

**Forward-only.** When `allowBackNavigation` is false, disable the hardware back button, swipe-back gesture, and any header back affordance during a session. An accidental exit must raise a confirm dialog, not silently discard the attempt.

**Scoring.** `score = correct - (wrong × negativeMark)`, clamped at 0 so a paper can never produce a negative result. Timeouts and skips count as unanswered — 0, never a deduction. Pass iff `score >= passMark`.

**There is no "show the answer during the exam" option.** The mock exam simulates; immediate feedback belongs to practice mode, which is a separate flow (`04-App-Flow.md` §5). A config flag for it would have no defined UI in the exam screen, which states flatly that there is no correctness feedback during an attempt.

**`formatVerifiedOn` is nullable and ships as `null`.** Until someone has sat the real test at an RTO, the app must not print a verification date it doesn't have. While null, the pre-exam screen says the format is unconfirmed.

## 6. Internationalisation

- ~~Two locales: `en`, `te`.~~ **One locale in v1: `en`** *[A1]*. `src/content/content-config.json` is the source of truth for which locales exist; the first-launch language sheet and the toggle render only when it lists more than one. Device locale detected via `expo-localization`; manual override persisted in kv-store and read **synchronously at boot** so there is no flash of the wrong language.
- **Every user-visible string** lives in `en.json` / `te.json`. A CI check fails the build if the two files have different key sets or if any string is hardcoded in a component.
- Content strings come from `questions.ts`, not the i18n files — different lifecycle, different source of truth.
- Numbers and dates formatted with `Intl` using the active locale.

## 7. Telugu rendering — treat as a first-class engineering problem *[A1: retained as the v1.1 spec; not exercised in v1]*

| Concern | Requirement |
|---|---|
| Font | Bundle **Noto Sans Telugu** (Regular / Medium / SemiBold). Never rely on system fonts — Telugu rendering varies significantly across Android OEM skins and iOS versions. |
| Line height | Per-role, per-script. **`03-UIUX-Design.md` §2 holds the authoritative table — do not restate the numbers here or anywhere else.** Implement via `lineHeightFor(role, script, size)` in `typography.ts`, and note that it must multiply by `PixelRatio.getFontScale()`: RN scales `fontSize` with the OS text setting but *not* a numeric `lineHeight`, so omitting it reintroduces clipping at large text sizes. |
| Text containers | Never fixed-height. Always min-height + wrap. Telugu strings run ~15–25% longer than English. |
| Truncation | Never in question or option text during an exam, review, or question detail. The **one sanctioned site** is the Learn topic list, capped at two lines, breaking on word boundaries — never mid-grapheme-cluster, which shatters Telugu conjuncts. |
| Normalisation | NFC-normalise all Telugu at pipeline emit time and at search-query time, so search matches reliably. |
| Testing | Automated screenshot tests of the exam, review and signs screens in Telugu at 100% and 200% text scale. |

## 8. Performance budgets

| Budget | Target | Enforcement |
|---|---|---|
| Install size (Android AAB) | < 40 MB | CI check on build output |
| Cold start to interactive | < 2s on a 3GB-RAM Android | Manual measurement on a real device each milestone |
| Exam question transition | < 100 ms | Profiled |
| Signs grid scroll | 60 fps | `FlashList`, memoised SVG cells |
| Search response | < 150 ms over the full bilingual bank | Index built lazily on first mount of the search screen, then memoised — **not at module scope**, which would run during evaluation on every cold start for every user, against a <2s budget |
| JS bundle | < 4 MB | `expo-atlas` inspection |

> **[M6 measurements]** `npx expo export --platform android` (Hermes bytecode, no device needed):
>
> | Measure | Value | Budget |
> |---|---|---|
> | JS bundle (`.hbc`) | **3.70 MB** | < 4 MB ✓ — 92% used; watch it |
> | Bundled assets | **2.30 MB** (was 10.76 MB) | — |
> | Cold start, AAB size | **not measured** — no device or Android SDK in the build environment | < 2 s, < 40 MB |
>
> The 8.5 MB of assets removed were fonts nobody rendered: `@expo/vector-icons`' index requires all 38 icon fonts, and `@expo-google-fonts/inter`'s index all 18 Inter files. Both are now deep-imported (`@expo/vector-icons/Ionicons`, `@expo-google-fonts/inter/400Regular` …), which is the whole fix; a lint rule is not worth it while there are two import sites, but re-check the asset list whenever a font package is added. What remains: Ionicons (381 KB), the three Inter weights (~1 MB) and Material Symbols (944 KB), which `expo-router` itself pulls in.

**Tactics:** Hermes engine (default). `FlashList` for all long lists. `React.memo` on question and sign cells. Search index built lazily and memoised, never at module scope. SVGs as compiled components via `react-native-svg-transformer`, resolved through a generated `SIGN_ART` registry (`05-Data-Schema.md` §2.1) — a runtime path string cannot become a component. No unnecessary re-render of the exam screen on each timer tick — isolate the countdown into its own leaf component.

## 9. Testing strategy

| Level | Scope |
|---|---|
| **Content** (Jest) | All nine validation gates re-asserted against the emitted bundle. This suite is the safety net for the app's one unforgivable failure — a wrong answer key. |
| **Unit** (Jest) | `examEngine`, `selection`, `readiness`, scoring, timer expiry, seeded sampling, no-repeat-within-paper |
| **DB** (Jest + in-memory SQLite) | Migrations forward from every prior `user_version`; query correctness |
| **Component** (RNTL) | Option selection, timer display, result computation, language switch |
| **E2E** (Maestro) | Fresh install → choose language → complete a full mock → review answers → bookmark → find bookmark. Run in **airplane mode**. |
| **Visual** | Screenshots of every screen × ~~{en, te}~~ {en} *[A1]* × {light, dark} × {100%, 200% text scale} |
| **Accessibility** | Contrast assertions on the token set; label presence on every interactive element |

## 10. CI/CD

GitHub Actions on every PR: typecheck → lint → i18n key-parity → content gates → unit → component. Merge to `main` triggers an EAS `preview` build. Tags trigger `production` build + EAS Submit.

**Update channels:** `preview` (internal testing) and `production`. Content-only corrections go out as an EAS Update on `production`; anything touching native code requires a new store build.

## 11. Privacy, security, compliance

- **No analytics, no crash SDK, no ads, no third-party SDKs of any kind.** No user content, answers, scores, or identifiers ever leave the device.
- **One network call exists, and the privacy story has to account for it honestly.** `expo-updates` contacts Expo's CDN to check for a new JS bundle. That request necessarily carries the device's IP address plus runtime/channel metadata to a third party — which is exactly what the Play Data Safety and Apple App Privacy questionnaires ask about. Do not file the forms as "no data collected" without first resolving this:
  - **Decide and record the reasoning.** The update check is ephemeral transport metadata, not collected user data, which is the normal reading — but write that reasoning down in `docs/store-submission.md` rather than leaving it implicit, and re-check Expo's current data-handling documentation at submission time.
  - **Reduce the surface.** ~~Set `checkAutomatically: 'ON_ERROR_RECOVERY'` or drive updates manually, so the call happens rarely rather than on every launch.~~ *[M7 decision: manual only. `checkAutomatically: NEVER`; a "Check for updates" button in Settings (`src/updates/`) is the app's only network request, and it runs only when the user presses it. Error-recovery mode was dropped because it would also have meant content corrections never reached a user whose app had not crashed.]*
  - **Be accurate about permissions.** The app requests **no runtime permissions** — no camera, storage, location, or notifications. It does declare Android's `INTERNET` permission, which is a normal, non-prompting permission required by `expo-updates`. Say "no runtime permissions", not "no permissions", because the manifest is public.
- All user data is on-device SQLite in the app sandbox. Nothing is encrypted because nothing sensitive is stored; say exactly that in the privacy policy rather than overclaiming.
- Privacy policy hosted on GitHub Pages (free, serverless), linked from the About screen **and** both store listings.
- **Government-affiliation compliance** is a technical deliverable, not a copywriting afterthought — Play's Government apps declaration, source citation linking `aptransport.org`, explicit non-affiliation text in the listing, and an icon carrying no emblem or seal. See `01-PRD.md` §9.

## 12. Open technical decisions

| # | Decision | Owner | Needed by |
|---|---|---|---|
| T1 | Real exam parameters (count, pass mark, timing model, back-navigation) | Visweswar, at the RTO | Before launch |
| T2 | Whether Telugu extracts cleanly or needs full OCR | Pipeline run | **Day 2** — blocks everything |
| T3 | Sign images: extractable from PDF, or redraw all as SVG | Pipeline run | Day 3 |
| T4 | Final app name and icon that survive store review | Visweswar | Before submission |
