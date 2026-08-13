import fs from "node:fs";

export function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export let speedScale = 1;

export function setSpeed(scale) {
  speedScale = scale;
}

export async function humanDelay(range) {
  const [min, max] = range;
  await sleep(Math.max(100, Math.round(rand(min, max) * speedScale)));
}

// Bezier-curve mouse path from current point to (tx, ty) with human jitter.
export async function moveMouse(page, tx, ty) {
  const start = { x: rand(300, 700), y: rand(200, 500) };
  try {
    const cur = await page.mouse;
    if (typeof cur.position === "function") {
      const p = cur.position();
      if (p && p.x !== undefined) { start.x = p.x; start.y = p.y; }
    }
  } catch { /* keep random start */ }

  const steps = rand(18, 32);
  const pts = [];
  const c1x = start.x + rand(-180, 180), c1y = start.y + rand(-180, 180);
  const c2x = tx + rand(-120, 120), c2y = ty + rand(-120, 120);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = (1 - t) ** 3;
    const b = 3 * t * (1 - t) ** 2;
    const c = 3 * t * t * (1 - t);
    const d = t ** 3;
    const x = a * start.x + b * c1x + c * c2x + d * tx + rand(-2, 2);
    const y = a * start.y + b * c1y + c * c2y + d * ty + rand(-2, 2);
    pts.push({ x, y });
  }
  for (const p of pts) {
    await page.mouse.move(p.x, p.y);
    await sleep(rand(8, 35));
  }
}

// Human "read/review" pause before posting.
export async function humanReview(page, x, y) {
  await moveMouse(page, x, y);
  await humanDelay([400, 1200]);
}

export function rotateHashtags(config, niche) {
  const t = config.tiktokBot;
  const base = t.hashtagPool;
  const nicheMap = config.tiktok.nicheHashtags || {};
  const ntags = (nicheMap[niche] || []).slice(0, 3);
  // rotate order and pick a varied subset, never full duplicate block
  const pool = [...base].sort(() => Math.random() - 0.5);
  const set = new Set();
  [...ntags, ...pool].forEach((h) => { if (set.size < 8) set.add(h); });
  const arr = [...set].sort(() => Math.random() - 0.5);
  // 70% chance to append fyp
  if (Math.random() < 0.7) arr.push("#fyp");
  return arr.join(" ");
}

export function randomCaptionTime() {
  // human-ish: never exactly on the hour
  const h = rand(9, 21);
  const m = rand(1, 59);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function ensureProfileDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}