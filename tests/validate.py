#!/usr/bin/env python3
"""Structural checks that need no browser: valid HTML nesting, parseable
structured data, no dead internal anchors, no missing local assets, no
duplicate ids, and every image carrying alt text."""
import json, os, re, sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
fails = []

def check(name, cond, detail=""):
    print(("  ✓ " if cond else "  ✗ ") + name + (("  — " + detail) if (detail and not cond) else ""))
    if not cond:
        fails.append(name)

class Nesting(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.errs = [], []
    def handle_starttag(self, t, a):
        if t not in VOID:
            self.stack.append((t, self.getpos()))
    def handle_endtag(self, t):
        if t in VOID:
            return
        if not self.stack:
            self.errs.append("stray </%s> at %s" % (t, self.getpos())); return
        if self.stack[-1][0] != t:
            self.errs.append("</%s> at %s closes <%s> from %s" % (t, self.getpos(), self.stack[-1][0], self.stack[-1][1]))
            for i in range(len(self.stack) - 1, -1, -1):
                if self.stack[i][0] == t:
                    del self.stack[i:]; return
        else:
            self.stack.pop()

for page in ("index.html", "404.html"):
    print("\n" + page)
    src = open(os.path.join(ROOT, page), encoding="utf-8").read()

    n = Nesting(); n.feed(src)
    check("tags are balanced", not n.errs and not n.stack,
          "; ".join(n.errs[:3]) or "unclosed: %s" % [t for t, _ in n.stack][:3])

    ids = re.findall(r'\bid="([^"]+)"', src)
    check("no duplicate ids", len(ids) == len(set(ids)),
          str(sorted({i for i in ids if ids.count(i) > 1})))

    anchors = {h for h in re.findall(r'href="#([^"]+)"', src) if h}
    missing = sorted(anchors - set(ids))
    if page == "index.html":
        check("internal anchors resolve", not missing, str(missing))

    check("every image has alt text", not re.findall(r'<img(?![^>]*\balt=)[^>]*>', src))

    refs = {r.split("#")[0] for r in
            re.findall(r'(?:src|href|srcset)="((?!https?:|mailto:|tel:|#|data:)[^"]+)"', src)}
    refs = {r for r in refs if r}          # "/#shop" is a link into a page, not a file
    gone = sorted(r for r in refs if not os.path.exists(os.path.join(ROOT, r.lstrip("/"))))
    check("local assets all exist", not gone, str(gone))

print("\nstructured data")
src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
m = re.search(r'<script type="application/ld\+json">(.*?)</script>', src, re.S)
check("JSON-LD block is present", bool(m))
if m:
    try:
        graph = json.loads(m.group(1))["@graph"]
        types = [n["@type"] for n in graph]
        check("JSON-LD parses", True)
        check("Product and Organization are described",
              "Product" in types and "Organization" in types, str(types))
    except Exception as e:
        check("JSON-LD parses", False, str(e))

print("\nsite files")
for f in ("robots.txt", "sitemap.xml", "site.webmanifest", "favicon.ico", "vercel.json"):
    check("%s exists" % f, os.path.exists(os.path.join(ROOT, f)))
try:
    json.load(open(os.path.join(ROOT, "vercel.json"), encoding="utf-8"))
    check("vercel.json parses", True)
except Exception as e:
    check("vercel.json parses", False, str(e))

# The whole point of being on Vercel is headers Pages cannot send. If the CSP
# ever goes missing, the site quietly loses that protection with no other sign.
cfg = json.load(open(os.path.join(ROOT, "vercel.json"), encoding="utf-8"))
sent = {h["key"] for group in cfg.get("headers", []) for h in group["headers"]}
for h in ("Content-Security-Policy", "Strict-Transport-Security",
          "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy"):
    check("%s is set" % h, h in sent)

# An inline script or event handler would be blocked by our own CSP, so the
# page must not grow one without the policy changing to match.
html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
inline_script = re.findall(r"<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)[^>]*>", html)
check("no inline <script> blocks", not inline_script, str(inline_script[:2]))
handlers = re.findall(r'\son(?:load|click|error|change|submit)\s*=', html)
check("no inline event handlers", not handlers, str(handlers[:3]))
try:
    json.load(open(os.path.join(ROOT, "site.webmanifest"), encoding="utf-8"))
    check("web manifest parses", True)
except Exception as e:
    check("web manifest parses", False, str(e))
import xml.dom.minidom
try:
    xml.dom.minidom.parse(os.path.join(ROOT, "sitemap.xml"))
    check("sitemap parses", True)
except Exception as e:
    check("sitemap parses", False, str(e))

print("\ncontact details are consistent")
blob = src
for f in ("assets/js/noorala.js", "assets/js/chat.js"):
    blob += open(os.path.join(ROOT, f), encoding="utf-8").read()
numbers = set(re.findall(r'wa\.me/(\d+)', blob))
check("one WhatsApp number site-wide", len(numbers) == 1, str(sorted(numbers)))
check("the WhatsApp number is a valid Oman mobile",
      all(re.fullmatch(r'968\d{8}', n) for n in numbers), str(sorted(numbers)))

print("\n%s\n" % ("%d check(s) failed" % len(fails) if fails else "All checks passed"))
sys.exit(1 if fails else 0)
