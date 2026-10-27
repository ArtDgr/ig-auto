# TikTok content workflow status

This repository can generate TikTok-ready video drafts and captions, then run
local QA. It does not publish those drafts. The GitHub Actions login-cookie
bootstrap, cookie-check, and browser-post workflows are disabled; the daily
workflow now builds and checks drafts only.

## Why unattended personal-account posting is unavailable

TikTok's [Content Sharing Guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines/)
state that Direct Post API clients must not be a utility for uploading content
to accounts managed by the developer or their team. They also require an
in-app creator experience with a preview, editable title and metadata, current
creator privacy/interaction settings, and the creator's express consent before
each upload. This repository's private scheduled workflow is not that product,
so it must not use Direct Post API as an unattended publishing workaround.

The [Content Posting API setup guide](https://developers.tiktok.com/docs/en/content-posting-api-get-started/)
also requires a registered developer app with the Content Posting API enabled,
approval for the `video.publish` scope, and authorization by the TikTok user.
Unaudited clients are restricted to private-only posts; public posting requires
TikTok's client audit. Those approvals and account authorization do not waive
the Guidelines' intended-use or per-post user-control requirements.

Accordingly, no developer app has been registered, no scope or token has been
requested, and no API publisher has been implemented. A supported third-party
service may have its own approved app and user consent flow, but this
repository must not silently automate that service's posting either.

## Current behavior

- `daily.yml` generates TikTok-ready videos and captions and runs
  `src/tiktok-qa-check.js`; it leaves the output as drafts.
- The manual `tiktok-post`, `tiktok-bootstrap`, and `tiktok-cookie-check`
  workflows report that they are disabled and make no TikTok requests.
- The browser bot and Buffer TikTok scheduling entry point remain in the
  repository but fail closed; shared Instagram and Buffer publishing paths
  are unchanged. TikTok cookie import/export/session tools are not invoked by
  GitHub Actions, and their CI entry points are blocked.
- The former manual-dispatch limit remains one video, and scheduled limits
  remain governed by `tiktokBot.maxPerDay`, if a compliant publishing
  experience is introduced later.

The former CI path replayed browser cookies, used a stealth browser profile,
and attempted a web upload. Recent cookie checks did not confirm an
authenticated TikTok page, so that path could not safely publish. The old
posting workflow also installed Playwright Firefox while TikTok's configured
browser engine was Edge; changing browser installation would not solve the
authentication or policy blockers.

Do not store exported TikTok session cookies in GitHub Actions secrets. If
cookie secrets were previously added, remove them from repository settings
and revoke the related sessions in TikTok. A TikTok-authorized user can still
review and post drafts through a supported user-controlled TikTok experience.

## Draft QA

Run `node src/tiktok-qa-check.js` to validate the pending draft queue. Captions
must have source-headline metadata and match the complete generated headline;
truncated hooks, ellipses, dangling currency symbols, or incomplete source
headlines fail the gate.

## Subject-matched backgrounds

Rendering prefers the story's own RSS/article image where its use is permitted.
When no usable or authorized story image is available, `src/photo.js` searches
the free Openverse image catalog using
headline terms plus niche-specific terms, ranks results by topic metadata and
portrait crop suitability, and stores image/license attribution beside the
cached asset. If no relevant image is available, rendering falls back to the
animated topic-colored circuitry background rather than an unrelated stock
photo. Photo backgrounds receive a dark overlay and gradient so captions stay
legible; the hook label, accent color, and motion settings vary by topic.

`preview/tiktok-ai-topic.svg` is a static AI-topic visual preview based on a
currently valid generated headline. It illustrates the topic-colored fallback
style, not a rendered/published video; producing an MP4 preview requires the
project's Node.js and FFmpeg dependencies.
