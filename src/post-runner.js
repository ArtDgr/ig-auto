import { spawn } from "node:child_process";
import config from "../config.json" with { type: "json" };

// Posts one daily slot: IG card + TikTok video (headless dual-channel).
// TikTok uses the same curated pool but vertical 9:16 video with #fyp.
// Usage:  node src/post-runner.js --slot 0|1|2 [--dry] [--force]
// IG publishing: web-composer bot by default; set config.instagram.publishVia =
// "api" to publish cards via the Meta Graph API (no browser/composer flakiness).
// TikTok: when buffer.ownsPosting the cloud queue is primary; local tiktok-bot
// is the headless fallback (enabled via tiktokBot.enabled).

function runNode(script, extra) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...extra], { stdio: "inherit" });
    child.on("close", (code) => resolve(code || 0));
    child.on("error", (err) => {
      console.error("failed to start " + script + ": " + err.message);
      resolve(1);
    });
  });
}

function main() {
  const args = process.argv.slice(2);
  const slot = args.find((a) => a.startsWith("--slot="));
  const dry = args.includes("--dry");
  const force = args.includes("--force");

  const igArgs = [];
  if (slot) igArgs.push(slot);
  if (dry) igArgs.push("--dry");
  if (force) igArgs.push("--force");

  const slots = {
    0: "06:30 slot",
    1: "10:00 slot",
    2: "13:00 slot"
  };
  console.log(`\n=== Posting run — ${slots[slot ? parseInt(slot.split("=")[1], 10) : 0] || "unspecified"} (${dry ? "DRY-RUN" : "live"}) ===`);

  (async () => {
    // QA gate: nothing posts until the finished content passes every check.
    const qaCode = await runNode("src/qa-check.js", []);
    if (qaCode !== 0) {
      console.error("[post-runner] QA FAILED — refusing to post. Fix the flagged defects, then re-verify with `node src/qa-check.js` (must exit 0).");
      process.exit(1);
    }

    let igCode = 0;
    // When Buffer owns posting (config.buffer.ownsPosting), local IG publishing
    // is a no-op — the scheduled queue in Buffer is the single source of truth.
    // This prevents duplicates if legacy Windows scheduled tasks still fire.
    if (config.buffer?.ownsPosting) {
      console.log("[post-runner] Buffer owns posting (config.buffer.ownsPosting=true) — skipping local IG bot to avoid duplicates.");
    } else if (config.instagram?.enabled !== false) {
      if (config.instagram?.publishVia === "api") {
        const apiArgs = ["cards", dry ? "--dry" : ""].filter(Boolean);
        igCode = await runNode("src/reel-api.js", apiArgs);
      } else {
        igCode = await runNode("src/instagram-bot.js", igArgs);
      }
    } else {
      console.log("[post-runner] Instagram disabled (instagram.enabled=false), skipping.");
    }
    let tkCode = 0;
    const tiktokEnabled = config.tiktokBot?.enabled !== false && (config.distribution?.tiktok ?? 0) > 0;
    const bufferOwnsTiktok = config.buffer?.ownsPosting === true;
    if (bufferOwnsTiktok && tiktokEnabled) {
      console.log("[post-runner] Buffer owns TikTok posting — skipping local tiktok-bot (cloud queue is truth).");
    } else if (tiktokEnabled) {
      const tkArgs = [];
      if (dry) tkArgs.push("--dry");
      if (force) tkArgs.push("--force");
      if (process.env.POST_TIKTOK === "0") {
        console.log("[post-runner] TikTok skipped (POST_TIKTOK=0)");
      } else {
        tkCode = await runNode("src/tiktok-bot.js", tkArgs);
      }
    } else {
      console.log("[post-runner] TikTok disabled (tiktokBot.enabled=false or distribution.tiktok=0), skipping.");
    }
    // X local fallback (Buffer is primary when x.ownsPosting / buffer.ownsPosting)
    let xCode = 0;
    const xQaCode = await runNode("src/x-qa-check.js", []);
    if (xQaCode !== 0) {
      console.log("[post-runner] X QA FAILED — X posts will be skipped until fixed.");
    } else {
      const xEnabled = config.x?.enabled !== false && (config.distribution?.x ?? 0) > 0;
      const bufferOwnsX = config.x?.ownsPosting === true || config.buffer?.ownsPosting === true;
      if (bufferOwnsX && xEnabled) {
        console.log("[post-runner] Buffer owns X posting — skipping local x-bot (cloud queue is truth).");
      } else if (xEnabled) {
        const xArgs = [];
        if (slot) xArgs.push(slot);
        if (dry) xArgs.push("--dry");
        if (force) xArgs.push("--force");
        xCode = await runNode("src/x-bot.js", xArgs);
      } else {
        console.log("[post-runner] X disabled (x.enabled=false or distribution.x=0), skipping.");
      }
    }
    console.log(`\nPosting run complete. IG=${igCode}, TikTok=${tkCode}, X=${xCode}`);
    process.exit(Math.max(igCode, tkCode, xCode));
  })().catch((e) => {
    console.error("Posting run error: " + e.message);
    process.exit(1);
  });
}

main();