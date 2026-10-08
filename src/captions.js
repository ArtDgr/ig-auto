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

export function buildCaption(deck) {
  const hook = deck.slides?.find((s) => s.kind === "hook")?.text || deck.title || "";
  const cleanHook = hook.replace(/^TechBrief:\s*/i, "").replace(/[.!…]+/gu, "").trim();
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
    if (!deck) continue;
    const caption = buildCaption(deck);
    const txtOut = path.join(outDir, v.replace(/\.mp4$/, ".txt"));
    fs.writeFileSync(txtOut, caption, "utf8");
    count++;
  }
  return count;
}

export default { buildCaption, writeCaptions };