// Keeps the TikTok session alive without a human.
// Mirrors src/session-check.js but for TikTok (Edge profile).
// Runs 05:10 alongside IG check: valid -> 0, else try credential auto-login.
import fs from "node:fs";
import path from "node:path";
import { launchStealth } from "./stealth.js";
import config from "../config.json" with { type: "json" };

const bot = config.tiktokBot;
const CREDS_FILE = path.join(process.cwd(), bot.credentialsFile || "credentials/tiktok.json");

function loadCreds() {
  try { if (fs.existsSync(CREDS_FILE)) return JSON.parse(fs.readFileSync(CREDS_FILE, "utf8")); } catch {}
  return null;
}

async function hasSessionCookies(ctx) {
  try {
    const cks = await ctx.cookies("https://www.tiktok.com").catch(() => []);
    return cks.some((c) => ["sessionid", "sessionid_ss", "sid_tt"].includes(c.name) && (c.value || "").length > 4);
  } catch { return false; }
}

const creds = loadCreds();
let ok = false;
let reason = "no-creds";
try {
  const ctx = await launchStealth(config, { headless: true });
  const page = await ctx.newPage();
  await page.goto("https://www.tiktok.com/", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));
  if (await hasSessionCookies(ctx)) {
    console.log("[tiktok-session-check] OK session valid");
    ok = true;
  } else if (creds && (creds.username || creds.email) && creds.password) {
    console.log("[tiktok-session-check] session expired — credential login requires a window (run tiktok:login), not headless");
    reason = "needs-manual-login";
    // Don't attempt headless credential login here — TikTok almost always needs captcha/slider.
    // The scheduled tiktok-bot slot itself will attempt autoLogin and escalate with a clear error.
    ok = false;
  } else {
    console.log("[tiktok-session-check] FAIL no session and no credentials/tiktok.json");
    ok = false;
  }
  await ctx.close().catch(() => {});
} catch (e) {
  console.log("[tiktok-session-check] FAIL " + e.message);
  ok = false;
  reason = e.message;
}
process.exitCode = ok ? 0 : 1;
