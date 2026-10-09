# TikTok channel — headless, faceless, fully automated (FREE only, NO LAPTOP)

Account: `theitspprtguru@gmail.com` (@theitsupportguru)
Sources: 100% reused from this repo's Instagram automation
(`config.json` niches/RSS, `src/news.js` curate, `src/generator.js`,
`src/render.js` 1080x1920 + `edge-tts` voice, `src/captions.js`).
Runs 100% in GitHub Actions (free for public repos). This Mac is not used.

## 0. Free-only stack (no paid service anywhere)

| Need | Tool | Cost |
|---|---|---|
| News | 48 RSS feeds in `config.json` (`src/news.js`) | free |
| Voice | `edge-tts` (`src/tts/speak.py`, voice `en-US-GuyNeural`) | free |
| Video | `ffmpeg` + `ffprobe` (`src/render.js`) | free |
| Browser | Playwright Firefox / Edge (`src/stealth.js`) | free |
| Scheduler | macOS `launchd` (`install-mac.sh`) or GitHub Actions (`daily.yml`) | free |
| Posting | `src/tiktok-bot.js` → tiktok.com Studio upload page | free |
| QA | `src/tiktok-qa-check.js` | free |

Buffer is **disabled** for TikTok: `config.buffer.tiktokViaBuffer` is `false`
and `src/post-runner.js` only uses Buffer when that flag is `true`.
Nothing outside this list is required.

## 1. One-time login — cloud only, no laptop (phone + github.com)

1. On github.com (phone browser is fine): Actions → `tiktok-qr-bootstrap` → Run workflow.
2. Once the `tiktok-qr` artifact appears (while the job is still running),
   download it and open `tiktok-qr.png`.
3. On your phone: TikTok app signed in as `theitspprtguru@gmail.com` → scan the QR → Approve.
4. The job prints `SESSION CONFIRMED` and uploads a separate
   `tiktok-cookies` artifact containing `tiktok-cookies.b64`.
5. Still on github.com: repo Settings → Secrets → Actions → new secret
   `TIKTOK_COOKIES_B64` = full contents of `tiktok-cookies.b64`. Done.
   All future runs reuse it headless. Re-do this only when TikTok expires the session.

### 1b. Fallback if the QR never renders (bot-wall)

On Android (free, no laptop): Firefox → install the Cookie-Editor add-on →
tiktok.com → log in as `theitspprtguru@gmail.com` → Cookie-Editor → Export
(JSON) → add a repository Actions secret named `TIKTOK_RAW_COOKIES` with the
full JSON value, then run `tiktok-cookie-check.yml` manually to validate the
session without posting. Do not send the JSON in chat or use an online encoder
because the exported cookies are account credentials. `TIKTOK_COOKIES_B64`
remains the preferred secret when using the QR login.

No password typing, no slider, no laptop. `credentials/tiktok.json` is unused in cloud mode.

## 2. Daily automation — cloud only (no Mac, no launchd)

- `daily.yml` (05:30 AEST): curate → generate → render → `tiktok-qa-check.js` → commit `out/tiktok-ready` → headless post attempt.
- `tiktok-post.yml` (07:00 / 12:00 / 18:00 AEST): restores session from
  `TIKTOK_COOKIES_B64`, QA gate, `tiktok-bot.js --force`, commits `.done` markers.
- `tiktok-bootstrap.yml`: the §1 QR login, on demand.

`install-mac.sh` is legacy/local-only and NOT needed for cloud mode. GitHub
Actions minutes are free for public repos; ffmpeg, edge-tts, Playwright
Firefox, and TikTok web upload are all free.

## 3. Pipeline (all headless after §1)

```
05:30  scheduler daily
        = curate (48 RSS → data/topics.json, 676+ topics typical)
        → generate (3 decks, niche-spread via src/generator.js)
        → render (ffmpeg 1080x1920 gradient + life-bg + edge-tts voice)
        → captions (hook + #tags + follow CTA)
        → tiktok-qa-check (gate)
07:00 / 12:00 / 18:00  tiktok-bot --force
        = randomized due-times, organic scroll/like warmup,
          Studio upload, .done marker per video (never reposts)
```

Faceless by construction: no camera, no face — every video is a real
topic photo (the article's own hero image, or keyword-matched free stock)
with slow Ken Burns drift, dark legibility grade, kinetic hook text, and
AI voiceover. Viral format per 2026 patterns: bold ≤60-char hook in the
first second, stat kept whole, completion-optimized pacing, rotating
comment question in the caption, keyword-rich titles for TikTok search.
Topics rotate across all 7 RSS niches in `config.json` (ai, gadgets,
apple, hardware, security, it-support, cloud-devops — 48 feeds), 3
distinct niches per day, never repeating the same niche twice in a day.

## 4. Troubleshooting

- `session expired` → re-run `npm run tiktok:login:qr` (2 min), then
  `npm run tiktok:export` to refresh `TIKTOK_COOKIES_B64`.
- `TikTok QA FAILED` → run `npm run tiktok:qa`, fix the listed caption/
  video, re-run until `PASS`.
- `Studio redirected to /login` → session rejected for upload; redo QR login.
- `rate-limited / maximum attempts` → stop password attempts, use QR login.
- No `node`/`ffmpeg`/`edge-tts` on a fresh Mac → see §1 (all free).
