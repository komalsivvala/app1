#!/usr/bin/env python3
"""
06_emit.py — assign stable IDs and emit the shippable content bundle.

The important job here is NOT formatting JSON. It is ID stability.

question_stats and bookmarks reference question IDs. If a re-run renumbers
questions, every user's history silently reattaches to the wrong question —
a failure with no error message and no way for a user to notice. So IDs come
from a content hash looked up in pipeline/id-map.json, never from position and
never from the official question number. A new ID is minted only for a question
whose hash has never been seen; a retired ID is never reused.

    python3 pipeline/06_emit.py --records pipeline/build/records.json
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_content import TOPIC_PREFIX, TOPICS  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PIPELINE = Path(__file__).resolve().parent
ID_MAP = PIPELINE / "id-map.json"


def rel(path: Path) -> str:
    """Repo-relative when possible; absolute otherwise (e.g. a temp dir in tests)."""
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def load_id_map() -> dict:
    if ID_MAP.exists():
        return json.loads(ID_MAP.read_text(encoding="utf-8"))
    return {"note": "content hash -> stable question ID. Never edit by hand; never reuse a retired ID.",
            "assigned": {}, "retired": []}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--records", type=Path, default=PIPELINE / "build" / "records.json")
    ap.add_argument("--out", type=Path, default=PIPELINE / "build" / "questions.v1.json")
    ap.add_argument("--content-version", default=datetime.now(timezone.utc).strftime("%Y.%m.1"))
    ap.add_argument(
        "--allow-english-only",
        action="store_true",
        help="emit with te omitted. Needs a PRD amendment; the bundle records languages:['en'] so the app cannot silently render blank Telugu.",
    )
    ap.add_argument("--dry-run", action="store_true", help="do not write id-map.json or the bundle")
    args = ap.parse_args()

    records = json.loads(args.records.read_text(encoding="utf-8"))
    id_map = load_id_map()
    assigned: dict[str, str] = dict(id_map.get("assigned", {}))

    has_te = any((r["text"].get("te") or "").strip() for r in records)
    if not has_te and not args.allow_english_only:
        print("✗ no record carries Telugu, and --allow-english-only was not passed.", file=sys.stderr)
        print("  Bilingual content is listed as never-cuttable in 01-PRD.md §6.", file=sys.stderr)
        print("  Refusing to emit a bundle that silently drops a required language.", file=sys.stderr)
        return 1

    # Highest existing serial per topic, so a new question never collides with
    # a retired ID.
    next_serial = {t: 0 for t in TOPICS}
    for qid in list(assigned.values()) + list(id_map.get("retired", [])):
        prefix, _, num = qid.rpartition("-")
        for topic, p in TOPIC_PREFIX.items():
            if p == prefix and num.isdigit():
                next_serial[topic] = max(next_serial[topic], int(num))

    minted, reused = 0, 0
    questions = []
    for r in records:
        h = r["contentHash"]
        if h in assigned:
            qid = assigned[h]
            reused += 1
        else:
            next_serial[r["topic"]] += 1
            qid = f"{TOPIC_PREFIX[r['topic']]}-{next_serial[r['topic']]:03d}"
            assigned[h] = qid
            minted += 1

        q = {
            "id": qid,
            "topic": r["topic"],
            "signId": r.get("signId"),
            "text": {"en": r["text"]["en"]},
            "options": [{"en": o["en"]} for o in r["options"]],
            "answerIndex": r["answerIndex"],
            "explanation": {"en": r["explanation"]["en"]},
            "legalRef": r.get("legalRef"),
            "provenance": r["provenance"],
        }
        if has_te:
            q["text"]["te"] = r["text"]["te"]
            for i, o in enumerate(r["options"]):
                q["options"][i]["te"] = o["te"]
            q["explanation"]["te"] = r["explanation"]["te"]
        questions.append(q)

    bundle = {
        "schemaVersion": 1,
        "contentVersion": args.content_version,
        "languages": ["en", "te"] if has_te else ["en"],
        "sourceAttribution": "Question bank published by the Transport Department, Government of Andhra Pradesh",
        "sourceUrl": "https://www.aptransport.org/html/llr-question-bank.html",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "questions": questions,
        "signs": [],
    }

    if args.dry_run:
        print(f"[dry-run] would emit {len(questions)} questions ({minted} new IDs, {reused} reused)")
        return 0

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(bundle, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    id_map["assigned"] = assigned
    id_map.setdefault("retired", [])
    ID_MAP.write_text(json.dumps(id_map, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"emitted {len(questions)} questions -> {rel(args.out)}")
    print(f"   languages : {bundle['languages']}")
    print(f"   IDs       : {minted} newly minted, {reused} reused from id-map.json")
    print(f"   id-map    : {len(assigned)} total mappings -> {rel(ID_MAP)}")
    if not has_te:
        print("\n   ⚠ ENGLISH-ONLY BUNDLE. languages:['en'] is recorded so the app can refuse")
        print("     to offer a Telugu toggle it cannot honour. This needs a PRD amendment.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
