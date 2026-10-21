// Local QR bootstrap only. GitHub Actions must not bootstrap TikTok sessions.
// Opens TikTok's official QR login locally and stores any resulting session
// files locally only. Never upload or replay these browser cookies in CI.
// Usage: node src/tiktok-qr-bootstrap.js
import fs from "node:fs";
import path from "node:path";
import { launchStealth } from "./stealth.js";
import config from "../config.json" with { type: "json" };

const bot = config.tiktokBot;
const QR_PNG = path.join("out", "tiktok-qr.png");
const OUT_JSON = path.join("out", "tiktok-cookies.json");
const OUT_B64 = path.join("out", "tiktok-cookies.b64");
const WAIT_MS = 10 * 60 * 1000;

if (process.env.GITHUB_ACTIONS === "true") {
  console.error("[qr-bootstrap] TikTok session bootstrapping is disabled in GitHub Actions.");
  process.exit(1);
}

function hasSessionCookies(cks) {
  return cks.some((c) => ["sessionid", "sessionid_ss", "sid_tt"].includes(c.name) && (c.value || "").length > 4);
}

const ctx = await launchStealth(config, { headless: false });
const page = await ctx.newPage();
try {
  await page.goto(bot.baseUrl + "/login", { waitUntil: "domcontentloaded", timeout: 50000 });
  await page.waitForTimeout(2000);
  const consent = page.getByRole("button", { name: /accept all|i accept|agree/i }).first();
  if (await consent.isVisible().catch(() => false)) await consent.click().catch(() => {});
  await page.waitForTimeout(800);
  // Layered click: text node → role button → JS click. Headless bot-walls
  // can swallow one of these; xvfb headful normally takes the first.
  const qrTab = page.getByText(/use qr code/i).first();
  if (await qrTab.isVisible().catch(() => false)) await qrTab.click().catch(() => {});
  if (!await page.locator("img[src*='qr' i], canvas").first().isVisible().catch(() => false)) {
    const btn = page.getByRole("button", { name: /qr code/i }).first();
    if (await btn.isVisible().catch(() => false)) await btn.click().catch(() => {});
  }
  // The QR art renders after a short async load — poll for it (up to 30s)
  // instead of assuming a fixed delay. Scope to real QR surfaces, not logos.
  let qrEl = null;
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(2000);
    const cand = page.locator("img[src*='qrcode' i], img[src*='qr-code' i], img[alt*='qr' i], canvas").first();
    if (await cand.isVisible().catch(() => false)) {
      const box = await cand.boundingBox().catch(() => null);
      if (box && box.width > 100 && box.height > 100) { qrEl = cand; break; }
    }
  }
  if (!qrEl) {
    await page.screenshot({ path: path.join("out", "tiktok-login-debug.png"), fullPage: false }).catch(() => {});
    throw new Error("QR code was not available through the normal login flow. Stop here; do not work around TikTok's access or verification controls.");
  }
  fs.mkdirSync("out", { recursive: true });
  await qrEl.screenshot({ path: QR_PNG });
  console.log("[qr-bootstrap] QR screenshot -> " + QR_PNG);
  console.log("[qr-bootstrap] Use TikTok's official app QR flow and complete any requested verification there. Waiting 10 min...");
  const t0 = Date.now();
  let ok = false;
  while (Date.now() - t0 < WAIT_MS) {
    await page.waitForTimeout(5000);
    const cks = await ctx.cookies("https://www.tiktok.com").catch(() => []);
    if (hasSessionCookies(cks)) { ok = true; break; }
    const mins = Math.floor((Date.now() - t0) / 60000);
    if ((Date.now() - t0) % 60000 < 5000) console.log(`[qr-bootstrap] waiting… ${mins} min elapsed`);
  }
  if (!ok) { console.error("[qr-bootstrap] TIMEOUT — no session. Re-run the workflow and scan faster."); process.exitCode = 1; }
  else {
    const cks = await ctx.cookies("https://www.tiktok.com").catch(() => []);
    fs.writeFileSync(OUT_JSON, JSON.stringify(cks, null, 2));
    fs.writeFileSync(OUT_B64, Buffer.from(JSON.stringify(cks)).toString("base64"));
    console.log(`[qr-bootstrap] SESSION CONFIRMED — ${cks.length} cookies saved locally to ${OUT_JSON} + ${OUT_B64}`);
    console.log("[qr-bootstrap] Do not upload browser cookies to GitHub Actions secrets or replay them in CI.");
  }
} finally {
  await page.close().catch(() => {});
  await ctx.close().catch(() => {});
}
