import fs from "node:fs";
import path from "node:path";
import config from "../config.json" with { type: "json" };
import { loadPlan, captionForPost } from "./ig-generator.js";

const API = "https://api.buffer.com";
const SCHED_STATE = path.join("data", "buffer-scheduled.json");
const CHANNEL_CACHE = path.join("data", "buffer-channels.json");
const TZ_OFFSET_MS = 10 * 3600 * 1000; // AEST (Australia/Brisbane, no DST)

function apiKey() {
  return process.env.BUFFER_API_KEY || (config.buffer && config.buffer.apiKey) || "";
}

async function gql(query) {
  const key = apiKey();
  if (!key) throw new Error("No Buffer API key. Set BUFFER_API_KEY env or config.json -> buffer.apiKey");
  const res = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({ query })
  });
  const data = await res.json().catch(() => ({}));
  if (data.errors && data.errors.length) {
    throw new Error("buffer api: " + data.errors.map((e) => e.message).join("; "));
  }
  return data.data;
}

async function getOrganizations() {
  let data = await gql("{ organizations { id name } }");
  if (!data || !data.organizations) {
    data = await gql("{ organizations { nodes { id name } } }");
    return (data.organizations && data.organizations.nodes) || [];
  }
  return data.organizations || [];
}

async function getChannels(orgId) {
  const q = `query { channels(input: { organizationId: ${JSON.stringify(orgId)} }) { id name displayName service isQueuePaused } }`;
  const data = await gql(q);
  return (data && data.channels) || [];
}

async function resolveChannelId() {
  if (config.buffer && config.buffer.channelId) return config.buffer.channelId;
  if (fs.existsSync(CHANNEL_CACHE)) {
    try {
      const c = JSON.parse(fs.readFileSync(CHANNEL_CACHE, "utf8"));
      if (c && c.channelId) return c.channelId;
    } catch {}
  }
  const orgs = await getOrganizations();
  if (!orgs.length) throw new Error("No Buffer organizations found for this API key");
  const org = orgs[0];
  const channels = await getChannels(org.id);
  const ig = channels.filter((c) => /instagram/i.test(String(c.service || "")));
  if (!ig.length) {
    throw new Error("No Instagram channel in Buffer. Connect Instagram in Buffer first: " + JSON.stringify(channels.map((c) => ({ name: c.name, service: c.service })), null, 2));
  }
  const picked = ig[0];
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(CHANNEL_CACHE, JSON.stringify({ organizationId: org.id, channelId: picked.id, name: picked.displayName || picked.name }, null, 2));
  console.log(`[buffer] resolved channel ${picked.displayName || picked.name} (${picked.service}) -> ${picked.id}`);
  return picked.id;
}

function repoBase() {
  const rep = process.env.GITHUB_REPOSITORY || (config.buffer && config.buffer.repo);
  const ref = process.env.GITHUB_REF_NAME || (config.buffer && config.buffer.branch) || "main";
  if (!rep) throw new Error("No repo for media URLs. Set GITHUB_REPOSITORY or config.json -> buffer.repo");
  return `https://raw.githubusercontent.com/${rep}/${ref}`;
}

function postMediaUrls(post) {
  return (post.media || []).map((m) => `${repoBase()}/out/instagram-ready/${post.id}/${path.basename(m)}`);
}

function aestDate(d = new Date()) {
  return new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

function toIso(dateStr, hm) {
  const [y, m, dd] = dateStr.split("-");
  return new Date(`${y}-${m}-${dd}T${hm}:00+10:00`).toISOString();
}

function createPostMutation({ text, channelId, dueAt, imageUrls, videoUrl }) {
  const assets = [];
  for (const u of imageUrls || []) assets.push(`{ image: { url: ${JSON.stringify(u)} } }`);
  if (videoUrl) assets.push(`{ video: { url: ${JSON.stringify(videoUrl)} } }`);
  return `mutation { createPost(input: { text: ${JSON.stringify(text)}, channelId: ${JSON.stringify(channelId)}, schedulingType: automatic, mode: ${dueAt ? "customScheduled" : "addToQueue"}${dueAt ? `, dueAt: ${JSON.stringify(dueAt)}` : ""}${assets.length ? `, assets: [${assets.join(",")}]` : ""} }) { ... on PostActionSuccess { post { id } } ... on MutationError { message } } }`;
}

function loadState() {
  if (!fs.existsSync(SCHED_STATE)) return {};
  try {
    return JSON.parse(fs.readFileSync(SCHED_STATE, "utf8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(SCHED_STATE, JSON.stringify(state, null, 2));
}

export async function scheduleDate(dateStr, { dry = false } = {}) {
  const plan = loadPlan();
  if (!plan || plan.date !== dateStr) throw new Error(`No plan for ${dateStr} (have ${plan ? plan.date : "none"})`);
  const manifestPath = path.join(config.instagram.postDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) throw new Error("No manifest.json — run ig-render first");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.date !== dateStr) throw new Error(`Manifest date ${manifest.date} != ${dateStr}`);

  const times = config.instagram.postingTimes || ["06:30", "10:00", "13:00"];
  const state = loadState();
  const scheduled = [];

  for (const post of manifest.posts) {
    const due = toIso(dateStr, times[post.slot] || times[0]);
    if (state[dateStr] && state[dateStr][post.slot]) {
      console.log(`[buffer] already scheduled slot ${post.slot} for ${dateStr} (buffer ${state[dateStr][post.slot].bufferId})`);
      continue;
    }
    const urls = postMediaUrls(post);
    const text = captionForPost(post);
    const channelId = dry ? (config.buffer && config.buffer.channelId) || "CHANNEL_ID" : await resolveChannelId();
    const mutation = createPostMutation({ text, channelId, dueAt: due, imageUrls: urls });

    if (dry) {
      scheduled.push({ slot: post.slot, title: post.title, due, urls, text: text.slice(0, 80) + "…" });
      console.log(`[buffer] (dry) slot ${post.slot} "${post.title}" @ ${due}`);
      continue;
    }

    const data = await gql(mutation);
    const pid = data.createPost && data.createPost.post && data.createPost.post.id;
    state[dateStr] = state[dateStr] || {};
    state[dateStr][post.slot] = { postId: post.id, bufferId: pid || "ok", dueAt: due };
    console.log(`[buffer] scheduled slot ${post.slot} "${post.title}" -> ${pid || "ok"} @ ${due}`);
    scheduled.push({ slot: post.slot, title: post.title, bufferId: pid, dueAt: due });
  }

  if (!dry) saveState(state);
  return { date: dateStr, scheduled };
}

export async function cmdStatus() {
  const orgs = await getOrganizations();
  console.log("Organizations:");
  for (const o of orgs) {
    const chans = await getChannels(o.id);
    console.log(`  ${o.name} (${o.id})`);
    for (const c of chans) {
      console.log(`    - ${c.displayName || c.name} [${c.service}] id=${c.id} paused=${c.isQueuePaused}`);
    }
  }
}

export default { scheduleDate, cmdStatus };

// Direct run: `node src/buffer-publish.js status | channels | schedule [--date=YYYYMMDD] [--dry] [--reel]`
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("src/buffer-publish.js")) {
  const args = process.argv.slice(2);
  const cmd = args[0] || "help";
  const flag = (name) => {
    const a = args.find((x) => x.startsWith(`--${name}`));
    return a ? a.split("=").slice(1).join("=") : "";
  };
  const has = (name) => args.includes(`--${name}`);

  const run = async () => {
    if (cmd === "status") {
      await cmdStatus();
    } else if (cmd === "channels") {
      const orgs = await getOrganizations();
      for (const o of orgs) {
        const chans = await getChannels(o.id);
        for (const c of chans) console.log(`${c.id}\t${c.service}\t${c.displayName || c.name}`);
      }
    } else if (cmd === "schedule") {
      const date = (flag("date") || aestDate()).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
      await scheduleDate(date, { dry: has("dry") });
    } else {
      console.log("Usage: node src/buffer-publish.js status | channels | schedule [--date=YYYYMMDD] [--dry]");
    }
  };

  run().then(() => process.exit(0)).catch((e) => {
    console.error("[buffer] " + e.message);
    process.exit(1);
  });
}