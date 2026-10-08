// FREE topic-matched background photos (no API key anywhere).
// Priority: 1) article og:image / RSS media image (exact story photo),
// 2) loremflickr.com keyword image (topic-related, free, no key).
// Caches to out/staging/photos/<slug>.jpg so renders are deterministic.
import fs from "node:fs";
import path from "node:path";

const DIR = path.join("out", "staging", "photos");

const NICHE_KEYWORDS = {
  ai: "robot,artificial-intelligence",
  gadgets: "smartphone,gadget",
  apple: "iphone,macbook",
  hardware: "computer,gaming",
  security: "cyber,lock",
  "it-support": "computer,repair",
  "cloud-devops": "server,datacenter",
};

function slug(s) {
  return String(s || "tech").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "tech";
}

export function keywordsFor(deck) {
  const niche = NICHE_KEYWORDS[deck.niche] || "technology";
  const words = String(deck.title || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
    .filter((w) => w.length > 4 && !/with|from|that|this|will|have|more|than|about|your|just/i.test(w)).slice(0, 2);
  return [...words, niche.split(",")[0]].filter(Boolean).join(",");
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
  const dest = path.join(DIR, slug(deck.id || deck.title) + ".jpg");
  if (fs.existsSync(dest) && fs.statSync(dest).size > 20000) return dest;
  // 1) exact story photo
  if (topicImage && /^https?:\/\//i.test(topicImage)) {
    const got = await download(topicImage, dest);
    if (got) { console.log(`[photo] story image for ${deck.id}`); return got; }
  }
  // 2) OpenVerse (WordPress) CC photo search — FREE, no API key.
  // Deterministic page per deck so re-renders match.
  const kw = keywordsFor(deck);
  try {
    const page = (seedNum(deck.id) % 5) + 1;
    const q = encodeURIComponent(kw.replace(/,/g, " "));
    const r = await fetch(`https://api.openverse.org/v1/images/?q=${q}&page_size=8&page=${page}`, {
      headers: { "User-Agent": "FacelessStudio/1.0" }, signal: AbortSignal.timeout(30000),
    });
    if (r.ok) {
      const j = await r.json();
      const cands = (j.results || []).filter((im) => (im.width || 0) >= 700 && /^https?:\/\//i.test(im.url || ""));
      // Prefer taller images (less crop to 9:16), then widest.
      cands.sort((a, b) => (b.height / b.width - a.height / a.width) || (b.width - a.width));
      for (const im of cands.slice(0, 3)) {
        const got = await download(im.url, dest, 60000);
        if (got) { console.log(`[photo] openverse "${(im.title || "").slice(0, 40)}" for ${deck.id}`); return got; }
      }
    }
  } catch (e) {
    console.warn(`[photo] openverse miss for ${deck.id}: ${e.message}`);
  }
  return null;
}

function seedNum(id) {
  let h = 7;
  for (const c of String(id || "x")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 100000;
}

export default { resolvePhoto, keywordsFor };
