import fs from "node:fs";
import path from "node:path";
import config from "../config.json" with { type: "json" };

const TIK = config.tiktok;

export function buildCaption(deck) {
  const hook = deck.slides?.find((s) => s.kind === "hook")?.text || deck.title || "";
  const cleanHook = hook.replace(/^TechBrief:\s*/i, "").replace(/[.!…]+/gu, "").trim();
  const nicheTags = TIK.nicheHashtags[deck.niche] || [];
  const tags = [...new Set([...TIK.baseHashtags, ...nicheTags])].join(" ");
  const caption = `${cleanHook}. ${TIK.cta}\n${tags}`.trim();
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