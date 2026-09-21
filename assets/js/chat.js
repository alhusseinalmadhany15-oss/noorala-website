/* =====================================================================
   NOORALA — chat.js  ·  "Noor", the on-site concierge
   ---------------------------------------------------------------------
   A self-contained assistant that answers the questions the order desk
   actually gets, in English or Arabic, and hands over to WhatsApp the
   moment a person is genuinely needed.

   Deliberately offline: it runs entirely in the browser, sends nothing
   anywhere, and needs no backend — which is what lets it ship on static
   hosting and keeps it honest about what it does and does not know.
   It never invents a health claim; anything outside the knowledge base
   is routed to a human rather than guessed at.
   ===================================================================== */
(function(){
"use strict";

var $  = function(s,r){ return (r||document).querySelector(s); };
var $$ = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };

var WA    = (window.NooralaCFG && window.NooralaCFG.wa) || "96890106968";
var BAG   = window.NooralaBag || null;
var STORE = "noorala.chat.v1";
var MAX_TURNS = 40;

function waLink(t){ return "https://wa.me/" + WA + "?text=" + encodeURIComponent(t); }
function esc(s){ return String(s).replace(/[&<>"]/g, function(c){
  return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

/* ---------------------------------------------------------------------
   1 · Knowledge base
   Each entry: k = trigger terms (English + Arabic), a = answer HTML,
   c = follow-up chips. Answers stay inside what the pack and the site
   already state — no new claims are introduced here.
   --------------------------------------------------------------------- */
var KB = [
{ id:"greet",
  k:["hi","hello","hey","salam","assalam","marhaba","good morning","good evening","مرحبا","السلام","هلا","اهلا"],
  a:"Hello — I'm <b>Noor</b>, the Noorala concierge. I can help with the product, how to take it, prices, delivery, or a pharmacy partnership. What would you like to know?",
  c:["What is Noorala Collagen?","How much is it?","How do I take it?","Delivery in Oman"] },

{ id:"what",
  k:["what is noorala","what's noorala","about noorala","noorala collagen","what do you sell",
     "tell me about noorala","what is this product","collagen","كولاجين","منتج","نورالا"],
  a:"<b>Noorala Collagen</b> is a hydrolyzed marine collagen powder in a single-serve sachet.<ul>"+
    "<li><b>30 sachets</b> per box — one month</li>"+
    "<li><b>10 g</b> per sachet, stirred into water</li>"+
    "<li><b>15,000 mg</b> of hydrolyzed collagen peptides per box, as printed on the pack</li>"+
    "<li>With <b>Vitamin C, Hyaluronic Acid, Biotin and Zinc</b></li>"+
    "<li>Two flavours: <b>Strawberry</b> and <b>Mango</b></li>"+
    "<li>Made in Türkiye · food supplement · مكمل غذائي</li></ul>",
  c:["What's inside it?","How much is it?","Which flavour?","How do I take it?"], go:"#shop" },

{ id:"price",
  k:["price","cost","how much","pricing","omr","rial","riyal","expensive","cheap","offer","discount","deal","سعر","بكم","كم","التكلفة","خصم","عرض"],
  a:function(){
    var P = window.NooralaCFG && window.NooralaCFG.packs;
    if(!P) return "Prices are shown in the shop section — tap below and I'll take you there.";
    var m = BAG ? BAG.money : function(n){ return "OMR " + n.toFixed(3); };
    return "Here are the current packs (VAT included):<ul>"+
      "<li><b>1 box</b> — " + m(P[1].price) + " · 30 days</li>"+
      "<li><b>2 boxes</b> — " + m(P[2].price) + " · save 10%, mix both flavours</li>"+
      "<li><b>3 boxes</b> — " + m(P[3].price) + " · the full 90-day journey</li></ul>"+
      "Free delivery in Muscat over OMR 20.";
  },
  c:["Add 1 box to my bag","Add the 90-day pack","Delivery in Oman","How do I pay?"], go:"#shop" },

{ id:"howuse",
  k:["how do i take","how to take","how to use","dosage","dose","instructions","when should i take","mix","serving","directions","طريقة","استخدام","كيف","جرعة","استعمال"],
  a:"One sachet a day, and that's the whole ritual:<ul>"+
    "<li><b>Tear &amp; pour</b> one 10 g sachet into 150–200 ml of cold or room-temperature water</li>"+
    "<li><b>Stir about 20 seconds</b> — it also works in juice or a smoothie</li>"+
    "<li><b>Same time every day</b> — morning or evening, whichever you'll actually keep</li></ul>"+
    "Avoid very hot drinks. Consistency matters far more than the exact hour.",
  c:["How long until I see results?","Which flavour?","Can I take it with medication?"], go:"#ritual" },

{ id:"inside",
  k:["ingredients","what's inside","what is inside","contains","formula","actives","vitamin","biotin","zinc","hyaluronic","مكونات","تركيبة","فيتامين","الزنك"],
  a:"Five actives, all printed on the box — no proprietary blend:<ul>"+
    "<li><b>Marine collagen</b> — hydrolyzed peptides, 15,000 mg per box</li>"+
    "<li><b>Vitamin C</b> — contributes to normal collagen formation</li>"+
    "<li><b>Hyaluronic acid</b> — a moisture-binding molecule</li>"+
    "<li><b>Biotin</b> — contributes to normal hair and skin</li>"+
    "<li><b>Zinc</b> — contributes to normal hair, nails and skin</li></ul>"+
    "Exact per-sachet quantities are on the approved label.",
  c:["Is it halal?","Any allergens?","Read the science"], go:"#inside" },

{ id:"flavour",
  k:["flavour","flavor","taste","strawberry","mango","which one","sweet","نكهة","نكهات","فراولة","مانجو","طعم"],
  a:"Two flavours, and honestly you can't get this wrong:<ul>"+
    "<li><b>Strawberry</b> — the softer, classic one</li>"+
    "<li><b>Mango</b> — warmer and fuller, the favourite with cold water and ice</li></ul>"+
    "The <b>Duo pack</b> exists precisely so you can keep both on the counter.",
  c:["Add the Duo pack","How much is it?","How do I take it?"], go:"#shop" },

{ id:"results",
  k:["results","how long","when will i see","work","effective","does it work","notice","difference","weeks","months","نتائج","متى","فعال","كم يوم"],
  a:"Honestly: collagen is a long game, not a week.<br><br>"+
    "We built the <b>90-day journey</b> because a fair trial is a full three-month routine. "+
    "We don't promise a specific result or a timeline — anyone who does is selling you certainty they don't have. "+
    "What we can say is that the people who finish a box are the ones who picked a fixed daily moment and kept it.",
  c:["Tell me about the 90-day journey","Add the 90-day pack"], go:"#journey" },

{ id:"halal",
  k:["halal","haram","marine","bovine","fish","pork","beef","source","vegan","vegetarian","حلال","حرام","بقري","سمك","بحري"],
  a:"The formula is built on <b>marine (fish-derived)</b> hydrolyzed collagen peptides, as printed on the box — not bovine and not porcine.<br><br>"+
    "Because it's fish-derived it isn't suitable for vegans or vegetarians. For <b>certification documents specific to your batch</b>, a person from our team can send you the current product file.",
  c:["Talk to a person","Any allergens?"] },

{ id:"allergen",
  k:["allergen","allergy","allergic","gluten","lactose","sugar","diabetic","shellfish","حساسية","سكر","جلوتين"],
  a:"The collagen is <b>fish-derived</b>, so it is not suitable if you have a fish allergy.<br><br>"+
    "For the full allergen statement, the nutritional breakdown and sugar content of your specific batch, our team will send you the product file — those numbers should come from the approved label, not from me.",
  c:["Talk to a person","Is it halal?"] },

{ id:"safety",
  k:["pregnant","pregnancy","breastfeeding","nursing","medication","medicine","children","kids","safe","side effect","doctor","condition","حامل","الحمل","رضاعة","دواء","اطفال","آمن","اضرار"],
  a:"Please check with your <b>doctor or pharmacist</b> first — genuinely, not as a disclaimer.<br><br>"+
    "Noorala Collagen is a food supplement, not a medicine. It shouldn't replace a varied diet or any prescribed treatment, it isn't intended for children, and it isn't recommended during pregnancy or breastfeeding without medical advice.<br><br>"+
    "I'm not able to give medical advice, and I won't guess.",
  c:["What's inside it?","Talk to a person"] },

{ id:"delivery",
  k:["delivery","deliver","shipping","ship","how long to arrive","courier","muscat","salalah","sohar","nizwa","oman","address","توصيل","شحن","مسقط","صلالة","عمان","التوصيل"],
  a:"<b>Across Oman</b>, typically within <b>1–3 working days</b>.<ul>"+
    "<li><b>Free delivery in Muscat</b> on orders over OMR 20</li>"+
    "<li>Nationwide delivery to the rest of Oman</li>"+
    "<li>GCC shipping is arranged case by case — just ask</li></ul>"+
    "We confirm your address in the WhatsApp chat before dispatch.",
  c:["How do I pay?","How much is it?","Order now"] },

{ id:"pay",
  k:["pay","payment","cash","card","bank","transfer","cod","cash on delivery","invoice","checkout","دفع","الدفع","كاش","تحويل","بطاقة"],
  a:"Three ways, all confirmed with you directly on WhatsApp:<ul>"+
    "<li><b>Cash on delivery</b></li>"+
    "<li><b>Bank transfer</b></li>"+
    "<li><b>Card payment link</b></li></ul>"+
    "No account, no stored card, no sign-up. You build the bag here, we confirm stock and address in the chat.",
  c:["Delivery in Oman","Order now"] },

{ id:"order",
  k:["order","buy","purchase","want to order","add to cart","basket","my bag","shop","checkout",
     "اطلب","شراء","اشتري","طلب"],
  a:function(){
    var n = BAG ? BAG.count() : 0;
    if(n) return "You already have <b>" + n + " item" + (n>1?"s":"") + "</b> in your bag. I can send it straight to the order desk on WhatsApp — they'll confirm stock, address and payment.";
    return "Happy to help. Pick a pack and I'll drop it in your bag, then send it to the order desk on WhatsApp:";
  },
  c:["Add 1 box to my bag","Add the Duo pack","Add the 90-day pack","Send my bag to WhatsApp"], go:"#shop" },

{ id:"journey",
  k:["90 day","90-day","ninety","journey","programme","program","dashboard","certificate","qr","streak","tracker","رحلة","برنامج"],
  a:"Scan the QR on your box and the product becomes digital:<ul>"+
    "<li>A <b>daily check-in</b> and a consistency score</li>"+
    "<li>Milestones at <b>day 7, 30, 60 and 90</b></li>"+
    "<li>An optional private photo journal, stored on your own device</li>"+
    "<li>A dated <b>certificate</b> at day 90</li></ul>"+
    "It's included with the 3-box pack.",
  c:["Add the 90-day pack","Tell me about the profile quiz"], go:"#journey" },

{ id:"quiz",
  k:["quiz","profile","personalise","personalize","recommend","which pack","what should i buy","archetype","suggestion","help me choose","اختبار","توصية"],
  a:"There's an <b>8-question Collagen Profile</b> — about 90 seconds, no email, no form.<br><br>"+
    "It reads your goals, routine, hydration, sleep and flavour, then gives you an archetype and a daily ritual built around your actual week. Shall I open it?",
  c:["Open the profile quiz","How much is it?"], act:"quiz" },

{ id:"scan",
  k:["skin snapshot","snapshot","selfie","skin analysis","analyse my skin","analyze my skin",
     "scan my face","upload a photo","بشرة","تحليل","صورة"],
  a:"The <b>Skin Snapshot</b> reads four visual characteristics from a selfie — light, evenness, texture detail and warmth.<br><br>"+
    "Everything is processed <b>inside your own browser</b>. Nothing is uploaded, stored or sent anywhere.<br><br>"+
    "It describes the photograph, not your skin — lighting and camera change the numbers. It is not a diagnosis and it does not measure collagen in your body.",
  c:["Open the skin snapshot","Book a free skin analysis"], go:"#snapshot" },

{ id:"event",
  k:["free skin analysis","in store","in-store","pharmacy event","activation","book","appointment","counter","حجز","موعد","تحليل مجاني"],
  a:"We run a <b>free in-pharmacy skin analysis</b> as part of our partner activations — a quick professional assessment with a skin-analysis device, then practical routine guidance.<br><br>"+
    "Dates depend on which branch is hosting. Our team can tell you what's coming up near you.",
  c:["Book a free skin analysis","Pharmacy partnership"] },

{ id:"partner",
  k:["partner","partnership","stock","wholesale","distributor","distribute","pharmacy","retail","reseller","b2b","trade","bulk","clinic","salon","export","شراكة","صيدلية","توزيع","جملة","وكيل"],
  a:"Yes — we supply directly from Muscat.<br><br>"+
    "The pharmacy proposal has three parts: a premium product introduction, a <b>free in-store skin analysis service</b> for your customers, and a focused <b>three-branch activation</b> to read real demand before a wider listing. Retail kit, staff training and post-activation review are included.<br><br>"+
    "We work with pharmacy chains, independents, beauty retail, clinics, GCC distributors and corporate gifting.",
  c:["Request a partner pack","Talk to a person"], go:"#partner-form", mode:"partner" },

{ id:"store",
  k:["store","storage","keep","fridge","expiry","expire","shelf life","batch","heat","temperature","تخزين","صلاحية","انتهاء"],
  a:"Store it <b>dry, below 25 °C, away from direct sun</b> — easy to forget in a Gulf kitchen, and the car glovebox is the worst place for it.<br><br>"+
    "Every box carries a <b>visible batch number and expiry date</b>, and we ship sealed boxes only.",
  c:["What's inside it?","Talk to a person"] },

{ id:"science",
  k:["science","research","study","studies","clinical","trial","evidence","peptide","hydrolyzed","hydrolysed","type i","molecular","proof","علم","دراسة","بحث"],
  a:"We keep this deliberately plain:<ul>"+
    "<li>Marine collagen is predominantly <b>type I</b>, the dominant collagen type in skin</li>"+
    "<li><b>Hydrolysis</b> cuts the chains short so the powder dissolves in cold water</li>"+
    "<li><b>Vitamin C</b> is a required co-factor for your body's own collagen formation</li></ul>"+
    "<b>No clinical trial has been conducted on Noorala Collagen</b>, and we say so rather than borrowing another product's data. The science section reads at two depths — customer and pharmacist.",
  c:["Read the science","What's inside it?"], go:"#science", mode:"deep" },

{ id:"contact",
  k:["contact","phone number","whatsapp","email","call you","speak to","human","real person",
     "agent","customer service","support","تواصل","رقم","اتصال","ايميل"],
  a:"Here's how to reach a person:<ul>"+
    "<li><b>WhatsApp / phone</b> — +968 9010 6968</li>"+
    "<li><b>Email</b> — hello@noorala.com</li>"+
    "<li><b>Instagram</b> — @noorala_care</li>"+
    "<li><b>Muscat</b>, Sultanate of Oman</li></ul>",
  c:["Talk to a person","Pharmacy partnership"] },

{ id:"return",
  k:["return","refund","exchange","cancel","wrong item","damaged","broken","complaint","مرتجع","استرجاع","الغاء","شكوى"],
  a:"If something arrives damaged, sealed incorrectly, or isn't what you ordered, message the order desk with your order reference and a photo and they'll sort it out directly.<br><br>"+
    "I don't want to quote you a returns policy I can't guarantee — that one should come from a person.",
  c:["Talk to a person"] },

{ id:"privacy",
  k:["privacy","data","gdpr","store my","tracking","cookie","cookies","personal","خصوصية","بيانات"],
  a:"Short version: this site doesn't collect anything.<ul>"+
    "<li>No account, no sign-up, no analytics account tied to you</li>"+
    "<li>Your bag and this chat are stored <b>on your own device</b> only</li>"+
    "<li>The skin snapshot runs entirely in your browser — the photo is never uploaded</li>"+
    "<li>Nothing is sent anywhere until <b>you</b> press send on WhatsApp</li></ul>",
  c:["Open the skin snapshot","Talk to a person"] },

{ id:"about",
  k:["who are you","brand","story","company","founded","omani","about you","instagram","social","من انتم","الشركة"],
  a:"Noorala is an <b>Omani beauty-from-within brand</b>, based in Muscat.<br><br>"+
    "We started with one product done properly — a premium collagen sachet, honest labelling, and a service around it that treats customers like people rather than transactions. "+
    "<i>جمالك يبدأ من الداخل.</i>",
  c:["What is Noorala Collagen?","Talk to a person"] },

{ id:"thanks",
  k:["thanks","thank you","shukran","appreciate","great","perfect","ok thanks","شكرا","مشكور","تسلم"],
  a:"Any time. If you'd like a person to pick this up, the order desk is one tap away — otherwise I'm here.",
  c:["Talk to a person","How much is it?"] },

{ id:"bot",
  k:["are you a bot","are you human","are you real","robot","ai","chatgpt","who am i talking to","هل انت"],
  a:"I'm an assistant built into this website — not a person, and I run entirely in your browser.<br><br>"+
    "That means I'm good on product facts, prices, delivery and how to take it, and deliberately useless at medical advice or anything about your specific order. For those, I'll pass you to the team.",
  c:["Talk to a person","What is Noorala Collagen?"] }
];

/* ---------------------------------------------------------------------
   2 · Matching
   Plain keyword scoring, tuned to prefer longer phrase hits. No model,
   no network — and an explicit "I don't know" when nothing scores.
   --------------------------------------------------------------------- */
var STOP = ["the","a","an","is","it","to","i","do","how","what","of","for","you","my","me","and","in","can","be","this","that","does"];

function norm(s){
  return String(s).toLowerCase()
    .replace(/[ـً-ْ]/g,"")                 // Arabic tatweel + diacritics
    .replace(/[آأإ]/g,"ا")            // alef variants
    .replace(/ة/g,"ه")                          // ta marbuta
    .replace(/[^\p{L}\p{N}\s]/gu," ")
    .replace(/\s+/g," ").trim();
}
function isArabic(s){ return /[؀-ۿ]/.test(s); }

function score(query, entry){
  var q = " " + norm(query) + " ";
  var tokens = q.trim().split(" ").filter(function(t){ return t && STOP.indexOf(t) < 0; });
  var total = 0;
  entry.k.forEach(function(key){
    var nk = norm(key);
    if(nk.indexOf(" ") > -1){
      if(q.indexOf(" " + nk + " ") > -1) total += 6 + nk.split(" ").length;   // exact phrase
      return;
    }
    tokens.forEach(function(t){
      if(t === nk) total += 5;
      else if(nk.length >= 4 && (t.indexOf(nk) === 0 || nk.indexOf(t) === 0) && Math.abs(t.length-nk.length) <= 3) total += 2;
    });
  });
  return total;
}
function match(query){
  var best = null, bestScore = 0;
  KB.forEach(function(e){
    var sc = score(query, e);
    if(sc > bestScore){ bestScore = sc; best = e; }
  });
  /* One exact keyword (5) is enough — "pregnant", "halal", "delivery" each
     carry a whole question on their own. A prefix-only brush (2) is not. */
  return bestScore >= 5 ? best : null;
}

/* ---------------------------------------------------------------------
   3 · Actions the chat can actually perform
   --------------------------------------------------------------------- */
var ACTIONS = {
  "Add 1 box to my bag":      function(){ return addPack("1"); },
  "Add the Duo pack":         function(){ return addPack("2"); },
  "Add the 90-day pack":      function(){ return addPack("3"); },
  "Send my bag to WhatsApp":  function(){ return sendBag(); },
  "Order now":                function(){ return sendBag(); },
  "Open the profile quiz":    function(){ return openSection(null, "deep", "[data-open-xp]"); },
  "Open the skin snapshot":   function(){ return openSection("#snapshot", "deep"); },
  "Read the science":         function(){ return openSection("#science", "deep"); },
  "Tell me about the 90-day journey": function(){ return say("journey"); },
  "Tell me about the profile quiz":   function(){ return say("quiz"); },
  "Request a partner pack":   function(){ return openSection("#partner-form", "partner"); },
  "Pharmacy partnership":     function(){ return say("partner"); },
  "Book a free skin analysis":function(){
    handover("Hi Noorala 🌿 — I'd like to book a free skin analysis. Which branch and date are available?");
    return "Opening WhatsApp so you can pick a branch and a date with the team.";
  },
  "Talk to a person":         function(){ return toHuman(); },
  "View my bag":              function(){ close(); if(BAG) BAG.open(); return null; },
  "Add another box":          function(){ return openSection("#shop","express"); }
};

function addPack(pack){
  if(!BAG || !window.NooralaCFG) return "The shop is still loading — give it a second and try again.";
  var P = window.NooralaCFG.packs[pack];
  var flav = /mango/i.test(lastFlavourMentioned) ? "mango" : "strawberry";
  BAG.add({pack:pack, flavour:flav, qty:1, note:"via chat"}, {silent:true});
  var gap = (window.NooralaCFG.freeDelivery || 20) - BAG.total();
  return "Added <b>" + esc(P.label) + "</b> (" + (flav === "mango" ? "Mango" : "Strawberry") + ") to your bag — " +
         BAG.money(P.price) + ".<br><br>Your bag is now <b>" + BAG.money(BAG.total()) + "</b>" +
         (gap > 0 ? ", " + BAG.money(gap) + " short of free delivery in Muscat." : " — free delivery in Muscat included.") +
         "<br><br>You can change the flavour in the shop, or send the whole bag to the order desk.";
}
function sendBag(){
  if(!BAG || !BAG.count()){
    openSection("#shop", "express");
    return "Your bag is empty — I've taken you to the shop. Pick a pack, or tell me which one and I'll add it.";
  }
  handover(BAG.message());
  return "Opening WhatsApp with your order, reference included. The team will confirm stock, address and payment there.";
}
function toHuman(){
  var recent = turns.slice(-6).filter(function(t){ return t.who === "you"; })
                    .map(function(t){ return "• " + t.text; }).join("\n");
  var msg = "Hi Noorala 🌿 — I was chatting on your website and I'd like to speak to someone.";
  if(recent) msg += "\n\nWhat I was asking about:\n" + recent;
  if(BAG && BAG.count()) msg += "\n\nI also have " + BAG.count() + " item(s) in my bag.";
  handover(msg);
  var open = window.NooralaDeskOpen && window.NooralaDeskOpen();
  return "Opening WhatsApp with what we've covered so far." +
         (open ? " Someone usually replies within minutes." :
                 " The desk is closed right now — they'll reply first thing, Sat–Thu 9:00–21:00 Muscat time.");
}
function handover(text){
  var w = window.open(waLink(text), "_blank", "noopener");
  if(!w && window.NooralaCopy) window.NooralaCopy(text, "Pop-up blocked — message copied instead");
}
function openSection(hash, mode, clickSel){
  if(mode){
    var b = $('.modeswitch button[data-mode="' + mode + '"]');
    if(b && document.body.dataset.mode !== mode) b.click();
  }
  setTimeout(function(){
    if(clickSel){ var t = $(clickSel); if(t){ close(); t.click(); return; } }
    var el = hash && $(hash);
    if(el){ close(); el.scrollIntoView({behavior:"smooth", block:"start"}); }
  }, mode ? 420 : 40);
  return null;                                   // the navigation is the answer
}
function say(id){
  var e = KB.filter(function(x){ return x.id === id; })[0];
  return e ? render(e) : null;
}

/* ---------------------------------------------------------------------
   4 · Transcript state
   --------------------------------------------------------------------- */
var turns = [];
var lastFlavourMentioned = "";
try{
  var saved = JSON.parse(localStorage.getItem(STORE) || "[]");
  if(Array.isArray(saved)) turns = saved.slice(-MAX_TURNS);
}catch(e){}
function persist(){
  try{ localStorage.setItem(STORE, JSON.stringify(turns.slice(-MAX_TURNS))); }catch(e){}
}

/* ---------------------------------------------------------------------
   5 · UI
   --------------------------------------------------------------------- */
var panel, log, form, input, chipRow, launcher, badge, isOpen = false, lastFocus = null;

function build(){
  launcher = document.createElement("button");
  launcher.className = "nc-fab";
  launcher.id = "ncFab";
  launcher.type = "button";
  launcher.setAttribute("aria-expanded","false");
  launcher.setAttribute("aria-controls","ncPanel");
  launcher.setAttribute("aria-label","Ask Noor, the Noorala assistant");
  launcher.innerHTML =
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">'+
    '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.6 9.6 0 0 1-2.9-.4L4 21l1.3-3.7A8.2 8.2 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z"/>'+
    '<circle cx="8.6" cy="11.5" r="1" fill="currentColor" stroke="none"/>'+
    '<circle cx="12" cy="11.5" r="1" fill="currentColor" stroke="none"/>'+
    '<circle cx="15.4" cy="11.5" r="1" fill="currentColor" stroke="none"/></svg>'+
    '<span class="nc-fab-label">Ask Noor</span>'+
    '<i class="nc-badge" id="ncBadge" hidden>1</i>';

  panel = document.createElement("div");
  panel.className = "nc-panel";
  panel.id = "ncPanel";
  panel.setAttribute("role","dialog");
  panel.setAttribute("aria-label","Chat with Noor, the Noorala assistant");
  panel.setAttribute("aria-hidden","true");
  panel.setAttribute("inert","");
  panel.innerHTML =
    '<div class="nc-head">'+
      '<span class="nc-avatar" aria-hidden="true">N</span>'+
      '<div class="nc-who"><b>Noor</b><span data-desk-status>Noorala assistant</span></div>'+
      '<button class="nc-icon" id="ncReset" type="button" title="Start a new conversation" aria-label="Start a new conversation">'+
        '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">'+
        '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/></svg></button>'+
      '<button class="nc-icon" id="ncClose" type="button" aria-label="Close the chat">'+
        '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">'+
        '<path d="M6 6l12 12M18 6L6 18"/></svg></button>'+
    '</div>'+
    '<div class="nc-log" id="ncLog" role="log" aria-live="polite" aria-relevant="additions" tabindex="0"></div>'+
    '<div class="nc-chips" id="ncChips"></div>'+
    '<form class="nc-form" id="ncForm">'+
      '<label class="sr" for="ncInput">Type your question for Noor</label>'+
      '<input id="ncInput" autocomplete="off" placeholder="Ask about the product, price or delivery…" maxlength="300">'+
      '<button type="submit" aria-label="Send">'+
        '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">'+
        '<path d="M4 12h14M13 6l6 6-6 6"/></svg></button>'+
    '</form>'+
    '<p class="nc-legal">An automated assistant, running in your browser. Not medical advice — '+
      '<a href="' + waLink("Hi Noorala 🌿 — I have a question.") + '" target="_blank" rel="noopener">talk to our team</a>.</p>';

  var host = $("#wa") || document.body;
  host.parentNode.insertBefore(launcher, host);
  host.parentNode.insertBefore(panel, host);

  log = $("#ncLog"); form = $("#ncForm"); input = $("#ncInput"); chipRow = $("#ncChips"); badge = $("#ncBadge");

  launcher.addEventListener("click", toggle);
  $("#ncClose").addEventListener("click", close);
  $("#ncReset").addEventListener("click", reset);
  form.addEventListener("submit", onSubmit);
  chipRow.addEventListener("click", function(e){
    var b = e.target.closest("button"); if(b) ask(b.textContent);
  });
  log.addEventListener("click", function(e){
    var b = e.target.closest("[data-chip]"); if(b) ask(b.dataset.chip);
  });
  panel.addEventListener("keydown", function(e){
    if(e.key === "Escape"){ e.stopPropagation(); close(); return; }
    if(e.key !== "Tab") return;
    var f = $$('a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])', panel)
              .filter(function(el){ return el.offsetParent !== null; });
    if(!f.length) return;
    if(e.shiftKey && document.activeElement === f[0]){ e.preventDefault(); f[f.length-1].focus(); }
    else if(!e.shiftKey && document.activeElement === f[f.length-1]){ e.preventDefault(); f[0].focus(); }
  });
}

function bubble(who, html, opts){
  var el = document.createElement("div");
  el.className = "nc-msg nc-" + who;
  el.innerHTML = (who === "noor" ? '<span class="nc-avatar sm" aria-hidden="true">N</span>' : "") +
                 '<div class="nc-body">' + html + "</div>";
  log.appendChild(el);
  if(!opts || !opts.quiet) log.scrollTop = log.scrollHeight;
  return el;
}
function typing(){
  var el = document.createElement("div");
  el.className = "nc-msg nc-noor nc-typing";
  el.innerHTML = '<span class="nc-avatar sm" aria-hidden="true">N</span>'+
                 '<div class="nc-body"><span class="nc-dots" aria-label="Noor is typing"><i></i><i></i><i></i></span></div>';
  log.appendChild(el); log.scrollTop = log.scrollHeight;
  return el;
}
function chips(list){
  chipRow.innerHTML = (list || []).map(function(c){
    return '<button type="button">' + esc(c) + "</button>";
  }).join("");
}

function render(entry){
  var body = typeof entry.a === "function" ? entry.a() : entry.a;
  if(entry.go || entry.mode){
    var label = entry.mode === "partner" ? "Go to partners" : entry.go === "#shop" ? "Open the shop" : "Show me on the page";
    body += '<div class="nc-act"><button type="button" data-chip="' + esc(label) + '">' + esc(label) + "</button></div>";
    ACTIONS[label] = function(){ return openSection(entry.go, entry.mode); };
  }
  return { html: body, chips: entry.c };
}

var FALLBACK = [
  "I don't have a reliable answer to that one, and I'd rather not guess.",
  "That's outside what I know for certain — I won't make something up."
];
function answer(text){
  if(/strawberry|mango|فراولة|مانجو/i.test(text)) lastFlavourMentioned = text;

  if(ACTIONS[text]){
    var out = ACTIONS[text]();
    if(out === null) return null;                             // the action navigated
    var after = /Added <b>/.test(String(out))
      ? ["Send my bag to WhatsApp","View my bag","Add another box","Delivery in Oman"]
      : ["Talk to a person","How much is it?","Delivery in Oman"];
    return typeof out === "string" ? { html: out, chips: after } : out;
  }
  var hit = match(text);
  if(hit) return render(hit);

  return {
    html: FALLBACK[Math.floor(Math.random()*FALLBACK.length)] +
          "<br><br>I can help with the product, ingredients, how to take it, prices, delivery, payment, storage, or a pharmacy partnership. " +
          "For anything else — including your specific order or anything medical — the team will pick it up on WhatsApp.",
    chips: ["Talk to a person","What is Noorala Collagen?","How much is it?","Delivery in Oman"]
  };
}

function ask(text){
  text = String(text).trim();
  if(!text) return;
  turns.push({who:"you", text:text});
  bubble("you", esc(text));
  chips([]);
  persist();

  var t = typing();
  var delay = 380 + Math.min(700, text.length * 12);
  setTimeout(function(){
    t.remove();
    var res = answer(text);
    if(!res) return;                                          // navigated away
    turns.push({who:"noor", html:res.html});
    bubble("noor", res.html);
    chips(res.chips || ["Talk to a person"]);
    persist();
  }, delay);
}

function onSubmit(e){
  e.preventDefault();
  var v = input.value;
  input.value = "";
  ask(v);
}

var GREETING = {
  html: "Hello — I'm <b>Noor</b>, the Noorala concierge.<br><br>"+
        "I can help with the product, how to take it, prices, delivery across Oman, or a pharmacy partnership. "+
        "Ask me anything, or start here:",
  chips: ["What is Noorala Collagen?","How much is it?","How do I take it?","Delivery in Oman","Pharmacy partnership"]
};

function paint(){
  log.innerHTML = "";
  if(!turns.length){
    bubble("noor", GREETING.html);
    chips(GREETING.chips);
  } else {
    turns.forEach(function(t){
      bubble(t.who, t.who === "you" ? esc(t.text) : t.html, {quiet:true});
    });
    var last = turns[turns.length-1];
    chips(last.who === "noor" ? ["Talk to a person","How much is it?","Order now"] : []);
    log.scrollTop = log.scrollHeight;
  }
}

function open(){
  if(isOpen) return;
  isOpen = true; lastFocus = document.activeElement;
  paint();
  panel.classList.add("open");
  panel.removeAttribute("inert");
  panel.setAttribute("aria-hidden","false");
  launcher.setAttribute("aria-expanded","true");
  launcher.classList.add("is-open");
  badge.hidden = true;
  try{ sessionStorage.setItem("noorala.chat.seen","1"); }catch(e){}
  var wa = $("#wa"); if(wa) wa.classList.remove("open");
  requestAnimationFrame(function(){ input.focus({preventScroll:true}); });
}
function close(){
  if(!isOpen) return;
  isOpen = false;
  panel.classList.remove("open");
  panel.setAttribute("inert","");
  panel.setAttribute("aria-hidden","true");
  launcher.setAttribute("aria-expanded","false");
  launcher.classList.remove("is-open");
  if(lastFocus && document.contains(lastFocus)) lastFocus.focus(); else launcher.focus();
}
function toggle(){ isOpen ? close() : open(); }
function reset(){
  turns = []; lastFlavourMentioned = "";
  persist(); paint();
  input.focus();
}

/* ---------------------------------------------------------------------
   6 · Boot
   --------------------------------------------------------------------- */
build();

/* A single, quiet nudge — once per session, only after someone has shown
   they're reading, and never while another panel is open. */
try{
  if(!sessionStorage.getItem("noorala.chat.seen") && !turns.length){
    var nudged = false;
    var nudge = function(){
      if(nudged || isOpen) return;
      if(scrollY < innerHeight * 0.9) return;
      nudged = true;
      badge.hidden = false;
      launcher.classList.add("nudge");
      setTimeout(function(){ launcher.classList.remove("nudge"); }, 4000);
      removeEventListener("scroll", nudge);
    };
    addEventListener("scroll", nudge, {passive:true});
  }
}catch(e){}

/* Let anything on the page open the concierge: data-open-chat="question" */
document.addEventListener("click", function(e){
  var t = e.target.closest("[data-open-chat]");
  if(!t) return;
  e.preventDefault();
  open();
  var q = t.getAttribute("data-open-chat");
  if(q) setTimeout(function(){ ask(q); }, 260);
});

window.NooralaChat = { open:open, close:close, ask:ask };
})();
