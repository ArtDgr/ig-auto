import { launchStealth } from "./stealth.js";
import { ensureProfileDir } from "./human.js";
import fs from "node:fs";
import path from "node:path";

const PROFILE = "profiles/shane-gee2";
const HANDLE = "shane.gee2";
const TARGETS = ["websites","prompts","github","breakai","security","ai"];
const OUT = "out/shane-gee2";

function log(...a){ console.log("["+new Date().toLocaleTimeString()+"]", ...a); }
function ensureOut(){ fs.mkdirSync(OUT, {recursive:true}); }

function extractUrls(text){
  if(!text) return [];
  const re = /(https?:\/\/[^\s<>"'()]+|www\.[^\s<>"'()]+|[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s<>"'()]*)?)/gi;
  const raw = text.match(re) || [];
  // expand and clean
  return [...new Set(raw.map(u=>{
    let s=u.replace(/[.,;!?]+$/,"").replace(/\)+$/,"");
    if(/^www\./i.test(s)) s="https://"+s;
    if(!/^https?:\/\//i.test(s) && s.includes(".")){
      // only keep if looks like domain
      if(!s.includes("/") && !s.includes(".")) return null;
      // heuristic: must have dot and not be just hashtag etc
      if(/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(s)) s="https://"+s;
      else return null;
    }
    try{ new URL(s); return s; }catch{ return null; }
  }).filter(Boolean))];
}

async function autoScroll(page, maxScrolls=60, pause=1200){
  let lastCount=0, stable=0;
  for(let i=0;i<maxScrolls;i++){
    const count = await page.evaluate(()=> document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]').length).catch(()=>0);
    if(count===lastCount) stable++; else stable=0;
    lastCount=count;
    if(stable>=4 && i>8) break;
    await page.mouse.wheel(0, 1800).catch(()=>{});
    await page.waitForTimeout(pause);
    if(i%10===0) log(`scroll ${i} posts=${count} stable=${stable}`);
  }
  return lastCount;
}

async function getCollections(page){
  await page.goto(`https://www.instagram.com/${HANDLE}/saved/`, {waitUntil:"domcontentloaded", timeout:45000}).catch(()=>{});
  await page.waitForTimeout(3000);
  // Wait for collections grid
  await page.waitForTimeout(2000);
  const html = await page.content();
  // Dump for debug
  fs.writeFileSync(path.join(OUT,"saved-page.html"), html.slice(0,500000));
  log("saved page HTML dumped, url="+page.url());

  // Try to find collections
  let collections = await page.evaluate(()=>{
    const out=[];
    // Links that go to saved/
    const links = Array.from(document.querySelectorAll('a[href*="/saved/"]'));
    for(const a of links){
      const href=a.getAttribute("href")||"";
      const text=(a.innerText||a.textContent||"").trim().replace(/\s+/g," ").slice(0,80);
      if(href) out.push({href: href.startsWith("http")?href:"https://www.instagram.com"+href, text, html:a.outerHTML.slice(0,300)});
    }
    // Also try to find collection names via headings
    const maybe = Array.from(document.querySelectorAll('span, div')).map(e=>(e.innerText||"").trim()).filter(t=>t.length>1 && t.length<40);
    return {links: out, maybe: [...new Set(maybe)].slice(0,100)};
  }).catch(()=>({links:[], maybe:[]}));
  log("found links:", JSON.stringify(collections.links.slice(0,20), null,2));
  log("maybe texts:", collections.maybe.slice(0,30).join(" | "));
  return collections.links;
}

async function scrapeCollection(page, collHref, collName){
  log(`\n=== Scraping collection: ${collName} -> ${collHref} ===`);
  await page.goto(collHref, {waitUntil:"domcontentloaded", timeout:45000}).catch(()=>{});
  await page.waitForTimeout(3500);
  // Handle "All posts" vs named collection differences
  // Scroll to load
  await autoScroll(page, 80, 1100);
  const postHrefs = await page.evaluate(()=>{
    const els = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
    const hrefs = els.map(a=> a.getAttribute("href")).filter(Boolean).map(h=> h.startsWith("http")?h:"https://www.instagram.com"+h);
    // clean to canonical post url without query
    return [...new Set(hrefs.map(u=> u.split("?")[0]))];
  }).catch(()=>[]);
  log(`collection ${collName}: found ${postHrefs.length} post hrefs`);
  // Save hrefs
  fs.writeFileSync(path.join(OUT, `collection-${collName}-hrefs.json`), JSON.stringify(postHrefs, null,2));
  return postHrefs;
}

async function scrapePost(page, url){
  await page.goto(url, {waitUntil:"domcontentloaded", timeout:45000}).catch(()=>{});
  await page.waitForTimeout(1800);
  const data = await page.evaluate(()=>{
    const captionEl = document.querySelector('article h1, article [data-testid="post-caption"], div[data-testid="post-comment-root"] span, article div[style*="line-height"] span, article span[dir="auto"]');
    // Try multiple selectors for caption
    let caption="";
    // Instagram caption is often in the first comment-like span after header
    const spans = Array.from(document.querySelectorAll('article span, article div span'));
    // Heuristic: longest text block with >20 chars
    let best="";
    for(const s of spans){
      const t=(s.innerText||s.textContent||"").trim();
      if(t.length>best.length && t.length>30 && !t.match(/^(Like|Comment|Share|·|#)/)) best=t;
    }
    caption=best;
    // Fallback: meta description
    if(!caption || caption.length<20){
      const meta=document.querySelector('meta[property="og:description"], meta[name="description"]');
      if(meta) caption=meta.getAttribute("content")||caption;
    }
    // Author
    let author="";
    const authorEl=document.querySelector('header a[href^="/"][role="link"], article header a');
    if(authorEl) author=authorEl.getAttribute("href")|| authorEl.textContent||"";
    // All links in page text
    const bodyText=document.body.innerText||"";
    const timeEl=document.querySelector('time');
    const time=timeEl? timeEl.getAttribute("datetime")||timeEl.textContent : "";
    return {caption: caption.slice(0,8000), author: (author||"").slice(0,100), time, bodyExcerpt: bodyText.slice(0,4000)};
  }).catch(()=>({caption:"", author:"", time:"", bodyExcerpt:""}));
  // Also get page html snippet for URL extraction
  const urls = extractUrls(data.caption + " " + data.bodyExcerpt);
  return {url, ...data, urls};
}

async function main(){
  ensureOut();
  ensureProfileDir(PROFILE);
  const cfg={ tiktokBot:{ profileDir: PROFILE, headless: false, engine:"firefox"}};
  const ctx = await launchStealth(cfg, {profileDir: PROFILE, headless: false, engine:"firefox"});
  const page = await ctx.newPage();
  // Quick login check
  await page.goto(`https://www.instagram.com/${HANDLE}/`, {waitUntil:"domcontentloaded"}).catch(()=>{});
  await page.waitForTimeout(2000);
  log("Logged in check url="+page.url());

  const collections = await getCollections(page);
  // Determine target coll hrefs
  let targetHrefs=[];
  // Instagram saved collections pattern: https://www.instagram.com/${HANDLE}/saved/collectionName/ID?
  // We'll match by text containing target name (case-insensitive)
  for(const t of TARGETS){
    const found = collections.find(c=> c.text.toLowerCase().includes(t.toLowerCase()) || c.href.toLowerCase().includes(t.toLowerCase()));
    if(found){
      targetHrefs.push({name:t, href: found.href});
      log(`Matched ${t} -> ${found.href} text=${found.text}`);
    } else {
      log(`No match for ${t}, will try direct guess`);
      // Try direct? Instagram uses /saved/<collection-name>/<id> but id unknown, search via page
      // Keep as null to report
    }
  }
  // Also include "All Posts" if needed
  const allPostsLink = collections.find(c=> /all posts/i.test(c.text) || c.href.includes("/all-posts"));
  if(allPostsLink) log("All posts link: "+allPostsLink.href);

  // If no matches, dump all links for manual inspection
  fs.writeFileSync(path.join(OUT,"collections-found.json"), JSON.stringify({collections, targetHrefs}, null,2));

  if(targetHrefs.length===0){
    log("No target collections matched by text. Trying to click into collections via UI search…");
    // Fallback: try to evaluate more thorough collection names
    const more = await page.evaluate(()=>{
      return Array.from(document.querySelectorAll('a')).map(a=> ({href:a.href, text:(a.innerText||"").trim().slice(0,50)})).filter(x=> x.href.includes("/saved/") && x.text.length>0);
    }).catch(()=>[]);
    log("more saved links: "+JSON.stringify(more, null,2));
    // Try case-insensitive search again with more
    for(const t of TARGETS){
      const f=more.find(c=> c.text.toLowerCase()===t.toLowerCase() || c.text.toLowerCase().includes(t.toLowerCase()));
      if(f && !targetHrefs.find(x=>x.name===t)) targetHrefs.push({name:t, href:f.href});
    }
    fs.writeFileSync(path.join(OUT,"collections-found2.json"), JSON.stringify(more, null,2));
  }

  // Now scrape each matched collection
  let allPostsMap = new Map(); // url -> {url, collections:[], data}
  for(const ch of targetHrefs){
    const hrefs = await scrapeCollection(page, ch.href, ch.name);
    for(const h of hrefs){
      if(!allPostsMap.has(h)) allPostsMap.set(h, {url:h, collections:[ch.name], hrefs:[h]});
      else allPostsMap.get(h).collections.push(ch.name);
    }
    await page.waitForTimeout(1500);
  }

  log(`\nTotal unique post URLs across matched collections: ${allPostsMap.size}`);
  if(allPostsMap.size===0){
    log("No posts found via collections. Trying All Posts fallback");
    if(allPostsLink){
      const hrefs = await scrapeCollection(page, allPostsLink.href, "all-posts");
      for(const h of hrefs){
        if(!allPostsMap.has(h)) allPostsMap.set(h, {url:h, collections:["all-posts"]});
      }
    }
    log(`After fallback: ${allPostsMap.size} posts`);
  }

  // Now scrape each post for details
  let idx=0;
  const results=[];
  for(const [url, meta] of allPostsMap){
    idx++;
    log(`[${idx}/${allPostsMap.size}] scraping ${url} collections=${meta.collections.join(",")}`);
    const data = await scrapePost(page, url);
    const rec = {...meta, ...data};
    results.push(rec);
    // Save incremental
    fs.writeFileSync(path.join(OUT,"posts-raw.json"), JSON.stringify(results, null,2));
    await page.waitForTimeout(900 + Math.random()*800);
    if(idx>=180) { log("Cap at 180 posts for this run"); break; }
  }

  // Extract all websites
  const allUrls = [];
  for(const r of results){
    for(const u of (r.urls||[])){
      allUrls.push({url:u, postUrl:r.url, collection:r.collections.join(","), author:r.author, captionExcerpt: r.caption.slice(0,120)});
    }
  }
  const dedup = [...new Map(allUrls.map(o=>[o.url, o])).values()];
  log(`\nExtracted ${allUrls.length} URL refs, ${dedup.length} unique websites`);
  // Categorize
  const byCollection={};
  for(const t of TARGETS) byCollection[t]=[];
  for(const r of results){
    for(const c of r.collections){
      if(byCollection[c]) byCollection[c].push(r);
    }
  }
  // Write report files
  fs.writeFileSync(path.join(OUT,"websites-dedup.json"), JSON.stringify(dedup, null,2));
  fs.writeFileSync(path.join(OUT,"by-collection.json"), JSON.stringify(byCollection, null,2));
  // CSV
  const csvRows=[["collection","post_url","post_author","website_url","caption_excerpt"].join(",")];
  for(const d of allUrls){
    csvRows.push([`"${d.collection}"`,`"${d.postUrl}"`,`"${(d.author||"").replace(/"/g,'""')}"`,`"${d.url}"`,`"${(d.captionExcerpt||"").replace(/"/g,'""').replace(/\n/g," ")}"`].join(","));
  }
  fs.writeFileSync(path.join(OUT,"websites.csv"), csvRows.join("\n"));
  log(`Done. Output in ${OUT}/`);
  log(`- posts-raw.json (${results.length} posts)`);
  log(`- websites.csv (${dedup.length} unique)`);
  log(`- by-collection.json`);

  await page.close().catch(()=>{});
  await ctx.close().catch(()=>{});
}
main().catch(e=>{ console.error(e); process.exit(1); });
