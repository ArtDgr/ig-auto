// TikTok QA gate — FREE, local, no API. Mirrors src/qa-check.js for IG.
// Checks every out/tiktok-ready/*.mp4 + .txt before tiktok-bot may post:
//   1. video exists, non-empty (>1KB), has matching caption .txt
//   2. caption non-empty, <= 2200 chars, has >=3 hashtags, has CTA/follow line
//   3. no HTML entities, no placeholder filler, no retail-promo copy
//   4. portrait 1080x1920 when ffprobe is available (warn-only if missing)
// Usage: node src/tiktok-qa-check.js  (exit 0 = PASS, 1 = FAIL)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import config from "../config.json" with { type: "json" };

const exec = promisify(execFile);
const DIR = (config.tiktok && config.tiktok.postDir) || (config.tiktokBot && config.tiktokBot.postDir) || "out/tiktok-ready";
const PLACEHOLDERS = [
  "this is moving the whole field right now",
  "what changed:",
  "launch hype",
  "good morning",
  "hope you had a great weekend",
  "subscribe",
  "unsubscribe",
];
const PROMO_RE = /(20%\s*off|% off\b|use code|shop now|buy now|link in bio to buy|discount code)/i;

async function probeSize(file) {
  try {
    const r = await exec("ffprobe", ["-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=width,height", "-of", "csv=p=0", file]);
    const [w, h] = String(r.stdout || "").trim().split(",").map(Number);
    return { w, h };
  } catch { return null; }
}

export async function checkTikTok() {
  const errors = [];
  if (!fs.existsSync(DIR)) return { ok: false, errors: ["no dir " + DIR + " (run scheduler render first)"], videos: 0 };
  const vids = fs.readdirSync(DIR).filter((f) => f.endsWith(".mp4")).sort();
  if (!vids.length) return { ok: false, errors: ["no tiktok mp4s in " + DIR], videos: 0 };
  let pending = 0;
  for (const v of vids) {
    const where = v;
    const full = path.join(DIR, v);
    const st = fs.statSync(full);
    if (st.size < 1000) { errors.push(where + " — file empty (" + st.size + "B)"); continue; }
    if (fs.existsSync(path.join(DIR, v.replace(/\.mp4$/, ".done")))) continue; // already posted
    pending++;
    const capFile = path.join(DIR, v.replace(/\.mp4$/, ".txt"));
    if (!fs.existsSync(capFile)) { errors.push(where + " — caption .txt missing"); continue; }
    const cap = fs.readFileSync(capFile, "utf8").trim();
    if (!cap) { errors.push(where + " — caption empty"); continue; }
    if (cap.length > 2200) errors.push(where + " — caption " + cap.length + " chars > 2200 TikTok limit");
    const tags = (cap.match(/#[\p{L}\p{N}_]+/gu) || []);
    if (tags.length < 3) errors.push(where + " — only " + tags.length + " hashtag(s), need >=3");
    if (!/follow/i.test(cap)) errors.push(where + " — caption has no follow CTA");
    if (/&\w+;|&#\d+;/i.test(cap)) errors.push(where + " — lingering HTML entity in caption");
    const low = cap.toLowerCase();
    for (const ph of PLACEHOLDERS) if (low.includes(ph)) { errors.push(where + ' — placeholder text: "' + ph + '"'); break; }
    if (PROMO_RE.test(cap)) errors.push(where + " — promotional copy (discount/shop-now) rejected");
    const dim = await probeSize(full);
    if (dim && (dim.w !== 1080 || dim.h !== 1920)) errors.push(where + ` — not vertical 1080x1920 (got ${dim.w}x${dim.h})`);
  }
  if (!pending) errors.push("nothing pending to post (all .done or empty)");
  return { ok: errors.length === 0, errors, videos: vids.length, pending };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  checkTikTok().then((r) => {
    if (r.ok) { console.log(`[tiktok-qa] PASS ${r.pending}/${r.videos} pending video(s) clean in ${DIR}.`); process.exit(0); }
    console.log("[tiktok-qa] FAIL — " + r.errors.length + " defect(s):");
    for (const e of r.errors) console.log("  • " + e);
    process.exit(1);
  });
}

export default { checkTikTok };
