import fs from "node:fs";
import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";

function log(...a) { console.log("[" + new Date().toLocaleTimeString() + "] " + a.join(" ")); }

const context = await launchStealth(config, { headless: false, profileDir: "profiles/tiktok-edge" });
const page = await context.newPage();
try {
  // Fresh load => new QR code with a full validity window.
  await page.goto("https://www.tiktok.com/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);
  const consent = page.getByRole("button", { name: /i accept|accept all|agree/i }).first();
  if (await consent.isVisible().catch(() => false)) await consent.click().catch(() => {});
  await page.waitForTimeout(1000);

  const qrTab = page.getByText(/use qr code/i, { exact: false }).first();
  if (await qrTab.isVisible().catch(() => false)) {
    await qrTab.click().catch(() => {});
    await page.waitForTimeout(2500);
  }
  const qrImg = page.locator("img[src*='qrcode' i], img[src*='qr-code' i], [data-e2e='qrcode'], canvas, svg").first();
  const qrVisible = await qrImg.isVisible().catch(() => false);
  log("QR code visible: " + qrVisible);
  await page.screenshot({ path: "out/qr-fresh.png" });

  log("");
  log("──────────────────────────────────────────────────────────────");
  log("  Edge window opened showing TikTok QR code. SCAN IT NOW.");
  log("  Phone: TikTok app -> Profile -> 3-line menu -> QR code,");
  log("  or camera scan. Confirm on the phone within ~60 seconds.");
  log("  If it expires, the page refreshes a new code — scan that.");
  log("──────────────────────────────────────────────────────────────");

  let waitedMin = 0;
  for (let i = 0; i < 1800; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const cks = await context.cookies("https://www.tiktok.com").catch(() => []);
    if (cks.some((c) => ["sessionid", "sessionid_ss", "sid_tt"].includes(c.name) && (c.value || "").length > 4)) {
      log("SESSION CONFIRMED — done! Close the window. The bot can now post headless.");
      await page.screenshot({ path: "out/qr-session.png" }).catch(() => {});
      await page.close();
      await context.close();
      process.exit(0);
    }
    if (i % 30 === 29) {
      log("waiting… scan the QR code in the window and confirm on your phone.");
    }
  }
  log("No session after 30 min. Window closed.");
  await page.close();
  await context.close();
  process.exit(1);
} catch (e) {
  console.error("QR login error: " + e.message);
  await context.close().catch(() => {});
  process.exit(1);
}