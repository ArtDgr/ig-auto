// One-time "reel path" reminder (scheduled tomorrow by install-task.ps1).
// If the Meta Graph token is configured: reports ready and removes the sticky
// reminder. If not: writes out/reel-reminder.txt with the exact unlock steps
// so the call-to-action survives even though the task only fires once.
import fs from "node:fs";
import path from "node:path";
import config from "../config.json" with { type: "json" };

const api = (config.instagramReel && config.instagramReel.api) || {};
const reelDir = path.join("out", "instagram-reels");
const REMINDER = path.join("out", "reel-reminder.txt");

const staged = fs.existsSync(reelDir)
  ? fs
      .readdirSync(reelDir)
      .filter(
        (f) =>
          f.endsWith(".mp4") &&
          !fs.existsSync(path.join(reelDir, f.replace(/\.mp4$/, ".done")))
      )
      .map((f) => path.join(reelDir, f))
  : [];

if (api.token && api.igUserId) {
  console.log(
    "[reel-check] OK — token + igUserId configured. Ready to publish " +
      staged.length +
      " staged reel(s) via: node src/reel-api.js resolve-ig && node src/reel-api.js publish"
  );
  fs.rmSync(REMINDER, { force: true });
  process.exit(0);
}

const lines = [
  "REEL REMINDER — action needed",
  "Generated: " + new Date().toLocaleString(),
  "",
  "Still no Meta Graph API token, so reels are staged but not published.",
  staged.length
    ? "Staged: " + staged.map((s) => path.basename(s)).join(", ")
    : "Staged: none yet (daily build renders one each morning).",
  "",
  "Unlock steps (FB account must be ~2 days old, created 2026-08-12):",
  "  1. Instagram > Followers > Link with Facebook — link IG to a Professional FB Page.",
  "  2. developers.facebook.com > Create App (Business type) > add the Instagram product.",
  "  3. Graph API Explorer > pick the app + the linked IG account > add scopes:",
  "     instagram_basic, instagram_content_publish + pages_show_list.",
  "  4. Generate token, exchange it for a 60-day token, paste into config.json:",
  "     \"instagramReel\": { \"api\": { \"token\": \"...\", \"igUserId\": \"...\", \"enabled\": true } }",
  "  5. Run:  node src/reel-api.js resolve-ig  then  node src/reel-api.js publish",
  "",
  "After that I can move the 3 daily image cards to the token path too, so the",
  "channel stops depending on the login session entirely. Once the token is in",
  "config.json, also set config.json -> instagram.publishVia = \"api\" so cards",
  "publish via the Graph API (reel-api.js cards) and never hit IG's flaky web",
  "composer (which A/B-tests a single-image variant that can't build carousels).",
].join("\n");

fs.mkdirSync("out", { recursive: true });
fs.writeFileSync(REMINDER, lines, "utf8");
console.log(
  "[reel-check] No Graph token — wrote reminder to " + REMINDER
);
process.exit(0);