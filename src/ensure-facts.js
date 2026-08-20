import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { loadPlan } from "./ig-generator.js";
import { fetchParagraphs } from "./article.js";

const ARTICLE_CACHE = path.join("data", "article-cache");

function cacheSize(link) {
  if (!link) return 0;
  const key = crypto.createHash("sha1").update(String(link)).digest("hex");
  const f = path.join(ARTICLE_CACHE, key + ".json");
  if (!fs.existsSync(f)) return 0;
  try {
    const c = JSON.parse(fs.readFileSync(f, "utf8"));
    return Array.isArray(c.paragraphs) ? c.paragraphs.length : 0;
  } catch {
    return 0;
  }
}

// Makes sure every news post in today's plan has a deep article cache so QA's
// ">=2 fact bullets" gate passes. Only fetches exactly the links the plan chose.
export async function ensureLeadFacts() {
  const plan = loadPlan();
  if (!plan) throw new Error("No plan found — run ig-generator first");
  const targets = (plan.posts || []).filter((p) => (p.kind === "news" || p.kind === "gadget-focus") && cacheSize(p.link) < 2);
  for (const p of targets) {
    console.log(`[ensure-facts] fetching lead article: ${p.title}`);
    await fetchParagraphs({ link: p.link, title: p.title }).catch((e) => {
      console.warn(`[ensure-facts] fetch failed for ${p.link}: ${e.message}`);
    });
  }
  const stillThin = targets.filter((p) => cacheSize(p.link) < 2);
  console.log(`[ensure-facts] ensured ${targets.length} lead(s); ${stillThin.length} still thin`);
  return { ensured: targets.length, thin: stillThin.length };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("src/ensure-facts.js")) {
  ensureLeadFacts()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("[ensure-facts] " + e.message);
      process.exit(1);
    });
}