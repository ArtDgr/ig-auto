import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";

function log(...a) { console.log("[" + new Date().toLocaleTimeString() + "] " + a.join(" ")); }

const context = await launchStealth(config, { headless: false, profileDir: "profiles/tiktok-edge" });
const page = await context.newPage();
try {
  await page.goto("https://www.tiktok.com/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  const consent = page.getByRole("button", { name: /i accept|accept all|agree/i }).first();
  if (await consent.isVisible().catch(() => false)) await consent.click().catch(() => {});
  await page.waitForTimeout(1000);
  const qrTab = page.getByText(/use qr code/i, { exact: false }).first();
  if (await qrTab.isVisible().catch(() => false)) await qrTab.click().catch(() => {});
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    const qr = document.querySelector("[data-e2e='qr-code']");
    if (!qr) return { err: "no qr-code element" };
    return {
      innerHTML: qr.innerHTML.slice(0, 1200),
      qrText: qr.innerText.slice(0, 200)
    };
  });
  log("QR element innerHTML:", JSON.stringify(info));
  await context.close().catch(() => {});
  process.exit(0);
} catch (e) {
  log("ERR: " + e.message);
  await context.close().catch(() => {});
  process.exit(1);
}