import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";
import { rand, pick, sleep, humanDelay, moveMouse, humanReview, ensureProfileDir, setSpeed } from "./human.js";
import { notify } from "./notify.js";

const ig = config.instagram || {};
setSpeed(ig.speed ?? 0.6);

// Scaled UI wait: respects instagram.speed so posting can run "fast" (~<1 min)
// while staying deterministic. Only applies to composer/UI pauses, not login retries.
async function wr(a, b) {
  await sleep(Math.max(120, Math.round(rand(a, b) * (ig.speed ?? 0.6))));
}
const IG_HANDLE = (ig.handle || "@theitsupportguru").replace(/^@/, "");
function daysSinceStart() {
  const start = new Date(config.startedAt || "2026-08-01").getTime();
  return Math.floor((Date.now() - start) / 86400000);
}
function todayLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function log(...a) {
  console.log("[" + new Date().toLocaleTimeString() + "] " + a.join(" "));
}

function requireWarmup() {
  if (ig.enabled === false) throw new Error("instagram.enabled is false in config");
  const age = daysSinceStart();
  log(`Account age: ${age} day(s) (warmup requires ${ig.minWarmupDays || 5})`);
  if (age < (ig.minWarmupDays || 5)) {
    throw new Error(
      `Still in warmup (${age}/${ig.minWarmupDays})\n` +
        `Post manually from out/instagram-ready/ until warmup passes, then re-run.`
    );
  }
}

function loadManifest() {
  const file = path.join(ig.postDir, "manifest.json");
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function pendingPosts(manifest, { byId, slot }) {
  if (!manifest) return [];
  let posts = manifest.posts || [];
  if (byId) {
    posts = posts.filter((p) => p.id === byId);
  } else {
    if (manifest.date !== todayLocal()) return [];
    if (slot !== undefined && slot !== null) posts = posts.filter((p) => p.slot === slot);
  }
  posts = posts
    .filter((p) => !fs.existsSync(path.join(ig.postDir, p.id, ".posted")))
    .sort((a, b) => a.slot - b.slot);
  return byId ? posts.slice(0, 1) : posts.slice(0, ig.maxPerDay || 3);
}

async function profileVisible(page) {
  return page
    .locator(`svg[aria-label="Profile"], a[href="/${IG_HANDLE}/"], a[href*="/${IG_HANDLE}/"]`)
    .first()
    .isVisible()
    .catch(() => false);
}

async function isLoggedIn(page) {
  try {
    await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 40000 });
    if (await page.getByRole("button", { name: /^Log in$/i }).first().isVisible().catch(() => false)) return false;
    return await profileVisible(page);
  } catch (e) {
    log("login check error: " + e.message);
    return false;
  }
}

function readIgCreds() {
  try {
    const c = JSON.parse(fs.readFileSync(path.join("credentials", "instagram.json"), "utf8"));
    if (c && c.username && c.password) return c;
  } catch {}
  return null;
}

async function autoLogin(page) {
  const cred = readIgCreds();
  if (!cred) return { ok: false, reason: "no-creds" };
  log("Session invalid — attempting credential login…");
  await page
    .goto("https://www.instagram.com/accounts/login/", { waitUntil: "domcontentloaded", timeout: 45000 })
    .catch(() => {});
  await wr(1500, 3200);
  const user = page.locator('input[name="username"]').first();
  if (!(await user.isVisible().catch(() => false))) return { ok: false, reason: "login-page-missing" };
  await user.fill(cred.username);
  await humanDelay([300, 950]);
  await page.locator('input[name="password"]').first().fill(cred.password);
  await humanDelay([900, 2400]);
  await page.keyboard.press("Enter");
  for (let i = 0; i < 20; i++) {
    await sleep(2000);
    const stillOnLogin = await page.getByRole("button", { name: /^Log in$/i }).first().isVisible().catch(() => false);
    if (!stillOnLogin && (await profileVisible(page).catch(() => false))) {
      log("Credential login succeeded.");
      return { ok: true };
    }
    if (
      await page
        .getByText(/Confirm it's you|Challenge_Required|Your account is at risk|Your account has been locked/i)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return { ok: false, reason: "challenge" };
    }
    if (
      await page
        .getByText(/couldn't log you in|Sorry, your password|Incorrect password/i)
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return { ok: false, reason: "bad-credentials" };
    }
  }
  return { ok: false, reason: "timeout" };
}

// Keeps the persistent session valid without a human: checks the saved
// Firefox profile and, if Instagram lapsed it, tries a credential login.
export async function ensureSession() {
  ensureProfileDir(ig.profileDir);
  const context = await launchStealth(config, { profileDir: ig.profileDir, headless: true });
  const page = await context.newPage();
  try {
    if (await isLoggedIn(page)) return { ok: true };
    return await autoLogin(page);
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

async function doOrganicActivity(page, clicks) {
  for (let i = 0; i < clicks; i++) {
    await humanDelay([900, 2400]);
    const like = page.locator('svg[aria-label="Like"], svg[aria-label="Unlike"]').first();
    if (await like.isVisible().catch(() => false)) {
      await moveMouse(page, rand(300, 1100), rand(300, 900));
      await like.click().catch(() => {});
      await humanDelay([1200, 3500]);
    }
    await page.mouse.wheel(0, rand(500, 1400)).catch(() => {});
    await humanDelay([800, 2000]);
  }
}

async function clickCreate(page) {
  // The header "+" icon (several possible labels across UI versions).
  const createIcon = page.locator(
    'a[href="/create/"], svg[aria-label="Create"], svg[aria-label="New post"], button[aria-label="Create"], [role="button"][aria-label*="Create"]'
  ).first();
  await createIcon.waitFor({ state: "visible", timeout: 15000 }).catch(() => {});
  await createIcon.click().catch(() => {});
  await humanDelay([800, 1800]);
  // Sometimeies a menu pops with "Post" — click it if present.
  const postItem = page.locator('[role="menuitem"]:has-text("Post"), div[role="button"]:has-text("Post")').first();
  if (await postItem.isVisible().catch(() => false)) {
    await humanReview(page, rand(600, 1200), rand(120, 200));
    await postItem.click().catch(() => {});
    await humanDelay([600, 1400]);
  }
}

async function dumpCaptionState(page) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(11, 19);
  const shot = "out/ig-caption-error-" + stamp + ".png";
  await page.screenshot({ path: shot }).catch(() => {});
  const url = page.url();
  let excerpt = "(evaluate failed)";
  try {
    excerpt = await page
      .evaluate(() => {
        const els = Array.from(
          document.querySelectorAll('[contenteditable="true"], [role="textbox"], textarea, [aria-label*="aption"], [aria-label*="Write a caption"]')
        );
        return els.slice(0, 5).map((e) => "[" + (e.getAttribute && e.getAttribute("aria-label")) + "] " + (e.textContent || e.value || "").trim().slice(0, 60)).join(" | ") || "(no caption-like elements)";
      })
      .catch(() => "(evaluate failed)");
  } catch {}
  if (excerpt === "(evaluate failed)") {
    try {
      excerpt = (await page.evaluate(() => (document.body ? document.body.innerText.replace(/\s+/g, " ").slice(0, 300) : "")).catch(() => "(body unavailable)")) || "(body empty)";
    } catch { excerpt = "(body unavailable)"; }
  }
  const line = "[" + stamp + "] url=" + url + " :: " + excerpt;
  try { fs.appendFileSync("out/ig-caption-error.log", line + "\n"); } catch {}
  log("caption state dumped: " + shot + " :: " + excerpt.slice(0, 120));
}

async function reachCaptionStep(page) {
  const capSel = '[aria-label*="Write a caption"], [aria-label*="aption"][contenteditable="true"], div[contenteditable="true"], [role="textbox"]';
  for (let i = 0; i < 10; i++) {
    const cap = page.locator(capSel).first();
    const share = page.locator('div[role="button"]:has-text("Share"), button:has-text("Share")').first();
    const next = page.locator('div[role="button"]:has-text("Next"), button:has-text("Next")').first();
    const capV = await cap.isVisible().catch(() => false);
    const shareV = await share.isVisible().catch(() => false);
    const nextV = await next.isVisible().catch(() => false);
    log("[reach " + i + "] url=" + page.url().slice(0, 60) + " caption=" + capV + " share=" + shareV + " next=" + nextV);
    if (capV) return true;
    if (shareV) return true;
    if (!nextV) return false;
    await humanReview(page, rand(500, 900), rand(80, 160));
    await next.click().catch(() => {});
    // Wait for the composer to actually advance off /create/style/ before re-probing.
    try {
      await page.waitForURL(/\/create\/(details|crop|share|preview)\//, { timeout: 6000 });
    } catch {
      await wr(2500, 4000);
    }
    await wr(1800, 3200);
  }
  return false;
}

async function typeCaption(page, caption) {
  const text = String(caption);
  const selectors = [
    '[aria-label*="Write a caption"]',
    '[aria-label*="aption"]',
    '[contenteditable="true"]',
    '[role="textbox"]',
  ];
  await page
    .evaluate((sels) => {
      for (const s of sels) {
        const el = document.querySelector(s);
        if (el && el.focus) { el.focus(); break; }
      }
    }, selectors)
    .catch(() => {});
  await wr(400, 900);
  await page.keyboard.press("Control+A").catch(() => {});
  await page.keyboard.press("Backspace").catch(() => {});
  await page.keyboard.type(text, { delay: rand(15, 40) }).catch(() => {});
  await wr(500, 1100);
  const body = await page
    .evaluate(() => {
      const els = document.querySelectorAll('[contenteditable="true"], [role="textbox"], [aria-label*="aption"]');
      let out = "";
      for (const el of els) out += (el.textContent || el.value || "") + "\n";
      return out.replace(/\s+/g, " ");
    })
    .catch(() => "");
  const probe = text.replace(/\s+/g, " ").trim().slice(0, 24);
  return { ok: body.includes(probe) };
}

async function uploadToCaption(page, media, caption, soloIdx, allowPartial = false) {
  await humanReview(page, rand(1100, 1300), rand(80, 160));
  await clickCreate(page);

  // If the "+" menu didn't land on /create/, go straight to the select screen.
  if (!/\/create\//.test(page.url())) {
    await page
      .goto("https://www.instagram.com/create/select/", { waitUntil: "domcontentloaded", timeout: 30000 })
      .catch(() => {});
  }
  await wr(1000, 2500);

  // Drive the real <input type="file"> directly — no native dialog / event race.
  const inputs = page.locator('input[type="file"]');
  const inputCount = await inputs.count().catch(() => 0);
  let input = inputs.first();
  for (let i = 0; i < inputCount; i++) {
    const l = inputs.nth(i);
    const isMulti = (await l.getAttribute("multiple").catch(() => null)) !== null || (await l.evaluate((el) => el.multiple).catch(() => false)) === true;
    const vis = await l.isVisible().catch(() => false);
    log("file input[" + i + "] multiple=" + isMulti + " visible=" + vis + " accept=" + String(await l.getAttribute("accept").catch(() => "")));
    if (isMulti) { input = l; break; }
  }
  await input.waitFor({ state: "attached", timeout: 25000 }).catch(() => {});
  if (!(await input.count().catch(() => 0))) {
    await page
      .goto("https://www.instagram.com/create/select/", { waitUntil: "domcontentloaded", timeout: 30000 })
      .catch(() => {});
    await input.waitFor({ state: "attached", timeout: 25000 }).catch(() => {});
  }
  if (!(await input.count().catch(() => 0))) {
    await page.screenshot({ path: "out/ig-upload-error.png" }).catch(() => {});
    throw new Error("No file input found on create screen.");
  }
  const multi = ((await input.getAttribute("multiple").catch(() => null)) !== null) || ((await input.evaluate((el) => el.multiple).catch(() => false)) === true);
  let attached = 0;
  // IG carousel composer sometimes presents a single-file input; forcing
  // `multiple` lets us attach the whole carousel in one setInputFiles call
  // instead of relying on the flaky "Add" filechooser.
  await input.evaluate((el) => { el.multiple = true; }).catch(() => {});
  const forcedMulti = multi || media.length > 1;
  if (forcedMulti) {
    await input.setInputFiles(media.length === 1 ? [media[0]] : media);
    attached = media.length;
    log("files attached (multi): " + media.length);
  } else {
    const first = typeof soloIdx === "number" && media[soloIdx] ? soloIdx : 0;
    await input.setInputFiles([media[first]]);
    attached = 1;
    log("file 1 attached (" + path.basename(media[first]) + ")");
    const rest = media.map((m, i) => i).filter((i) => i !== first);
    for (const i of rest) {
      await wr(1500, 3000);
      const chooser = page.waitForEvent("filechooser", { timeout: 8000 }).catch(() => null);
      await page
        .locator('[aria-label*="Add"][role="button"], [role="button"]:has-text("Add"), svg[aria-label="Add"]')
        .first()
        .click()
        .catch(() => {});
      const c = await chooser;
      if (!c) break;
      await c.setFiles(media[i]);
      attached++;
      log("file " + (i + 1) + " added");
    }
  }
  if (!allowPartial && media.length > 1 && attached < media.length) {
    await dumpCaptionState(page);
    throw new Error("Composer accepted only " + attached + "/" + media.length + " images — refusing a partial carousel. (IG composer variant without multi-select)");
  }

  // Crop / edit screens -> advance until the caption/share step is on screen.
  await wr(2500, 4500);
  if (!(await reachCaptionStep(page))) {
    await dumpCaptionState(page);
    throw new Error("Could not reach the caption step in the composer.");
  }
  await wr(1500, 2800);
  const captionResult = await typeCaption(page, caption);
  if (!captionResult.ok) {
    await dumpCaptionState(page);
    throw new Error("Caption text not detected in the composition box.");
  }
  log("caption filled");
}

async function uploadPost(page, media, caption, dryRun, soloIdx) {
  if (dryRun) {
    log("[dry-run] would post -> " + path.basename(path.dirname(media[0])) + " (" + media.length + " img) | caption=" + JSON.stringify(caption.slice(0, 80) + "..."));
    return;
  }
  await uploadToCaption(page, media, caption, soloIdx, false);

  // Pause for human review, then share.
  await humanReview(page, rand(700, 1100), rand(300, 600));
  const shareBtn = page.locator('div[role="button"]:has-text("Share"), button:has-text("Share")').first();
  await shareBtn.waitFor({ state: "visible", timeout: 15000 }).catch(() => { throw new Error("Share button not found"); });
  await shareBtn.click().catch(() => { throw new Error("Could not click Share"); });
  log("post submitted");
  // Wait for confirmation screen
  for (let i = 0; i < 12; i++) {
    await sleep(1000);
    if (await page.locator('xpath=//*[contains(text(),"shared")]').first().isVisible().catch(() => false)) break;
  }
}

async function soloIdxFor(p) {
  let b = (p.slides || []).findIndex((s) => s.kind === "facts" || s.kind === "brief");
  if (b < 0) b = (p.slides || []).findIndex((s) => s.kind === "body");
  if (b < 0) b = (p.slides || []).findIndex((s) => s.kind === "step");
  return b >= 0 ? b : 0;
}

async function probeCaption({ slot = 0 } = {}) {
  ensureProfileDir(ig.profileDir);
  const manifest = loadManifest();
  const p = (manifest && manifest.posts || []).find((x) => x.slot === slot);
  const media = (p && p.media || []).filter((m) => m && fs.existsSync(m));
  if (!p || !media.length) { log("probe: no media for slot " + slot); return { ok: false }; }
  const context = await launchStealth(config, { profileDir: ig.profileDir, headless: false });
  const page = await context.newPage();
  let ok = false;
  try {
    if (!(await isLoggedIn(page))) {
      const res = await autoLogin(page);
      if (!res.ok) throw new Error("not logged in during probe: " + res.reason);
    }
    log("probe: logged in — opening composer for " + media.length + " image(s)…");
    await uploadToCaption(page, media, p.caption, await soloIdxFor(p), true);
    ok = true;
    log("probe: REACHED + TYPED caption step (NOT sharing — probe mode).");
  } catch (e) {
    await dumpCaptionState(page);
    console.error("probe failed: " + e.message);
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
  return { ok };
}

async function diagComposer({ slot = 0 } = {}) {
  ensureProfileDir(ig.profileDir);
  const manifest = loadManifest();
  const p = (manifest && manifest.posts || []).find((x) => x.slot === slot);
  const media = (p && p.media || []).filter((m) => m && fs.existsSync(m));
  if (!media.length) { log("diag: no media for slot " + slot); return; }
  const context = await launchStealth(config, { profileDir: ig.profileDir, headless: false });
  const page = await context.newPage();
  try {
    if (!(await isLoggedIn(page))) {
      const r = await autoLogin(page);
      if (!r.ok) throw new Error("login: " + r.reason);
    }
    log("diag: logged in — opening composer…");
    await humanReview(page, rand(1100, 1300), rand(80, 160));
    await clickCreate(page);
    if (!/\/create\//.test(page.url())) {
      await page.goto("https://www.instagram.com/create/select/", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    }
    await wr(1000, 2500);
    const input = page.locator('input[type="file"]').first();
    await input.waitFor({ state: "attached", timeout: 25000 }).catch(() => {});
    await input.setInputFiles([media[0]]).catch(() => {});
    await sleep(4000);
    log("url after first attach: " + page.url());
    const ctrls = await page
      .evaluate(() =>
        Array.from(document.querySelectorAll('div[role="button"], button, [aria-label]'))
          .slice(0, 80)
          .map((e) => (e.getAttribute && e.getAttribute("aria-label")) || (e.textContent || "").trim() || "")
          .map((s) => s.replace(/\s+/g, " ").slice(0, 45))
          .filter(Boolean)
      )
      .catch(() => []);
    for (const c of ctrls) log("ctrl: " + c);
    const inputs = await page
      .evaluate(() => Array.from(document.querySelectorAll('input[type="file"]')).map((e) => ({ multiple: e.multiple, accept: e.accept, id: e.id })))
      .catch(() => []);
    log("file inputs: " + JSON.stringify(inputs));
    const next = page.locator('div[role="button"]:has-text("Next"), button:has-text("Next")').first();
    if (await next.isVisible().catch(() => false)) {
      await next.click().catch(() => {});
      await sleep(3000);
      log("url after Next: " + page.url());
      const ctrls2 = await page
        .evaluate(() =>
          Array.from(document.querySelectorAll('div[role="button"], button, [aria-label]'))
            .slice(0, 80)
            .map((e) => (e.getAttribute && e.getAttribute("aria-label")) || (e.textContent || "").trim() || "")
            .map((s) => s.replace(/\s+/g, " ").slice(0, 45))
            .filter(Boolean)
        )
        .catch(() => []);
      for (const c of ctrls2) log("ctrl2: " + c);
    }
  } catch (e) {
    console.error("diag failed: " + e.message);
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

async function runBot({ dryRun = false, force = false, byId = null, slot = null } = {}) {
  if (!force) requireWarmup();
  ensureProfileDir(ig.profileDir);
  const manifest = loadManifest();
  if (!manifest) { log("No manifest at " + path.join(ig.postDir, "manifest.json") + " — run the daily pipeline first."); return { posted: 0 }; }
  const posts = pendingPosts(manifest, { byId, slot });
  if (!posts.length) {
    log("Nothing to post" + (slot !== null ? " for slot " + slot : "") + ".");
    return { posted: 0 };
  }
  log("Posting " + posts.length + " from " + manifest.posts.length + " in manifest.");

  const context = await launchStealth(config, { profileDir: ig.profileDir, headless: ig.headless });
  const page = await context.newPage();
  let posted = 0;
  const postedTitles = [];
  try {
    if (!(await isLoggedIn(page))) {
      const res = await autoLogin(page);
      if (!res.ok) {
        await page.screenshot({ path: res.reason === "challenge" ? "out/ig-challenge.png" : "out/ig-not-logged-in.png" }).catch(() => {});
        const msg = {
          "no-creds": "Not logged in and no credentials/instagram.json — run: npm run ig:login  (then log in once in the opened window).",
          challenge: "Instagram challenge/checkpoint after auto-login — needs a human: npm run ig:login",
          "bad-credentials": "Instagram rejected credentials/instagram.json — fix or run: npm run ig:login",
          "login-page-missing": "Login page didn't load (bot-check/blocked) — run: npm run ig:login",
          timeout: "Auto-login timed out — run: npm run ig:login",
        }[res.reason] || "Could not re-authenticate. Run: npm run ig:login";
        throw new Error(msg);
      }
    }
    log("Logged in as @" + IG_HANDLE + ". Starting humanized session.");
    if ((ig.speed ?? 0.6) < 0.5) {
      log("fast mode (" + ig.speed + ") — skipping organic session activity.");
    } else {
      await doOrganicActivity(page, pick([ig.scrollClicksDuringSession[0], ig.scrollClicksDuringSession[1]]));
    }

    for (const p of posts) {
      const media = (p.media || []).filter((m) => m && fs.existsSync(m));
      if (!media.length) { log("skip " + p.id + ": no media on disk"); continue; }
      const soloIdx = await soloIdxFor(p);
      log(`[slot ${p.slot}] ${p.format} · ${p.title}`);
      let uploadErr = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await uploadPost(page, media, p.caption, dryRun, soloIdx);
          uploadErr = null;
          break;
        } catch (e) {
          uploadErr = e;
          if (attempt === 2) break;
          log("upload flake (" + e.message + ") — retrying " + p.id + " once…");
          await wr(12000, 20000);
          await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" }).catch(() => {});
          await wr(1500, 3000);
        }
      }
      if (uploadErr) throw uploadErr;
      if (!dryRun) {
        fs.writeFileSync(path.join(ig.postDir, p.id, ".posted"), new Date().toISOString());
        posted++;
        postedTitles.push(p.title);
      } else {
        posted++;
      }
      if (posts.indexOf(p) < posts.length - 1) {
        const gap = rand(ig.staggerMinutes[0] * 1000, ig.staggerMinutes[1] * 1000);
        log("staggering ~" + Math.round(gap / 1000) + "s before next.");
        await sleep(gap);
      }
    }
    await page.close();
  } finally {
    await context.close().catch(() => {});
  }
  log("Done. Treated: " + posted);
  if (posted > 0 && !dryRun) {
    await notify({
      title: "IG post published",
      message:
        posted + (posted === 1 ? " card" : " cards") + " live on @" + IG_HANDLE + ":\n" +
        postedTitles.slice(0, 3).map((t) => "• " + String(t).replace(/\s+/g, " ").slice(0, 60)).join("\n")
    });
  }
  return { posted };
}

// ---- CLI ----
const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
const args = process.argv.slice(2);
const mode = args.find((a) => !a.startsWith("--")) || "run";
const dry = args.includes("--dry");
const force = args.includes("--force");
const byIdArg = args.find((a) => a.startsWith("--post="));
const slotArg = args.find((a) => a.startsWith("--slot="));
const byId = byIdArg ? byIdArg.split("=")[1] : null;
const slot = slotArg ? parseInt(slotArg.split("=")[1], 10) : null;

if (mode === "login") {
  ensureProfileDir(ig.profileDir);
  (async () => {
    const context = await launchStealth(config, { profileDir: ig.profileDir, headless: false });
    const page = await context.newPage();
    await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "domcontentloaded", timeout: 40000 });
    log("");
    log("──────────────────────────────────────────────────────────────");
    log("A NEW Firefox window just opened. Log into @" + IG_HANDLE + " THERE.");
    log("It is Playwright's own Firefox — not your normal browser.");
    log("Complete any 'Confirm it's you' / verification steps in it.");
    log("The window stays open ~5 minutes. Waiting for session…");
    log("──────────────────────────────────────────────────────────────");
    let detected = false;
    const marker = `a[href="/${IG_HANDLE}/"], a[href="/${IG_HANDLE}/"] img, svg[aria-label="Profile"], [aria-label*="profile picture"]`;
    for (let i = 0; i < 300; i++) {
      await sleep(1000);
      if (await page.locator(marker).first().isVisible().catch(() => false)) { detected = true; break; }
      if (i % 30 === 29) log("still waiting… " + (i + 1) + "s | url=" + page.url().slice(0, 60));
    }
    const cookies = await context.cookies("https://www.instagram.com").catch(() => []);
    const hasSession = cookies.some((c) => ["sessionid", "ds_user_id"].includes(c.name) && (c.value || "").length > 4);
    if (hasSession) {
      log("SESSION CONFIRMED: session cookies saved to " + ig.profileDir + ". You're done here.");
    } else if (detected) {
      log("Profile icon seen but no session cookie yet — finish login/verification inside the window and run again.");
    } else {
      log("");
      log("NOT DETECTED — login did not persist.");
      log("Please retry `npm run ig:login` and sign in INSIDE the window that opens.");
      log("Check: (1) correct credentials, (2) you're not logged into this account elsewhere,");
      log("(3) complete any security/verification popups. If Instagram blocks the login,");
      log("try once in your normal browser in a NEW private window, then come back.");
      process.exitCode = 1;
    }
    await page.close();
    await context.close();
  })().catch((e) => { console.error("Login error: " + e.message); process.exit(1); });
} else if (mode === "diag") {
  diagComposer({ slot: slotArg ? parseInt(slotArg.split("=")[1], 10) : 0 });
} else if (mode === "probe") {
  probeCaption({ slot: slotArg ? parseInt(slotArg.split("=")[1], 10) : 0 }).then((r) => {
    if (!r.ok) process.exitCode = 1;
  }).catch((e) => { console.error("Probe error: " + e.message); process.exit(1); });
} else if (mode === "run" || mode === "post") {
  runBot({ dryRun: dry, force, byId, slot }).then((r) => {
    if (!r.posted) process.exitCode = 1;
  }).catch((e) => { console.error("Bot error: " + e.message); process.exit(1); });
}
}

export default { runBot };