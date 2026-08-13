import fs from "node:fs";
import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";

// Converts an exported-cookies JSON (Cookie-Editor format) into Playwright cookies.
function toPlaywright(cookies) {
  return cookies.map((c) => {
    const host = (c.domain || "").replace(/^\./, "");
    return {
      name: c.name,
      value: c.value,
      domain: host,
      path: c.path || "/",
      expires: c.expirationDate ? Math.floor(c.expirationDate) : -1,
      httpOnly: !!c.httpOnly,
      secure: !!c.secure,
      sameSite: mapSameSite(c.sameSite)
    };
  }).filter((c) => c.name && c.value !== undefined);
}

function mapSameSite(s) {
  const v = String(s || "").toLowerCase();
  if (v === "strict") return "Strict";
  if (v === "lax") return "Lax";
  return "None";
}

const PROFILES = {
  tiktok: {
    profileDir: () => config.tiktokBot.profileDir,
    verifyUrl: "https://www.tiktok.com",
    sessionCookies: ["sid_tt", "sessionid", "sessionid_ss", "uid_tt"],
    loggedIn: (page, cname) => {
      const profileUser = page.locator('[data-e2e="profile-user"]').first();
      return profileUser.isVisible().catch(() => false);
    }
  },
  instagram: {
    profileDir: () => config.instagram.profileDir,
    verifyUrl: "https://www.instagram.com/",
    sessionCookies: ["sessionid", "ds_user_id", "rur"],
    loggedIn: (page, cname) => {
      const marker = page.locator(`a[href="/${cname}/"], a[href="/${cname}/"] img, svg[aria-label="Profile"], [aria-label*="profile picture"]`).first();
      return marker.isVisible().catch(() => false);
    }
  }
};

export async function importCookies(cookieFile, profileId = "tiktok") {
  const prof = PROFILES[profileId];
  if (!prof) throw new Error("Unknown profile " + profileId + " (use tiktok | instagram)");
  if (!fs.existsSync(cookieFile)) throw new Error("Cookie file not found: " + cookieFile);

  const raw = fs.readFileSync(cookieFile, "utf8");
  let list;
  try {
    list = JSON.parse(raw);
  } catch {
    throw new Error("Unsupported cookie format. Use Cookie-Editor extension and export as JSON.");
  }
  if (!Array.isArray(list)) list = list?.cookies || [];
  const pw = toPlaywright(list);
  const dir = prof.profileDir();
  fs.mkdirSync(dir, { recursive: true });

  const context = await launchStealth(config, { profileDir: dir, headless: true });
  try {
    await context.addCookies(pw);
    console.log("Imported " + pw.length + " cookies into " + dir);
    const page = await context.newPage();
    await page.goto(prof.verifyUrl, { waitUntil: "domcontentloaded", timeout: 40000 });
    await new Promise((r) => setTimeout(r, 3500));
    const cookies = await context.cookies(prof.verifyUrl).catch(() => []);
    const hasSession = cookies.some((c) => prof.sessionCookies.includes(c.name) && (c.value || "").length > 4);
    const loggedIn = await prof.loggedIn(page, profileId === "instagram" ? config.instagram.handle.replace(/^@/, "") : "").catch(() => false);
    if (hasSession) console.log("SESSION OK: session cookies present after import.");
    else console.log("WARNING: no session cookie landed. The export may omit httpOnly cookies (sessionid).");
    console.log(loggedIn ? "VERIFY: page appears logged in." : "VERIFY: page does NOT appear logged in.");
  } finally {
    await context.close().catch(() => {});
  }
}

// CLI:  node src/import-cookies.js <cookieFile> [--profile tiktok|instagram]
const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const profArg = args.find((a) => a.startsWith("--profile="));
const profileId = profArg ? profArg.split("=")[1] : "tiktok";
if (file) importCookies(file, profileId).catch((e) => { console.error("Error: " + e.message); process.exit(1); });

export default { importCookies };