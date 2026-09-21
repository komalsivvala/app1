# UI/UX Design Spec — AP Learner's Licence Practice App

**Status:** Draft v2 · **Date:** 21 Sep 2026

> **[A1 — English-only v1, 21 Sep 2026]** Telugu is deferred to v1.1 by PRD Amendment A1. Edits below are marked `[A1]`; the Telugu specification is retained verbatim for v1.1, not deleted.

---

## 1. Design principles

1. **Suresh must be able to use it without being told how.** Our tertiary persona is a 41-year-old on his first smartphone. If a screen needs explaining, it's wrong. This is the constraint that produces the minimalism — it isn't a style preference.
2. **One idea per screen.** No screen does two jobs.
3. **Calm under pressure.** The user is rehearsing an exam they're anxious about. Nothing flashes, buzzes, pulses, or celebrates. The timer informs; it doesn't threaten. It may change colour once, quietly, near the end — it may never animate to demand attention.
4. **Telugu is not a translation layer.** It's a first-class script with its own metrics. A screen that looks good in English and cramped in Telugu is a broken screen.
5. **Colour carries meaning, never decoration.** Green means correct. Red means incorrect. Accent means "the one thing to tap." Everything else is greyscale.
6. **Never look official.** No emblems, seals, tricolour motifs, or government-adjacent iconography — both a store-compliance requirement and an honesty requirement.

## 2. Design tokens

### Colour — every pair below is measured, not estimated

**Light**

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FFFFFF` | Page background |
| `surface` | `#F7F7F8` | Cards, option rows |
| `border` | `#E5E5E7` | Hairlines, option outlines |
| `text.primary` | `#111113` | Questions, headings — **18.86:1 (AAA)** |
| `text.secondary` | `#6B6B70` | Meta, captions — **5.30:1 (AA)** |
| `accent` | `#2B5FD9` | Primary action, selection — **5.61:1 (AA)** |
| `success` | `#0F7A45` | Correct — **5.40:1 (AA)** |
| `danger` | `#C42B2B` | Incorrect — **5.63:1 (AA)** |

**Dark**

| Token | Hex | Contrast on `bg` |
|---|---|---|
| `bg` | `#0B0B0D` | — |
| `surface` | `#151517` | — |
| `border` | `#26262A` | — |
| `text.primary` | `#F2F2F3` | **17.58:1 (AAA)** |
| `text.secondary` | `#9A9AA0` | **7.03:1 (AAA)** |
| `accent` | `#5B85F5` | **5.73:1 (AA)** |
| `success` | `#3DBA7A` | **7.96:1 (AAA)** |
| `danger` | `#F06A6A` | **6.53:1 (AA)** |

### On-fill pairs — the ones that are easy to get wrong

Foreground-on-background is only half the check. Text sitting **on** a filled accent, success or danger surface needs its own token, and the naive answer fails in dark mode:

| Pair | Ratio | |
|---|---|---|
| Light: white on `accent` `#2B5FD9` | **5.61:1** | ✅ |
| Dark: **white** on `accent` `#5B85F5` | **3.43:1** | ❌ **fails AA** |
| Dark: `#0B0B0D` on `accent` `#5B85F5` | **5.73:1** | ✅ |
| Light: white on `success` / `danger` | 5.40 / 5.63:1 | ✅ |
| Dark: `#0B0B0D` on `success` / `danger` | 7.96 / 6.53:1 | ✅ |

So there is an explicit **`accent.on`** token: `#FFFFFF` in light, `#0B0B0D` in dark — same for `success.on` and `danger.on`. Dark mode is **designed, not inverted**: accents lighten so they don't glare on near-black, which means labels on them must darken, not stay white. Note 17dp ≈ 12.75pt, which is *not* WCAG "large text", so the 4.5:1 threshold applies to button labels in full.

**CI must assert on-fill pairs, not just on-`bg` pairs.** Checking only the table above this one is exactly how the dark button shipped at 3.43:1 in the first draft of this document.

### Typography

Two families: **Inter** (Latin/numerals), **Noto Sans Telugu** (Telugu). ~~Both bundled~~ *[A1: only Inter is bundled in v1. The Telugu column below is the v1.1 spec, and `lineHeightFor` keeps its `telugu` branch so enabling it is a data change, not a code change]* — never system fonts.

| Role | Size | Weight | Latin LH | **Telugu LH** |
|---|---|---|---|---|
| Display | 32 | 600 | 1.2 | **1.45** |
| Title | 24 | 600 | 1.3 | **1.5** |
| Heading | 20 | 600 | 1.35 | **1.55** |
| **Question** | 20 | 500 | 1.45 | **1.65** |
| **Option** | 17 | 400 | 1.45 | **1.6** |
| Body | 17 | 400 | 1.5 | **1.65** |
| Caption | 13 | 400 | 1.4 | **1.55** |

**This table is the single source of truth for line heights** — the TRD, the PRD and the implementation plan all point here rather than restating numbers. Telugu stacks conjuncts below the baseline and matras above it; at Latin metrics the glyphs clip and lines collide.

```ts
import { PixelRatio } from 'react-native';

type Role = 'display' | 'title' | 'heading' | 'question' | 'option' | 'body' | 'caption';
type Script = 'latin' | 'telugu';

const LH: Record<Role, Record<Script, number>> = {
  display:  { latin: 1.2,  telugu: 1.45 },
  title:    { latin: 1.3,  telugu: 1.5  },
  heading:  { latin: 1.35, telugu: 1.55 },
  question: { latin: 1.45, telugu: 1.65 },
  option:   { latin: 1.45, telugu: 1.6  },
  body:     { latin: 1.5,  telugu: 1.65 },
  caption:  { latin: 1.4,  telugu: 1.55 },
};

export const lineHeightFor = (role: Role, script: Script, size: number) =>
  Math.round(size * LH[role][script] * PixelRatio.getFontScale());
```

~~**The `getFontScale()` multiplier is not optional.** In React Native, `fontSize` scales with the OS text-size setting but a *numeric* `lineHeight` does not. Omit it and at 200% text scale the glyphs double while the line box stays fixed — which produces precisely the Telugu clipping this whole section exists to prevent.~~ Verify on a device, not a simulator.

> **[M6 correction]** The struck-through premise is wrong for current React Native, and M2 implemented it faithfully — so until M6 the app **double-scaled** line height on devices. With `allowFontScaling` (the default) React Native multiplies a numeric `lineHeight` by the OS text-size factor itself: on Android `TextAttributeProps.setLineHeight` converts it with `PixelUtil.toPixelFromSP`, on iOS `RCTAttributedTextUtils` multiplies it by the effective font-size multiplier. Multiplying in JS as well makes the line box grow with the *square* of the setting: at 200% the glyphs double and the lines quadruple. The fix (M6): `lineHeightFor(role, script, size)` returns the **unscaled** value and nothing in JS touches the font scale on native; `useTypography().fontScale` stays available for *layout* decisions only (rows that stack at ≥ 1.5×). The web export, which has no OS text size, gets a stand-in multiplier (`use-web-text-scale.web.ts`, read from `localStorage` by the screenshot matrix) applied to both size and line height, so the 200% screenshots in `docs/screenshots/` render what a phone would. The Telugu ratios above are unchanged and still the point: the taller line box comes from the ratio, not from the multiplier. **This still has to be confirmed on a real device at 200% — the environment has none.**

Body text never below 17pt — this app is read under exam pressure by people who may not have their reading glasses.

### Spacing, radius, motion

- **Spacing:** 4 · 8 · 12 · 16 · 24 · 32 · 48. Screen gutter 20. Nothing off-scale except hairlines and the timer bar, which are measured in device pixels.
- **Radius:** `sm` 8 (chips) · `md` 12 (cards, option rows) · `lg` 16 (sheets) · `full` 999 (pills).
- **Elevation:** none. Separation comes from `surface` fill and hairline `border`. No drop shadows as ornament.
- **Motion:** micro 150 ms · transitions 220 ms · standard easing `cubic-bezier(0.2, 0, 0, 1)`. Nothing bounces. Respect `prefers-reduced-motion` / OS reduce-motion — fall back to cross-fade.

## 3. Component inventory

| Component | Notes |
|---|---|
| `OptionRow` | Full-width, min-height **56** (exceeds the 48 minimum comfortably), radius 12, `surface` fill. States: default / selected / correct / incorrect / correct-but-not-chosen. **Icon + colour together**, never colour alone. |
| `QuestionCard` | Optional sign image (max 200 × 200, `contain`), then question text. Never fixed height. |
| `ExamTimer` | Isolated leaf component so a tick doesn't re-render the exam screen. Thin 3px progress bar + numeric readout. Shifts to `danger` once, at the final 20%, and only the bar — no flashing, no pulsing, no sound. |
| `ProgressPill` | `7 / 20`. Caption size, `text.secondary`. |
| `PrimaryButton` | Height 56, radius 12, `accent` fill, **`accent.on`** label (white in light, `#0B0B0D` in dark — never white in dark, see §2), 17/600. **Exactly one per screen.** |
| `SecondaryButton` | Same geometry, transparent fill, `border` outline, `text.primary` label. |
| `TopicCard` | Title, question count, thin accuracy bar. |
| `SignTile` | Square, SVG centred on `surface`, name below in active language. |
| `StatRow` | Label left, value right, hairline below. |
| `LanguageToggle` | Segmented `తెలుగు / English`. In the header on Home; in Settings; on the pre-exam screen. *[A1: not rendered while `content-config.json` lists one language]* |
| `EmptyState` | Line of text + one action. No illustrations. |
| `Banner` | Used once — the non-affiliation disclaimer on About. |

## 4. Screen specifications

### Home — "start in two taps"

Header: app name (left), ~~language toggle +~~ settings gear (right) *[A1: the toggle returns with a second language]*.

Body, in order:

1. **Readiness card** — one number and one honest sentence. Before any attempt: *"Take your first mock test to see where you stand."* After: *"The real test needs 12 of 20. You're averaging 78% across your last 5 tests."* State the numbers and let the user judge — no likelihood-of-passing figure, because we have no data supporting one. The formula is in `05-Data-Schema.md` §5 and is identical everywhere it appears.
2. **`Start Mock Test`** — the primary button. Largest tappable thing on the screen. This is the app's core action and it is never more than one tap from launch.
3. **Three cards:** Learn · Road Signs · Weak Areas *(hidden until there is data — don't show an empty promise)*.
4. **Guide** — a quieter row linking to Documents & Process.

*No onboarding carousel. No account wall. No permission prompt. First launch → language sheet → Home.*

### Pre-exam

~~Language toggle.~~ *[A1]* The real test's rules stated plainly, pulled live from `exam-config.json` so this screen can never contradict the engine:

> 20 questions · 12 correct to pass · 30 seconds per question
> You cannot go back to a previous question.
> Wrong answers don't lose marks.
> *Format as of 21 Sep 2026 — verify at your RTO.*

One `Start` button. Nothing else.

### Exam — the screen that must be perfect

```
┌──────────────────────────────────┐
│ ▁▁▁▁▁▁▁▁▁▁▃▃▃▃▃▃  timer bar      │
│  7 / 20                    0:24  │
│                                  │
│        [ sign image ]            │  ← only when present
│                                  │
│  What does this sign mean?       │  20/500, LH 1.65 in Telugu
│                                  │
│  ┌────────────────────────────┐  │
│  │ Stop                       │  │  56 min-height
│  ├────────────────────────────┤  │
│  │ Give way                   │  │
│  ├────────────────────────────┤  │
│  │ No entry                   │  │
│  ├────────────────────────────┤  │
│  │ Speed limit                │  │
│  └────────────────────────────┘  │
│                                  │
│  [        Next        ]          │
└──────────────────────────────────┘
```

Rules: no tab bar, no back affordance, gestures disabled when `allowBackNavigation` is false. Selecting an option fills it with a 10% `accent` tint and an accent outline — **no correctness feedback during the exam**. `Next` disabled until an option is chosen, unless `allowSkip`. Attempting to exit raises a confirm dialog; it never silently discards the attempt.

### Result

Verdict first, unambiguously: **PASSED** or **NOT PASSED** in Display size, `success` or `danger`, with an icon so it reads without colour. Then `14 / 20`. Then a per-topic bar breakdown. Then `Review all answers` as the primary button — **not** `Retake`. We want them to learn, not re-roll.

Restraint: a pass gets a calm checkmark, not confetti. A fail gets *"Review your answers — most people pass on the next attempt"*, not a sad face.

### Review — where the learning actually happens

Vertical list of all 20. Each: question, sign, all four options with the user's choice marked and the correct one marked, then the explanation in a `surface` block with the legal reference in caption size. Bookmark icon top-right of every card. Jump-to-wrong filter chip at the top.

### Learn

Three topic cards → question list (number, question text truncated to two lines — **the only sanctioned truncation in the app**, and it must break on word boundaries, never mid-grapheme-cluster, which shatters Telugu conjuncts — with ✓ mastered / ○ unseen / ! wrong-last-time) → question detail with answer revealed on tap and the explanation below. Flashcard mode is a swipe deck of the same content. Search bar queries **both languages simultaneously** — a user typing English finds the Telugu question and vice versa.

### Road Signs

Three sections (Mandatory / Cautionary / Informatory), 3-column grid of `SignTile`. Detail view: large SVG, name and meaning in both languages simultaneously *(this is the one place we show both at once — it aids recognition)*, then the questions that use it.

### Progress

Readiness card · attempt history list (date, score, pass/fail) · per-topic accuracy bars · `Practice weak areas` button · `Bookmarks` row. All computed on-device.

### Guide · Settings · About

Guide: accordion sections with a `Verified 21 Sep 2026` caption on every fee and rule, plus a link out to the official portal. Settings: language, theme (System/Light/Dark), text size hint, reset progress (with confirm). About: version, content version, source attribution with the `aptransport.org` link, privacy policy link, and the non-affiliation `Banner`.

## 5. Accessibility — requirements, not aspirations

| Requirement | Spec |
|---|---|
| Tap targets | ≥ 48 × 48 dp; option rows 56 |
| Contrast | WCAG AA minimum. §2 verifies both foreground-on-`bg` **and** on-fill pairs; CI must assert both sets, not just the first |
| Dynamic type | Support OS scaling to **200%** with no clipping~~, especially Telugu~~ *[A1: any script]*. Test at max scale on every screen. |
| Screen readers | Every interactive element labelled in the **active language**. Options announce as *"Option 2 of 4: Give way"*. Timer announces at 50% and 10% remaining only — not every second. |
| Colour independence | Correct/incorrect always carry an icon and a text label, never colour alone |
| Reduce motion | Honoured; transitions degrade to cross-fade |
| Focus order | Follows visual order on every screen |

## 6. What we are deliberately not doing

No streaks that punish a missed day. No confetti or celebration animations. No mascot. No illustrations. No gradients. No drop shadows. No push notifications in v1. No "share your score" prompt. No rating prompt before the user has passed a mock test.

Every one of these is a thing competitors do, and every one of them makes a nervous 18-year-old's study session worse.
