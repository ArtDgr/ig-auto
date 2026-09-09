import { launchStealth } from "./stealth.js";
import { ensureProfileDir } from "./human.js";
import fs from "node:fs";

const PROFILE="profiles/shane-gee2";
const OUT="out/shane-gee2";

function log(...a){ console.log("["+new Date().toLocaleTimeString()+"]", ...a); }

async function fetchCollection(page, collectionId, name){
  let maxId="";
  let all=[];
  let pageNum=0;
  while(pageNum<80){
    const url = `https://www.instagram.com/api/v1/feed/collection/${collectionId}/posts/?max_id=${encodeURIComponent(maxId)}`;
    const res = await page.evaluate(async (u)=>{
      const r=await fetch(u, {headers:{"X-Requested-With":"XMLHttpRequest","X-IG-App-ID":"936619743392459"}, credentials:"include"});
      const txt=await r.text();
      let j=null;
      try{ j=JSON.parse(txt); }catch(e){ j={raw:txt.slice(0,2000)}; }
      return {status:r.status, json:j, raw:txt.slice(0,2000)};
    }, url);
    const items = res.json.items || res.json.medias || [];
    // Also check for .feed_items?
    const more = res.json.more_available;
    const next = res.json.next_max_id;
    log(` ${name} page ${pageNum} status ${res.status} items ${items.length} more=${more} next=${next? next.slice(0,20):""}`);
    if(!items || items.length===0){
      if(res.raw) log(` raw: ${res.raw.slice(0,400)}`);
      break;
    }
    all.push(...items);
    if(!more || !next) break;
    maxId=next;
    pageNum++;
    await new Promise(r=>setTimeout(r,500));
    if(all.length>=800) break;
  }
  // Also try /all/ endpoint if posts gave limited
  if(all.length===0 || all.length<10){
    log(` Trying /all/ endpoint for ${name}`);
    maxId="";
    pageNum=0;
    all=[];
    while(pageNum<30){
      const url=`https://www.instagram.com/api/v1/feed/collection/${collectionId}/all/?max_id=${encodeURIComponent(maxId)}`;
      const res = await page.evaluate(async (u)=>{
        const r=await fetch(u, {headers:{"X-Requested-With":"XMLHttpRequest","X-IG-App-ID":"936619743392459"}, credentials:"include"});
        const txt=await r.text();
        let j=null; try{ j=JSON.parse(txt);}catch(e){ j={raw:txt.slice(0,2000)}; }
        return {status:r.status, json:j};
      }, url);
      const items = res.json.items || res.json.medias || [];
      log(`  all page ${pageNum} status ${res.status} items ${items.length} more=${res.json.more_available}`);
      if(!items || items.length===0) break;
      all.push(...items);
      if(!res.json.more_available || !res.json.next_max_id) break;
      maxId=res.json.next_max_id;
      pageNum++;
      await new Promise(r=>setTimeout(r,500));
    }
  }
  return all;
}

async function main(){
  ensureProfileDir(PROFILE);
  const ctx=await launchStealth({tiktokBot:{profileDir:PROFILE, headless:false, engine:"firefox"}}, {profileDir:PROFILE, headless:false, engine:"firefox"});
  const page=await ctx.newPage();
  await page.goto("https://www.instagram.com/shane.gee2/saved/", {waitUntil:"domcontentloaded"});
  await page.waitForTimeout(2000);

  // Get collections list
  const cols = await page.evaluate(async ()=>{
    const r=await fetch("https://www.instagram.com/api/v1/collections/list/?include_covered_media=false", {headers:{"X-Requested-With":"XMLHttpRequest","X-IG-App-ID":"936619743392459"}, credentials:"include"});
    const j=await r.json();
    return j;
  });
  const items = cols.items || [];
  log(`Collections: ${items.length}`);
  const targets=["websites","prompts","github"];
  const matched = items.filter(c=> targets.includes(c.collection_name.toLowerCase()));
  for(const c of matched) log(` - ${c.collection_name} ${c.collection_id} count=${c.collection_media_count}`);

  // Fetch each
  for(const col of matched){
    const name=col.collection_name.toLowerCase();
    log(`\n=== Fetching ${col.collection_name} (${col.collection_id}) expected ${col.collection_media_count} ===`);
    const medias = await fetchCollection(page, col.collection_id, name);
    log(`Fetched ${medias.length} for ${name}`);
    fs.writeFileSync(`${OUT}/api-full-${name}.json`, JSON.stringify(medias,null,2));
    // Simplify
    const simplified = medias.map(m=>{
      const media = m.media || m;
      // Instagram collection media is wrapped: {media: {...}}
      const actual = media.media || media;
      // Sometimes it's directly media object
      const cap = actual.caption?.text || actual.caption || m.caption?.text || "";
      const code = actual.code || m.code || "";
      const user = actual.user?.username || actual.owner?.username || m.user?.username || "";
      const like = actual.like_count || 0;
      const url = code ? `https://www.instagram.com/p/${code}/` : "";
      return {code, url, user, caption: String(cap).slice(0,3000), like_count: like, id: actual.id || m.id};
    });
    fs.writeFileSync(`${OUT}/api-full-${name}-simplified.json`, JSON.stringify(simplified,null,2));
    // Extract URLs from captions
    const urlRegex=/(https?:\/\/[^\s"']+)/g;
    let urlCount=0;
    for(const s of simplified){
      const ms = String(s.caption).match(urlRegex);
      if(ms) urlCount+=ms.length;
    }
    log(` URLs in captions: ${urlCount}`);
    // Stats
    const withCaption = simplified.filter(s=> s.caption.length>10).length;
    log(` with caption: ${withCaption}/${simplified.length}`);
  }

  // Also try to fetch breakai/security/ai via search? They don't exist, but try listing all to confirm
  const allNames = items.map(c=> c.collection_name);
  log(`\nAll collection names: ${allNames.join(", ")}`);
  const missing=["breakai","security","ai"];
  for(const m of missing){
    const found = items.filter(c=> c.collection_name.toLowerCase().includes(m));
    log(`Search ${m}: ${found.length? found.map(f=> f.collection_name).join(", "): "NONE"}`);
  }

  await page.close(); await ctx.close();
}
main().catch(e=>{console.error(e); process.exit(1)});
