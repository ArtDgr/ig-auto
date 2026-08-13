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

function cardHtml(post, slide, index, total) {
  const accent = post.accent || config.accentColor || "#0E9384";
  const brand = (config.brand || "IT STUDIO").toUpperCase();
  const handle = config.instagram.handle;
  const kind = slide.kind;
  const text = esc(slide.text);

  const content =
    kind === "title"
      ? `<div class="title-wrap"><div class="kicker">${esc(post.nicheLabel || "")}</div><h1>${text}</h1><div class="rule"></div></div>`
      : kind === "cta"
        ? `<div class="cta-box"><span>${text}</span><div class="cta-swatch">${esc(handle)}</div></div>`
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
  body {
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    color: #0F172A;
    background:
      radial-gradient(1100px 760px at 88% -12%, ${accent}1f, transparent 62%),
      radial-gradient(900px 620px at -12% 112%, ${accent}12, transparent 60%),
      linear-gradient(160deg, #FFFFFF 0%, #F4F8FF 55%, #EBF3FF 100%);
    display: flex; flex-direction: column;
    padding: 64px 72px 56px;
  }
  .top { display: flex; align-items: center; justify-content: space-between; font-size: 30px; letter-spacing: 3px; color: #64748B; }
  .top .dot { display: inline-block; width: 20px; height: 20px; border-radius: 50%; background: ${accent}; margin-right: 18px; box-shadow: 0 0 0 6px ${accent}22; }
  .top .brand { display: flex; align-items: center; font-weight: 800; color: #0F172A; }
  .top .handle { font-size: 27px; letter-spacing: 1px; color: #475569; }
  .stage { flex: 1; display: flex; align-items: center; justify-content: center; padding: 40px 8px 24px; }
  .title-wrap { text-align: left; max-width: 900px; }
  .kicker { font-size: 32px; letter-spacing: 6px; color: ${accent}; text-transform: uppercase; font-weight: 800; margin-bottom: 26px; }
  h1 { font-size: 86px; line-height: 1.06; font-weight: 800; letter-spacing: 0.5px; color: #0F172A; }
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
  .cta-box .cta-swatch {
    margin: 40px auto 0; display: inline-block; padding: 22px 44px;
    border-radius: 999px; background: linear-gradient(120deg, ${accent}, ${accent}cc);
    color: #FFFFFF; font-weight: 800; font-size: 34px; letter-spacing: 1px;
    box-shadow: 0 10px 26px ${accent}44;
  }
  .bottom { display: flex; align-items: center; justify-content: space-between; font-size: 26px; color: #64748B; letter-spacing: 1px; }
  .bottom .niche { color: #475569; }
  .bottom .count span { color: ${accent}; font-weight: 800; }
</style></head><body>
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