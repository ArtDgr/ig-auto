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
  const data = await gql("{ account { id name organizations { id name } } }");
  return (data.account && data.account.organizations) || [];
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

const TIKTOK_CACHE = path.join("data", "buffer-tiktok.json");
async function resolveTikTokChannelId() {
  if (config.buffer && config.buffer.tiktokChannelId) return config.buffer.tiktokChannelId;
  if (fs.existsSync(TIKTOK_CACHE)) {
    try {
      const c = JSON.parse(fs.readFileSync(TIKTOK_CACHE, "utf8"));
      if (c && c.channelId) return c.channelId;
    } catch {}
  }
  const orgs = await getOrganizations();
  if (!orgs.length) throw new Error("No Buffer organizations found for this API key");
  const org = orgs[0];
  const channels = await getChannels(org.id);
  const tk = channels.filter((c) => /tiktok/i.test(String(c.service || "")));
  if (!tk.length) {
    throw new Error("No TikTok channel in Buffer. Connect TikTok in Buffer first: " + JSON.stringify(channels.map((c) => ({ name: c.name, service: c.service })), null, 2));
  }
  const picked = tk[0];
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(TIKTOK_CACHE, JSON.stringify({ organizationId: org.id, channelId: picked.id, name: picked.displayName || picked.name }, null, 2));
  console.log(`[buffer] resolved TikTok channel ${picked.displayName || picked.name} (${picked.service}) -> ${picked.id}`);
  return picked.id;
}

const X_CACHE = path.join("data", "buffer-x.json");
async function resolveXChannelId() {
  if (config.buffer && config.buffer.xChannelId) return config.buffer.xChannelId;
  if (fs.existsSync(X_CACHE)) {
    try {
      const c = JSON.parse(fs.readFileSync(X_CACHE, "utf8"));
      if (c && c.channelId) return c.channelId;
    } catch {}
  }
  const orgs = await getOrganizations();
  if (!orgs.length) throw new Error("No Buffer organizations found for this API key");
  const org = orgs[0];
  const channels = await getChannels(org.id);
  const x = channels.filter((c) => /twitter|x\b/i.test(String(c.service || "")));
  if (!x.length) {
    throw new Error("No X/Twitter channel in Buffer. Connect X in Buffer first: " + JSON.stringify(channels.map((c) => ({ name: c.name, service: c.service })), null, 2));
  }
  const picked = x[0];
  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(X_CACHE, JSON.stringify({ organizationId: org.id, channelId: picked.id, name: picked.displayName || picked.name }, null, 2));
  console.log(`[buffer] resolved X channel ${picked.displayName || picked.name} (${picked.service}) -> ${picked.id}`);
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
function xMediaUrls(post) {
  return (post.media || []).slice(0,4).map((m) => `${repoBase()}/out/x-ready/${post.id}/${path.basename(m)}`);
}

function aestDate(d = new Date()) {
  return new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

function toIso(dateStr, hm) {
  const [y, m, dd] = dateStr.split("-");
  return new Date(`${y}-${m}-${dd}T${hm}:00+10:00`).toISOString();
}

function createPostMutation({ text, channelId, dueAt, imageUrls, videoUrl, postType = "post", platform = "instagram" }) {
  const assets = [];
  for (const u of imageUrls || []) assets.push(`{ image: { url: ${JSON.stringify(u)} } }`);
  if (videoUrl) assets.push(`{ video: { url: ${JSON.stringify(videoUrl)} } }`);
  const isX = platform === "x" || platform === "twitter";
  const meta = (platform === "tiktok" || isX) ? "" : `metadata: { instagram: { type: ${postType}, shouldShareToFeed: true } }`;
  const frags = `... on PostActionSuccess { post { id status } } ... on InvalidInputError { message } ... on RestProxyError { message } ... on LimitReachedError { message } ... on UnexpectedError { message } ... on UnauthorizedError { message } ... on NotFoundError { message }`;
  const metaFrag = meta ? `, ${meta}` : "";
  return `mutation { createPost(input: { text: ${JSON.stringify(text)}, channelId: ${JSON.stringify(channelId)}, schedulingType: automatic, mode: ${dueAt ? "customScheduled" : "addToQueue"}${dueAt ? `, dueAt: ${JSON.stringify(dueAt)}` : ""}, needsApproval: false${metaFrag}${assets.length ? `, assets: [${assets.join(",")}]` : ""} }) { ${frags} } }`;
}

// editPost replaces a whole scheduled post (text + assets + metadata + dueAt).
// The channel and approval state are untouched, so this is safe to run right up
// to publish time for a content/design refresh.
function editPostMutation({ id, text, dueAt, imageUrls, videoUrl, postType = "post", platform = "instagram" }) {
  const assets = [];
  for (const u of imageUrls || []) assets.push(`{ image: { url: ${JSON.stringify(u)} } }`);
  if (videoUrl) assets.push(`{ video: { url: ${JSON.stringify(videoUrl)} } }`);
  const isX = platform === "x" || platform === "twitter";
  const meta = (platform === "tiktok" || isX) ? "" : `metadata: { instagram: { type: ${postType}, shouldShareToFeed: true } }`;
  const frags = `... on PostActionSuccess { post { id status } } ... on InvalidInputError { message } ... on RestProxyError { message } ... on LimitReachedError { message } ... on UnexpectedError { message } ... on UnauthorizedError { message } ... on NotFoundError { message }`;
  const metaFrag = meta ? `, ${meta}` : "";
  return `mutation { editPost(input: { id: ${JSON.stringify(id)}, text: ${JSON.stringify(text)}, schedulingType: automatic, mode: customScheduled, dueAt: ${JSON.stringify(dueAt)}${metaFrag}${assets.length ? `, assets: [${assets.join(",")}]` : ""} }) { ${frags} } }`;
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

export async function scheduleDate(dateStr, { dry = false, reel = false, force = false } = {}) {
  // Stealth sustainability: bi-weekly random gating (~30% execution = ~94% reduction)
  // Knuth hash gives pseudo-random 30% RUN distribution, not clustered
  if (!dry && !force) {
    const n = parseInt(dateStr.replace(/-/g, ""), 10);
    let hash = (n * 2654435761) % 100;
    if (hash < 0) hash += 100;
    if (hash >= 30) {
      console.log(`[buffer] Skipped - bi-weekly random cycle (hash ${hash}/100, date ${dateStr})`);
      return { date: dateStr, scheduled: [], skipped: true };
    }
  }
  const plan = loadPlan();
  if (!plan || plan.date !== dateStr) throw new Error(`No plan for ${dateStr} (have ${plan ? plan.date : "none"})`);
  const manifestPath = path.join(config.instagram.postDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) throw new Error("No manifest.json — run ig-render first");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.date !== dateStr) throw new Error(`Manifest date ${manifest.date} != ${dateStr}`);

  const times = config.instagram.postingTimes || ["06:30", "10:00", "13:00"];
  const gfCfg = (config.instagram && config.instagram.fridayGadgetFocus) || {};
  const state = loadState();
  const scheduled = [];

  // Random 2-4 posts per bi-weekly run (shuffle manifest then slice) + random times
  const n2 = parseInt(dateStr.replace(/-/g, ""), 10);
  let hash2 = (n2 * 1664525) % 3;
  if (hash2 < 0) hash2 += 3;
  const targetCount = 2 + hash2; // 2,3,4
  const shuffled = [...manifest.posts].sort((a, b) => {
    let ha = 17; for (const ch of (a.id + dateStr)) ha = (ha * 31 + ch.charCodeAt(0)) % 1000;
    let hb = 17; for (const ch of (b.id + dateStr)) hb = (hb * 31 + ch.charCodeAt(0)) % 1000;
    return ha - hb;
  }).slice(0, Math.min(targetCount, manifest.posts.length));
  // Shuffle posting times same date seed so each RUN gets random day/times combo
  const shuffledTimes = [...times].sort((a,b)=>{
    let ha=19; for(const ch of (a+dateStr)) ha=(ha*37+ch.charCodeAt(0))%1000;
    let hb=19; for(const ch of (b+dateStr)) hb=(hb*37+ch.charCodeAt(0))%1000;
    return ha-hb;
  });
  if (!dry) console.log(`[buffer] stealth: selected ${shuffled.length}/${manifest.posts.length} posts for ${dateStr} (target ${targetCount}) times ${shuffledTimes.slice(0,shuffled.length).join(",")}`);

  let timeIdx=0;
  for (const post of shuffled) {
    const gfTime = post.kind === "gadget-focus" ? gfCfg.time : null;
    const due = toIso(dateStr, gfTime || shuffledTimes[timeIdx % shuffledTimes.length] || times[post.slot] || times[0]);
    timeIdx++;
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
    const res = data.createPost || {};
    const pid = res.post && res.post.id;
    if (!pid) {
      throw new Error(`Buffer rejected slot ${post.slot} ("${post.title}"): ${res.message || "no post id in response"}`);
    }
    state[dateStr] = state[dateStr] || {};
    state[dateStr][post.slot] = { postId: post.id, bufferId: pid, dueAt: due, niche: post.niche || "", title: post.title };
    console.log(`[buffer] scheduled slot ${post.slot} "${post.title}" -> ${pid} @ ${due}`);
    scheduled.push({ slot: post.slot, title: post.title, bufferId: pid, dueAt: due });
  }

  if (reel) {
    const r = await scheduleReel(dateStr, { dry, state });
    scheduled.push(...(r.scheduled || []));
  }

  if (!dry) saveState(state);
  return { date: dateStr, scheduled };
}

export async function scheduleReel(dateStr, { dry = false, state: priorState } = {}) {
  const reelDir = (config.instagramReel && config.instagramReel.postDir) || "out/instagram-reels";
  if (!fs.existsSync(reelDir)) {
    console.log("[buffer] no reel dir, skipping reel");
    return { scheduled: [] };
  }
  const ymd = dateStr.replace(/-/g, "");
  const mp4s = fs.readdirSync(reelDir).filter((f) => f.startsWith(ymd + "-") && f.endsWith(".mp4")).sort();
  if (!mp4s.length) {
    console.log(`[buffer] no reel for ${dateStr}, skipping reel`);
    return { scheduled: [] };
  }
  const file = mp4s[0];
  const capFile = path.join(reelDir, file.replace(/\.mp4$/, ".txt"));
  const text = fs.existsSync(capFile) ? fs.readFileSync(capFile, "utf8").trim() : "";
  const due = toIso(dateStr, (config.instagramReel && config.instagramReel.postingTime) || "15:00");
  const state = priorState || loadState();

  if (state[dateStr] && state[dateStr].reel) {
    console.log(`[buffer] already scheduled reel for ${dateStr} (buffer ${state[dateStr].reel.bufferId})`);
    return { scheduled: [] };
  }

  const videoUrl = `${repoBase()}/out/instagram-reels/${file}`;
  const channelId = dry ? (config.buffer && config.buffer.channelId) || "CHANNEL_ID" : await resolveChannelId();
  const mutation = createPostMutation({ text, channelId, dueAt: due, videoUrl, postType: "reel" });

  if (dry) {
    console.log(`[buffer] (dry) reel "${file}" @ ${due} (video ${videoUrl})`);
    return { scheduled: [{ reel: file, due, videoUrl }] };
  }

  const data = await gql(mutation);
  const res = data.createPost || {};
  const pid = res.post && res.post.id;
  if (!pid) {
    throw new Error(`Buffer rejected reel ("${file}"): ${res.message || "no post id in response"}`);
  }
  state[dateStr] = state[dateStr] || {};
  state[dateStr].reel = { file, bufferId: pid, dueAt: due, niche: reelNiche(dateStr) };
  console.log(`[buffer] scheduled reel "${file}" -> ${pid} @ ${due}`);
  return { scheduled: [{ reel: file, bufferId: pid, due }] };
}

// ---- TikTok headless cloud publishing (Buffer is primary, same as IG) ----
function tiktokVideoUrl(file) {
  return `${repoBase()}/out/tiktok-ready/${file}`;
}

function hashTikTok(s) { let h=2166136261; for(let i=0;i<s.length;i++){h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
function rndTikTok(seed){ let t=seed>>>0; return function(){ t+=0x6d2b79f5; let r=Math.imul(t^(t>>>15),1|t); r^=r+Math.imul(r^(r>>>7),61|r); return ((r^(r>>>14))>>>0)/4294967296; } }
function randomizedTikTokTimes(dateStr, count){
  // Deterministic per date, 08:00-22:00, randomized minutes, min 75m gap — looks human, not bot-fixed.
  const rnd = rndTikTok(hashTikTok(dateStr));
  const mins=[];
  for(let i=0;i<count;i++){
    let t, attempts=0;
    do{ t=480+Math.floor(rnd()*840); attempts++; if(attempts>80) break; } while(mins.some(m=>Math.abs(m-t)<75));
    mins.push(t);
  }
  mins.sort((a,b)=>a-b);
  return mins.map(m=>`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`);
}
export async function scheduleTikTok(dateStr, { dry = false, state: priorState } = {}) {
  const tiktokDir = (config.tiktok && config.tiktok.postDir) || (config.tiktokBot && config.tiktokBot.postDir) || "out/tiktok-ready";
  const scriptsPath = path.join("data", "scripts.json");
  if (!fs.existsSync(scriptsPath)) {
    console.log("[buffer:tiktok] no scripts.json — run scheduler generate first, skipping TikTok");
    return { scheduled: [] };
  }
  const decks = JSON.parse(fs.readFileSync(scriptsPath, "utf8"));
  if (!Array.isArray(decks) || !decks.length) {
    console.log("[buffer:tiktok] no decks, skipping");
    return { scheduled: [] };
  }
  // Only schedule videos that actually exist on disk (render step may have failed for some)
  let available = decks.filter((d) => fs.existsSync(path.join(tiktokDir, d.id + ".mp4")));
  if (!available.length) {
    // Fallback: scripts.json stale (e.g. after curate reset) — pick whatever mp4s exist
    try {
      const files = fs.readdirSync(tiktokDir).filter((f) => f.endsWith(".mp4"));
      if (files.length) {
        console.log(`[buffer:tiktok] scripts.json mismatch — falling back to ${files.length} existing mp4(s)`);
        available = files.map((f) => {
          const id = f.replace(/\.mp4$/, "");
          const deck = decks.find((d) => d.id === id);
          const capFile = path.join(tiktokDir, f.replace(/\.mp4$/, ".txt"));
          const title = deck ? deck.title : id.replace(/-/g, " ");
          const niche = deck ? deck.niche : "ai";
          return { id, title, niche, _capFile: capFile };
        });
      }
    } catch {}
  }
  if (!available.length) {
    console.log(`[buffer:tiktok] no rendered mp4s in ${tiktokDir}, skipping`);
    return { scheduled: [] };
  }
  const state = priorState || loadState();
  const scheduled = [];
  // Deterministic shuffle per date so same day always picks same 3 but varies across days
  const shuffled = [...available].sort((a, b) => {
    let ha = 23; for (const ch of (a.id + dateStr)) ha = (ha * 31 + ch.charCodeAt(0)) % 1000;
    let hb = 23; for (const ch of (b.id + dateStr)) hb = (hb * 31 + ch.charCodeAt(0)) % 1000;
    return ha - hb;
  }).slice(0, Math.min((config.tiktok && config.tiktok.maxPerDay) || 3, available.length));

  const times = randomizedTikTokTimes(dateStr, shuffled.length);
  let idx = 0;
  for (const deck of shuffled) {
    const capFile = path.join(tiktokDir, deck.id + ".txt");
    const text = fs.existsSync(capFile) ? fs.readFileSync(capFile, "utf8").trim() : `${deck.title}\n\n${(config.tiktok && config.tiktok.cta) || ""}`;
    const due = toIso(dateStr, times[idx]);
    const key = `tiktok${idx}`;
    if (state[dateStr] && state[dateStr][key]) {
      console.log(`[buffer:tiktok] already scheduled ${key} for ${dateStr} (buffer ${state[dateStr][key].bufferId})`);
      idx++;
      continue;
    }
    const videoUrl = tiktokVideoUrl(deck.id + ".mp4");
    const channelId = dry ? (config.buffer && config.buffer.tiktokChannelId) || (config.buffer && config.buffer.channelId) || "CHANNEL_ID" : await resolveTikTokChannelId();
    const mutation = createPostMutation({ text, channelId, dueAt: due, videoUrl, platform: "tiktok" });
    if (dry) {
      console.log(`[buffer:tiktok] (dry) ${deck.id} @ ${due} (video ${videoUrl})`);
      scheduled.push({ tiktok: deck.id, due, videoUrl, text: text.slice(0, 80) + "…" });
      idx++;
      continue;
    }
    const data = await gql(mutation);
    const res = data.createPost || {};
    const pid = res.post && res.post.id;
    if (!pid) throw new Error(`Buffer rejected TikTok ${deck.id}: ${res.message || "no post id"}`);
    state[dateStr] = state[dateStr] || {};
    state[dateStr][key] = { deckId: deck.id, bufferId: pid, dueAt: due, niche: deck.niche || "", title: deck.title };
    console.log(`[buffer:tiktok] scheduled ${deck.id} -> ${pid} @ ${due}`);
    scheduled.push({ tiktok: deck.id, bufferId: pid, due });
    idx++;
  }
  if (!dry && priorState) { /* caller saves */ } else if (!dry) saveState(state);
  return { scheduled, state };
}

export async function scheduleX(dateStr, { dry = false, state: priorState } = {}) {
  const xDir = (config.x && config.x.postDir) || "out/x-ready";
  const manifestPath = path.join(xDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.log("[buffer:x] no manifest at "+manifestPath+" — run x-render first, skipping X");
    return { scheduled: [] };
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.date !== dateStr) throw new Error(`X manifest date ${manifest.date} != ${dateStr}`);
  // stealth gating — independent X hash so IG and X don't always skip same day
  if (!dry) {
    const n = parseInt(dateStr.replace(/-/g,""),10) ^ 0x9e3779b9;
    let hash = (n * 2654435761) % 100;
    if (hash < 0) hash += 100;
    if (hash >= 30) {
      console.log(`[buffer:x] Skipped - bi-weekly cycle (hash ${hash}/100, date ${dateStr})`);
      return { date: dateStr, scheduled: [], skipped: true };
    }
  }
  const times = (config.x && config.x.postingTimes) || ["06:00","12:00","17:00","20:00"];
  const state = priorState || loadState();
  const scheduled=[];
  // Use same stealth "2-4 posts" logic but seeded for X (xor)
  const n2 = parseInt(dateStr.replace(/-/g,""),10) ^ 0x85ebca6b;
  let hash2 = (n2 * 1664525) % 3;
  if (hash2<0) hash2+=3;
  const targetCount = 2 + hash2;
  const shuffled=[...manifest.posts].sort((a,b)=>{
    let ha=31; for(const ch of (a.id+dateStr+"x")) ha=(ha*31+ch.charCodeAt(0))%1000;
    let hb=31; for(const ch of (b.id+dateStr+"x")) hb=(hb*31+ch.charCodeAt(0))%1000;
    return ha-hb;
  }).slice(0, Math.min(targetCount, manifest.posts.length));
  const shuffledTimes=[...times].sort((a,b)=>{
    let ha=19; for(const ch of (a+dateStr+"x")) ha=(ha*37+ch.charCodeAt(0))%1000;
    let hb=19; for(const ch of (b+dateStr+"x")) hb=(hb*37+ch.charCodeAt(0))%1000;
    return ha-hb;
  });
  if(!dry) console.log(`[buffer:x] stealth: selected ${shuffled.length}/${manifest.posts.length} X posts for ${dateStr} times ${shuffledTimes.slice(0,shuffled.length).join(",")}`);
  let timeIdx=0;
  for(const post of shuffled){
    const due=toIso(dateStr, shuffledTimes[timeIdx % shuffledTimes.length] || times[post.slot] || times[0]);
    timeIdx++;
    // X state key namespaced to avoid colliding with IG slot keys
    const xKey=`x${post.slot}`;
    if(state[dateStr] && state[dateStr][xKey]){
      console.log(`[buffer:x] already scheduled ${xKey} for ${dateStr} (buffer ${state[dateStr][xKey].bufferId})`);
      continue;
    }
    const urls=xMediaUrls(post);
    // X captions already 280-char via x-generator; fallback to post.caption
    let text=post.caption||"";
    // Ensure link is present if available and caption didn't already contain it
    if(post.link && !text.includes(post.link)) text = (text.trim()+" "+post.link).trim();
    const channelId=dry ? (config.buffer&&config.buffer.xChannelId) || (config.buffer&&config.buffer.channelId) || "CHANNEL_ID" : await resolveXChannelId();
    const mutation=createPostMutation({ text, channelId, dueAt: due, imageUrls: urls, platform:"x" });
    if(dry){
      scheduled.push({ slot: post.slot, title: post.title, due, urls, text: text.slice(0,80)+"…", chars: text.length });
      console.log(`[buffer:x] (dry) slot ${post.slot} "${post.title}" @ ${due} (${text.length} chars, ${urls.length} imgs)`);
      continue;
    }
    const data=await gql(mutation);
    const res=data.createPost||{};
    const pid=res.post&&res.post.id;
    if(!pid) throw new Error(`Buffer rejected X slot ${post.slot} ("${post.title}"): ${res.message||"no post id"}`);
    state[dateStr]=state[dateStr]||{};
    state[dateStr][xKey]={ postId: post.id, bufferId: pid, dueAt: due, niche: post.niche||"", title: post.title, platform:"x" };
    console.log(`[buffer:x] scheduled slot ${post.slot} "${post.title}" -> ${pid} @ ${due}`);
    scheduled.push({ slot: post.slot, title: post.title, bufferId: pid, dueAt: due });
  }
  if(!dry && !priorState) saveState(state);
  return { date: dateStr, scheduled, state };
}

// Reel niche comes from the reel script's deck (data/reel.json) so the boost
// agent can attribute reel performance to a niche for rotation weighting.
function reelNiche(dateStr) {
  try {
    const ymd = dateStr.replace(/-/g, "");
    if (fs.existsSync("data/reel.json")) {
      const r = JSON.parse(fs.readFileSync("data/reel.json", "utf8"));
      if (r && r.date && String(r.date).replace(/-/g, "") === ymd && r.deck && r.deck.niche) return r.deck.niche;
    }
  } catch {}
  return "";
}

// Refresh one or more already-scheduled Buffer posts with the current plan's
// text + media (editPost replaces the whole post; dueAt is preserved).
export async function updateSlots(dateStr, { dry = false, slots = [] } = {}) {
  const plan = loadPlan();
  if (!plan || plan.date !== dateStr) throw new Error(`No plan for ${dateStr} (have ${plan ? plan.date : "none"})`);
  const manifestPath = path.join(config.instagram.postDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) throw new Error("No manifest.json — run ig-render first");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.date !== dateStr) throw new Error(`Manifest date ${manifest.date} != ${dateStr}`);
  const state = loadState();
  const day = state[dateStr] || {};
  const targets = slots.length
    ? slots
    : Object.keys(day).filter((k) => /^\d+$/.test(k)).map(Number).sort((a, b) => a - b);
  const updated = [];
  for (const slot of targets) {
    const rec = day[slot];
    if (!rec || !rec.bufferId || String(rec.bufferId).startsWith("web-")) {
      console.log(`[buffer] slot ${slot}: ${rec ? "not a Buffer post (" + rec.bufferId + ")" : "not scheduled"} — skipping`);
      continue;
    }
    const post = manifest.posts.find((p) => p.slot === slot);
    if (!post) {
      console.log(`[buffer] slot ${slot}: no post in manifest — skipping`);
      continue;
    }
    const text = captionForPost(post);
    const urls = postMediaUrls(post);
    const mutation = editPostMutation({ id: rec.bufferId, text, dueAt: rec.dueAt, imageUrls: urls });
    if (dry) {
      console.log(`[buffer] (dry) slot ${slot} "${post.title}" -> ${rec.bufferId} @ ${rec.dueAt} (${urls.length} assets, caption ${text.length} chars)`);
      console.log(`        caption: ${text.slice(0, 90).replace(/\n/g, " ")}…`);
      console.log(`        asset 0: ${urls[0] || "(none)"}`);
      updated.push({ slot, bufferId: rec.bufferId, text: text.slice(0, 80) + "…", urls });
      continue;
    }
    const data = await gql(mutation);
    const res = data.editPost || {};
    if (res.post && res.post.id) {
      console.log(`[buffer] updated slot ${slot} "${post.title}" -> ${res.post.id} (status ${res.post.status}) @ ${rec.dueAt}`);
      updated.push({ slot, bufferId: rec.bufferId, status: res.post.status });
    } else {
      throw new Error(`Buffer editPost failed for slot ${slot} (${rec.bufferId}): ${res.message || "no post id in response"}`);
    }
  }
  return { date: dateStr, updated };
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

// Delete a scheduled Buffer post by its post id (used to pull duplicate posts
// when publishing moves between systems).
export async function deletePost(postId, { dry = false } = {}) {
  if (!postId) throw new Error("deletePost requires a Buffer post id");
  if (dry) {
    console.log(`[buffer] (dry) would delete post ${postId}`);
    return { id: postId, dry: true };
  }
  const mutation = `mutation { deletePost(input: { id: ${JSON.stringify(postId)} }) { ... on DeletePostSuccess { id } ... on VoidMutationError { message } } }`;
  const data = await gql(mutation);
  const res = data.deletePost || {};
  if (!res.id) throw new Error(`Buffer deletePost failed for ${postId}: ${res.message || "no id in response"}`);
  console.log(`[buffer] deleted post ${postId}`);
  return { id: res.id };
}

export default { scheduleDate, scheduleReel, scheduleTikTok, scheduleX, updateSlots, cmdStatus, deletePost };
export { gql, repoBase, resolveChannelId, resolveTikTokChannelId, resolveXChannelId, createPostMutation, loadState, saveState, aestDate, toIso, deletePost as deletePostNamed, scheduleTikTok as scheduleTikTokNamed, scheduleX as scheduleXNamed };

// Direct run: `node src/buffer-publish.js status | channels | schedule [--date=YYYYMMDD] [--dry] [--reel] [--tiktok] [--x] | update [--date=YYYYMMDD] [--slots=1,2] [--dry] | tiktok [--date=YYYY-MM-DD] [--dry] | x [--date=YYYY-MM-DD] [--dry]`
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
      const r = await scheduleDate(date, { dry: has("dry"), reel: has("reel") });
      if (has("tiktok")) {
        const state = loadState();
        await scheduleTikTok(date, { dry: has("dry"), state });
        if (!has("dry")) saveState(state);
      }
      if (has("x")) {
        const state = loadState();
        await scheduleX(date, { dry: has("dry"), state });
        if (!has("dry")) saveState(state);
      }
    } else if (cmd === "tiktok") {
      const date = (flag("date") || aestDate()).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
      await scheduleTikTok(date, { dry: has("dry") });
    } else if (cmd === "x") {
      const date = (flag("date") || aestDate()).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
      await scheduleX(date, { dry: has("dry") });
    } else if (cmd === "update") {
      const date = (flag("date") || aestDate()).replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3");
      const slots = (flag("slots") || "").split(",").map((s) => parseInt(s, 10)).filter((n) => !isNaN(n));
      await updateSlots(date, { dry: has("dry"), slots });
    } else if (cmd === "delete") {
      const id = flag("id");
      if (!id) throw new Error("delete requires --id=<buffer post id>");
      await deletePost(id, { dry: has("dry") });
    } else {
      console.log("Usage: node src/buffer-publish.js status | channels | schedule [--date=YYYY-MM-DD] [--dry] [--reel] [--tiktok] [--x] | tiktok [--date=YYYY-MM-DD] [--dry] | x [--date=YYYY-MM-DD] [--dry] | update [--date=YYYY-MM-DD] [--slots=1,2] [--dry] | delete --id=<post id> [--dry]");
    }
  };

  run()
    .then(async () => {
      await new Promise((r) => setTimeout(r, 150));
      process.exit(0);
    })
    .catch((e) => {
      console.error("[buffer] " + e.message);
      setTimeout(() => process.exit(1), 150);
    });
}