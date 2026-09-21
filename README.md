# Noorala — www.nooralacare.com

Static marketing and ordering site for Noorala Collagen. No build step, no
framework, no backend — plain HTML, CSS and JavaScript, deployed straight from
this repository to GitHub Pages.

```
index.html                  the whole site (three modes in one page)
404.html                    not-found page
DEPLOY.md                   domain, DNS, and what to set before launch
robots.txt  sitemap.xml     crawler files
site.webmanifest            installable-app metadata
favicon.ico
CNAME                       www.nooralacare.com
assets/css/noorala.css      design system, layout, motion, chat, tracker
assets/js/noorala.js        shop, cart, quiz, skin snapshot, 90-day tracker
assets/js/chat.js           "Noor", the on-site concierge
assets/js/analytics.js      visitor analytics — wired up, off until configured
assets/img/                 product photography (WebP + JPEG), icons, social card
tests/validate.py           structure, links, assets, structured data
tests/smoke.mjs             browser smoke test (Playwright)
.github/workflows/          runs both on every push and pull request
```

## The three modes

The page shows one of three audiences at a time, switched by the control in the
header and stored on `<body data-mode="…">`:

| mode | for | sections |
|---|---|---|
| `express` | someone ready to buy | shop, ingredients, the box, how to use, why, FAQ |
| `deep` | someone deciding | profile quiz, skin snapshot, ritual builder, science, 90-day journey |
| `partner` | pharmacies and distributors | activation, partner value, enquiry form |

CSS classes `.m-express`, `.m-deep`, `.m-partner` and `.m-nop` ("not in
partner") control what each mode shows.

## Things you will want to edit

**Prices, phone number, email, opening hours** — all in one place, at the top
of `assets/js/noorala.js`:

```js
const CFG = {
  wa: "96890106968",        // WhatsApp, international format, no +
  phone: "+968 9010 6968",
  email: "hello@noorala.com",
  hours: { days:[0,1,2,3,4,6], open:9, close:21, tz:4, … },
  freeDelivery: 20,         // free Muscat delivery above this subtotal
  packs: { 1:{…}, 2:{…}, 3:{…} }
};
```

> **The pack prices are placeholders and they are live.** They were published
> at the owner's instruction before real retail prices were confirmed, so
> customers ordering through WhatsApp will quote them back to you. Change them
> here and the shop, the cart, the chat and the `Product` structured data all
> follow.

**What the chat knows** — `KB` at the top of `assets/js/chat.js`. Each entry is
`{ id, k: [trigger words, English and Arabic], a: answer HTML, c: [follow-up chips] }`.
Add an entry and it is live; there is no training step and no API key. The
assistant answers only from this list and hands anything else to WhatsApp, so
adding a topic is the only way to make it answer that topic.

**Product photography** — `assets/img/`. Each photo ships as a `.webp` and a
`.jpg`; replace both and keep the filenames, or the flavour switcher (which
swaps by basename through `window.NooralaPhoto`) will not find them.

## The 90-day tracker

The journey dashboard in Discover mode is a real habit tracker, not a demo. A
visitor presses **Begin my 90 days** and from then on it holds a start date and
one entry per calendar day in `localStorage`:

```js
{ start: "2026-09-21", days: { "2026-09-21": { ritual:true, hydration:true, checkin:true } } }
```

A day counts as complete only when all three are ticked. Consistency is
completed days over elapsed days — an honest number that can go down. The
streak counts back from today but does not treat an unticked *today* as a
break, so the morning never opens on a failure. At day 90 the certificate is
drawn on a `<canvas>` and handed over as a PNG, which is why it works offline
and needs no service to keep working.

All of it lives on the visitor's own device. That is what lets the site promise
a private journal and mean it — and it also means clearing site data clears the
journey, which the reset button says plainly.

## How ordering works

There is no payment processing. The bag lives in the visitor's own browser
(`localStorage`), and checkout opens a pre-written WhatsApp message containing
the order, a reference like `NR-0921-1432`, and blanks for name, address and
payment preference. Stock, address and payment are confirmed by a person in
that chat. The same message is available as "copy the order" for anyone whose
browser blocks the WhatsApp deep link.

## Privacy

Nothing is collected unless you switch analytics on. No cookies are set by us
and no form is ever posted. The skin snapshot reads the uploaded photo in a
`<canvas>` inside the browser and never uploads it. The bag, the chat and the
90-day journey are stored on the visitor's device and can be cleared by them at
any time.

`assets/js/analytics.js` ships inert — no provider configured, no request made.
When you configure one, the privacy answer in the chat rewords itself to
describe what is actually running, and Do Not Track is honoured. See
`DEPLOY.md`.

## Working on it locally

```sh
python3 -m http.server 8000     # then open http://localhost:8000
```

Root-relative paths (`/favicon.ico`, `/site.webmanifest`) need a server, so
opening `index.html` from the filesystem will look subtly wrong.

Before pushing:

```sh
python3 tests/validate.py       # structure, links, assets, structured data
npm install playwright          # once
node tests/smoke.mjs            # drives a real browser
```

Both run in CI on every push and pull request. `DEPLOY.md` covers the domain,
DNS and what still needs your input before launch.

## Claims and compliance

Product claims follow the approved pack label. The pack states **15,000 mg of
collagen per box** (30 × 10 g sachets) — the site says the same, in the hero
chips, the fact bar, the ingredients rail, the specification table, the science
panel and the chat. If the label ever changes, those six places and the
`Product` JSON-LD in `index.html` change with it.

Nutrient statements are restricted to recognised nutrient-function claims for
the vitamins and minerals in the formula. No clinical trial has been run on
this product and the site says so rather than borrowing another product's data.
