import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import config from "../config.json" with { type: "json" };

const exec = promisify(execFile);
const V = config.video;
const TMP = path.join("out", "staging");
const FPS = 30;

// Per-niche accent colors drive the animated gradient + glow. All sit in the
// black/white/electric-blue brand family; security reels skew red.
const REEL_ACCENTS = {
  ai: "#00A8FF",
  gadgets: "#00A8FF",
  apple: "#38BDF8",
  hardware: "#22D3EE",
  security: "#FF5A50",
  "it-support": "#00E5FF",
  "cloud-devops": "#818CF8"
};

// Topic-matched reel themes — mirrors TOPIC_THEMES in ig-render.js but
// tuned for video: accent + life ratio/mold/speed per subject.
// If reel is about cybersecurity → red shield circuitry, smartphone → warm amber, AI → violet neural etc.
const TOPIC_REEL_THEMES = [
  { re: /(breach|hack|ransomware|malware|phishing|vulnerab|zero.day|exploit|password|2fa|patch|attack|steal)/i, accent: "#FF3B30", life: { ratio: 0.09, mold: 8, speed: 0.12 } },
  { re: /(\bai\b|gpt|llm|model|agent|neural|openai|anthropic|gemini|copilot|intelligence|machine.learning|bot)/i, accent: "#7C3AED", life: { ratio: 0.06, mold: 5, speed: 0.18 } },
  { re: /(battery|charging|charge|usb.c|power|mah|fast.charge)/i, accent: "#16A34A", life: { ratio: 0.05, mold: 6, speed: 0.10 } },
  { re: /(wifi|router|signal|mesh|network)/i, accent: "#0EA5E9", life: { ratio: 0.07, mold: 6, speed: 0.14 } },
  { re: /(camera|photo|lens|sensor|image)/i, accent: "#7C3AED", life: { ratio: 0.06, mold: 6, speed: 0.13 } },
  { re: /(cpu|gpu|chip|processor|ryzen|intel|amd|nvidia|rtx|ssd|ram|benchmark|core|silicon|semiconductor)/i, accent: "#0D9488", life: { ratio: 0.08, mold: 7, speed: 0.11 } },
  { re: /(cloud|server|data.center|datacenter|kubernetes|docker|container|aws|azure|storage|infra|uptime|devops|sre)/i, accent: "#2563EB", life: { ratio: 0.07, mold: 6, speed: 0.10 } },
  { re: /(phone|pixel|galaxy|iphone|android|samsung|redmi|honor|fold|smartphone|tablet|watch|wearable|gadget)/i, accent: "#F59E0B", life: { ratio: 0.06, mold: 5, speed: 0.15 } },
  { re: /(apple|mac|macos|ios|ipad|app.store|siri|macbook|apple.silicon)/i, accent: "#0EA5E9", life: { ratio: 0.05, mold: 5, speed: 0.13 } },
];

function accentFor(niche) {
  return REEL_ACCENTS[niche] || config.accentColor || "#0E9384";
}
function themeForDeck(deck) {
  const hay = `${deck.niche || ""} ${deck.title || ""} ${deck.slides?.map(s=>s.text).join(" ") || ""}`;
  const topic = TOPIC_REEL_THEMES.find(t=> t.re.test(hay));
  if (topic) return { accent: topic.accent, life: topic.life, topic: true };
  return { accent: accentFor(deck.niche), life: null, topic: false };
}

function hex0x(hex) {
  return "0x" + String(hex).replace("#", "").toUpperCase();
}

function mixHex(a, b, t) {
  const pa = parseInt(a.replace("#", ""), 16);
  const pb = parseInt(b.replace("#", ""), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return "0x" + ((r << 16) | (g << 8) | bl).toString(16).toUpperCase().padStart(6, "0");
}

function seedFromId(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 2147483647) + 1;
}

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

async function ttsToFile(narration, outAudio) {
  const py = process.platform === "win32" ? "py" : "python3";
  await exec(py, [
    path.join("src", "tts", "speak.py"),
    "--text", narration,
    "--voice", config.voice,
    "--out", outAudio
  ]);
}

// Animated gradient background (accent-tinted radial over deep navy).
function gradientSource(accent, dur, speed) {
  const c1 = mixHex(accent, "#0A0E1A", 0.55);
  return `gradients=size=1080x1920:rate=${FPS}:nb_colors=4:c0=${hex0x(accent)}:c1=${c1}:c2=0x0A0E1A:c3=0x06202E:type=radial:speed=${speed}:duration=${dur}`;
}

// Conway's Game of Life in the niche accent over near-black. Scaled up with
// nearest-neighbour it reads as living circuitry / a neural net crawling over
// the gradient — technology that moves, not a flat background.
function lifeSource(accent, dur, seed, opts = {}) {
  const glow = mixHex(accent, "#0A0E1A", 0.25);
  const ratio = opts.ratio ?? 0.07;
  const mold = opts.mold ?? 6;
  return `life=size=135x240:rate=${FPS}:ratio=${ratio}:mold=${mold}:stitch=1:seed=${seed}:life_color=${hex0x(accent)}:death_color=0x04060C:mold_color=${hex0x(glow)}`;
}

// Layered "tech" background: animated radial gradient base, glowing Game-of-Life
// circuitry screen-blended over it, a soft light sweep, and a faint tech grid.
// Deterministic per seed so re-renders match.
function techBgExpr(accent, dur, seed) {
  const sweep = `(w+3000)*mod(t,${dur.toFixed(2)})/${dur.toFixed(2)}-3000`;
  return (
    `[1:v]scale=1080:1920:flags=neighbor,format=rgb24[life];` +
    `[0:v][life]blend=all_mode=screen:all_opacity=0.85[blend];` +
    `[blend]drawbox=x='${sweep}':y=0:w=300:h=1920:color=0xFFFFFF@0.06:t=fill,` +
    `drawgrid=width=1080:height=6:thickness=2:color=0xFFFFFF@0.03[bg]`
  );
}

// One fully-styled slide: gradient bg + pop-in text + accent kicker + progress
// bar + smooth fade in/out. Every frame moves — no more flat static cards.
async function makeSlideClip(index, slide, dur, outMp4, opts = {}) {
  const total = opts.total || 1;
  const accent = opts.accent || "#0E9384";
  const kind = slide.kind;
  const isHook = kind === "hook";
  const isCta = kind === "cta";

  const lines = wrap(slide.text, isHook ? 24 : 26);
  const txtFile = outMp4.replace(/\.mp4$/, ".txt");
  fs.writeFileSync(txtFile, lines.join("\n"), "utf8");

  const big = lines[0] || "";
  const stat = isHook && /^[\$0-9][\d.,kKmMbB%]*$/.test(big.trim());
  const fontsize = isHook ? 96 : isCta ? 66 : 62;
  const textColor = isHook && stat ? hex0x(accent) : "0xFFFFFF";

  // Punch-in: frame starts slightly zoomed-in and settles to full size, so the
// first frame feels alive. The scaled frame is cropped back to 1080x1920 at
// every frame so the concat stays uniform. Hook/CTA punch harder than body.
  const zoomIn = isHook ? 1.10 : isCta ? 1.08 : 1.05;
  const zf = `1+(${zoomIn}-1)*max(0,1-t/0.6)`;
  const zoomF = `scale=w='iw*${zf}':h='ih*${zf}':eval=frame,crop=${V.width}:${V.height}:(iw-${V.width})/2:(ih-${V.height})/2`;

  // Text pop-in: rises 60px and fades in over the first ~0.6s. Kicker fades in
  // from the top so the composition feels alive, not pasted on.
  const kicker = isHook ? "DAILY IT FIX" : isCta ? "FOLLOW FOR MORE" : kind === "body" ? "THE DETAILS" : "";
  const textF =
    `drawtext=fontfile=assets/arialbd.ttf:textfile=${txtFile.replace(/\\/g, "/")}:` +
    `fontsize=${fontsize}:fontcolor=${textColor}:line_spacing=30:` +
    `shadowcolor=0x0A0E1A@0.85:shadowx=0:shadowy=12:borderw=3:bordercolor=0x0A0E1A@0.5:` +
    `x=(w-text_w)/2:y='(h-text_h)/2-90+60*(1-min(1,t/0.5))':` +
    `alpha='if(lt(t,0.15),0,min(1,(t-0.15)/0.45))'`;

  const kickerF = kicker
    ? `drawtext=fontfile=assets/arialbd.ttf:text=${kicker}:fontsize=42:fontcolor=${hex0x(accent)}:` +
      `shadowcolor=0x0A0E1A@0.7:shadowx=0:shadowy=6:` +
      `x=(w-text_w)/2:y=300:` +
      `alpha='if(lt(t,0.1),0,min(1,(t-0.1)/0.4))'`
    : "";

  // Animated accent underline under the hook text: draws left-to-right across
  // the center in the first ~0.8s, giving the hook an active "marking" motion.
  const barY = `(h+250)`;
  const drawF = isHook
    ? `drawbox=x='(w-560)*min(1,t/0.8)':y=${barY}:w=560:h=14:color=${hex0x(accent)}@0.9:t=fill` +
      `,drawbox=x='(w-560)*min(1,t/0.8)':y=${barY}:w=560:h=2:color=0xFFFFFF@0.4:t=fill`
    : "";

  const barW = `iw*${(index + 1) / total}`;
  const barF =
    `drawbox=x=0:y=ih-16:w=${barW}:h=16:color=${hex0x(accent)}@0.9:t=fill` +
    `,drawbox=x=0:y=ih-20:w=iw:h=4:color=0x0A0E1A@0.6:t=fill`;

  const chain = [zoomF, textF, kickerF, drawF, barF, `fade=t=in:st=0:d=0.3`, `fade=t=out:st=${Math.max(0, dur - 0.3)}:d=0.3`, `format=yuv420p`]
    .filter(Boolean)
    .join(",");

  const speed = opts.lifeOpts?.speed ?? (isHook ? 0.15 : isCta ? 0.2 : 0.1);
  const seed = opts.seed || 11;
  const bg = techBgExpr(accent, dur, seed);
  await ff([
    "-f", "lavfi", "-i", gradientSource(accent, dur, speed),
    "-f", "lavfi", "-i", lifeSource(accent, dur, seed, opts.lifeOpts || {}),
    "-filter_complex", `${bg};[bg]${chain}[v]`,
    "-map", "[v]",
    "-t", String(dur),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
    "-y", outMp4
  ]);
  return lines.join("\n");
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

  const theme = themeForDeck(deck);
  const accent = theme.accent;
  const lifeOpts = theme.life || {};
  const seed = seedFromId(deck.id);
  console.log(`[render] deck ${deck.id} niche=${deck.niche} theme=${theme.topic?"topic-matched":"niche"} accent=${accent} life=${JSON.stringify(lifeOpts)}`);
  const clips = [];
  for (let i = 0; i < deck.slides.length; i++) {
    const clip = path.join(base, `clip_${i}.mp4`);
    await makeSlideClip(i, deck.slides[i], durs[i], clip, { total: deck.slides.length, accent, seed, lifeOpts });
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