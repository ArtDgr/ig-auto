import { launchStealth } from "./stealth.js";
import { ensureProfileDir } from "./human.js";
import fs from "node:fs";

const PROFILE="profiles/shane-gee2";
const OUT="out/shane-gee2";

function log(...a){ console.log("["+new Date().toLocaleTimeString()+"]", ...a); }

async function main(){
  ensureProfileDir(PROFILE);
  const ctx=await launchStealth({tiktokBot:{profileDir:PROFILE, headless:false, engine:"firefox"}}, {profileDir:PROFILE, headless:false, engine:"firefox"});
  const page=await ctx.newPage();
  await page.goto("https://www.instagram.com/shane.gee2/saved/", {waitUntil:"domcontentloaded"});
  await page.waitForTimeout(2000);

  const data = await page.evaluate(async ()=>{
    const r = await fetch("https://www.instagram.com/api/v1/collections/list/?include_covered_media=false", {
      headers: {"X-Requested-With":"XMLHttpRequest", "X-IG-App-ID":"936619743392459"},
      credentials:"include"
    });
    const j = await r.json();
    return {status:r.status, json:j};
  });
  log(`API status ${data.status}`);
  const items = data.json.items || [];
  log(`Total collections via API: ${items.length}`);
  for(const it of items){
    log(` - ${it.collection_name} (${it.collection_id}) count=${it.collection_media_count} type=${it.collection_type}`);
  }
  fs.writeFileSync(`${OUT}/api-collections-full.json`, JSON.stringify(data.json,null,2));

  // Find targets
  const targets=["websites","prompts","github","breakai","security","ai"];
  for(const t of targets){
    const found = items.filter(c=> c.collection_name.toLowerCase()===t.toLowerCase() || c.collection_name.toLowerCase().includes(t.toLowerCase()));
    if(found.length) log(`FOUND ${t}: ${found.map(f=> `${f.collection_name} (${f.collection_id}) count=${f.collection_media_count}`).join(" | ")}`);
    else log(`MISSING ${t}`);
  }

  // Now for each target, fetch paginated media via API
  // Endpoint: /api/v1/collections/{collection_id}/get/?include_covered_media=false&max_id=
  // Let's try for websites (18150947380356077) and prompts (18095878939608578) etc.
  const toFetch = items.filter(c=> targets.some(t=> c.collection_name.toLowerCase()===t.toLowerCase()));
  log(`\nTo fetch details for ${toFetch.length} matched collections`);
  const allCollectionsMedia={};
  for(const col of toFetch){
    log(`\n--- Fetching media for ${col.collection_name} (${col.collection_id}) ---`);
    let maxId=null;
    let allMedia=[];
    let pageNum=0;
    while(pageNum<20){
      let url=`https://www.instagram.com/api/v1/collections/${col.collection_id}/get/?include_covered_media=false`;
      if(maxId) url+=`&max_id=${encodeURIComponent(maxId)}`;
      const chunk = await page.evaluate(async (u)=>{
        const r=await fetch(u, {headers:{"X-Requested-With":"XMLHttpRequest","X-IG-App-ID":"936619743392459"}, credentials:"include"});
        const j=await r.json();
        return {status:r.status, json:j};
      }, url);
      const medias = chunk.json.items || chunk.json.medias || chunk.json.collection_media || [];
      // The structure varies; try to find array
      const arr = chunk.json.medias || chunk.json.items || [];
      log(` page ${pageNum} status ${chunk.status} got ${arr.length} medias, more_available=${chunk.json.more_available} next_max_id=${chunk.json.next_max_id}`);
      if(arr.length===0) break;
      allMedia.push(...arr);
      if(!chunk.json.more_available || !chunk.json.next_max_id) break;
      maxId=chunk.json.next_max_id;
      pageNum++;
      await new Promise(r=>setTimeout(r,600));
      if(allMedia.length>=500) break;
    }
    log(`Total for ${col.collection_name}: ${allMedia.length} (API count was ${col.collection_media_count})`);
    // Save
    fs.writeFileSync(`${OUT}/api-${col.collection_name.toLowerCase()}-media.json`, JSON.stringify(allMedia,null,2));
    // Extract useful info: try to get caption, code, etc.
    const simplified = allMedia.map(m=>{
      const media = m.media || m;
      const caption = media.caption?.text || media.caption || "";
      const code = media.code || media.shortcode || m.code || "";
      const url = code ? `https://www.instagram.com/p/${code}/` : (media.id? `id:${media.id}`:"");
      const user = media.user?.username || media.owner?.username || "";
      return {code, url, user, caption: String(caption).slice(0,2000), like_count: media.like_count, comment_count: media.comment_count};
    });
    fs.writeFileSync(`${OUT}/api-${col.collection_name.toLowerCase()}-simplified.json`, JSON.stringify(simplified,null,2));
    allCollectionsMedia[col.collection_name]=simplified;
    // Extract URLs from captions
    const urlRegex=/(https?:\/\/[^\s"']+)/g;
    const urls=[];
    for(const s of simplified){
      const matches = String(s.caption).match(urlRegex) || [];
      for(const u of matches) urls.push({url:u, post:s.url, caption: s.caption.slice(0,100)});
    }
    log(` URLs in captions for ${col.collection_name}: ${urls.length}`);
    if(urls.length) log(urls.slice(0,5).map(u=>u.url).join(" | "));
  }

  // Also check for breakai/security/ai exact
  const breakaiCol = items.find(c=> c.collection_name.toLowerCase()==="breakai");
  const securityCol = items.find(c=> c.collection_name.toLowerCase()==="security");
  const aiCol = items.find(c=> c.collection_name.toLowerCase()==="ai");
  log(`\nDirect check:`);
  log(` breakai: ${breakaiCol? JSON.stringify(breakaiCol): "NOT FOUND"}`);
  log(` security: ${securityCol? JSON.stringify(securityCol): "NOT FOUND"}`);
  log(` ai: ${aiCol? JSON.stringify(aiCol): "NOT FOUND"}`);

  await page.close(); await ctx.close();
}
main().catch(e=>{console.error(e); process.exit(1)});
