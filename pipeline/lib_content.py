"""
Shared helpers for the content pipeline.

Kept in one place so that the ingest stage, the validation stage and the emit
stage cannot drift apart on the two things that must agree exactly: how a
question's text is normalised (which decides both dedup and its stable ID), and
how a source category maps onto the three official AP topics.
"""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
CONTENT_CONFIG_PATH = _ROOT / "src" / "content" / "content-config.json"


def load_content_config() -> dict:
    """src/content/content-config.json — which languages ship.

    Read at call time, not import time, so a test can point at a scratch copy
    and so the gates react to an edit without a process restart.
    """
    return json.loads(CONTENT_CONFIG_PATH.read_text(encoding="utf-8"))


def shipped_languages() -> list[str]:
    """The languages every shipped question must carry. Gate G-BILINGUAL checks each."""
    return list(load_content_config()["languages"])


# The three parts the AP/Telangana bank is published in. These are the topic
# IDs used by exam-config.json's sectionMix and by the app.
TOPICS = ("road-signs", "rules-of-road-regulations", "general-driving-principles")

TOPIC_PREFIX = {
    "road-signs": "rs",
    "rules-of-road-regulations": "rrr",
    "general-driving-principles": "gdp",
}

# The consolidated CSV uses a 12-category taxonomy of its own. The official AP
# bank is published in three parts, and sectionMix is expressed in those three,
# so every category must land in exactly one of them.
#
# Road markings go with signs: both are "what does this marking on the road
# tell you", and the AP Road Signs part covers them. Documents, penalties and
# the MV Act go with Rules of the Road, which is where the AP bank puts the
# regulatory material. Safety, etiquette, emergencies and first aid are General
# Driving Principles.
CATEGORY_TO_TOPIC = {
    "Traffic Signs": "road-signs",
    "Road Markings": "road-signs",
    "Traffic Rules": "rules-of-road-regulations",
    "Speed Limits": "rules-of-road-regulations",
    "Parking Rules": "rules-of-road-regulations",
    "Vehicle Documents": "rules-of-road-regulations",
    "Fines & Penalties": "rules-of-road-regulations",
    "Motor Vehicles Act": "rules-of-road-regulations",
    "Safety": "general-driving-principles",
    "Driving Etiquette": "general-driving-principles",
    "Emergency Situations": "general-driving-principles",
    "First Aid": "general-driving-principles",
}

TELUGU_BLOCK = (0x0C00, 0x0C7F)

# A question whose text matches this needs an image to be answerable at all.
SIGN_REFERENCE = re.compile(
    r"\bthis sign\b|\bthe sign (shown|below)\b|\bsign shown\b|\bfollowing sign\b"
    r"|\bthis (road )?marking\b|\bshown below\b|\bthis figure\b|\bthe figure below\b",
    re.I,
)

# Acronyms that must survive the ALL-CAPS -> sentence-case conversion.
ACRONYMS = {
    "RTO", "LMV", "HMV", "MV", "KMPH", "KM", "CC", "NH", "SH", "IRC",
    "ATM", "PUC", "RC", "LL", "DL", "AP", "TS", "ID", "SOS", "CPR",
}


def nfc(s: str) -> str:
    """NFC-normalise. Required before any Telugu comparison or search index."""
    return unicodedata.normalize("NFC", s)


def norm_text(s: str) -> str:
    """Normalised form used for dedup and for the content hash behind stable IDs.

    Collapses whitespace and case and strips terminal punctuation, so that a
    re-run whose only change is spacing does not mint new IDs and orphan every
    user's stats.
    """
    s = nfc(s).strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s.rstrip(" .?:;!")


def telugu_ratio(s: str) -> float:
    """Fraction of *letters* in s that sit in the Telugu Unicode block.

    Digits, spaces and Latin punctuation are excluded from the denominator:
    a legitimate Telugu string containing "50 km/h" would otherwise be scored
    as partly non-Telugu and quarantined for no reason.
    """
    letters = [c for c in nfc(s) if c.isalpha()]
    if not letters:
        return 0.0
    lo, hi = TELUGU_BLOCK
    return sum(1 for c in letters if lo <= ord(c) <= hi) / len(letters)


def content_hash(topic: str, english_text: str, options: "list[str] | None" = None, sign_id: "str | None" = None) -> str:
    """The key in pipeline/id-map.json.

    Deliberately NOT derived from the official question number: if the
    department inserts one question upstream, every later number shifts and
    every user's history silently reattaches to the wrong question.

    The OPTIONS are part of the hash, not just the stem. The official bank asks
    "in which of these places may you park your vehicle?" three times with three
    different option sets - three different questions. Hashing the stem alone
    gave all three one ID, so bookmarking one bookmarked all three and their
    stats merged. Options are sorted, so a pure reordering keeps the ID.

    A deliberate pipeline rewrite of the stem (restoring the official sign
    wording) is carried across by previousContentHash at emit time.

    The cost is accepted knowingly: correcting a typo in an option mints a new
    ID and that question's stats reset. That is the safer failure. A colliding
    ID merges distinct questions' history permanently and silently; a new ID
    loses one question's counters, and the retire path in id-map.json exists for
    corrections that must keep their history.
    """
    parts = [topic, norm_text(english_text)]
    if options is not None:
        parts.extend(sorted(norm_text(o) for o in options))
    # The artwork is part of a sign question's identity: "What does this sign
    # mean?" with the same four options is a DIFFERENT question for the left
    # curve and the right curve. Omitted (None) for non-sign questions, so
    # their hashes — and IDs — are unchanged.
    if sign_id:
        parts.append(f"sign:{sign_id}")
    return hashlib.sha256("\x00".join(parts).encode()).hexdigest()


def sentence_case(s: str) -> str:
    """Convert ALL-CAPS source text to sentence case, preserving acronyms.

    No-op on text that is already mixed case, so it is safe to run twice.
    """
    letters = [c for c in s if c.isalpha()]
    if not letters or not all(c.isupper() for c in letters):
        return s  # already mixed case - leave it alone

    out, start_of_sentence = [], True
    for tok in re.split(r"(\s+)", s.lower()):
        if not tok.strip():
            out.append(tok)
            continue
        bare = tok.strip(".,;:!?()[]'\"/-")
        if bare.upper() in ACRONYMS:
            tok = tok.replace(bare, bare.upper())
        elif start_of_sentence:
            tok = tok[0].upper() + tok[1:]
        out.append(tok)
        start_of_sentence = tok.rstrip().endswith((".", "?", "!"))
    return "".join(out)


# ---- framing and positional options (gates G-FRAMING, G-POSITION) ---------

# A candidate must never read the compilation's own framing: "under the
# Telangana bank…", "older state banks still show…". A STEM may not name any
# state either — the official paper never does. An EXPLANATION may name
# Andhra Pradesh (this is the AP app: "AP's speed schedule sets 50 km/h") but
# not another state, and never the bank.
_BANK = r"\bthe bank\b|\bstate banks?\b|licence bank|question bank"
STEM_FRAMING_RE = re.compile(r"\b(Telangana|Andhra Pradesh|Delhi|Maharashtra)\b|" + _BANK, re.IGNORECASE)
EXPLANATION_FRAMING_RE = re.compile(r"\b(Telangana|Delhi|Maharashtra)\b|" + _BANK, re.IGNORECASE)


def framing_leak(text: str, *, field: str = "stem") -> bool:
    pattern = STEM_FRAMING_RE if field == "stem" else EXPLANATION_FRAMING_RE
    return bool(pattern.search(text or ""))


_POSITIONAL_LAST = re.compile(r"^(all|none|both|either|neither|any)\s+of\s+(the\s+above|these|them)\b", re.IGNORECASE)
_LETTER_REF = re.compile(r"^(?:both\s+)?([A-D])\s+(?:and|&)\s+([A-D])\b", re.IGNORECASE)


def positional_option_problems(options: list[str]) -> list[str]:
    """Options whose meaning depends on their position.

    The app shows options in bank order and never shuffles them, so an option
    that says "All of the above" must be last, and one that says "Both B and C"
    must name earlier options that exist. Returns human-readable problems.
    """
    problems: list[str] = []
    last = len(options) - 1
    for i, raw in enumerate(options):
        text = (raw or "").strip()
        if _POSITIONAL_LAST.match(text) and i != last:
            problems.append(f"option {i} {text!r} must be the last option")
        m = _LETTER_REF.match(text)
        if m:
            refs = [ord(ch.upper()) - 65 for ch in m.groups()]
            for r in refs:
                if r >= i:
                    problems.append(f"option {i} {text!r} refers to option {chr(65 + r)}, which is not before it")
                elif r > last:
                    problems.append(f"option {i} {text!r} refers to a missing option {chr(65 + r)}")
    return problems
