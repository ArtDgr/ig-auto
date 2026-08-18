import fs from "node:fs";
import path from "node:path";
import { firefox } from "playwright";
import config from "../config.json" with { type: "json" };
import { loadPlan } from "./ig-generator.js";

const W = 1080;
const H = 1350;

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Topic-matched background themes. A post's headline drives the backdrop: the
// keyword that matches the story chooses a subject motif (chip, phone, shield…)
// plus its accent. Falls back to the niche theme when nothing matches.
const svgWrap = (accent, inner) =>
  `<svg viewBox="0 0 200 200" fill="none" stroke="${accent}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const TOPIC_THEMES = [
  {
    re: /(breach|hack|ransomware|malware|phishing|vulnerab|zero.day|exploit|password|2fa|patch|attack|steal)/i,
    accent: "#DC2626",
    svg: (a) => svgWrap(a, `<path d="M100 24 L162 50 V95 C162 136 138 166 100 180 C62 166 38 136 38 95 V50 Z"/><rect x="82" y="86" width="36" height="26" rx="5"/><path d="M90 86 V74 a10 10 0 0 1 20 0 V86"/>`)
  },
  {
    re: /(\bai\b|gpt|llm|model|agent|neural|openai|anthropic|gemini|copilot|intelligence|machine.learning|bot)/i,
    accent: "#6366F1",
    svg: (a) => svgWrap(a, `<circle cx="55" cy="55" r="13"/><circle cx="145" cy="42" r="13"/><circle cx="150" cy="152" r="13"/><circle cx="50" cy="146" r="13"/><circle cx="100" cy="100" r="16"/><path d="M67 62 L88 92 M133 50 L112 90 M140 140 L112 110 M62 134 L88 111 M100 84 V84"/>`)
  },
    {
    re: /(battery|charging|charge|usb.c|power|mah|fast.charge)/i,
    accent: "#16A34A",
    svg: (a) => svgWrap(a, `<rect x="45" y="70" width="105" height="60" rx="10"/><rect x="150" y="86" width="14" height="28" rx="5"/><path d="M84 78 L68 100 H88 L76 122"/>`)
  },
  {
    re: /(wifi|router|signal|mesh|network)/i,
    accent: "#0EA5E9",
    svg: (a) => svgWrap(a, `<path d="M52 112 a48 48 0 0 1 96 0"/><path d="M67 96 a33 33 0 0 1 66 0"/><path d="M82 80 a18 18 0 0 1 36 0"/><circle cx="100" cy="128" r="8"/>`)
  },
  {
    re: /(camera|photo|lens|sensor|image)/i,
    accent: "#7C3AED",
    svg: (a) => svgWrap(a, `<rect x="42" y="58" width="116" height="84" rx="16"/><circle cx="100" cy="100" r="26"/><circle cx="100" cy="100" r="11"/><rect x="64" y="58" width="30" height="14" rx="5"/><path d="M128 70 v-8"/>`)
  },
  {
    re: /(cpu|gpu|chip|processor|ryzen|intel|amd|nvidia|rtx|ssd|ram|benchmark|core|silicon|semiconductor)/i,
    accent: "#0D9488",
    svg: (a) => svgWrap(a, `<rect x="60" y="60" width="80" height="80" rx="10"/><path d="M78 60 V34 M100 60 V34 M122 60 V34 M78 140 V166 M100 140 V166 M122 140 V166 M60 78 H34 M60 100 H34 M60 122 H34 M140 78 H166 M140 100 H166 M140 122 H166"/><rect x="80" y="80" width="40" height="40" rx="5"/>`)
  },
  {
    re: /(cloud|server|data.center|datacenter|kubernetes|docker|container|aws|azure|storage|infra|uptime|devops|sre)/i,
    accent: "#2563EB",
    svg: (a) => svgWrap(a, `<ellipse cx="105" cy="135" rx="72" ry="24"/><circle cx="78" cy="112" r="24"/><circle cx="118" cy="100" r="29"/><circle cx="150" cy="120" r="18"/><path d="M45 168 h110"/>`)
  },
  {
    re: /(habit|routine|ops|checklist|daily|tip|how.to|guide|setup|tutorial|reset|fix|cleanup|sanity)/i,
    accent: "#059669",
    svg: (a) => svgWrap(a, `<rect x="45" y="55" width="110" height="95" rx="8"/><path d="M62 78 L72 88 L90 68"/><rect x="100" y="72" width="38" height="9" rx="4.5"/><path d="M62 108 L72 118 L90 98"/><rect x="100" y="102" width="38" height="9" rx="4.5"/><path d="M62 128 L72 138 L90 118"/><rect x="100" y="126" width="38" height="9" rx="4.5"/>`)
  },
  {
    re: /(deal|freebie|discount|sale|coupon|free|app.of.the.day|giveaway)/i,
    accent: "#EA6A12",
    svg: (a) => svgWrap(a, `<path d="M50 42 H158 L164 98 L102 168 L40 106 Z"/><circle cx="136" cy="74" r="9"/>`)
  },
  {
    re: /(keyboard|typing|shortcut|keys|touchpad)/i,
    accent: "#475569",
    svg: (a) => svgWrap(a, `<rect x="30" y="85" width="140" height="55" rx="8"/><path d="M50 100 h18 M78 100 h18 M106 100 h18 M134 100 h12 M50 120 h18 M78 120 h18 M106 120 h18 M134 120 h12"/>`)
  },
  {
    re: /(apple|mac|macos|ios|ipad|app.store|siri|macbook|apple.silicon)/i,
    accent: "#0EA5E9",
    svg: (a) => svgWrap(a, `<circle cx="86" cy="106" r="30"/><circle cx="114" cy="106" r="30"/><path d="M86 76 A34 34 0 0 1 114 76"/><path d="M100 46 v20"/><path d="M100 46 q12 -4 22 -12"/>`)
  },
  {
    re: /(chrome|browser|bookmark|chromebook|chromeos|windows|monitor|desktop|laptop|display|screen)/i,
    accent: "#0284C7",
    svg: (a) => svgWrap(a, `<rect x="45" y="35" width="110" height="70" rx="6"/><rect x="52" y="42" width="96" height="56" rx="3"/><path d="M100 105 V120 M82 120 h36"/><circle cx="132" cy="52" r="3"/>`)
  },
  {
    re: /(phone|pixel|galaxy|iphone|android|samsung|redmi|honor|fold|smartphone|tablet|watch|wearable|gadget)/i,
    accent: "#F59E0B",
    svg: (a) => svgWrap(a, `<rect x="62" y="28" width="76" height="144" rx="18"/><circle cx="100" cy="46" r="5"/><path d="M84 118 l12 12 22 -26"/><path d="M88 158 h24"/>`)
  }
];

// Per-niche fallback background themes (used when the headline matches nothing).
const NICHE_THEMES = {
  ai: {
    cls: "theme-ai",
    bg: `radial-gradient(1000px 700px at 85% -10%, rgba(99,102,241,.20), transparent 62%),
      radial-gradient(820px 620px at -12% 112%, rgba(168,85,247,.16), transparent 60%),
      linear-gradient(160deg, #FFFFFF 0%, #F4F2FF 55%, #E9E4FF 100%)`,
    accent: "#6366F1"
  },
  gadgets: {
    cls: "theme-gadgets",
    bg: `radial-gradient(1000px 700px at 85% -10%, rgba(245,158,11,.22), transparent 62%),
      radial-gradient(820px 620px at -12% 112%, rgba(239,68,68,.12), transparent 60%),
      linear-gradient(160deg, #FFFFFF 0%, #FFF8E7 55%, #FFEDD2 100%)`,
    accent: "#EA6A12"
  },
  apple: {
    cls: "theme-apple",
    bg: `radial-gradient(1000px 700px at 85% -10%, rgba(14,165,233,.18), transparent 62%),
      radial-gradient(820px 620px at -12% 112%, rgba(56,189,248,.14), transparent 60%),
      linear-gradient(160deg, #FFFFFF 0%, #F0F9FF 55%, #DFF2FE 100%)`,
    accent: "#0284C7"
  },
  hardware: {
    cls: "theme-hardware",
    bg: `radial-gradient(1000px 700px at 85% -10%, rgba(20,184,166,.22), transparent 62%),
      radial-gradient(820px 620px at -12% 112%, rgba(13,148,136,.14), transparent 60%),
      linear-gradient(160deg, #FFFFFF 0%, #F0FDFA 55%, #C9F4EC 100%)`,
    accent: "#0D9488"
  },
  security: {
    cls: "theme-security",
    bg: `radial-gradient(1000px 700px at 85% -10%, rgba(239,68,68,.16), transparent 62%),
      radial-gradient(820px 620px at -12% 112%, rgba(100,116,139,.18), transparent 60%),
      linear-gradient(160deg, #FFFFFF 0%, #FEF2F2 55%, #FDE2E2 100%)`,
    accent: "#DC2626"
  },
  "it-support": {
    cls: "theme-itsupport",
    bg: `radial-gradient(1000px 700px at 85% -10%, rgba(16,185,129,.20), transparent 62%),
      radial-gradient(820px 620px at -12% 112%, rgba(14,165,233,.12), transparent 60%),
      linear-gradient(160deg, #FFFFFF 0%, #ECFDF5 55%, #D1FAE5 100%)`,
    accent: "#059669"
  },
  "cloud-devops": {
    cls: "theme-cloud",
    bg: `radial-gradient(1000px 700px at 85% -10%, rgba(14,165,233,.18), transparent 62%),
      radial-gradient(820px 620px at -12% 112%, rgba(59,130,246,.14), transparent 60%),
      linear-gradient(160deg, #FFFFFF 0%, #EFF6FF 55%, #DBEAFE 100%)`,
    accent: "#2563EB"
  }
};

export function cardHtml(post, slide, index, total) {
  const hayTitle = `${post.title || ""} ${post.subtitle || ""} ${post.slideText || ""}`;
  const hayNiche = `${post.niche || ""} ${post.nicheLabel || ""}`;
  const topic = TOPIC_THEMES.find((t) => t.re.test(hayTitle)) || TOPIC_THEMES.find((t) => t.re.test(hayNiche));
  const theme = NICHE_THEMES[post.niche] || {};
  const accent = (topic && topic.accent) || theme.accent || post.accent || config.accentColor || "#0E9384";
  const bodyTag = theme.cls ? ` class="${theme.cls}"` : "";
  const bodySel = theme.cls ? `body.${theme.cls}` : "body";
  const motifSvg = topic ? topic.svg(accent) : "";
  const bg = topic
    ? `radial-gradient(1000px 700px at 85% -10%, ${accent}2e, transparent 62%),
      radial-gradient(820px 620px at -12% 112%, ${accent}1c, transparent 60%),
      linear-gradient(160deg, #FFFFFF 0%, #F6F9FF 55%, #ECF3FF 100%)`
    : theme.bg || `radial-gradient(1100px 760px at 88% -12%, ${accent}1f, transparent 62%),
      radial-gradient(900px 620px at -12% 112%, ${accent}12, transparent 60%),
      linear-gradient(160deg, #FFFFFF 0%, #F4F8FF 55%, #EBF3FF 100%)`;
  const brand = (config.brand || "IT STUDIO").toUpperCase();
  const handle = config.instagram.handle;
  const kind = slide.kind;
  const text = esc(slide.text);

  const content =
    kind === "hook"
      ? (() => {
          const parts = text.split("\n").filter((s) => s.trim());
          const [big = "", ...rest] = parts;
          const line = rest.join(" ").trim();
          const stat = /^[\$0-9][\d.,kKmMbB%]*$/.test(big.trim());
          const len = big.trim().length;
          const fs = Math.max(64, Math.min(150, Math.floor(920 / Math.max(1, len * 0.56))));
          return `<div class="hook-wrap"><div class="kicker">${esc(post.nicheLabel || "")}</div><div class="hook-big${stat ? " stat" : ""}" style="font-size:${fs}px">${esc(big)}</div>${line ? `<div class="hook-line">${esc(line)}</div>` : ""}<div class="rule"></div></div>`;
        })()
      : kind === "title"
        ? `<div class="title-wrap"><div class="kicker">${esc(post.nicheLabel || "")}</div><h1>${text}</h1><div class="rule"></div></div>`
        : kind === "cta"
          ? `<div class="cta-box"><span>${text}</span><div class="cta-actions"><span class="pill save">SAVE THIS</span><span class="pill share">SHARE IT</span></div><div class="cta-swatch">${esc(handle)}</div></div>`
          : kind === "brief"
          ? (() => {
              const parts = text.split("\n").map((s) => s.trim()).filter(Boolean);
              const [head = text, ...rest] = parts;
              return `<div class="brief-wrap"><div class="kicker brief-kick">KEY DETAILS</div><h1>${esc(head)}</h1><ul class="facts-list">${rest.map((s) => `<li>${esc(s)}</li>`).join("")}</ul></div>`;
            })()
          : kind === "facts"
            ? `<div class="facts-wrap"><ul class="facts-list">${text
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s) => `<li>${esc(s)}</li>`)
                .join("")}</ul></div>`
            : kind === "step"
              ? `<div class="step-body"><ol>${text
                  .split("\n")
                  .filter(Boolean)
                  .map((s) => `<li>${esc(s.trim())}</li>`)
                  .join("")}</ol></div>`
              : `<div class="body-text"><p>${text}</p></div>`;

  return `<!doctype html><html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${W}px; height: ${H}px; background: #FFFFFF; overflow: hidden; }
  ${bodySel} {
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    color: #0F172A;
    background: ${bg};
    display: flex; flex-direction: column;
    padding: 64px 72px 56px;
    position: relative;
  }
  .motif { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
  .motif svg { position: absolute; right: -40px; top: 50%; transform: translateY(-50%); width: 780px; height: 780px; opacity: .30; filter: drop-shadow(0 12px 30px ${accent}22); }
  .motif svg.motif-2 { right: auto; left: -120px; bottom: -140px; top: auto; width: 500px; height: 500px; opacity: .20; filter: drop-shadow(0 10px 24px ${accent}1a); }
  .motif::before, .motif::after { content: ""; position: absolute; border-radius: 50%; }
  .motif::before { width: 560px; height: 560px; right: -200px; top: -190px; border: 88px solid ${accent}0d; }
  .motif::after { width: 460px; height: 460px; left: -190px; bottom: -150px; border: 64px solid ${accent}0a; }
  .theme-ai .motif::before { width: 620px; height: 620px; border: 6px dashed rgba(99,102,241,.10); }
  .theme-ai .motif::after { width: 380px; height: 380px; background: repeating-radial-gradient(circle at 50% 50%, transparent 0 26px, rgba(99,102,241,.06) 26px 27px); border: none; }
  .theme-gadgets .motif::before { width: 520px; height: 520px; border: 7px dotted rgba(245,158,11,.18); }
  .theme-gadgets .motif::after { width: 420px; height: 420px; border: 90px solid rgba(239,68,68,.05); }
  .theme-apple .motif::before { width: 560px; height: 560px; border: 10px solid rgba(14,165,233,.07); box-shadow: inset 0 0 0 40px rgba(56,189,248,.04); }
  .theme-apple .motif::after { width: 300px; height: 300px; background: radial-gradient(circle, rgba(14,165,233,.10), transparent 65%); border: none; }
  .theme-hardware .motif::before { width: 520px; height: 520px; border: 3px dashed rgba(20,184,166,.22); }
  .theme-hardware .motif::after { width: 400px; height: 400px; background: repeating-linear-gradient(45deg, transparent 0 22px, rgba(13,148,136,.05) 22px 23px); border: none; }
  .theme-security .motif::before { width: 540px; height: 540px; border: 12px solid rgba(239,68,68,.06); }
  .theme-security .motif::after { width: 420px; height: 420px; background: repeating-linear-gradient(-45deg, transparent 0 24px, rgba(100,116,139,.06) 24px 25px); border: none; }
  .theme-itsupport .motif::before { width: 560px; height: 560px; border: 8px solid rgba(16,185,129,.10); }
  .theme-itsupport .motif::after { width: 380px; height: 380px; background: repeating-radial-gradient(circle at 50% 50%, transparent 0 30px, rgba(16,185,129,.07) 30px 31px); border: none; }
  .theme-cloud .motif::before { width: 640px; height: 640px; border: 14px dotted rgba(14,165,233,.10); }
  .theme-cloud .motif::after { width: 460px; height: 460px; background: radial-gradient(circle at 70% 30%, rgba(59,130,246,.06), transparent 60%); border: none; }
  .top { display: flex; align-items: center; justify-content: space-between; font-size: 30px; letter-spacing: 3px; color: #64748B; position: relative; z-index: 1; }
  .top .dot { display: inline-block; width: 20px; height: 20px; border-radius: 50%; background: ${accent}; margin-right: 18px; box-shadow: 0 0 0 6px ${accent}22; }
  .top .brand { display: flex; align-items: center; font-weight: 800; color: #0F172A; }
  .top .handle { font-size: 27px; letter-spacing: 1px; color: #475569; }
  .stage { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 8px 24px; position: relative; z-index: 1; }
  .title-wrap { text-align: left; max-width: 900px; }
  .kicker { font-size: 32px; letter-spacing: 6px; color: ${accent}; text-transform: uppercase; font-weight: 800; margin-bottom: 26px; }
  h1 { font-size: 86px; line-height: 1.06; font-weight: 800; letter-spacing: 0.5px; color: #0F172A; }
  .hook-wrap { text-align: left; max-width: 920px; }
  .hook-big { font-weight: 800; letter-spacing: 0.5px; color: #0F172A; line-height: 1.02; margin-bottom: 34px; word-break: keep-all; }
  .hook-big.stat { color: ${accent}; text-shadow: 0 10px 40px ${accent}44; }
  .hook-big.gradient {
    background: linear-gradient(120deg, ${accent} 0%, ${accent}cc 48%, #0F172A 105%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
    filter: drop-shadow(0 8px 24px ${accent}33);
  }
  .hook-line { font-size: 44px; line-height: 1.32; font-weight: 500; color: #475569; max-width: 880px; }
  .rule { width: 120px; height: 10px; border-radius: 6px; background: ${accent}; margin-top: 44px; box-shadow: 0 4px 18px ${accent}55; }
  .body-text { max-width: 900px; }
  .body-text p { font-size: 54px; line-height: 1.34; font-weight: 400; color: #1E293B; }
  .step-body { max-width: 930px; }
  .step-body ol { list-style: none; counter-reset: s; }
  .step-body li {
    font-size: 50px; line-height: 1.3; font-weight: 400; color: #1E293B;
    padding-left: 96px; position: relative; margin-bottom: 46px;
  }
  .step-body li::before {
    counter-increment: s; content: counter(s);
    position: absolute; left: 0; top: 6px;
    width: 64px; height: 64px; line-height: 64px; text-align: center;
    border-radius: 50%; background: ${accent}1a; color: ${accent};
    font-weight: 800; font-size: 40px; border: 2px solid ${accent}66;
  }
  .brief-wrap, .facts-wrap { max-width: 950px; }
  .brief-kick { font-size: 26px; letter-spacing: 4px; margin-bottom: 22px; }
  .brief-wrap h1 { font-size: 60px; line-height: 1.12; font-weight: 800; margin-bottom: 38px; color: #0F172A; }
  .facts-list { list-style: none; }
  .facts-list li {
    font-size: 42px; line-height: 1.34; font-weight: 400; color: #1E293B;
    padding-left: 52px; position: relative; margin-bottom: 32px;
  }
  .facts-list li::before {
    content: "\\25B8"; position: absolute; left: 0; top: 0;
    color: ${accent}; font-size: 44px; font-weight: 700;
  }
  .cta-box { text-align: center; max-width: 880px; }
  .cta-box span { display: block; font-size: 58px; line-height: 1.25; font-weight: 800; color: #0F172A; }
  .cta-actions { display: flex; gap: 26px; justify-content: center; margin: 46px 0 0; }
  .cta-actions .pill {
    padding: 22px 44px; border-radius: 999px; font-weight: 800; font-size: 32px; letter-spacing: 1px;
  }
  .cta-actions .pill.save { background: linear-gradient(120deg, ${accent}, ${accent}cc); color: #FFFFFF; box-shadow: 0 10px 26px ${accent}44; }
  .cta-actions .pill.share { border: 3px solid ${accent}; color: ${accent}; background: #FFFFFF; }
  .cta-box .cta-swatch {
    margin: 40px auto 0; display: inline-block; padding: 20px 40px;
    border-radius: 999px; background: #0F172A;
    color: #FFFFFF; font-weight: 800; font-size: 32px; letter-spacing: 1px;
  }
  .bottom { display: flex; align-items: center; justify-content: space-between; font-size: 26px; color: #64748B; letter-spacing: 1px; position: relative; z-index: 1; }
  .bottom .niche { color: #475569; }
  .bottom .count span { color: ${accent}; font-weight: 800; }
</style></head><body${bodyTag}>
  <div class="motif">${motifSvg}${motifSvg ? motifSvg.replace("<svg ", "<svg class=\"motif-2\" ") : ""}</div>
  <div class="top">
    <div class="brand"><span class="dot"></span>${brand}</div>
    <div class="handle">${esc(handle)}</div>
  </div>
  <div class="stage">${content}</div>
  <div class="bottom">
    <div class="niche">${esc(post.nicheLabel || "")} • daily tech fixes</div>
    <div class="count">${index} <span>/</span> ${total}</div>
  </div>
</body></html>`;
}

export async function renderPost(post, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await firefox.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, locale: "en-US" });
  const page = await ctx.newPage();
  const media = [];
  try {
    for (let i = 0; i < post.slides.length; i++) {
      const html = cardHtml(post, post.slides[i], i + 1, post.slides.length);
      await page.setContent(html, { waitUntil: "load" });
      await page.waitForTimeout(120);
      const file = path.join(outDir, `${String(i + 1).padStart(2, "0")}.png`);
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: W, height: H } });
      media.push(file);
    }
  } finally {
    await ctx.close().catch(() => {});
    await browser.close().catch(() => {});
  }
  return media;
}

export async function renderAll(plan) {
  const ig = config.instagram;
  const postDir = ig.postDir;
  fs.mkdirSync(postDir, { recursive: true });
  const out = [];
  for (const post of plan.posts) {
    const outDir = path.join(postDir, post.id);
    const media = await renderPost(post, outDir);
    out.push({ ...post, media });
    console.log(`[ig-render] ${post.id.padEnd(30)} ${post.format.padEnd(8)} ${media.length} slide(s)`);
  }
  const manifest = { date: plan.date, renderedAt: new Date().toISOString(), posts: out };
  fs.writeFileSync(path.join(postDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

export default { renderAll, renderPost };

// Direct run: `node src/ig-render.js`
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("src/ig-render.js")) {
  const plan = loadPlan();
  if (!plan) {
    console.error("No plan found. Run `node src/ig-generator.js` first.");
    process.exit(1);
  }
  renderAll(plan)
    .then(() => console.log("[ig-render] done"))
    .catch((e) => {
      console.error("[ig-render] " + e.message);
      process.exit(1);
    });
}