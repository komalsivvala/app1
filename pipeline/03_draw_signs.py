#!/usr/bin/env python3
"""
03_draw_signs.py — draw every sign in pipeline/signs.json as a clean SVG.

The official PDFs' sign images could not be extracted (the bank reached us as
text), so every sign is REDRAWN from the standard Indian set — mandatory
(red-ringed or blue discs), cautionary (red-bordered triangles), informatory
(blue rectangles) — composed from a small library of primitives so the whole
set shares one stroke weight, one palette and one geometry.

Output:
  src/content/signs/<id>.svg      one file per sign (imported as components)
  pipeline/build/signs.json       registry + alt text derived from the CSV stems

    python3 pipeline/03_draw_signs.py
"""

from __future__ import annotations

import csv
import json
import math
import re
from pathlib import Path

PIPELINE = Path(__file__).resolve().parent
ROOT = PIPELINE.parent
REGISTRY = PIPELINE / "signs.json"
CSV_PATH = PIPELINE / "raw" / "supplied" / "LLR_Andhra_Pradesh.csv"
OUT_DIR = ROOT / "src" / "content" / "signs"
BUILD = PIPELINE / "build" / "signs.json"

RED = "#C8102E"
BLUE = "#1A56A0"
BLACK = "#111113"
WHITE = "#FFFFFF"
FONT = "Inter, Helvetica, Arial, sans-serif"

# ---------------------------------------------------------------- helpers

def place(fragment: str, x: float, y: float, s: float = 1.0, rotate: float = 0) -> str:
    """Centre a 100×100 fragment at (x, y), scaled and rotated."""
    return f'<g transform="translate({x} {y}) rotate({rotate}) scale({s}) translate(-50 -50)">{fragment}</g>'


def mirror(fragment: str) -> str:
    return f'<g transform="translate(100 0) scale(-1 1)">{fragment}</g>'


def stroke(d: str, c: str, w: float, cap: str = "round") -> str:
    return f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="{cap}" stroke-linejoin="round"/>'


def text(t: str, c: str, size: float, x: float = 50, y: float | None = None, weight: int = 700) -> str:
    y = 50 + size * 0.36 if y is None else y
    return (f'<text x="{x}" y="{y:.1f}" text-anchor="middle" font-family="{FONT}" font-weight="{weight}" '
            f'font-size="{size}" fill="{c}">{t}</text>')


# ---------------------------------------------------------------- frames

def frame_ring(inner: str) -> str:
    """Prohibitory / limit: red ring, white centre."""
    return f'<circle cx="50" cy="50" r="47" fill="{RED}"/><circle cx="50" cy="50" r="38" fill="{WHITE}"/>{inner}'


def frame_blue(inner: str) -> str:
    """Compulsory: blue disc, thin white rim."""
    return f'<circle cx="50" cy="50" r="47" fill="{WHITE}"/><circle cx="50" cy="50" r="44" fill="{BLUE}"/>{inner}'


def frame_triangle(inner: str, inverted: bool = False) -> str:
    pts = "6,15 94,15 50,92" if inverted else "50,8 94,86 6,86"
    return (f'<polygon points="{pts}" fill="{WHITE}" stroke="{RED}" stroke-width="7" stroke-linejoin="round"/>{inner}')


def frame_info(inner: str) -> str:
    return f'<rect x="5" y="5" width="90" height="90" rx="8" fill="{BLUE}"/>{inner}'


def slash(c: str = RED) -> str:
    """The prohibition bar, upper-left to lower-right, drawn over the symbol."""
    return f'<line x1="24" y1="24" x2="76" y2="76" stroke="{c}" stroke-width="7" stroke-linecap="round"/>'


# ---------------------------------------------------------------- symbols (drawn in a 100×100 box, colour c)

def arrow(c: str, rotate: float = 0) -> str:
    return f'<polygon points="50,20 69,43 57,43 57,80 43,80 43,43 31,43" fill="{c}" transform="rotate({rotate} 50 50)"/>'


def arrow_turn(c: str, direction: str) -> str:
    right = stroke("M42 82 V50 Q42 40 52 40 H58", c, 12, cap="butt") + f'<polygon points="56,26 78,40 56,54" fill="{c}"/>'
    return right if direction == "right" else mirror(right)


def arrow_u_turn(c: str) -> str:
    return stroke("M63 82 V44 A13 13 0 0 0 37 44 V56", c, 12, cap="butt") + f'<polygon points="23,54 51,54 37,76" fill="{c}"/>'


def arrow_ahead_or(c: str, side: str) -> str:
    base = arrow(c)
    branch = stroke("M50 60 H32", c, 10, cap="butt") + f'<polygon points="34,46 16,60 34,74" fill="{c}"/>'
    return base + (branch if side == "left" else mirror(branch))


def both_directions() -> str:
    up = f'<polygon points="50,20 66,40 56,40 56,80 44,80 44,40 34,40" fill="{RED}"/>'
    down = f'<polygon points="50,80 34,60 44,60 44,20 56,20 56,60 66,60" fill="{BLACK}"/>'
    return place(up, 38, 50, 0.85) + place(down, 62, 50, 0.85)


def car_side(c: str) -> str:
    body = f'<path d="M18 62 V54 L26 50 L36 36 H62 L74 50 L82 54 V62 Z" fill="{c}"/>'
    wheels = f'<circle cx="32" cy="63" r="7" fill="{c}"/><circle cx="68" cy="63" r="7" fill="{c}"/>'
    return body + wheels


def car_front(c: str) -> str:
    return (f'<path d="M26 66 V44 L34 28 H66 L74 44 V66 Z" fill="{c}"/>'
            f'<rect x="26" y="62" width="10" height="10" fill="{c}"/><rect x="64" y="62" width="10" height="10" fill="{c}"/>')


def two_cars() -> str:
    return place(car_front(RED), 34, 52, 0.78) + place(car_front(BLACK), 66, 52, 0.78)


def motorcycle(c: str) -> str:
    return (f'<circle cx="30" cy="64" r="9" fill="none" stroke="{c}" stroke-width="5"/>'
            f'<circle cx="70" cy="64" r="9" fill="none" stroke="{c}" stroke-width="5"/>'
            + stroke("M30 64 L44 44 H60 L70 64 M44 44 L38 36 M60 44 L66 36 M50 44 V56", c, 5))


def car_and_motorcycle(c: str) -> str:
    return place(car_side(c), 50, 38, 0.62) + place(motorcycle(c), 50, 66, 0.62)


def lorry(c: str) -> str:
    return (f'<rect x="16" y="34" width="38" height="26" fill="{c}"/>'
            f'<path d="M54 42 H70 L82 52 V60 H54 Z" fill="{c}"/>'
            f'<circle cx="28" cy="64" r="7" fill="{c}"/><circle cx="48" cy="64" r="7" fill="{c}"/><circle cx="72" cy="64" r="7" fill="{c}"/>')


def bicycle(c: str) -> str:
    return (f'<circle cx="32" cy="62" r="12" fill="none" stroke="{c}" stroke-width="4"/>'
            f'<circle cx="68" cy="62" r="12" fill="none" stroke="{c}" stroke-width="4"/>'
            + stroke("M32 62 L44 42 H60 L68 62 M44 42 L50 62 M60 42 L56 34 M52 34 H62 M40 42 H50", c, 4))


def pedestrian(c: str) -> str:
    return (f'<circle cx="50" cy="26" r="7" fill="{c}"/>'
            + stroke("M50 34 V56 M50 56 L38 78 M50 56 L62 78 M50 40 L38 52 M50 40 L62 46", c, 7))


def children(c: str) -> str:
    return place(pedestrian(c), 38, 52, 0.75) + place(pedestrian(c), 64, 52, 0.75) + stroke("M46 50 H56", c, 4)


def worker(c: str) -> str:
    return place(pedestrian(c), 42, 52, 0.95) + stroke("M54 44 L76 72", c, 4) + f'<polygon points="72,68 84,64 82,80" fill="{c}"/>'


def horn(c: str) -> str:
    return (f'<polygon points="26,42 40,42 60,28 60,72 40,58 26,58" fill="{c}"/>'
            + stroke("M66 40 q6 10 0 20 M72 34 q10 16 0 32", c, 3.5))


def curve(c: str, direction: str) -> str:
    right = stroke("M40 84 V50 Q40 34 56 34 H68", c, 9)
    return right if direction == "right" else mirror(right)


def hairpin(c: str, direction: str) -> str:
    right = stroke("M38 84 V44 A12 12 0 0 1 62 44 V66", c, 9)
    return right if direction == "right" else mirror(right)


def reverse_bend(c: str, direction: str) -> str:
    right = stroke("M38 86 V64 Q38 50 50 50 Q62 50 62 36 V16", c, 9)
    return right if direction == "right" else mirror(right)


def slope(c: str, direction: str) -> str:
    wedge = f'<polygon points="16,76 84,76 84,36" fill="{c}"/>'
    car = place(car_side(c), 46, 50, 0.5, rotate=-30)
    up = wedge + car
    return up if direction == "up" else mirror(up)


def narrows(c: str) -> str:
    return stroke("M32 84 L44 34 M68 84 L56 34", c, 7)


def widens(c: str) -> str:
    return stroke("M44 84 L32 34 M56 84 L68 34", c, 7)


def narrow_bridge(c: str) -> str:
    return (f'<rect x="32" y="34" width="8" height="34" fill="{c}"/><rect x="60" y="34" width="8" height="34" fill="{c}"/>'
            + stroke("M30 26 L36 34 M70 26 L64 34 M30 76 L36 68 M70 76 L64 68", c, 5))


def slippery(c: str) -> str:
    return place(car_side(c), 50, 44, 0.7, rotate=-8) + stroke("M26 68 q6 -6 12 0 t12 0 t12 0 t12 0 M26 78 q6 -6 12 0 t12 0 t12 0 t12 0", c, 3.5)


def gravel(c: str) -> str:
    stones = "".join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/>' for x, y, r in [(26, 70, 3), (34, 78, 2.5), (44, 74, 3), (54, 80, 2.5), (64, 72, 3), (74, 78, 2.5), (30, 60, 2), (70, 62, 2)])
    return place(car_side(c), 52, 46, 0.62) + stones


def pedestrian_crossing(c: str) -> str:
    stripes = "".join(f'<rect x="{x}" y="68" width="6" height="12" fill="{c}"/>' for x in range(24, 76, 10))
    return place(pedestrian(c), 50, 46, 0.8) + stripes


def falling_rocks(c: str) -> str:
    cliff = f'<polygon points="64,26 84,26 84,84 64,84" fill="{c}"/>'
    rocks = "".join(f'<polygon points="{x-5},{y} {x-2},{y-5} {x+4},{y-4} {x+6},{y+2} {x+1},{y+5}" fill="{c}"/>' for x, y in [(50, 38), (42, 52), (54, 60), (40, 72)])
    return cliff + rocks


def cross_road(c: str) -> str:
    return stroke("M50 22 V84 M24 52 H76", c, 9, cap="butt")


def gap_in_median(c: str) -> str:
    return (stroke("M34 84 V22 M66 84 V22", c, 5, cap="butt")
            + f'<rect x="46" y="22" width="8" height="18" fill="{c}"/><rect x="46" y="60" width="8" height="24" fill="{c}"/>')


def side_road(c: str, direction: str) -> str:
    right = stroke("M50 84 V22", c, 9, cap="butt") + stroke("M50 52 H76", c, 7, cap="butt")
    return right if direction == "right" else mirror(right)


def roundabout(c: str) -> str:
    parts = []
    for start in (200, 320, 80):
        a0, a1 = math.radians(start), math.radians(start + 80)
        r = 18
        x0, y0 = 50 + r * math.cos(a0), 52 + r * math.sin(a0)
        x1, y1 = 50 + r * math.cos(a1), 52 + r * math.sin(a1)
        parts.append(stroke(f"M{x0:.1f} {y0:.1f} A{r} {r} 0 0 1 {x1:.1f} {y1:.1f}", c, 6, cap="butt"))
        # arrowhead tangent at the arc end
        tx, ty = -math.sin(a1), math.cos(a1)
        nx, ny = math.cos(a1), math.sin(a1)
        tip = (x1 + tx * 9, y1 + ty * 9)
        l = (x1 + nx * 6, y1 + ny * 6)
        rr = (x1 - nx * 6, y1 - ny * 6)
        parts.append(f'<polygon points="{tip[0]:.1f},{tip[1]:.1f} {l[0]:.1f},{l[1]:.1f} {rr[0]:.1f},{rr[1]:.1f}" fill="{c}"/>')
    return "".join(parts)


def major_road(c: str) -> str:
    return stroke("M50 84 V42", c, 5, cap="butt") + stroke("M18 36 H82", c, 11, cap="butt")


def y_intersection(c: str) -> str:
    return stroke("M50 84 V54 M50 54 L30 26 M50 54 L70 26", c, 8)


def staggered(c: str) -> str:
    return stroke("M50 84 V22", c, 8, cap="butt") + stroke("M50 44 H76 M50 62 H24", c, 6, cap="butt")


def hump(c: str) -> str:
    return stroke("M16 70 H32 Q50 44 68 70 H84", c, 7)


def barrier(c: str) -> str:
    bar = f'<rect x="16" y="46" width="68" height="10" fill="{c}"/>' + "".join(f'<rect x="{x}" y="46" width="8" height="10" fill="{WHITE}"/>' for x in range(24, 80, 16))
    posts = f'<rect x="14" y="40" width="6" height="34" fill="{c}"/><rect x="80" y="40" width="6" height="34" fill="{c}"/>'
    return bar + posts


def cow(c: str) -> str:
    return (f'<ellipse cx="46" cy="54" rx="22" ry="12" fill="{c}"/><circle cx="72" cy="46" r="8" fill="{c}"/>'
            + stroke("M66 38 L60 30 M78 38 L84 30 M24 52 L18 62", c, 3)
            + "".join(f'<rect x="{x}" y="62" width="5" height="16" fill="{c}"/>' for x in (30, 40, 52, 62)))


def locomotive(c: str) -> str:
    return (f'<rect x="26" y="44" width="48" height="20" fill="{c}"/><rect x="56" y="32" width="18" height="12" fill="{c}"/>'
            f'<rect x="32" y="30" width="8" height="14" fill="{c}"/>'
            f'<circle cx="34" cy="70" r="6" fill="{c}"/><circle cx="50" cy="70" r="6" fill="{c}"/><circle cx="66" cy="70" r="6" fill="{c}"/>')


def level_crossing(c: str, guarded: bool) -> str:
    if not guarded:
        return locomotive(c)
    fence = stroke("M18 28 H82 M18 38 H82", c, 3.5, cap="butt") + "".join(f'<rect x="{x}" y="22" width="4" height="22" fill="{c}"/>' for x in range(22, 80, 14))
    return fence + place(locomotive(c), 50, 66, 0.62)


def fuel(c: str, bg: str) -> str:
    return (f'<rect x="32" y="28" width="24" height="40" rx="3" fill="{c}"/><rect x="36" y="33" width="16" height="10" fill="{bg}"/>'
            f'<rect x="28" y="68" width="32" height="6" fill="{c}"/>'
            + stroke("M56 40 H64 V60 a4 4 0 0 0 8 0 V46 l4 -6", c, 4))


def cutlery(c: str) -> str:
    return (stroke("M34 24 V42 M40 24 V42 M46 24 V42", c, 3.5) + stroke("M34 42 Q40 50 46 42 M40 46 V78", c, 4)
            + f'<polygon points="58,24 68,24 68,50 58,54" fill="{c}"/>' + stroke("M63 52 V78", c, 4))


def bed(c: str) -> str:
    return (f'<rect x="24" y="50" width="52" height="12" rx="2" fill="{c}"/><rect x="28" y="42" width="14" height="7" rx="2" fill="{c}"/>'
            + stroke("M26 62 V72 M74 62 V72 M24 38 V62", c, 4))


def first_aid() -> str:
    return (f'<rect x="28" y="28" width="44" height="44" rx="3" fill="{WHITE}"/>'
            f'<rect x="44" y="34" width="12" height="32" fill="{RED}"/><rect x="34" y="44" width="32" height="12" fill="{RED}"/>')


def no_through_road() -> str:
    return f'<rect x="44" y="34" width="12" height="46" fill="{WHITE}"/><rect x="34" y="26" width="32" height="8" fill="{RED}"/>'


def no_through_side_road() -> str:
    return (f'<rect x="38" y="20" width="12" height="60" fill="{WHITE}"/><rect x="50" y="44" width="20" height="10" fill="{WHITE}"/>'
            f'<rect x="70" y="38" width="6" height="22" fill="{RED}"/>')


def park_arrow(c: str) -> str:
    return text("P", c, 46, x=38) + place(arrow(c, rotate=90), 74, 50, 0.5)


def park_scooter(c: str) -> str:
    return text("P", c, 40, x=32, y=64) + place(motorcycle(c), 66, 56, 0.62)


def width_limit(c: str) -> str:
    return text("2 m", c, 20) + place(arrow(c, rotate=270), 24, 50, 0.42) + place(arrow(c, rotate=90), 76, 50, 0.42)


def height_limit(c: str) -> str:
    return text("3.5 m", c, 15) + place(arrow(c, rotate=0), 50, 27, 0.42) + place(arrow(c, rotate=180), 50, 73, 0.42)


def axle_load(c: str) -> str:
    return (text("5 t", c, 18, y=44) + f'<rect x="34" y="62" width="32" height="4" fill="{c}"/>'
            f'<circle cx="34" cy="64" r="8" fill="{c}"/><circle cx="66" cy="64" r="8" fill="{c}"/>')


def length_limit(c: str) -> str:
    return text("10 m", c, 14, y=34) + place(lorry(c), 50, 60, 0.72)


def end_restrictions() -> str:
    return (f'<circle cx="50" cy="50" r="46" fill="{WHITE}" stroke="{BLACK}" stroke-width="3"/>'
            + stroke("M62 24 L26 60 M74 36 L38 72 M68 30 L32 66", BLACK, 4, cap="butt"))


def stop_sign() -> str:
    pts = " ".join(f"{50 + 46 * math.cos(math.radians(22.5 + 45 * i)):.1f},{50 + 46 * math.sin(math.radians(22.5 + 45 * i)):.1f}" for i in range(8))
    return f'<polygon points="{pts}" fill="{RED}" stroke="{WHITE}" stroke-width="3"/>' + text("STOP", WHITE, 22)


INNER = {
    "arrow-turn-right": lambda c: arrow_turn(c, "right"),
    "arrow-turn-left": lambda c: arrow_turn(c, "left"),
    "arrow-u-turn": arrow_u_turn,
    "arrow-ahead-or-left": lambda c: arrow_ahead_or(c, "left"),
    "arrow-ahead-or-right": lambda c: arrow_ahead_or(c, "right"),
    "car-and-motorcycle": car_and_motorcycle,
    "two-cars": lambda c: two_cars(),
    "horn": horn,
    "pedestrian": pedestrian,
    "bicycle": bicycle,
    "lorry": lorry,
    "width-limit": width_limit,
    "height-limit": height_limit,
    "axle-load": axle_load,
    "length-limit": length_limit,
    "children": children,
    "worker": worker,
    "narrows": narrows,
    "widens": widens,
    "narrow-bridge": narrow_bridge,
    "slippery": slippery,
    "gravel": gravel,
    "pedestrian-crossing": pedestrian_crossing,
    "falling-rocks": falling_rocks,
    "cross-road": cross_road,
    "gap-in-median": gap_in_median,
    "roundabout": roundabout,
    "major-road": major_road,
    "y-intersection": y_intersection,
    "staggered": staggered,
    "hump": hump,
    "barrier": barrier,
    "cow": cow,
    "cutlery": cutlery,
    "bed": bed,
    "park-arrow": park_arrow,
    "park-scooter": park_scooter,
}


def render(symbol: dict) -> str:
    kind = symbol["kind"]
    inner = symbol.get("inner")
    if kind == "stop":
        return stop_sign()
    if kind == "give-way":
        return frame_triangle("", inverted=True)
    if kind == "no-entry":
        return f'<circle cx="50" cy="50" r="47" fill="{RED}"/><rect x="24" y="44" width="52" height="12" fill="{WHITE}"/>'
    if kind == "one-way":
        return frame_info(arrow(WHITE, rotate=90))
    if kind == "both-directions":
        return frame_ring(both_directions())
    if kind == "no-parking":
        return f'<circle cx="50" cy="50" r="47" fill="{RED}"/><circle cx="50" cy="50" r="38" fill="{BLUE}"/>' + slash()
    if kind == "no-stopping":
        return (f'<circle cx="50" cy="50" r="47" fill="{RED}"/><circle cx="50" cy="50" r="38" fill="{BLUE}"/>'
                + slash() + f'<line x1="76" y1="24" x2="24" y2="76" stroke="{RED}" stroke-width="7" stroke-linecap="round"/>')
    if kind == "end-restrictions":
        return end_restrictions()
    if kind == "prohibit":
        return frame_ring(inner_svg(inner, BLACK, WHITE, symbol) + slash())
    if kind == "ring":
        return frame_ring(inner_svg(inner, BLACK, WHITE, symbol))
    if kind == "blue":
        return frame_blue(inner_svg(inner, WHITE, BLUE, symbol))
    if kind == "triangle":
        return frame_triangle(place(inner_svg(inner, BLACK, WHITE, symbol), 50, 60, 0.62))
    if kind == "info":
        return frame_info(inner_svg(inner, WHITE, BLUE, symbol))
    raise ValueError(f"unknown frame kind {kind!r}")


def inner_svg(inner: str | None, c: str, bg: str, symbol: dict) -> str:
    if inner is None:
        return ""
    if inner == "text":
        return text(symbol["text"], c, 52 if len(symbol["text"]) == 1 else 34)
    if inner == "arrow":
        return arrow(c, symbol.get("rotate", 0))
    if inner == "curve":
        return curve(c, symbol["dir"])
    if inner == "hairpin":
        return hairpin(c, symbol["dir"])
    if inner == "reverse-bend":
        return reverse_bend(c, symbol["dir"])
    if inner == "slope":
        return slope(c, symbol["dir"])
    if inner == "side-road":
        return side_road(c, symbol["dir"])
    if inner == "level-crossing":
        return level_crossing(c, bool(symbol.get("guarded")))
    if inner == "fuel":
        return fuel(c, bg)
    if inner == "first-aid":
        return first_aid()
    if inner == "no-through-road":
        return no_through_road()
    if inner == "no-through-side-road":
        return no_through_side_road()
    fn = INNER.get(inner)
    if fn is None:
        raise ValueError(f"unknown inner symbol {inner!r}")
    return fn(c)


def alt_text(stem: str) -> str:
    """'A red circle with a horizontal white bar means' → 'A red circle with a horizontal white bar'."""
    return re.sub(r"\s+(means|indicates)\s*$", "", stem.strip(), flags=re.I).rstrip(" .:")


def main() -> int:
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))["signs"]
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as fh:
        stems = {r["ID"]: r["Question"] for r in csv.DictReader(fh)}

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for stale in OUT_DIR.glob("*.svg"):
        stale.unlink()

    out = []
    for sign in registry:
        body = render(sign["symbol"])
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">'
               f"{body}</svg>\n")
        (OUT_DIR / f"{sign['id']}.svg").write_text(svg, encoding="utf-8")
        first = sign["sourceIds"][0]
        out.append({
            "id": sign["id"],
            "category": sign["category"],
            "name": sign["name"],
            "meaning": sign["meaning"],
            "alt": alt_text(stems[first]) if first in stems else sign["name"],
            "sourceIds": sign["sourceIds"],
        })

    BUILD.parent.mkdir(parents=True, exist_ok=True)
    BUILD.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    by_cat: dict[str, int] = {}
    for s in out:
        by_cat[s["category"]] = by_cat.get(s["category"], 0) + 1
    print(f"drew {len(out)} signs -> {OUT_DIR.relative_to(ROOT)}/  {by_cat}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
