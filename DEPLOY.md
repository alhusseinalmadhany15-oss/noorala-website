# Going live

The site is static — no build step, no backend. Vercel watches `main` and
publishes every push.

Live preview: <https://noorala-website.vercel.app/>

---

## 1 · One host, not two

This repository was briefly served by **both** GitHub Pages and Vercel. Two
hosts serving the same content is worth avoiding: search engines see duplicate
pages, and the two fight over the custom domain's certificate.

Vercel is the one to keep, because it can send HTTP headers and Pages cannot —
see §4. So:

- The `CNAME` file has been removed. It existed only to tell GitHub Pages which
  custom domain to claim, and while it was present Pages kept claiming
  `www.nooralacare.com` whatever Vercel was told.
- **Turn GitHub Pages off**: repository **Settings → Pages → Source → None.**
  Until you do, the old build stays reachable at
  `alhusseinalmadhany15-oss.github.io/noorala-website/`.

> To go back to Pages instead: restore the file with
> `echo www.nooralacare.com > CNAME`, commit, and set Source back to
> `main` / `(root)`. Everything else in the repository works on either host;
> only the headers in §4 are Vercel-only.

---

## 2 · Adding the domain

In Vercel: **Project → Settings → Domains → Add**, and enter
`www.nooralacare.com`. Add `nooralacare.com` too and let Vercel redirect it to
the `www` host.

**Then read the DNS records off that screen and use those.** Vercel now issues
project-specific values — a CNAME target like
`d1d4fc829fe7bc7c.vercel-dns-017.com` rather than one shared hostname. The old
generic values (`76.76.21.21` for A records, `cname.vercel-dns.com` for CNAME)
still work, but the dashboard is the authority for your project. Do not copy
values out of a blog post, including this one.

The shape is:

| Host | Type | Value |
|---|---|---|
| `www` | CNAME | the target Vercel shows you |
| `@` | A | the address Vercel shows you |

Leave any existing `MX` records alone, or you will take your email down with
your website. Never put a CNAME on the bare domain — it breaks mail on most
registrars.

HTTPS is automatic once DNS resolves, usually within minutes.

### Checking it worked

```sh
dig +short www.nooralacare.com
curl -sSI https://www.nooralacare.com | head -1        # → HTTP/2 200
curl -sSI https://nooralacare.com | head -2            # → 308 to the www host
curl -sSI https://www.nooralacare.com | grep -i content-security   # → the CSP from §4
```

---

## 3 · Other domains

Domains are additive. You can point several at the same project and let Vercel
redirect all but one to the primary, so choosing a new address later costs
nothing you have already built.

**`noorala.care.om` is not registrable.** `.om` has a fixed set of second
levels — `co`, `com`, `org`, `net`, `edu`, `gov`, `museum`, `pro`, `med`,
`biz`, `mil` — and `care` is not among them. What you can register as an Omani
business is `noorala.om`, `noorala.com.om` or `noorala.co.om`, through Omantel,
Ooredoo or Gulf Cybertech, with a scanned copy of your commercial
registration. Since December 2025 no trademark certificate is needed.

**`noorala.care` is registrable** — `.care` is an ordinary generic TLD, open to
anyone, instant, roughly USD 55 a year.

A note on positioning rather than plumbing: the site's own copy sells across
the Gulf — the Gulf section names Muscat, Dubai, Doha and Riyadh, and the
partner section offers GCC distribution and export. A national `.om` address
reads as *Oman only* to a buyer in Dubai. Worth weighing before making one the
primary.

**If you change the primary domain**, these follow it:

- `index.html` — `<link rel="canonical">`, `og:url`, `og:image`,
  `twitter:image`, and every `https://www.nooralacare.com` inside the JSON-LD
- `sitemap.xml` — `<loc>` and both `<image:loc>`
- `robots.txt` — the `Sitemap:` line
- `analytics.js` — `site` if the provider keys on the domain

---

## 4 · The headers, and why they are the reason to be on Vercel

`vercel.json` sends a Content-Security-Policy and the usual protective
headers. GitHub Pages cannot send any header at all, which is the one
capability that actually justified moving.

The policy is deliberately strict on scripts:

```
script-src 'self'
```

No inline scripts, no inline event handlers. The page was changed to suit it —
the font stylesheet no longer uses an `onload` attribute, and the intro curtain
is driven by a CSS class instead of an inline snippet. `tests/validate.py`
fails the build if an inline `<script>` or an `onload=` attribute reappears, so
this cannot regress quietly.

`style-src` does allow `'unsafe-inline'`, because the markup uses `style="…"`
attributes throughout. Inline styles are a far smaller risk than inline
scripts.

> **Turning analytics on requires a CSP change.** The policy currently allows
> scripts and connections from this origin only, so a third-party analytics
> script will be silently blocked. When you set a provider in
> `assets/js/analytics.js`, add its host to both `script-src` and
> `connect-src` in `vercel.json`. For Plausible that is
> `https://plausible.io`. Check the browser console for a CSP violation if
> events never arrive.

### Caching

Asset filenames carry no content hash — it is `noorala.css`, not
`noorala.8fa21c.css`. A long `immutable` cache would therefore strand visitors
on an old stylesheet after a deploy, so the headers are deliberately modest:

| Path | Cache | Why |
|---|---|---|
| `*.html` | revalidate every time | content changes without warning |
| `/assets/css`, `/assets/js` | 5 min, then revalidate in the background | a deploy reaches everyone within 5 minutes |
| `/assets/img` | 30 days | product photography is stable |

If you ever want year-long caching, add content hashes to the filenames first.

---

## 5 · Deploying a change

```sh
git checkout main
git pull
# …edit…
python3 tests/validate.py        # structure, links, assets, headers, CSP hygiene
node tests/smoke.mjs             # drives a real browser (needs: npm i playwright)
git commit -am "what changed"
git push
```

Vercel builds every push to `main`, and every pull request gets its own
preview URL. GitHub Actions runs both check suites on each push and pull
request (`.github/workflows/checks.yml`).

---

## 6 · What still needs your input

### Prices — live now, unverified
`CFG.packs` at the top of `assets/js/noorala.js` holds:

```js
1: { price: 24.900 }   2: { price: 44.900 }   3: { price: 64.900 }
```

These were placeholders carried over from the original build and are now
public. Customers ordering through WhatsApp will quote them back to you.
Change them in that one place — the shop, the cart, the chat and the `Product`
structured data all read from it.

### Analytics — wired up, switched off
`assets/js/analytics.js` does nothing until you set a provider:

```js
provider: "plausible",
site:     "nooralacare.com",
```

Plausible, Umami and GoatCounter are cookieless and need no consent banner.
GA4 sets cookies, which in most jurisdictions requires one this site does not
have. Remember the CSP change in §4.

The privacy answer in the chat reads this config and rewords itself, so the
site never claims more privacy than it is actually giving.

Events wired: `mode`, `add_to_cart`, `checkout_whatsapp`,
`order_whatsapp_direct`, `quiz_complete`, `skin_snapshot`, `partner_enquiry`,
`chat_open`, `chat_answer`, `chat_no_answer`, `chat_handover`,
`journey_start`, `journey_day_complete`, `journey_certificate`.

`chat_no_answer` is the useful one: it records the questions the concierge
could not answer, which is exactly the list of what to add to its knowledge
base.

### Email address
The site lists `hello@noorala.com` but the domain is `nooralacare.com`. If that
mailbox does not exist, every emailed partner enquiry is going nowhere. Either
create it, or change `CFG.email` in `assets/js/noorala.js` and the four
`mailto:` links in `index.html`.

### The collagen figure
The pack reads **15000 mg collagen per box** and the site now matches it. Worth
confirming with the manufacturer — if the pack artwork is wrong, that is a
packaging problem, and six places on the site change back together (hero chips,
fact bar, ingredients rail, spec table, science panel, chat).

---

## 7 · Rolling back

Every deploy is a commit. In the Vercel dashboard, **Deployments → the last
good one → Promote to Production** puts it back immediately. Or revert in git
and push:

```sh
git revert <sha>
git push
```
