import fs from "node:fs";
import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";

function log(...a) { console.log("[" + new Date().toLocaleTimeString() + "] " + a.join(" ")); }

const context = await launchStealth(config, { headless: false, profileDir: "profiles/tiktok-edge" });
const page = await context.newPage();
try {
  await page.goto("https://www.tiktok.com", { waitUntil: "domcontentloaded", timeout: 60000 });
  log("navigated to", page.url());
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const alive = !context.browser() || (await context.pages()).length > 0;
    log(`t+${(i + 1) * 5}s alive=${alive}`);
  }
  log("survived 60s");
  await context.close().catch(() => {});
  process.exit(0);
} catch (e) {
  log("ERR: " + e.message);
  await context.close().catch(() => {});
  process.exit(1);
}