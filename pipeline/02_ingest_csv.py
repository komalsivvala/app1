#!/usr/bin/env python3
"""
02_ingest_csv.py — ingest a consolidated question-bank CSV into canonical records.

This is an ALTERNATIVE front-end to 02_extract.py (which reads the official AP
PDFs directly). It exists because aptransport.org blocks automated retrieval, so
the bank reached us as a consolidated CSV instead.

It deliberately does NOT invent the fields the CSV lacks. Telugu is recorded as
absent, not machine-translated; sign artwork is recorded as absent, not faked.
05_validate.py then fails the relevant gates loudly. That is the intended
behaviour: the shortfall must be visible, not papered over.

    python3 pipeline/02_ingest_csv.py <csv> --out pipeline/build/records.json
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_content import (  # noqa: E402
    CATEGORY_TO_TOPIC,
    SIGN_REFERENCE,
    content_hash,
    sentence_case,
)

OPTION_COLS = ("Option A", "Option B", "Option C", "Option D")
KEY_TO_INDEX = {"A": 0, "B": 1, "C": 2, "D": 3}
REGISTRY = Path(__file__).resolve().parent / "signs.json"
TEXT_FIXES = Path(__file__).resolve().parent / "text-fixes.json"

# The official question for every sign is the same five words; the compiled CSV
# had to describe the sign in prose because it could not carry an image. With
# artwork restored, the stem goes back to the official wording and the prose
# becomes the image's accessibility text.
OFFICIAL_SIGN_STEM = "What does this sign mean?"


def alt_text(stem: str) -> str:
    import re
    return re.sub(r"\s+(means|indicates)\s*$", "", stem.strip(), flags=re.I).rstrip(" .:")


def load_sign_map() -> dict[str, str]:
    """CSV row ID -> sign ID, from the hand-authored registry."""
    if not REGISTRY.exists():
        return {}
    out: dict[str, str] = {}
    for sign in json.loads(REGISTRY.read_text(encoding="utf-8"))["signs"]:
        for src in sign["sourceIds"]:
            if src in out:
                raise ValueError(f"{src} is mapped to two signs")
            out[src] = sign["id"]
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv_path", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--source-label", default="", help="provenance label recorded on every record")
    args = ap.parse_args()

    with args.csv_path.open(encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.DictReader(fh))
    sign_map = load_sign_map()
    fixes: dict[str, dict[str, str]] = json.loads(TEXT_FIXES.read_text(encoding="utf-8"))["fixes"] if TEXT_FIXES.exists() else {}

    records, skipped = [], []
    restored = 0
    fixed = 0
    for row in rows:
        qid_src = (row.get("ID") or "").strip()
        category = (row.get("Category") or "").strip()
        topic = CATEGORY_TO_TOPIC.get(category)
        if topic is None:
            skipped.append({"id": qid_src, "reason": f"unmapped category {category!r}"})
            continue

        original_en = sentence_case((row.get("Question") or "").strip())
        options_en = [sentence_case((row.get(c) or "").strip()) for c in OPTION_COLS]
        key = (row.get("Correct Answer") or "").strip().upper()

        sign_id = sign_map.get(qid_src)
        text_en = original_en
        sign_alt = None
        previous_hash = None
        explanation_en = (row.get("Explanation") or "").strip()
        fix = fixes.get(qid_src)
        if fix is not None:
            fixed += 1
            if "explanation" in fix:
                explanation_en = fix["explanation"]
            if "question" in fix:
                # A deliberate stem rewrite: carry the ID across (see below).
                previous_hash = content_hash(topic, original_en, options_en, sign_id)
                text_en = fix["question"]
        if sign_id is not None:
            # The identity of the question changes with its stem, so the ID would
            # too. previousContentHash lets 06_emit carry the ID across THIS
            # deliberate rewrite — and only this one: an accidental edit to the
            # CSV carries no previous hash and is flagged by G-IDSTABLE.
            previous_hash = content_hash(topic, original_en, options_en)
            text_en = OFFICIAL_SIGN_STEM
            sign_alt = alt_text(original_en)
            restored += 1

        records.append(
            {
                # Provenance from the source file, never used to build the ID.
                "sourceId": qid_src,
                "sourceCategory": category,
                "topic": topic,
                "contentHash": content_hash(topic, text_en, options_en, sign_id),
                "previousContentHash": previous_hash,
                # en is populated; te is explicitly absent, never invented.
                "text": {"en": text_en, "te": None},
                "options": [{"en": o, "te": None} for o in options_en],
                "answerIndex": KEY_TO_INDEX.get(key),
                "answerKeyRaw": key,
                "explanation": {"en": explanation_en, "te": None},
                # No statute section is cited unless it has been checked on
                # indiacode.nic.in. The CSV's Source column is provenance, not
                # a verified section reference, so legalRef stays null.
                "legalRef": None,
                "signId": sign_id,
                "signAlt": None if sign_alt is None else {"en": sign_alt, "te": None},
                "needsSignImage": bool(SIGN_REFERENCE.search(text_en)),
                "provenance": {
                    "source": (row.get("Source") or "").strip(),
                    "status": (row.get("Status") or "").strip(),
                    "confirmedIn": (row.get("Confirmed In") or "").strip(),
                    "label": args.source_label,
                },
            }
        )

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(records, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    by_topic: dict[str, int] = {}
    for r in records:
        by_topic[r["topic"]] = by_topic.get(r["topic"], 0) + 1

    print(f"ingested {len(records)} records from {args.csv_path.name} -> {args.out}")
    for t, n in sorted(by_topic.items()):
        print(f"   {t:<30} {n:>4}")
    print(f"   sign questions restored to the official stem: {restored}")
    print(f"   text fixes applied (pipeline/text-fixes.json): {fixed}")
    if skipped:
        print(f"\n  ⚠ skipped {len(skipped)}:")
        for s in skipped[:10]:
            print(f"      {s['id']}: {s['reason']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
