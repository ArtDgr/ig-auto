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

// Per-niche background themes: each subject matter gets its own light, high-
// contrast backdrop + a faint motif, so posts read as belonging to their topic.
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
  const theme = NICHE_THEMES[post.niche] || {};
  const accent = theme.accent || post.accent || config.accentColor || "#0E9384";
  const bodyTag = theme.cls ? ` class="${theme.cls}"` : "";
  const bodySel = theme.cls ? `body.${theme.cls}` : "body";
  const bg = theme.bg || `radial-gradient(1100px 760px at 88% -12%, ${accent}1f, transparent 62%),
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
  .hook-big.stat { color: ${accent}; }
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
  <div class="motif"></div>
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