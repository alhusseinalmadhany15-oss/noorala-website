/* =====================================================================
   NOORALA — noorala.js
   Core site behaviour. Loaded with `defer`, so the DOM is ready.
   ===================================================================== */

/* ---------------------------------------------------------------------
   Shared photo helper. Photos are served as WebP with a JPEG fallback,
   so swapping a flavour has to move the <source> as well as the <img>.
   --------------------------------------------------------------------- */
window.NooralaPhoto = function(img, base){
  if(!img) return;
  var pic = img.parentElement;
  if(pic && pic.tagName === "PICTURE"){
    var src = pic.querySelector("source");
    if(src) src.srcset = "assets/img/" + base + ".webp";
  }
  img.src = "assets/img/" + base + ".jpg";
};


/* ===== 1 · ANATOMY / EXPLODED BOX VIEW ===== */
(function(){
  const POINTS = [
    {x:8, y:18, t:"Outer box",            d:"Premium carton built to protect the sachets and carry the brand on a pharmacy shelf."},
    {x:8, y:31, t:"Easy-open flap",       d:"Opens cleanly and closes securely, so the box lives on a counter without falling apart."},
    {x:8, y:44, t:"30 individual sachets",d:"Each one sealed on its own — freshness kept, no scooping, no measuring."},
    {x:8, y:60, t:"Key benefits",         d:"Radiant skin, healthy hair, strong nails and joint support, printed in Arabic and English."},
    {x:8, y:72, t:"Flavour",              d:"Strawberry and mango — the difference between finishing a box and forgetting it."},
    {x:84,y:31, t:"Sachet design",        d:"A slim 10 g stick that fits a handbag, a desk drawer or a suitcase."},
    {x:82,y:47, t:"High-strength collagen",d:"15,000 mg of hydrolyzed collagen peptides per box, as stated on the pack."},
    {x:84,y:64, t:"Portable by design",   d:"Home, office, gym or travel — the ritual moves with you."},
    {x:84,y:82, t:"Hydrolyzed formula",   d:"Peptides cut short so the powder dissolves in cold water in about twenty seconds."}
  ];
  const IMGS = {strawberry:"anatomy-strawberry", mango:"anatomy-mango"};
  const stage=document.getElementById("anatStage"), img=document.getElementById("anatImg"),
        spot=document.getElementById("anatSpot"), ring=document.getElementById("anatRing"),
        ringN=document.getElementById("anatRingN"), list=document.getElementById("anatList"),
        bar=document.getElementById("anatBar");
  const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
  let idx=0, timer=null, playing=false;

  list.innerHTML = POINTS.map((p,i)=>
    `<li><button aria-pressed="${i===0}" data-i="${i}"><span class="n">${i+1}</span>
      <span><b>${p.t}</b><span class="d">${p.d}</span></span></button></li>`).join("");

  function paint(i, user){
    idx=i;
    const p=POINTS[i];
    ring.style.left=p.x+"%"; ring.style.top=p.y+"%"; ringN.textContent=i+1;
    const mask=`radial-gradient(circle at ${p.x}% ${p.y}%, transparent 0 9%, rgba(0,0,0,.55) 20%, #000 34%)`;
    spot.style.webkitMaskImage=mask; spot.style.maskImage=mask;
    stage.classList.add("lit","zoom");
    list.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed", String(+b.dataset.i===i)));
    if(!RM){ bar.classList.remove("run"); void bar.offsetWidth; if(playing && !user) bar.classList.add("run"); }
    if(user) stop();
  }
  function start(){ if(RM||playing) return; playing=true; bar.classList.add("run");
    timer=setInterval(()=>paint((idx+1)%POINTS.length), 3400); paint(idx); }
  function stop(){ playing=false; clearInterval(timer); bar.classList.remove("run"); }

  list.addEventListener("click", e=>{ const b=e.target.closest("button"); if(b) paint(+b.dataset.i, true); });
  stage.addEventListener("click", ()=> playing ? stop() : start());
  stage.addEventListener("mouseenter", stop);

  document.querySelectorAll("[data-af]").forEach(b=>b.setAttribute("data-f", b.dataset.af));
  document.querySelectorAll("[data-af]").forEach(b=>b.addEventListener("click",()=>{
    document.querySelectorAll("[data-af]").forEach(x=>x.setAttribute("aria-pressed", String(x===b)));
    const f=b.dataset.af;
    stage.classList.toggle("mango", f==="mango");
    img.style.opacity=0;
    setTimeout(()=>{
      window.NooralaPhoto(img, IMGS[f]);
      img.alt="Noorala Collagen "+f+" — exploded view of the box, sachets and key features";
      img.style.opacity=1;
    }, 240);
  }));

  new IntersectionObserver(es=>{ es.forEach(e=> e.isIntersecting ? start() : stop()); },{threshold:.35})
    .observe(document.getElementById("anatomy"));
  paint(0, true);
})();

/* ===== 2 · CORE APP ===== */
(function(){
"use strict";

/* =====================================================================
   0 · CONFIG — edit these values to run the real business
   ===================================================================== */
const CFG = {
  wa: "96890106968",                    // WhatsApp number, international format, no +
  phone: "+968 9010 6968",
  email: "hello@noorala.com",
  ig: "https://www.instagram.com/noorala_care",
  currency: "OMR",
  // Order desk hours, local Oman time (UTC+4). Used by the chat + WhatsApp dock.
  hours: { days:[0,1,2,3,4,6], open:9, close:21, tz:4, label:"Sat–Thu, 9:00–21:00 (Muscat)" },
  freeDelivery: 20,                     // free Muscat delivery over this subtotal
  // PRICES ARE PLACEHOLDERS — replace with your real retail prices
  packs: {
    1: { boxes:1, price:24.900, was:0,      label:"1 Box — Starter" },
    2: { boxes:2, price:44.900, was:49.800, label:"2 Boxes — Duo" },
    3: { boxes:3, price:64.900, was:74.700, label:"3 Boxes — 90-Day Journey" }
  }
};
/* Is the order desk open right now, in Muscat time? */
function deskOpen(){
  const now = new Date();
  const m = new Date(now.getTime() + (CFG.hours.tz*60 + now.getTimezoneOffset())*60000);
  return CFG.hours.days.indexOf(m.getDay()) > -1 && m.getHours() >= CFG.hours.open && m.getHours() < CFG.hours.close;
}
/* A short human reference so an order can be found again in the chat thread. */
function orderRef(){
  const d = new Date();
  const p = n => String(n).padStart(2,"0");
  return "NR-" + p(d.getMonth()+1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes());
}
window.NooralaCFG = CFG;
window.NooralaDeskOpen = deskOpen;

/* Analytics is optional and may be switched off entirely, so everything
   funnels through one helper that is safe to call unconditionally. */
function track(name, props){
  try{ if(window.NooralaAnalytics) window.NooralaAnalytics.track(name, props); }catch(e){}
}
window.NooralaTrack = track;
const money = n => CFG.currency + " " + n.toFixed(3);
const waLink = t => "https://wa.me/" + CFG.wa + "?text=" + encodeURIComponent(t);
const $  = (s,r=document) => r.querySelector(s);
const $$ = (s,r=document) => Array.from(r.querySelectorAll(s));

/* small helpers -------------------------------------------------- */
let toastT;
function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(()=>t.classList.remove("on"), 2600);
}
function press(group, el){ group.forEach(b=>b.setAttribute("aria-pressed", String(b===el))); }

/* =====================================================================
   1 · MODES — Express / Discover / Partners
   ===================================================================== */
const NAV = {
  express: [["#shop","Shop"],["#inside","What's inside"],["#anatomy","The box"],["#ritual","How to use"],["#why","Why Noorala"],["#faq","FAQ"],["#contact","Contact"]],
  deep:    [["#profile","Profile"],["#snapshot","Skin snapshot"],["#build","Build ritual"],["#science","Science"],["#journey","90-day journey"],["#contact","Contact"]],
  partner: [["#activation","Activation"],["#value","Value"],["#partner-form","Request pack"],["#contact","Contact"]]
};
function setMode(mode, jump){
  if(document.body.dataset.mode !== mode) track("mode", {mode: mode});
  document.body.dataset.mode = mode;
  $$(".modeswitch button").forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.mode===mode)));
  const links = NAV[mode].map(([h,t])=>`<a href="${h}">${t}</a>`).join("");
  $("#navlinks").innerHTML = links;
  $("#drawerNav").innerHTML = links;
  bindSmooth();
  revealScan();
  if(jump){
    requestAnimationFrame(()=>{
      const el = document.querySelector(jump);
      if(el) el.scrollIntoView({behavior:"smooth",block:"start"});
    });
  } else {
    window.scrollTo({top:0,behavior:"smooth"});
  }
}
$$(".modeswitch button").forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));
document.addEventListener("click", e=>{
  const t = e.target.closest("[data-mode-jump]");
  if(!t) return;
  const href = t.dataset.target || t.getAttribute("href");
  e.preventDefault();
  closeDrawer();
  setMode(t.dataset.modeJump, href && href.startsWith("#") ? href : null);
});

/* nav behaviour --------------------------------------------------- */
function bindSmooth(){
  $$('a[href^="#"]').forEach(a=>{
    if(a.dataset.bound || a.dataset.modeJump) return; a.dataset.bound = "1";
    a.addEventListener("click", e=>{
      const id = a.getAttribute("href");
      if(id.length < 2) return;
      const el = document.querySelector(id);
      if(!el) return;
      e.preventDefault(); closeDrawer();
      el.scrollIntoView({behavior:"smooth",block:"start"});
    });
  });
}
const drawer = $("#drawer");
function setDrawer(open){
  drawer.classList.toggle("open", open);
  drawer.setAttribute("aria-hidden", String(!open));
  drawer.toggleAttribute("inert", !open);
  $("#burger").setAttribute("aria-expanded", String(open));
  $("#burger").setAttribute("aria-label", open ? "Close menu" : "Open menu");
  document.body.classList.toggle("no-scroll", open);
  if(open) panelOpened(drawer, $("#drawerClose")); else panelClosed();
}
function closeDrawer(){ if(drawer.classList.contains("open")) setDrawer(false); }
drawer.addEventListener("keydown", e => { if(drawer.classList.contains("open")) trap(drawer, e); });
$("#burger").addEventListener("click",()=> setDrawer(!drawer.classList.contains("open")));
$("#drawerClose").addEventListener("click", closeDrawer);
addEventListener("scroll",()=>{ $("#nav").classList.toggle("stuck", scrollY>12); },{passive:true});
$("#yr").textContent = new Date().getFullYear();

/* reveal on scroll ------------------------------------------------ */
const io = new IntersectionObserver(es=>{
  es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); } });
},{threshold:.12, rootMargin:"0px 0px -40px 0px"});
function revealScan(){ $$(".rv:not(.in)").forEach(el=>io.observe(el)); }

/* =====================================================================
   2 · SHOP — flavour, pack, quantity, cart, WhatsApp checkout
   ===================================================================== */
const IMG = { strawberry:"box-strawberry", mango:"box-mango" };

const state = { flavour:"strawberry", pack:"1", qty:1, cart:[] };

/* The bag survives a refresh — people compare flavours, leave, and come back. */
const BAG_KEY = "noorala.bag.v1";
function saveBag(){
  try{ localStorage.setItem(BAG_KEY, JSON.stringify(state.cart)); }catch(e){}
}
function loadBag(){
  try{
    const raw = JSON.parse(localStorage.getItem(BAG_KEY) || "[]");
    if(!Array.isArray(raw)) return;
    state.cart = raw.filter(c => c && CFG.packs[c.pack] && +c.qty > 0)
                    .map(c => ({pack:String(c.pack), flavour:c.flavour==="mango"?"mango":"strawberry",
                                qty:Math.min(20, Math.max(1, Math.round(+c.qty))), note:String(c.note||"").slice(0,60)}));
  }catch(e){ state.cart = []; }
}
loadBag();

function renderPrices(){
  Object.keys(CFG.packs).forEach(k=>{
    const el = document.querySelector(`[data-price="${k}"]`);
    if(el) el.textContent = money(CFG.packs[k].price);
  });
  const p = CFG.packs[state.pack];
  $("#priceNow").textContent = money(p.price * state.qty);
  $("#priceWas").textContent = p.was ? money(p.was * state.qty) : "";
  const f = state.flavour === "mango" ? "Mango" : "Strawberry";
  $("#waBuy").href = waLink(`Hi Noorala 🌿\nI'd like to order:\n• ${p.label} — ${f}\n• Quantity: ${state.qty}\n• Total: ${money(p.price*state.qty)}\n\nMy name:\nDelivery area:`);
}
$$(".flavor").forEach(b=>b.addEventListener("click",()=>{
  press($$(".flavor"), b);
  state.flavour = b.dataset.f;
  const pv = $("#pv"), img = $("#pvImg");
  pv.classList.toggle("mango", state.flavour==="mango");
  img.style.opacity = 0;
  setTimeout(()=>{
    window.NooralaPhoto(img, IMG[state.flavour]);
    img.alt = "Noorala Collagen — " + state.flavour + " flavour box with sachets";
    img.style.opacity = 1;
  }, 220);
  renderPrices();
}));
$$(".pack").forEach(b=>b.addEventListener("click",()=>{ press($$(".pack"), b); state.pack = b.dataset.pack; renderPrices(); }));
$("#qMinus").addEventListener("click",()=>{ state.qty = Math.max(1, state.qty-1); $("#qVal").textContent = state.qty; renderPrices(); });
$("#qPlus").addEventListener("click",()=>{ state.qty = Math.min(20, state.qty+1); $("#qVal").textContent = state.qty; renderPrices(); });

/* focus management ------------------------------------------------
   Every panel that covers the page keeps the keyboard inside itself and
   hands focus back to whatever opened it. Without this the cart, the
   drawer and the quiz are all traps for screen-reader and keyboard users. */
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
let lastFocus = null;
function focusables(root){
  return $$(FOCUSABLE, root).filter(el => el.offsetParent !== null || el === document.activeElement);
}
function trap(root, e){
  if(e.key !== "Tab") return;
  const f = focusables(root);
  if(!f.length) return;
  const first = f[0], last = f[f.length-1];
  if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
}
function panelOpened(root, focusEl){
  lastFocus = document.activeElement;
  requestAnimationFrame(()=>{ (focusEl || focusables(root)[0] || root).focus(); });
}
function panelClosed(){
  if(lastFocus && document.contains(lastFocus)) lastFocus.focus();
  lastFocus = null;
}

/* cart ------------------------------------------------------------ */
const cartEl = $("#cart"), scrim = $("#scrim");
let cartIsOpen = false;
function openCart(o){
  if(o === cartIsOpen) return;
  cartIsOpen = o;
  cartEl.classList.toggle("open",o); scrim.classList.toggle("on",o);
  cartEl.setAttribute("aria-hidden", String(!o));
  cartEl.toggleAttribute("inert", !o);
  document.body.classList.toggle("no-scroll", o);
  if(o){
    if(window.NooralaChat) window.NooralaChat.close();
    panelOpened(cartEl, $("#cartClose"));
  } else panelClosed();
}
cartEl.addEventListener("keydown", e => { if(cartIsOpen) trap(cartEl, e); });
$("#cartOpen").addEventListener("click",()=>openCart(true));
$("#cartClose").addEventListener("click",()=>openCart(false));
scrim.addEventListener("click",()=>openCart(false));

function addToCart(item, opts){
  const same = state.cart.find(c=>c.pack===item.pack && c.flavour===item.flavour && c.note===item.note);
  if(same) same.qty += item.qty; else state.cart.push(item);
  renderCart();
  /* The chat adds items too, and sliding the drawer out over the open chat
     panel would bury the very message confirming the add. */
  if(!opts || !opts.silent){ openCart(true); toast("Added to your bag"); }
  track("add_to_cart", {pack: CFG.packs[item.pack].label, flavour: item.flavour, source: (opts && opts.silent) ? "chat" : "shop"});
}
function renderCart(){
  const body = $("#cartBody");
  if(!state.cart.length){ body.innerHTML = '<p class="small">Your bag is empty. Two flavours are waiting.</p>'; }
  else{
    body.innerHTML = state.cart.map((c,i)=>`
      <div class="ci">
        <span class="thumb ${c.flavour==='mango'?'mango':''}">${c.flavour==='mango'?'M':'S'}</span>
        <div><b>${CFG.packs[c.pack].label}</b><span>${c.flavour==='mango'?'Mango':'Strawberry'} · ×${c.qty}${c.note?' · '+c.note:''}</span></div>
        <b style="margin-left:auto;white-space:nowrap">${money(CFG.packs[c.pack].price*c.qty)}</b>
        <button class="x" data-rm="${i}" aria-label="Remove item">✕</button>
      </div>`).join("");
  }
  const total = state.cart.reduce((s,c)=>s+CFG.packs[c.pack].price*c.qty,0);
  $("#cartTotal").textContent = money(total);
  const n = state.cart.reduce((s,c)=>s+c.qty,0);
  $("#cartCount").textContent = n; $("#cartCount").classList.toggle("hide", n===0);
  $("#cartOpen").setAttribute("aria-label", n ? `Open your bag — ${n} item${n>1?"s":""}` : "Open your bag — empty");

  /* free-delivery nudge */
  const note = $("#cartNote");
  if(note){
    const gap = CFG.freeDelivery - total;
    if(!n) note.textContent = "";
    else if(gap > 0) note.textContent = `Add ${money(gap)} more for free delivery in Muscat.`;
    else note.textContent = "Free delivery in Muscat — included.";
  }
  $("#cartCheckout").classList.toggle("hide", n === 0);

  $("#cartWa").href = waLink(orderMessage());
  saveBag();
  if(window.__nooralaCartHooks) window.__nooralaCartHooks.forEach(fn => fn());
}
window.__nooralaCartHooks = [];
/* One canonical order message — the cart, the chat and the copy-to-clipboard
   fallback all send exactly the same thing, so the desk reads one format. */
function orderMessage(){
  const total = state.cart.reduce((s,c)=>s+CFG.packs[c.pack].price*c.qty,0);
  const lines = state.cart.map(c=>`• ${CFG.packs[c.pack].label} — ${c.flavour==='mango'?'Mango':'Strawberry'} ×${c.qty}${c.note?' ('+c.note+')':''} — ${money(CFG.packs[c.pack].price*c.qty)}`).join("\n");
  const delivery = total >= CFG.freeDelivery ? "Free delivery in Muscat" : "Delivery charged at checkout";
  return `Hi Noorala 🌿\n\nOrder reference: ${orderRef()}\n\n${lines || '—'}\n\nSubtotal: ${money(total)}\n${delivery}\n\nMy name:\nDelivery area:\nPreferred payment (cash on delivery / transfer / card link):`;
}
window.NooralaBag = {
  add: (item, opts) => addToCart(item, opts),
  open: () => openCart(true),
  count: () => state.cart.reduce((s,c)=>s+c.qty,0),
  total: () => state.cart.reduce((s,c)=>s+CFG.packs[c.pack].price*c.qty,0),
  message: orderMessage,
  money: money,
  waLink: waLink
};
$("#cartBody").addEventListener("click",e=>{
  const b = e.target.closest("[data-rm]"); if(!b) return;
  state.cart.splice(+b.dataset.rm,1); renderCart();
});
$("#addCart").addEventListener("click",()=>addToCart({pack:state.pack, flavour:state.flavour, qty:state.qty, note:""}));
$("#cartWa").addEventListener("click", ()=> track("checkout_whatsapp", {items: state.cart.reduce((s,c)=>s+c.qty,0), value: state.cart.reduce((s,c)=>s+CFG.packs[c.pack].price*c.qty,0)}));
$("#waBuy").addEventListener("click", ()=> track("order_whatsapp_direct", {pack: CFG.packs[state.pack].label, flavour: state.flavour}));
renderPrices(); renderCart();

/* =====================================================================
   3 · COLLAGEN PROFILE — 8-question experience
   ===================================================================== */
const Q = [
  { k:"age", t:"Where are you in life?", s:"Collagen priorities shift with the decade you're in.",
    o:[["18–24","Prevention mindset","🌱",{skin:6,con:4}],["25–34","First maintenance","✨",{skin:9,con:5}],
       ["35–44","Active support","◐",{skin:12,rec:5}],["45+","Full support","◆",{skin:12,rec:9}]] },
  { k:"goal", t:"What are you actually here for?", s:"Pick the one that matters most right now.",
    o:[["Glow","Skin first","◇",{skin:24,con:3}],["Hair &amp; Nails","Strength &amp; growth","〰",{hair:24}],
       ["Recovery","Joints &amp; training","◠",{rec:24}],["Daily Wellness","All-round","✦",{con:14,skin:6,rec:6}]] },
  { k:"skin", t:"If you had to fix one thing about your skin…", s:"There is no wrong answer here.",
    o:[["Dryness","It feels tight","💧",{skin:10,hyd:8}],["Dullness","It lost its light","☀",{skin:14}],
       ["Fine lines","Early signs","◐",{skin:12,rec:4}],["Texture","Unevenness","▦",{skin:10,con:4}]] },
  { k:"water", t:"How much water on an ordinary day?", s:"Be honest — Muscat summers are not kind to this number.",
    o:[["Under 1 L","It slips my mind","·",{hyd:4}],["1–2 L","Most days","··",{hyd:12}],
       ["2–3 L","I keep a bottle","···",{hyd:20}],["Over 3 L","Always hydrated","••••",{hyd:26,con:5}]] },
  { k:"sun", t:"How much of your day is spent outdoors?", s:"Sun exposure shapes the routine we suggest around the sachet.",
    o:[["Rarely","Mostly indoors, AC","🏢",{con:4}],["A little","Commute only","🚗",{con:3}],
       ["Daily","Outdoor errands, walks","🌤",{skin:5}],["Most of it","Outdoor work or sport","☀",{skin:8,rec:5}]] },
  { k:"sleep", t:"And sleep?", s:"Recovery happens at night, or it doesn't happen.",
    o:[["Under 5 h","Running on empty","◔",{rec:4}],["5–6 h","Not enough","◑",{rec:8}],
       ["6–7 h","Reasonable","◕",{rec:14,con:6}],["7 h+","Protected","●",{rec:20,con:10}]] },
  { k:"moment", t:"When would you realistically take it?", s:"The moment you'll keep beats the moment that sounds best.",
    o:[["Morning","With breakfast","🌅",{con:12}],["After workout","Post-training","💪",{rec:10,con:8}],
       ["Afternoon","Mid-day reset","🌤",{con:6}],["Evening","Wind-down","🌙",{con:10}]] },
  { k:"flavour", t:"Last one — strawberry or mango?", s:"You can always switch. The Duo pack exists for exactly this reason.",
    o:[["Strawberry","Soft &amp; classic","🍓",{}],["Mango","Warm &amp; full","🥭",{}],["Surprise me","Send either","✦",{}]] }
];
const ARCH = {
  skin:{n:"The <em>Glow Seeker</em>", d:"Your routine is built around skin appearance and light — the sachet is the inside step of a skincare ritual you already care about."},
  hair:{n:"The <em>Strand &amp; Shine</em>", d:"Hair and nails lead your priorities, so consistency and the biotin–zinc side of the formula do the heavy lifting."},
  rec:{n:"The <em>Restorer</em>", d:"You're asking your body for a lot — training, long days, short nights. Your ritual is a recovery anchor."},
  con:{n:"The <em>Steady One</em>", d:"You don't chase results, you keep routines. That's the rarest advantage in this category — and the one that actually finishes 90 days."}
};
const answers = {}; let qi = 0;
const xp = $("#xp");

function openXp(){
  xp.classList.add("open"); xp.removeAttribute("inert"); xp.setAttribute("aria-hidden","false");
  document.body.classList.add("no-scroll");
  qi=0; renderQ();
  panelOpened(xp, $("#xpClose"));
}
function closeXp(){
  if(!xp.classList.contains("open")) return;
  xp.classList.remove("open"); xp.setAttribute("inert",""); xp.setAttribute("aria-hidden","true");
  document.body.classList.remove("no-scroll");
  panelClosed();
}
xp.addEventListener("keydown", e => { if(xp.classList.contains("open")) trap(xp, e); });
$("#xpClose").addEventListener("click", closeXp);
document.addEventListener("keydown", e=>{
  if(e.key !== "Escape") return;
  if(xp.classList.contains("open")) return closeXp();
  if(cartIsOpen) return openCart(false);
  if(drawer.classList.contains("open")) return closeDrawer();
  if(waDock && waDock.classList.contains("open")){ waDock.classList.remove("open"); $("#waFab").setAttribute("aria-expanded","false"); $("#waFab").focus(); }
});
$$("[data-open-xp]").forEach(b=>b.addEventListener("click", openXp));

function renderQ(){
  const total = Q.length;
  $("#qNav").style.display = "flex";
  $("#xpBar").style.width = (qi/total*100) + "%";
  $("#qCount").textContent = `Question ${qi+1} of ${total}`;
  const q = Q[qi];
  $("#qStage").innerHTML = `
    <div class="q-step on">
      <span class="eyebrow on-dark">Collagen profile</span>
      <h3>${q.t}</h3>
      <p class="qsub">${q.s}</p>
      <div class="opts ${q.o.length===3?'three':''}">
        ${q.o.map((o,i)=>`<button class="opt" data-i="${i}" aria-pressed="${answers[q.k]===i?'true':'false'}">
          <span class="oi">${o[2]}</span><span><b>${o[0]}</b><span>${o[1]}</span></span></button>`).join("")}
      </div>
    </div>`;
  $("#qBack").style.visibility = qi===0 ? "hidden" : "visible";
  $("#qBack").disabled = qi===0;
  const opts = $$(".opt");
  opts.forEach(b=>b.addEventListener("click",()=>{
    answers[q.k] = +b.dataset.i;
    press(opts, b);
    setTimeout(()=>{ qi++; qi<Q.length ? renderQ() : renderResult(); }, 260);
  }));
  /* the stage is rebuilt every question, so focus has to be placed again */
  const h = $("#qStage h3");
  if(h){ h.setAttribute("tabindex","-1"); h.focus({preventScroll:true}); }
}
$("#qBack").addEventListener("click",()=>{ if(qi>0){ qi--; renderQ(); } });

function scores(){
  const s = {skin:10, hair:8, rec:10, con:14, hyd:8};
  Q.forEach(q=>{ const a = answers[q.k]; if(a==null) return;
    const w = q.o[a][3] || {};
    Object.keys(w).forEach(k=> s[k] = (s[k]||0) + w[k]);
  });
  const cap = v => Math.max(38, Math.min(96, Math.round(v * 2.05)));
  return { skin:cap(s.skin), hair:cap(s.hair), rec:cap(s.rec), con:cap(s.con), hyd:cap(s.hyd), raw:s };
}
function renderResult(){
  const s = scores();
  const goalIdx = answers.goal ?? 0;
  const key = ["skin","hair","rec","con"][goalIdx];
  const a = ARCH[key];
  const flav = ["Strawberry","Mango","Strawberry"][answers.flavour ?? 0];
  const moment = Q[6].o[answers.moment ?? 0][0];
  const why = [];
  why.push(`You chose <b>${Q[1].o[goalIdx][0]}</b> as your focus, so the ritual is built around it.`);
  why.push(`Your ${moment.toLowerCase()} slot is the one you said you'd actually keep — that's where the sachet goes.`);
  if(s.hyd < 60) why.push(`Your water intake is on the low side, so the sachet doubles as a full glass of water every day.`);
  else why.push(`You already hydrate well — the sachet slots into a habit you have, instead of asking for a new one.`);
  if(s.rec < 60) why.push(`Short sleep means recovery is your bottleneck: keep the dose daily rather than doubling up occasionally.`);
  if((answers.sun ?? 0) >= 2) why.push(`You're outdoors often — pair the ritual with daily sun protection, which does more for skin appearance than any supplement.`);
  why.push(`${flav} matches the flavour you picked, and the Duo pack lets you keep the other one on the counter.`);

  $("#qNav").style.display = "none";
  $("#xpBar").style.width = "100%";
  $("#qStage").innerHTML = `
    <div class="q-step on">
      <div class="result-hero">
        <span class="eyebrow on-dark">Meet your profile</span>
        <div class="arch">${a.n}</div>
        <p class="lede" style="margin-inline:auto;color:rgba(246,234,239,.7)">${a.d}</p>
      </div>
      <div class="meters">
        <div class="meter"><b><span>Skin focus</span><span>${s.skin}%</span></b><i><em data-w="${s.skin}"></em></i></div>
        <div class="meter"><b><span>Hair &amp; nails focus</span><span>${s.hair}%</span></b><i><em data-w="${s.hair}"></em></i></div>
        <div class="meter"><b><span>Recovery lifestyle</span><span>${s.rec}%</span></b><i><em data-w="${s.rec}"></em></i></div>
        <div class="meter"><b><span>Hydration lifestyle</span><span>${s.hyd}%</span></b><i><em data-w="${s.hyd}"></em></i></div>
        <div class="meter" style="grid-column:1/-1"><b><span>Routine consistency</span><span>${s.con}%</span></b><i><em data-w="${s.con}"></em></i></div>
      </div>
      <div class="ritual-card">
        <span class="eyebrow on-dark" style="margin:0">Your personal collagen ritual</span>
        <div class="ritual-row mt-m">
          <div><b>Moment</b><span>${moment}</span></div>
          <div><b>Serving</b><span>1 sachet</span></div>
          <div><b>Flavour</b><span>${flav}</span></div>
        </div>
        <ul class="why">${why.map(w=>`<li><span>${w}</span></li>`).join("")}</ul>
        <div class="buyrow mt-m">
          <button class="btn" id="resAdd">Start 90-day journey</button>
          <a class="btn on-dark" id="resWa" target="_blank" rel="noopener">Send on WhatsApp</a>
          <button class="btn on-dark" id="resAgain">Retake</button>
        </div>
        <p class="small mt-s" style="color:rgba(246,234,239,.45)">A wellness and product-personalisation profile. It does not measure collagen in your body and is not a medical assessment.</p>
      </div>
    </div>`;
  requestAnimationFrame(()=>$$("#qStage .meter em").forEach(el=>el.style.width = el.dataset.w + "%"));
  const rh = $("#qStage .arch");
  if(rh){ rh.setAttribute("tabindex","-1"); rh.focus({preventScroll:true}); }
  $("#resAgain").addEventListener("click",()=>{ qi=0; renderQ(); });
  $("#resAdd").addEventListener("click",()=>{
    state.pack="3"; state.flavour = flav.toLowerCase(); state.qty=1;
    press($$(".pack"), document.querySelector('.pack[data-pack="3"]'));
    press($$(".flavor"), document.querySelector(`.flavor[data-f="${state.flavour}"]`));
    renderPrices();
    addToCart({pack:"3", flavour:state.flavour, qty:1, note:key==="skin"?"Glow Seeker ritual":"Personal ritual"});
    closeXp();
  });
  track("quiz_complete", {archetype: a.n.replace(/<[^>]+>/g,""), flavour: flav});
  $("#resWa").href = waLink(`Hi Noorala 🌿\nI completed my Collagen Profile:\n\nProfile: ${a.n.replace(/<[^>]+>/g,"")}\nRitual: 1 sachet · ${moment} · ${flav}\nSkin focus ${s.skin}% · Recovery ${s.rec}% · Hydration ${s.hyd}% · Consistency ${s.con}%\n\nI'd like a recommendation for my first order.`);
  // reflect into the ritual builder + dashboard
  const dr = $("#dashRitual"); if(dr) dr.textContent = `1 sachet · ${moment} · ${flav}`;
}

/* =====================================================================
   4 · SKIN SNAPSHOT — all analysis runs locally in the browser
   ===================================================================== */
const stage = $("#scanStage"), fileIn = $("#scanFile"), runBtn = $("#scanRun");
let scanImg = null;
if(fileIn){
  fileIn.addEventListener("change", e=>{
    const f = e.target.files[0]; if(!f) return;
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = ()=>{
      scanImg = img;
      $("#scanEmpty").style.display = "none";
      const old = stage.querySelector("img.up"); if(old) old.remove();
      img.className = "up"; img.alt = "Your uploaded photo (never leaves this device)";
      stage.prepend(img);
      runBtn.disabled = false;
      $("#scanStatus").textContent = "Photo ready · nothing was uploaded";
    };
    img.src = url;
  });
  runBtn.addEventListener("click", runScan);
}
function runScan(){
  if(!scanImg) return;
  stage.classList.add("scanning");
  const msgs = ["Reading the image…","Measuring light distribution…","Mapping tone evenness…","Reading surface detail…","Preparing your snapshot…"];
  let i = 0;
  $("#scanStatus").textContent = msgs[0];
  const t = setInterval(()=>{ i++; $("#scanStatus").textContent = msgs[Math.min(i,msgs.length-1)]; }, 620);
  setTimeout(()=>{
    clearInterval(t);
    stage.classList.remove("scanning");
    const r = analyse(scanImg);
    $("#scanStatus").textContent = "Snapshot complete · nothing left your device";
    const rows = $$("#readouts .ro");
    [r.radiance, r.evenness, r.texture, r.warmth].forEach((v,idx)=>{
      setTimeout(()=>{
        rows[idx].classList.add("in");
        rows[idx].querySelector("[data-v]").textContent = v + "%";
        rows[idx].querySelector("em").style.width = v + "%";
      }, idx*180);
    });
    track("skin_snapshot");
    $("#scanAdvice").classList.remove("hide");
    $("#scanAdviceText").textContent = advice(r);
  }, 3300);
}
function analyse(img){
  const N = 160, c = document.createElement("canvas");
  c.width = N; c.height = N;
  const ctx = c.getContext("2d", {willReadFrequently:true});
  ctx.drawImage(img, 0, 0, N, N);
  const d = ctx.getImageData(0,0,N,N).data;
  let sum=0, sum2=0, rs=0, bs=0, n=0;
  const blocks = new Array(64).fill(0), bc = new Array(64).fill(0);
  for(let y=0;y<N;y++){
    for(let x=0;x<N;x++){
      const p=(y*N+x)*4, R=d[p], G=d[p+1], B=d[p+2];
      const L = .2126*R + .7152*G + .0722*B;
      sum+=L; sum2+=L*L; rs+=R; bs+=B; n++;
      const bi = Math.floor(y/(N/8))*8 + Math.floor(x/(N/8));
      blocks[bi]+=L; bc[bi]++;
    }
  }
  const mean = sum/n;
  const sd = Math.sqrt(Math.max(0, sum2/n - mean*mean));
  const bm = blocks.map((v,i)=>v/bc[i]);
  const bMean = bm.reduce((a,b)=>a+b,0)/bm.length;
  const bSd = Math.sqrt(bm.reduce((a,b)=>a+(b-bMean)**2,0)/bm.length);
  const warmRatio = (rs/n) / Math.max(1, bs/n);
  const map = (v,a,b,lo,hi) => Math.round(Math.max(lo, Math.min(hi, (v-a)/(b-a)*(hi-lo)+lo)));
  return {
    radiance: map(mean, 60, 205, 40, 95),
    evenness: map(60-bSd, 10, 58, 42, 94),
    texture:  map(sd, 22, 78, 45, 93),
    warmth:   map(100 - Math.abs(warmRatio-1.28)*140, 40, 100, 45, 95)
  };
}
function advice(r){
  const out = [];
  if(r.radiance < 62) out.push("the photo reads on the darker side, so start with light: cleanse, a vitamin C serum in the morning, and daily SPF");
  else out.push("light is reading well in this photo — protect it with daily SPF, which is the single highest-return step");
  if(r.evenness < 62) out.push("tone looks uneven across the frame, which usually responds better to consistency than to new products");
  if(r.texture > 78) out.push("high surface contrast can simply be a sharp camera and hard lighting — don't over-read it");
  out.push("alongside skincare, one Noorala sachet a day is the beauty-from-within step, taken at a fixed time");
  return out.join("; ") + ".";
}

/* =====================================================================
   5 · RITUAL BUILDER
   ===================================================================== */
const rb = {goal:"Glow", moment:"Morning", format:"Cold water", flavour:"Strawberry"};
$$("[data-rb]").forEach(group=>{
  const key = group.dataset.rb;
  const btns = $$(".rb-opt", group);
  btns.forEach(b=>b.addEventListener("click",()=>{
    press(btns,b);
    rb[key] = b.dataset.v.replace(/&amp;/g,"&");
    paintRb();
  }));
});
function paintRb(){
  const auto = `The ${rb.moment} ${rb.goal} Ritual`.replace("The After Workout","The Post-Workout");
  const name = ($("#rbName").value || "").trim() || auto;
  $("#rbTitle").textContent = name;
  $("#rbA").textContent = rb.goal; $("#rbB").textContent = rb.moment;
  $("#rbC").textContent = rb.format; $("#rbD").textContent = rb.flavour;
  $("#rbWa").href = waLink(`Hi Noorala 🌿\nI built my ritual on your website:\n\n"${name}"\n• Focus: ${rb.goal}\n• Moment: ${rb.moment}\n• Format: ${rb.format}\n• Flavour: ${rb.flavour}\n\nI'd like to start it.`);
  const dr = $("#dashRitual"); if(dr) dr.textContent = `1 sachet · ${rb.moment} · ${rb.flavour}`;
  return name;
}
if($("#rbName")) $("#rbName").addEventListener("input", paintRb);
if($("#rbAdd")) $("#rbAdd").addEventListener("click",()=>{
  const name = paintRb();
  addToCart({pack:"3", flavour: rb.flavour.toLowerCase(), qty:1, note:name});
});
paintRb();

/* =====================================================================
   6 · SCIENCE — simple / professional depth
   ===================================================================== */
const SCI = {
  source:{ k:"Where it comes from", t:"Source",
    simple:`<p>Noorala uses <b>marine collagen</b> — collagen peptides derived from fish. It's the source most beauty formulas use, because it dissolves cleanly, has a mild taste and mixes into cold water without turning gluey.</p><p>Each box delivers <b>15,000 mg</b> of hydrolyzed collagen peptides across its 30 sachets — that is the figure printed on the front of the pack, and we quote it exactly as the label states it rather than inflating it to a per-sachet number.</p>`,
    pro:`<p>Marine collagen is extracted from fish skin and scales and is <b>predominantly type I</b>, the dominant collagen type in human dermis and a major component of bone and tendon.</p><p>Declared collagen content: 15,000 mg hydrolyzed collagen peptides per 30-sachet box, alongside vitamin C, hyaluronic acid, biotin and zinc; per-sachet quantities of each nutrient are stated on the approved label. Batch-level origin, protein content, heavy-metal limits and microbiological results appear on the certificate of analysis, which we share with pharmacies and clinicians on request.</p><p class="small">Note for professionals: collagen is not a complete protein — it is low in tryptophan — and should be counted as a supplemental peptide source, not a protein replacement.</p>` },
  type:{ k:"Type I, and why it matters", t:"Type",
    simple:`<p>Collagen isn't one thing. Your body makes at least 28 types, but a handful do most of the visible work. <b>Type I</b> is the one concentrated in skin, hair, nails, bone and tendon — which is why beauty formulas centre on it.</p>`,
    pro:`<p>Type I collagen accounts for roughly 80–90% of dermal collagen; type III is more abundant in young and healing skin. Marine sources are almost entirely type I, whereas bovine sources supply type I and III and chicken cartilage supplies type II (used for joint-specific formulations).</p><p>Endogenous collagen synthesis declines progressively from the mid-twenties, and is further influenced by UV exposure, smoking, glycation and oestrogen status. Supplementation supplies substrate and peptide signals — it does not switch that decline off.</p>` },
  peptides:{ k:"What a peptide actually is", t:"Peptides",
    simple:`<p>Whole collagen is a large, rope-like protein — far too big to be absorbed as-is. <b>Peptides</b> are short fragments of it, small enough to be digested and taken up like any other protein fragment.</p><p>That's the whole idea behind a hydrolyzed collagen sachet: give the body small, soluble building blocks instead of an intact rope it can't use.</p>`,
    pro:`<p>Collagen's triple helix is built on repeating Gly-X-Y motifs, rich in proline and hydroxyproline. Enzymatic hydrolysis yields oligopeptides and free amino acids; a fraction survives digestion as small di- and tripeptides — <b>Pro-Hyp</b> and <b>Hyp-Gly</b> being the most studied — which have been detected in human plasma after oral intake of collagen hydrolysate.</p><p>Two mechanisms are proposed in the literature: substrate supply (amino acids for matrix synthesis) and signalling (peptides acting on fibroblast activity). Evidence quality varies by study and by dose. We are describing the general research field on collagen hydrolysate, <b>not</b> a trial conducted on this product.</p>` },
  hydrolysis:{ k:"Why it dissolves", t:"Hydrolysis",
    simple:`<p>Hydrolysis is a controlled process using enzymes to cut long collagen chains into short ones. The result is a powder that dissolves in cold water in about twenty seconds instead of clumping.</p><p>Practical rule: cold or room-temperature liquid. Very hot drinks aren't dangerous, they just aren't necessary.</p>`,
    pro:`<p>Enzymatic hydrolysis reduces average molecular weight from ~300 kDa (native tropocollagen) to roughly 2–5 kDa, dramatically improving cold-water solubility, dispersibility and gastrointestinal uptake compared with gelatin or native collagen.</p><p>Lower molecular weight also removes the gelling behaviour of gelatin, which is what makes a 10 g sachet drinkable rather than a set jelly.</p>` },
  support:{ k:"The four supporting actives", t:"Supporting actives",
    simple:`<p><b>Vitamin C</b> — the co-factor your body needs to build collagen of its own. Without it, the process stalls. <br><b>Hyaluronic acid</b> — a moisture-binding molecule found naturally in skin. <br><b>Biotin</b> — contributes to the maintenance of normal hair and skin. <br><b>Zinc</b> — contributes to the maintenance of normal hair, nails and skin.</p><p>They aren't decoration on the label. Collagen without vitamin C is a delivery without the tools to install it.</p>`,
    pro:`<p><b>Vitamin C (ascorbate)</b> is an essential co-factor for prolyl-4-hydroxylase and lysyl hydroxylase; hydroxylation of proline and lysine residues is required for triple-helix stability. The approved nutrient-function claim is that vitamin C <em>contributes to normal collagen formation for the normal function of skin</em>.</p><p><b>Zinc</b> contributes to the maintenance of normal skin, hair and nails and to normal DNA and protein synthesis. <b>Biotin</b> contributes to the maintenance of normal hair, skin and mucous membranes. <b>Hyaluronic acid</b> is included as a formulation ingredient; it does not carry an approved health claim in most jurisdictions and we do not make one.</p><p class="small">Exact per-sachet quantities of each nutrient are stated on the approved product label and in the product file.</p>` },
  quality:{ k:"How it's made and handled", t:"Quality",
    simple:`<p>Noorala Collagen is <b>manufactured in Türkiye</b> and imported to Oman as a food supplement. Every box carries a batch number and expiry date. Store it dry, below 25 °C, away from direct sun — easy to forget in a Gulf kitchen.</p>`,
    pro:`<p>Produced under the manufacturer's food-safety and quality management system, with batch traceability from raw material to finished box. Imported and distributed as a food supplement in accordance with local requirements.</p><p>Registration status, manufacturer certifications, specification sheets and the current certificate of analysis are provided to pharmacies, regulatory affairs teams and distributors on request — we don't publish document images on a marketing page, because a scan on a website proves nothing.</p>` },
  testing:{ k:"What we will and won't claim", t:"Testing &amp; transparency",
    simple:`<p>We will tell you what's in the sachet, how much, where it's made, and how to take it.</p><p>We won't promise a result in a specific number of days, publish before-and-after photos, or invent studies. Any brand doing that is selling certainty it doesn't have.</p>`,
    pro:`<p>Claims policy: we restrict consumer-facing claims to (a) verifiable product facts and (b) recognised nutrient-function claims for the vitamins and minerals present. General statements about hydrolyzed collagen are labelled as general nutritional science, not as product-specific evidence.</p><p>No clinical trial has been conducted on Noorala Collagen, and we state that plainly rather than borrowing another product's data. Requests for the CoA, allergen statement, nutritional breakdown or stability data can be sent to <b>hello@noorala.com</b>.</p>` }
};
let sciKey = "source", sciDepth = "simple";
function paintSci(){
  const s = SCI[sciKey];
  $("#sciPanel").innerHTML = `<div class="sci-body on"><span class="kicker">${s.k}</span><h3>${s.t.replace('&amp;','&')}</h3>${s[sciDepth]}</div>`;
  $("#sciPanel").setAttribute("aria-labelledby", "sci-" + sciKey);
}
const sciTabs = $$("[data-sci]");
sciTabs.forEach((b,i)=>{
  b.id = "sci-" + b.dataset.sci;
  b.setAttribute("role","tab");
  b.setAttribute("aria-controls","sciPanel");
  b.setAttribute("aria-selected", String(b.dataset.sci === sciKey));
  b.tabIndex = b.dataset.sci === sciKey ? 0 : -1;
  b.removeAttribute("aria-pressed");
  b.addEventListener("click",()=>selectSci(i));
  /* arrow-key navigation is what makes a tablist a tablist */
  b.addEventListener("keydown", e=>{
    const map = {ArrowRight:1, ArrowDown:1, ArrowLeft:-1, ArrowUp:-1};
    if(e.key === "Home") return (e.preventDefault(), selectSci(0, true));
    if(e.key === "End")  return (e.preventDefault(), selectSci(sciTabs.length-1, true));
    if(!(e.key in map)) return;
    e.preventDefault();
    selectSci((i + map[e.key] + sciTabs.length) % sciTabs.length, true);
  });
});
function selectSci(i, focus){
  sciKey = sciTabs[i].dataset.sci;
  sciTabs.forEach((t,j)=>{ t.setAttribute("aria-selected", String(j===i)); t.tabIndex = j===i ? 0 : -1; });
  if(focus) sciTabs[i].focus();
  paintSci();
}
$$("[data-depth]").forEach(b=>b.addEventListener("click",()=>{ press($$("[data-depth]"),b); sciDepth=b.dataset.depth; paintSci(); }));
if($("#sciPanel")) paintSci();

/* =====================================================================
   7 · THE 90-DAY JOURNEY — a real tracker
   ---------------------------------------------------------------------
   This used to be a slider that faked progress. It is now an actual
   habit tracker: a start date, a check-in per day, a streak, a honest
   consistency score, and a dated certificate at day 90.

   It keeps its state on the visitor's own device and nowhere else.
   No account, no server, nothing transmitted — which is the only way to
   promise a private photo journal and mean it.
   ===================================================================== */
const TIPS = [
  "Put the box next to the kettle or the coffee machine — visible beats motivated.",
  "Pair the sachet with a full glass of water. Two habits, one action.",
  "Sunscreen does more for skin appearance than any supplement. Keep both.",
  "Missed yesterday? Take today's and move on. Streaks recover, guilt doesn't help.",
  "Travelling this week? Take seven sachets in your carry-on — they're flat and sealed.",
  "Photograph in the same light if you're journalling. Lighting fakes more progress than anything else.",
  "Day 60 is where most people stop noticing effort. That's the point of the whole thing."
];
const MILESTONES = [1, 7, 30, 60, 90];
const JR_KEY = "noorala.journey.v1";
const TASKS = ["ritual", "hydration", "checkin"];

/* ---- date helpers: local calendar days, not UTC, not elapsed hours ---- */
const dayKey = d => {
  const p = n => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
};
const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysBetween = (a, b) => Math.round((midnight(b) - midnight(a)) / 86400000);

let journey = null;
function loadJourney(){
  try{
    const raw = JSON.parse(localStorage.getItem(JR_KEY) || "null");
    if(raw && raw.start && /^\d{4}-\d{2}-\d{2}$/.test(raw.start)){
      journey = { start: raw.start, days: (raw.days && typeof raw.days === "object") ? raw.days : {} };
    }
  }catch(e){ journey = null; }
}
function saveJourney(){
  try{ localStorage.setItem(JR_KEY, JSON.stringify(journey)); }catch(e){}
}

/* Day number is 1-based and clamped: the tracker never reads past day 90,
   and a clock set backwards cannot push it below day 1. */
function currentDay(){
  if(!journey) return 0;
  const start = new Date(journey.start + "T00:00:00");
  return Math.min(90, Math.max(1, daysBetween(start, new Date()) + 1));
}
function dateForDay(n){
  const d = new Date(journey.start + "T00:00:00");
  d.setDate(d.getDate() + (n - 1));
  return d;
}
/* A day counts as complete when all three check-ins are ticked. */
function dayComplete(key){
  const e = journey.days[key];
  return !!e && TASKS.every(t => e[t]);
}
function completedCount(){
  let n = 0;
  for(let i = 1; i <= currentDay(); i++) if(dayComplete(dayKey(dateForDay(i)))) n++;
  return n;
}
/* The streak counts back from today, but today not being ticked yet does
   not break it — otherwise every morning would read as a failure. */
function streak(){
  const today = currentDay();
  let n = 0;
  for(let i = today; i >= 1; i--){
    if(dayComplete(dayKey(dateForDay(i)))) n++;
    else if(i !== today) break;
    else continue;
  }
  return n;
}

/* ---- rendering ---- */
const jrPreview = $("#jrPreview"), jrLive = $("#jrLive");

function ring(el, label, pct){
  const circ = 2 * Math.PI * 50;
  el.style.strokeDasharray = circ;
  el.style.strokeDashoffset = circ * (1 - pct / 100);
  label.textContent = pct + "%";
}

function paintJourney(){
  const live = !!journey;
  jrPreview.classList.toggle("hide", live);
  jrLive.classList.toggle("hide", !live);
  if(!live) return;

  const day = currentDay();
  const done = completedCount();
  const pct = day ? Math.round(done / day * 100) : 0;
  const key = dayKey(new Date());
  const entry = journey.days[key] || {};

  $("#jrDay").textContent = day;
  $("#jrDone").textContent = done;
  $("#jrLeft").textContent = Math.max(0, 90 - day);
  $("#jrStreak").textContent = streak();
  ring($("#jrRing"), $("#jrPct"), pct);

  const started = new Date(journey.start + "T00:00:00");
  $("#jrStarted").textContent = "Started " + started.toLocaleDateString(undefined, {day:"numeric", month:"long", year:"numeric"});
  $("#jrToday").textContent = day >= 90 ? "Day 90 — the last one." : "Today is day " + day + ".";
  $("#jrTip").textContent = TIPS[(day - 1) % TIPS.length];

  TASKS.forEach(t => {
    const b = $('#jrTasks [data-task="' + t + '"]');
    b.setAttribute("aria-pressed", String(!!entry[t]));
  });

  /* the 90-cell grid: one square per day, so a month of effort is visible at a glance */
  const grid = $("#jrGrid");
  if(grid.childElementCount !== 90){
    grid.innerHTML = Array.from({length:90}, (_, i) => '<i data-d="' + (i+1) + '"></i>').join("");
  }
  Array.from(grid.children).forEach((cell, i) => {
    const n = i + 1;
    cell.className = n > day ? "" : (dayComplete(dayKey(dateForDay(n))) ? "on" : "off");
    if(n === day) cell.classList.add("now");
  });

  $$("#timeline .tl").forEach((el, i) => el.classList.toggle("active", day >= MILESTONES[i]));

  const finished = day >= 90 && dayComplete(dayKey(dateForDay(90)));
  const cert = $("#certCard");
  cert.style.opacity = finished ? 1 : .45;
  $("#jrCert").classList.toggle("hide", !finished);
  if(finished){
    $("#certTitle").textContent = "Journey complete";
    $("#certSub").textContent = "Ninety days, " + done + " of them complete. Your dated certificate is ready.";
  } else {
    $("#certTitle").textContent = (90 - day) + " days to go";
    $("#certSub").textContent = "Reach day 90 to unlock your Noorala certificate — an elegant, dated record of a habit you built.";
  }
}

/* ---- the preview slider (shown only before someone starts) ---- */
const slide = $("#daySlide");
function paintPreview(){
  if(!slide) return;
  const d = +slide.value;
  const pct = Math.max(55, Math.min(96, Math.round(58 + d * 0.42)));
  $("#dayNum").textContent = d;
  ring($("#ringFgPrev"), $("#ringValPrev"), pct);
  $("#dashTip").textContent = TIPS[d % TIPS.length];
  if(!journey) $$("#timeline .tl").forEach((el, i) => el.classList.toggle("active", d >= MILESTONES[i]));
}
if(slide){ slide.addEventListener("input", paintPreview); paintPreview(); }

/* ---- actions ---- */
if($("#jrStart")) $("#jrStart").addEventListener("click", () => {
  journey = { start: dayKey(new Date()), days: {} };
  saveJourney();
  paintJourney();
  toast("Day 1 begins today — see you tomorrow");
  track("journey_start");
  requestAnimationFrame(() => $("#jrToday").scrollIntoView({behavior:"smooth", block:"center"}));
});

if($("#jrTasks")) $("#jrTasks").addEventListener("click", e => {
  const b = e.target.closest("[data-task]");
  if(!b || !journey) return;
  const key = dayKey(new Date());
  const entry = journey.days[key] || (journey.days[key] = {});
  const wasComplete = dayComplete(key);
  entry[b.dataset.task] = !entry[b.dataset.task];
  saveJourney();
  paintJourney();
  if(!wasComplete && dayComplete(key)){
    const s = streak();
    toast(s > 1 ? "Day " + currentDay() + " complete · " + s + "-day streak" : "Day " + currentDay() + " complete");
    track("journey_day_complete", { day: currentDay(), streak: s });
  }
});

if($("#jrReset")) $("#jrReset").addEventListener("click", () => {
  if(!confirm("Reset your journey? Your start date and every check-in will be deleted from this device. This cannot be undone.")) return;
  journey = null;
  try{ localStorage.removeItem(JR_KEY); }catch(e){}
  paintJourney();
  toast("Journey reset");
});

if($("#jrShare")) $("#jrShare").addEventListener("click", () => {
  const day = currentDay(), done = completedCount();
  const msg = "My Noorala 90-day journey 🌿\n\nDay " + day + " of 90\n" + done + " days complete · " +
              Math.round(done / day * 100) + "% consistency · " + streak() + "-day streak";
  if(navigator.share){ navigator.share({ text: msg }).catch(()=>{}); return; }
  copyText(msg, "Progress copied — paste it anywhere");
});

/* The certificate is drawn locally and handed over as a PNG. Nothing is
   uploaded, so it works offline and needs no service to stay alive. */
if($("#jrCert")) $("#jrCert").addEventListener("click", () => {
  const W = 1600, H = 1100, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#1A0E14"; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W*.5, H*.32, 40, W*.5, H*.32, W*.7);
  g.addColorStop(0, "rgba(200,68,107,.30)"); g.addColorStop(1, "rgba(200,68,107,0)");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = "#C9A46A"; x.lineWidth = 2;
  x.strokeRect(60, 60, W - 120, H - 120);
  x.textAlign = "center";
  x.fillStyle = "#F0BFCD"; x.font = "500 92px Georgia, serif";
  x.fillText("Noorala", W/2, 260);
  x.fillStyle = "rgba(246,234,239,.55)"; x.font = "500 26px system-ui, sans-serif";
  x.fillText("Y O U R   B E A U T Y   S T A R T S   F R O M   W I T H I N", W/2, 315);
  x.strokeStyle = "#C9A46A"; x.beginPath(); x.moveTo(W/2 - 130, 380); x.lineTo(W/2 + 130, 380); x.stroke();
  x.fillStyle = "#fff"; x.font = "italic 500 86px Georgia, serif";
  x.fillText("Ninety days.", W/2, 500);
  x.fillStyle = "rgba(246,234,239,.78)"; x.font = "400 34px system-ui, sans-serif";
  x.fillText("A habit built, one sachet at a time.", W/2, 570);
  const done = completedCount();
  x.fillStyle = "#C9A46A"; x.font = "500 120px Georgia, serif";
  x.fillText(done + " / 90", W/2, 740);
  x.fillStyle = "rgba(246,234,239,.55)"; x.font = "400 28px system-ui, sans-serif";
  x.fillText("days completed", W/2, 790);
  const from = new Date(journey.start + "T00:00:00"), to = dateForDay(90);
  const fmt = d => d.toLocaleDateString(undefined, {day:"numeric", month:"long", year:"numeric"});
  x.fillStyle = "rgba(246,234,239,.7)"; x.font = "400 30px system-ui, sans-serif";
  x.fillText(fmt(from) + "  —  " + fmt(to), W/2, 930);
  x.fillStyle = "rgba(246,234,239,.35)"; x.font = "400 22px system-ui, sans-serif";
  x.fillText("Muscat, Sultanate of Oman", W/2, 985);
  c.toBlob(blob => {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = "noorala-90-day-certificate.png";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Certificate saved");
    track("journey_certificate");
  }, "image/png");
});

loadJourney();
paintJourney();
/* A journey rolls over at local midnight; repaint so an open tab keeps up. */
setInterval(() => { if(journey) paintJourney(); }, 60000);
window.NooralaJourney = { active: () => !!journey, day: currentDay };

/* =====================================================================
   8 · PARTNER ENQUIRY  ·  WHATSAPP DOCK
   ===================================================================== */
function partnerMsg(){
  const g = id => (document.getElementById(id)?.value || "").trim() || "—";
  return `Partnership enquiry — Noorala\n\nReference: ${orderRef()}\n\nName: ${g("pfName")}\nCompany: ${g("pfCo")}\nRole: ${g("pfRole")}\nType: ${g("pfType")}\nCity / country: ${g("pfCity")}\nBranches: ${g("pfBranch")}\n\nMessage: ${g("pfMsg")}`;
}
/* Inline, per-field validation — a toast alone is invisible to a screen
   reader and gives no clue which field is the problem. */
function pfValidate(){
  const required = [["pfName","your name"],["pfCo","your company or pharmacy name"],["pfCity","your city or country"]];
  let firstBad = null;
  required.forEach(([id,label])=>{
    const el = $("#" + id), wrap = el.closest("div"), bad = !el.value.trim();
    el.setAttribute("aria-invalid", String(bad));
    let msg = wrap.querySelector(".err");
    if(bad){
      if(!msg){ msg = document.createElement("span"); msg.className = "err"; wrap.appendChild(msg); }
      msg.textContent = "Please add " + label + ".";
      el.setAttribute("aria-describedby", msg.id || (msg.id = id + "-err"));
      if(!firstBad) firstBad = el;
    } else if(msg){ msg.remove(); el.removeAttribute("aria-describedby"); }
  });
  if(firstBad){ firstBad.focus(); toast("A few details are still missing"); return false; }
  return true;
}
if($("#pfSend")){
  ["pfName","pfCo","pfCity"].forEach(id=>{
    const el = $("#" + id);
    el.addEventListener("input", ()=>{
      if(el.getAttribute("aria-invalid") === "true" && el.value.trim()){
        el.setAttribute("aria-invalid","false");
        const m = el.closest("div").querySelector(".err"); if(m) m.remove();
      }
    });
  });
  $("#pfSend").addEventListener("click",()=>{
    if(!pfValidate()) return;
    window.open(waLink(partnerMsg()), "_blank", "noopener");
    track("partner_enquiry", {channel: "whatsapp", type: ($("#pfType")||{}).value || ""});
    toast("Opening WhatsApp with your enquiry");
  });
  $("#pfMail").addEventListener("click", e=>{
    e.preventDefault();
    if(!pfValidate()) return;
    location.href = "mailto:" + CFG.email + "?subject=" + encodeURIComponent("Noorala partnership enquiry " + orderRef()) + "&body=" + encodeURIComponent(partnerMsg());
  });
  $("#pfCopy") && $("#pfCopy").addEventListener("click", ()=>{
    if(!pfValidate()) return;
    copyText(partnerMsg(), "Enquiry copied — paste it into an email or a message");
  });
}

/* Clipboard fallback: WhatsApp deep links are blocked or awkward on some
   desktop browsers, so every send path has a copy-the-message escape hatch. */
function copyText(text, okMsg){
  const done = () => toast(okMsg || "Copied");
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(done, () => fallback());
  } else fallback();
  function fallback(){
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly",""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); done(); }catch(e){ toast("Press Ctrl/Cmd+C to copy"); }
    ta.remove();
  }
}
window.NooralaCopy = copyText;

/* ---- WhatsApp dock ---- */
const waDock = $("#wa");
function setWaDock(open){
  waDock.classList.toggle("open", open);
  $("#waFab").setAttribute("aria-expanded", String(open));
}
$("#waFab").addEventListener("click", e=>{ e.stopPropagation(); setWaDock(!waDock.classList.contains("open")); });
document.addEventListener("click", e=>{ if(!waDock.contains(e.target)) setWaDock(false); });

/* The dock says whether anyone is actually there right now. */
function paintDesk(){
  const open = deskOpen();
  $$("[data-desk-status]").forEach(el=>{
    el.textContent = open ? "We usually reply within minutes" : "Closed now · we reply first thing " + CFG.hours.label;
    el.classList.toggle("is-open", open);
  });
}
paintDesk(); setInterval(paintDesk, 60000);

/* Cart-aware deep link in the dock: if there is a bag, offer to send it. */
function paintDockOrder(){
  const a = $("#waDockOrder"); if(!a) return;
  const n = state.cart.reduce((s,c)=>s+c.qty,0);
  a.href = n ? waLink(orderMessage())
             : waLink("Hi Noorala 🌿 — I'd like to order Noorala Collagen.");
  a.querySelector("span").textContent = n ? `Send my bag (${n} item${n>1?"s":""})` : "Order a box";
}
window.__nooralaCartHooks.push(paintDockOrder);
paintDockOrder();

$("#cartCopy") && $("#cartCopy").addEventListener("click", ()=>{
  if(!state.cart.length){ toast("Your bag is empty"); return; }
  copyText(orderMessage(), "Order copied — paste it into WhatsApp or an email");
});

/* =====================================================================
   9 · INIT
   ===================================================================== */
setMode("express");
bindSmooth();
revealScan();
})();

/* ===== 3 · MOTION LAYER ===== */
(function(){
"use strict";
const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE = matchMedia("(pointer:fine)").matches;
const WIDE = () => innerWidth >= 900;
const $  = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));

/* ---------- 1 · intro curtain ----------
   Shown once per browsing session. Returning to the site from the cart or
   a shared link should not replay a 2.6 s curtain every time, and the
   curtain must never be able to strand someone behind it. */
const introEl = $("#intro");
const endIntro = ()=>{
  document.body.classList.add("intro-done");
  document.body.classList.remove("intro-lock");
  if(introEl) introEl.setAttribute("hidden","");
};
let introSeen = false;
try{ introSeen = sessionStorage.getItem("noorala.intro") === "1"; }catch(e){}
if(RM || introSeen || !introEl){
  endIntro();
} else {
  try{ sessionStorage.setItem("noorala.intro","1"); }catch(e){}
  document.body.classList.add("intro-lock", "intro-playing");
  addEventListener("load", ()=>setTimeout(endIntro, 950));
  setTimeout(endIntro, 2600);                       // failsafe: slow network
  addEventListener("keydown", e=>{ if(e.key==="Escape") endIntro(); }, {once:true});
  introEl.addEventListener("click", endIntro);       // failsafe: impatient visitor
}

/* ---------- 2 · word splitting ---------- */
function splitWords(el){
  if(!el || el.dataset.split) return;
  el.dataset.split = "1";
  /* A split heading hides its own words, so it has to be responsible for
     revealing them. If nothing above it is already being watched, watch the
     heading itself — otherwise the words stay at opacity 0 for good. */
  if(!el.closest(".mo,.rv") && !el.dataset.mo){
    el.dataset.mo = "up";
    el.classList.add("mo");
    mio.observe(el);
  }
  let i = 0;
  (function walk(node){
    Array.from(node.childNodes).forEach(k=>{
      if(k.nodeType === 3){
        if(!k.textContent.trim()) return;
        const frag = document.createDocumentFragment();
        k.textContent.split(/(\s+)/).forEach(w=>{
          if(!w) return;
          if(/^\s+$/.test(w)){ frag.appendChild(document.createTextNode(w)); return; }
          const outer = document.createElement("span"); outer.className = "mword";
          const inner = document.createElement("span"); inner.className = "mword-i";
          inner.textContent = w;
          inner.style.transitionDelay = (i++ * 42) + "ms";
          outer.appendChild(inner); frag.appendChild(outer);
        });
        node.replaceChild(frag, k);
      } else if(k.nodeType === 1 && !k.classList.contains("mword")){
        walk(k);
      }
    });
  })(el);
}

/* ---------- 3 · reveal engine ---------- */
const mio = new IntersectionObserver(es=>{
  es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("mo-in"); mio.unobserve(e.target); } });
},{threshold:.12, rootMargin:"0px 0px -60px 0px"});

const VARIANTS = {
  ".checklist li":"left", ".faq details":"up", ".tbl tr":"up", ".factbar div":"scale",
  ".timeline .tl":"up", ".form-grid > div":"up", ".ft-grid > div":"up", ".dash-item":"right",
  ".rb-steps .rb-opt":"scale", ".flavors .flavor":"scale", ".packs .pack":"right",
  ".sci-nav button":"left", ".shead .lede":"up", ".shead .eyebrow":"up", ".imgframe":"clip",
  ".ritual-card":"blur", ".rb-preview":"blur", ".cert":"scale", ".qr-box":"flip",
  ".meters .meter":"up", ".ing-rail .ing":"up", ".hero-badges .chip":"scale", ".why li":"left"
};
function enhance(){
  $$("h2").forEach(splitWords);
  $$(".result-hero .arch, .rb-preview .name").forEach(splitWords);
  Object.entries(VARIANTS).forEach(([sel,v])=>{
    $$(sel).forEach(el=>{
      if(el.dataset.mo || el.classList.contains("rv")) return;
      el.dataset.mo = v; el.classList.add("mo");
      const sibs = Array.from(el.parentElement.children).filter(c=>c.classList.contains("mo"));
      el.style.transitionDelay = (Math.min(sibs.indexOf(el),8) * 85) + "ms";
      mio.observe(el);
    });
  });
  $$(".shead h2, .timeline").forEach(el=>{
    if(el.dataset.mo) return; el.dataset.mo = "up"; el.classList.add("mo"); mio.observe(el);
  });
  bindTilt(); bindMagnet(); markCounters();
  if(RM) $$(".mo").forEach(el=>el.classList.add("mo-in"));
}

/* ---------- 4 · parallax + scroll-linked hero ---------- */
const PLX = [];
function collectPlx(){
  PLX.length = 0;
  $$(".hero-visual").forEach(el=>PLX.push([el,-0.07]));
  $$(".halo").forEach(el=>PLX.push([el,0.1]));
  $$(".imgframe img").forEach(el=>PLX.push([el,0.05,1.1]));
  $$(".blob.b1").forEach(el=>PLX.push([el,0.16]));
  $$(".blob.b2").forEach(el=>PLX.push([el,-0.12]));
}
let ticking = false, lastY = scrollY, navUp = false;
function onFrame(){
  ticking = false;
  const y = scrollY, vh = innerHeight;
  const doc = document.documentElement;
  $("#sprog").style.transform = "scaleX(" + (y / Math.max(1, doc.scrollHeight - vh)) + ")";
  // nav auto-hide
  const nav = $("#nav");
  if(y > 220 && y > lastY + 6 && !navUp){ nav.classList.add("up"); navUp = true; }
  else if((y < lastY - 6 || y < 220) && navUp){ nav.classList.remove("up"); navUp = false; }
  lastY = y;
  if(RM || !WIDE()) return;
  PLX.forEach(([el,sp,sc])=>{
    const r = el.getBoundingClientRect();
    if(r.bottom < -200 || r.top > vh + 200) return;
    const off = (r.top + r.height/2 - vh/2) * sp;
    el.style.transform = "translate3d(0," + off.toFixed(1) + "px,0)" + (sc ? " scale(" + sc + ")" : "");
  });
  // hero fade-out on scroll
  const hero = $$(".hero .hero-grid").find(el=>el.offsetParent !== null);
  if(hero && y < vh){
    const p = Math.min(1, y / (vh * 0.9));
    hero.style.opacity = (1 - p * 0.85).toFixed(3);
    hero.style.transform = "translate3d(0," + (y * 0.12).toFixed(1) + "px,0)";
  }
}
addEventListener("scroll", ()=>{ if(!ticking){ ticking = true; requestAnimationFrame(onFrame); } }, {passive:true});
addEventListener("resize", ()=>{ collectPlx(); onFrame(); }, {passive:true});

/* ---------- 5 · cursor ---------- */
if(FINE && !RM){
  const cur = $("#cur"), curd = $("#curd");
  let mx = -100, my = -100, cx = -100, cy = -100;
  addEventListener("mousemove", e=>{
    mx = e.clientX; my = e.clientY;
    curd.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
    const t = e.target.closest("a,button,.tile,.door,.opt,.pack,.flavor,.rb-opt,summary,input,label.btn");
    cur.classList.toggle("big", !!t);
    const opt = e.target.closest(".opt");
    if(opt){ const r = opt.getBoundingClientRect(); opt.style.setProperty("--mx",(e.clientX-r.left)+"px"); opt.style.setProperty("--my",(e.clientY-r.top)+"px"); }
  }, {passive:true});
  addEventListener("mouseleave", ()=>{ cur.classList.add("hidden"); curd.classList.add("hidden"); });
  addEventListener("mouseenter", ()=>{ cur.classList.remove("hidden"); curd.classList.remove("hidden"); });
  (function loop(){ cx += (mx-cx)*0.16; cy += (my-cy)*0.16;
    cur.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
    requestAnimationFrame(loop); })();
}

/* ---------- 6 · tilt + magnetic + ripple ---------- */
function bindTilt(){
  if(RM || !FINE) return;
  $$(".tile,.door,.step,.ing,.qr-box,.rb-preview,.cert,.ring-card").forEach(el=>{
    if(el.dataset.tilt) return; el.dataset.tilt = "1";
    el.addEventListener("mousemove", e=>{
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left)/r.width - .5, py = (e.clientY - r.top)/r.height - .5;
      el.style.transition = "transform .12s linear";
      el.style.transform = "perspective(900px) rotateX(" + (-py*7).toFixed(2) + "deg) rotateY(" + (px*7).toFixed(2) + "deg) translateY(-5px) scale(1.012)";
    });
    el.addEventListener("mouseleave", ()=>{ el.style.transition = "transform .6s var(--ease)"; el.style.transform = ""; });
  });
}
function bindMagnet(){
  if(RM || !FINE) return;
  $$(".btn:not(.wide)").forEach(b=>{
    if(b.dataset.mag) return; b.dataset.mag = "1";
    b.addEventListener("mousemove", e=>{
      const r = b.getBoundingClientRect();
      b.style.transition = "transform .1s linear";
      b.style.transform = "translate(" + ((e.clientX-r.left-r.width/2)*0.18).toFixed(1) + "px," + ((e.clientY-r.top-r.height/2)*0.3-2).toFixed(1) + "px)";
    });
    b.addEventListener("mouseleave", ()=>{ b.style.transition = "transform .5s var(--ease)"; b.style.transform = ""; });
  });
}
document.addEventListener("click", e=>{
  const b = e.target.closest(".btn"); if(!b || RM) return;
  const r = b.getBoundingClientRect(), s = document.createElement("span");
  const d = Math.max(r.width, r.height) * 2.2;
  s.className = "rip"; s.style.width = s.style.height = d + "px";
  s.style.left = (e.clientX - r.left) + "px"; s.style.top = (e.clientY - r.top) + "px";
  b.appendChild(s); setTimeout(()=>s.remove(), 720);
});

/* ---------- 7 · counters ---------- */
const cio = new IntersectionObserver(es=>{
  es.forEach(e=>{ if(!e.isIntersecting) return; cio.unobserve(e.target); countUp(e.target); });
},{threshold:.5});
function markCounters(){
  $$(".factbar b").forEach(el=>{
    if(el.dataset.count) return;
    const m = el.textContent.match(/^([\d,\.]+)(.*)$/); if(!m) return;
    el.dataset.count = m[1].replace(/,/g,""); el.dataset.suffix = m[2] || "";
    cio.observe(el);
  });
}
function countUp(el){
  if(RM) return;
  const target = parseFloat(el.dataset.count), suf = el.dataset.suffix || "", t0 = performance.now(), dur = 1400;
  (function step(t){
    const p = Math.min(1,(t-t0)/dur), e = 1 - Math.pow(1-p,3);
    el.textContent = Math.round(target*e).toLocaleString() + suf;
    if(p < 1) requestAnimationFrame(step); else el.textContent = target.toLocaleString() + suf;
  })(t0);
}

/* ---------- 8 · hero atmosphere: blobs + particles ---------- */
function atmosphere(){
  $$(".hero").forEach(h=>{
    if(h.dataset.atm) return; h.dataset.atm = "1";
    if(RM) return;
    const b1 = document.createElement("div"), b2 = document.createElement("div");
    b1.className = "blob b1"; b2.className = "blob b2";
    h.prepend(b1, b2);
    if(!WIDE()) return;
    const c = document.createElement("canvas"); c.className = "particles"; h.prepend(c);
    const ctx = c.getContext("2d");
    let W, H, dots = [], vis = true, raf;
    const size = ()=>{ W = c.width = h.offsetWidth; H = c.height = h.offsetHeight;
      dots = Array.from({length: Math.min(46, Math.round(W/28))}, ()=>({
        x:Math.random()*W, y:Math.random()*H, r:Math.random()*2.2+.6,
        s:Math.random()*.25+.06, a:Math.random()*.4+.12, d:Math.random()*Math.PI*2 })); };
    size(); addEventListener("resize", size, {passive:true});
    new IntersectionObserver(es=>{ vis = es[0].isIntersecting; if(vis) draw(); }).observe(h);
    function draw(){
      if(!vis){ cancelAnimationFrame(raf); return; }
      ctx.clearRect(0,0,W,H);
      dots.forEach(p=>{
        p.y -= p.s; p.d += .01; p.x += Math.sin(p.d)*.25;
        if(p.y < -8){ p.y = H + 8; p.x = Math.random()*W; }
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7);
        ctx.fillStyle = "rgba(" + (p.r > 1.6 ? "201,164,106," : "200,68,107,") + p.a + ")";
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    }
    draw();
  });
}

/* ---------- 9 · mode-change wipe ---------- */
const wipe = $("#wipe"), wipeWord = $("#wipeWord");
const LABEL = {express:"Shop", deep:"Discover", partner:"Partners"};
let wipeT;
function playWipe(mode){
  if(RM) return;
  wipeWord.textContent = LABEL[mode] || "";
  wipe.classList.remove("play"); void wipe.offsetWidth; wipe.classList.add("play");
  clearTimeout(wipeT); wipeT = setTimeout(()=>wipe.classList.remove("play"), 1100);
}
document.addEventListener("click", e=>{
  const t = e.target.closest(".modeswitch button,[data-mode-jump]");
  if(!t) return;
  const m = t.dataset.mode || t.dataset.modeJump;
  if(m && m !== document.body.dataset.mode) playWipe(m);
}, true);

/* ---------- 10 · re-enhance on DOM / mode changes ---------- */
let deb;
function schedule(){ clearTimeout(deb); deb = setTimeout(()=>{ enhance(); collectPlx(); atmosphere(); onFrame(); }, 140); }
/* Only re-run the enhancer when the DOM actually gained new nodes to
   enhance — the old version fired on every click and every change event,
   re-walking the whole document dozens of times on a single quiz. */
new MutationObserver(schedule).observe(document.body, {attributes:true, attributeFilter:["data-mode"]});
new MutationObserver(records=>{
  for(const r of records){
    for(const n of r.addedNodes){
      if(n.nodeType === 1 && (n.querySelector?.(".mo,.tile,.meter,h2,.rb-preview") || n.matches?.(".mo,.tile,.meter,h2"))){
        return schedule();
      }
    }
  }
}).observe(document.body, {childList:true, subtree:true});

/* ---------- boot ---------- */
enhance(); collectPlx(); atmosphere(); onFrame();
setTimeout(()=>{ enhance(); collectPlx(); onFrame(); }, 400);
})();

/* ===== 4 · LIVING BACKGROUND FIELD ===== */
(function(){
  const fx=document.getElementById("bgfx"), night=fx.querySelector(".night"), sheen=fx.querySelector(".sheen");
  const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
  let tick=false;

  /* the field cools to deep plum in proportion to how much dark section
     is on screen, so the transition is gradual rather than a hard edge */
  function frame(){
    tick=false;
    const vh=innerHeight;
    let cover=0;
    document.querySelectorAll("section.dark, .sec.dark, #snapshot, #journey, footer.ft").forEach(el=>{
      if(!el.offsetParent && el.tagName!=="FOOTER") return;
      const r=el.getBoundingClientRect();
      const v=Math.max(0, Math.min(vh, r.bottom) - Math.max(0, r.top));
      cover+=v;
    });
    night.style.opacity=Math.min(1, cover/vh).toFixed(3);
    if(!RM){
      const p=scrollY*0.04;
      fx.style.transform="translate3d(0,"+(-p).toFixed(1)+"px,0)";
    }
  }
  addEventListener("scroll",()=>{ if(!tick){ tick=true; requestAnimationFrame(frame); } },{passive:true});
  addEventListener("resize",frame,{passive:true});
  new MutationObserver(frame).observe(document.body,{attributes:true,attributeFilter:["data-mode"]});

  if(!RM && matchMedia("(pointer:fine)").matches){
    addEventListener("mousemove",e=>{
      sheen.style.setProperty("--sx",(e.clientX/innerWidth*100).toFixed(1)+"%");
      sheen.style.setProperty("--sy",(e.clientY/innerHeight*100).toFixed(1)+"%");
    },{passive:true});
  }
  frame(); setTimeout(frame,500);
})();
