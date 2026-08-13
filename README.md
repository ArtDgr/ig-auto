# ig-auto — cloud content pipeline for @theitsupportguru

Free, cloud-hosted daily content for the faceless Instagram channel. No laptop
needed, no Meta developer token required.

## How it works

- **GitHub Actions** (free public-runner cron) builds everything at 05:30 AEST
  Mon–Fri: curates tech news RSS → fetches the lead articles → renders the
  light-theme cards → runs QA → commits the media → schedules the posts.
- **Buffer** (free plan, includes a GraphQL API) does the actual publishing.
  Buffer holds the one-time Instagram authorization — no Meta developer app,
  no token you manage. API limits: 1 key, 100 req/24h, 3,000 req/mo,
  10 queued posts per channel (plenty for 3/day).

## One-time setup (human, ~15 min)

1. **Instagram → Professional.** In the IG app: Settings → Account type →
   switch to **Professional (Business or Creator)**. Buffer can only publish
   to professional IG accounts.
2. **Buffer.** Sign up free at buffer.com → connect your Instagram channel
   (this is the one-time IG login, done in Buffer's UI) → generate your API
   key at `publish.buffer.com/settings/api`.
3. **Secrets.** Add the key as a repo secret named `BUFFER_API_KEY`
   (Settings → Secrets → Actions).
4. **Channel (optional).** Run `node src/buffer-publish.js channels` once
   locally with `BUFFER_API_KEY` set, then put the Instagram channel id into
   `config.json → buffer.channelId` (otherwise the first run auto-resolves it).

## The schedule (UTC)

| AEST | UTC (prev day) | step |
|---|---|---|
| 05:30 | 19:30 | cron fires, build + QA + schedule |
| 06:30 / 10:00 / 13:00 | 20:30 / 00:00 / 03:00 | cards publish via Buffer |

## Local commands

- `node src/buffer-publish.js status` — list Buffer orgs + channels
- `node src/buffer-publish.js schedule --dry` — preview today's posts + times
- `node src/buffer-publish.js schedule` — schedule today's cards on Buffer
- `node src/buffer-publish.js schedule --date=YYYY-MM-DD` — specific day
