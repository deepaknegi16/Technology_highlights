#!/usr/bin/env python3
"""Validate the guide HTML files: tag balance, duplicate ids, dangling anchors,
quiz/animation contracts, leftover generation artifacts, and missing local assets.

Usage: python3 tools/validate.py [file.html ...]   (defaults to all *.html in repo root)
Exit code 1 if any error is found.
"""
import glob
import os
import re
import sys
from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr", "path", "circle",
        "rect", "line", "polygon", "polyline", "ellipse", "use", "stop"}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Checker(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=False)
        self.path = path
        self.errors = []
        self.stack = []
        self.ids = {}
        self.hrefs = []
        self.srcs = []
        self.quiz_ctx = []          # (data-q, data-answer, set(values), line)
        self.anim_ctx = []          # (steps, line)
        self.term_card_depth = None
        self.in_code = 0

    def err(self, msg, line=None):
        self.errors.append(f"{self.path}:{line or self.getpos()[0]}: {msg}")

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        line = self.getpos()[0]
        if tag not in VOID:
            self.stack.append((tag, line))
        if tag == "code":
            self.in_code += 1
        if "id" in a:
            if a["id"] in self.ids:
                self.err(f"duplicate id '{a['id']}' (first at line {self.ids[a['id']]})")
            self.ids[a["id"]] = line
        if "href" in a:
            self.hrefs.append((a["href"], line))
        if "src" in a:
            self.srcs.append((a["src"], line))
        # quiz contract
        if "data-q" in a:
            self.quiz_ctx.append([a.get("data-q"), a.get("data-answer"), set(), line])
            if not a.get("data-answer"):
                self.err("quiz question missing data-answer")
        if tag == "input" and a.get("type") == "radio" and self.quiz_ctx:
            self.quiz_ctx[-1][2].add(a.get("value"))
        # anim contract
        if a.get("class", "").split().count("anim") and tag == "figure":
            try:
                steps = int(a.get("data-steps", "1"))
            except ValueError:
                steps = 1
                self.err("figure.anim data-steps is not an integer")
            self.anim_ctx.append([steps, line])
        if "data-step" in a and self.anim_ctx:
            steps = self.anim_ctx[-1][0]
            for part in a["data-step"].split(","):
                part = part.strip()
                nums = [int(x) for x in part.split("-") if x.strip().isdigit()]
                for n in nums:
                    if n < 1 or n > steps:
                        self.err(f"data-step '{a['data-step']}' outside 1..{steps}")
            if "data-until" in a and int(a["data-until"]) > steps:
                self.err(f"data-until '{a['data-until']}' outside 1..{steps}")
        if a.get("class", "").split().count("term-card") and tag == "article" and "id" not in a:
            self.err("term-card without id (progress cannot be saved)")
        if a.get("class", "").split().count("problem") and tag == "article" and "id" not in a:
            self.err("problem without id (progress cannot be saved)")

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if tag == "code":
            self.in_code -= 1
        if not self.stack:
            self.err(f"unexpected closing </{tag}>")
            return
        open_tag, line = self.stack[-1]
        if open_tag == tag:
            self.stack.pop()
        else:
            # find in stack
            names = [t for t, _ in self.stack]
            if tag in names:
                while self.stack and self.stack[-1][0] != tag:
                    t, l = self.stack.pop()
                    self.err(f"unclosed <{t}> opened at line {l} (closed by </{tag}>)")
                self.stack.pop()
            else:
                self.err(f"stray closing </{tag}> (open: <{open_tag}> from line {line})")
        if tag == "figure" and self.anim_ctx:
            self.anim_ctx.pop()
        if tag == "div" and self.quiz_ctx and self.quiz_ctx[-1][3] and self._closing_q():
            pass

    def _closing_q(self):
        return False

    def handle_data(self, data):
        if "fileciteturn" in data or "citeturn" in data:
            self.err("leftover citation artifact in text")
        if self.in_code and ("<" in data and re.search(r"<[A-Za-z]", data)):
            self.err("raw '<' inside <code> — escape as &lt;")

    def finish(self):
        for t, l in self.stack:
            if t not in ("html", "body"):
                self.err(f"unclosed <{t}>", l)
        # quiz: answer value must exist among options
        for q, ans, vals, line in self.quiz_ctx:
            if ans and vals and ans not in vals:
                self.err(f"quiz q{q} data-answer '{ans}' not among options {sorted(v for v in vals if v)}", line)
        for href, line in self.hrefs:
            if href.startswith("#") and len(href) > 1 and href[1:] not in self.ids:
                self.err(f"dangling anchor href='{href}'", line)
            elif not href.startswith(("#", "http", "mailto", "javascript", "data:")):
                p = os.path.join(os.path.dirname(self.path), href.split("#")[0])
                if href.split("#")[0] and not os.path.exists(p):
                    self.err(f"missing local file href='{href}'", line)
        for src, line in self.srcs:
            if not src.startswith(("http", "data:")):
                p = os.path.join(os.path.dirname(self.path), src)
                if not os.path.exists(p):
                    self.err(f"missing local file src='{src}'", line)


def main(argv):
    files = argv or sorted(glob.glob(os.path.join(ROOT, "*.html")))
    total = 0
    for f in files:
        c = Checker(f)
        with open(f, encoding="utf-8") as fh:
            c.feed(fh.read())
        c.finish()
        for e in c.errors:
            print(e)
        total += len(c.errors)
        print(f"{os.path.relpath(f, ROOT)}: {len(c.errors)} issue(s), {len(c.ids)} ids")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
