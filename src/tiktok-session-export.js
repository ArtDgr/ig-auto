import fs from "node:fs";
import path from "node:path";
import { launchStealth } from "./stealth.js";
import config from "../config.json" with { type: "json" };

if (process.env.GITHUB_ACTIONS === "true") {
  console.error("[export] TikTok browser-cookie export is disabled in GitHub Actions.");
  process.exit(1);
}

// Exports the current local TikTok Edge profile cookies for local backup only.
// Usage: node src/tiktok-session-export.js
const dir = config.tiktokBot.profileDir;
const outB64 = path.join("out", "tiktok-cookies.b64");
const outJson = path.join("out", "tiktok-cookies.json");

const ctx = await launchStealth(config, { headless: true });
const cookies = await ctx.cookies("https://www.tiktok.com").catch(() => []);
await ctx.close().catch(() => {});

if (!cookies.length) {
  console.error("[export] no cookies found in " + dir + " — run npm run tiktok:login:qr first");
  process.exit(1);
}
const hasSession = cookies.some(c => ["sessionid","sessionid_ss","sid_tt"].includes(c.name) && c.value.length > 4);
fs.mkdirSync("out", { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(cookies, null, 2));
fs.writeFileSync(outB64, Buffer.from(JSON.stringify(cookies)).toString("base64"));
console.log(`[export] ${cookies.length} cookies -> ${outJson} + ${outB64} ${hasSession ? "(session OK)" : "(WARNING: no sessionid)"}`);
console.log("Do not upload browser cookies to GitHub Actions secrets or replay them in CI.");
