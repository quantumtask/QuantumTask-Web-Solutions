#!/usr/bin/env python3
"""
Normalize common mojibake / stray characters in service HTML files.

Rules:
- Replace NBSP (U+00A0) with space.
- Remove zero-width chars: U+200B, U+200C, U+200D, U+FEFF.
- Drop UTF-8 BOM if present.
- Fix mojibake sequences (cp1252/utf-8 mix) to ASCII equivalents.
- Replace smart quotes/dashes with ASCII equivalents.
- Remove replacement char U+FFFD.

Only files listed in services.json are processed. If a docs/<filename> copy
exists, it will be processed as well to keep the deployed Pages output clean.
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVICES_PATH = ROOT / "services.json"


def load_filenames() -> list[Path]:
    data = json.loads(SERVICES_PATH.read_text(encoding="utf-8"))
    names = {item["filename"] for item in data if item.get("filename")}
    paths: list[Path] = []
    for name in sorted(names):
        paths.append(ROOT / name)
        docs_path = ROOT / "docs" / name
        if docs_path.exists():
            paths.append(docs_path)
    return paths


MOJIBAKE_MAP = {
    "\u00e2\u0080\u0099": "'",
    "\u00e2\u0080\u009c": '"',
    "\u00e2\u0080\u009d": '"',
    "\u00e2\u0080\u0093": "-",
    "\u00e2\u0080\u0094": "--",
    "\u00e2\u0080\u0091": "-",
    "\u00c3\u00a2\u00c2\u0080\u00c2\u0099": "'",
    "\u00c3\u00a2\u00c2\u0080\u00c2\u009c": '"',
    "\u00c3\u00a2\u00c2\u0080\u00c2\u009d": '"',
    "\u00c3\u00a2\u00c2\u0080\u00c2\u0093": "-",
    "\u00c3\u00a2\u00c2\u0080\u00c2\u0094": "--",
    "\u00c3\u00a2\u00c2\u0080\u00c2\u0091": "-",
    "\u00c3\u00a2\u00c2\u0080\u00c2\u00a6": "...",
    "\u00c3\u00a2\u00c2\u0080\u00c2\u00b9": "-",
    "\u00c3\u00a2\u00c2\u0080\u00c2": "-",
    "\u00c3\u00a2\u00c2": "-",
    "\u20ac\u00c2": "-",
    "\u20ac": "-",
    "\u00c2": "-",
    "\u00c2\u00ab": '"',
    "\u00c2\u00bb": '"',
    "\u00c2\u00b7": "-",
    "\u00c2\u00ad": "-",
    "\u00c2\u0095": "-",
    "\u00c2\u0096": "-",
    "\u00c2\u0097": "--",
}

SMART_MAP = {
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2013": "-",
    "\u2014": "--",
    "\u2011": "-",  # non-breaking hyphen
    "\u00b7": "-",
    "\u0095": "-",
    "\u0096": "-",
    "\u0097": "--",
}

ZERO_WIDTH = ["\u200b", "\u200c", "\u200d", "\ufeff"]


def clean_text(text: str, counts: Counter) -> str:
    if text.startswith("\ufeff"):
        counts["bom_removed"] += 1
        text = text.lstrip("\ufeff")

    nb_count = text.count("\u00a0")
    if nb_count:
        counts["nbsp_to_space"] += nb_count
        text = text.replace("\u00a0", " ")

    for zw in ZERO_WIDTH:
        zw_count = text.count(zw)
        if zw_count:
            counts["zero_width_removed"] += zw_count
            text = text.replace(zw, "")

    for bad, good in MOJIBAKE_MAP.items():
        hits = text.count(bad)
        if hits:
            counts[f"mojibake_{bad}"] += hits
            text = text.replace(bad, good)

    for bad, good in SMART_MAP.items():
        hits = text.count(bad)
        if hits:
            counts[f"smart_{bad}"] += hits
            text = text.replace(bad, good)

    rep_count = text.count("\ufffd")
    if rep_count:
        counts["replacement_removed"] += rep_count
        text = text.replace("\ufffd", "-")

    return text


def process_file(path: Path) -> tuple[bool, Counter]:
    raw = path.read_text(encoding="utf-8", errors="replace")
    counts: Counter = Counter()
    cleaned = clean_text(raw, counts)
    if cleaned != raw:
        path.write_text(cleaned, encoding="utf-8")
        changed = True
    else:
        changed = False
    return changed, counts


def main() -> None:
    any_changed = False
    for file_path in load_filenames():
        changed, counts = process_file(file_path)
        any_changed = any_changed or changed
        summary = ", ".join(f"{k}:{v}" for k, v in counts.items() if v)
        status = "changed" if changed else "unchanged"
        print(f"{file_path}: {status}" + (f" ({summary})" if summary else ""))

    if not any_changed:
        print("No changes needed.")


if __name__ == "__main__":
    main()
