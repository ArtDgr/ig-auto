import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";
import fs from "node:fs";
import path from "node:path";

const context = await launchStealth(config, { headless: false });
const page = await context.newPage();
console.log("launched, navigating…");
await page.goto("https://www.tiktok.com/login", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(8000);
console.log("URL:", page.url());
await page.screenshot({ path: "out/diag-headful.png" });
const txt = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 800) : "no body");
console.log("BODY TEXT:", JSON.stringify(txt));
await page.waitForTimeout(15000);
console.log("still alive after 23s total");
await context.close().catch(() => {});
process.exit(0);