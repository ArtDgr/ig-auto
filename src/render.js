import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import config from "../config.json" with { type: "json" };

const exec = promisify(execFile);
const V = config.video;
const TMP = path.join("out", "staging");
const FPS = 30;

function ensureTmp() {
  fs.mkdirSync(TMP, { recursive: true });
}

function wrap(text, maxLen) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxLen) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur.trim());
  return lines;
}

async function makeSlideImage(index, text, font, fontsize, isHook, outPng, fontcolor) {
  const lines = wrap(text, isHook ? 26 : 24);
  const txtFile = outPng.replace(/\.png$/, ".txt");
  fs.writeFileSync(txtFile, lines.join("\n"), "utf8");
  const draw = `drawtext=fontfile=${V.font}:textfile=${txtFile.replace(/\\/g, "/")}:` +
    `fontsize=${fontsize}:fontcolor=${fontcolor || "white"}:line_spacing=20:` +
    `x=(w-text_w)/2:y=(h-text_h)/2-120:box=1:boxcolor=${hexRgba("0A0E1A", 0.9)}:boxborderw=40`;
  await ff([
    "-f", "lavfi", "-i", `color=c=${V.background.replace("#", "0x")}:s=${V.width}x${V.height}`,
    "-vf", draw,
    "-frames:v", "1",
    "-y", outPng
  ]);
  return lines.join("\n");
}

async function ff(args) {
  const res = await exec("ffmpeg", args, { maxBuffer: 64 * 1024 * 1024 });
  return res.stdout;
}

async function ffprobeDuration(file) {
  const res = await exec(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", file],
    { maxBuffer: 8 * 1024 * 1024 }
  );
  return parseFloat(res.stdout.trim());
}

function hexRgba(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `0x${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}@${a}`;
}

async function makeClip(png, dur, outMp4) {
  await ff([
    "-loop", "1", "-i", png,
    "-vf", `scale=1080:1920,zoompan=z='min(zoom+0.0009,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(dur * FPS)}:s=1080x1920:fps=${FPS},format=yuv420p`,
    "-t", String(dur),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
    "-y", outMp4
  ]);
}

async function ttsToFile(narration, outAudio) {
  const py = process.platform === "win32" ? "py" : "python3";
  await exec(py, [
    path.join("src", "tts", "speak.py"),
    "--text", narration,
    "--voice", config.voice,
    "--out", outAudio
  ]);
}

export async function renderDeck(deck, outPath) {
  ensureTmp();
  const id = deck.id;
  const base = path.join(TMP, id);
  fs.mkdirSync(base, { recursive: true });

  const narration = deck.slides.map((s) => s.text.trim().replace(/[.!?]+$/, "") + ".").join(" ");
  const audio = path.join(base, "narration.mp3");
  await ttsToFile(narration, audio);
  const total = await ffprobeDuration(audio);

  const weights = deck.slides.map((s) => Math.max(1, s.text.length));
  const wsum = weights.reduce((a, b) => a + b, 0);
  const durs = weights.map((w) => Math.max(1.5, (w / wsum) * total));

  const clips = [];
  for (let i = 0; i < deck.slides.length; i++) {
    const s = deck.slides[i];
    const png = path.join(base, `slide_${i}.png`);
    const statColor = s.kind === "hook" && /^[\$0-9][\d.,kKmMbB%]*$/.test(s.text.trim()) ? (config.accentColor || "#0E9384").replace("#", "") : "white";
    await makeSlideImage(i, s.text, V.font, s.kind === "hook" ? 72 : 62, s.kind === "hook", png, statColor);
    const clip = path.join(base, `clip_${i}.mp4`);
    await makeClip(png, durs[i], clip);
    clips.push(clip);
  }

  const listFile = path.join(base, "list.txt");
  fs.writeFileSync(listFile, clips.map((c) => `file '${path.resolve(c).replace(/\\/g, "/")}'`).join("\n"));

  const concat = path.join(base, "concat.mp4");
  await ff(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", "-y", concat]);

  await ff(["-i", concat, "-i", audio, "-c:v", "copy", "-c:a", "aac", "-shortest", "-y", outPath]);
  return outPath;
}

export async function renderAll(decks, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const results = [];
  for (const d of decks) {
    const out = path.join(outDir, `${d.id}.mp4`);
    try {
      await renderDeck(d, out);
      results.push({ id: d.id, ok: true, path: out });
    } catch (e) {
      results.push({ id: d.id, ok: false, error: e.message });
    }
  }
  return results;
}

export default { renderDeck, renderAll };