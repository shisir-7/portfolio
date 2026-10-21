"""
Build the self-hosted font subset for SpeedPulse.

Google serves Inter and Outfit as variable fonts with a `wght` axis, but the
CSS API still emits one file per weight and each latin file is ~32-48 KB.
The site only needs a small, fixed set of characters and a handful of
weights, so we subset the variable font once per family and keep the weight
axis intact. Two files replace six, and the page stops depending on a
third-party host.

Usage:
    python extract_charset.py <project_dir> <charset.txt>
    python build_fonts.py <source_dir> <output_dir> [charset.txt]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brotli_shim  # noqa: F401,E402

from fontTools import subset  # noqa: E402

# (source file, output file, family)
JOBS = [
    ("Inter-400.woff2", "speedpulse-sans.woff2", "Inter"),
    ("Outfit-700.woff2", "speedpulse-display.woff2", "Outfit"),
]


def build(src_path, out_path, text):
    opts = subset.Options()
    opts.flavor = "woff2"
    # Keep no layout features: the site does not use ligatures or
    # contextual alternates, and dropping them saves a few KB.
    opts.layout_features = []
    opts.hinting = False
    opts.desubroutinize = True
    opts.notdef_outline = True
    opts.glyph_names = False
    opts.recalc_bounds = True
    opts.drop_tables += ["DSIG"]
    # Keep a minimal name table so the font is identifiable in devtools.
    opts.name_IDs = [1, 2, 3, 4, 5, 6]

    font = subset.load_font(src_path, opts)
    subsetter = subset.Subsetter(options=opts)
    subsetter.populate(text=text)
    subsetter.subset(font)
    subset.save_font(font, out_path, opts)
    return os.path.getsize(out_path)


def main():
    src_dir, out_dir = sys.argv[1], sys.argv[2]
    charset_path = sys.argv[3] if len(sys.argv) > 3 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "charset.txt"
    )
    text = open(charset_path, encoding="utf-8").read()
    os.makedirs(out_dir, exist_ok=True)

    print(f"character set: {len(set(text))} characters from {charset_path}\n")
    total = 0
    for src_name, out_name, family in JOBS:
        src = os.path.join(src_dir, src_name)
        dst = os.path.join(out_dir, out_name)
        size = build(src, dst, text)
        total += size
        print(f"{family:8} {src_name:18} -> {out_name:26} {size:7} B")
    print(f"{'TOTAL':8} {'':18} -> {'':26} {total:7} B")


if __name__ == "__main__":
    main()
