import fs from "node:fs";
import path from "node:path";
import config from "../config.json" with { type: "json" };
import { isRetailPromo } from "./unbiased.js";

const DATA = path.join("data", "topics.json");
const OUT = path.join("data", "scripts.json");

const CTA = `Follow ${config.brand} for daily tech intel.`;

function niceness(s) {
  return String(s).replace(/\s+/g, " ").trim();
}

function shorten(s, n) {
  const v = niceness(s);
  return v.length <= n ? v : v.slice(0, n - 1).trimEnd() + "…";
}

function slug(s) {
  return (
    String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "topic"
  );
}

function buildDeck(topic, index) {
  const raw = niceness(topic.title || topic);
  const sentences = String(topic.snippet || raw)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const longForm = sentences.length >= 3 ? sentences : null;
  const nicheTag = String(topic.nicheId || "tech").replace(/\s+/g, "").toLowerCase();

  const hook = `${config.brand}: ${shorten(raw, 46)}`;

  const bodyPoints = longForm
    ? longForm.map((s) => shorten(s, 88)).filter((s) => !isRetailPromo(s))
    : [
        shorten(`Here's why people can't stop talking about: ${raw}`, 88),
        shorten(`One quick breakdown, no fluff — ${raw}.`, 80),
        shorten(`The single takeaway from the ${topic.nicheId || "tech"} world today.`, 88)
      ];

  const slides = [{ text: hook, kind: "hook" }];
  bodyPoints.forEach((b) => slides.push({ text: b, kind: "body" }));
  slides.push({ text: CTA, kind: "cta" });

  return {
    id: slug(raw),
    niche: topic.nicheId || "",
    href: topic.link || "",
    title: shorten(raw, 70),
    description: `Automated ${config.brand} short on ${raw}. #shorts #tech #${nicheTag}`,
    slides
  };
}

export function loadTopics() {
  if (fs.existsSync(DATA)) return JSON.parse(fs.readFileSync(DATA, "utf8"));
  return [];
}

function pickSpread(items, count) {
  const groups = new Map();
  items.forEach((it) => {
    if (!groups.has(it.nicheId)) groups.set(it.nicheId, []);
    groups.get(it.nicheId).push(it);
  });
  const keys = [...groups.keys()];
  const out = [];
  let gi = 0;
  for (let i = 0; i < count; i++) {
    if (!keys.length) break;
    const k = keys[gi % keys.length];
    const g = groups.get(k);
    if (!g || !g.length) {
      keys.splice(keys.indexOf(k), 1);
      continue;
    }
    const idx = Math.floor(Math.random() * g.length);
    out.push(g.splice(idx, 1)[0]);
    if (!g.length) keys.splice(keys.indexOf(k), 1);
    gi++;
  }
  return out;
}

export function generate(count) {
  const data = loadTopics();
  if (!Array.isArray(data)) return [];
  const flat = data.flatMap((g) =>
    (g.items || []).map((it) => ({ ...it, nicheId: g.nicheId }))
  );
  if (!flat.length) return [];
  const decks = pickSpread(flat, count).map((t, i) => buildDeck(t, i + 1));
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(decks, null, 2));
  return decks;
}

// ---- daily Instagram Reel ---------------------------------------------------

const BLEED_KEYS = [
  "ai", "gpt", "model", "agent", "neural", "quantum", "chip", "robot",
  "fusion", "gpu", "llm", "transformer", "breakthrough", "unveil", "opens",
  "openai", "anthropic", "nvidia", "robotics", "deepmind", "gemini",
  "compute", "satellite", "6g", "bionic", "biotech", "framework", "runtime",
  "microsoft", "google", "apple", "iphone", "macbook", "m-series", "laptop",
  "galaxy", "pixel", "fold", "smartphone", "npu", "tpu", "ai pc", "copilot",
  "soc", "battery", "display", "tablet", "smartwatch", "ssd", "concept",
  "teardown", "leak", "launches", "gadget", "wearable", "router"
];

export function pickReelTopic(flat) {
  if (!flat.length) return null;
  const score = (t) => {
    const s = (t.title + " " + (t.snippet || "") + " " + (t.nicheId || "")).toLowerCase();
    let sc = 0;
    for (const k of BLEED_KEYS) if (s.includes(k)) sc += 5;
    sc += ({ ai: 4, gadgets: 2, security: 1, "cloud-devops": 1, "it-support": 0 }[t.nicheId] || 0);
    if (t.pubDate) {
      const days = (new Date() - new Date(t.pubDate)) / 86400000;
      sc += Math.max(0, 3 - days);
    } else {
      sc += 2;
    }
    return sc;
  };
  return [...flat].sort((a, b) => score(b) - score(a))[0];
}

// TikTok-style reel hook: lead with a bold stat when the story has one,
// otherwise a short keyword-rich punch. The full real headline rides as the
// second slide so the story is never filler copy. Stat tokens keep their unit
// ("$32 billion", not "$32").
const REEL_STAT_RE = /(\$[\d][\d,]*(?:\.\d+)?(?:\s*(?:million|billion|trillion))?|\b\d[\d,]{2,}(?:\.\d+)?%?|\b\d+\s+(?:million|billion|trillion)\b)/i;

function makeReelHook(topic) {
  const raw = niceness(topic.title || topic);
  const m = REEL_STAT_RE.exec(`${topic.snippet || ""} ${raw}`);
  if (m) return { big: m[0].trim(), line: shorten(raw, 44) };
  return { big: shorten(raw, 44), line: null };
}

function buildReelDeck(topic) {
  const raw = niceness(topic.title || topic);
  const sentences = String(topic.snippet || raw)
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const longForm = sentences.length >= 3 ? sentences : null;
  const handle = (config.instagram && config.instagram.handle) || "@theitsupportguru";
  const hk = makeReelHook(topic);
  const bodyPoints = longForm
    ? longForm.map((s) => shorten(s, 88)).filter((s) => !isRetailPromo(s)).slice(0, 3)
    : [
        `The short version: ${shorten(raw, 78)}.`,
        "Why it matters: this sits right at the frontier of bleeding-edge tech.",
        "What to watch: how the AI and hardware giants respond over the next week."
      ];
  const slides = [{ text: hk.big, kind: "hook" }];
  if (hk.line) slides.push({ text: hk.line, kind: "body" });
  bodyPoints.forEach((b) => slides.push({ text: b, kind: "body" }));
  slides.push({ text: `Save this. Share it. Follow ${handle} — daily tech intel for IT pros.`, kind: "cta" });
  return {
    id: slug(raw),
    niche: topic.nicheId || "",
    href: topic.link || "",
    title: shorten(raw, 70),
    slides
  };
}

function reelCaption(deck) {
  const ig = config.instagram || {};
  // Lead with the real headline (keyword-rich for search); never a bare stat.
  const hook = (deck.title || deck.slides.find((s) => s.kind === "hook")?.text || "")
    .replace(/[.!…]+$/u, "")
    .trim();
  const base = (ig.baseHashtags || []).map((t) => t);
  const niche = (ig.nicheHashtags && ig.nicheHashtags[deck.niche]) || [];
  const tags = [...new Set([...base, ...niche]).values()].slice(0, ig.hashtagLimit || 15).join(" ");
  return `${hook}.\n\n${tags}\n\n${ig.handle} — daily tech intel for IT pros.`;
}

export function generateReel() {
  const data = loadTopics();
  const flat = Array.isArray(data)
    ? data.flatMap((g) => (g.items || []).map((it) => ({ ...it, nicheId: g.nicheId })))
    : [];
  const topic = pickReelTopic(flat) || { title: "The new class of AI agents just got fast", nicheId: "ai" };
  const deck = buildReelDeck(topic);
  const d = new Date();
  const dayKey = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10).replace(/-/g, "");
  const script = { date: dayKey, deck, caption: reelCaption(deck) };
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(path.join("data", "reel.json"), JSON.stringify(script, null, 2));
  return script;
}

export default { generate, pickReelTopic, generateReel };