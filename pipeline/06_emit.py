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
from lib_content import TOPIC_PREFIX, TOPICS, load_content_config, shipped_languages  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
PIPELINE = Path(__file__).resolve().parent
ID_MAP = PIPELINE / "id-map.json"
SIGNS_BUILD = PIPELINE / "build" / "signs.json"
SIGN_ART_DIR = ROOT / "src" / "content" / "signs"


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
    ap.add_argument("--content-version", default=None, help="override content-config.json contentVersion (tests only)")
    ap.add_argument("--dry-run", action="store_true", help="do not write id-map.json or the bundle")
    ap.add_argument("--ts-out", type=Path, default=None, help="also emit a typed TS module here (src/content/questions.ts)")
    args = ap.parse_args()

    records = json.loads(args.records.read_text(encoding="utf-8"))
    id_map = load_id_map()
    assigned: dict[str, str] = dict(id_map.get("assigned", {}))

    langs = shipped_languages()
    content_version = args.content_version or load_content_config()["contentVersion"]

    # The validator should already have quarantined these, but emit is the
    # last line of defence: a bundle must never leave here with a shipped
    # language missing from any record.
    short = [
        (r["sourceId"], lang)
        for r in records
        for lang in langs
        if not (r["text"].get(lang) or "").strip()
        or any(not (o.get(lang) or "").strip() for o in r["options"])
    ]
    if short:
        print(f"✗ {len(short)} record/language pair(s) lack a SHIPPED language: {short[:5]}…", file=sys.stderr)
        print("  content-config.json says every question must carry: " + ", ".join(langs), file=sys.stderr)
        print("  Either supply the content or remove the language from the config (a PRD amendment).", file=sys.stderr)
        return 1

    # Highest existing serial per topic, so a new question never collides with
    # a retired ID.
    next_serial = {t: 0 for t in TOPICS}
    for qid in list(assigned.values()) + list(id_map.get("retired", [])):
        prefix, _, num = qid.rpartition("-")
        for topic, p in TOPIC_PREFIX.items():
            if p == prefix and num.isdigit():
                next_serial[topic] = max(next_serial[topic], int(num))

    minted, reused, remapped = 0, 0, 0
    questions = []
    for r in records:
        h = r["contentHash"]
        prev = r.get("previousContentHash")
        if h not in assigned and prev is not None and prev in assigned:
            # A deliberate pipeline rewrite (e.g. restoring the official sign
            # stem) changed the hash; carry the ID across so user stats and
            # bookmarks stay attached. Only the pipeline itself can supply a
            # previous hash, so an accidental CSV edit never takes this path.
            assigned[h] = assigned.pop(prev)
            remapped += 1
        if h in assigned:
            qid = assigned[h]
            reused += 1
        else:
            next_serial[r["topic"]] += 1
            qid = f"{TOPIC_PREFIX[r['topic']]}-{next_serial[r['topic']]:03d}"
            assigned[h] = qid
            minted += 1

        # Localized fields carry exactly the shipped languages — no more, so
        # a half-filled "te" can never leak into the bundle, and no less.
        questions.append(
            {
                "id": qid,
                "topic": r["topic"],
                "signId": r.get("signId"),
                "text": {lang: r["text"][lang] for lang in langs},
                "options": [{lang: o[lang] for lang in langs} for o in r["options"]],
                "answerIndex": r["answerIndex"],
                "explanation": {lang: (r["explanation"].get(lang) or "") for lang in langs},
                "legalRef": r.get("legalRef"),
                "signAlt": None if not r.get("signAlt") else {lang: r["signAlt"][lang] for lang in langs},
                "provenance": r["provenance"],
            }
        )

    # ---- signs: registry + the questions that reference each ---------
    registry = json.loads(SIGNS_BUILD.read_text(encoding="utf-8")) if SIGNS_BUILD.exists() else []
    by_sign: dict[str, list[str]] = {}
    for q in questions:
        if q["signId"]:
            by_sign.setdefault(q["signId"], []).append(q["id"])
    signs = [
        {
            "id": s_["id"],
            "category": s_["category"],
            "name": {lang: s_["name"] for lang in langs},
            "meaning": {lang: s_["meaning"] for lang in langs},
            "alt": {lang: s_["alt"] for lang in langs},
            "questionIds": by_sign.get(s_["id"], []),
        }
        for s_ in registry
    ]

    bundle = {
        "schemaVersion": 1,
        "contentVersion": content_version,
        "languages": langs,
        "sourceAttribution": "Question bank published by the Transport Department, Government of Andhra Pradesh",
        "sourceUrl": "https://www.aptransport.org/html/llr-question-bank.html",
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "questions": questions,
        "signs": signs,
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
    print(f"   IDs       : {minted} newly minted, {reused} reused from id-map.json ({remapped} carried across a stem rewrite)")
    print(f"   signs     : {len(signs)} with artwork")
    print(f"   id-map    : {len(assigned)} total mappings -> {rel(ID_MAP)}")

    # ---- src/content/questions.ts — what the app actually imports --------
    if args.ts_out:
        args.ts_out.parent.mkdir(parents=True, exist_ok=True)
        args.ts_out.write_text(render_ts(bundle), encoding="utf-8")
        print(f"   ts module : {rel(args.ts_out)}")
        index = SIGN_ART_DIR / "index.ts"
        index.write_text(render_sign_index(signs), encoding="utf-8")
        print(f"   sign art  : {rel(index)} ({len(signs)} static imports)")
    return 0


def pascal(sign_id: str) -> str:
    return "".join(part[:1].upper() + part[1:] for part in sign_id.split("-"))


def render_sign_index(signs: list[dict]) -> str:
    """docs/05-Data-Schema.md §2.1: artwork is a component registry built from
    STATIC imports, so a missing file fails the bundle, never a screen."""
    imports = "\n".join(f"import {pascal(s_['id'])} from './{s_['id']}.svg';" for s_ in signs)
    entries = "\n".join(f"  '{s_['id']}': {pascal(s_['id'])}," for s_ in signs)
    union = " | ".join(f"'{s_['id']}'" for s_ in signs) or "never"
    return f"""// GENERATED by pipeline/06_emit.py — DO NOT EDIT BY HAND.
// One static import per sign: a missing .svg is a bundling failure, not a blank box.
import type {{ FC }} from 'react';
import type {{ SvgProps }} from 'react-native-svg';

{imports}

export type SignId = {union};

export const SIGN_ART: Readonly<Record<SignId, FC<SvgProps>>> = {{
{entries}
}};

export function isSignId(id: string): id is SignId {{
  return Object.prototype.hasOwnProperty.call(SIGN_ART, id);
}}
"""


def render_ts(bundle: dict) -> str:
    """Render the bundle as a typed TS module.

    Types are generated from the shipped language set, so `Lang` is exactly
    the union the content can honour. Adding "te" to content-config.json widens
    the type; a component reading q.text.te before that is a compile error, not
    a blank string.
    """
    langs = bundle["languages"]
    lang_union = " | ".join(f"'{l}'" for l in langs)
    topic_union = " | ".join(f"'{t}'" for t in TOPICS)
    payload = json.dumps(bundle, indent=2, ensure_ascii=False)
    return f"""// GENERATED by pipeline/06_emit.py — DO NOT EDIT BY HAND.
// Source: {bundle['sourceUrl']}
// Content version {bundle['contentVersion']}, generated {bundle['generatedAt']}.
// Regenerate: npm run content:emit

export type TopicId = {topic_union};
export type Lang = {lang_union};
export type Localized = Record<Lang, string>;

export interface Question {{
  id: string;
  topic: TopicId;
  signId: string | null;
  text: Localized;
  options: readonly [Localized, Localized, Localized, Localized];
  answerIndex: 0 | 1 | 2 | 3;
  explanation: Localized;
  legalRef: string | null;
  /** Accessibility text for the sign artwork — the prose description the
   *  bank used before the artwork was restored. null when signId is null. */
  signAlt: Localized | null;
  provenance: {{ source: string; status: string; confirmedIn: string; label: string }};
}}

export interface Sign {{
  id: string;
  category: 'mandatory' | 'cautionary' | 'informatory';
  name: Localized;
  meaning: Localized;
  alt: Localized;
  questionIds: readonly string[];
}}

export interface ContentBundle {{
  schemaVersion: 1;
  contentVersion: string;
  languages: readonly Lang[];
  sourceAttribution: string;
  sourceUrl: string;
  generatedAt: string;
  questions: readonly Question[];
  signs: readonly Sign[];
}}

export const CONTENT = {payload} as const satisfies ContentBundle;

export const QUESTIONS: readonly Question[] = CONTENT.questions;
export const SIGNS: readonly Sign[] = CONTENT.signs;
export const LANGUAGES: readonly Lang[] = CONTENT.languages;
"""


if __name__ == "__main__":
    raise SystemExit(main())
