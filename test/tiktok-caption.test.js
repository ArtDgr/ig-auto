import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, test } from "node:test";
import { buildCaption, writeCaptions } from "../src/captions.js";
import { checkTikTok } from "../src/tiktok-qa-check.js";
import { postLimitForEvent } from "../src/tiktok-post-limit.js";
import { keywordsFor, scorePhotoCandidate } from "../src/photo.js";
import { scheduleTikTok } from "../src/buffer-publish.js";
import { themeForDeck } from "../src/render.js";

const tempDirs = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ig-auto-tiktok-qa-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function deck(overrides = {}) {
  return {
    id: "sample-story",
    niche: "ai",
    captionTitle: "AI chip startup Etched doubles valuation to $21 billion",
    title: "AI chip startup Etched doubles valuation to $21 billion",
    slides: [{ kind: "hook", text: "AI chip startup Etched doubles valuation to $" }],
    ...overrides
  };
}

function writeVideo(dir, name = "sample-story.mp4") {
  fs.writeFileSync(path.join(dir, name), Buffer.alloc(1500));
}

test("caption uses the complete source headline instead of the clipped visual hook", () => {
  const caption = buildCaption(deck());
  assert.ok(caption.startsWith("AI chip startup Etched doubles valuation to $21 billion."));
  assert.ok(!caption.includes("valuation to $."));
});

test("QA accepts a caption generated with matching complete-headline metadata", async () => {
  const dir = makeTempDir();
  writeVideo(dir);
  assert.equal(writeCaptions([deck()], dir, dir), 1);

  const result = await checkTikTok(dir);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
});

test("full-queue QA rejects legacy captions without source metadata", async () => {
  const dir = makeTempDir();
  writeVideo(dir);
  writeVideo(dir, "legacy-story.mp4");
  writeCaptions([deck()], dir, dir);
  fs.writeFileSync(
    path.join(dir, "legacy-story.txt"),
    "A complete headline. Follow The IT Support Guru for daily tech intel. #fyp #techsupport #techtips"
  );

  const fullQueue = await checkTikTok(dir);
  assert.equal(fullQueue.ok, false);
  assert.ok(fullQueue.errors.some((error) => error.includes("source metadata missing")));

  const currentOnly = await checkTikTok(dir, { ids: ["sample-story"] });
  assert.equal(currentOnly.ok, true);
  assert.equal(currentOnly.videos, 1);
});

test("QA rejects a caption clipped from its complete source headline", async () => {
  const dir = makeTempDir();
  writeVideo(dir);
  writeCaptions([deck()], dir, dir);
  fs.writeFileSync(
    path.join(dir, "sample-story.txt"),
    "AI chip startup Etched doubles valuation to $. Follow The IT Support Guru for daily tech intel. #fyp #techsupport #techtips"
  );

  const result = await checkTikTok(dir);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("does not match its complete source headline")));
  assert.ok(result.errors.some((error) => error.includes("dangling currency symbol")));
});

test("QA rejects a visually plausible mid-word caption truncation", async () => {
  const fullHeadline = "Xiaomi unveils HyperOS 4 with a new glass look UI customization";
  const dir = makeTempDir();
  writeVideo(dir);
  writeCaptions([deck({ captionTitle: fullHeadline, title: fullHeadline })], dir, dir);
  fs.writeFileSync(
    path.join(dir, "sample-story.txt"),
    "Xiaomi unveils HyperOS 4 with a new glass loo. Follow The IT Support Guru for daily tech intel. #fyp #techsupport #techtips"
  );

  const result = await checkTikTok(dir);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("does not match its complete source headline")));
});

test("caption generation rejects incomplete source headlines", () => {
  assert.throws(
    () => buildCaption(deck({ captionTitle: "Xiaomi unveils HyperOS 4 with a new glass loo…" })),
    /Incomplete TikTok caption headline/
  );
  assert.throws(
    () => buildCaption(deck({ captionTitle: "AI chip startup doubles valuation to $" })),
    /Incomplete TikTok caption headline/
  );
});

test("orphan videos are left untouched instead of receiving generic captions", () => {
  const dir = makeTempDir();
  writeVideo(dir);
  assert.equal(writeCaptions([], dir, dir), 0);
  assert.equal(fs.existsSync(path.join(dir, "sample-story.txt")), false);
});

test("manual GitHub workflow dispatch is limited to one video", () => {
  assert.equal(postLimitForEvent(3, "workflow_dispatch"), 1);
  assert.equal(postLimitForEvent(3, "schedule"), 3);
});

test("Buffer TikTok scheduling fails closed by default without affecting other Buffer paths", async () => {
  await assert.rejects(
    scheduleTikTok("2026-10-12", { dry: true }),
    /disabled by config\.buffer\.tiktokViaBuffer=false/
  );
});

test("background search terms and relevance scoring distinguish multiple niches", () => {
  const cases = [
    {
      deck: { niche: "ai", title: "Anthropic releases a new AI model" },
      expected: ["anthropic", "model", "artificial intelligence"],
      image: { title: "AI model with neural network visualization" }
    },
    {
      deck: { niche: "gadgets", title: "Google Pixel smartphone battery update" },
      expected: ["google", "pixel", "smartphone"],
      image: { title: "Google Pixel smartphone on display" }
    },
    {
      deck: { niche: "security", title: "Ransomware attack targets hospital credentials" },
      expected: ["ransomware", "attack", "cybersecurity"],
      image: { title: "Ransomware attack and computer security" }
    },
    {
      deck: { niche: "cloud-devops", title: "Kubernetes cloud platform simplifies infrastructure" },
      expected: ["kubernetes", "cloud", "data center"],
      image: { title: "Kubernetes cloud data center servers" }
    }
  ];

  for (const { deck: story, expected, image } of cases) {
    const query = keywordsFor(story).toLowerCase();
    for (const term of expected) assert.ok(query.includes(term), `${story.niche} query should include "${term}"`);
    assert.ok(scorePhotoCandidate(image, story) > 0, `${story.niche} image should match its story`);
    assert.equal(scorePhotoCandidate({ title: "Unrelated abstract landscape" }, story), 0);
  }
});

test("AI safety risk stories use a purpose-built safety testing background", () => {
  const theme = themeForDeck({
    niche: "ai",
    title: "The AI safety test is becoming a safety risk",
    slides: [{ text: "The AI safety test is becoming a safety risk", kind: "hook" }]
  });

  assert.equal(theme.visual, "ai-safety-risk");
  assert.equal(theme.label, "SAFETY TEST");
  assert.equal(theme.accent, "#FB7185");
});
