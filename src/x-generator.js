import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import config from "../config.json" with { type: "json" };
import { NICHES } from "./ig-content-lib.js";
import { loadTopics } from "./generator.js";
import { isRetailPromo } from "./unbiased.js";

const PLANS = path.join("data", "x_plans.json");
const ARTICLE_CACHE = path.join("data", "article-cache");
const XCFG = config.x || {};

function articleCacheParas(topic) {
  try {
    if (!topic || !topic.link) return [];
    const key = crypto.createHash("sha1").update(String(topic.link)).digest("hex");
    const f = path.join(ARTICLE_CACHE, key + ".json");
    if (!fs.existsSync(f)) return [];
    const c = JSON.parse(fs.readFileSync(f, "utf8"));
    return Array.isArray(c.paragraphs) ? c.paragraphs : [];
  } catch { return []; }
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function shorten(s, n) {
  const v = String(s).replace(/\s+/g, " ").trim();
  if (v.length <= n) return v;
  let cut = v.slice(0, n - 1);
  const sp = cut.lastIndexOf(" ");
  if (sp > Math.floor(n * 0.6)) cut = cut.slice(0, sp);
  return cut.trimEnd() + "…";
}
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 56) || "topic"; }
function shuffle(arr, rnd) { const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
function pick(arr, rnd) { return arr[Math.floor(rnd()*arr.length)]; }
function pickRange(coll, n, rnd) { return shuffle(coll, rnd).slice(0, n); }
function fileDate() { const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); }

function topicsForNiche(nicheId) {
  const data = loadTopics();
  if (!Array.isArray(data)) return [];
  const g = data.find(x=>x.nicheId===nicheId);
  return ((g&&g.items)||[]).map(t=>({ ...t, title: decodeEnt(t.title), snippet: decodeEnt(t.snippet)}));
}
const ENT_MAP = { "&amp;":"&", "&lt;":"<", "&gt;":">", "&quot;":'"', "&#39;":"'", "&apos;":"'" };
function decodeEnt(s) { return String(s==null?"":s).replace(/&#(\d+);/g,(_m,d)=>{const c=parseInt(d,10); return c>=32&&c<=255?String.fromCharCode(c):_m;}).replace(/&(amp|lt|gt|quot|#39|apos);/gi,(_m,e)=>ENT_MAP["&"+e+";"]??_m); }

function topicFacts(topic, n=4) {
  const src = [String(topic.snippet||""), ...articleCacheParas(topic)].join("\n").replace(/\s+/g," ").trim();
  const title = String(topic.title||"").replace(/\s+/g," ").trim().toLowerCase();
  const sents = src.split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length>=28);
  const out=[];
  for(const s of sents){ if(out.length>=n) break; if(isRetailPromo(s)) continue; const low=s.toLowerCase(); if(NEWSLETTER_HINTS.some(h=>low.includes(h))) continue; const t=shorten(s,132); const norm=t.toLowerCase(); if(norm===title||title.includes(norm)||norm.includes(title)) continue; if(out.some(o=>o.toLowerCase()===norm||norm.includes(o.toLowerCase()))) continue; out.push(t); }
  return out;
}

const SOURCE_NAMES = {
  "reuters.com":"Reuters","zdnet.com":"ZDNET","computerworld.com":"Computerworld","techcrunch.com":"TechCrunch","twit.tv":"TWiT","krebsonsecurity.com":"Krebs on Security","thehackernews.com":"The Hacker News","bleepingcomputer.com":"BleepingComputer","darkreading.com":"Dark Reading","windowscentral.com":"Windows Central","ghacks.net":"Ghacks","tomsguide.com":"Tom's Guide","tomshardware.com":"Tom's Hardware","techradar.com":"TechRadar","arstechnica.com":"Ars Technica","notebookcheck.net":"Notebookcheck","theregister.com":"The Register","servethehome.com":"ServeTheHome","macrumors.com":"MacRumors","9to5mac.com":"9to5Mac","appleinsider.com":"AppleInsider","gsmarena.com":"GSMArena","androidcentral.com":"Android Central","9to5google.com":"9to5Google","androidauthority.com":"Android Authority","theverge.com":"The Verge","lifewire.com":"Lifewire","itechguides.com":"ITechGuides","sourceforge.net":"SourceForge","4sysops.com":"4sysops","superuser.com":"Super User","geekflare.com":"Geekflare","spiceworks.com":"Spiceworks"
};
function sourceName(topic){ try{ const h=new URL(topic.link||"").hostname.replace(/^www\./,"").toLowerCase(); return SOURCE_NAMES[h]||h.split(".").slice(-2,-1)[0]||null; }catch{ return null; }}
function sourceFoot(topic){ const n=sourceName(topic); return n?"Full story: "+n+" — link in bio.": "";}

const STAT_RE=/(\$[\d][\d,]*(?:\.\d+)?(?:\s*(?:million|billion|trillion))?|\b\d[\d,]{2,}(?:\.\d+)?%?|\b\d+\s+(?:million|billion|trillion)\b)/i;
function findStatFact(facts){ for(const f of facts){ const m=STAT_RE.exec(f); if(m) return{ fact:f, stat:m[0].trim()}; } return null; }
function niceness(s){ return String(s).replace(/\s+/g," ").trim(); }
function phraseCut(s,n){ const v=niceness(s); if(v.length<=n) return v; let cut=v.slice(0,n); const sp=cut.lastIndexOf(" "); if(sp>n*0.5) cut=cut.slice(0,sp); return cut.replace(/[,\-–—]+$/,"").trimEnd(); }
function stripFluff(title){ let s=String(title||"").replace(/\s+/g," ").trim(); s=s.replace(/^(breaking|just in|exclusive|report|update|watch):\s*/i,"").trim(); s=s.replace(/\s+(?:after|as|amid|following|before)\s+.+$/i,"").trim(); s=s.replace(/\s+(?:in|for)\s+[a-z0-9'’&-]+(?:\s+[a-z0-9'’&-]+)*$/i,"").trim(); s=s.replace(/[,\-–—]+$/,"").trim(); return s.trim()||String(title||""); }
function makeNewsHook(topic,rnd){ const title=String(topic.title||"").replace(/\s+/g," ").trim(); const st=findStatFact(topicFacts(topic,6)); if(st&&rnd()<0.5) return{ big:st.stat, line:shorten(title,96)}; const big=phraseCut(stripFluff(title),48); const line=niceness(big).toLowerCase()===title.toLowerCase()?"":shorten(title,96); return{ big, line}; }

const SAVE_SHARE={ news:"Save this story — you'll want it later.", howto:"Save this — you'll need it next time.", routine:"Bookmark this routine for tomorrow.", tip:"Save this 30-second fix.", humor:"Send this to the person who needs to hear it.", redflag:"Save this before it becomes a repair bill.", myth:"Share this with the person who still believes it.", secrets:"Save this — insider knowledge only pays off when you use it." };
function ctaRotation(post){ const list=(XCFG.engagement&&XCFG.engagement.ctaRotation)||[]; if(!list.length) return SAVE_SHARE[post.kind]||SAVE_SHARE.tip; const rnd=mulberry32(hashStr("xcta"+String(post.slot)+String(post.title))); return list[Math.floor(rnd()*list.length)]; }

const NEWSLETTER_HINTS=["good morning","good evening","hope you had","thanks for reading","as a reminder","today i’m reading","today i'm reading","listening to","this newsletter","you’re receiving this","you're receiving this","read on the web","help us better understand","sponsored","subscribe","unsubscribe"];
const LEAD_EXCLUDE=/twit|podcast|episode|sponsored/i;
function looksLikeNewsletter(t){ const s=String(t.snippet||t.title||"").toLowerCase(); return NEWSLETTER_HINTS.some(h=>s.includes(h)); }
function contentDepth(t){ return String(t.snippet||"").length + articleCacheParas(t).reduce((a,p)=>a+String(p).length,0); }
const FREE_DEAL_RE=/(free\b|freebie|free app|free apps|free game|free games|free download|free to play|app of the (?:day|week)|app sale|app deals|free with|100% free|at no cost)/i;
const PAID_DEAL_RE=/(discount|\b% off\b|deal(?:s)?\b|sale\b|bogo|clearance|coupon|save\s|\$\d|price drop|reduced)/i;
function isFreeDeal(t){ return FREE_DEAL_RE.test(String(t.title||"")+" "+String(t.snippet||"")); }
function isPaidDeal(t){ return PAID_DEAL_RE.test(String(t.title||"")+" "+String(t.snippet||"")); }
function pickDeepest(coll){ const linked=coll.filter(t=>t&&t.link&&/^https?:\/\//i.test(String(t.link))); let pool=linked.filter(t=>!looksLikeNewsletter(t)&&!LEAD_EXCLUDE.test(String(t.title||""))); if(!pool.length) pool=linked; if(!pool.length) pool=coll.filter(t=>!looksLikeNewsletter(t)); if(!pool.length) pool=coll; const free=pool.filter(isFreeDeal); if(free.length) pool=free; else{ const nonPaid=pool.filter(t=>!isPaidDeal(t)); if(nonPaid.length) pool=nonPaid; } const fresh=pool.filter(t=>{ if(!t.pubDate) return false; const days=(Date.now()-new Date(t.pubDate).getTime())/86400000; return days>=0&&days<=2; }); if(fresh.length>=2) pool=fresh; let best=pool[0]; for(const t of pool){ if(contentDepth(t)>contentDepth(best)) best=t; } return best; }

function newsCarouselSlides(topic,niche,rnd){ const all=topicFacts(topic,6); const shown=all.slice(0,4); const tail=all.slice(4); const takeaway=(tail[tail.length-1]||null); const fwd=/next|watch|will|expect|planned|coming|follow|over the|later this|coming up|in the works/i; const watch=(tail.length?tail.find(f=>fwd.test(f)):null)||shown.slice(0,-1).find(f=>fwd.test(f))||null; const hk=makeNewsHook(topic,rnd); const slides=[{kind:"hook",text:`${hk.big}\n${hk.line}`},{kind:"facts",text:shown.join("\n")}]; if(takeaway) slides.push({kind:"body",text:shorten("THE TAKEAWAY — "+takeaway,190)}); if(watch&&watch!==takeaway&&!shown.includes(watch)) slides.push({kind:"body",text:shorten("WHAT TO WATCH — "+watch,170)}); slides.push({kind:"cta",text:SAVE_SHARE.news}); return slides; }
function howtoSlides(howto){ const line=shorten(String(howto.steps&&howto.steps[0]||"A fix you can do in minutes."),90); const slides=[{kind:"hook",text:`${howto.title}\n${line}`}]; howto.steps.forEach((s,i)=>{ const d=(howto.details&&howto.details[i])||""; slides.push({kind:"step",text: d?`${s} — ${d}`:s}); }); slides.push({kind:"cta",text:SAVE_SHARE.howto}); return slides; }
function tipCard(tip){ const big=phraseCut(String(tip.title||"").replace(/\s+/g," ").trim(),42); const body=String(tip.body||"").replace(/\s+/g," ").trim(); return[{kind:"hook",text:`${big}\n${shorten(body,120)}`},{kind:"body",text:shorten(body,230)},{kind:"cta",text:SAVE_SHARE.tip}]; }
function redFlagCard(flag){ const big=phraseCut(String(flag.flag||"Something is quietly wrong."),40); const why=String(flag.why||"").replace(/\s+/g," ").trim(); const fix=String(flag.fix||"").replace(/\s+/g," ").trim(); return [{kind:"hook",text:`${big}\n${shorten(why,110)}`},{kind:"body",text:shorten("WHY IT'S A PROBLEM — "+why,200)},{kind:"body",text:shorten("THE FIX — "+fix,210)},{kind:"cta",text:"Save this before it costs you a repair bill."}]; }
function mythCard(m){ const myth=String(m.myth||"").replace(/\s+/g," ").trim(); const truth=String(m.truth||"").replace(/\s+/g," ").trim(); return [{kind:"hook",text:`${phraseCut(myth,42)}`},{kind:"body",text:shorten("THE TRUTH — "+truth,220)},{kind:"cta",text:"Share this with the person who still believes it."}]; }
function secretCard(s){ const line=shorten(String(s.secrets&&s.secrets[0]||"Insider knowledge, free."),90); return [{kind:"hook",text:`${s.title}\n${line}`},{kind:"facts",text:(s.secrets||[]).join("\n")},{kind:"cta",text:"Save this — insider knowledge only pays off when you use it."}]; }
function microGuideCard(howto){ return howtoSlides(howto); }
function gadgetFocusCard(topic,rnd){ const title=String(topic.title||"").replace(/\s+/g," ").trim(); const st=findStatFact(topicFacts(topic,6)); const big=st&&rnd()<0.5?st.stat:phraseCut(stripFluff(title),48); const line=niceness(big).toLowerCase()===title.toLowerCase()?"":shorten(title,96); const facts=topicFacts(topic,4); return [{kind:"hook",text:`${big}\n${line}`},{kind:"brief",text:facts.join("\n")||shorten(String(topic.snippet||""),230)},{kind:"cta",text:SAVE_SHARE.news}]; }

const PILLAR_KICKERS={ redflag:"DAILY RED FLAG", myth:"TECH MYTHBUSTER", secrets:"IT GURU SECRETS", howto:"MICRO GUIDE" };

// ---- X captions: must fit 280 chars, concise, link + 3-4 hashtags ----
function pickTags(nicheId, rnd){
  const n=NICHES[nicheId];
  const base=(XCFG.baseHashtags||[]).map(t=>t.replace(/^#/,""));
  const nicheTags=(XCFG.nicheHashtags&&XCFG.nicheHashtags[nicheId])||n.tags;
  const nicheMap=nicheTags.map(t=>t.replace(/^#/,""));
  const limit=XCFG.hashtagLimit||4;
  const tags=[...pickRange(nicheMap, Math.min(2, limit-1), rnd), ...pickRange(base, 1, rnd)];
  return [...new Set(tags)].slice(0, limit);
}
function fitToLimit(text, limit){
  const v=String(text).replace(/\s+/g," ").trim().replace(/\n\s*\n/g,"\n\n");
  if(v.length<=limit) return v;
  return v.slice(0, limit-1).trimEnd()+"…";
}
// X captions: short, punchy, link-aware. Reuses IG pillar content but trimmed to 280.
function captionFor(post, rnd){
  const n=NICHES[post.niche];
  const handle=XCFG.handle||"@theitsupprtguru";
  const tags=pickTags(post.niche, rnd).map(t=>"#"+t).join(" ");
  const emoji=n.emoji||"";
  const linkLine = post.link ? ` ${post.link}` : "";
  const limit=XCFG.charLimit||280;
  const tagBlock = tags ? ` ${tags}` : "";

  // Reserve ~30 chars for link+tags when present; fit headline within remainder
  const reserve = (post.link? 24:0) + (tags? tags.length+1:0) + 10;
  const headBudget = Math.max(80, limit - reserve - 40);

  if(post.kind==="gadget-focus"){
    const src = post.source ? ` (${post.source})` : "";
    let body = `${emoji} ${post.title}${src}`;
    body = shorten(body, headBudget);
    let tweet = `${body}${linkBlock(linkLine, tags, limit, body)}`;
    return fitToLimit(tweet, limit);
  }
  if(post.kind==="redflag"){
    let body = `🚩 ${post.title}`;
    body = shorten(body, headBudget);
    let tweet = `${body}${linkBlock(linkLine, tags, limit, body)}`;
    return fitToLimit(tweet, limit);
  }
  if(post.kind==="myth"){
    let truth = "";
    const b = post.slides.find(s=>/THE TRUTH/i.test(s.text||""));
    if(b) truth = b.text.replace(/^THE TRUTH\s*—\s*/i,"").trim();
    let body = `🛑 Myth: ${post.title}\nTruth: ${shorten(truth, 90)}`;
    body = fitToLimit(body, headBudget+40);
    let tweet = `${body}${linkBlock(linkLine, tags, limit, body)}`;
    return fitToLimit(tweet, limit);
  }
  if(post.kind==="secrets"){
    let body = `🔓 ${post.title}`;
    const pts = (post.slides.find(s=>s.kind==="facts")?.text||"").split("\n")[0]||"";
    if(pts) body += ` — ${shorten(pts, 80)}`;
    body = shorten(body, headBudget+20);
    let tweet = `${body}${linkBlock(linkLine, tags, limit, body)}`;
    return fitToLimit(tweet, limit);
  }
  // default: carousel / news / howto / tip
  let headline = post.title;
  // For news, keep real headline; for others, add emoji
  let body = `${emoji} ${headline}`;
  body = shorten(body, headBudget);
  let tweet = `${body}${linkBlock(linkLine, tags, limit, body)}`;
  return fitToLimit(tweet, limit);
}
function linkBlock(linkLine, tags, limit, body){
  // Build suffix: link + tags + handle CTA if space
  let suffix = "";
  if(linkLine) suffix += `\n\n${linkLine.trim()}`;
  if(tags) suffix += `\n${tags}`;
  // X CTA is short; only add if fits
  const cta = " Follow for daily tech intel.";
  if(body.length + suffix.length + cta.length <= limit - 5) suffix += cta;
  return suffix;
}

export function captionForPost(post){
  const rnd=mulberry32(hashStr("xcap"+String(post.slot)+String(post.title)));
  return captionFor(post, rnd);
}

function buildPillarPost(nicheId, pillar, rnd, slot=0){
  const n=NICHES[nicheId]||{};
  const topics=topicsForNiche(nicheId);
  let slides, kind, title, _srcTopic;
  const p=pillar.kind;
  if(p==="redflag"){ const flag=pick(n.redflags||[],rnd); kind="redflag"; title=flag.flag; slides=redFlagCard(flag); }
  else if(p==="myth"){ const m=pick(n.myths||[],rnd); kind="myth"; title=m.myth; slides=mythCard(m); }
  else if(p==="secrets"){ const s=pick(n.secrets||[],rnd); kind="secrets"; title=s.title; slides=secretCard(s); }
  else if(p==="guide"){ const howto=pick(n.howtos||[],rnd); kind="howto"; title=howto.title; slides=microGuideCard(howto); }
  else if(p==="news"){ let topic=pickDeepest(topics); if(topicFacts(topic,6).length<2){ let best=null; for(const t of topics){ if(topicFacts(t,6).length>=2&&(!best||contentDepth(t)>contentDepth(best))) best=t; } if(best) topic=best; } kind="news"; title=shorten(String(topic.title||""),56); slides=newsCarouselSlides(topic,nicheId,rnd); _srcTopic=topic; }
  else { const tip=pick(n.tips||[],rnd); kind="tip"; title=tip.title; slides=tipCard(tip); }
  const formatOut = kind==="news"||kind==="howto"||kind==="secrets" ? "carousel" : "image";
  const post={ id:`${dateKeyShort()}${slug(title)}`, slot, niche:nicheId, nicheLabel:n.label, accent:n.accent, emoji:n.emoji, format:formatOut, kind, pillar:PILLAR_KICKERS[kind]||null, title, source:_srcTopic?sourceName(_srcTopic):null, link:_srcTopic&&_srcTopic.link?_srcTopic.link:null, slides };
  post.caption=captionFor(post,rnd);
  post.status="pending";
  return post;
}
function dateKeyShort(){ return fileDate().replace(/-/g,"")+"-"; }
const DEVICE_HINT=/(pixel|galaxy|iphone|ipad|macbook|mac|watch|fold|foldable|surface|laptop|samsung|apple|google|oneplus|xiaomi|oppo|vivo|motorola|nothing|earbuds|headphones|tablet|camera|console|monitor|gpu|rtx|ryzen)/i;
function pickGadgetFocusTopic(){ const topics=topicsForNiche("gadgets"); if(!topics.length) return null; const device=topics.filter(t=>DEVICE_HINT.test(String(t.title||""))); const pool=device.length>=2?device:topics; return pickDeepest(pool); }
function buildGadgetFocus(rnd, slot=4){ const topic=pickGadgetFocusTopic(); const n=NICHES.gadgets; const title="Friday Tech Gadget Focus"; const post={ id:`${dateKeyShort()}gadget-focus-${slug(topic?topic.title:title)}`, slot, niche:"gadgets", nicheLabel:n.label, accent:n.accent, emoji:n.emoji, format:"carousel", kind:"gadget-focus", title: topic?shorten(String(topic.title||""),56):title, source: topic?sourceName(topic):null, link: topic&&topic.link?topic.link:null, slides:gadgetFocusCard(topic||{title,snippet:""},rnd)}; post.caption=captionFor(post,rnd); post.status="pending"; return post; }

function loadNicheWeights(){ try{ if(fs.existsSync("data/niche-weights.json")){ const w=JSON.parse(fs.readFileSync("data/niche-weights.json","utf8")); if(w&&Object.keys(w).length) return w; }}catch{} return null; }
function pickWeightedNicheOrder(weights,rnd,count){ const ids=Object.keys(NICHES); const order=[]; const pool=ids.slice(); for(let i=0;i<count;i++){ const tot=pool.reduce((s,id)=>s+(weights[id]??1),0); let r=rnd()*tot; let pick=pool[pool.length-1]; for(const id of pool){ r-=weights[id]??1; if(r<=0){ pick=id; break; }} order.push(pick); pool.splice(pool.indexOf(pick),1);} return order; }

export function generateXPlan(){
  const rnd=mulberry32(hashStr(fileDate()+"-x"));
  const nicheIds=Object.keys(NICHES);
  const weights=loadNicheWeights();
  let dayNicheOrder;
  if(weights) dayNicheOrder=pickWeightedNicheOrder(weights,rnd,4);
  else { const CORE=["ai","gadgets","apple","hardware","security"]; dayNicheOrder=rnd()<0.75?shuffle(CORE,rnd):shuffle(nicheIds,rnd); }
  const pillars=[{kind:"redflag"},{kind:"myth"},{kind:"secrets"},{kind:"guide"}];
  const posts=[];
  for(let slot=0; slot<4; slot++){
    const nicheId=dayNicheOrder[slot];
    posts.push(buildPillarPost(nicheId, pillars[slot], rnd, slot));
  }
  const gfCfg=(XCFG.fridayGadgetFocus||config.instagram?.fridayGadgetFocus)||{};
  const dow=new Date(fileDate()+"T00:00:00").getDay();
  if(gfCfg.enabled!==false && dow===5){ posts.push(buildGadgetFocus(rnd, gfCfg.slot||4)); }
  const plan={ date:fileDate(), generatedAt:new Date().toISOString(), posts, platform:"x" };
  fs.mkdirSync("data",{recursive:true});
  fs.writeFileSync(PLANS, JSON.stringify(plan,null,2));
  return plan;
}
export function loadPlan(){ if(!fs.existsSync(PLANS)) return null; return JSON.parse(fs.readFileSync(PLANS,"utf8")); }
export function appendXSlot(plan, slotIndex){
  const rnd=mulberry32(hashStr(plan.date+"-x-slot"+slotIndex));
  const nicheIds=Object.keys(NICHES);
  const CORE=["ai","gadgets","apple","hardware","security"];
  const nicheId=rnd()<0.75?pick(CORE,rnd):pick(nicheIds,rnd);
  const pillars=[{kind:"redflag"},{kind:"myth"},{kind:"secrets"},{kind:"guide"}];
  const pillar=pillars[slotIndex]||pick(pillars,rnd);
  const post=buildPillarPost(nicheId,pillar,rnd,slotIndex);
  post.slot=slotIndex;
  const idx=plan.posts.findIndex(p=>p.slot===slotIndex);
  if(idx>=0) plan.posts.splice(idx,1,post); else plan.posts.push(post);
  plan.posts.sort((a,b)=>a.slot-b.slot);
  return plan;
}
export default { generateXPlan, loadPlan, appendXSlot, captionForPost };

// Direct run: `node src/x-generator.js` prints today's X plan
if(process.argv[1] && process.argv[1].replace(/\\/g,"/").endsWith("src/x-generator.js")){
  const appendArg=process.argv.find(a=>a.startsWith("--append-slot="));
  if(appendArg){
    const n=parseInt(appendArg.split("=")[1],10);
    let plan=loadPlan(); if(!plan) plan=generateXPlan();
    plan.posts=plan.posts.filter(p=>p.slot!==n);
    appendXSlot(plan,n);
    fs.writeFileSync(PLANS, JSON.stringify(plan,null,2));
    const ap=plan.posts.find(p=>p.slot===n);
    console.log("appended X slot "+n+" -> "+ap.title+" ["+ap.format+" / "+ap.niche+"]");
  } else {
    const plan=generateXPlan();
    console.log("X Plan for "+plan.date+":");
    for(const p of plan.posts) console.log(`  [${p.slot}] ${p.format.padEnd(8)} ${p.kind.padEnd(7)} ${p.niche.padEnd(12)} ${p.title} | ${p.caption.length} chars`);
  }
}
