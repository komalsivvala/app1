# Content assessment — the supplied CSV / PDF dataset

**Date:** 20 Sep 2026 · **Verdict:** structurally excellent; **shippable as English-only v1** (PRD Amendment A1, 21 Sep 2026)

> **Decision taken 21 Sep 2026:** v1 ships English-only. §2 below is kept as written because it is the record of *why*; the gates now pass under `--strict` because `src/content/content-config.json` lists `["en"]`. Adding `"te"` re-arms every Telugu check.
**Tested with:** `pipeline/02_ingest_csv.py` → `05_validate.py` → `06_emit.py`, plus `pipeline/test_pipeline.py`

---

## 1. What arrived

| File | Rows | Verdict |
|---|---|---|
| `LLR_Andhra_Pradesh.csv` | 277 | **Use this one.** State-filtered, AP-correct answers |
| `LLR_Telangana.csv` | 277 | **Byte-identical to the AP file** (same md5) — not a second source |
| `LLR_Master_All_India.csv` | 440 | ⚠️ **Do not ship for AP** — see §4 |
| `LLR_State_Profiles.csv` | 36 | Format/fees reference. Contains a major Phase 0 finding — see §5 |
| `LLR_Question_Bank_StateWise.pdf` | 82 pp | Provenance, conflict register, category coverage |

## 2. ~~The blocker~~ Resolved by A1: there is no Telugu

**0 Telugu codepoints across all 119,277 characters of the dataset.** Every file is English-only.

Bilingual content is listed as **never-cuttable** in `01-PRD.md` §6, and it is the product's main
competitive claim ("Genuine Telugu, free"). So the gates fail exactly as designed:

```
$ .venv/bin/python pipeline/05_validate.py
[FAIL] G-BILINGUAL  277 violations — no Telugu for: text, option1..4
[FAIL] G-MERGE      0 of 277 records carry Telugu — there is no join to verify
  road-signs                   0 of  91 shippable  (slot 8) SHORT
  TOTAL                        0 of 277
```

Set Telugu aside and **everything else passes**:

```
$ .venv/bin/python pipeline/05_validate.py --allow-english-only
  road-signs                  91 of  91  (slot 8)  OK
  rules-of-road-regulations  108 of 108  (slot 7)  OK
  general-driving-principles  78 of  78  (slot 5)  OK
  TOTAL                      277 of 277     quarantined: 0
```

Every topic clears **3× its sectionMix slot**, so papers will not repeat. The data is good. It is
just monolingual.

**`06_emit.py` refuses to emit without `--allow-english-only`**, and when forced it records
`languages: ["en"]` in the bundle so the app cannot offer a Telugu toggle it can't honour.

### The three ways out

1. **Get the Telugu PDFs.** `aptransport.org` publishes the same bank in Telugu with matching
   question numbers. Unblock that domain, or hand over the three Telugu PDFs, and `04_merge.py`
   joins them on `(topic, officialQNo)`. **This restores the original plan intact.**
2. **Ship English-only v1, Telugu v1.1.** This is the pre-agreed fallback in
   `06-Implementation-Plan.md` §10. It needs a deliberate PRD amendment — it drops G3 and a
   launch criterion — and it abandons the differentiator for the primary persona (Ravi reads
   Telugu comfortably, English haltingly).
3. **Translate.** Explicitly forbidden: *"Never machine-translate."* Human translation of 277 × 6
   strings is weeks and a budget.

**Recommendation: option 1.** The Telugu already exists, published, free, officially sanctioned,
with matching numbering. Everything else is a worse version of getting it.

## 3. Provenance — read this before claiming "the official AP bank"

**0 of 277 rows cite an Andhra Pradesh source.** Every row cites Telangana, Delhi, Maharashtra or
central statute. The PDF explains why, and hit the same wall we did:

> "Transport Department, Government of Telangana — LLR Question Bank … Road Signs (94), Rules of
> Road Regulations (159), General Driving Principles (159). **Andhra Pradesh publishes the same
> bank at aptransport.org, whose pages block automated retrieval.**"

Two things make the substitution defensible, and one thing limits it:

- ✅ The Telangana part-sizes — **Road Signs 94, Rules of Road Regulations 159** — match the counts
  in our own brief for the AP bank exactly. AP and Telangana were one state until 2014.
- ✅ Our ingest maps the 12 source categories onto the three official AP parts and lands on
  **91 road-signs**, against the real bank's 94. Independent corroboration.
- ⚠️ But it remains **inference, not verification.** Nobody has diffed AP's PDFs against
  Telangana's.

**Store-listing consequence.** Until the AP PDFs are actually checked, the app must not say
"built from the official AP question bank". The accurate claim is *"built from the Telangana
Transport Department's published LLR question bank, which Andhra Pradesh publishes in the same
three parts"* — with the `aptransport.org` link still cited, as Play requires. Overclaiming here
is both a store-compliance risk and an honesty problem.

**Wording is normalised, not verbatim.** The PDF states: *"Wording has been normalised into plain
English so that one entry covers the variants used in different states."* So these are faithful
restatements, not the department's exact sentences. Fine for study; it just means the phrasing a
user meets at the RTO will differ.

**`Status` is a confidence signal, not a warning.** 112 rows are marked `Frequently Asked`; these
are questions found in **two** official banks, which is stronger provenance, not weaker. (An
earlier reading of mine had this backwards.) The split: 140 `Official` (TG bank), 112
`Frequently Asked` (TG + Delhi), 25 `Government-derived` (statute).

## 4. Use the AP file, not the master

The master's extra 163 rows include the **Delhi and Maharashtra sides of the conflict register** —
answers that are wrong for an AP candidate:

| Master row | Keys | Correct for AP? |
|---|---|---|
| `Q417` ambulance number | **102** | ❌ AP keys **108** (present in the AP file as `Q274`) |
| `Q410` supervising a learner | **approved instructor** | ❌ AP keys any permanent licence holder (`Q309`) |
| `Q166` LMV maximum speed | **60 km/h, "under the Delhi bank"** | ❌ Delhi-specific |

The AP file was checked against every conflict-register item and **carries AP's answer every
time** — Q123 keys *wait for green* (not Delhi's), Q274 keys *108* (not Maharashtra's 102), Q309
keys *any permanent licence holder*, Q310 keys the **post-2019 ₹10,000** figure rather than the
stale pre-2019 one still in the Delhi and Maharashtra banks. The state filtering is genuinely
well done.

## 5. 🔴 Major Phase 0 update — the timing model is probably wrong

`LLR_State_Profiles.csv` says of **Telangana** — same bank, same three parts, same four options:

> "20 questions drawn at random, **12 correct to pass, 10 minutes total**. **Confirmed on the
> department's own FAQ page.**"

This is the first *confirmed-on-a-department-page* format in the whole project, and it moves two
of my Phase 0 assumptions:

- ✅ **A2 (pass mark) is much safer than I reported.** 20 questions / 12 to pass / 60% now has
  department-page confirmation for the state publishing the identical bank. My suggestion to
  consider `passMark: 16` is **withdrawn**; keep `12`. AP's own threshold is still listed as
  "12 or 16 — confirm at your RTO", so it stays on the checklist, but the balance of evidence has
  shifted decisively.
- 🔴 **A3 (timing) is probably wrong.** We ship `per-question`, 30 s each. Telangana's confirmed
  format is **10 minutes for the whole paper** — that is `whole-paper`, `totalSeconds: 600`.

And notice: **20 × 30 s = 600 s = 10 minutes.** The "30 seconds per question" that every secondary
source repeats is almost certainly the *average* implied by a 10-minute whole-paper limit, restated
as if it were a per-question countdown. That single arithmetic identity explains the confusion in
the Phase 0 sources.

The two modes behave differently: whole-paper lets a candidate spend 60 s on a hard question and
10 s on an easy one; per-question forbids it.

**Config left at `per-question` deliberately, for you to decide.** Per-question is the harsher
regime, so training against it cannot under-prepare anyone — whereas if the real test is
per-question and we train whole-paper, users meet pressure they have never rehearsed. That
asymmetry outweighs the better evidence for now. It is a one-line change:

```json
"timing": { "mode": "whole-paper", "secondsPerQuestion": null, "totalSeconds": 600 }
```

`G-CONFIG` enforces that both fields move together, and this is now item 3 on the RTO checklist.

## 6. ~~The sign-image problem is not solved, only relocated~~ Resolved at M4 — all 68 signs redrawn as SVG, stems restored, IDs preserved

**67 of 83 Traffic Signs questions (81%) describe the sign in words** instead of showing it:

> `Q007.` *A blue rectangle with a white arrow means…*
> `Q006.` *A red circle with a horizontal white bar means…*

The PDF is candid about it: *"Sign questions describe the sign in words, because the real test
shows an image with no descriptive text and images cannot be reproduced here."*

That is a real fidelity gap in the flagship feature. The mock exam exists to be indistinguishable
from the real test; decoding "a red circle with a horizontal white bar" is a **different cognitive
task** from recognising the No Entry sign at a glance. Road signs are also the largest slot —
**8 of 20 questions, 40% of every paper.**

The good news: this is the SVG-redraw path from the original plan, and the descriptions are an
unusually precise drawing spec. "A red circle with a horizontal white bar" is unambiguously
No Entry. So the work is: draw ~67 SVGs against the standard Indian sign set, re-point each
question at its `signId`, and restore the stem to *"What does this sign mean?"*.

Until then `G-ASSET` passes only because no question claims to have an image — the CSV's
descriptive phrasing means nothing renders blank. That is a technically-clean pass hiding a
product gap, which is why it is written down here.

## 7. Everything that passed

| Check | Result |
|---|---|
| `G-STRUCT` — 4 non-empty options, key in range | ✅ 277/277 |
| `G-KEY` — key resolves to a 0-based index | ✅ 277/277 |
| `G-DEDUP` — no duplicates, no contradictory keys | ✅ clean |
| `G-MIX` — every topic ≥ 3× its slot | ✅ 91/108/78 vs 8/7/5 |
| `G-IDSTABLE` — IDs survive a re-run | ✅ 21 pipeline tests |
| Conflict-register items carry AP's answer | ✅ 4/4 |
| Factual spot-check | ✅ see below |
| Explanations present | ✅ 277/277 (English) |
| State-name leakage into a question stem | ✅ reworded via `pipeline/text-fixes.json`; gate `G-FRAMING` |

**Factual spot-check.** Speed limits, ages and validity periods were checked against the statutes:
25 km/h passing a procession and near road workers (RRR 1989 **Reg 27**), 24 km/h towing a disabled
vehicle (**Reg 20(4)**), the 2018 MoRTH M1 figures (120 expressway / 100 four-lane / 70 municipal),
LL validity 6 months, DL renewal grace 30 days, minimum car-licence age 18. **All correct**, and
the explanations cite the right regulation. This is careful work.

**Answer-key distribution** is skewed — A 27.8%, B 31.4%, C 26.4%, **D 14.4%**. Not an extraction
error (D is usually "None of these"), but worth knowing: a candidate guessing B would beat chance.
Faithful to the source, so we keep it.

## 8. Two bugs this testing found in our own pipeline

Both were in code written before the data arrived, and both were invisible until real content ran
through:

1. **`G-DEDUP` keyed on the question stem alone**, following the TRD literally. The official bank
   asks *"In which of these places may you park your vehicle?"* **three times with three different
   option sets** — three genuinely different questions. The gate quarantined two of them as
   duplicates. The key is now `(stem, signId, option set)`, and a repeated stem with *different*
   options is reported by a new advisory gate `G-STEM` instead of being thrown away.

2. **`content_hash` had the same flaw, and it was worse.** Hashing `(topic, stem)` gave all three
   parking questions **one ID**: 277 questions emitted only **275 IDs**. Bookmarking one would have
   bookmarked all three and their stats would have merged permanently — silently, with no error,
   which is precisely the failure `G-IDSTABLE` exists to prevent. The hash now includes the sorted
   option set.

   The accepted cost: correcting a typo in an option mints a new ID and resets that question's
   counters. That is the safer failure — losing one question's counters beats merging three
   questions' history forever — and `id-map.json` carries a retire path for corrections that must
   keep their history.

`pipeline/test_pipeline.py` now proves the property directly: a re-run reuses every ID, an upstream
insertion at position 1 shifts nothing, and cosmetic reformatting mints nothing.

## 9. What I need from you

1. ~~**Telugu — pick a path (§2).**~~ **Decided: English-only v1 (PRD A1).** Telugu is v1.1;
   option 1 (the AP Telugu PDFs) is still the route there.
2. **Timing — `per-question` or `whole-paper` 600 s (§5)?** One line either way.
3. **Confirm: use `LLR_Andhra_Pradesh.csv`, not the master (§4).**
4. **Accept the store-listing wording change (§3)** — "Telangana's published bank, which AP
   publishes in the same three parts", not "the official AP bank", until the AP PDFs are checked.
5. ~~**Sign SVGs (§6)** — schedule ~67 redraws, or accept a mock exam that is 40% word-descriptions.~~ **Done at M4:** 68 signs drawn (`docs/screenshots/signs-*.png`), every sign question shows its artwork with the official stem.

## 10. Explanation audit (M6)

All 277 explanations were read against their question, key and distractors at M6, in
topic order. The plan's "write a 2–3 sentence explanation for every question" was already
satisfied by the dataset (277/277, median 75 characters), so M6 was an **audit, not a
rewrite** — the app must not invent content, and an explanation the candidate can check
against the statute is worth more than a longer one.

| Check | Result |
|---|---|
| Explanation contradicts the key, or merely restates the answer | **0** |
| Explanation under 30 characters | **0** (shortest: 31) |
| Compilation framing inside an explanation | **1** — `rrr-086` ended "…older state banks still show the pre-2019 figure". Removed via `pipeline/text-fixes.json` (Q310); `G-FRAMING` now covers explanations too, with a narrower rule than for stems: an explanation may name Andhra Pradesh (it is the AP app), never another state or "the bank" |
| Position-dependent options ("All of the above", "None of these", "Both B and C") | **21**, all correct: every "…of the above" is option D, and `gdp-065`'s "Both B and C" names options B and C, which exist and precede it. The app shows options in bank order and never shuffles; new blocking gate **`G-POSITION`** keeps it that way |
| Statute citations quoted in explanation text | **63** (47 distinct: Regulations 2–31 of the Rules of the Road Regulations 1989, Sections 3–199A of the MV Act 1988). They arrived with the dataset and read consistently with the questions; **none could be verified against `indiacode.nic.in` from this environment**, so `legalRef` stays `null` for all 277 and the numbers appear only inside prose, as supplied |
| Wording nits | `rs-022` (height limit): "It warns of a low structure" describes a mandatory sign as a warning. Meaning is clear; left as supplied, noted for the content owner |

**What the audit does not claim.** Nothing here confirms a regulation number is right. When
`indiacode.nic.in` is reachable, the 47 citations above are the list to check, and each
confirmed one becomes a `legalRef` (`05-Data-Schema.md` §2) rather than a sentence.
