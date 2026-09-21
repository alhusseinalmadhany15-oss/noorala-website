/* =====================================================================
   NOORALA — tests/smoke.mjs
   ---------------------------------------------------------------------
   The checks that would have caught what shipped broken before: content
   revealed but frozen mid-animation, photos clipped to nothing, a header
   too wide for a phone, and a quiz whose result was invisible.

   Run locally:  node tests/smoke.mjs
   CI runs the same file. No test framework — it exits non-zero on failure
   and prints what broke.
   ===================================================================== */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 8123;
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.png': 'image/png',
  '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain'
};

let failures = 0;
const ok = (name, cond, detail = '') => {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise(r => server.listen(PORT, r));
const BASE = `http://127.0.0.1:${PORT}`;

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--ignore-certificate-errors']
});

async function page(ctx) {
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => {
    const t = m.text();
    // Google Fonts is blocked in sandboxed CI; that is not a site failure.
    if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ERR_CERT|Failed to load resource/i.test(t)) errors.push(t);
  });
  p.on('requestfailed', r => {
    if (r.url().startsWith(BASE)) errors.push('failed request: ' + r.url());
  });
  p.errors = errors;
  return p;
}
const settle = async (p) => {
  await p.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await p.waitForTimeout(2600);
  const h = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 380) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(70); }
  await p.waitForTimeout(3000);
};

/* ---------------------------------------------------------------- desktop */
console.log('\nDesktop (1366×900)');
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, ignoreHTTPSErrors: true });
  const p = await page(ctx);
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await settle(p);

  ok('page title is set', (await p.title()).includes('Noorala'));
  ok('prices render', /OMR/.test(await p.textContent('#priceNow')));

  // Every revealed element must finish its animation rather than freeze
  // part-way. Only rendered elements count: a transition cannot run inside
  // a display:none panel, so those legitimately hold their start value.
  const stuck = await p.evaluate(() => {
    const bad = [];
    document.querySelectorAll('.mo.mo-in').forEach(e => {
      if (e.offsetParent === null) return;
      const cs = getComputedStyle(e);
      if (cs.transform !== 'none' || cs.filter !== 'none') bad.push(e.dataset.mo + ':' + e.className);
    });
    return bad;
  });
  ok('no reveal is stuck mid-animation', stuck.length === 0, stuck.slice(0, 3).join(', '));

  // The clip-path reveal used to hide two photos permanently. Frames in a
  // mode that is not on screen are not expected to have revealed yet.
  const frames = await p.evaluate(() =>
    [...document.querySelectorAll('.imgframe')].filter(f => f.offsetParent !== null).map(f => ({
      revealed: f.classList.contains('mo-in'),
      clip: getComputedStyle(f.querySelector('img')).clipPath
    })));
  ok('framed photos are revealed', frames.length > 0 && frames.every(f => f.revealed && !/100%/.test(f.clip)),
    JSON.stringify(frames));

  // every image that is on screen must have actually decoded
  const broken = await p.evaluate(() =>
    [...document.querySelectorAll('img')].filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc));
  ok('no broken images', broken.length === 0, broken.join(', '));

  // the same two checks again in each of the other modes
  for (const mode of ['deep', 'partner']) {
    await p.click(`.modeswitch button[data-mode="${mode}"]`);
    await p.waitForTimeout(1500);
    const h2 = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h2; y += 380) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(70); }
    await p.waitForTimeout(3000);
    const bad = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll('.mo.mo-in').forEach(e => {
        if (e.offsetParent === null) return;
        const cs = getComputedStyle(e);
        if (cs.transform !== 'none' || cs.filter !== 'none') out.push(e.dataset.mo);
      });
      document.querySelectorAll('.imgframe').forEach(f => {
        if (f.offsetParent === null) return;
        if (/100%/.test(getComputedStyle(f.querySelector('img')).clipPath)) out.push('clipped photo');
      });
      return out;
    });
    ok(`${mode} mode reveals everything`, bad.length === 0, bad.slice(0, 3).join(', '));
  }

  ok('no console or page errors', p.errors.length === 0, p.errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ----------------------------------------------------------------- mobile */
console.log('\nMobile (390×844)');
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true
  });
  const p = await page(ctx);
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);

  // the header once measured 595px here, so browsers zoomed the whole page out
  const width = await p.evaluate(() => document.documentElement.scrollWidth);
  ok('page fits the viewport', width <= 392, `scrollWidth ${width}`);
  ok('menu button is reachable', await p.evaluate(() => {
    const r = document.querySelector('#burger').getBoundingClientRect();
    return r.right <= innerWidth + 1 && r.left >= 0;
  }));
  ok('no console or page errors', p.errors.length === 0, p.errors.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ------------------------------------------------------- quiz and tracker */
console.log('\nInteractive');
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, ignoreHTTPSErrors: true });
  const p = await page(ctx);
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await p.waitForTimeout(2600);

  // cart
  await p.click('#addCart');
  await p.waitForTimeout(700);
  ok('adding to the bag updates the count', (await p.textContent('#cartCount')) === '1');
  ok('checkout builds a WhatsApp link', (await p.getAttribute('#cartWa', 'href') || '').startsWith('https://wa.me/'));
  await p.keyboard.press('Escape');          // the bag's scrim blocks everything behind it
  await p.waitForTimeout(600);

  // quiz — its result headline used to render at opacity 0
  await p.click('.modeswitch button[data-mode="deep"]');
  await p.waitForTimeout(1400);
  await p.click('[data-open-xp]');
  await p.waitForTimeout(800);
  for (let i = 0; i < 8; i++) { await p.click('.opt >> nth=0'); await p.waitForTimeout(380); }
  await p.waitForTimeout(2600);
  const arch = await p.evaluate(() => {
    const a = document.querySelector('#qStage .arch');
    const w = a && a.querySelector('.mword-i');
    return { text: a ? a.textContent.trim() : '', opacity: w ? getComputedStyle(w).opacity : '1' };
  });
  ok('quiz result is visible', arch.text.length > 0 && parseFloat(arch.opacity) > 0.9, JSON.stringify(arch));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(600);

  // 90-day tracker
  await p.evaluate(() => { const e = document.querySelector('#journey'); scrollTo(0, e.getBoundingClientRect().top + scrollY - 8); });
  await p.waitForTimeout(600);
  ok('tracker starts in its preview state', await p.isVisible('#jrPreview'));
  await p.click('#jrStart');
  await p.waitForTimeout(800);
  ok('starting the journey opens the live tracker', await p.isVisible('#jrLive'));
  ok('the journey begins on day 1', (await p.textContent('#jrDay')) === '1');
  for (const t of ['ritual', 'hydration', 'checkin']) { await p.click(`#jrTasks [data-task="${t}"]`); await p.waitForTimeout(280); }
  ok('a completed day counts', (await p.textContent('#jrDone')) === '1' && (await p.textContent('#jrStreak')) === '1');
  ok('the consistency ring paints', await p.evaluate(() => {
    const c = document.querySelector('#jrRing');
    return !!c.style.strokeDasharray && getComputedStyle(c).stroke.includes('url');
  }));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2400);
  await p.click('.modeswitch button[data-mode="deep"]');
  await p.waitForTimeout(1300);
  ok('the journey survives a reload', await p.isVisible('#jrLive'));

  // chat
  await p.click('#ncFab');
  await p.waitForTimeout(1300);
  await p.fill('#ncInput', 'how much does it cost?');
  await p.press('#ncInput', 'Enter');
  await p.waitForTimeout(1500);
  ok('the chat answers a price question', /OMR/.test(await p.textContent('#ncLog .nc-noor:last-child .nc-body')));
  await p.fill('#ncInput', 'what is the weather in paris');
  await p.press('#ncInput', 'Enter');
  await p.waitForTimeout(1500);
  ok('the chat refuses what it does not know',
    /don't have a reliable answer|outside what I know/.test(await p.textContent('#ncLog .nc-noor:last-child .nc-body')));

  ok('no console or page errors', p.errors.length === 0, p.errors.slice(0, 3).join(' | '));
  await ctx.close();
}

await browser.close();
server.close();

console.log(failures ? `\n${failures} check(s) failed\n` : '\nAll checks passed\n');
process.exit(failures ? 1 : 0);
