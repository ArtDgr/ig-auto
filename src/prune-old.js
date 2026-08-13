import fs from "node:fs";
import path from "node:path";
import config from "../config.json" with { type: "json" };

const KEEP_DAYS = 14;
const dir = config.instagram.postDir;
const now = new Date();
const cutoff = new Date(now.getTime() - KEEP_DAYS * 86400000).toISOString().slice(0, 10);

let removed = 0;
if (fs.existsSync(dir)) {
  for (const id of fs.readdirSync(dir)) {
    const full = path.join(dir, id);
    if (!fs.statSync(full).isDirectory()) continue;
    const m = /^(\d{8})-/.exec(id);
    if (!m) continue;
    const d = `${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}`;
    if (d < cutoff) {
      fs.rmSync(full, { recursive: true, force: true });
      removed++;
    }
  }
}

// Drop scheduled-state entries for dates long gone so the state file stays small.
const stateFile = path.join("data", "buffer-scheduled.json");
if (fs.existsSync(stateFile)) {
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
    let dropped = 0;
    for (const d of Object.keys(state)) {
      if (d < cutoff) {
        delete state[d];
        dropped++;
      }
    }
    if (dropped) {
      fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
      console.log(`[prune] dropped ${dropped} stale scheduled-day(s)`);
    }
  } catch {}
}

// Prune old reels (mp4 + txt) so committed media stays within the retention window.
const reelDir = (config.instagramReel && config.instagramReel.postDir) || "out/instagram-reels";
let removedReels = 0;
if (fs.existsSync(reelDir)) {
  for (const f of fs.readdirSync(reelDir)) {
    const m = /^(\d{8})-/.exec(f);
    if (!m) continue;
    const d = `${m[1].slice(0, 4)}-${m[1].slice(4, 6)}-${m[1].slice(6, 8)}`;
    if (d < cutoff) {
      fs.rmSync(path.join(reelDir, f), { force: true });
      removedReels++;
    }
  }
}

if (removed) console.log(`[prune] removed ${removed} post dir(s) older than ${cutoff}`);
if (removedReels) console.log(`[prune] removed ${removedReels} reel file(s) older than ${cutoff}`);
