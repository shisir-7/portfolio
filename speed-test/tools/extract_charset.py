"""
Extract every character the SpeedPulse UI can render, and write it to
charset.txt for the font subsetter.

This pulls from three places:
  1. Visible text in index.html (tags and script blocks stripped).
  2. Every string literal in app.js and engine.js.
  3. An explicit list of symbols used in templates.

Run:  python extract_charset.py <project_dir> <output_file>
"""
import os
import re
import sys


def html_text(markup: str) -> str:
    """Visible text only: drop comments, script and style bodies, then tags."""
    markup = re.sub(r"(?s)<!--.*?-->", " ", markup)
    markup = re.sub(r"(?s)<script[\s\S]*?</script>", " ", markup)
    markup = re.sub(r"(?s)<style[\s\S]*?</style>", " ", markup)
    markup = re.sub(r"<[^>]+>", " ", markup)
    # Resolve the few HTML entities used in the markup.
    for entity, char in (
        ("&middot;", "\u00b7"), ("&mdash;", "\u2014"), ("&ndash;", "\u2013"),
        ("&hellip;", "\u2026"), ("&rsquo;", "\u2019"), ("&lsquo;", "\u2018"),
        ("&ldquo;", "\u201c"), ("&rdquo;", "\u201d"), ("&amp;", "&"),
        ("&times;", "\u00d7"), ("&rarr;", "\u2192"), ("&larr;", "\u2190"),
        ("&uarr;", "\u2191"), ("&darr;", "\u2193"), ("&copy;", "\u00a9"),
        ("&reg;", "\u00ae"), ("&deg;", "\u00b0"), ("&plusmn;", "\u00b1"),
        ("&nbsp;", " "), ("&euro;", "\u20ac"), ("&pound;", "\u00a3"),
        ("&bull;", "\u2022"), ("&middot;", "\u00b7"),
    ):
        markup = markup.replace(entity, char)
    return markup


def js_strings(source: str) -> str:
    """Every quoted string literal in the source."""
    out = []
    for match in re.finditer(r"'((?:[^'\\]|\\.)*)'|\"((?:[^\"\\]|\\.)*)\"", source):
        out.append(match.group(1) or match.group(2) or "")
    return " ".join(out)


# Symbols that appear in generated UI (arrows in the history list, separators,
# unit suffixes) plus a safety margin for numbers and punctuation.
EXTRA = (
    "0123456789"
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    " .,;:!?'\"()[]{}-_+=*/%&@#$^~|\\<>"
    "\u00b0\u00b1\u00b7\u00a0"
    "\u2013\u2014\u2018\u2019\u201c\u201d\u2026"
    "\u00a9\u00ae\u2022\u00d7\u00a3\u20ac"
    "\u2190\u2191\u2192\u2193\u21d2"
    "\u2303\u2318\u221e"
    "\u0394\u03a3"
)


def main():
    project_dir, out_file = sys.argv[1], sys.argv[2]

    html = open(os.path.join(project_dir, "index.html"), encoding="utf-8").read()
    app = open(os.path.join(project_dir, "app.js"), encoding="utf-8").read()
    engine = open(os.path.join(project_dir, "engine.js"), encoding="utf-8").read()

    corpus = html_text(html) + js_strings(app) + js_strings(engine) + EXTRA
    chars = sorted(set(corpus))
    # Keep only printable characters; control codes are never rendered.
    chars = [c for c in chars if c.isprintable() or c == " "]

    with open(out_file, "w", encoding="utf-8", newline="") as handle:
        handle.write("".join(chars))

    print(f"charset: {len(chars)} characters -> {out_file}")
    print("".join(chars))


if __name__ == "__main__":
    main()
