#!/usr/bin/env python3
"""Splice section fragments into a guide page between <!-- CONTENT START --> and <!-- CONTENT END -->.
Usage: python3 tools/assemble.py java.html /tmp/ip-frag/java-*.html
"""
import sys

page, frags = sys.argv[1], sys.argv[2:]
s = open(page, encoding="utf-8").read()
start, end = "  <!-- CONTENT START -->\n", "  <!-- CONTENT END -->\n"
a, b = s.index(start) + len(start), s.index(end)
body = "".join(open(f, encoding="utf-8").read().rstrip() + "\n\n" for f in frags)
open(page, "w", encoding="utf-8").write(s[:a] + body + s[b:])
print(f"{page}: spliced {len(frags)} fragments, {body.count(chr(10))} lines")
