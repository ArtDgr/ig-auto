import fs from "node:fs";
import path from "node:path";
import { firefox } from "playwright";
import config from "../config.json" with { type: "json" };
import { loadPlan } from "./x-generator.js";

// X in-stream image: 1600x900 (16:9) is native, but we render 1280x720 for
// faster CI while staying sharp on retina. Same brand system as IG cards.
const W = 1280;
const H = 720;

function esc(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

const svgWrap=(accent,inner)=>`<svg viewBox="0 0 200 200" fill="none" stroke="${accent}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const TOPIC_THEMES=[
  { re:/(breach|hack|ransomware|malware|phishing|vulnerab|zero.day|exploit|password|2fa|patch|attack|steal)/i, accent:"#DC2626", svg:(a)=>svgWrap(a,`<path d="M100 24 L162 50 V95 C162 136 138 166 100 180 C62 166 38 136 38 95 V50 Z"/><rect x="82" y="86" width="36" height="26" rx="5"/><path d="M90 86 V74 a10 10 0 0 1 20 0 V86"/>`)},
  { re:/(\bai\b|gpt|llm|model|agent|neural|openai|anthropic|gemini|copilot|intelligence|machine.learning|bot)/i, accent:"#6366F1", svg:(a)=>svgWrap(a,`<circle cx="55" cy="55" r="13"/><circle cx="145" cy="42" r="13"/><circle cx="150" cy="152" r="13"/><circle cx="50" cy="146" r="13"/><circle cx="100" cy="100" r="16"/><path d="M67 62 L88 92 M133 50 L112 90 M140 140 L112 110 M62 134 L88 111 M100 84 V84"/>`)},
  { re:/(battery|charging|charge|usb.c|power|mah|fast.charge)/i, accent:"#16A34A", svg:(a)=>svgWrap(a,`<rect x="45" y="70" width="105" height="60" rx="10"/><rect x="150" y="86" width="14" height="28" rx="5"/><path d="M84 78 L68 100 H88 L76 122"/>`)},
  { re:/(wifi|router|signal|mesh|network)/i, accent:"#0EA5E9", svg:(a)=>svgWrap(a,`<path d="M52 112 a48 48 0 0 1 96 0"/><path d="M67 96 a33 33 0 0 1 66 0"/><path d="M82 80 a18 18 0 0 1 36 0"/><circle cx="100" cy="128" r="8"/>`)},
  { re:/(camera|photo|lens|sensor|image)/i, accent:"#7C3AED", svg:(a)=>svgWrap(a,`<rect x="42" y="58" width="116" height="84" rx="16"/><circle cx="100" cy="100" r="26"/><circle cx="100" cy="100" r="11"/><rect x="64" y="58" width="30" height="14" rx="5"/><path d="M128 70 v-8"/>`)},
  { re:/(cpu|gpu|chip|processor|ryzen|intel|amd|nvidia|rtx|ssd|ram|benchmark|core|silicon|semiconductor)/i, accent:"#0D9488", svg:(a)=>svgWrap(a,`<rect x="60" y="60" width="80" height="80" rx="10"/><path d="M78 60 V34 M100 60 V34 M122 60 V34 M78 140 V166 M100 140 V166 M122 140 V166 M60 78 H34 M60 100 H34 M60 122 H34 M140 78 H166 M140 100 H166 M140 122 H166"/><rect x="80" y="80" width="40" height="40" rx="5"/>`)},
  { re:/(cloud|server|data.center|datacenter|kubernetes|docker|container|aws|azure|storage|infra|uptime|devops|sre)/i, accent:"#2563EB", svg:(a)=>svgWrap(a,`<ellipse cx="105" cy="135" rx="72" ry="24"/><circle cx="78" cy="112" r="24"/><circle cx="118" cy="100" r="29"/><circle cx="150" cy="120" r="18"/><path d="M45 168 h110"/>`)},
  { re:/(habit|routine|ops|checklist|daily|tip|how.to|guide|setup|tutorial|reset|fix|cleanup|sanity)/i, accent:"#059669", svg:(a)=>svgWrap(a,`<rect x="45" y="55" width="110" height="95" rx="8"/><path d="M62 78 L72 88 L90 68"/><rect x="100" y="72" width="38" height="9" rx="4.5"/><path d="M62 108 L72 118 L90 98"/><rect x="100" y="102" width="38" height="9" rx="4.5"/><path d="M62 128 L72 138 L90 118"/><rect x="100" y="126" width="38" height="9" rx="4.5"/>`)},
  { re:/(deal|freebie|discount|sale|coupon|free|app.of.the.day|giveaway)/i, accent:"#EA6A12", svg:(a)=>svgWrap(a,`<path d="M50 42 H158 L164 98 L102 168 L40 106 Z"/><circle cx="136" cy="74" r="9"/>`)},
  { re:/(apple|mac|macos|ios|ipad|app.store|siri|macbook|apple.silicon)/i, accent:"#0EA5E9", svg:(a)=>svgWrap(a,`<circle cx="86" cy="106" r="30"/><circle cx="114" cy="106" r="30"/><path d="M86 76 A34 34 0 0 1 114 76"/><path d="M100 46 v20"/><path d="M100 46 q12 -4 22 -12"/>`)},
  { re:/(phone|pixel|galaxy|iphone|android|samsung|redmi|honor|fold|smartphone|tablet|watch|wearable|gadget)/i, accent:"#F59E0B", svg:(a)=>svgWrap(a,`<rect x="62" y="28" width="76" height="144" rx="18"/><circle cx="100" cy="46" r="5"/><path d="M84 118 l12 12 22 -26"/><path d="M88 158 h24"/>`)},
];

const X_BLUE="#1D9BF0";
const BRAND_RED="#FF3B30";
const NICHE_THEMES={
  ai:{ cls:"theme-ai", bg:`radial-gradient(1000px 600px at 85% -10%, rgba(29,155,240,.22), transparent 62%), radial-gradient(820px 520px at -12% 112%, rgba(129,140,248,.12), transparent 60%), linear-gradient(160deg, #05070B 0%, #0A0D14 55%, #0E1118 100%)`, accent:X_BLUE },
  gadgets:{ cls:"theme-gadgets", bg:`radial-gradient(1000px 600px at 85% -10%, rgba(29,155,240,.20), transparent 62%), radial-gradient(820px 520px at -12% 112%, rgba(245,158,11,.10), transparent 60%), linear-gradient(160deg, #05070B 0%, #0A0D14 55%, #0E1118 100%)`, accent:X_BLUE },
  apple:{ cls:"theme-apple", bg:`radial-gradient(1000px 600px at 85% -10%, rgba(29,155,240,.20), transparent 62%), radial-gradient(820px 520px at -12% 112%, rgba(56,189,248,.10), transparent 60%), linear-gradient(160deg, #05070B 0%, #0A0D14 55%, #0E1118 100%)`, accent:X_BLUE },
  hardware:{ cls:"theme-hardware", bg:`radial-gradient(1000px 600px at 85% -10%, rgba(29,155,240,.20), transparent 62%), radial-gradient(820px 520px at -12% 112%, rgba(45,212,191,.10), transparent 60%), linear-gradient(160deg, #05070B 0%, #0A0D14 55%, #0E1118 100%)`, accent:X_BLUE },
  security:{ cls:"theme-security", bg:`radial-gradient(1000px 600px at 85% -10%, rgba(255,59,48,.20), transparent 62%), radial-gradient(820px 520px at -12% 112%, rgba(255,59,48,.10), transparent 60%), linear-gradient(160deg, #0B0505 0%, #120808 55%, #160A0A 100%)`, accent:"#FF5A50" },
  "it-support":{ cls:"theme-itsupport", bg:`radial-gradient(1000px 600px at 85% -10%, rgba(29,155,240,.20), transparent 62%), radial-gradient(820px 520px at -12% 112%, rgba(16,185,129,.10), transparent 60%), linear-gradient(160deg, #05070B 0%, #0A0D14 55%, #0E1118 100%)`, accent:X_BLUE },
  "cloud-devops":{ cls:"theme-cloud", bg:`radial-gradient(1000px 600px at 85% -10%, rgba(29,155,240,.20), transparent 62%), radial-gradient(820px 520px at -12% 112%, rgba(59,130,246,.10), transparent 60%), linear-gradient(160deg, #05070B 0%, #0A0D14 55%, #0E1118 100%)`, accent:X_BLUE },
};

function accentForPost(post){
  if(post.kind==="redflag") return BRAND_RED;
  return (config.x && config.x.accent) || X_BLUE;
}

export function cardHtml(post, slide, index, total){
  const hayTitle=`${post.title||""} ${post.subtitle||""} ${post.slideText||""}`;
  const hayNiche=`${post.niche||""} ${post.nicheLabel||""}`;
  const topic=TOPIC_THEMES.find(t=>t.re.test(hayTitle))||TOPIC_THEMES.find(t=>t.re.test(hayNiche));
  const theme=NICHE_THEMES[post.niche]||{};
  const accent=post.kind==="redflag"?BRAND_RED:(topic&&topic.accent)||theme.accent||X_BLUE;
  const bodyTag=theme.cls?` class="${theme.cls}"`:"";
  const bodySel=theme.cls?`body.${theme.cls}`:"body";
  const motifSvg=topic?topic.svg(accent):"";
  const isRedFlag=post.kind==="redflag";
  const bg=isRedFlag?`radial-gradient(1000px 600px at 85% -10%, rgba(255,59,48,.24), transparent 62%), radial-gradient(820px 520px at -12% 112%, rgba(255,59,48,.12), transparent 60%), linear-gradient(160deg, #0B0505 0%, #140707 55%, #1A0A0A 100%)`: topic?`radial-gradient(1000px 600px at 85% -10%, ${accent}2e, transparent 62%), radial-gradient(820px 520px at -12% 112%, ${accent}1c, transparent 60%), linear-gradient(160deg, #05070B 0%, #0A0D14 55%, #0E1118 100%)`: theme.bg||`radial-gradient(1000px 600px at 85% -10%, ${accent}1f, transparent 62%), radial-gradient(900px 520px at -12% 112%, ${accent}12, transparent 60%), linear-gradient(160deg, #05070B 0%, #0A0D14 55%, #0E1118 100%)`;
  const brand=(config.brand||"IT STUDIO").toUpperCase();
  const handle=config.x?.handle || config.instagram.handle;
  const kind=slide.kind;
  const text=esc(slide.text);
  const pillar=(post.pillar||"").toUpperCase();
  const content=kind==="hook"?(()=>{
    const parts=text.split("\n").filter(s=>s.trim());
    const [big="",...rest]=parts;
    const line=rest.join(" ").trim();
    const stat=/^[\$0-9][\d.,kKmMbB%]*$/.test(big.trim());
    const len=big.trim().length;
    const fs=Math.max(38, Math.min(84, Math.floor(720/Math.max(1, len*0.62))));
    return `<div class="hook-wrap"><div class="kicker">${esc(pillar||post.nicheLabel||"")}</div><div class="hook-big${stat?" stat":""}" style="font-size:${fs}px">${esc(big)}</div>${line?`<div class="hook-line">${esc(line)}</div>`:""}<div class="rule"></div></div>`;
  })(): kind==="title"?`<div class="title-wrap"><div class="kicker">${esc(pillar||post.nicheLabel||"")}</div><h1>${text}</h1><div class="rule"></div></div>`: kind==="cta"?`<div class="cta-box"><span>${text}</span><div class="cta-actions"><span class="pill save">SAVE THIS</span><span class="pill share">SHARE IT</span></div><div class="cta-swatch">${esc(handle)}</div></div>`: kind==="brief"?(()=>{
    const parts=text.split("\n").map(s=>s.trim()).filter(Boolean);
    const [head=text,...rest]=parts;
    return `<div class="brief-wrap"><div class="kicker brief-kick">KEY DETAILS</div><h1>${esc(head)}</h1><ul class="facts-list">${rest.map(s=>`<li>${esc(s)}</li>`).join("")}</ul></div>`;
  })(): kind==="facts"?`<div class="facts-wrap"><ul class="facts-list">${text.split("\n").map(s=>s.trim()).filter(Boolean).map(s=>`<li>${esc(s)}</li>`).join("")}</ul></div>`: kind==="step"?`<div class="step-body"><ol>${text.split("\n").filter(Boolean).map(s=>`<li>${esc(s.trim())}</li>`).join("")}</ol></div>`:`<div class="body-text"><p>${text}</p></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:${W}px;height:${H}px;background:#05070B;overflow:hidden}
  ${bodySel}{font-family:"Bahnschrift","Arial Narrow","Segoe UI","Helvetica Neue",Arial,sans-serif;color:#FFFFFF;background:${bg};border:16px solid ${accent};display:flex;flex-direction:column;padding:28px 42px 22px;position:relative}
  body::before{content:"";position:absolute;inset:8px;pointer-events:none;border:2px solid rgba(255,255,255,.12);z-index:3}
  .motif{position:absolute;inset:0;pointer-events:none;z-index:0}
  .motif svg{position:absolute;right:-30px;top:50%;transform:translateY(-50%);width:520px;height:520px;opacity:.28;filter:drop-shadow(0 12px 30px ${accent}22)}
  .motif svg.motif-2{right:auto;left:-80px;bottom:-90px;top:auto;width:340px;height:340px;opacity:.18}
  .top{display:flex;align-items:center;justify-content:space-between;font-size:18px;letter-spacing:2px;color:#8B93A6;position:relative;z-index:1}
  .top .dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:${accent};margin-right:10px;box-shadow:0 0 0 4px ${accent}33}
  .top .brand{display:flex;align-items:center;font-weight:900;color:#FFFFFF;text-transform:uppercase;letter-spacing:1.5px}
  .top .handle{font-size:15px;letter-spacing:1px;color:#A9B1C2;font-weight:600}
  .stage{flex:1;display:flex;align-items:center;justify-content:center;padding:14px 8px 8px;position:relative;z-index:1}
  .title-wrap{text-align:left;max-width:1000px}
  .kicker{font-size:16px;letter-spacing:5px;color:${accent};text-transform:uppercase;font-weight:900;margin-bottom:12px}
  h1{font-size:46px;line-height:1.04;font-weight:900;letter-spacing:-1px;color:#FFFFFF;text-transform:uppercase}
  .hook-wrap{text-align:left;max-width:980px}
  .hook-big{font-weight:900;letter-spacing:-1px;color:#FFFFFF;line-height:1.0;margin-bottom:14px;word-break:keep-all;text-transform:uppercase}
  .hook-big.stat{color:${accent};text-shadow:0 6px 24px ${accent}55}
  .hook-line{font-size:22px;line-height:1.3;font-weight:500;color:#C3CAD8;max-width:880px}
  .rule{width:90px;height:8px;background:${accent};margin-top:18px;box-shadow:0 4px 14px ${accent}66}
  .body-text{max-width:980px}
  .body-text p{font-size:26px;line-height:1.32;font-weight:600;color:#E8ECF4}
  .step-body{max-width:1000px}
  .step-body ol{list-style:none;counter-reset:s}
  .step-body li{font-size:22px;line-height:1.28;font-weight:600;color:#E8ECF4;padding-left:56px;position:relative;margin-bottom:14px}
  .step-body li::before{counter-increment:s;content:counter(s);position:absolute;left:0;top:2px;width:36px;height:36px;line-height:36px;text-align:center;border-radius:50%;background:${accent}22;color:${accent};font-weight:900;font-size:20px;border:2px solid ${accent}aa}
  .brief-wrap,.facts-wrap{max-width:1020px}
  .brief-kick{font-size:14px;letter-spacing:4px;margin-bottom:10px}
  .brief-wrap h1{font-size:28px;line-height:1.1;font-weight:900;margin-bottom:16px}
  .facts-list{list-style:none}
  .facts-list li{font-size:19px;line-height:1.32;font-weight:500;color:#E8ECF4;padding-left:28px;position:relative;margin-bottom:10px}
  .facts-list li::before{content:"\\25B8";position:absolute;left:0;top:0;color:${accent};font-size:20px;font-weight:700}
  .cta-box{text-align:center;max-width:900px}
  .cta-box span{display:block;font-size:28px;line-height:1.22;font-weight:900;color:#FFFFFF;text-transform:uppercase;letter-spacing:-1px}
  .cta-actions{display:flex;gap:16px;justify-content:center;margin:18px 0 0}
  .cta-actions .pill{padding:12px 24px;border-radius:999px;font-weight:900;font-size:16px;letter-spacing:1.5px;text-transform:uppercase}
  .cta-actions .pill.save{background:${accent};color:#05070B;box-shadow:0 6px 18px ${accent}55}
  .cta-actions .pill.share{border:2px solid ${accent};color:${accent};background:#05070B}
  .cta-box .cta-swatch{margin:18px auto 0;display:inline-block;padding:10px 20px;border-radius:999px;background:#05070B;border:2px solid ${accent};color:#FFFFFF;font-weight:800;font-size:15px;letter-spacing:1px}
  .bottom{display:flex;align-items:center;justify-content:space-between;font-size:13px;color:#8B93A6;letter-spacing:1px;position:relative;z-index:1}
  .bottom .niche{color:#A9B1C2;font-weight:600}
  .bottom .count span{color:${accent};font-weight:900}
</style></head><body${bodyTag}>
  <div class="motif">${motifSvg}${motifSvg?motifSvg.replace("<svg ","<svg class=\"motif-2\" "):""}</div>
  <div class="top"><div class="brand"><span class="dot"></span>${brand}</div><div class="handle">${esc(handle)}</div></div>
  <div class="stage">${content}</div>
  <div class="bottom"><div class="niche">${esc(post.nicheLabel||"")} • daily tech fixes</div><div class="count">${index} <span>/</span> ${total}</div></div>
</body></html>`;
}

export async function renderPost(post, outDir){
  fs.mkdirSync(outDir,{recursive:true});
  const browser=await firefox.launch({headless:true});
  const ctx=await browser.newContext({viewport:{width:W,height:H},locale:"en-US"});
  const page=await ctx.newPage();
  const media=[];
  try{
    for(let i=0;i<post.slides.length;i++){
      const html=cardHtml(post, post.slides[i], i+1, post.slides.length);
      await page.setContent(html,{waitUntil:"load"});
      await page.waitForTimeout(90);
      const file=path.join(outDir, `${String(i+1).padStart(2,"0")}.png`);
      await page.screenshot({path:file, clip:{x:0,y:0,width:W,height:H}});
      media.push(file);
    }
  } finally { await ctx.close().catch(()=>{}); await browser.close().catch(()=>{}); }
  return media;
}

export async function renderAll(plan){
  const xcfg=config.x||{};
  const postDir=xcfg.postDir||"out/x-ready";
  fs.mkdirSync(postDir,{recursive:true});
  const out=[];
  for(const post of plan.posts){
    const outDir=path.join(postDir, post.id);
    const media=await renderPost(post, outDir);
    out.push({...post, media});
    console.log(`[x-render] ${post.id.padEnd(30)} ${post.format.padEnd(8)} ${media.length} slide(s) ${W}x${H}`);
  }
  const manifest={ date:plan.date, renderedAt:new Date().toISOString(), posts:out, platform:"x" };
  fs.writeFileSync(path.join(postDir,"manifest.json"), JSON.stringify(manifest,null,2));
  return manifest;
}
export default { renderAll, renderPost };

if(process.argv[1] && process.argv[1].replace(/\\/g,"/").endsWith("src/x-render.js")){
  const plan=loadPlan();
  if(!plan){ console.error("No X plan found. Run `node src/x-generator.js` first."); process.exit(1); }
  renderAll(plan).then(()=>console.log("[x-render] done")).catch(e=>{ console.error("[x-render] "+e.message); process.exit(1); });
}
