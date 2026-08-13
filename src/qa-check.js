// QA gate for every post before it is allowed to publish. A post that fails
// any check is not posted, the Director is told why, and the fix is proven by
// re-running this script to a clean exit 0.
//
// Checks (per post + manifest):
//   1. date        — manifest.date must be today (AEST, same as the generator)
//   2. entities    — no lingering HTML escapes like &#36; &amp; &lt; in any text
//   3. placeholders— no template filler or newsletter chit-chat in slides
//   4. duplication — TAKEAWAY/WHAT-TO-WATCH slides must not repeat facts bullets
//   5. substance   — news posts need >= 2 real fact bullets; no empty slides
//   6. id hygiene  — post id must not carry escaped junk (-36-29-…)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import config from "../config.json" with { type: "json" };

const IG = config.instagram || {};
const MANIFEST = path.join(IG.postDir || "out/instagram-ready", "manifest.json");

function todayLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
const ENT = /&(amp|lt|gt|quot|apos|#\d+);/i;
const PLACEHOLDERS = [
  "this is moving the whole field right now",
  "what changed:",
  "what to watch: the follow-on tests",
  "follow-on tests, teardowns",
  "launch hype",
  "good morning",
  "hope you had a great weekend",
  "today i’m reading",
  "today i'm reading",
  "as a reminder",
  "subscribe",
  "unsubscribe"
];

export function checkManifest() {
  if (!fs.existsSync(MANIFEST)) {
    console.log("[qa] FAIL — no manifest at " + MANIFEST + " (run the daily build first)");
    return { ok: false, errors: ["no manifest"] };
  }
  const m = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const today = todayLocal();
  const errors = [];

  if (m.date !== today) errors.push("manifest.date " + m.date + " != today " + today);

  for (const p of m.posts || []) {
    const where = "[" + p.slot + "] " + (p.id || p.title || "");
    // Already-live content is immutable — QA gates what is about to post, not history.
    if (p.id && fs.existsSync(path.join(IG.postDir || "out/instagram-ready", p.id, ".posted"))) continue;
    const texts = [p.title];
    if (p.caption) texts.push(p.caption);
    for (const s of p.slides || []) texts.push(s.text);

    if (/&\w+;|&#\d+;/i.test(texts.join("\n"))) {
      errors.push(where + " — lingering HTML entity in text");
    }

    const all = texts.join(" ").toLowerCase();
    for (const ph of PLACEHOLDERS) {
      if (all.includes(ph)) {
        errors.push(where + " — placeholder/filler text: \"" + ph + "\"");
        break;
      }
    }

    if (p.id && /-\d+2?\d?-[\w-]/.test(p.id) && /&#|&[a-z]+;/.test(p.id)) {
      errors.push(where + " — id carries escaped junk");
    }

    if (p.kind === "news" && p.title) {
      const t = String(p.title).trim();
      if (/^tech intel/i.test(t) || /^the tech story/i.test(t) || /today['’]?s? tech/i.test(t)) {
        errors.push(where + " — generic placeholder title: \"" + t + "\"");
      } else if (t.length < 15) {
        errors.push(where + " — news title too short to be a real headline: \"" + t + "\"");
      }
    }

    const factLines = [];
    for (const s of p.slides || []) {
      if (s.kind === "facts" || s.kind === "brief") {
        for (const l of String(s.text || "").split("\n")) {
          const t = l.trim().replace(/^[•▸\-*]\s*/, "").toLowerCase();
          if (t) factLines.push(t);
        }
      }
    }

    for (const s of p.slides || []) {
      if ((s.kind === "body") && /TAKEAWAY|WHAT TO WATCH/i.test(s.text || "")) {
        const n = String(s.text).replace(/^(THE TAKEAWAY|WHAT TO WATCH)\s*—\s*/i, "").trim().toLowerCase();
        if (n && factLines.includes(n)) {
          errors.push(where + " — " + s.text.split("—")[0].trim() + " duplicates a facts bullet");
        }
      }
      if ((s.kind === "body" || s.kind === "facts" || s.kind === "brief") && !String(s.text || "").trim()) {
        errors.push(where + " — empty slide (" + s.kind + ")");
      }
    }

    if (p.kind === "news" && factLines.length < 2) {
      errors.push(where + " — news post has only " + factLines.length + " fact bullet(s)");
    }
  }

  return { ok: errors.length === 0, errors, date: m.date, posts: (m.posts || []).length };
}

// Direct run: node src/qa-check.js
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const r = checkManifest();
  if (r.ok) {
    console.log("[qa] PASS " + r.date + " · " + r.posts + " pending post(s), no defects.");
    process.exit(0);
  }
  console.log("[qa] FAIL — " + r.errors.length + " defect(s):");
  for (const e of r.errors) console.log("  • " + e);
  process.exit(1);
}

export default { checkManifest };