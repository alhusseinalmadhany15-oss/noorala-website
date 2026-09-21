/* =====================================================================
   NOORALA — analytics.js
   ---------------------------------------------------------------------
   Visitor analytics, wired up but switched off.

   Nothing here runs until you put a provider in CFG below. That is
   deliberate: the site currently tells visitors it collects nothing, and
   that statement has to stay true until you decide otherwise. Ship as-is
   and this file costs one HTTP request and does nothing else.

   To switch it on, set `provider` and `site`, then redeploy. The privacy
   copy on the site and in the chat reads this config and updates itself,
   so the page never claims more privacy than it is actually giving.

     provider: "plausible"   site: "nooralacare.com"
     provider: "umami"       site: "<website-id>"   host: "<your umami host>"
     provider: "goatcounter" site: "<yourcode>"     (…goatcounter.com)
     provider: "ga4"         site: "G-XXXXXXXXXX"

   Plausible, Umami and GoatCounter are cookieless and do not track people
   across sites, which is why one of them is the recommended choice here.
   GA4 is supported because you may already use it — but it sets cookies
   and in most jurisdictions needs a consent banner, which this site does
   not have. Pick GA4 only if you are prepared to add one.
   ===================================================================== */
(function(){
"use strict";

var CFG = {
  provider: "",          // "" = off. "plausible" | "umami" | "goatcounter" | "ga4"
  site: "",              // domain, website id, or measurement id — see above
  host: "",              // self-hosted Umami/Plausible host; leave blank for cloud
  respectDNT: true       // honour Do Not Track and Global Privacy Control
};

/* A visitor asking not to be tracked is not a setting to work around. */
function optedOut(){
  if(!CFG.respectDNT) return false;
  try{
    if(navigator.globalPrivacyControl === true) return true;
    var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    return dnt === "1" || dnt === "yes";
  }catch(e){ return false; }
}

var active = !!(CFG.provider && CFG.site) && !optedOut();

/* Events worth knowing about, named for the question they answer:
   where do people drop out between landing and messaging the order desk. */
var queue = [];
function track(name, props){
  if(!active) return;
  try{
    switch(CFG.provider){
      case "plausible":
        if(window.plausible) window.plausible(name, props ? {props:props} : undefined);
        else queue.push([name, props]);
        break;
      case "umami":
        if(window.umami && window.umami.track) window.umami.track(name, props || {});
        else queue.push([name, props]);
        break;
      case "goatcounter":
        if(window.goatcounter && window.goatcounter.count)
          window.goatcounter.count({path:name, title:name, event:true});
        else queue.push([name, props]);
        break;
      case "ga4":
        if(window.gtag) window.gtag("event", name, props || {});
        else queue.push([name, props]);
        break;
    }
  }catch(e){ /* analytics must never break the shop */ }
}
function flush(){
  var q = queue.slice(); queue.length = 0;
  q.forEach(function(a){ track(a[0], a[1]); });
}

function load(){
  if(!active) return;
  var s = document.createElement("script");
  s.defer = true;
  s.onload = flush;
  s.onerror = function(){ active = false; queue.length = 0; };

  switch(CFG.provider){
    case "plausible":
      s.src = (CFG.host || "https://plausible.io") + "/js/script.tagged-events.js";
      s.setAttribute("data-domain", CFG.site);
      window.plausible = window.plausible || function(){ (window.plausible.q = window.plausible.q || []).push(arguments); };
      break;
    case "umami":
      s.src = (CFG.host || "https://cloud.umami.is") + "/script.js";
      s.setAttribute("data-website-id", CFG.site);
      break;
    case "goatcounter":
      s.src = "https://gc.zgo.at/count.js";
      s.setAttribute("data-goatcounter", "https://" + CFG.site + ".goatcounter.com/count");
      break;
    case "ga4":
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.site);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){ window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", CFG.site, {anonymize_ip:true});
      break;
    default: return;
  }
  document.head.appendChild(s);
}

load();

window.NooralaAnalytics = {
  track: track,
  /* The privacy copy asks this so it can describe what is actually happening. */
  active: function(){ return active; },
  provider: function(){ return active ? CFG.provider : ""; },
  cookieless: function(){ return CFG.provider !== "ga4"; }
};
})();
