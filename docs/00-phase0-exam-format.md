# Phase 0 — Exam format research & the source-access blocker

**Date:** 20 Sep 2026 · **Status:** Reported; §1 and §5 partly SUPERSEDED

> **Update — a dataset arrived after this was written.** `docs/07-content-assessment.md` §5
> carries a department-page-confirmed format for **Telangana**, which publishes the identical
> bank. It resolves the pass-mark question below in favour of **12**, and casts doubt on the
> per-question timing model. Read that section alongside this one.
**Deliverables:** `src/content/exam-config.json`, `src/content/exam-config.schema.json`, gate `G-CONFIG`

---

## 0. Read this first — the content pipeline is blocked

**I cannot reach `aptransport.org` from this environment.** Nor any other government
domain. This session's egress proxy returns a policy denial (`403` to `CONNECT`) for
every one of them:

| Domain | Needed for | Result |
|---|---|---|
| `www.aptransport.org` | **The six question-bank PDFs — the entire content strategy** | ❌ blocked |
| `aptransport.org` | same | ❌ blocked |
| `sarathi.parivahan.gov.in` | Live test format (T1) | ❌ blocked |
| `parivahan.gov.in` | LL FAQ, format | ❌ blocked |
| `transport.ap.gov.in` | AP portal, fees | ❌ blocked |
| `indiacode.nic.in` | **Verifying every `legalRef` citation** | ❌ blocked |
| `morth.nic.in` | MV Act / CMVR | ❌ blocked |
| `web.archive.org` | Any cached copy of the above | ❌ blocked |

Two independent fetch paths were tried (direct HTTPS through the session proxy, and the
sandboxed `WebFetch` tool). Both are denied at the network layer. Per the proxy's own
operating rules a policy denial must be reported rather than retried or routed around,
so I have not attempted any workaround.

**What still works:** web *search* (different backend), and the npm and PyPI registries.
So the app, the pipeline code, and the tests can all be built here. Only the **source
PDFs** are out of reach.

### What this costs, concretely

| Blocked | Consequence |
|---|---|
| The six PDFs | M1 (the content pipeline) cannot produce real output here. The `G-TELUGU` day-2 gate — *the decision the whole project hangs on* — cannot be run. |
| `indiacode.nic.in` | No `legalRef` can be verified, so under your own rule every one ships `null`. Explanations are still writable; only the statute citations are affected. |
| Live portal | T1 (real exam parameters) stays unresolved, exactly as anticipated. Your RTO visit was always the answer here. |

### What I need from you — pick one

1. **Allow the domains.** Add `aptransport.org` and `indiacode.nic.in` to this
   environment's egress allow-list. Everything then runs unmodified. *Cleanest.*
2. **Hand me the PDFs.** Download the six yourself and drop them in `pipeline/raw/`.
   `01_download.py` already supports this (`--offline`): it skips the network, hashes
   whatever is on disk, and writes the same manifest, so the rest of the pipeline cannot
   tell the difference. *Fastest — needs no infra change.*
3. **Run the pipeline locally.** It is committed, dependency-pinned and re-runnable.
   Clone, `pip install -r pipeline/requirements.txt`, run it on your machine, commit the
   output.

Option 2 unblocks the critical path today. **Until one of these happens, no real question
ever enters the bundle** — and I will not manufacture stand-in content to keep the
schedule moving, because a fabricated answer key is precisely the failure mode this
project calls unforgivable.

---

## 1. Exam format — what I found

**Confidence is low, and lower than it looks.** Every gov source is blocked, so I could
not open a single primary page. What follows comes from *search-result summaries* of
secondary commercial sources (insurance aggregators, competitor RTO-exam sites) — exactly
the class of source the PRD notes is "often wrong about AP specifics". Treat all of it as
a lead to verify, not a finding.

### The numbers, and how badly they disagree

| Claim | Questions | To pass | % | Where it came from |
|---|---|---|---|---|
| A | 20 | 12 | 60% | Your appendix; widely repeated pan-India |
| B | 15 | 12 | **80%** | Sarathi-portal-focused sources |
| C | **20** | **16** | **80%** | An AP-specific page (Tata AIG) |
| D | 15 | 9 | 60% | Pan-India blog |

Note what is actually going on here. **"12" appears in two rows meaning two different
things** — 12/20 (60%) and 12/15 (80%). The commonly-quoted "you need 12" is almost
certainly a number that has been copied between sites while losing its denominator. That
makes the widely-cited 12/20 figure *less* trustworthy than its ubiquity suggests, not
more.

**The pass percentage itself is contested — 60% vs 80% — and that matters more than the
question count.** A wrong count changes practice length. A wrong bar changes whether
someone walks into the RTO prepared. If the real bar is 16/20 and we train people to
12/20, the app actively under-prepares its users, which is the one thing it exists to
prevent.

**What partially rescues this:** the readiness rule is already `mean(last 5 mocks) ≥ 80%`
(`05-Data-Schema.md` §5). So the app's *advice* clears the strict reading even when the
*displayed* pass mark uses the lenient one. The pass mark drives the PASS/FAIL stamp on
the result screen; readiness drives "are you ready". They fail independently, and the
strict one is the one that counts. That is a genuine hedge, but it is luck, not design —
see the recommendation below.

### Timing

- **Per-question countdown, ~30 seconds** is the most consistent claim, and it matches
  the Sarathi platform generally. One source said 10–15 seconds; it was pan-India and
  unsupported elsewhere.
- One source computed "20 questions × 30s = 20 minutes total", which is arithmetically
  wrong (that is 10 minutes) — a small but useful signal about the care level of these
  sources.
- `per-question` is also the *harder* mode to implement correctly and the harder one to
  practise against, so defaulting to it fails safe on both counts.

### Back navigation

**No source addresses it.** Not one. `allowBackNavigation: false` is an assumption taken
from the general Sarathi forward-only design. It is on the RTO checklist below.

### Topic mix

**Invented. No source states one.** `8 / 7 / 5` is a guess. For scale, the bank itself is
roughly 94 road-signs and 159 rules — so a bank-proportional paper would be nearer
*one third* road signs than the 40% we currently sample. This is a soft assumption:
wrong, it skews practice emphasis, but it cannot make an answer wrong.

### Fees — corroborated, still needs a date

₹150 application + ₹50 test = **₹200** was consistent across several sources, matching
your appendix. LL validity 6 months and the 30-day wait before the DL test were also
consistent. These go into the guide data file with a `lastVerified` date and a link out,
per R10 — never as bare numbers.

---

## 2. What I am confident in vs. guessing

**Reasonably confident** (multiple independent sources agreeing, and consistent with how
the Sarathi platform works nationally):

- Computer-based MCQ test at the RTO, 4 options per question.
- A per-question countdown of roughly 30 seconds.
- Pass bar somewhere in 60–80%; a retest is permitted after a wait.
- Fees ≈ ₹150 + ₹50; LL valid 6 months; 30-day wait before the DL test.

**Guessing — do not ship as fact:**

- Exact question count (15 or 20).
- Exact pass mark (**60% or 80%** — the important one).
- Exact seconds per question.
- Whether back-navigation is allowed (*no evidence at all*).
- The topic mix (*fabricated by me; no source offers one*).

**Cannot be established remotely at any confidence:** all of the above. The AP Transport
department does not publish the live test parameters, and the portal is blocked. Your RTO
visit is not a belt-and-braces double-check — it is the only real source.

---

## 3. Take this to the RTO

The one artifact that closes T1. Ten minutes of attention during the real test.

| # | Question | Config field | Currently |
|---|---|---|---|
| 1 | How many questions in the paper? | `questionCount` | `20` *(guess)* |
| 2 | How many correct to pass? Ask for the **number**, not the percentage. | `passMark` | `12` *(contested — could be 16)* |
| 3 | 🔴 **One clock for the paper, or a clock per question?** Telangana's confirmed format is **10 minutes for the whole paper** — check whether AP matches. **Highest-value question on this list.** | `timing.mode` | `per-question` *(now contradicted — see 07 §5)* |
| 4 | If per-question: how many seconds? Time one on your phone. | `timing.secondsPerQuestion` | `30` *(guess)* |
| 5 | **Can you go back to a previous question?** Try it. | `allowBackNavigation` | `false` *(no evidence)* |
| 6 | Is there a Skip button? | `allowSkip` | `false` *(guess)* |
| 7 | Do wrong answers lose marks? | `negativeMark` | `0` *(guess)* |
| 8 | Roughly how many were road-signs vs rules vs general? Tally as you go. | `sectionMix` | `8/7/5` *(invented)* |
| 9 | Does it show right/wrong during the test, or only at the end? | *(engine assumes end-only)* | end-only |
| 10 | What did you actually pay? | `guide.json` fees | ₹150 + ₹50 |

Then set `formatVerifiedOn` to the date of the visit. **Every one of these is a one-line
edit to `exam-config.json`.** No code changes. `npm run validate:config` will catch you
if an edit leaves the file internally inconsistent.

---

## 4. The config, and how it is guarded

`src/content/exam-config.json` ships exactly the shape in `05-Data-Schema.md` §2.3 /
`02-TRD.md` §5:

```json
{
  "questionCount": 20,
  "passMark": 12,
  "timing": { "mode": "per-question", "secondsPerQuestion": 30, "totalSeconds": null },
  "allowBackNavigation": false,
  "allowSkip": false,
  "negativeMark": 0,
  "sectionMix": { "road-signs": 8, "rules-of-road-regulations": 7, "general-driving-principles": 5 },
  "formatVerifiedOn": null
}
```

**`formatVerifiedOn` ships `null`, and that is load-bearing.** While null the pre-exam
screen must say the format is unconfirmed. The app never prints a verification date it
does not have.

### Two deliberate deviations from the original brief

The brief's sketch has since been superseded by the v2 specs, and I followed the specs:

- `negativeMarking: false` → **`negativeMark: 0`** (a number, per TRD §5). A boolean
  cannot express *how many* marks a wrong answer costs, and scoring is defined as
  `score = correct − (wrong × negativeMark)`.
- `showAnswerDuringExam` → **removed**. TRD §5 rules it out explicitly: the mock exam
  simulates, practice mode teaches. A flag with no defined UI is a flag that rots.

### Gate `G-CONFIG` — because a config-driven exam fails silently

A config the engine merely *reads* is a config a typo can quietly corrupt. So the file is
gated by `scripts/validate-exam-config.mjs` — zero dependencies, so it runs in CI before
`npm install` can fail, and before the app exists — enforcing what JSON Schema cannot:

- `sectionMix` sums to `questionCount` *(gate `G-MIX`, first half)*
- `passMark ≤ questionCount` — an unpassable exam
- the timing fields agree with `timing.mode` — **never two live clocks**
- `formatVerifiedOn` is null or a real, non-future ISO date
- unknown keys **fail** rather than being ignored — a `negativeMarking` typo would
  otherwise sit there looking effective while the engine ignored it
- a pass mark outside 60–80% *warns* without blocking

**22 tests cover it**, including the most likely real edit — *"the RTO said 15 questions"*
— which correctly fails until `sectionMix` is updated to match:

```
$ node scripts/validate-exam-config.mjs
G-CONFIG PASS — 20 questions, 12 to pass (60%), per-question,
  UNVERIFIED (formatVerifiedOn: null — app must say so on the pre-exam screen)
```

---

## 5. One recommendation — ~~consider `passMark: 16`~~ WITHDRAWN

> **Withdrawn 20 Sep 2026.** `LLR_State_Profiles.csv` reports Telangana — which publishes the
> identical three-part bank — as **20 questions, 12 to pass, confirmed on the department's own
> FAQ page**. That is far stronger evidence than the single secondary source behind claim C,
> so **keep `passMark: 12`**. AP's own threshold is still listed as "12 or 16 — confirm at your
> RTO", so item 2 of the checklist stands. The original reasoning is kept below because the
> asymmetry argument still applies to any value that remains unconfirmed.

~~**Consider shipping `passMark: 16` rather than `12` until you have stood in the RTO.**~~

The two errors are not symmetric:

- Bar set **too high** → the user over-prepares, and passes.
- Bar set **too low** → the user sees "PASSED" on a score that fails the real test, stops
  studying, and loses the fee and the day. That is the exact harm this app exists to
  prevent.

Against that: 12/20 is what your own docs specify, and C (16/20) rests on a single
secondary source. So I have **shipped `12` as specified** rather than quietly overriding
you — but the asymmetry is real, it is a one-line change, and the choice is yours. The
80% readiness rule already hedges the *advice*; this is only about the PASS/FAIL stamp.

---

## 6. Assumptions ledger

Everything below is a guess until item 1 of §3 is done. Nothing here is hardcoded;
all of it is one line of `exam-config.json`.

| # | Assumption | Basis | Blast radius if wrong |
|---|---|---|---|
| A1 | 20 questions | Most-cited for AP | Practice length |
| A2 | 12 to pass (60%) | ✅ **Corroborated** — Telangana dept FAQ, same bank | Much reduced. AP's own figure still unconfirmed |
| A3 | Per-question timer | 🔴 **Contradicted** — Telangana confirms 10 min whole-paper | Wrong pressure; different engine path |
| A4 | 30s per question | Likely the *average* implied by 20 × 30 s = 10 min, restated as a countdown | Wrong pressure |
| A5 | No back navigation | Sarathi convention — **no direct evidence** | Simulation fidelity |
| A6 | No skip | Follows A5 | Minor |
| A7 | No negative marking | No source mentions any | Scoring |
| A8 | Mix 8/7/5 | **Invented — no source** | Practice emphasis |
| A9 | Answers shown only at end | TRD decision; standard | Simulation fidelity |
| A10 | ₹150 + ₹50 | Several sources agree | Guide only; carries `lastVerified` |
| A11 | Telugu and English PDFs share numbering | Your appendix | **Still untested — the supplied dataset has no Telugu at all (07 §2)** |
| A12 | PDFs are text, not scans | Your appendix | Determines whether OCR is mandatory |

A11 and A12 are unverifiable until the PDFs are in hand — see §0.

---

## Sources

None of these could be opened directly; all were read as search-result summaries.

- [AP Transport — LLR question bank](https://www.aptransport.org/html/llr-question-bank.html) *(blocked; the intended primary source)*
- [Parivahan — LL related services FAQ](https://parivahan.gov.in/en/faq/learners-license-related-services) *(blocked)*
- [Tata AIG — Learning Licence Andhra Pradesh](https://www.tataaig.com/motor-insurance/two-wheeler-insurance/learning-licence-andhra-pradesh) *(claim C: 16/20)*
- [Ackodrive — Learning Licence in Andhra Pradesh](https://ackodrive.com/driving-license/learning-licence-in-andhra-pradesh/)
- [GoDigit — Driving licence test questions](https://www.godigit.com/traffic-rules/driving-licence-test-questions)
- [Nirmaan Software — RTO exam passing marks](https://nirmaansoftware.com/rto-exam/blog/rto-exam-passing-marks-rules.html) *(claims B and D)*
- [SBI General — DL fees in Andhra Pradesh](https://www.sbigeneral.in/blog/motor-insurance/rto/rto-fees-driving-licence-andhra-pradesh) *(fees)*
- [BankBazaar — Learner's Licence in AP](https://www.bankbazaar.com/driving-licence/how-to-apply-learning-licence-in-ap.html) *(fees)*
