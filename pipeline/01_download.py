#!/usr/bin/env python3
"""
01_download.py — fetch the six official LLR question-bank PDFs and record a
SHA-256 for each, so a later re-run can detect that the department changed the
upstream file.

Two modes, and they produce byte-identical manifests:

    python3 pipeline/01_download.py            # fetch from aptransport.org
    python3 pipeline/01_download.py --offline  # hash PDFs already in raw/

--offline exists because some environments (CI sandboxes, this one) cannot reach
aptransport.org. In that mode you download the six PDFs by hand, drop them in
pipeline/raw/, and every downstream stage behaves exactly as if the fetch had
succeeded. The manifest records which mode produced it, so provenance is never
ambiguous.

Exit 0 = every file present and hashed. Exit 1 = something is missing, with
instructions.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent
RAW_DIR = PIPELINE_DIR / "raw"
SOURCES = PIPELINE_DIR / "sources.json"
MANIFEST = PIPELINE_DIR / "raw" / "manifest.json"

# A PDF this small is a redirect page or an error page, not a question bank.
MIN_PLAUSIBLE_BYTES = 10_000


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def looks_like_pdf(path: Path) -> bool:
    """A real PDF starts with %PDF-. Catches an HTML error page saved as .pdf."""
    try:
        with path.open("rb") as fh:
            return fh.read(5) == b"%PDF-"
    except OSError:
        return False


def download(url: str, dest: Path) -> tuple[bool, str]:
    """Fetch url to dest. Returns (ok, message). Never raises."""
    try:
        import requests
    except ImportError:
        return False, "the `requests` package is not installed (pip install -r pipeline/requirements.txt)"

    try:
        resp = requests.get(url, timeout=60, stream=True, headers={"User-Agent": "aplld-content-pipeline/1.0"})
        resp.raise_for_status()
    except Exception as exc:  # noqa: BLE001 - any failure is reported, not raised
        return False, f"{type(exc).__name__}: {exc}"

    tmp = dest.with_suffix(dest.suffix + ".part")
    try:
        with tmp.open("wb") as fh:
            for chunk in resp.iter_content(1 << 16):
                fh.write(chunk)
        tmp.replace(dest)
    except Exception as exc:  # noqa: BLE001
        tmp.unlink(missing_ok=True)
        return False, f"write failed: {exc}"
    return True, "downloaded"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument(
        "--offline",
        action="store_true",
        help="do not touch the network; hash the PDFs already present in pipeline/raw/",
    )
    ap.add_argument(
        "--force",
        action="store_true",
        help="re-download even when the file is already present",
    )
    args = ap.parse_args()

    sources = json.loads(SOURCES.read_text(encoding="utf-8"))
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    entries: list[dict] = []
    missing: list[dict] = []
    changed: list[str] = []

    previous: dict[str, str] = {}
    if MANIFEST.exists():
        try:
            previous = {e["name"]: e["sha256"] for e in json.loads(MANIFEST.read_text(encoding="utf-8"))["files"]}
        except (KeyError, ValueError, TypeError):
            previous = {}

    for spec in sources["files"]:
        dest = RAW_DIR / spec["name"]

        if not args.offline and (args.force or not dest.exists()):
            ok, msg = download(spec["url"], dest)
            if not ok:
                print(f"  ✗ {spec['name']}: {msg}", file=sys.stderr)

        if not dest.exists():
            missing.append(spec)
            continue

        size = dest.stat().st_size
        problems = []
        if not looks_like_pdf(dest):
            problems.append("does not start with %PDF- (an HTML error page saved as .pdf?)")
        if size < MIN_PLAUSIBLE_BYTES:
            problems.append(f"only {size} bytes — too small to be a question bank")
        if problems:
            print(f"  ✗ {spec['name']}: {'; '.join(problems)}", file=sys.stderr)
            missing.append(spec)
            continue

        digest = sha256_of(dest)
        if spec["name"] in previous and previous[spec["name"]] != digest:
            changed.append(spec["name"])

        entries.append(
            {
                "name": spec["name"],
                "topic": spec["topic"],
                "lang": spec["lang"],
                "url": spec["url"],
                "bytes": size,
                "sha256": digest,
            }
        )
        print(f"  ✓ {spec['name']:<42} {size:>9,} bytes  {digest[:16]}…")

    if missing:
        print(f"\n✗ {len(missing)} of {len(sources['files'])} source PDFs are missing or unusable.\n", file=sys.stderr)
        if args.offline:
            print("  --offline was set, so nothing was fetched. Place these in pipeline/raw/:", file=sys.stderr)
        else:
            print("  The download failed. If aptransport.org is blocked from this network,", file=sys.stderr)
            print("  download these by hand and re-run with --offline:", file=sys.stderr)
        for spec in missing:
            print(f"    {spec['url']}", file=sys.stderr)
        print(f"\n  Index page: {sources['indexUrl']}", file=sys.stderr)
        print("\n  Nothing downstream will run until all six are present. That is deliberate:", file=sys.stderr)
        print("  a partial bank would ship a topic the sectionMix expects to be able to fill.", file=sys.stderr)
        return 1

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "mode": "offline" if args.offline else "download",
        "indexUrl": sources["indexUrl"],
        "attribution": sources["attribution"],
        "files": entries,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"\n✓ all {len(entries)} PDFs present and hashed → {MANIFEST.relative_to(PIPELINE_DIR.parent)}")
    if changed:
        print("\n  ⚠ UPSTREAM DRIFT — these files changed since the last manifest:")
        for name in changed:
            print(f"      {name}")
        print("  Re-run the full pipeline and diff the golden files before shipping.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
