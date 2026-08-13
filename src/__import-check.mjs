import fs from "node:fs";
import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";

const file = process.argv[2];
const raw = fs.readFileSync(file, "utf8");
const list = JSON.parse(raw);
const pw = list.map((c) => ({
  name: c.name,
  value: c.value,
  domain: (c.domain || "").replace(/^\./, ""),
  path: c.path || "/",
  expires: c.expirationDate ? Math.floor(c.expirationDate) : -1,
  httpOnly: !!c.httpOnly,
  secure: !!c.secure,
  sameSite: { strict: "Strict", lax: "Lax" }[String(c.sameSite).toLowerCase()] || "None"
}));

const dir = config.tiktokBot.profileDir;
const context = await launchStealth(config, { profileDir: dir, headless: false });
try {
  await context.addCookies(pw);
  console.log("added", pw.length, "cookies");
  const page = await context.newPage();
  await page.goto("https://www.tiktok.com", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(6000);
  const cks = await context.cookies("https://www.tiktok.com").catch(() => []);
  const hasSession = cks.some((c) => ["sessionid", "sessionid_ss", "sid_tt", "uid_tt"].includes(c.name) && (c.value || "").length > 4);
  console.log("hasSession:", hasSession);
  const profileUser = page.locator('[data-e2e="profile-user"]').first();
  const visible = await profileUser.isVisible().catch(() => false);
  console.log("profile-user visible:", visible);
  await page.screenshot({ path: "out/import-verify.png" });
  console.log("URL:", page.url());
} finally {
  await context.close().catch(() => {});
  process.exit(0);
}