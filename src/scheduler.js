import fs from "node:fs";
import path from "node:path";
import config from "../config.json" with { type: "json" };
import { curate, fallbackPool } from "./news.js";
import { deepenTopicsPool } from "./article.js";
import { generate, generateReel } from "./generator.js";
import { renderAll, renderDeck } from "./render.js";
import { writeCaptions } from "./captions.js";
import { generateIgPlan, loadPlan } from "./ig-generator.js";
import { renderAll as renderIg } from "./ig-render.js";
import { checkManifest } from "./qa-check.js";
import { generateXPlan, loadPlan as loadXPlan } from "./x-generator.js";
import { renderAll as renderX } from "./x-render.js";
import { checkXManifest } from "./x-qa-check.js";

const TOPICS = path.join("data", "topics.json");
const SCRIPTS = path.join("data", "scripts.json");

export function dailyCount() {
  const start = new Date(config.startedAt || "2026-08-01").getTime();
  const days = Math.floor((Date.now() - start) / 86400000);
  if (days < 7) return config.schedule.ramp.week1;
  if (days < 14) return config.schedule.ramp.week2;
  return config.schedule.ramp.after;
}

async function curateStep() {
  let pool;
  try {
    pool = await curate();
  } catch (e) {
    console.warn("[curate] live fetch failed: " + e.message);
    pool = [];
  }
  if (!pool.some((g) => (g.items || []).length > 0)) {
    pool = fallbackPool();
    console.warn("[curate] used fallback topic pool");
  }
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(TOPICS, JSON.stringify(pool, null, 2));
  const total = pool.reduce((a, g) => a + (g.items || []).length, 0);
  console.log("[curate] wrote " + total + " topics");
  // Best-effort: pull real article text for stories whose RSS snippet is thin
  // so cards always have genuine substance. Fails soft — we never block on it.
  try {
    const r = await deepenTopicsPool(pool, { max: 8 });
    fs.writeFileSync(TOPICS, JSON.stringify(pool, null, 2));
    console.log("[curate] deepened " + r.deepened + " thin story(s)");
  } catch (e) {
    console.warn("[curate] deepen pass failed (ignored): " + e.message);
  }
}

function generateStep() {
  const decks = generate(dailyCount());
  console.log("[generate] built " + decks.length + " scripts");
}

async function renderStep() {
  if (!fs.existsSync(SCRIPTS)) { console.warn("[render] no scripts.json, run generate first"); return; }
  const decks = JSON.parse(fs.readFileSync(SCRIPTS, "utf8"));
  fs.mkdirSync("out/tiktok-ready", { recursive: true });
  const results = await renderAll(decks, "out/tiktok-ready");
  const ok = results.filter((r) => r.ok);
  const captioned = writeCaptions(decks, "out/tiktok-ready", "out/tiktok-ready");
  console.log("[render] " + ok.length + "/" + results.length + " rendered into out/tiktok-ready (" + captioned + " captions)");
}

function igPlanStep() {
  const plan = generateIgPlan();
  console.log("[ig-plan] built " + plan.posts.length + " posts for " + plan.date);
  return plan;
}

async function igRenderStep() {
  const plan = loadPlan();
  if (!plan) { console.warn("[ig-render] no instagram plan, run igplan first"); return; }
  await renderIg(plan);
  const qa = checkManifest();
  if (qa.ok) console.log("[ig-render] QA PASS — " + qa.posts + " post(s) clean for " + qa.date);
  else {
    console.warn("[ig-render] QA PROBLEMS (" + qa.errors.length + "):");
    for (const e of qa.errors) console.warn("   • " + e);
  }
}

function xPlanStep() {
  const plan = generateXPlan();
  console.log("[x-plan] built " + plan.posts.length + " posts for " + plan.date + " (X, "+plan.posts.map(p=>p.caption.length).join("/")+" chars)");
  return plan;
}
async function xRenderStep() {
  const plan = loadXPlan();
  if (!plan) { console.warn("[x-render] no X plan, run xplan first"); return; }
  await renderX(plan);
  const qa = checkXManifest();
  if (qa.ok) console.log("[x-render] X QA PASS — " + qa.posts + " post(s) clean for " + qa.date);
  else {
    console.warn("[x-render] X QA PROBLEMS (" + qa.errors.length + "):");
    for (const e of qa.errors) console.warn("   • " + e);
  }
}

async function reelStep() {
  const dir = path.join("out", "instagram-reels");
  fs.mkdirSync(dir, { recursive: true });
  let script;
  try {
    script = generateReel();
  } catch (e) {
    console.warn("[reel] generate failed: " + e.message);
    return;
  }
  if (!script || !script.deck) { console.warn("[reel] no deck to render"); return; }
  const out = path.join(dir, `${script.date}-${script.deck.id}.mp4`);
  if (!fs.existsSync(out)) {
    try {
      await renderDeck(script.deck, out);
      console.log("[reel] rendered " + path.basename(out));
    } catch (e) {
      console.warn("[reel] render failed (non-blocking): " + e.message);
      try { fs.writeFileSync(out + ".failed", String(e.message).slice(0,500)); } catch {}
      return;
    }
  } else {
    console.log("[reel] already rendered " + path.basename(out));
  }
  try {
    fs.writeFileSync(path.join(dir, `${script.date}-${script.deck.id}.txt`), script.caption, "utf8");
    console.log("[reel] caption ready: " + path.basename(out).replace(/\.mp4$/, ".txt"));
  } catch (e) {
    console.warn("[reel] caption write failed: " + e.message);
  }
}

async function daily() {
  await curateStep();
  generateStep();
  await reelStep();
  await renderStep();
  if (config.instagram?.enabled !== false) {
    igPlanStep();
    await igRenderStep();
  }
  if (config.x?.enabled !== false) {
    xPlanStep();
    await xRenderStep();
  }
  // TikTok headless: same curation, 9:16 vertical videos already rendered above.
  if (config.tiktokBot?.enabled !== false || (config.distribution && config.distribution.tiktok > 0)) {
    try {
      const n = fs.readdirSync("out/tiktok-ready").filter((f) => f.endsWith(".mp4")).length;
      console.log(`[daily] TikTok ready: ${n} video(s) in out/tiktok-ready`);
    } catch {}
  }
  if (config.x?.enabled !== false) {
    try {
      const n = fs.readdirSync(path.join(config.x.postDir||"out/x-ready")).filter(f=>{try{return fs.statSync(path.join(config.x.postDir||"out/x-ready",f)).isDirectory();}catch{return false;}}).length;
      console.log(`[daily] X ready: ${n} post(s) in ${config.x.postDir||"out/x-ready"}`);
    } catch {}
  }
  console.log("\nDaily run complete.");
}

const cmd = process.argv[2];
if (cmd === "curate") curateStep();
else if (cmd === "generate") generateStep();
else if (cmd === "render") renderStep();
else if (cmd === "igplan") igPlanStep();
else if (cmd === "igrender") igRenderStep();
else if (cmd === "xplan") xPlanStep();
else if (cmd === "xrender") xRenderStep();
else if (cmd === "reel") reelStep();
else if (cmd === "captions") {
  if (!fs.existsSync(SCRIPTS)) { console.warn("[captions] no scripts.json, run generate first"); }
  else {
    const decks = JSON.parse(fs.readFileSync(SCRIPTS, "utf8"));
    const n = writeCaptions(decks, "out/tiktok-ready", "out/tiktok-ready");
    console.log("[captions] wrote " + n + " caption files");
  }
}
else daily();

export default { daily, curateStep, generateStep, renderStep, xPlanStep, xRenderStep, dailyCount };