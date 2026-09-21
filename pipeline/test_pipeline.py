#!/usr/bin/env python3
"""
Pipeline tests. Run:  .venv/bin/python pipeline/test_pipeline.py

The property under test is ID stability. It has no runtime error mode: if it
breaks, every user's stats and bookmarks quietly reattach to the wrong
questions and nobody finds out. So it is tested directly rather than trusted.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

PIPELINE = Path(__file__).resolve().parent
ROOT = PIPELINE.parent
sys.path.insert(0, str(PIPELINE))
from lib_content import CATEGORY_TO_TOPIC, TOPICS, content_hash, sentence_case, telugu_ratio  # noqa: E402

PY = str(ROOT / ".venv" / "bin" / "python")
CSV = "/root/.claude/uploads/961cee9d-677c-536d-9952-494a361b72fa/6391bf70-LLR_Andhra_Pradesh.csv"

failures: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    print(f"  {'PASS' if cond else 'FAIL'}  {name}")
    if not cond:
        if detail:
            print(f"        {detail}")
        failures.append(name)


def emit_to(tmp: Path, records: list[dict], id_map: dict | None) -> tuple[dict, dict]:
    """Run 06_emit against a scratch id-map and return (bundle, id_map)."""
    recs = tmp / "records.json"
    recs.write_text(json.dumps(records), encoding="utf-8")
    out = tmp / "bundle.json"
    live = PIPELINE / "id-map.json"
    backup = live.read_text(encoding="utf-8") if live.exists() else None
    try:
        if id_map is None:
            live.unlink(missing_ok=True)
        else:
            live.write_text(json.dumps(id_map), encoding="utf-8")
        r = subprocess.run(
            [PY, str(PIPELINE / "06_emit.py"), "--records", str(recs), "--out", str(out)],
            capture_output=True, text=True,
        )
        assert r.returncode == 0, r.stderr
        return json.loads(out.read_text(encoding="utf-8")), json.loads(live.read_text(encoding="utf-8"))
    finally:
        if backup is not None:
            live.write_text(backup, encoding="utf-8")
        elif live.exists():
            live.unlink()


print("=" * 70)
print("lib_content")
print("=" * 70)
check("sentence_case preserves acronyms",
      sentence_case("THE RTO ISSUES AN LMV LICENCE.") == "The RTO issues an LMV licence.",
      sentence_case("THE RTO ISSUES AN LMV LICENCE."))
check("sentence_case leaves mixed case alone",
      sentence_case("Already fine. RTO too.") == "Already fine. RTO too.")
check("sentence_case is idempotent",
      sentence_case(sentence_case("WHAT IS AN NH?")) == sentence_case("WHAT IS AN NH?"))
check("telugu_ratio ignores digits and units", telugu_ratio("వేగం 50 కి.మీ") == 1.0)
check("telugu_ratio flags mojibake", telugu_ratio("à°°à°¹à°¦à°¾à°°à°¿") < 0.9)
check("telugu_ratio of empty string is 0", telugu_ratio("") == 0.0)
check("every CSV category maps to a real topic",
      all(v in TOPICS for v in CATEGORY_TO_TOPIC.values()))

print()
print("=" * 70)
print("content_hash")
print("=" * 70)
h = lambda t, q, o: content_hash(t, q, o)
OPTS = ["Alpha", "Beta", "Gamma", "Delta"]
check("stable across whitespace and case",
      h("road-signs", "What  does  THIS mean?", OPTS) == h("road-signs", "what does this mean", OPTS))
check("stable across option reordering",
      h("road-signs", "Q", OPTS) == h("road-signs", "Q", list(reversed(OPTS))))
check("differs when the option SET differs (the Q180/181/182 bug)",
      h("rules-of-road-regulations", "In which of these places may you park your vehicle?", ["Near a road crossing", "Near a bend", "On a footpath", "None of these"])
      != h("rules-of-road-regulations", "In which of these places may you park your vehicle?", ["Near a traffic light", "Near a pedestrian crossing", "On a main road", "None of these"]))
check("differs across topics", h("road-signs", "Q", OPTS) != h("general-driving-principles", "Q", OPTS))

print()
print("=" * 70)
print("ID stability (G-IDSTABLE)")
print("=" * 70)
subprocess.run([PY, str(PIPELINE / "02_ingest_csv.py"), CSV, "--out", str(PIPELINE / "build/records.json")],
               capture_output=True, text=True, check=True)
records = json.loads((PIPELINE / "build/records.json").read_text(encoding="utf-8"))

with tempfile.TemporaryDirectory() as td:
    tmp = Path(td)
    b1, m1 = emit_to(tmp, records, None)
    ids1 = [q["id"] for q in b1["questions"]]

    check(f"every question gets an ID ({len(ids1)})", len(ids1) == len(records))
    check("all IDs unique", len(set(ids1)) == len(ids1),
          f"{len(ids1)} questions but {len(set(ids1))} distinct IDs")
    check("hashes unique", len({r['contentHash'] for r in records}) == len(records))
    check("IDs use the right topic prefix",
          all(q["id"].startswith({"road-signs": "rs-", "rules-of-road-regulations": "rrr-",
                                  "general-driving-principles": "gdp-"}[q["topic"]]) for q in b1["questions"]))

    # 1. Idempotent re-run.
    b2, _ = emit_to(tmp, records, m1)
    check("re-run reuses every ID (idempotent)",
          [q["id"] for q in b2["questions"]] == ids1)

    # 2. Upstream inserts a question at the top — the scenario the whole
    #    content-hash design exists for.
    inserted = dict(records[0])
    inserted["sourceId"] = "Q000"
    inserted["text"] = {"en": "A brand new question inserted upstream at position 1", "te": None}
    inserted["options"] = [{"en": f"New option {i}", "te": None} for i in range(1, 5)]
    inserted["contentHash"] = content_hash(inserted["topic"], inserted["text"]["en"],
                                           [o["en"] for o in inserted["options"]])
    b3, _ = emit_to(tmp, [inserted] + records, m1)
    by_src = {q["provenance"]["source"] + str(i): q["id"] for i, q in enumerate(b3["questions"])}
    shifted = [q["id"] for q in b3["questions"][1:]]
    check("an upstream insertion does not shift any existing ID", shifted == ids1,
          f"first divergence at index {next((i for i,(a,b) in enumerate(zip(shifted, ids1)) if a!=b), None)}")
    check("the inserted question gets a fresh ID", b3["questions"][0]["id"] not in ids1)

    # 3. Cosmetic reformatting must not mint new IDs.
    reformatted = []
    for r in records:
        c = json.loads(json.dumps(r))
        c["text"]["en"] = "  " + c["text"]["en"].upper() + "  "
        c["contentHash"] = content_hash(c["topic"], c["text"]["en"], [o["en"] for o in c["options"]])
        reformatted.append(c)
    b4, _ = emit_to(tmp, reformatted, m1)
    check("whitespace/case reformatting keeps every ID",
          [q["id"] for q in b4["questions"]] == ids1)

print()
print("=" * 70)
print("language config drives the gates (content-config.json)")
print("=" * 70)
import lib_content  # noqa: E402

def with_config(langs: list[str], fn):
    """Run fn() with content-config.json temporarily set to `langs`."""
    cfg_path = lib_content.CONTENT_CONFIG_PATH
    original = cfg_path.read_text(encoding="utf-8")
    cfg = json.loads(original)
    cfg["languages"] = langs
    cfg["defaultLanguage"] = langs[0]
    cfg["plannedLanguages"] = [l for l in ("en", "te") if l not in langs]
    try:
        cfg_path.write_text(json.dumps(cfg), encoding="utf-8")
        return fn()
    finally:
        cfg_path.write_text(original, encoding="utf-8")

def run_validate():
    # --reports-dir into a temp dir: a scenario run must never overwrite the
    # real pipeline/reports/, which is committed and describes the SHIPPED config.
    with tempfile.TemporaryDirectory() as td:
        return subprocess.run([PY, str(PIPELINE / "05_validate.py"), "--records",
                               str(PIPELINE / "build/records.json"), "--strict",
                               "--reports-dir", td],
                              capture_output=True, text=True)

def run_emit_dry():
    with tempfile.TemporaryDirectory() as td:
        recs = Path(td) / "r.json"; recs.write_text(json.dumps(records), encoding="utf-8")
        return subprocess.run([PY, str(PIPELINE / "06_emit.py"), "--records", str(recs),
                               "--out", str(Path(td) / "b.json"), "--dry-run"],
                              capture_output=True, text=True)

r = with_config(["en"], run_validate)
check("languages=[en]: every blocking gate passes (--strict exit 0)", r.returncode == 0,
      r.stdout[-400:])
check("languages=[en]: all 277 shippable", "277 of  277 ingested" in r.stdout)

r = with_config(["en", "te"], run_validate)
check("languages=[en,te]: G-BILINGUAL re-arms and fails", "[FAIL] G-BILINGUAL" in r.stdout)
check("languages=[en,te]: reports the missing language by name", "no te for" in r.stdout)
check("languages=[en,te]: --strict exits non-zero", r.returncode != 0)

r = with_config(["en"], run_emit_dry)
check("languages=[en]: emit succeeds", r.returncode == 0, r.stderr[:200])
r = with_config(["en", "te"], run_emit_dry)
check("languages=[en,te]: emit refuses (last line of defence)", r.returncode != 0)
check("and names the config as the fix", "content-config.json" in r.stderr, r.stderr[:200])

print()
print("=" * 70)
print(f"{len(failures)} failure(s)" if failures else "ALL PIPELINE TESTS PASSED")
for f in failures:
    print(f"  - {f}")
print("=" * 70)
sys.exit(1 if failures else 0)
