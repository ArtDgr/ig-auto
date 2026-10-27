// FREE topic-matched background photos (no API key anywhere).
// Prefer the story's own image, then the most relevant Openverse result.
// Cache images and source/license metadata for reproducible, attributable use.
import fs from "node:fs";
import path from "node:path";

const DIR = path.join("out", "staging", "photos");

const NICHE_SEARCH_TERMS = {
  ai: ["artificial intelligence", "neural network", "robotics"],
  gadgets: ["smartphone", "mobile device", "consumer electronics"],
  apple: ["Apple", "iPhone", "MacBook"],
  hardware: ["computer hardware", "processor", "graphics card"],
  security: ["cybersecurity", "computer security", "data protection"],
  "it-support": ["computer repair", "technical support", "computer troubleshooting"],
  "cloud-devops": ["cloud computing", "data center", "server infrastructure"],
};
const STOPWORDS = new Set([
  "about", "after", "also", "amid", "among", "been", "being", "could", "from",
  "have", "just", "more", "most", "new", "over", "says", "than", "that",
  "their", "them", "there", "these", "they", "this", "through", "under", "with",
  "will", "would", "your", "what", "when", "where", "which", "while", "whose",
  "using", "uses", "has", "are", "was", "were", "and", "for",
  "the", "its", "but", "not", "now", "how", "why", "who", "you", "our", "out",
]);

function slug(s) {
  return String(s || "tech").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "tech";
}

export function keywordsFor(deck) {
  const words = titleTerms(deck.captionTitle || deck.title);
  const niche = NICHE_SEARCH_TERMS[deck.niche] || ["technology"];
  return [...new Set([...words.slice(0, 4), ...niche])].join(" ");
}

function titleTerms(title) {
  return [...new Set(
    String(title || "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !STOPWORDS.has(word) && !/^\d+$/u.test(word))
  )];
}

function metadataTerms(image) {
  const tags = Array.isArray(image.tags)
    ? image.tags.map((tag) => typeof tag === "string" ? tag : tag?.name || "")
    : [];
  return new Set(
    `${image.title || ""} ${image.description || ""} ${tags.join(" ")}`
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

export function scorePhotoCandidate(image, deck) {
  const terms = metadataTerms(image);
  const storyTerms = titleTerms(deck.captionTitle || deck.title);
  const storyMatches = storyTerms.filter((term) => terms.has(term)).length;
  if (!storyMatches) return 0;
  const nicheWords = (NICHE_SEARCH_TERMS[deck.niche] || ["technology"])
    .flatMap((phrase) => titleTerms(phrase));
  const nicheMatches = [...new Set(nicheWords)].filter((term) => terms.has(term)).length;
  const width = Number(image.width) || 0;
  const height = Number(image.height) || 0;
  const portraitBonus = width && height ? Math.max(0, 1 - Math.abs((width / height) - (9 / 16))) : 0;
  return storyMatches * 5 + nicheMatches + portraitBonus;
}

function writePhotoSource(dest, source) {
  fs.writeFileSync(dest.replace(/\.jpg$/i, ".json"), JSON.stringify(source, null, 2) + "\n", "utf8");
}

async function download(url, dest, timeoutMs = 90000) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, redirect: "follow", signal: ctl.signal });
    } finally {
      clearTimeout(t);
    }
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!/image/i.test(ct) && !/loremflickr/i.test(url)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 20000) return null; // placeholder / 1px junk
    // JPEG magic check (loremflickr redirects to .jpg)
    if (buf[0] !== 0xff || buf[1] !== 0xd8) {
      // allow png too
      if (!(buf[0] === 0x89 && buf[1] === 0x50)) return null;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    return dest;
  } catch { return null; }
}

export async function resolvePhoto(deck, topicImage) {
  fs.mkdirSync(DIR, { recursive: true });
  const dest = path.join(DIR, slug(deck.id || deck.title) + "-topic-v2.jpg");
  if (fs.existsSync(dest) && fs.statSync(dest).size > 20000) return dest;
  // 1) exact story photo
  if (topicImage && /^https?:\/\//i.test(topicImage)) {
    const got = await download(topicImage, dest);
    if (got) {
      writePhotoSource(dest, { source: "article", title: deck.title, imageUrl: topicImage });
      console.log(`[photo] story image for ${deck.id}`);
      return got;
    }
  }
  // 2) Openverse CC search, ranked by story terms before crop suitability.
  const kw = keywordsFor(deck);
  try {
    const q = encodeURIComponent(kw);
    const r = await fetch(`https://api.openverse.org/v1/images/?q=${q}&page_size=20&page=1`, {
      headers: { "User-Agent": "FacelessStudio/1.0" }, signal: AbortSignal.timeout(30000),
    });
    if (r.ok) {
      const j = await r.json();
      const cands = (j.results || [])
        .filter((im) => (im.width || 0) >= 700 && /^https?:\/\//i.test(im.url || ""))
        .map((image) => ({ image, score: scorePhotoCandidate(image, deck) }))
        .filter((candidate) => candidate.score > 0)
        .sort((a, b) => b.score - a.score);
      for (const { image } of cands.slice(0, 4)) {
        const got = await download(image.url, dest, 60000);
        if (got) {
          writePhotoSource(dest, {
            source: "Openverse",
            title: image.title || "",
            creator: image.creator || "",
            license: image.license || "",
            licenseVersion: image.license_version || "",
            attributionUrl: image.foreign_landing_url || image.url,
            imageUrl: image.url,
          });
          console.log(`[photo] Openverse "${(image.title || "").slice(0, 48)}" for ${deck.id}`);
          return got;
        }
      }
    }
  } catch (e) {
    console.warn(`[photo] openverse miss for ${deck.id}: ${e.message}`);
  }
  return null;
}

export default { resolvePhoto, keywordsFor, scorePhotoCandidate };
