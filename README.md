# Noorala — www.nooralacare.com

Static marketing and ordering site for Noorala Collagen. No build step, no
framework, no backend — plain HTML, CSS and JavaScript, deployed straight from
this repository to GitHub Pages.

```
index.html                  the whole site (three modes in one page)
404.html                    not-found page
robots.txt  sitemap.xml     crawler files
site.webmanifest            installable-app metadata
favicon.ico
CNAME                       www.nooralacare.com
assets/css/noorala.css      design system, layout, motion, chat
assets/js/noorala.js        shop, cart, quiz, skin snapshot, motion, background
assets/js/chat.js           "Noor", the on-site concierge
assets/img/                 product photography (WebP + JPEG), icons, social card
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

> The pack prices are still placeholders. Replace them with real retail prices
> before launch — they appear in the shop, the cart, the chat and the JSON-LD
> `Product` block in `index.html`.

**What the chat knows** — `KB` at the top of `assets/js/chat.js`. Each entry is
`{ id, k: [trigger words, English and Arabic], a: answer HTML, c: [follow-up chips] }`.
Add an entry and it is live; there is no training step and no API key. The
assistant answers only from this list and hands anything else to WhatsApp, so
adding a topic is the only way to make it answer that topic.

**Product photography** — `assets/img/`. Each photo ships as a `.webp` and a
`.jpg`; replace both and keep the filenames, or the flavour switcher (which
swaps by basename through `window.NooralaPhoto`) will not find them.

## How ordering works

There is no payment processing. The bag lives in the visitor's own browser
(`localStorage`), and checkout opens a pre-written WhatsApp message containing
the order, a reference like `NR-0921-1432`, and blanks for name, address and
payment preference. Stock, address and payment are confirmed by a person in
that chat. The same message is available as "copy the order" for anyone whose
browser blocks the WhatsApp deep link.

## Privacy

Nothing is collected. No analytics, no cookies set by us, no form posts. The
skin snapshot reads the uploaded photo in a `<canvas>` inside the browser and
never uploads it. The bag and the chat transcript are stored on the visitor's
device and can be cleared by them at any time.

## Working on it locally

```sh
python3 -m http.server 8000     # then open http://localhost:8000
```

Root-relative paths (`/favicon.ico`, `/site.webmanifest`) need a server, so
opening `index.html` from the filesystem will look subtly wrong.

## Claims and compliance

Product claims follow the approved pack label. The pack states **15,000 mg of
collagen per box** (30 × 10 g sachets) — the site says the same, in the hero
chips, the fact bar, the ingredients rail, the specification table, the science
panel and the chat. If the label ever changes, those six places and the
`Product` JSON-LD in `index.html` change with it.

Nutrient statements are restricted to recognised nutrient-function claims for
the vitamins and minerals in the formula. No clinical trial has been run on
this product and the site says so rather than borrowing another product's data.
