import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";

const context = await launchStealth(config, { headless: false, profileDir: "profiles/tiktok-edge" });
const page = await context.newPage();
await page.goto("https://www.tiktok.com", { waitUntil: "domcontentloaded", timeout: 60000 });
console.log("URL:", page.url());
await page.waitForTimeout(5000);
const cks = await context.cookies("https://www.tiktok.com");
const has = cks.some((c) => ["sessionid", "sessionid_ss", "sid_tt"].includes(c.name) && (c.value || "").length > 4);
console.log("hasSession:", has);
const profileUser = page.locator('[data-e2e="profile-user"]').first();
console.log("profile-user visible:", await profileUser.isVisible().catch(() => false));
await page.screenshot({ path: "out/diag-edge.png" });
await context.close().catch(() => {});
process.exit(0);