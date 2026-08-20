import fs from "node:fs";
import path from "node:path";
import config from "../config.json" with { type: "json" };
import { gql, repoBase, resolveChannelId, createPostMutation, loadState, saveState } from "./buffer-publish.js";
import { NICHES } from "./ig-content-lib.js";

const PERF_FILE = path.join("data", "performance.json");
const BOOST_STATE = path.join("data", "boost-state.json");
const WEIGHTS_FILE = path.join("data", "niche-weights.json");
const ORG_ID = (config.buffer && config.buffer.orgId) || "";
const CHANNEL_ID = (config.buffer && config.buffer.channelId) || "";
const BOOST = config.boost || {};
const TZ_OFFSET_MS = 10 * 3600 * 1000; // AEST

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJson(file, obj) {
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

function aestDate(d = new Date()) {
  return new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

function isWeekend(dateStr) {
  const dow = new Date(dateStr + "T00:00:00+10:00").getDay();
  return dow === 0 || dow === 6;
}

// Next Mon-Fri date on/after `from` (AEST), excluding today unless allowToday.
function nextBusinessDay(from, allowToday = false) {
  const d = new Date(from + "T00:00:00+10:00");
  if (!allowToday) d.setDate(d.getDate() + 1);
  for (;;) {
    const s = new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
    if (!isWeekend(s)) return s;
    d.setDate(d.getDate() + 1);
  }
}

function toIso(dateStr, hm) {
  const [y, m, dd] = dateStr.split("-");
  return new Date(`${y}-${m}-${dd}T${hm}:00+10:00`).toISOString();
}

// Score a post from its Buffer metrics. Views/reach drive the score most;
// saves/shares count as strong signals, likes/comments mild.
function scoreMetrics(metrics) {
  const m = {};
  for (const x of metrics || []) m[x.name.toLowerCase()] = x.value || 0;
  const views = m.views || 0;
  const reach = m.reach || 0;
  return {
    views,
    reach,
    likes: m.reactions || 0,
    comments: m.comments || 0,
    saves: m.saves || 0,
    shares: m.shares || 0,
    follows: m.follows || 0,
    score: views * 1 + reach * 0.8 + (m.saves || 0) * 4 + (m.shares || 0) * 5 + (m.comments || 0) * 3 + (m.reactions || 0) * 1 + (m.follows || 0) * 2
  };
}

// Pull sent posts + metrics + asset URLs from Buffer.
async function fetchSentPosts() {
  const q = `{ posts(input: { organizationId: ${JSON.stringify(ORG_ID)} }, first: 100) { edges { node { id status sentAt text metrics { name value unit } assets { __typename ... on ImageAsset { source } ... on VideoAsset { source } } } } } }`;
  const data = await gql(q);
  return (data && data.posts && data.posts.edges || []).map((e) => e.node).filter((n) => n.status === "sent" && n.sentAt && n.metrics);
}

// Backfill niche attribution for older sent posts from the schedule state
// (bufferId -> date -> slot/reel niche), falling back to hashtag matching so
// reweighting works even before state carries the niche field.
const NICHE_BY_TAG = (() => {
  const map = {};
  for (const [id, n] of Object.entries(NICHES)) {
    for (const t of n.tags || []) map[t.toLowerCase().replace(/^#/, "")] = id;
  }
  return map;
})();

function nicheForBufferId(bufferId, text = "") {
  // Hashtag fallback first: whichever niche's tag appears most in the caption
  // wins. State matching is secondary because old entries only say "reel".
  const counts = {};
  for (const tag of String(text || "").toLowerCase().match(/#[\w-]+/g) || []) {
    const n = NICHE_BY_TAG[tag.replace(/^#/, "")];
    if (n) counts[n] = (counts[n] || 0) + 1;
  }
  let best = "";
  let bestN = 0;
  for (const [n, c] of Object.entries(counts)) {
    if (c > bestN) {
      best = n;
      bestN = c;
    }
  }
  if (best) return best;
  const state = loadState();
  for (const [date, day] of Object.entries(state)) {
    if (day.reel && day.reel.bufferId === bufferId) return day.reel.niche || "reel";
    for (const [slot, rec] of Object.entries(day)) {
      if (rec && rec.bufferId === bufferId) return rec.niche || "";
    }
  }
  return "";
}

function loadPerf() {
  return loadJson(PERF_FILE, { posts: {}, updatedAt: null });
}

// 1) MONITOR — record per-post metrics into data/performance.json.
export async function monitor() {
  const posts = await fetchSentPosts();
  if (!posts.length) {
    console.log("[boost] no sent posts with metrics yet (metrics sync daily)");
    return { posts: 0 };
  }
  const perf = loadPerf();
  let added = 0;
  for (const p of posts) {
    const rec = scoreMetrics(p.metrics);
    rec.raw = (p.metrics || []).map((x) => ({ name: x.name, value: x.value }));
    rec.text = (p.text || "").slice(0, 120);
    rec.text = (p.text || "").slice(0, 120);
    rec.assets = (p.assets || []).map((a) => a.source).filter(Boolean);
    rec.sentAt = p.sentAt;
    rec.type = (p.assets || []).some((a) => a.__typename === "VideoAsset") ? "reel" : "card";
    const prev = perf.posts[p.id];
    // Niche is recomputed every run (cheap) so backfill improvements apply even
    // when metrics are unchanged; raw metrics drive the update flag.
    const niche = nicheForBufferId(p.id, p.text) || prev?.niche || "";
    rec.niche = niche;
    if (!prev || JSON.stringify(prev.raw) !== JSON.stringify(rec.raw) || prev.niche !== niche) {
      perf.posts[p.id] = { bufferId: p.id, ...rec, firstSeenAt: prev?.firstSeenAt || new Date().toISOString() };
      added++;
    }
  }
  perf.updatedAt = new Date().toISOString();
  saveJson(PERF_FILE, perf);
  const scored = Object.values(perf.posts).filter((p) => p.score > 0);
  scored.sort((a, b) => b.score - a.score);
  console.log(`[boost] monitor: ${posts.length} sent posts with metrics, ${added} new/updated`);
  for (const p of scored.slice(0, 5)) {
    console.log(`  ${p.niche || "?"} ${p.type} score=${p.score} views=${p.views} reach=${p.reach} saves=${p.saves} shares=${p.shares} | ${(p.text || "").slice(0, 40)}`);
  }
  return { posts: posts.length, added };
}

// 2) REWEIGHT — derive per-niche weights so the generator favours winners.
export async function reweight() {
  if (!BOOST.reweight || BOOST.reweight.enabled === false) {
    console.log("[boost] niche reweight disabled");
    return null;
  }
  const perf = loadPerf();
  const buckets = {};
  for (const p of Object.values(perf.posts)) {
    if (!p.niche) continue;
    buckets[p.niche] = buckets[p.niche] || { sum: 0, n: 0 };
    buckets[p.niche].sum += p.score;
    buckets[p.niche].n++;
  }
  const entries = Object.entries(buckets).filter(([, b]) => b.n >= (BOOST.reweight.minPosts || 2));
  if (entries.length < 2) {
    console.log("[boost] not enough scored posts per niche to reweight yet");
    return null;
  }
  const max = Math.max(...entries.map(([, b]) => b.sum / b.n));
  const weights = {};
  for (const [niche, b] of entries) {
    const avg = b.sum / b.n;
    // Map avg score -> [0.5, 3.0]; winners get up to 3x the rotation weight.
    weights[niche] = Math.round((0.5 + 2.5 * (avg / max)) * 100) / 100;
  }
  saveJson(WEIGHTS_FILE, weights);
  const top = Object.entries(weights).sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log("[boost] niche weights: " + top.map(([n, w]) => `${n}=${w}`).join(", "));
  return weights;
}

// 3) REPOST — schedule the top scorer as a bonus post (respects 50/day cap).
export async function repostWinner({ dry = false } = {}) {
  const cfg = BOOST.repost;
  if (!cfg || cfg.enabled === false) {
    console.log("[boost] repost disabled");
    return null;
  }
  const perf = loadPerf();
  const candidates = Object.values(perf.posts)
    .filter((p) => p.score >= (cfg.minScore || 10) && p.assets && p.assets.length)
    .sort((a, b) => b.score - a.score);
  if (!candidates.length) {
    console.log(`[boost] no post above minScore=${cfg.minScore || 10} yet`);
    return null;
  }
  const state = loadJson(BOOST_STATE, { reposts: [] });
  const target = nextBusinessDay(aestDate());
  const targetIso = toIso(target, cfg.time || "18:30");

  // A post is boosted once; if every recent winner is already boosted, pick
  // the next-best that hasn't been. `maxReposts` (default 1) caps repeats of a
  // single post in the rolling window.
  const windowDays = cfg.windowDays || 14;
  const cutoff = new Date(Date.now() - windowDays * 86400000).toISOString();
  const recent = state.reposts.filter((r) => r.createdAt >= cutoff);
  const alreadyIds = new Set(recent.map((r) => r.bufferId));
  const maxReposts = cfg.maxReposts || 1;
  // The Friday Tech Gadget Focus spotlight is a priority boost: if a recent one
  // exists with assets and hasn't been boosted, push it ahead of the week's
  // other winners so the spotlight post always gets its second life.
  const gadgetFocus = candidates
    .filter((p) => /friday tech gadget focus|gadget focus/i.test(p.text || "") && !alreadyIds.has(p.bufferId))
    .sort((a, b) => b.score - a.score);
  const winner =
    (gadgetFocus[0] && cfg.preferGadgetFocus !== false) || null
      ? gadgetFocus[0]
      : candidates.find((p) => !alreadyIds.has(p.bufferId)) ||
        candidates.filter((p) => (recent.filter((r) => r.bufferId === p.bufferId).length) < maxReposts).sort((a, b) => b.score - a.score)[0];

  if (!winner) {
    console.log("[boost] all strong posts already boosted this window");
    return null;
  }
  const already = state.reposts.find((r) => r.bufferId === winner.bufferId && r.target === target);
  if (already) {
    console.log(`[boost] winner already reposted for ${target}`);
    return null;
  }

  const channelId = dry ? CHANNEL_ID || "CHANNEL_ID" : await resolveChannelId();
  const isReel = winner.type === "reel";
  const text = `${winner.text.trim()}\n\n🔁 Best of ${config.brand || "the week"} — this one's still worth your time.`;
  const mutation = createPostMutation({
    text,
    channelId,
    dueAt: targetIso,
    imageUrls: isReel ? [] : winner.assets,
    videoUrl: isReel ? winner.assets[0] : undefined,
    postType: isReel ? "reel" : "post"
  });

  if (dry) {
    console.log(`[boost] (dry) repost "${(winner.text || "").slice(0, 40)}" @ ${target} ${cfg.time} (${isReel ? "reel" : winner.assets.length + " imgs"})`);
    return { dry: true, target, winner: winner.bufferId };
  }

  const data = await gql(mutation);
  const res = data.createPost || {};
  const pid = res.post && res.post.id;
  if (!pid) throw new Error(`Buffer rejected repost: ${res.message || "no id"}`);
  state.reposts.push({ bufferId: winner.bufferId, target, dueAt: targetIso, text: winner.text.slice(0, 60), createdAt: new Date().toISOString() });
  saveJson(BOOST_STATE, state);
  console.log(`[boost] repost scheduled -> ${pid} @ ${targetIso}`);
  return { bufferId: winner.bufferId, target, pid };
}

export async function runBoost({ dry = false } = {}) {
  const enabled = BOOST.enabled !== false;
  if (!enabled) {
    console.log("[boost] disabled in config");
    return { disabled: true };
  }
  const mon = await monitor();
  const w = await reweight();
  const rp = await repostWinner({ dry });
  return { monitored: mon.posts, weights: w, repost: rp };
}

// Direct run: `node src/boost-agent.js [--dry]`
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("src/boost-agent.js")) {
  runBoost({ dry: process.argv.includes("--dry") })
    .then(() => setTimeout(() => process.exit(0), 150))
    .catch((e) => {
      console.error("[boost] " + e.message);
      setTimeout(() => process.exit(1), 150);
    });
}