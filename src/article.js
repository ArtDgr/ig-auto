// Best-effort article deepening: the RSS snippet for a picked story is sometimes
// just the title. When it's thin we open the actual article from the mandated
// source, pull the real paragraphs, cache them, and write them back into
// topics.json so cards get genuine substance (numbers, quotes, specifics).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { launchStealth } from "./stealth.js";
import config from "../config.json" with { type: "json" };

const CACHE_DIR = path.join("data", "article-cache");
const MIN_LEN = 240; // snippets at/above this are already rich enough
const MAX_ITEMS = 8; // browser launches are heavy; cap the pass
const CONCURRENCY = 3;

function shorten(s, n) {
  const v = String(s || "").replace(/\s+/g, " ").trim();
  return v.length <= n ? v : v.slice(0, n - 1).trimEnd() + "…";
}

function cachePath(url) {
  const key = crypto.createHash("sha1").update(url).digest("hex");
  return path.join(CACHE_DIR, key + ".json");
}

export async function fetchParagraphs(topic) {
  const cacheFile = cachePath(topic.link);
  if (fs.existsSync(cacheFile)) {
    try {
      const c = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      if (c && Array.isArray(c.paragraphs) && c.paragraphs.length) return c.paragraphs;
    } catch {}
  }
  let context = null;
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    context = await launchStealth(config, { profileDir: path.join("profiles", "article-fetch"), headless: true });
    const page = await context.newPage();
    await page.goto(topic.link, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2600);
    const paras = await page
      .evaluate(() => {
        const root =
          document.querySelector("article, main, [role='main'], .entry-content, .article-content, .post-content") ||
          document.body;
        const out = [];
        for (const p of root.querySelectorAll("p")) {
          const t = (p.innerText || "").replace(/\s+/g, " ").trim();
          if (t.length >= 70 && !/cookie|privacy|subscribe|newsletter/i.test(t.slice(0, 60)) && out.length < 8) out.push(t);
        }
        const sibs = Array.from(document.querySelectorAll("p"));
        for (const p of sibs) {
          const t = (p.innerText || "").replace(/\s+/g, " ").trim();
          if (t.length >= 70 && out.length < 8 && !out.includes(t)) out.push(t);
        }
        return out;
      })
      .catch(() => []);
    await page.close().catch(() => {});
    if (paras.length >= 2) {
      fs.writeFileSync(
        cacheFile,
        JSON.stringify({ url: topic.link, fetched: new Date().toISOString(), paragraphs: paras }, null, 2)
      );
      return paras;
    }
  } catch {}
  finally {
    if (context) await context.close().catch(() => {});
  }
  return null;
}

// Iterate topics.json, deepen any story whose snippet is thin, persist results.
export async function deepenTopicsPool(groups, { max = MAX_ITEMS } = {}) {
  if (!Array.isArray(groups)) return { deepened: 0 };
  const queue = [];
  for (const g of groups) {
    for (const it of g.items || []) {
      if (it && it.link && String(it.snippet || "").trim().length < MIN_LEN) queue.push(it);
    }
  }
  if (!queue.length) return { deepened: 0 };
  queue.sort((a, b) => String(b.snippet || "").length - String(a.snippet || "").length);
  const targets = queue.slice(0, max);
  let deepened = 0;
  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(batch.map((t) => fetchParagraphs(t)));
    results.forEach((r, j) => {
      if (r.status === "fulfilled" && r.value) {
        thisTopic(batch[j], r.value);
        deepened++;
        console.log(`[deepen] +${shorten(batch[j].title, 48)} — ${r.value.length} paragraph(s)`);
      }
    });
  }
  return { deepened };
}

function thisTopic(topic, paras) {
  const joined = paras.join(" ").replace(/\s+/g, " ").trim();
  if (joined.length > 60) topic.snippet = shorten(joined, 1100);
}

export default { fetchParagraphs, deepenTopicsPool };