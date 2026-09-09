# shane.gee2 — Saved Collections Analysis
**Date:** 2026-08-26 | **Profile:** profiles/shane-gee2 (Firefox, sessionid verified) | **Handle:** @shane.gee2 (120 posts, 68 followers, 1,288 following)

> Live scrape via Playwright `src/scrape-shane-saved.js` against `instagram.com/shane.gee2/saved/` — logged in as you. 3 target collections found, 3 missing.

---

## 1. Collection Inventory (live)

Scrolled entire `/saved/` page (12 saved collections total). Instagram only renders these:

| # | Collection | Href | Posts scraped |
|---|------------|----------------------|---------------|
| 1 | **All posts** | `/shane.gee2/saved/all-posts/` | — (not scraped, 120 total) |
| 2 | Audio | `/saved/audio/` | — |
| 3 | **Prompts** ✅ | `/saved/prompts/18095878939608578/` | **12** |
| 4 | CelebDeaths | `/saved/celebd.../` | — |
| 5 | ManAdvice | `/saved/manadvice/.../` | — |
| 6 | **Websites** ✅ | `/saved/websites/18150947380356077/` | **12** |
| 7 | **Github** ✅ | `/saved/github/939561092534611/` | **6** |
| 8 | Bloopers | — | — |
| 9 | FilmTheRobots | — | — |
|10 | OnlyInAmerica | — | — |
|11 | WorkHumor | — | — |
|12 | TXSteetfights | — | — |

**Requested but NOT FOUND as saved collections:**
- `breakai` — no collection (case-insensitive search across aria-label + innerText)
- `security` — no collection
- `ai` — no collection (closest is `Audio`/`Prompts`/`Github`)

**Implication:** You asked for 6 groups, only 3 exist. `breakai`/`security`/`ai` posts likely live in **All posts** or inside the 3 above (e.g., many `websites` + `github` posts ARE AI-related). See §6 for cross-cut.

Raw dumps: `out/shane-gee2/all-collections.json`, `collections-found.json`, `saved-page.html`

---

## 2. Executive Summary

- **30 unique saved posts** pulled (12 Websites + 12 Prompts + 6 Github, deduped)
- **Extraction quality:** Most posts are **comment-gated carousels** — the real websites/prompts/repos are *inside the images* and only delivered via DM (“Comment WEBSITES / Circle / GUIDE”). Caption itself holds no direct URL. That’s intentional engagement bait.
- **Usable signal per post:** Caption text + author handle + post date + inferred payload from slide description. Direct `https://` URLs in captions are rare (only 4 posts had them).
- **False-positive URL note:** The scraper’s naive regex pulled `mindset.unchained`, `kwna.pap` etc. — those are Instagram **user handles**, not websites. Cleaned list in §5.

---

## 3. WEBSITES — 12 posts (`out/shane-gee2/collection-websites-hrefs.json`)

| Post | Author | Date | What it promises (useful info) | How to get links | Category |
|------|--------|------|--------------------------------|------------------|----------|
| [DcbOLfDlgKl](https://www.instagram.com/p/DcbOLfDlgKl/) | `ninjaaitools` | 2026-08-24 | **10 crazy websites** — interactive 3D worlds, virtual circuits, PC building simulator, web animations, power grid visualizer, hidden Mac tools | Comment `WEBSITES` (DM) | Tools / Inspo |
| [DcZaYkLAvLF](https://www.instagram.com/p/DcZaYkLAvLF/) | `philrypz` | 2026-08-23 | Faceless AI pages — not a website list, it's a funnel to `philrypz` course | Comment `2026` | Growth funnel |
| [DcWFTh_jm-k](https://www.instagram.com/p/DcWFTh_jm-k/) | `create_daniel2` | 2026-08-22 | **Claude Skills pack** — free `.agent/skills` collection | Comment `skill` | Claude Code |
| [Db1jj-RETtw](https://www.instagram.com/p/Db1jj-RETtw/) | `smartmoneybrand` | 2026-08-09 | Free guide (earth/water niche) — generic live promo | Comment `LIVE` | Funnel |
| [DcUqm-qEV-T](https://www.instagram.com/p/DcUqm-qEV-T/) | `smartmoneybrand` | 2026-08-21 | Free training (2026) | Comment `2026` | Funnel |
| [DcJtc6ak44Z](https://www.instagram.com/p/DcJtc6ak44Z/) | `weposttech` | 2026-08-17 | **6 GitHub repos for IG automation:** `InstaPy`, `GramAddict`, `Instagram-Scraper`, `InstaLooter`, `Instagrapi` (+1) — for trend/competitor analysis, workflow automation | **Directly in carousel** — no DM needed | **GitHub / Automation** |
| [DbUl40vIB-f](https://www.instagram.com/p/DbUl40vIB-f/) | `unboxarea` | 2026-07-27 | **5 Apps not on Play Store Pt.2** (APKs) | Comment `App` | Android sideload |
| [DbzzdRTjMI9](https://www.instagram.com/p/DbzzdRTjMI9/) | `trickydost` | 2026-08-08 | **06 Illegal Websites** — useful/grey-area sites (likely: LibGen, cracked tools, OSINT) | Comment `Link` | Grey tools |
| [Db3U9FNDDRd](https://www.instagram.com/p/Db3U9FNDDRd/) | `trickydost` | 2026-08-10 | **09 Secret Android Apps** | Comment `Link` | Android |
| [DbVbZXyoDfT](https://www.instagram.com/p/DbVbZXyoDfT/) | `unboxarea` | 2026-07-28 | **5 Useful Android Apps Pt.8** | Comment `Apps` | Android |
| [DcWDFBTCM3z](https://www.instagram.com/p/DcWDFBTCM3z/) | `karmendra.ai` | 2026-08-22 | **Ox Alpha — 1M context, 100T tokens/day, free** — setup guide for macOS+Windows | Comment `OX` | **AI Model / Infra** |
| [DcVCaGPoAfg](https://www.instagram.com/p/DcVCaGPoAfg/) | `unboxarea` | 2026-08-21 | **Useful iPhone Apps Pt.13** | Comment `Apps` | iOS |

**Useful info extracted from Websites:**
- The only post with concrete websites *in caption/carousel without DM* is `DcJtc6ak44Z` (GitHub automation). All others require DM.
- `ninjaaitools` “10 crazy websites” is the highest-value inspo list — reply `WEBSITES` to that post in your DMs to retrieve.
- `karmendra.ai Ox Alpha` is likely the **BreakAI**-adjacent post you saved under wrong collection — it’s a free frontier model.
- `trickydost` Illegal/Secret posts are OSINT / modded APK territory — treat as grey.

---

## 4. PROMPTS — 12 posts (`collection-prompts-hrefs.json`)

All 12 are **prompt-gated** — no prompts visible in caption, payload is in carousel PDF/DM.

| Post | Author | Date | Prompt pack | Trigger |
|------|--------|------|-------------|---------|
| [DceNBY-pMMv](https://www.instagram.com/p/DceNBY-pMMv/) | `crcle.ai` | 2026-08-25 | **1000+ Free Prompts** (Circle library) | Comment `Circle` + Follow |
| [DcOTOF1m52K](https://www.instagram.com/p/DcOTOF1m52K/) | `smartmoneybrand` | 2026-08-19 | Live invite (prompt-adjacent funnel) | `LIVE` |
| [DcZm5hmlPiF](https://www.instagram.com/p/DcZm5hmlPiF/) | `crcle.ai` | 2026-08-23 | 1000+ Free Prompts (duplicate) | `Circle` |
| [DcCnG-REU6n](https://www.instagram.com/p/DcCnG-REU6n/) | `smartmoneybrand` | 2026-08-14 | Blueprint live | `LIVE` |
| [DbwvFwSmz4q](https://www.instagram.com/p/DbwvFwSmz4q/) | `smartmoneybrand` | 2026-08-07 | Faceless IG AI system + prompts | `LIVE` |
| [DcTGaabETvC](https://www.instagram.com/p/DcTGaabETvC/) | `smartmoneybrand` | 2026-08-21 | Free training (2026) | `2026` |
| [DcLclmykSfX](https://www.instagram.com/p/DcLclmykSfX/) | `smartmoneybrand` | 2026-08-18 | Free guide | `LIVE` |
| [Db4qRCVidqT](https://www.instagram.com/p/Db4qRCVidqT/) | `gptprompts.ai` | 2026-08-10 | **1K+ Premium ChatGPT prompts** (learnAI, Claude, Gemini3, Agentic AI) | `Chatgpt` |
| [DcOPjudTM1S](https://www.instagram.com/p/DcOPjudTM1S/) | `thinkgpt_ai` | 2026-08-19 | **Claude decision/strategy prompts** — sharper decisions, mental models, leverage | Follow (no comment gate, carousel is the value) |
| [DcMUxYvkmmh](https://www.instagram.com/p/DcMUxYvkmmh/) | `wisdomhunter.ai` | 2026-08-18 | **4 prompts PDF + 100K+ High-performance prompts** | `AI` |
| [DcUhndvpMKO](https://www.instagram.com/p/DcUhndvpMKO/) | `crcle.ai` | 2026-08-21 | 1000+ FREE prompts | `Circle` |
| [DcUDOWRFNIN](https://www.instagram.com/p/DcUDOWRFNIN/) | `crcle.ai` | 2026-08-21 | 1000+ Free Prompts | `Circle` |

**Categorization — Prompts:**
- **By use-case:** 4x `crcle.ai` = general-purpose mega-library; 1x `gptprompts.ai` = ChatGPT premium pack; 1x `thinkgpt_ai` = Claude strategy/CEO thinking (highest signal); 1x `wisdomhunter.ai` = 100K library.
- **Action:** Comment the trigger word *from your logged-in account* to auto-DM the pack. If DMs blocked, the carousel images *are* the prompts — screenshot + OCR them (run next step).

---

## 5. GITHUB — 6 posts (`collection-github-hrefs.json`)

| Post | Author | Date | Repo / Payload | Why useful |
|------|--------|------|-----------------|------------|
| [DcNOt8mkugc](https://www.instagram.com/p/DcNOt8mkugc/) | `codingknowledge` | 2026-08-18 | **50 GitHub Repos Worth Using** — curated list (carousel) | Bookmark — covers dev tools, not just one repo |
| [DcO2zoAiJSe](https://www.instagram.com/p/DcO2zoAiJSe/) | `masculineisriot` | 2026-08-19 | **NOT GitHub** — mental health / ManAdvice cross-saved (wrong collection) | Ignore for GitHub |
| [DbivYoXEsbe](https://www.instagram.com/p/DbivYoXEsbe/) | `divyannshisharma` | 2026-08-02 | **OpenClaw** — `openclaw` AI agents + Claude | Comment `SEND` — open-source Claude agent framework |
| [Db7NqdJjJ-F](https://www.instagram.com/p/Db7NqdJjJ-F/) | `aiwithshivang` | 2026-08-11 | **24 Claude plugins / skills / MCP servers** — coding, research, automation | Comment `GUIDE` — goldmine for Claude Code users |
| [DcHOn4XDUwn](https://www.instagram.com/p/DcHOn4XDUwn/) | `weposttech` | 2026-08-16 | **Future tech roundup** — AI models running locally, nuclear batteries, etc. — not GitHub | General AI, not a repo |
| [DcEONSaku2o](https://www.instagram.com/p/DcEONSaku2o/) | `divyannshisharma` | 2026-08-15 | **OpenClaw** duplicate (same author) | `SEND` |

**Deduped GitHub repos actually referenced:**
- `InstaPy`, `GramAddict`, `Instagram-Scraper`, `InstaLooter`, `Instagrapi` (from `DcJtc6ak44Z` technically in Websites but belongs here)
- `OpenClaw` (divyannshisharma ×2)
- **50 repos list** (codingknowledge — need to OCR carousel to enumerate)
- **24 Claude MCP/skills** (aiwithshivang — comment `GUIDE` to get install list)

---

## 6. Missing Collections: breakai / security / ai

**They do not exist as saved collections.** Verified by scrolling full saved page and dumping `aria-label` list — no match.

**What to do:**
1. **Cross-cut from existing posts:** Several saved posts *are* `ai`/`breakai`/`security` by topic but filed under Websites/Github:
   - `ai` → `karmendra.ai Ox Alpha` (free 1M context model), `weposttech` local AI models, `DcWFTh` Claude Skills, `Db7NqdJ` MCP servers, all `crcle.ai`/`gptprompts.ai` prompts
   - `breakai` → closest is `Ox Alpha` + `trickydost Illegal Websites` (grey) — no explicit jailbreak collection found
   - `security` → **no security posts in these 30** — suggests they’re in `All posts` unsaved to a named collection, or in another collection not requested
2. **Next scrape (recommended):** Run All Posts sweep and keyword-filter:
   ```
   node src/scrape-shane-saved.js --all-posts  # or
   node src/shane-allposts-keyword.js --keywords="break,jailbreak,exploit,security,hack,ai"
   ```
   This will scan your 120 All Posts and auto-categorize into breakai/security/ai buckets. Say the word and I’ll run it.

---

## 7. ALL WEBSITES REFERENCED — Master Table

> Cleaned: only `https://` with valid TLD, handles stripped. Full noisy dump in `websites.csv` (59 raw), cleaned below. For comment-gated posts, the *actual* URL lives in the DM/carousel image — not in caption — so we list the **gate** plus inferred domain where possible.

| Website / Handle | Source Post | Collection | Type | How to retrieve |
|------------------|-------------|------------|------|-----------------|
| **InstaPy** (github.com/InstaPy/InstaPy) | DcJtc6ak44Z | Websites→Github | GitHub | Carousel slide — no gate |
| **GramAddict** | DcJtc6ak44Z | Websites→Github | GitHub | Carousel |
| **Instagram-Scraper** | DcJtc6ak44Z | Websites→Github | GitHub | Carousel |
| **InstaLooter** | DcJtc6ak44Z | Websites→Github | GitHub | Carousel |
| **Instagrapi** (github.com/adw0rd/instagrapi) | DcJtc6ak44Z | Websites→Github | GitHub | Carousel |
| **OpenClaw** | DbivYoXEsbe / DcEONSaku2o | Github | GitHub AI agents | Comment `SEND` to @divyannshisharma |
| **24 Claude MCP / Skills** | Db7NqdJjJ-F | Github | Claude Code | Comment `GUIDE` to @aiwithshivang |
| **50 Repos list** | DcNOt8mkugc | Github | Curated | See carousel (50) |
| **Ox Alpha docs/setup** | DcWDFBTCM3z | Websites (AI) | AI model | Comment `OX` to @karmendra.ai |
| **Claude Skills Pack** | DcWFTh_jm-k | Websites | Claude Code | Comment `skill` to @create_daniel2 |
| **crcle.ai — 1000+ prompts** | DceNBY / DcZm5h / DcUhnd / DcUDOW | Prompts | Prompt library | Comment `Circle` + follow @crcle.ai |
| **gptprompts.ai — 1K prompts** | Db4qRCVidqT | Prompts | Prompt library | Comment `Chatgpt` |
| **thinkgpt_ai — Claude strategy prompts** | DcOPjudTM1S | Prompts | Prompts (CEO/thinking) | Carousel is the value (no gate) |
| **wisdomhunter.ai — 100K prompts** | DcMUxYvkmmh | Prompts | Prompt library | Comment `AI` |
| **ninjaaitools — 10 crazy websites** | DcbOLfDlgKl | Websites | Tools inspo | Comment `WEBSITES` |
| **trickydost — Illegal/Secret sites** | DbzzdRT / Db3U9FNDDRd | Websites | Grey tools | Comment `Link` |
| **unboxarea — iOS/Android apps** | DbUl40vIB-f / DbVbZX / DcVCaGPoAfg | Websites | Sideload APK/iOS | Comment `App`/`Apps` |
| **smartmoneybrand / philrypz funnels** | DcZaYkLAvLF, Db1jj, etc. | Websites/Prompts | Courses | Comment `LIVE`/`2026` (low value) |

**Direct `https://` found in captions (rare):**
- `https://crcle.ai` (×4), `https://gptprompts.ai`, `https://wisdomhunter.ai`, `https://trickydost.ai`, `https://sureshspeaks.ai` — these are the only *in-caption* domains that pass TLD validation. The rest are DM-gated.

---

## 8. Categorized Useful Info (what to *do* with each post)

### Group A: Websites / Tools (actionable)
1. **Do this today:** DM `WEBSITES` to `ninjaaitools` (DcbOLfDlgKl) — get the 10-site list; save each as bookmark folder `shane-websites`.
2. **Grey:** `trickydost` illegal/secret posts — review in VM, not main browser.
3. **Mobile:** `unboxarea` APKs — verify SHA before installing.

### Group B: Prompts
- **Best ROI:** `thinkgpt_ai` (DcOPjudTM1S) — screenshot the carousel, it *is* the 4 elite Claude prompts (decision, mental models). No DM needed.
- **Bulk:** `crcle.ai` 1000+ and `wisdomhunter.ai` 100K — pick one, ignore duplicates (crcle appears 4×). Comment once.
- **GPT:** `gptprompts.ai` 1K — comment `Chatgpt`.

### Group C: Github
- **Install queue:** 
  1. `OpenClaw` (OpenClaw repo)
  2. `aiwithshivang` 24 MCPs — comment `GUIDE`, then `npm i` / MCP config
  3. `InstaPy` family — clone to `...\Default Project\` for automation research
  4. **50 repos** — OCR `DcNOt8mkugc` carousel to get full list (next step)

### Group D: AI (cross-cut, since no `ai` collection)
- `Ox Alpha` (DcWDFBTCM3z) — highest urgency, free 1M context. Comment `OX`.
- `Claude Skills Pack` (DcWFTh) — comment `skill`.
- All prompts above are AI prompts.

### Group E: BreakAI / Security — EMPTY
- No saved posts match those keywords in the 30 scanned. They either live in **All posts** or were never saved to a named collection.
- **Recommendation:** Let me scan All Posts (120) for keywords `break|jailbreak|bypass|exploit|vuln|CVE|security|hack|pentest|OSINT` and regenerate §6.

---

## 9. Files Produced

- `out/shane-gee2/posts-raw.json` — 30 posts with caption/author/time/urls
- `out/shane-gee2/all-collections.json` — live collection list (12)
- `out/shane-gee2/collection-*-hrefs.json` — post URLs per collection
- `out/shane-gee2/websites.csv` — raw 59 URL refs (noisy, before cleaning)
- `out/shane-gee2/ANALYSIS.md` — this report
- `out/shane-gee2/saved-page.html` — HTML dump for audit
- `profiles/shane-gee2/` — persistent Firefox profile (session preserved)

---

## 10. Next Steps (need your go-ahead)

1. **Scrape All Posts (120) for breakai/security/ai** — 4 mins, keyword auto-sort. Do you want it?
2. **OCR the carousels** — to extract the *actual* websites/repos/prompts from images (bypasses “Comment WEBSITES” gate). Requires downloading `*.jpg` from each post and running OCR (Tesseract/Cloud Vision). Want me to?
3. **Auto-DM the gates** — I can not auto-comment/DM from your account (risky, spam-flag). You should manually comment the 5 trigger words (`WEBSITES`, `Circle`, `GUIDE`, `OX`, `SEND`) from your phone — fastest human path.

Tell me: `run all-posts scan` and/or `ocr carousels` and I’ll execute now.
