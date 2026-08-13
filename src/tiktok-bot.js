import fs from "node:fs";
import path from "node:path";
import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";
import { rand, pick, sleep, humanDelay, moveMouse, humanReview, rotateHashtags, randomCaptionTime, ensureProfileDir } from "./human.js";

const bot = config.tiktokBot;
const PROF_HASH = bot.profileDir; // profile reused => account trust persists
const CREDS_FILE = path.join(process.cwd(), bot.credentialsFile || "credentials/tiktok.json");

function loadCredentials() {
  try {
    if (fs.existsSync(CREDS_FILE)) {
      return JSON.parse(fs.readFileSync(CREDS_FILE, "utf8"));
    }
  } catch (e) {
    log("credentials read error: " + e.message);
  }
  return null;
}

// Autofill the login page with the saved @theitsupportguru credentials.
async function autoLogin(page, context, creds) {
  await openEmailForm(page, bot.baseUrl);

  const userBox = page.locator("input[name='username'], input[name='email'], input[data-e2e='login-username'], input[placeholder='Email or username'], input[placeholder*='username' i], input[type='email']").first();
  const passBox = page.locator("input[type='password'], input[name='password'], input[data-e2e='login-password']").first();
  if (!(await userBox.isVisible().catch(() => false)) || !(await passBox.isVisible().catch(() => false))) {
    throw new Error("Could not find TikTok login inputs (layout may have changed). Use npm run tiktok:login for the manual one-time login instead.");
  }
  await userBox.click();
  await page.keyboard.type(creds.username || creds.email || creds.phone || "", { delay: rand(bot.typingSpeedMs[0], bot.typingSpeedMs[1]) });
  await humanDelay([300, 900]);
  await passBox.click();
  await page.keyboard.type(creds.password || "", { delay: rand(bot.typingSpeedMs[0], bot.typingSpeedMs[1]) });
  log("credentials entered");

  const submit = page.locator("button[data-e2e='login-button'], button[type='submit'], button:has-text('Log in')").first();
  await submit.click().catch(() => { throw new Error("Login submit button not found"); });
  log("login submitted");

  // Wait for the session cookie to land (may hit captcha — tell them to run tiktok:login).
  const rateLimited = page.getByText(/maximum number of attempts|too many attempts|try again later/i).first();
  if (await rateLimited.isVisible().catch(() => false)) {
    throw new Error("TikTok rate-limited the login ('Maximum number of attempts'). Wait a while (or complete a manual one-time login) before the next auto-login attempt.");
  }
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    const cks = await context.cookies("https://www.tiktok.com").catch(() => []);
    if (cks.some((c) => ["sessionid", "sessionid_ss", "sid_tt"].includes(c.name) && (c.value || "").length > 4)) {
      log("SESSION CONFIRMED after credential login");
      return true;
    }
  }
  throw new Error("No session cookie after credential login — TikTok likely wants a CAPTCHA/verification. Open npm run tiktok:login and complete it once manually, then the bot reuses the session.");
}

function daysSinceStart() {
  const start = new Date(config.startedAt || "2026-08-01").getTime();
  return Math.floor((Date.now() - start) / 86400000);
}

function log(...a) { console.log("[" + new Date().toLocaleTimeString() + "] " + a.join(" ")); }

// TikTok's CDN occasionally drops DNS (NS_ERROR_UNKNOWN_HOST). Retry nav a few times.
async function gotoRetry(page, url, timeoutMs = 40000) {
  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
      return;
    } catch (e) {
      lastErr = e;
      log(`nav retry ${attempt}/5 (${url}) — ${e.message}`);
      await sleep(2500 * attempt);
    }
  }
  throw lastErr;
}

async function acceptConsent(page) {
  const c = page.getByRole("button", { name: /i accept|accept all|agree/i }).first();
  if (await c.isVisible().catch(() => false)) await c.click().catch(() => {});
}

// Land on the email/username login form (current TikTok layout switches from a
// phone-first page to the email form after tapping the tab).
async function openEmailForm(page, baseUrl) {
  await gotoRetry(page, baseUrl + "/login");
  await sleep(1800);
  await acceptConsent(page);
  await sleep(800);
  const tabs = ["Use phone / email / username", "Email", "Username", "Log in with email or username"];
  for (const t of tabs) {
    const tab = page.getByText(t, { exact: false }).first();
    if (await tab.isVisible().catch(() => false)) { await tab.click().catch(() => {}); await sleep(1000); break; }
  }
  const emailLink = page.getByText(/log in with email or username|email or username/i).first();
  if (await emailLink.isVisible().catch(() => false)) { await emailLink.click().catch(() => {}); await sleep(1000); }
  return page;
}

function hasSessionCookies(cookies) {
  return cookies.some((c) => ["sessionid", "sessionid_ss", "sid_tt"].includes(c.name) && (c.value || "").length > 4);
}

// Warmup rule: don't let the bot post until the account is old enough.
function requireWarmup() {
  if (bot.enabled === false) throw new Error("tiktokBot.enabled is false in config");
  const age = daysSinceStart();
  log(`Account age: ${age} day(s) (warmup requires ${bot.minWarmupDays})`);
  if (age < bot.minWarmupDays) {
    throw new Error(
      `Still in warmup (${age}/${bot.minWarmupDays} days). Post manually from out/tiktok-ready until warmup passes, then re-run.`
    );
  }
}

async function isLoggedIn(page) {
  try {
    await page.goto(bot.baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(1500);
    const loginBtn = page.locator('[data-e2e="top-login-button"], [data-e2e="profile-user"]').first();
    if (await loginBtn.isVisible().catch(() => false)) {
      const text = await loginBtn.textContent().catch(() => "");
      return !/log in/i.test(text || "") ? true : false;
    }
    return false;
  } catch (e) {
    log("login check error: " + e.message);
    return false;
  }
}

async function doOrganicActivity(page, clicks) {
  for (let i = 0; i < clicks; i++) {
    await humanDelay([900, 2600]);
    const like = page.locator("[data-e2e='feed-like-icon'], [data-e2e='like-count']").first();
    if (await like.isVisible().catch(() => false)) {
      await moveMouse(page, rand(400, 800), rand(400, 900));
      await like.click().catch(() => {});
      await humanDelay([1500, 4000]);
    }
    // scroll the feed a bit
    await page.mouse.wheel(0, rand(600, 1600)).catch(() => {});
  }
}

async function uploadOne(page, videoPath, caption) {
  // Go straight to TikTok Studio's upload page (avoids the "Upload" nav link,
  // which mirrors to /login when the session only has partial trust).
  await gotoRetry(page, "https://www.tiktok.com/tiktokstudio/upload?from=webapp", 50000);
  await sleep(2500);
  if (/\/login/.test(page.url())) {
    throw new Error("TikTok Studio redirected to /login — session rejected for upload (device fingerprint).");
  }

  // Choose file from the upload page (Studio has a real <input type=file>).
  const fileInput = page.locator("input[type='file']").first();
  let clip = await page.waitForEvent("filechooser", { timeout: 15000 }).catch(() => null);
  if (clip) await clip.setFiles(videoPath);
  else if (await fileInput.count()) await fileInput.setInputFiles(videoPath);
  else throw new Error("No file input reached on Studio upload page");
  log("file attached: " + path.basename(videoPath));

  // Wait for upload processing; find the caption box.
  await sleep(rand(3000, 6000));
  const captionBox = page.locator("[data-e2e='caption-input'], div[contenteditable='true']").first();
  await captionBox.click().catch(() => {});
  await humanDelay([600, 1600]);
  await page.keyboard.type(caption, { delay: rand(bot.typingSpeedMs[0], bot.typingSpeedMs[1]) });
  log("caption typed");

  // Human review pause, then post.
  await humanReview(page, rand(600, 1200), rand(80, 180));
  const postBtn = page.locator("button:has-text('Post'), button:has-text('Publish')").first();
  await postBtn.click().catch(() => { throw new Error("Post button not found"); });
  log("post submitted");
  await sleep(rand(3000, 5000));
}

// Headful fallback: pre-fill creds and wait for the human to finish
// (slider / captcha / 2FA). Runs once; the saved session then powers headless slots.
async function autoLoginHeadful(creds) {
  ensureProfileDir(bot.profileDir);
  const context = await launchStealth(config, { headless: false });
  const page = await context.newPage();
  try {
    await openEmailForm(page, bot.baseUrl);
    const userBox = page.locator("input[name='username'], input[placeholder='Email or username'], input[type='email']").first();
    const passBox = page.locator("input[type='password']").first();
    if (await userBox.isVisible().catch(() => false) && await passBox.isVisible().catch(() => false)) {
      await userBox.click();
      await page.keyboard.type(creds.username || creds.email || "", { delay: rand(bot.typingSpeedMs[0], bot.typingSpeedMs[1]) });
      await humanDelay([300, 900]);
      await passBox.click();
      await page.keyboard.type(creds.password || "", { delay: rand(bot.typingSpeedMs[0], bot.typingSpeedMs[1]) });
      log("credentials pre-filled — finish any captcha/verification in the window.");
    }
    log("");
    log("──────────────────────────────────────────────────────────────");
    log("A Firefox window opened with @theitsupportguru pre-filled.");
    log("If TikTok shows a CAPTCHA / slider / code, complete it THERE.");
    log("Window stays open until the session persists (or you close it).");
    log("──────────────────────────────────────────────────────────────");
    let waitedMin = 0;
    for (let i = 0; i < 3600; i++) {
      await sleep(1000);
      const cks = await context.cookies("https://www.tiktok.com").catch(() => []);
      if (cks.some((c) => ["sessionid", "sessionid_ss", "sid_tt"].includes(c.name) && (c.value || "").length > 4)) {
        log("SESSION CONFIRMED — session saved. Headless slots will now reuse it.");
        await page.close();
        await context.close();
        return true;
      }
      if (i % 60 === 59) {
        waitedMin++;
        log("still waiting… " + waitedMin + " min — complete the CAPTCHA/login in the window if it's stuck.");
      }
    }
    log("Closed after 60 minutes with no session. Re-run 'npm run tiktok:login:auto' when ready.");
    await page.close();
    await context.close();
    return false;
  } catch (e) {
    log("headful login error: " + e.message);
    await context.close().catch(() => {});
    return false;
  }
}

export async function runBot({ dryRun = false, force = false } = {}) {
  if (!force) requireWarmup();
  ensureProfileDir(bot.profileDir);
  const dir = bot.postDir;
  if (!fs.existsSync(dir)) { log("No post dir: " + dir); return { posted: 0 }; }

  const videos = fs.readdirSync(dir)
    .filter((f) => f.endsWith(".mp4"))
    // skip already-posted (a .done marker means it was handled)
    .filter((f) => !fs.existsSync(path.join(dir, f.replace(/\.mp4$/, ".done"))))
    .slice(0, bot.maxPerDay);

  if (!videos.length) { log("Nothing new to post today."); return { posted: 0 }; }
  log("Posting up to " + bot.maxPerDay + " from " + videos.length + " pending.");

  const context = await launchStealth(config);
  const page = await context.newPage();
  let posted = 0;
  try {
    let loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      const creds = loadCredentials();
      if (creds && (creds.username || creds.email || creds.phone) && creds.password) {
        log("Not logged in — attempting credential login…");
        loggedIn = await autoLogin(page, context, creds);
      }
    }
    if (!loggedIn) {
      throw new Error("Not logged in. Open tiktok.com in this profile once, log in yourself, then re-run the bot.");
    }
    log("Logged in. Starting humanized session.");
    await doOrganicActivity(page, pick([bot.scrollClicksDuringSession[0], bot.scrollClicksDuringSession[1]]));

    for (const v of videos) {
      const id = v.replace(/\.mp4$/, "");
      const capFile = path.join(dir, id + ".txt");
      const caption = fs.existsSync(capFile)
        ? fs.readFileSync(capFile, "utf8").trim()
        : "Daily tech intel. " + rotateHashtags(config, "tech");
      if (dryRun) {
        log("[dry-run] would post: " + v + " | caption=" + JSON.stringify(caption.slice(0, 60) + "..."));
        fs.writeFileSync(path.join(dir, id + ".done"), "dry");
        posted++;
        continue;
      }
      const startedAt = Date.now();
      await uploadOne(page, path.join(dir, v), caption);
      fs.writeFileSync(path.join(dir, id + ".done"), new Date().toISOString());
      posted++;
      // stagger between posts
      const gap = rand(bot.staggerMinutes[0] * 1000, bot.staggerMinutes[1] * 1000);
      if (videos.indexOf(v) < videos.length - 1) {
        log("staggering " + Math.round(gap / 60000) + " min before next.");
        await sleep(gap);
      }
    }
    await page.close();
  } finally {
    await context.close().catch(() => {});
  }
  log("Done. Posted: " + posted);
  return { posted };
}

const mode = process.argv.slice(2).find((a) => !a.startsWith("--")) || "run";
const dry = process.argv.includes("--dry");
const force = process.argv.includes("--force");

if (mode === "login") {
  ensureProfileDir(bot.profileDir);
  (async () => {
    const creds = loadCredentials();
    const context = await launchStealth(config, { headless: false });
    const page = await context.newPage();
    try {
      await openEmailForm(page, bot.baseUrl);
      // Pre-fill if we have credentials (user still presses Log in / solves captcha).
      const userBox = page.locator("input[name='username'], input[placeholder='Email or username'], input[type='email']").first();
      const passBox = page.locator("input[type='password']").first();
      if (creds && (creds.username || creds.email) && creds.password) {
        if (await userBox.isVisible().catch(() => false) && await passBox.isVisible().catch(() => false)) {
          await userBox.click();
          await page.keyboard.type(creds.username || creds.email, { delay: rand(bot.typingSpeedMs[0], bot.typingSpeedMs[1]) });
          await humanDelay([300, 900]);
          await passBox.click();
          await page.keyboard.type(creds.password, { delay: rand(bot.typingSpeedMs[0], bot.typingSpeedMs[1]) });
          log("credentials pre-filled (username=" + (creds.username || creds.email) + ")");
        }
      }
      log("");
      log("──────────────────────────────────────────────────────────────");
      log("A Firefox window opened (Playwright's own Firefox).");
      log("Log in to @theitsupportguru THERE — press Log in, solve any");
      log("CAPTCHA / slider / 2FA code. Window stays open until the session");
      log("cookie is saved, or you close it. Ctrl+C here to quit.");
      log("──────────────────────────────────────────────────────────────");
      let waitedMin = 0;
      for (let i = 0; i < 3600; i++) {
        await sleep(1000);
        const cks = await context.cookies("https://www.tiktok.com").catch(() => []);
        if (hasSessionCookies(cks)) {
          log("SESSION CONFIRMED: saved to " + bot.profileDir + ". You're done — close the window.");
          await page.close();
          await context.close();
          process.exit(0);
        }
        if (i % 60 === 59) {
          waitedMin++;
          const rate = page.getByText(/maximum number of attempts|too many attempts|try again later/i).first();
          const rateLimited = await rate.isVisible().catch(() => false);
          log(`still waiting… ${waitedMin} min` + (rateLimited ? " | TikTok: rate-limited, try again later" : " | complete the login in the window"));
        }
      }
      log("Closed after 60 min without a session. Re-run npm run tiktok:login when ready.");
      await page.close();
      await context.close();
      process.exit(1);
    } catch (e) {
      console.error("Login error: " + e.message);
      await context.close().catch(() => {});
      process.exit(1);
    }
  })();
} else if (mode === "login:auto") {
  ensureProfileDir(bot.profileDir);
  (async () => {
    const creds = loadCredentials();
    if (!creds || !(creds.username || creds.email || creds.phone) || !creds.password) {
      console.error("No credentials at " + CREDS_FILE + ". Add { username, password } and retry.");
      process.exit(1);
    }
    let ok = false;
    // 1) Try fully headless credential login first.
    try {
      const context = await launchStealth(config); // headless per config
      const page = await context.newPage();
      try {
        ok = await autoLogin(page, context, creds);
        log(ok ? "CREDENTIAL LOGIN OK — session saved to " + bot.profileDir : "headless login did not complete");
      } finally {
        await page.close();
        await context.close();
      }
    } catch (e) {
      log("headless credential login failed (" + e.message + ") — switching to assisted login…");
    }
    // 2) Fall back to a visible window with creds pre-filled (human finishes captcha/2FA).
    if (!ok) {
      ok = await autoLoginHeadful(creds);
    }
    process.exit(ok ? 0 : 1);
  })().catch((e) => { console.error("Auto-login error: " + e.message); process.exit(1); });
} else if (mode === "login:qr") {
  // QR login: no password, no rate limit. User scans the code with the
  // TikTok app (already signed in as the account) and confirms.
  ensureProfileDir(bot.profileDir);
  (async () => {
    const context = await launchStealth(config, { headless: false });
    const page = await context.newPage();
    try {
      await gotoRetry(page, bot.baseUrl + "/login", 50000);
      await sleep(1800);
      await acceptConsent(page);
      await sleep(800);
      const qrTab = page.getByText(/use qr code/i, { exact: false }).first();
      if (await qrTab.isVisible().catch(() => false)) {
        await qrTab.click().catch(() => {});
        await sleep(2500);
      }
      const hasQr = await page.locator("img[src*='qrcode' i], img[src*='qr-code' i], canvas, svg").first().isVisible().catch(() => false);
      log("");
      log("──────────────────────────────────────────────────────────────");
      log("QR LOGIN WINDOW OPEN (Playwright's own Firefox).");
      log("Open the TikTok app on your phone -> Profile -> hamburger menu");
      log("-> QR code / 'Scan QR code'. Scan the code shown HERE and confirm.");
      log("No password, no CAPTCHA. Session saves automatically once done.");
      log("──────────────────────────────────────────────────────────────");
      log("QR code area visible: " + hasQr);
      let waitedMin = 0;
      for (let i = 0; i < 3600; i++) {
        await sleep(1000);
        const cks = await context.cookies("https://www.tiktok.com").catch(() => []);
        if (hasSessionCookies(cks)) {
          log("SESSION CONFIRMED: saved to " + bot.profileDir + ". You're done — close the window.");
          await page.close();
          await context.close();
          process.exit(0);
        }
        if (i % 60 === 59) {
          waitedMin++;
          log(`still waiting… ${waitedMin} min — scan the QR code in the window and confirm on your phone.`);
        }      }
      log("Closed after 60 min without a session.");
      await page.close();
      await context.close();
      process.exit(1);
    } catch (e) {
      console.error("QR login error: " + e.message);
      await context.close().catch(() => {});
      process.exit(1);
    }
  })();
} else if (mode === "run" || mode === "bot") {
  runBot({ dryRun: dry, force }).then((r) => {
    if (!r.posted) process.exitCode = 1;
  }).catch((e) => { console.error("Bot error: " + e.message); process.exit(1); });
}

export default { runBot };