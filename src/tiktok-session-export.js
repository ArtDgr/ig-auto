import fs from "node:fs";
import path from "node:path";
import { launchStealth } from "./stealth.js";
import config from "../config.json" with { type: "json" };

// Exports the current TikTok Edge profile cookies as base64 for GitHub Secret TIKTOK_COOKIES_B64
// Usage: node src/tiktok-session-export.js
// Then: gh secret set TIKTOK_COOKIES_B64 --body "$(cat tiktok-cookies.b64)"
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
console.log(`Next: gh secret set TIKTOK_COOKIES_B64 < ${outB64}`);
