// Morning check for @theitsupportguru — run at ~06:30 AEST.
// Verifies last night's cron build (05:30 AEST) landed: GH Actions run,
// Buffer queue for today, QA, duplicates, reel, boost state. Writes a report.
import fs from "node:fs";
import path from "node:path";
import config from "../config.json" with { type: "json" };

const REPO = "ArtDgr/ig-auto";
const ORG_ID = "696059da7b71f5f5cc3c31ec";
const REPORT = "out/morning-check.md";

const now = new Date();
const aestDate = new Date(now.getTime() + 10 * 3600 * 1000).toISOString().slice(0, 10);
const ymd = aestDate.replace(/-/g, "");
const lines = [];
const issues = [];

function log(s) {
  console.log(s);
  lines.push(s);
}
function issue(s) {
  issues.push(s);
  log("  ISSUE: " + s);
}

async function ghJson(url) {
  const r = await fetch("https://api.github.com" + url, { headers: { "User-Agent": "morning-check", Accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error("GH " + r.status + " " + url);
  return r.json();
}

async function bufferGql(query) {
  const key = process.env.BUFFER_API_KEY || (config.buffer && config.buffer.apiKey) || "";
  if (!key) throw new Error("No Buffer API key");
  const r = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({ query })
  });
  const d = await r.json();
  if (d.errors && d.errors.length) throw new Error("buffer: " + d.errors[0].message);
  return d.data;
}

async function main() {
  log("# Morning check — " + aestDate + " (" + now.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) + " AEST)");
  log("");

  // 1. GitHub Actions: did the 05:30 AEST cron run succeed for today?
  try {
    const runs = await ghJson("/repos/" + REPO + "/actions/runs?per_page=10");
    const toAestDate = (iso) => new Date(new Date(iso).getTime() + 10 * 3600 * 1000).toISOString().slice(0, 10);
    const todayRun = runs.workflow_runs.find((r) => toAestDate(r.created_at) === aestDate);
    const lastRuns = runs.workflow_runs.slice(0, 5);
    log("## GitHub Actions (last 5 runs)");
    for (const r of lastRuns) {
      log(`- ${toAestDate(r.created_at)} ${r.created_at.slice(11, 16)}Z ${r.event} → ${r.status}/${r.conclusion || "running"}`);
    }
    if (todayRun) {
      if (todayRun.conclusion === "success") log("✓ Today's cron build (05:30 AEST): SUCCESS");
      else if (todayRun.status === "in_progress") log("! Today's cron build: still in progress");
      else issue("today's cron build conclusion = " + todayRun.conclusion);
    } else {
      issue("no GH Actions run found for today (" + aestDate + ") — cron may not have fired");
    }
    log("");
  } catch (e) {
    issue("GitHub API: " + e.message);
  }

  // 2. Buffer queue for today
  try {
    const q = `{ posts(input: { organizationId: "${ORG_ID}" }, first: 50) { edges { node { id status dueAt sentAt text assets { __typename ... on ImageAsset { source } ... on VideoAsset { source } } } } } }`;
    const d = await bufferGql(q);
    const nodes = (d.posts?.edges || []).map((e) => e.node);
    const todayIso = aestDate; // "2026-08-20"
    const todayScheduled = nodes
      .filter((n) => n.status === "scheduled")
      .filter((n) => n.dueAt && n.dueAt.startsWith(todayIso));
    const todaySent = nodes
      .filter((n) => n.status === "sent")
      .filter((n) => n.sentAt && n.sentAt.startsWith(todayIso));

    log("## Buffer queue for " + aestDate);
    const sorted = [...todayScheduled].sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1));
    if (!sorted.length) {
      issue("NO scheduled posts for today in Buffer");
    }
    for (const n of sorted) {
      const local = new Date(n.dueAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", timeZone: "Australia/Brisbane" });
      const kind = n.assets?.some((a) => a.__typename === "VideoAsset") ? "REEL" : "CARD";
      log(`- ${local} ${kind} ${n.id} | ${(n.text || "").replace(/\s+/g, " ").slice(0, 55)}`);
    }
    log("");
    log("Sent today: " + todaySent.length + (todaySent.length ? " (already live)" : ""));
    log("");

    // 3. Duplicate check: any slot due twice today?
    const dueKeys = sorted.map((n) => n.dueAt.slice(0, 16));
    const dup = dueKeys.filter((k, i) => dueKeys.indexOf(k) !== i);
    if (dup.length) issue("duplicate dueAt times in today's queue: " + [...new Set(dup)].join(", "));
  } catch (e) {
    issue("Buffer API: " + e.message);
  }

  // 4. Local artifacts (if present — reflects last committed build)
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(config.instagram.postDir, "manifest.json"), "utf8"));
    log("## Committed build (manifest)");
    log("- manifest date: " + manifest.date + (manifest.date === aestDate ? " ✓ today" : " — " + (manifest.date < aestDate ? "STALE" : "future")));
    log("- posts: " + (manifest.posts || []).length);
    for (const p of manifest.posts || []) {
      const posted = fs.existsSync(path.join(config.instagram.postDir, p.id, ".posted"));
      log(`  [${p.slot}] ${p.kind} ${posted ? "POSTED" : "pending"} | ${(p.title || "").slice(0, 55)}`);
    }
    log("");
  } catch (e) {
    log("## Committed build: manifest not readable (" + e.message + ")");
    log("");
  }

  // 5. Reel file for today committed
  try {
    const r = await ghJson("/repos/" + REPO + "/contents/out/instagram-reels?ref=main");
    const reels = (Array.isArray(r) ? r : []).filter((f) => f.name.startsWith(ymd) && f.name.endsWith(".mp4"));
    log("## Reel");
    log(reels.length ? "✓ today's reel committed: " + reels[0].name : "! no reel committed for " + ymd);
    log("");
  } catch (e) {
    log("## Reel: GH API " + e.message);
    log("");
  }

  // 6. Boost state
  try {
    const boost = JSON.parse(fs.readFileSync("data/boost-state.json", "utf8"));
    log("## Boost agent");
    log("- reposts tracked: " + (boost.reposts || []).length);
    const last = (boost.reposts || []).slice(-1)[0];
    if (last) log("- last repost target: " + last.target + " (" + (last.text || "").slice(0, 40) + ")");
    log("");
  } catch (e) {
    log("## Boost: no local state (" + e.message + ")");
    log("");
  }

  // Summary
  log("---");
  if (issues.length) {
    log("VERDICT: " + issues.length + " issue(s) — see above");
  } else {
    log("VERDICT: all clear — build landed, today's posts queued, no duplicates.");
  }

  fs.mkdirSync("out", { recursive: true });
  fs.writeFileSync(REPORT, lines.join("\n"), "utf8");
  console.log("\nReport written to " + REPORT);
}

main().catch((e) => {
  console.error("morning-check failed: " + e.message);
  process.exit(1);
});