# ADR-001 — Mobile stack: Expo (React Native) + TypeScript

**Status:** Accepted · **Date:** 21 Sep 2026 · **Supersedes:** the "decided" table in `02-TRD.md` §2, which this ADR formalises

## Context

One codebase must ship to the App Store and Play Store, work fully offline with all content
in the binary, render Telugu (v1.1) with correct complex-script shaping, hold 60 fps on a
₹10,000 / 3 GB Android, install under 40 MB, and — the unusual requirement — let a solo
developer push **corrected questions without a store resubmission and without operating a
server.** A wrong answer key in a licence-exam app costs a real person a real fee; the
correction path is a product feature, not a nicety.

Verified at decision time in this environment: `expo@57.0.24`, `react-native@0.86.3`,
`react@19.2.3`, `typescript@6.0.3`, `expo-router@57.0.22`, `expo-sqlite@57.0.3`.

## Options considered

| | Expo (RN) | Flutter | Bare React Native | Kotlin Multiplatform |
|---|---|---|---|---|
| Both stores, one codebase | ✅ | ✅ | ✅ | ⚠️ shared logic, native UI ×2 |
| iOS build **without a Mac** | ✅ EAS Build (cloud) | ⚠️ Codemagic etc. — third party | ⚠️ same | ⚠️ same |
| Content fix without store review | ✅ **EAS Update** — built in, free tier, no server of ours | ⚠️ Shorebird (third-party code push) or hand-rolled JSON fetch + our own hosting | ⚠️ CodePush successor / hand-rolled | ❌ native code |
| Complex-script text (Telugu) | ✅ OS text engines (Core Text / Android `TextView`) — the same shaping every system app uses | ✅ own engine (HarfBuzz) — good, but a second implementation to verify per OEM | ✅ as Expo | ✅ native |
| 60 fps on cheap Android | ✅ Hermes + New Architecture; this app has no heavy animation | ✅✅ best raw performance | ✅ | ✅✅ |
| Install size | ✅ ~25–35 MB AAB feasible | ✅ ~15–25 MB | ✅ | ✅ smallest |
| Maturity / longevity | ✅ Meta-backed RN + Expo; industry default | ✅ Google-backed | ✅ | ⚠️ younger; UI story still moving |
| Solo-dev velocity | ✅✅ file-based router, managed native config, OTA, `expo-sqlite`, one language | ✅ | ⚠️ owns Xcode/Gradle upkeep | ❌ two UIs |

## Decision

**Expo SDK 57 with TypeScript in strict mode.** Not hedged.

The deciding criterion is the one no alternative meets without a third party or a server:
**EAS Update ships a corrected question bank over the air, on Expo's CDN, with no
infrastructure we operate**, and EAS Build produces the iOS binary without a Mac. Everything
else is a tie or a small Flutter edge that this app — no heavy animation, list-and-text UI —
does not cash in.

Text rendering settled the residual doubt. React Native hands Telugu to the operating
system's own shaper, so a conjunct that renders correctly in the phone's Settings app renders
correctly here. Flutter's engine is good, but it is a second shaping implementation whose
Telugu behaviour would need verifying across OEM skins — the exact risk `02-TRD.md` §7 warns
about — for no gain on a text-only app.

Consequences accepted with it:

- **Content is a TS module, not a bundled SQLite file** (`src/content/questions.ts`). It
  compiles into the JS bundle, so an EAS Update carries it. A prepopulated content DB would
  not be OTA-updatable and would add a migration surface. (Apple guideline 3.3.1B permits JS
  updates that do not change the app's primary purpose; a corrected question does not.)
- **`expo-updates` is the one network call in the app** and must be declared honestly in the
  privacy forms — `02-TRD.md` §11. `checkAutomatically: ON_ERROR_RECOVERY` keeps it rare.
- **Type strictness is enforced, not aspirational:** `strict`, `noUncheckedIndexedAccess`,
  no `any`. TypeScript 6 is what SDK 57 templates ship with.
- **Two test runners, each the right tool.** Pure logic (exam engine, DB SQL, design math)
  runs on Node's built-in test runner against real SQLite via `node:sqlite` — zero
  dependencies, executes the actual DDL. Component rendering runs under Jest + `jest-expo`.
  One runner for both would either mock SQLite or drag React Native into logic tests.
- **Web is a screenshot and CI target only.** `react-native-web` lets Playwright render
  every screen headlessly in CI for the visual matrix. It is not a shipping platform, and
  device-only behaviour (OS font scale, SQLite on native) is verified on hardware — the
  implementation plan's "not in a simulator" gate stands.

## Rejected, and why

- **Flutter** — credible; better animation polish and raw performance we do not need. Loses
  on OTA content updates (third-party) and on a second text-shaping engine for Telugu.
- **Bare React Native** — same runtime, but we would own Xcode and Gradle upkeep and lose
  managed OTA. No upside for a solo developer.
- **Kotlin Multiplatform / native ×2** — best performance and size; two UIs is a 4-week plan
  becoming a 10-week plan. Wrong trade for this scope.
- **Bundled prepopulated SQLite for content** — blocks OTA content updates, adds a migration
  surface, no benefit at 277 questions.
- **Any analytics / crash SDK** — breaks "no data collected". Store vitals suffice.
