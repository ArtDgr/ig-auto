import fs from "node:fs";
import path from "node:path";
import config from "../config.json" with { type: "json" };

const TIK = config.tiktok;

// Engagement questions rotate per video (comments are a top 2026 ranking
// signal). Deterministic per deck id so re-renders keep the same question.
const ENGAGE_QS = [
  "Agree or disagree? 👇",
  "Which one surprised you most? 👇",
  "Have you seen this yet? 👇",
  "Save this for later — which tip helps you most? 👇",
  "Tag someone who needs to know this 👇",
];

export function cleanCaptionHeadline(value) {
  return String(value || "")
    .replace(/^TechBrief:\s*/i, "")
    .replace(/[.!?]+$/u, "")
    .trim();
}

export function isCompleteCaptionHeadline(value) {
  const headline = String(value || "").trim();
  return Boolean(headline)
    && !/(?:\.{3}|…)\s*$/u.test(headline)
    && !/(?:[$€£]|(?:\b(?:to|with|in|for|and|or|of|a|an|the)\b))\s*$/iu.test(headline);
}

export function buildCaption(deck) {
  const sourceHeadline = deck.captionTitle || deck.title || deck.slides?.find((s) => s.kind === "hook")?.text || "";
  if (!isCompleteCaptionHeadline(sourceHeadline)) {
    throw new Error(`Incomplete TikTok caption headline for "${deck.id || "unknown deck"}": ${sourceHeadline}`);
  }
  const cleanHook = cleanCaptionHeadline(sourceHeadline);
  const nicheTags = TIK.nicheHashtags[deck.niche] || [];
  const tags = [...new Set([...TIK.baseHashtags, ...nicheTags])].join(" ");
  let h = 0;
  for (const c of String(deck.id || cleanHook)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const q = ENGAGE_QS[h % ENGAGE_QS.length];
  const caption = `${cleanHook}. ${q} ${TIK.cta}\n${tags}`.trim();
  return caption;
}

export function writeCaptions(decks, watchDir, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  if (!fs.existsSync(watchDir)) { console.log("[captions] nothing to caption yet: " + watchDir); return 0; }
  const videos = fs.readdirSync(watchDir).filter((f) => f.endsWith(".mp4"));
  let count = 0;
  for (const v of videos) {
    const deck = decks.find((d) => d.id === v.replace(/\.mp4$/, ""));
    if (!deck) {
      console.warn(`[captions] no matching script for ${v}; leaving this older video untouched`);
      continue;
    }
    const caption = buildCaption(deck);
    const stem = v.replace(/\.mp4$/, "");
    const txtOut = path.join(outDir, stem + ".txt");
    fs.writeFileSync(txtOut, caption, "utf8");
    fs.writeFileSync(path.join(outDir, stem + ".qa.json"), JSON.stringify({
      headline: cleanCaptionHeadline(deck.captionTitle || deck.title || deck.slides?.find((s) => s.kind === "hook")?.text || "")
    }, null, 2) + "\n", "utf8");
    count++;
  }
  return count;
}

export default { buildCaption, cleanCaptionHeadline, isCompleteCaptionHeadline, writeCaptions };