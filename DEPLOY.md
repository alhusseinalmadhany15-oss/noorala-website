# Going live — www.nooralacare.com

The site is static and deploys straight from this repository to GitHub Pages.
There is no build step: whatever is on `main` is what the public sees, usually
within a minute of the push.

---

## 1 · Repository settings (once)

**Settings → Pages**

| Setting | Value |
|---|---|
| Source | Deploy from a branch |
| Branch | `main` / `(root)` |
| Custom domain | `www.nooralacare.com` |
| Enforce HTTPS | **on** |

The `CNAME` file in this repository already holds `www.nooralacare.com`. Keep
it — deleting it silently drops the custom domain on the next deploy.

> Tick **Enforce HTTPS** only after the certificate has been issued. GitHub
> provisions it automatically once DNS resolves, which usually takes a few
> minutes and occasionally up to 24 hours. The checkbox stays greyed out
> until then; that is normal and not a fault.

---

## 2 · DNS (once, at your registrar)

Set these on the `nooralacare.com` zone. They are the only records the site
needs — leave any existing `MX` records for email alone.

**The `www` host — this is the one that serves the site:**

| Type | Host | Value |
|---|---|---|
| CNAME | `www` | `alhusseinalmadhany15-oss.github.io.` |

**The bare domain, so `nooralacare.com` redirects to `www`:**

| Type | Host | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

Those are GitHub's published Pages addresses. If GitHub ever changes them the
current list is at
<https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site>.

**Do not** point `@` at a CNAME. A CNAME on the zone apex breaks email on most
registrars, and some reject it outright.

### Checking it worked

```sh
dig +short www.nooralacare.com          # → alhusseinalmadhany15-oss.github.io + an IP
dig +short nooralacare.com              # → the four 185.199.x.153 addresses
curl -sSI https://www.nooralacare.com | head -1     # → HTTP/2 200
curl -sSI https://nooralacare.com | head -2         # → 301 to the www host
```

DNS changes propagate in minutes to a few hours depending on the registrar's
TTL. Until then the old site — or a registrar parking page — may still appear.

---

## 3 · Deploying a change

```sh
git checkout main
git pull
# …edit…
python3 tests/validate.py        # structure, links, assets, structured data
node tests/smoke.mjs             # drives a real browser (needs: npm i playwright)
git commit -am "what changed"
git push
```

Both checks also run in GitHub Actions on every push and pull request
(`.github/workflows/checks.yml`), so a regression is caught even if you skip
them locally.

---

## 4 · What to set before, or soon after, launch

### Prices — live now, unverified
`CFG.packs` at the top of `assets/js/noorala.js` currently holds:

```js
1: { price: 24.900 }   2: { price: 44.900 }   3: { price: 64.900 }
```

These were placeholders carried over from the original build and are now
public. Customers ordering through WhatsApp will quote them back to you.
Change them in that one place — the shop, the cart, the chat and the
`Product` structured data all read from it.

### Analytics — wired up, switched off
`assets/js/analytics.js` does nothing until you set a provider. Open it and
change two lines:

```js
provider: "plausible",
site:     "nooralacare.com",
```

Plausible, Umami and GoatCounter are cookieless and need no consent banner.
GA4 is supported but sets cookies, which in most jurisdictions requires a
banner this site does not have — pick it only if you will add one.

The privacy answer in the chat reads this config and rewords itself, so the
site never claims more privacy than it is actually giving.

Events already wired: `mode`, `add_to_cart`, `checkout_whatsapp`,
`order_whatsapp_direct`, `quiz_complete`, `skin_snapshot`, `partner_enquiry`,
`chat_open`, `chat_answer`, `chat_no_answer`, `chat_handover`,
`journey_start`, `journey_day_complete`, `journey_certificate`.

`chat_no_answer` is the useful one: it records questions the concierge could
not answer, which tells you exactly what to add to its knowledge base.

### Email address
The site lists `hello@noorala.com`, but the domain is `nooralacare.com`. If
that mailbox does not exist, partner enquiries sent by email are going
nowhere. Either create it or change `CFG.email` in `assets/js/noorala.js`
and the four `mailto:` links in `index.html`.

### The collagen figure
The pack reads **15000 mg collagen per box** and the site now matches it.
Worth confirming with the manufacturer — if the pack artwork is wrong, that
is a packaging problem, and six places on the site change back together
(hero chips, fact bar, ingredients rail, spec table, science panel, chat).

---

## 5 · Rolling back

Every deploy is a commit, so a bad one reverts in seconds:

```sh
git revert <sha>
git push
```

Pages redeploys from the new head. There is no cache to purge, though a
visitor's browser may hold the old CSS or JS for a few minutes.
