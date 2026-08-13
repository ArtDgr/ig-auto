import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";

const context = await launchStealth(config, { headless: false, profileDir: "profiles/tiktok-edge" });
const page = await context.newPage();
try {
  // Fresh load -> brand-new QR code with a full ~60s validity window.
  await page.goto("https://www.tiktok.com/login", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);
  const consent = page.getByRole("button", { name: /i accept|accept all|agree/i }).first();
  if (await consent.isVisible().catch(() => false)) await consent.click().catch(() => {});
  await page.waitForTimeout(1000);
  const qrTab = page.getByText(/use qr code/i, { exact: false }).first();
  if (await qrTab.isVisible().catch(() => false)) await qrTab.click().catch(() => {});
  await page.waitForTimeout(2500);

  log("FRESH QR CODE LOADED — scan it NOW within ~60 seconds.");
  log("Phone: TikTok app -> Profile -> QR code -> scan.");
  log("If it expires, wait for the auto-refresh and scan the NEW code.");
  await page.screenshot({ path: "out/qr-fresh.png" });

  let waitedMin = 0;
  for (let i = 0; i < 600; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const cks = await context.cookies("https://www.tiktok.com").catch(() => []);
    if (cks.some((c) => ["sessionid", "sessionid_ss", "sid_tt"].includes(c.name) && (c.value || "").length > 4)) {
      log("SESSION CONFIRMED — close the window, done.");
      await page.close();
      await context.close();
      process.exit(0);
    }
    if (i % 60 === 59) {
      waitedMin++;
      log(`still waiting… ${waitedMin} min — the page auto-refreshes the QR; scan the current code.`);
    }
  }
  await page.close();
  await context.close();
  process.exit(1);
} catch (e) {
  console.error("qr error: " + e.message);
  await context.close().catch(() => {});
  process.exit(1);
}