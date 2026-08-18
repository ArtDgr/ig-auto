import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import config from "../config.json" with { type: "json" };
import { NICHES } from "./ig-content-lib.js";
import { loadTopics } from "./generator.js";
import { isRetailPromo } from "./unbiased.js";

const PLANS = path.join("data", "instagram_plans.json");
const ARTICLE_CACHE = path.join("data", "article-cache");

function articleCacheParas(topic) {
  try {
    if (!topic || !topic.link) return [];
    const key = crypto.createHash("sha1").update(String(topic.link)).digest("hex");
    const f = path.join(ARTICLE_CACHE, key + ".json");
    if (!fs.existsSync(f)) return [];
    const c = JSON.parse(fs.readFileSync(f, "utf8"));
    return Array.isArray(c.paragraphs) ? c.paragraphs : [];
  } catch {
    return [];
  }
}

// ---- tiny deterministic PRNG so a given day always gets the same plan ----
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
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

// ---- helpers ----
function shorten(s, n) {
  const v = String(s).replace(/\s+/g, " ").trim();
  if (v.length <= n) return v;
  let cut = v.slice(0, n - 1);
  const sp = cut.lastIndexOf(" ");
  if (sp > Math.floor(n * 0.6)) cut = cut.slice(0, sp);
  return cut.trimEnd() + "…";
}
function slug(s) {
  return (
    String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 56) || "topic"
  );
}
function shuffle(arr, rnd) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr, rnd) {
  return arr[Math.floor(rnd() * arr.length)];
}
function pickRange(coll, n, rnd) {
  return shuffle(coll, rnd).slice(0, n);
}
function fileDate() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function topicsForNiche(nicheId) {
  const data = loadTopics();
  if (!Array.isArray(data)) return [];
  const g = data.find((x) => x.nicheId === nicheId);
  return ((g && g.items) || []).map((t) => ({
    ...t,
    title: decodeEnt(t.title),
    snippet: decodeEnt(t.snippet)
  }));
}

const ENT_MAP = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'" };
function decodeEnt(s) {
  return String(s == null ? "" : s)
    .replace(/&#(\d+);/g, (_m, d) => {
      const c = parseInt(d, 10);
      return c >= 32 && c <= 255 ? String.fromCharCode(c) : _m;
    })
    .replace(/&(amp|lt|gt|quot|#39|apos);/gi, (_m, e) => ENT_MAP["&" + e + ";"] ?? _m);
}

// Pull concise, informative bullet points straight from the article snippet.
// Real sentences only — a story that can't support three facts shows fewer,
// never pad with placeholder copy.
function topicFacts(topic, n = 4) {
  const src = [
    String(topic.snippet || ""),
    ...articleCacheParas(topic)
  ]
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
  const title = String(topic.title || "").replace(/\s+/g, " ").trim().toLowerCase();
  const sents = src.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length >= 28);
  const out = [];
  for (const s of sents) {
    if (out.length >= n) break;
    if (isRetailPromo(s)) continue;
    const low = s.toLowerCase();
    if (NEWSLETTER_HINTS.some((h) => low.includes(h))) continue;
    const t = shorten(s, 132);
    const norm = t.toLowerCase();
    if (norm === title || title.includes(norm) || norm.includes(title)) continue;
    if (out.some((o) => o.toLowerCase() === norm || norm.includes(o.toLowerCase()))) continue;
    out.push(t);
  }
  return out;
}

// Mandated source list, mapped to clean display names for attribution.
const SOURCE_NAMES = {
  "reuters.com": "Reuters",
  "zdnet.com": "ZDNET",
  "computerworld.com": "Computerworld",
  "techcrunch.com": "TechCrunch",
  "twit.tv": "TWiT",
  "krebsonsecurity.com": "Krebs on Security",
  "thehackernews.com": "The Hacker News",
  "bleepingcomputer.com": "BleepingComputer",
  "darkreading.com": "Dark Reading",
  "windowscentral.com": "Windows Central",
  "ghacks.net": "Ghacks",
  "tomsguide.com": "Tom's Guide",
  "tomshardware.com": "Tom's Hardware",
  "techradar.com": "TechRadar",
  "arstechnica.com": "Ars Technica",
  "notebookcheck.net": "Notebookcheck",
  "theregister.com": "The Register",
  "servethehome.com": "ServeTheHome",
  "macrumors.com": "MacRumors",
  "9to5mac.com": "9to5Mac",
  "appleinsider.com": "AppleInsider",
  "gsmarena.com": "GSMArena",
  "androidcentral.com": "Android Central",
  "9to5google.com": "9to5Google",
  "androidauthority.com": "Android Authority",
  "theverge.com": "The Verge"
};
function sourceName(topic) {
  try {
    const h = new URL(topic.link || "").hostname.replace(/^www\./, "").toLowerCase();
    return SOURCE_NAMES[h] || h.split(".").slice(-2, -1)[0] || null;
  } catch {
    return null;
  }
}
function sourceFoot(topic) {
  const n = sourceName(topic);
  return n ? "Full story: " + n + " — link in bio." : "";
}

// ---- scroll-stopper hooks (2026 top-creator patterns) ----
// Winners lead slide 1 with a bold number/stat, a curiosity punch, or a
// question — never the full journalistic headline. Saves & shares are weighted
// ~3x by IG's algorithm, so the CTA drives bookmark/share actions too.
// Stat tokens keep their unit ("$32 billion", not "$32") so the slide never
// reads "…for billion this year…".
const STAT_RE = /(\$[\d][\d,]*(?:\.\d+)?(?:\s*(?:million|billion|trillion))?|\b\d[\d,]{2,}(?:\.\d+)?%?|\b\d+\s+(?:million|billion|trillion)\b)/i;

function findStatFact(facts) {
  for (const f of facts) {
    const m = STAT_RE.exec(f);
    if (m) return { fact: f, stat: m[0].trim() };
  }
  return null;
}

// Cut to a clean word boundary (no dangling ellipsis mid-phrase) for big hooks.
function niceness(s) {
  return String(s).replace(/\s+/g, " ").trim();
}
function phraseCut(s, n) {
  const v = niceness(s);
  if (v.length <= n) return v;
  let cut = v.slice(0, n);
  const sp = cut.lastIndexOf(" ");
  if (sp > n * 0.5) cut = cut.slice(0, sp);
  return cut.replace(/[,\-–—]+$/, "").trimEnd();
}

// Strip the trailing clauses ("after X", "as Y", "in Z", "for W") that make a
// headline read like news copy instead of a hook. The full headline always
// rides as the hook slide's subline, so the story is never placeholder copy.
function stripFluff(title) {
  let s = String(title || "").replace(/\s+/g, " ").trim();
  s = s.replace(/^(breaking|just in|exclusive|report|update|watch):\s*/i, "").trim();
  s = s.replace(/\s+(?:after|as|amid|following|before)\s+.+$/i, "").trim();
  s = s.replace(/\s+(?:in|for)\s+[a-z0-9'’&-]+(?:\s+[a-z0-9'’&-]+)*$/i, "").trim();
  s = s.replace(/[,\-–—]+$/, "").trim();
  return s.trim() || String(title || "");
}

// Deterministic per-post hook. `big` is the huge scroll-stopping visual (~1-6
// words, often a bold stat), `line` is the real headline kept on slide 1.
function makeNewsHook(topic, rnd) {
  const title = String(topic.title || "").replace(/\s+/g, " ").trim();
  const st = findStatFact(topicFacts(topic, 6));
  if (st && rnd() < 0.5) {
    return { big: st.stat, line: shorten(title, 96) };
  }
  const big = phraseCut(stripFluff(title), 48);
  const line = niceness(big).toLowerCase() === title.toLowerCase() ? "" : shorten(title, 96);
  return { big, line };
}

const SAVE_SHARE = {
  news: "Save this story — you'll want it later.",
  howto: "Save this — you'll need it next time.",
  routine: "Bookmark this routine for tomorrow.",
  tip: "Save this 30-second fix."
};

// A story with a real snippet beats a title-only feed entry, every time.
// Reject items that are newsletter/digest chit-chat rather than hard news.
const NEWSLETTER_HINTS = [
  "good morning", "good evening", "hope you had", "thanks for reading",
  "as a reminder", "today i’m reading", "today i'm reading", "listening to",
  "this newsletter", "you’re receiving this", "you're receiving this", "read on the web",
  "help us better understand", "sponsored", "subscribe", "unsubscribe"
];
// Podcast/digest feeds (TWiT) are episodic summaries, not news articles — don't
// let them become the daily TECH INTEL lead when real articles exist.
const LEAD_EXCLUDE = /twit|podcast|episode|sponsored/i;
function looksLikeNewsletter(t) {
  const s = String(t.snippet || t.title || "").toLowerCase();
  return NEWSLETTER_HINTS.some((h) => s.includes(h));
}
function contentDepth(t) {
  return (
    String(t.snippet || "").length +
    articleCacheParas(t).reduce((a, p) => a + String(p).length, 0)
  );
}
function pickDeepest(coll) {
  // Prefer real, linkable articles with the deepest snippet. Linkless digest
  // items (long text, no URL) are poor leads and only used as a last resort.
  const linked = coll.filter((t) => t && t.link && /^https?:\/\//i.test(String(t.link)));
  let pool = linked.filter((t) => !looksLikeNewsletter(t) && !LEAD_EXCLUDE.test(String(t.title || "")));
  if (!pool.length) pool = linked;
  if (!pool.length) pool = coll.filter((t) => !looksLikeNewsletter(t));
  if (!pool.length) pool = coll;
  // Freshness first: stale "news" reads as a bot. If at least two recent items
  // exist, only pick among them; otherwise fall back to depth alone.
  const fresh = pool.filter((t) => {
    if (!t.pubDate) return false;
    const days = (Date.now() - new Date(t.pubDate).getTime()) / 86400000;
    return days >= 0 && days <= 2;
  });
  if (fresh.length >= 2) pool = fresh;
  let best = pool[0];
  for (const t of pool) {
    if (contentDepth(t) > contentDepth(best)) best = t;
  }
  return best;
}

// ---- content builders ------------------------------------------------------

// Carousel built from a curated news topic: real story facts, a real takeaway,
// and a forward-looking line only when the article actually has one. Nothing is
// repeated between the facts slide and the takeaway/watch slides.
function newsCarouselSlides(topic, niche, rnd) {
  const all = topicFacts(topic, 6);
  const shown = all.slice(0, 4);
  const tail = all.slice(4);
  // A takeaway is only worth its own slide if it's a NEW fact the card hasn't
  // already shown — otherwise it reads as padding.
  const takeaway = (tail[tail.length - 1] || null);
  const fwd = /next|watch|will|expect|planned|coming|follow|over the|later this|coming up|in the works/i;
  const watch =
    (tail.length ? tail.find((f) => fwd.test(f)) : null) ||
    shown.slice(0, -1).find((f) => fwd.test(f)) ||
    null;

  const hk = makeNewsHook(topic, rnd);
  const slides = [
    { kind: "hook", text: `${hk.big}\n${hk.line}` },
    { kind: "facts", text: shown.join("\n") }
  ];
  if (takeaway) slides.push({ kind: "body", text: shorten("THE TAKEAWAY — " + takeaway, 190) });
  if (watch && watch !== takeaway && !shown.includes(watch)) slides.push({ kind: "body", text: shorten("WHAT TO WATCH — " + watch, 170) });
  slides.push({ kind: "cta", text: SAVE_SHARE.news });
  return slides;
}

// Carousel built from the evergreen how-to library.
function howtoSlides(howto, niche) {
  const line = shorten(String(howto.steps && howto.steps[0] || "A fix you can do in minutes."), 90);
  const slides = [{ kind: "hook", text: `${howto.title}\n${line}` }];
  howto.steps.forEach((s, i) => {
    const d = (howto.details && howto.details[i]) || "";
    slides.push({ kind: "step", text: d ? `${s} — ${d}` : s });
  });
  slides.push({ kind: "cta", text: SAVE_SHARE.howto });
  return slides;
}

// Single image card from the tip library. Punchy hook slide, then the expert
// detail (exact path + the why + the gotcha) on its own slide so it's readable,
// then a save/share CTA. This is the card that earns "this guy knows his stuff".
function tipCard(tip, niche) {
  const big = phraseCut(String(tip.title || "").replace(/\s+/g, " ").trim(), 42);
  const body = String(tip.body || "").replace(/\s+/g, " ").trim();
  return [
    { kind: "hook", text: `${big}\n${shorten(body, 120)}` },
    { kind: "body", text: shorten(body, 230) },
    { kind: "cta", text: SAVE_SHARE.tip }
  ];
}

// Single image "daily routine" card, with real detail per step.
function routineCard(routine, niche) {
  const line = shorten(String(routine.steps && routine.steps[0] || "Small habits, real difference."), 90);
  const slides = [{ kind: "hook", text: `${routine.title}\n${line}` }];
  routine.steps.slice(0, 3).forEach((s, i) => {
    const d = (routine.details && routine.details[i]) || "";
    slides.push({ kind: "step", text: d ? `${s} — ${d}` : s });
  });
  slides.push({ kind: "cta", text: SAVE_SHARE.routine });
  return slides;
}

// Single image card from a deep news story: headline + real facts + attribution.
function newsCard(topic) {
  const raw = shorten(String(topic.title || "A new tech story just broke."), 90);
  const facts = topicFacts(topic, 4);
  const lines = [raw, ...facts, sourceFoot(topic)].filter(Boolean);
  return [
    { kind: "title", text: "TECH INTEL" },
    { kind: "brief", text: lines.join("\n") },
    { kind: "cta", text: `Follow ${config.instagram.handle} for daily tech intel.` }
  ];
}

// ---- captions ----
function pickTags(nicheId, rnd) {
  const n = NICHES[nicheId];
  const ig = config.instagram || {};
  const base = (ig.baseHashtags || []).map((t) => t.replace(/^#/, ""));
  const nicheTags = (ig.nicheHashtags && ig.nicheHashtags[nicheId]) || n.tags;
  const nicheMap = nicheTags.map((t) => t.replace(/^#/, ""));
  const tags = [...pickRange(nicheMap, 8, rnd), ...pickRange(base, 4, rnd)];
  return [...new Set(tags)].slice(0, ig.hashtagLimit || 12);
}

function captionPoints(post) {
  const pts = [];
  for (const s of post.slides || []) {
    if (s.kind !== "facts" && s.kind !== "brief") continue;
    const lines = String(s.text || "").split("\n").map((l) => l.trim().replace(/^[•▸\-*]\s*/, "")).filter(Boolean);
    for (const t of lines) if (t && !isRetailPromo(t) && !pts.includes(t)) pts.push(t);
  }
  return pts.slice(0, 4);
}

function captionFor(post, rnd) {
  const n = NICHES[post.niche];
  const handle = config.instagram.handle;
  const tags = pickTags(post.niche, rnd).map((t) => "#" + t).join(" ");
  const emoji = n.emoji;
  const line = (s) => `\n\n${s}`;

  const stepLines = (post) =>
    post.slides
      .filter((s) => s.kind === "step")
      .map((s, i) => {
        const [head, ...detail] = String(s.text).split(" — ");
        return `${i + 1}. ${head}${detail.length ? "\n     ✓ " + detail.join(" — ") : ""}`;
      });

  const newsFoot = post.source ? `Source: ${post.source}${post.link ? " — " + post.link : ""}` : null;

  if (post.format === "carousel" && post.kind === "howto") {
    const list = stepLines(post).join("\n");
    return `${post.title} ${emoji}\n\n${list}\n\nSave this for next time →\n\n${tags}\n\n${handle} — daily tech fixes.${line("Share this with someone who needs it.")}`;
  }
  if (post.format === "carousel") {
    const headline = post.title;
    const pts = captionPoints(post);
    const bullets = pts.length ? "\n\n" + pts.map((p) => "• " + p).join("\n") : "";
    const src = newsFoot ? "\n\n" + newsFoot : "";
    return `${post.title} ${emoji}\n\n${headline}${bullets}${src}\n\nSave this for later →\n\n${tags}\n\n${handle} — daily tech intel.${line("Which detail surprised you most?")}`;
  }
  if (post.format === "routine") {
    const list = stepLines(post).join("\n");
    return `${post.title} ${emoji}\n\n${list}\n\nDrop a 🔔 to catch tomorrow's routine.\n\n${tags}\n\n${handle} — steady tech habits.${line("Bookmark this for later.")}`;
  }
  const headline = post.title;
  const pts = captionPoints(post);
  const bullets = pts.length ? "\n\n" + pts.map((p) => "• " + p).join("\n") : "";
  const src = newsFoot ? "\n\n" + newsFoot : "";
  return `${post.title} ${emoji}\n\n${headline}${bullets}${src}\n\n${tags}\n\n${handle} — daily tech fixes.${line("Follow for more like this.")}`;
}

// Deterministic caption for a finished post (used by the Buffer/cloud publisher).
export function captionForPost(post) {
  const rnd = mulberry32(hashStr("cap" + String(post.slot) + String(post.title)));
  return captionFor(post, rnd);
}

// ---- plan assembly ----
const FORMAT_CYCLE = [
  { 0: "carousel", 1: "image", 2: "routine" },
  { 0: "routine", 1: "carousel", 2: "image" },
  { 0: "image", 1: "routine", 2: "carousel" }
];

function buildPost(nicheId, format, topics, rnd, slot = 0, mode = "mix") {
  const n = NICHES[nicheId];
  const news = topics.length ? topics : [];
  // "news" slots always show a real story; "evergreen" slots always show a
  // pro tip/how-to/routine — the content that earns "this guy knows his stuff".
  const newsBias = mode === "news" ? 1 : 0;
  let slides, kind, title, _srcTopic;

  // News slots always show a real story. Slot 0 = punchy single card; later
  // news slots get a full swipe-story so there's room for depth.
  const newsStory = news.length && (mode === "news" || rnd() < newsBias);

  if (newsStory) {
    const topic = pickDeepest(news);
    kind = "news";
    title = shorten(String(topic.title || ""), 56);
    slides = newsCarouselSlides(topic, nicheId, rnd);
    _srcTopic = topic;
  } else if (format === "routine") {
    const routine = pick(n.routines, rnd);
    kind = "routine";
    title = routine.title;
    slides = routineCard(routine, nicheId);
  } else if (format === "carousel") {
    const howto = pick(n.howtos, rnd);
    kind = "howto";
    title = howto.title;
    slides = howtoSlides(howto, nicheId);
  } else {
    const tip = pick(n.tips, rnd);
    kind = "tip";
    title = tip.title;
    slides = tipCard(tip, nicheId);
  }

  const formatOut = kind === "news" ? "carousel" : format;
  const post = {
    id: `${dateKeyShort()}${slug(title)}`,
    slot: 0,
    niche: nicheId,
    nicheLabel: n.label,
    accent: n.accent,
    emoji: n.emoji,
    format: formatOut,
    kind,
    title,
    source: _srcTopic ? sourceName(_srcTopic) : null,
    link: _srcTopic && _srcTopic.link ? _srcTopic.link : null,
    slides
  };
  post.caption = captionFor(post, rnd);
  post.status = "pending";
  return post;
}

function dateKeyShort() {
  return fileDate().replace(/-/g, "") + "-";
}

export function generateIgPlan() {
  const rnd = mulberry32(hashStr(fileDate()));
  const nicheIds = Object.keys(NICHES);
  // Favour the requested categories: frontier AI, smartphone/gadgets, Apple,
  // laptops, security. (it-support/cloud rotate in on the 25% wildcard days.)
  const CORE = ["ai", "gadgets", "apple", "hardware", "security"];
  const dayNicheOrder = rnd() < 0.75 ? shuffle(CORE, rnd) : shuffle(nicheIds, rnd);
  const formats = shuffle(["carousel", "image", "routine"], rnd);
  // Don't pick an evergreen image card for slot 0 — the news lead must be a
  // real story. If slot 0 landed on "image", that's fine (newsCard); if it
  // landed on "routine", swap the routine out for the slot-2 default.
  if (formats[0] === "routine") {
    const t = formats[2];
    formats[2] = formats[0];
    formats[0] = t;
  }
  // Slots 0 and 1 are both fresh, fact-rich news posters (slot 0 single-card,
  // slot 1 a full swipe-story). Slot 2 is the helpful evergreen how-to.
  const modes = ["news", "news", "evergreen"];

  const posts = [];
  for (let slot = 0; slot < 3; slot++) {
    const nicheId = dayNicheOrder[slot];
    const format = formats[slot];
    const topics = topicsForNiche(nicheId);
    const post = buildPost(nicheId, format, topics, rnd, slot, modes[slot]);
    post.slot = slot;
    posts.push(post);
  }

  const plan = { date: fileDate(), generatedAt: new Date().toISOString(), posts };
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(PLANS, JSON.stringify(plan, null, 2));
  return plan;
}

export function loadPlan() {
  if (!fs.existsSync(PLANS)) return null;
  return JSON.parse(fs.readFileSync(PLANS, "utf8"));
}

// Adds/rebuilds one post at slotIndex on an existing day plan (deterministic).
export function appendIgSlot(plan, slotIndex) {
  const rnd = mulberry32(hashStr(plan.date + "-slot" + slotIndex));
  const nicheIds = Object.keys(NICHES);
  const CORE = ["ai", "gadgets", "apple", "hardware", "security"];
  const nicheId = rnd() < 0.75 ? pick(CORE, rnd) : pick(nicheIds, rnd);
  const formats = ["carousel", "image", "routine"];
  const existing = new Set(plan.posts.map((p) => p.format));
  const avail = formats.filter((f) => !existing.has(f));
  const format = avail.length ? pick(avail, rnd) : pick(formats, rnd);
  const topics = topicsForNiche(nicheId);
  const post = buildPost(nicheId, format, topics, rnd);
  post.slot = slotIndex;
  const idx = plan.posts.findIndex((p) => p.slot === slotIndex);
  if (idx >= 0) plan.posts.splice(idx, 1, post);
  else plan.posts.push(post);
  plan.posts.sort((a, b) => a.slot - b.slot);
  return plan;
}

export default { generateIgPlan, loadPlan, appendIgSlot, captionForPost };

// Direct run: `node src/ig-generator.js` prints today's plan summary.
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("src/ig-generator.js")) {
  const appendArg = process.argv.find((a) => a.startsWith("--append-slot="));
  if (appendArg) {
    const n = parseInt(appendArg.split("=")[1], 10);
    let plan = loadPlan();
    if (!plan) plan = generateIgPlan();
    plan.posts = plan.posts.filter((p) => p.slot !== n);
    appendIgSlot(plan, n);
    fs.writeFileSync(PLANS, JSON.stringify(plan, null, 2));
    const ap = plan.posts.find((p) => p.slot === n);
    console.log("appended slot " + n + " -> " + ap.title + " [" + ap.format + " / " + ap.niche + "]");
  } else {
    const plan = generateIgPlan();
    console.log("Plan for " + plan.date + ":");
    for (const p of plan.posts) {
      console.log(`  [${p.slot}] ${p.format.padEnd(8)} ${p.kind.padEnd(7)} ${p.niche.padEnd(12)} ${p.title}`);
    }
  }
}