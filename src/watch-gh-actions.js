// Local watchdog: polls GitHub Actions runs for the daily IG build and raises a
// Windows toast when today's build failed or never ran (missed). Best-effort,
// never throws — designed to run from a headless S4U scheduled task.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { notify } from "./notify.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = path.join(ROOT, "sessions", "gh-watch.json");
const AEST_OFFSET_MS = 10 * 3600 * 1000;

function loadConfig() {
  try {
    return JSON.parse(readFileSync(path.join(ROOT, "config.json"), "utf8"));
  } catch {
    return {};
  }
}

function loadToken() {
  try {
    const cred = path.join(ROOT, "credentials", "github.json");
    return JSON.parse(readFileSync(cred, "utf8")).token || "";
  } catch {}
  return process.env.GITHUB_TOKEN || "";
}

function loadState() {
  try {
    return JSON.parse(readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { failedRuns: [], missedDates: [] };
  }
}

function saveState(s) {
  try {
    mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
  } catch {}
}

const aestDateOf = (ms) => new Date(ms + AEST_OFFSET_MS).toISOString().slice(0, 10);
const nowAest = () => Date.now() + AEST_OFFSET_MS;
const weekdayAest = () => {
  const d = new Date(nowAest());
  return d.getUTCDay() >= 1 && d.getUTCDay() <= 5;
};
const hourAest = () => new Date(nowAest()).getUTCHours();

const test = process.argv.includes("--test");
if (test) {
  await notify({ title: "Faceless Studio alert OK", message: "Popup test — the failure alert is wired up." });
  console.log("test toast raised");
  process.exit(0);
}

const wfArg = process.argv.find((a) => a.startsWith("--workflow="));
const targetName = wfArg ? wfArg.split("=")[1] : "daily-ig-build";
const cfg = loadConfig();
const repo = (cfg.buffer && cfg.buffer.repo) || "ArtDgr/ig-auto";
const token = loadToken();
const state = loadState();
const today = aestDateOf(Date.now());
const todayRuns = [];

let log = [];

try {
  const headers = { Accept: "application/vnd.github+json" };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=50`, { headers });
  if (!res.ok) {
    console.log(`watch: GH API ${res.status} (skipping)`);
    process.exit(0);
  }
  const data = await res.json();
  for (const r of data.workflow_runs || []) {
    if (r.name !== targetName) continue;
    const runDate = aestDateOf(Date.parse(r.created_at));
    if (runDate === today) todayRuns.push(r);
  }

  // 1) Failed runs today -> toast once per run id.
  for (const r of todayRuns) {
    if (r.status === "completed" && r.conclusion === "failure" && !state.failedRuns.includes(r.id)) {
      state.failedRuns.push(r.id);
      await notify({
        title: "IG auto-build FAILED",
        message: `Build run #${r.id} failed today. Open: https://github.com/${repo}/actions/runs/${r.id}`
      });
      log.push(`notified failure run ${r.id}`);
    }
  }

  // 2) No run at all today by 07:00 AEST on a weekday -> missed build.
  if (todayRuns.length === 0 && weekdayAest() && hourAest() >= 7 && !state.missedDates.includes(today)) {
    state.missedDates.push(today);
    await notify({
      title: "IG build MISSED today",
      message: `No daily-ig-build run on ${today} — nothing was scheduled for today. Open: https://github.com/${repo}/actions`
    });
    log.push(`notified missed build ${today}`);
  }

  saveState(state);
  console.log(log.length ? log.join("\n") : "watch: nothing to notify");
} catch (e) {
  console.log("watch: error (skipping): " + e.message);
  process.exit(0);
}