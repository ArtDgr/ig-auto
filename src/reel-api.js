import fs from "node:fs";
import path from "node:path";
import config from "../config.json" with { type: "json" };
import { notify } from "./notify.js";

const reel = config.instagramReel || {};
const api = reel.api || {};
const DIR = reel.postDir || "out/instagram-reels";
const VER = api.graphVersion || "v21.0";
const GRAPH = `https://graph.facebook.com/${VER}`;

function log(...a) {
  console.log("[" + new Date().toLocaleTimeString() + "] " + a.join(" "));
}
function todayKey() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10).replace(/-/g, "");
}

function pending() {
  if (!fs.existsSync(DIR)) return null;
  const prefix = todayKey() + "-";
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".mp4"))
    .filter((f) => !fs.existsSync(path.join(DIR, f.replace(/\.mp4$/, ".done"))))
    .sort();
  if (!files.length) return null;
  const v = files[0];
  const capFile = path.join(DIR, v.replace(/\.mp4$/, ".txt"));
  return {
    file: path.join(DIR, v),
    caption: fs.existsSync(capFile) ? fs.readFileSync(capFile, "utf8").trim() : ""
  };
}

async function graph(pathname, method = "GET", body = null) {
  const opts = { method, timeout: 60000 };
  if (body) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  const url = `${GRAPH}/${pathname}?access_token=${encodeURIComponent(api.token)}`;
  const r = await fetch(url, opts).catch((e) => { throw new Error("Graph fetch failed: " + e.message); });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const m = (j.error && (j.error.error_user_msg || j.error.message)) || ("HTTP " + r.status);
    throw new Error("Graph API: " + m);
  }
  return j;
}

async function uploadToHost(filePath) {
  const host = api.host || "https://uguu.se/upload";
  const b = await fs.promises.readFile(filePath);
  const fd = new FormData();
  fd.append("files[]", new Blob([b]), path.basename(filePath));
  const r = await fetch(host, { method: "POST", body: fd, timeout: 120000 }).catch((e) => {
    throw new Error("Upload to " + host + " failed: " + e.message);
  });
  const t = await r.text();
  let url = "";
  try {
    const j = JSON.parse(t);
    url = j.files && j.files[0] && j.files[0].url ? j.files[0].url : "";
  } catch {}
  if (!url) throw new Error("Host did not return a file URL (" + r.status + ": " + t.slice(0, 120) + ")");
  return url;
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function publishReel(file, caption) {
  const userId = String(api.igUserId || "").trim();
  if (!userId) throw new Error("instagramReel.api.igUserId not set. Run: node src/reel-api.js resolve-ig (after token) ");
  log("uploading " + path.basename(file) + " -> " + (api.host || "uguu.se"));
  const videoUrl = await uploadToHost(file);
  log("public url: " + videoUrl);

  log("creating REELS container…");
  const container = await graph(
    `${userId}/media`,
    "POST",
    {
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      share_to_feed: api.shareToFeed !== false
    }
  );
  const containerId = container.id;
  log("container " + containerId + " created; waiting for FINISHED…");

  let status_code = "IN_PROGRESS";
  for (let i = 0; i < 40; i++) {
    await sleep(5000);
    const st = await graph(`${containerId}?fields=status_code,status`);
    status_code = st.status_code || st.status;
    if (status_code === "FINISHED") break;
    if (status_code === "ERROR") throw new Error("Meta could not process the video: " + JSON.stringify(st));
    log("  container status: " + status_code);
  }
  if (status_code !== "FINISHED") throw new Error("Timed out waiting for container FINISHED");

  log("publishing…");
  const pub = await graph(`${userId}/media_publish`, "POST", { creation_id: containerId });
  log("PUBLISHED — media id " + pub.id);
  return pub.id;
}

async function publishCards({ dryRun = false } = {}) {
  const userId = String(api.igUserId || "").trim();
  if (!userId) throw new Error("instagramReel.api.igUserId not set. Run: node src/reel-api.js resolve-ig");
  const postDir = config.instagram?.postDir || "out/instagram-ready";
  const manPath = path.join(postDir, "manifest.json");
  if (!fs.existsSync(manPath)) { log("No card manifest at " + manPath); return { posted: 0 }; }
  const m = JSON.parse(fs.readFileSync(manPath, "utf8"));
  const posts = (m.posts || []).filter(
    (p) => (p.media || []).length && !fs.existsSync(path.join(postDir, p.id, ".posted"))
  );
  if (!posts.length) { log("No pending cards in manifest."); return { posted: 0 }; }
  let posted = 0;
  const titles = [];
  for (const p of posts) {
    const media = (p.media || []).filter((f) => f && fs.existsSync(f));
    if (!media.length) continue;
    log("card [" + p.slot + "] " + p.title + " (" + media.length + " img)");
    if (dryRun) { log("[dry-run] would publish card -> " + p.id); continue; }

    const urls = [];
    for (const f of media) {
      const u = await uploadToHost(f);
      urls.push(u);
      log("  image url: " + u.slice(0, 78));
    }
    const children = [];
    for (const u of urls) {
      const c = await graph(`${userId}/media`, "POST", { image_url: u, is_carousel_item: true });
      children.push(c.id);
      await sleep(1200);
    }
    let containerId;
    if (children.length > 1) {
      log("creating CAROUSEL container…");
      const car = await graph(`${userId}/media`, "POST", { media_type: "CAROUSEL", children: children.join(","), caption: p.caption });
      containerId = car.id;
    } else {
      log("creating IMAGE container…");
      const im = await graph(`${userId}/media`, "POST", { image_url: urls[0], caption: p.caption });
      containerId = im.id;
    }
    log("container " + containerId + " created; waiting for FINISHED…");
    let status_code = "IN_PROGRESS";
    for (let i = 0; i < 40; i++) {
      await sleep(5000);
      const st = await graph(`${containerId}?fields=status_code,status`);
      status_code = st.status_code || st.status;
      if (status_code === "FINISHED") break;
      if (status_code === "ERROR") throw new Error("Meta could not process the card: " + JSON.stringify(st));
      log("  container status: " + status_code);
    }
    if (status_code !== "FINISHED") throw new Error("Timed out waiting for card container FINISHED");

    const pub = await graph(`${userId}/media_publish`, "POST", { creation_id: containerId });
    fs.writeFileSync(path.join(postDir, p.id, ".posted"), new Date().toISOString());
    posted++;
    titles.push(p.title);
    log("PUBLISHED card media id " + pub.id);
    await sleep(3000);
  }
  if (posted > 0) {
    await notify({
      title: "IG card published (API)",
      message: posted + (posted === 1 ? " card" : " cards") + " live via Graph API:\n" + titles.map((t) => "• " + String(t).replace(/\s+/g, " ").slice(0, 60)).join("\n")
    });
  }
  return { posted };
}

async function statusCheck() {
  if (!api.token) {
    console.log("No token configured. Add after setup:");
    console.log('  config.json -> instagramReel.api.token = "<long-lived User token>"');
    console.log("Setup happens once at developers.facebook.com (10 min).");
    console.log("Commands: node src/reel-api.js status | resolve-ig | publish --dry");
    return false;
  }
  const me = await graph("me?fields=id,name");
  console.log("Token OK -> FB user " + me.id + " (" + me.name + ")");
  if (!api.igUserId) {
    console.log("igUserId not set yet. Run: node src/reel-api.js resolve-ig");
  }
  return true;
}

async function resolveIg() {
  if (!api.token) return statusCheck();
  const me = await graph("me?fields=id,name");
  console.log("Token OK -> FB user " + me.id + " (" + me.name + ")");
  const acc = await graph("me/accounts?fields=id,name,instagram_business_account");
  const pages = (acc.data || []).filter((p) => p.instagram_business_account);
  if (!pages.length) {
    console.log("No Facebook Page is linked to an Instagram business account.");
    console.log("Do: IG app -> Settings -> Account Center -> Connects, or Link accounts, then re-run.");
    return;
  }
  for (const p of pages) {
    const igId = p.instagram_business_account && p.instagram_business_account.id;
    console.log("Page '" + p.name + "' (id " + p.id + ") -> IG business account id " + igId);
    console.log('Set config.json -> instagramReel.api.igUserId = "' + igId + '" and api.enabled = true');
  }
}

function main() {
  const cmd = process.argv[2] || "publish";
  const dry = process.argv.includes("--dry");
  if (cmd === "status") {
    statusCheck().catch((e) => console.error("Status error: " + e.message));
    return;
  }
  if (cmd === "resolve-ig") {
    resolveIg().catch((e) => console.error("Resolve error: " + e.message));
    return;
  }
  if (cmd === "cards") {
    if (!api.token || !api.igUserId) {
      console.log("Reel API not configured. Run `node src/reel-api.js status` for setup directions. (Idle — awaiting Meta setup.)");
      process.exitCode = 0;
      return;
    }
    publishCards({ dryRun: dry })
      .then((r) => { if (!r.posted) process.exitCode = 1; })
      .catch((e) => { console.error("Cards error: " + e.message); process.exitCode = 1; });
    return;
  }
  // publish
  if (!api.token || !api.igUserId) {
    console.log("Reel API not configured. Run `node src/reel-api.js status` for setup directions. (Idle — awaiting Meta setup.)");
    process.exitCode = 0;
    return;
  }
  const item = pending();
  if (!item) {
    log("No reel pending for today (" + todayKey() + "). Generate via: node src/scheduler.js reel");
    return;
  }
  if (dry) {
    log("[dry-run] would publish reel -> " + path.basename(item.file) + " | caption=" + JSON.stringify(item.caption.slice(0, 70) + "..."));
    return;
  }
  publishReel(item.file, item.caption)
    .then(async (id) => {
      fs.writeFileSync(path.join(DIR, path.basename(item.file).replace(/\.mp4$/, ".done")), new Date().toISOString());
      log("Done. Reel media id " + id + " marked posted.");
      await notify({
        title: "IG reel published",
        message: "Daily reel is live on @" + (config.instagram?.handle || "theitsupportguru") + " (media id " + id + ")."
      });
    })
    .catch((e) => {
      console.error("Reel API error: " + e.message);
      process.exitCode = 1;
    });
}

// Only auto-run the CLI when this file is executed directly, so post-runner can
// import publishCards without triggering a publish on import.
import { pathToFileURL } from "node:url";
const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  main();
}

export { publishCards };
