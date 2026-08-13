import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";

const context = await launchStealth(config);
const page = await context.newPage();
try {
  await page.goto("https://www.tiktok.com", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  const cks = await context.cookies("https://www.tiktok.com");
  const hasSession = cks.some((c) => ["sessionid", "sessionid_ss", "sid_tt"].includes(c.name) && (c.value || "").length > 4);
  console.log("hasSession after goto:", hasSession);
  console.log("URL:", page.url());
  const profileUser = page.locator('[data-e2e="profile-user"]').first();
  console.log("profile-user visible:", await profileUser.isVisible().catch(() => false));

  const upload = page.locator("a:has-text('Upload video'), a:has-text('Upload'), button:has-text('Upload'), [data-e2e='upload-video']").first();
  const list = ["a:has-text('Upload')", "button:has-text('Upload')", "text=Upload", "[href*='upload']", "[data-e2e*='upload' i]"];
  for (const sel of list) {
    const el = page.locator(sel).first();
    console.log(`sel ${JSON.stringify(sel)}: visible=${await el.isVisible().catch(() => false)} count=${await el.count().catch(() => 0)}`);
  }
  await page.screenshot({ path: "out/diag-home.png" });
} catch (e) {
  console.log("ERR:", e.message);
} finally {
  await context.close().catch(() => {});
  process.exit(0);
}