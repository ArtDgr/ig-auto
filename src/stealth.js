import { chromium } from "playwright";
import { firefox } from "playwright";

// Minimal stealth: masked automation markers, realistic UA strings.
const UAS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.68",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.2535.67"
];

export async function launchPersistent(config, opts = {}) {
  const tiktok = config.tiktokBot || {};
  const profileDir = opts.profileDir || tiktok.profileDir;
  const headless = opts.headless !== undefined ? opts.headless : tiktok.headless !== undefined ? tiktok.headless : false;
  const engine = (opts.engine || tiktok.engine || "firefox").toLowerCase();
  const ua = UAS[Math.floor(Math.random() * UAS.length)];

  const common = { headless, locale: "en-US", timezoneId: "Australia/Sydney", colorScheme: "light" };
  let context;

  if (engine === "edge") {
    context = await chromium.launchPersistentContext(profileDir, {
      ...common,
      channel: "msedge",
      viewport: { width: 1366, height: 768 },
      args: ["--disable-blink-features=AutomationControlled"]
    });
  } else {
    context = await firefox.launchPersistentContext(profileDir, {
      ...common,
      viewport: { width: 1366, height: 768 },
      userAgent: ua
    });
  }

  context.on("close", () => console.log("[stealth] browser context CLOSED"));
  context.on("weberror", (e) => console.log("[stealth] weberror: " + (e && e.error && e.error.message || e)));

  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
  });

  return context;
}

export async function launchStealth(config, opts = {}) {
  return launchPersistent(config, opts);
}