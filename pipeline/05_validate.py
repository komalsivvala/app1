#!/usr/bin/env python3
"""
05_validate.py — the content gates from 02-TRD.md §4.

Every gate is either BLOCKING (a violation quarantines the record, or fails the
build outright) or ADVISORY. Quarantined records are written to
reports/needs_review.json and are excluded from anything that ships.

The rule this file exists to enforce: a 220-question bank we trust beats a
260-question bank with 40 wrong keys. A wrong answer key costs a real person a
real fee and a real day off work.

    python3 pipeline/05_validate.py --records pipeline/build/records.json
"""

from __future__ import annotations

import argparse
import collections
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_content import TOPICS, norm_text, shipped_languages, telugu_ratio  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
REPORTS = Path(__file__).resolve().parent / "reports"
EXAM_CONFIG = ROOT / "src" / "content" / "exam-config.json"

TELUGU_MIN_RATIO = 0.90


class Gate:
    def __init__(self, gid: str, desc: str, blocking: bool = True):
        self.id, self.desc, self.blocking = gid, desc, blocking
        self.violations: list[dict] = []

    def fail(self, record_id: str | None, detail: str) -> None:
        self.violations.append({"record": record_id, "detail": detail})

    @property
    def passed(self) -> bool:
        return not self.violations


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--records", type=Path, default=ROOT / "pipeline" / "build" / "records.json")
    ap.add_argument("--strict", action="store_true", help="exit non-zero if any blocking gate fails")
    ap.add_argument(
        "--reports-dir", type=Path, default=REPORTS,
        help="where validation.json / needs_review.json are written. Tests point this at a temp dir so a "
             "scenario run never overwrites the real, committed reports.",
    )
    args = ap.parse_args()

    records = json.loads(args.records.read_text(encoding="utf-8"))
    config = json.loads(EXAM_CONFIG.read_text(encoding="utf-8"))
    langs = shipped_languages()
    lang_list = ", ".join(langs)

    gates = {
        g.id: g
        for g in [
            Gate("G-STRUCT", "exactly 4 non-empty options; answerIndex in 0..3"),
            Gate("G-BILINGUAL", f"non-empty text and all 4 options in every shipped language [{lang_list}]"),
            Gate("G-TELUGU", f">={TELUGU_MIN_RATIO:.0%} of letters in each te string are Telugu (U+0C00-U+0C7F)"),
            Gate("G-ASSET", "sign-dependent questions carry a signId, and that artwork exists"),
            Gate("G-DEDUP", "no two questions share (stem, signId, option set); no contradictory keys"),
            Gate("G-KEY", "answer key present and resolvable to a 0-based index"),
            Gate("G-MERGE", "cross-language parity; answer column agrees across languages (multi-language only)"),
            Gate("G-MIX", "each topic has enough shippable questions for its sectionMix slot"),
            Gate("G-IDSTABLE", "every previously-mapped ID is present or explicitly retired"),
            Gate("G-EXPLAIN", f"every question has an explanation in every shipped language [{lang_list}]", blocking=False),
            Gate("G-STEM", "questions sharing a stem but differing in options", blocking=False),
        ]
    }

    quarantined: dict[str, list[str]] = collections.defaultdict(list)

    def quarantine(rid: str, gate_id: str) -> None:
        """Only a BLOCKING gate removes a record from the shippable set."""
        if gates[gate_id].blocking:
            quarantined[rid].append(gate_id)

    # ---- per-record gates ------------------------------------------------
    seen_dedup: dict[tuple, tuple[str, str | None]] = {}
    shared_stem: dict[str, list[str]] = collections.defaultdict(list)
    for r in records:
        rid = r["sourceId"]

        # G-STRUCT
        opts = r["options"]
        if len(opts) != 4 or not all((o.get("en") or "").strip() for o in opts):
            gates["G-STRUCT"].fail(rid, f"expected 4 non-empty options, got {len(opts)}")
            quarantine(rid, "G-STRUCT")
        if not isinstance(r.get("answerIndex"), int) or not 0 <= r["answerIndex"] <= 3:
            gates["G-STRUCT"].fail(rid, f"answerIndex {r.get('answerIndex')!r} out of range")
            quarantine(rid, "G-STRUCT")

        # G-KEY
        if r.get("answerIndex") is None:
            gates["G-KEY"].fail(rid, f"answer key {r.get('answerKeyRaw')!r} did not resolve")
            quarantine(rid, "G-KEY")

        # G-BILINGUAL — every SHIPPED language, read from content-config.json.
        # With languages=["en"] this checks English only; add "te" and it
        # re-arms for Telugu with no code change.
        for lang in langs:
            missing = []
            if not (r["text"].get(lang) or "").strip():
                missing.append("text")
            for i, o in enumerate(opts):
                if not (o.get(lang) or "").strip():
                    missing.append(f"option{i + 1}")
            if missing:
                gates["G-BILINGUAL"].fail(rid, f"no {lang} for: {', '.join(missing)}")
                quarantine(rid, "G-BILINGUAL")

        # G-TELUGU (only meaningful where Telugu exists at all)
        for label, val in [("text", r["text"].get("te"))] + [
            (f"option{i + 1}", o.get("te")) for i, o in enumerate(opts)
        ]:
            if val:
                ratio = telugu_ratio(val)
                if ratio < TELUGU_MIN_RATIO:
                    gates["G-TELUGU"].fail(rid, f"{label}: only {ratio:.0%} Telugu letters - mojibake?")
                    quarantine(rid, "G-TELUGU")

        # G-ASSET
        if r.get("needsSignImage") and not r.get("signId"):
            gates["G-ASSET"].fail(rid, "text refers to a sign/figure but no signId is attached")
            quarantine(rid, "G-ASSET")

        # G-DEDUP — an MCQ's identity is its stem AND its option set, not its
        # stem alone. Keying on text alone would quarantine every road-sign
        # question (they all read "what does this sign mean?") and also the
        # several legitimate "in which of these places may you park?" variants,
        # which share a stem but offer different options and are different
        # questions. Options are compared as a set so a pure reordering still
        # counts as the same question.
        stem = norm_text(r["text"]["en"])
        opt_set = frozenset(norm_text(o.get("en") or "") for o in opts)
        key = (stem, r.get("signId"), opt_set)

        if key in seen_dedup:
            prior_id, prior_answer = seen_dedup[key]
            prior_correct = None if prior_answer is None else norm_text(prior_answer)
            this_correct = (
                None
                if not isinstance(r.get("answerIndex"), int) or not 0 <= r["answerIndex"] <= 3
                else norm_text(opts[r["answerIndex"]].get("en") or "")
            )
            if prior_correct != this_correct:
                # Far worse than a duplicate: the bank keys one question two
                # ways. Both copies are untrustworthy, so both are quarantined.
                gates["G-DEDUP"].fail(
                    rid,
                    f"CONTRADICTS {prior_id}: identical question, different correct answer "
                    f"({this_correct!r} vs {prior_correct!r})",
                )
                quarantine(rid, "G-DEDUP")
                quarantine(prior_id, "G-DEDUP")
            else:
                gates["G-DEDUP"].fail(rid, f"exact duplicate of {prior_id}: {r['text']['en'][:58]!r}")
                quarantine(rid, "G-DEDUP")
        else:
            correct_opt = (
                opts[r["answerIndex"]].get("en")
                if isinstance(r.get("answerIndex"), int) and 0 <= r["answerIndex"] <= 3
                else None
            )
            seen_dedup[key] = (rid, correct_opt)
            shared_stem[stem].append(rid)

        # G-EXPLAIN (advisory)
        for lang in langs:
            if not (r["explanation"].get(lang) or "").strip():
                gates["G-EXPLAIN"].fail(rid, f"no {lang} explanation")

    # ---- G-STEM (advisory) ----------------------------------------------
    # Not an error: the official bank really does ask "in which of these
    # places may you park?" three times with different options. Surfaced so
    # the Learn list can be checked for questions that look identical in a
    # truncated two-line row.
    for stem, ids in shared_stem.items():
        if len(ids) > 1:
            gates["G-STEM"].fail(None, f"{len(ids)} questions share the stem {stem[:52]!r}: {', '.join(ids)}")

    # ---- G-MERGE ---------------------------------------------------------
    # The join between languages only exists when there is more than one.
    # With a single shipped language there is nothing to merge and the gate
    # passes vacuously; the moment "te" is added it checks parity again.
    if len(langs) > 1:
        primary = langs[0]
        for lang in langs[1:]:
            have = sum(1 for r in records if (r["text"].get(lang) or "").strip())
            if have != len(records):
                gates["G-MERGE"].fail(None, f"{have} of {len(records)} records carry {lang}; {primary} has all {len(records)}")

    # ---- G-MIX (must run AFTER quarantine, which removes questions) ------
    shippable = [r for r in records if r["sourceId"] not in quarantined]
    by_topic = collections.Counter(r["topic"] for r in shippable)
    total_by_topic = collections.Counter(r["topic"] for r in records)

    mix = config["sectionMix"]
    if sum(mix.values()) != config["questionCount"]:
        gates["G-MIX"].fail(None, f"sectionMix sums to {sum(mix.values())}, questionCount is {config['questionCount']}")
    for topic in TOPICS:
        need, have = mix.get(topic, 0), by_topic.get(topic, 0)
        if have < need:
            gates["G-MIX"].fail(None, f"{topic}: {have} shippable but sectionMix needs {need}")
        elif have < need * 3:
            gates["G-MIX"].fail(None, f"{topic}: only {have} shippable for a {need}-question slot (<3x; papers will repeat)")

    # ---- G-IDSTABLE ------------------------------------------------------
    id_map_path = Path(__file__).resolve().parent / "id-map.json"
    if id_map_path.exists():
        id_map = json.loads(id_map_path.read_text(encoding="utf-8"))
        current = {r["contentHash"] for r in records}
        for h, assigned in id_map.get("assigned", {}).items():
            if h not in current and assigned not in id_map.get("retired", []):
                gates["G-IDSTABLE"].fail(assigned, "previously-mapped ID vanished and was not retired")
    else:
        gates["G-IDSTABLE"].fail(None, "pipeline/id-map.json does not exist yet (first run - will be created at emit)")

    # ---- report ----------------------------------------------------------
    reports_dir = args.reports_dir
    reports_dir.mkdir(parents=True, exist_ok=True)
    W = 74
    print("=" * W)
    print(f"CONTENT VALIDATION — {len(records)} records from {args.records.name}  |  languages: [{lang_list}]")
    print("=" * W)

    blocking_failed = []
    for g in gates.values():
        mark = "PASS" if g.passed else "FAIL"
        tag = "" if g.blocking else "  (advisory)"
        print(f"\n[{mark}] {g.id:<12} {g.desc}{tag}")
        if not g.passed:
            if g.blocking:
                blocking_failed.append(g.id)
            print(f"        {len(g.violations)} violation(s)")
            for v in g.violations[:4]:
                who = f"{v['record']}: " if v["record"] else ""
                print(f"          - {who}{v['detail']}")
            if len(g.violations) > 4:
                print(f"          … and {len(g.violations) - 4} more")

    print("\n" + "=" * W)
    print("SHIPPABLE AFTER QUARANTINE")
    print("=" * W)
    for topic in TOPICS:
        need = mix.get(topic, 0)
        have, tot = by_topic.get(topic, 0), total_by_topic.get(topic, 0)
        flag = "OK" if have >= need * 3 else ("THIN" if have >= need else "SHORT")
        print(f"  {topic:<30} {have:>4} of {tot:>4} ingested   (slot {need}) {flag}")
    print(f"  {'TOTAL':<30} {len(shippable):>4} of {len(records):>4} ingested")
    print(f"  quarantined: {len(quarantined)}")

    report = {
        "records": len(records),
        "shippable": len(shippable),
        "quarantined": len(quarantined),
        "byTopicShippable": dict(by_topic),
        "blockingGatesFailed": blocking_failed,
        "gates": {
            g.id: {"passed": g.passed, "blocking": g.blocking, "violations": len(g.violations)}
            for g in gates.values()
        },
    }
    (reports_dir / "validation.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    (reports_dir / "needs_review.json").write_text(
        json.dumps(
            {"quarantined": [{"id": k, "failedGates": v} for k, v in sorted(quarantined.items())]},
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    try:
        shown = reports_dir.relative_to(ROOT)
    except ValueError:
        shown = reports_dir
    print(f"\nreports -> {shown}/validation.json, needs_review.json")

    if blocking_failed:
        print(f"\n✗ {len(blocking_failed)} BLOCKING gate(s) failed: {', '.join(blocking_failed)}")
        print("  Nothing ships until these pass.")
        return 1 if args.strict else 0
    print("\n✓ all blocking gates passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
