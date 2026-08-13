import fs from "node:fs";
import path from "node:path";
import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";
import { rand, sleep, humanDelay, moveMouse, humanReview, ensureProfileDir } from "./human.js";

const ig = config.instagram || {};
const reel = config.instagramReel || {};
const DIR = reel.postDir || "out/instagram-reels";
const PROFILE = reel.profileDir || ig.profileDir;
const HANDLE = (ig.handle || "@theitsupportguru").replace(/^@/, "");

function log(...a) {
  console.log("[" + new Date().toLocaleTimeString() + "] " + a.join(" "));
}
function todayKey() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10).replace(/-/g, "");
}

function pendingReel() {
  if (!fs.existsSync(DIR)) return null;
  const prefix = todayKey() + "-";
  const files = fs
    .readdirSync(DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".mp4"))
    .filter((f) => !fs.existsSync(path.join(DIR, f.replace(/\.mp4$/, ".done"))))
    .sort();
  if (!files.length) return null;
  const v = files[0];
  const capFile = path.join(DIR, v.replace(/\.mp4$/, ".txt"));
  return { video: path.join(DIR, v), caption: fs.existsSync(capFile) ? fs.readFileSync(capFile, "utf8").trim() : undefined };
}

async function isLoggedIn(page) {
  try {
    await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 40000 });
    await sleep(1500);
    const cookies = await page.context().cookies("https://www.instagram.com").catch(() => []);
    if (cookies.some((c) => c.name === "sessionid" && (c.value || "").length > 4)) return true;
    if (await page.getByRole("button", { name: /^Log in$/i }).first().isVisible().catch(() => false)) return false;
    return await page.locator(`svg[aria-label="Profile"], a[href="/${HANDLE}/"], a[href*="/${HANDLE}/"]`).first().isVisible().catch(() => false);
  } catch (e) {
    log("login check error: " + e.message);
    return false;
  }
}

async function openReelCreate(page) {
  const plus = page.locator('svg[aria-label="New post"], a[href="/create/"]').first();
  await plus.waitFor({ state: "visible", timeout: 20000 }).catch(() => {});
  if (!(await plus.isVisible().catch(() => false))) {
    await page.screenshot({ path: "out/ig-reel-plus-error.png" }).catch(() => {});
    throw new Error("Create (+) control not found on home");
  }
  await plus.click({ force: true }).catch(async () => {
    await page.screenshot({ path: "out/ig-reel-plus-error.png" }).catch(() => {});
    throw new Error("Could not open create menu");
  });
  await sleep(rand(1200, 1800));
  const items = await page.locator('[role="menuitem"]').allTextContents().catch(() => []);
  log("create menu items: " + JSON.stringify(items));
  const reelItem = page.getByRole("menuitem", { name: /^reel$/i }).first();
  if (!(await reelItem.isVisible().catch(() => false))) {
    await page.screenshot({ path: "out/ig-reel-menu-error.png" }).catch(() => {});
    throw new Error("No Reel menu item after create click (items=" + JSON.stringify(items) + ")");
  }
  await reelItem.click({ force: true }).catch(() => {});
  await sleep(rand(2500, 3800));
}

async function attachVideo(page, video) {
  const chooser = page.waitForEvent("filechooser", { timeout: 20000 }).catch(() => null);
  const select = page.getByText(/select from computer|select a video|upload from device/i).first();
  if (await select.isVisible().catch(() => false)) {
    await select.click().catch(() => {});
    const c = await chooser;
    if (c) await c.setFiles(video);
    return;
  }
  const btn = page.locator('div[role="button"]:has-text("Select"), button:has-text("Select")').first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click().catch(() => {});
    const c = await chooser;
    if (c) await c.setFiles(video);
    return;
  }
  const input = page.locator('input[type="file"]').first();
  await input.waitFor({ state: "attached", timeout: 10000 }).catch(() => {});
  await input.setInputFiles(video).catch(() => { throw new Error("No video file input found on reel screen"); });
}

async function uploadReel(page, video, caption, dryRun, suffix) {
  if (dryRun) {
    log("[dry-run] would post reel -> " + path.basename(video) + " | caption=" + JSON.stringify(String(caption || "").slice(0, 70) + "..."));
    return;
  }
  const ss = (n) => page.screenshot({ path: suffix + n + ".png" }).catch(() => {});
  try {
    await openReelCreate(page);
    await attachVideo(page, video);
    log("video attached: " + path.basename(video));

    await sleep(1000);
    await moveMouse(page, rand(500, 900), rand(300, 700));
    await sleep(3000);

    const nextBtn = page.getByRole("button", { name: /next/i }).first();
    const nextFound = await nextBtn.waitFor({ state: "visible", timeout: 45000 }).catch(() => false);
    if (!nextFound) { await ss("reel-next-missing"); throw new Error("Reel 'Next' never appeared (upload/processing issue)"); }
    await humanReview(page, rand(600, 1200), rand(80, 160));
    await nextBtn.click().catch(() => { throw new Error("Could not press Next on reel"); });
    log("reel edit step done");

    await sleep(rand(2000, 3500));
    const cbox = page.locator('div[contenteditable="true"], [role="textbox"]').first();
    await cbox.waitFor({ state: "visible", timeout: 25000 }).catch(() => {});
    await cbox.click().catch(() => {});
    await humanDelay([600, 1500]);
    await cbox.fill(String(caption || ""));
    log("reel caption filled");

    await humanReview(page, rand(700, 1100), rand(300, 600));
    const share = page.getByRole("button", { name: /^share$/i }).first();
    await share.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
    await share.click().catch(() => { throw new Error("Could not click Share"); });
    log("reel submitted");

    for (let i = 0; i < 15; i++) {
      await sleep(1000);
      if (await page.locator('xpath=//*[contains(text(),"shared") or contains(text(),"Posted")]').first().isVisible().catch(() => false)) break;
    }
  } catch (e) {
    await ss("reel-error").catch(() => {});
    throw e;
  }
}

function main() {
  const dry = process.argv.includes("--dry");
  ensureProfileDir(PROFILE);
  const item = pendingReel();
  if (!item) {
    log("No reel pending for today (" + todayKey() + "). Generate via: node src/scheduler.js reel");
    process.exitCode = 1;
    return;
  }
  (async () => {
    const ctx = await launchStealth(config, { profileDir: PROFILE, headless: ig.headless !== false });
    const page = await ctx.newPage();
    try {
      if (!(await isLoggedIn(page))) {
        throw new Error("Not logged in. Run: npm run ig:login");
      }
      log("Logged in as @" + HANDLE + " — running humanized reel session.");
      await sleep(rand(1500, 3000));
      await uploadReel(page, item.video, item.caption, dry, "out/ig-reel");
      if (!dry) fs.writeFileSync(path.join(DIR, path.basename(item.video).replace(/\.mp4$/, ".done")), new Date().toISOString());
      log("Done. Reel handled.");
    } catch (e) {
      console.error("Reel bot error: " + e.message);
      process.exitCode = 1;
    } finally {
      await page.close().catch(() => {});
      await ctx.close().catch(() => {});
    }
  })();
}

main();