import fs from "node:fs";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import config from "../config.json" with { type: "json" };

const __dirname = path.resolve(path.dirname(""));
const OUT = path.join("data", "topics.json");
const DAYS_OLD = 3;

const FALLBACK = {
  ai: [
    "Why every company is suddenly shipping AI 'agents' now",
    "The tiny laptop that runs huge AI models offline",
    "How prompt engineering is quietly becoming a real career",
    "OpenAI vs Anthropic: what actually changed this week",
    "The AI watermark hiding inside text you can't see"
  ],
  gadgets: [
    "Your phone has a battery trick you never used",
    "The hidden sensor inside every modern smartphone",
    "Why USB-C finally won (and what it killed)",
    "The last phone you'll need for 5 years",
    "A charging myth that's roasting your battery"
  ],
  security: [
    "The password trick that defeats most phishing",
    "How scammers read your two-factor codes",
    "One setting that closes the biggest security hole",
    "Why 'random' passwords still get hacked",
    "The leak everyone ignores until it's too late"
  ],
  "cloud-devops": [
    "The quickest way to deploy your first container today",
    "Why cloud cost-tags still surprise everyone",
    "One rule that keeps secret keys out of your repo",
    "How teams finally fixed their flaky deployments",
    "The monitoring practice that spots problems first"
  ],
  "it-support": [
    "The startup-app setting that makes Windows boot fast",
    "A two-minute fix for a PC that keeps freezing",
    "Why restarting your router beats resetting your WiFi",
    "The backup mistake nearly everyone makes",
    "One Windows setting that closes most security holes"
  ],
  programming: [
    "The one line of code most new devs forget",
    "Why your Python script is slower than it should be",
    "A Git trick that saves you from a bad merge",
    "The mistake that ships bugs every Friday",
    "How senior devs actually review code"
  ],
  hardware: [
    "The GPU spec that matters more than VRAM",
    "One setting that unlocks more FPS for free",
    "Why PC gamers are upgrading storage first this year",
    "The console vs PC value question, answered",
    "A cheap upgrade that rivals a new graphics card"
  ]
};

function stripHtml(s) {
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFeed(text, nicheId) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: "text",
    processEntities: false,
    maxDepth: 30
  });
  try {
    const doc = parser.parse(text) || {};
    const rawItems = doc.rss?.channel?.item || doc.feed?.entry;
    const list = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
    return list
      .filter((i) => i.title)
      .map((i) => {
        const link = extractText(i.link);
        const atomHref = typeof i.link === "object"
          ? (Array.isArray(i.link)
              ? ((i.link.find((l) => l && (l["@rel"] === "alternate" || !l["@rel"])) || {})["@href"] || "")
              : i.link["@href"] || "")
          : "";
        return {
          title: clean(extractText(i.title)),
          link: atomHref || link,
          pubDate:
            extractText(i.pubDate) ||
            extractText(i.isoDate) ||
            extractText(i.published) ||
            extractText(i.updated) ||
            "",
          snippet: clean(
            stripHtml(
              extractText(i.description) ||
                extractText(i["content:encoded"] || i.content) ||
                extractText(i.summary) ||
                ""
            )
          ).slice(0, 700),
          niche: nicheId
        };
      });
  } catch {
    return [];
  }
}

function extractText(v) {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") return v.text || v["#text"] || v.cdata || "";
  return String(v || "");
}

function clean(s) {
  return String(s)
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&#8217;|&rsquo;|&#39;/g, "'")
    .replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .trim();
}

function matchesNiche(item, niche) {
  const t = (item.title + " " + item.snippet).toLowerCase();
  return niche.keywords.some((k) => t.includes(k.toLowerCase()));
}

const FEED_UA_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const FEED_UA_PLAIN = "Mozilla/5.0";

async function fetchFeed(url, timeoutMs = 12000) {
  // Some feeds only serve browser UAs (SourceForge, Spiceworks); others block
  // Chrome and accept a plain Mozilla string (Super User). Try both in order.
  for (const ua of [FEED_UA_CHROME, FEED_UA_PLAIN]) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctl.signal,
        headers: { "User-Agent": ua }
      });
      if (res.ok) return await res.text();
      if (res.status === 403 || res.status === 429) continue;
      throw new Error("status " + res.status);
    } finally {
      clearTimeout(t);
    }
  }
  throw new Error("status 403/429 on all user agents");
}

const seen = new Set();

function mineTopicFromFeed(item, niche) {
  const t = item.title;
  if (!t) return null;
  const sentences = t.split(/(?<=\.)\s+/);
  return sentences[0];
}

export async function curate() {
  const pool = [];
  for (const niche of config.niches) {
    const items = [];
    for (const url of niche.feeds) {
      try {
        const xml = await fetchFeed(url);
        if (!xml) continue;
        items.push(...parseFeed(xml, niche.id));
      } catch (e) {
        console.warn(`  [warn] feed ${url}: ${e.message}`);
      }
    }
    const recent = items.filter((i) =>
      (new Date() - new Date(i.pubDate)) / 86400000 < DAYS_OLD || !i.pubDate
    );
    const matched = recent.filter((i) => matchesNiche(i, niche));
    const unique = [...new Map(matched.map((i) => [i.title, i])).values()]
      .filter((i) => {
        const k = i.title.toLowerCase().slice(0, 40);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, Number.MAX_SAFE_INTEGER);
    pool.push({ nicheId: niche.id, items: unique });
    console.log(`[curate] ${niche.id}: ${unique.length} fresh items`);
  }
  return pool;
}

export function fallbackPool() {
  return Object.entries(FALLBACK).map(([nicheId, titles]) => ({
    nicheId,
    items: titles.map((title) => ({ title, link: "", pubDate: "", niche: { nicheId } }))
  }));
}

export function suggestions(topic, nicheId, nicheKeywords) {
  const kw = nicheKeywords?.length ? nicheKeywords.slice(0, 2).join(", ") : nicheId;
  const t = topic.toLowerCase();
  if (t.includes("watermark") || t.includes("hiding")) {
    return [
      "I saw this and immediately wanted to test it myself",
      "Here's why it's more common than you think",
      "The angle that makes engineers nervous",
      "What actually changes: the size of the effect",
      "I break down the one line that matters."
    ];
  }
  return [
    "I saw this and immediately wanted to test it.",
    "Here's why it's more common than you think.",
    `If you care about ${kw}, this changes things.`,
    "Break it down: one sentence at a time.",
    "The single takeaway you can use today."
  ];
}

export default { curate, fallbackPool };