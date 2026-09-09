import { launchStealth } from "./stealth.js";
import { ensureProfileDir } from "./human.js";
import fs from "node:fs";
import path from "node:path";

const PROFILE="profiles/shane-gee2";
const HANDLE="shane.gee2";
const TARGETS=["websites","prompts","github","breakai","security","ai"];

function log(...a){ console.log("["+new Date().toLocaleTimeString()+"]", ...a); }

async function getAllCollectionsThorough(page){
  await page.goto(`https://www.instagram.com/${HANDLE}/saved/`, {waitUntil:"domcontentloaded", timeout:45000});
  await page.waitForTimeout(3000);
  // Try to find any "Show more" or "+ New Collection" and ensure we scrolled the right container
  // Instagram saved collections are in a grid; try scrolling window and also the main div
  for(let i=0;i<20;i++){
    await page.evaluate(()=>{
      window.scrollBy(0, 1500);
      const scrollers = Array.from(document.querySelectorAll('div'));
      for(const d of scrollers){
        if(d.scrollHeight > d.clientHeight + 200){
          d.scrollTop = d.scrollHeight;
        }
      }
    });
    await page.waitForTimeout(700);
    const cnt = await page.evaluate(()=> document.querySelectorAll('a[href*="/saved/"]').length);
    const texts = await page.evaluate(()=> Array.from(document.querySelectorAll('a[href*="/saved/"]')).map(a=> (a.getAttribute("aria-label")||a.innerText||"").trim()).join(" | ").slice(0,400));
    log(`scroll ${i} links=${cnt} texts=${texts.slice(0,200)}`);
    if(i===0){
      const html = await page.content();
      fs.writeFileSync("out/shane-gee2/recheck-saved.html", html.slice(0,800000));
    }
  }
  // Also try to intercept API: look at window._sharedData or __additionalData
  const apiData = await page.evaluate(()=>{
    const scripts = Array.from(document.querySelectorAll('script')).map(s=> s.textContent||"").join("\n");
    // Try to find collection json
    const m = scripts.match(/"collections"[\s\S]{0,2000}/);
    return { hasCollections: scripts.includes("collections"), snippet: (m? m[0].slice(0,1000): scripts.slice(0,1000)), url: location.href };
  }).catch(()=>({}));
  log(`API snippet: ${JSON.stringify(apiData).slice(0,500)}`);

  // Direct GraphQL attempt using page's fetch with credentials
  const graphql = await page.evaluate(async (handle)=>{
    try{
      // Try to get userId from page
      const html = document.documentElement.innerHTML;
      const uidMatch = html.match(/"profilePage_(\d+)"/) || html.match(/"id":"(\d+)"/);
      const uid = uidMatch ? uidMatch[1] : null;
      // Try fetch collections via Instagram's web API
      // First, try the collections list endpoint used by web
      const endpoints = [
        `https://www.instagram.com/api/v1/collections/list/?include_covered_media=false`,
        `https://www.instagram.com/graphql/query/?query_hash=652e7190f1adf3196b9a32482a407c1f&variables={"user_id":"${uid}","page_size":50}`,
      ];
      const results=[];
      for(const ep of endpoints){
        try{
          const r = await fetch(ep, {credentials:"include", headers:{"X-Requested-With":"XMLHttpRequest"}});
          const t = await r.text();
          results.push({ep, status: r.status, body: t.slice(0,1500)});
        }catch(e){ results.push({ep, error: e.message}); }
      }
      return {uid, results};
    }catch(e){ return {error: e.message}; }
  }, HANDLE).catch(e=>({error:e.message}));
  log(`GraphQL attempt: ${JSON.stringify(graphql).slice(0,2000)}`);
  fs.writeFileSync("out/shane-gee2/recheck-graphql.json", JSON.stringify(graphql,null,2));

  const cols = await page.evaluate(()=>{
    const links=Array.from(document.querySelectorAll('a[href*="/saved/"]'));
    return links.map(a=> ({text:(a.getAttribute("aria-label")||a.innerText||"").trim().replace(/\s+/g," ").slice(0,60), href:a.href, aria: a.getAttribute("aria-label")||""})).filter(x=> x.href.includes("/saved/"));
  });
  // Dedupe by href
  const dedup = [...new Map(cols.map(c=>[c.href,c])).values()];
  log(`Final collections found: ${dedup.length}`);
  for(const c of dedup) log(` - ${c.text} (${c.aria}) -> ${c.href}`);
  fs.writeFileSync("out/shane-gee2/recheck-collections.json", JSON.stringify(dedup,null,2));
  return dedup;
}

async function scrapeCollectionFull(page, href, name){
  log(`\n=== Full scrape ${name} -> ${href} ===`);
  await page.goto(href, {waitUntil:"domcontentloaded", timeout:45000});
  await page.waitForTimeout(3000);
  // Scroll thoroughly
  let last=0, stable=0;
  for(let i=0;i<100;i++){
    const cnt = await page.evaluate(()=> document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"], a[href*="/p/"] img').length);
    // Use actual post links count
    const postCnt = await page.evaluate(()=> document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]').length);
    if(postCnt===last) stable++; else stable=0;
    last=postCnt;
    await page.evaluate(()=> window.scrollBy(0, 2000));
    await page.mouse.wheel(0, 1800).catch(()=>{});
    await page.evaluate(()=>{
      const scrollers = Array.from(document.querySelectorAll('div'));
      for(const d of scrollers) if(d.scrollHeight > d.clientHeight) d.scrollTop = d.scrollHeight;
    });
    await page.waitForTimeout(800);
    if(i%10===0) log(` scroll ${i} postCnt=${postCnt} stable=${stable}`);
    if(stable>=8 && i>15) break;
  }
  const hrefs = await page.evaluate(()=>{
    const els=Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
    const hrefs=els.map(a=> a.getAttribute("href")).filter(Boolean).map(h=> h.startsWith("http")?h:"https://www.instagram.com"+h).map(u=> u.split("?")[0]);
    return [...new Set(hrefs)];
  });
  log(`Found ${hrefs.length} post hrefs in ${name}`);
  // Also get collection title and count from header
  const meta = await page.evaluate(()=>{
    const h = document.querySelector('h1, h2, [data-testid="collection-name"]');
    const cntEl = document.body.innerText.match(/(\d+)\s*posts?/i);
    return {title: h? h.innerText.slice(0,100):"", countText: cntEl? cntEl[0]:"", body: document.body.innerText.slice(0,3000)};
  }).catch(()=>({}));
  log(`Meta ${name}: ${JSON.stringify(meta).slice(0,400)}`);
  fs.writeFileSync(`out/shane-gee2/recheck-${name}-hrefs.json`, JSON.stringify({href, hrefs, meta},null,2));
  return {hrefs, meta};
}

async function scrapePostDetail(page, url){
  await page.goto(url, {waitUntil:"domcontentloaded", timeout:45000}).catch(()=>{});
  await page.waitForTimeout(1800);
  const data = await page.evaluate(()=>{
    let caption="";
    const spans=Array.from(document.querySelectorAll('article span'));
    let best="";
    for(const s of spans){
      const t=(s.innerText||"").trim();
      if(t.length>best.length && t.length>30) best=t;
    }
    caption=best;
    if(!caption){
      const meta=document.querySelector('meta[property="og:description"]');
      if(meta) caption=meta.content||"";
    }
    // Try to get carousel text via alt
    const alts=Array.from(document.querySelectorAll('article img')).map(i=>i.alt).filter(Boolean).join(" | ").slice(0,4000);
    // Try to get all text in article
    const articleText=document.querySelector('article')? document.querySelector('article').innerText.slice(0,5000): document.body.innerText.slice(0,5000);
    const time=document.querySelector('time')?.getAttribute("datetime")||"";
    return {caption: caption.slice(0,8000), alts: alts.slice(0,4000), articleText: articleText.slice(0,6000), time};
  }).catch(()=>({caption:"", alts:"", articleText:"", time:""}));
  return {url, ...data};
}

async function main(){
  ensureProfileDir(PROFILE);
  fs.mkdirSync("out/shane-gee2",{recursive:true});
  const ctx=await launchStealth({tiktokBot:{profileDir:PROFILE, headless:false, engine:"firefox"}}, {profileDir:PROFILE, headless:false, engine:"firefox"});
  const page=await ctx.newPage();
  const cols = await getAllCollectionsThorough(page);

  // Check targets
  for(const t of TARGETS){
    const found = cols.find(c=> c.text.toLowerCase()===t.toLowerCase() || c.text.toLowerCase().includes(t.toLowerCase()) || c.href.toLowerCase().includes("/"+t.toLowerCase()+"/"));
    if(found) log(`✅ ${t} FOUND: ${found.text} -> ${found.href}`);
    else log(`❌ ${t} NOT FOUND`);
  }

  // Scrape all found target collections in full
  const targetCols = cols.filter(c=> TARGETS.some(t=> c.text.toLowerCase()===t.toLowerCase() || c.href.toLowerCase().includes("/"+t.toLowerCase()+"/")));
  // Also include websites/prompts/github even if already scraped, to re-verify count
  const toScrape = cols.filter(c=> ["websites","prompts","github"].some(n=> c.text.toLowerCase()===n || c.href.toLowerCase().includes(n)));
  log(`\nRe-scraping ${toScrape.length} collections with full scroll...`);
  const allHrefsMap=new Map();
  for(const c of toScrape){
    const name=c.text.toLowerCase()||c.href.split("/saved/")[1]?.split("/")[0];
    const {hrefs, meta} = await scrapeCollectionFull(page, c.href, name);
    for(const h of hrefs){
      if(!allHrefsMap.has(h)) allHrefsMap.set(h, {url:h, collections:[name]});
      else allHrefsMap.get(h).collections.push(name);
    }
    log(`Collection ${name}: ${hrefs.length} hrefs, meta count: ${meta.countText}`);
  }

  log(`\nTotal unique hrefs across target collections: ${allHrefsMap.size}`);
  // Now scrape details for each href to ensure we have full caption/articleText
  let idx=0;
  const details=[];
  for(const [url, info] of allHrefsMap){
    idx++;
    log(`[${idx}/${allHrefsMap.size}] detail ${url} collections=${info.collections.join(",")}`);
    const d = await scrapePostDetail(page, url);
    details.push({...info, ...d});
    await page.waitForTimeout(700);
  }
  fs.writeFileSync("out/shane-gee2/recheck-details.json", JSON.stringify(details,null,2));

  // Categorize and print summary
  const byCollection={};
  for(const d of details){
    for(const col of d.collections){
      if(!byCollection[col]) byCollection[col]=[];
      byCollection[col].push(d);
    }
  }
  for(const [k,v] of Object.entries(byCollection)){
    log(`Collection ${k}: ${v.length} posts detailed`);
    // Show first 3 captions
    for(let i=0;i<Math.min(3,v.length);i++){
      log(`  - ${v[i].url} :: ${v[i].caption.slice(0,100).replace(/\n/g," ")} | alts:${v[i].alts.slice(0,80)}`);
    }
  }

  // Specifically check for breakai/security/ai via All Posts if those collections missing
  const missing = TARGETS.filter(t=> !cols.some(c=> c.text.toLowerCase()===t.toLowerCase()));
  log(`\nMissing collections: ${missing.join(", ")}`);
  if(missing.length>0){
    log(`Checking All Posts for posts matching missing topics...`);
    await page.goto(`https://www.instagram.com/${HANDLE}/saved/all-posts/`, {waitUntil:"domcontentloaded"});
    await page.waitForTimeout(3000);
    // Try to get total saved count via API or header
    const allMeta = await page.evaluate(()=> document.body.innerText.slice(0,4000)).catch(()=> "");
    log(`All Posts body snippet: ${allMeta.slice(0,500).replace(/\n/g," | ")}`);
    fs.writeFileSync("out/shane-gee2/recheck-all-posts-body.txt", allMeta);
  }

  await page.close(); await ctx.close();
  log("Recheck done.");
}
main().catch(e=>{console.error(e); process.exit(1)});
