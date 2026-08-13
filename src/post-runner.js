import { spawn } from "node:child_process";
import config from "../config.json" with { type: "json" };

// Posts one daily slot: the matching Instagram post. The TikTok half is
// OPT-IN only (handled in a separate chat): set POST_TIKTOK=1 to run it here.
// Usage:  node src/post-runner.js --slot 0|1|2 [--dry] [--force]
// IG publishing: web-composer bot by default; set config.instagram.publishVia =
// "api" to publish cards via the Meta Graph API (no browser/composer flakiness).

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
    // Instagram is this channel's primary feed; only instagram.enabled=false or a
    // headless_placeholder/index.json launch toggle disables it. Other tools that
    // manage distribution.tiktok must never mute IG, so we don't read
    // distribution.instagram here.
    const igEnabled = config.instagram?.enabled !== false;
    if (igEnabled) {
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
    if (process.env.POST_TIKTOK === "1") {
      const tkArgs = [];
      if (dry) tkArgs.push("--dry");
      if (force) tkArgs.push("--force");
      tkCode = await runNode("src/tiktok-bot.js", tkArgs);
    } else {
      console.log("[post-runner] TikTok half skipped (managed in a separate chat; set POST_TIKTOK=1 to enable here).");
    }
    console.log(`\nPosting run complete. IG=${igCode}, TikTok=${tkCode}`);
    process.exit(Math.max(igCode, tkCode));
  })().catch((e) => {
    console.error("Posting run error: " + e.message);
    process.exit(1);
  });
}

main();