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

  // Dump what's actually on the page around the QR area.
  for (let round = 0; round < 4; round++) {
    const info = await page.evaluate(() => {
      const els = document.querySelectorAll("img, canvas, svg, [data-e2e], [role='img'], section");
      const found = [];
      els.forEach((el) => {
        const src = el.getAttribute && (el.getAttribute("src") || "");
        const alt = el.getAttribute && (el.getAttribute("alt") || "");
        const d = el.getAttribute && (el.getAttribute("data-e2e") || "");
        if (/qr|code/i.test(src + alt + d)) {
          found.push({ tag: el.tagName, e2e: d, alt: alt.slice(0, 60), src: src.slice(0, 80) });
        }
      });
      const text = (document.body ? document.body.innerText : "").slice(0, 600);
      return { found, text };
    });
    log(`round ${round}: QR-ish elements=${info.found.length}`);
    info.found.forEach((f) => log("   ", JSON.stringify(f)));
    if (round === 0) log("PAGE TEXT:", JSON.stringify(info.text));
    await page.waitForTimeout(15000);
  }
  await page.screenshot({ path: "out/qr-state.png" }).catch(() => {});
  await context.close().catch(() => {});
  process.exit(0);
} catch (e) {
  log("ERR: " + e.message);
  await context.close().catch(() => {});
  process.exit(1);
}