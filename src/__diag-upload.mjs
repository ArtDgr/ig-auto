import path from "node:path";
import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";

const context = await launchStealth(config);
const page = await context.newPage();
try {
  await page.goto("https://www.tiktok.com", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(5000);
  const upload = page.locator("a:has-text('Upload video'), a:has-text('Upload')").first();
  console.log("upload visible:", await upload.isVisible().catch(() => false));
  const href = await upload.getAttribute("href").catch(() => null);
  console.log("upload href:", href);
  await upload.click().catch((e) => console.log("click err:", e.message));
  await page.waitForTimeout(4000);
  console.log("URL after upload click:", page.url());
  const clip = await page.waitForEvent("filechooser", { timeout: 15000 }).catch(() => null);
  console.log("filechooser:", clip ? "EVENT READY" : "no event (maybe navigated to /upload page)");

  const video = path.join(process.cwd(), "out", "tiktok-ready", "the-ai-safety-test-is-becoming-a-safety-risk.mp4");
  if (clip) {
    await clip.setFiles(video);
    await page.waitForTimeout(6000);
  } else {
    // maybe we're on the upload page already
    const slugInput = page.locator("input[type='file']").first();
    console.log("input[file] count:", await slugInput.count().catch(() => 0));
    if (await slugInput.count()) {
      await slugInput.setInputFiles(video);
      await page.waitForTimeout(6000);
    }
  }
  const captionBox = page.locator("[data-e2e='caption-input'], div[contenteditable='true']").first();
  console.log("caption box visible:", await captionBox.isVisible().catch(() => false));
  await page.screenshot({ path: "out/diag-upload.png" });
  console.log("FINAL URL:", page.url());
} catch (e) {
  console.log("ERR:", e.message);
} finally {
  await context.close().catch(() => {});
  process.exit(0);
}