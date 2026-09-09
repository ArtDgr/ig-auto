import { launchStealth } from "./stealth.js";
import { ensureProfileDir } from "./human.js";
import fs from "node:fs";

const PROFILE="profiles/shane-gee2";
const OUT="out/shane-gee2";
function log(...a){ console.log("["+new Date().toLocaleTimeString()+"]", ...a); }

async function fetchAllPages(page, collectionId, name){
  // Try both endpoints and merge
  const results = new Map();
  for(const endpoint of ["posts","all"]){
    let maxId="";
    let pages=0;
    while(pages<80){
      const url=`https://www.instagram.com/api/v1/feed/collection/${collectionId}/${endpoint}/?max_id=${encodeURIComponent(maxId)}`;
      const res = await page.evaluate(async (u)=>{
        const r=await fetch(u, {headers:{"X-Requested-With":"XMLHttpRequest","X-IG-App-ID":"936619743392459"}, credentials:"include"});
        const txt=await r.text();
        let j=null; try{ j=JSON.parse(txt);}catch(e){ j={raw:txt.slice(0,1000)}; }
        return {status:r.status, json:j};
      }, url);
      const items = res.json.items || [];
      log(` ${name} ${endpoint} page ${pages} status ${res.status} items ${items.length} more=${res.json.more_available}`);
      if(!items || items.length===0) break;
      for(const it of items){
        const id = it.media?.id || it.id || it.pk;
        if(id && !results.has(id)) results.set(id, it);
        else if(!id) results.set(Math.random().toString(), it);
      }
      if(!res.json.more_available || !res.json.next_max_id) break;
      maxId=res.json.next_max_id;
      pages++;
      await new Promise(r=>setTimeout(r,400));
    }
  }
  log(` ${name} TOTAL unique via both endpoints: ${results.size}`);
  return Array.from(results.values());
}

async function main(){
  ensureProfileDir(PROFILE);
  const ctx=await launchStealth({tiktokBot:{profileDir:PROFILE, headless:false, engine:"firefox"}}, {profileDir:PROFILE, headless:false, engine:"firefox"});
  const page=await ctx.newPage();
  await page.goto("https://www.instagram.com/shane.gee2/saved/", {waitUntil:"domcontentloaded"});
  await page.waitForTimeout(1500);

  // Reload existing to merge
  let existingWebsites=[], existingPrompts=[];
  try{ existingWebsites=JSON.parse(fs.readFileSync(`${OUT}/api-full-websites.json`,"utf8")); }catch{}
  try{ existingPrompts=JSON.parse(fs.readFileSync(`${OUT}/api-full-prompts.json`,"utf8")); }catch{}
  log(`Existing: websites ${existingWebsites.length}, prompts ${existingPrompts.length}`);

  const websitesId="18150947380356077";
  const promptsId="18095878939608578";
  const githubId="939561092534611";

  // Fetch remaining with both endpoints
  const websitesFull = await fetchAllPages(page, websitesId, "websites");
  const promptsFull = await fetchAllPages(page, promptsId, "prompts");
  const githubFull = await fetchAllPages(page, githubId, "github");

  log(`\nFinal: websites ${websitesFull.length} (API says 734), prompts ${promptsFull.length} (API says 490), github ${githubFull.length} (API says 6)`);
  fs.writeFileSync(`${OUT}/api-final-websites.json`, JSON.stringify(websitesFull,null,2));
  fs.writeFileSync(`${OUT}/api-final-prompts.json`, JSON.stringify(promptsFull,null,2));
  fs.writeFileSync(`${OUT}/api-final-github.json`, JSON.stringify(githubFull,null,2));

  // Simplify and categorize
  function simplify(arr){
    return arr.map(m=>{
      const media = m.media || m;
      const actual = media.media || media;
      const cap = actual.caption?.text || actual.caption || m.caption?.text || "";
      const code = actual.code || m.code || "";
      const user = actual.user?.username || actual.owner?.username || "";
      return {code, url: code?`https://www.instagram.com/p/${code}/`: "", user, caption: String(cap).slice(0,4000), id: actual.id || m.id, like_count: actual.like_count || 0};
    });
  }
  const webSimp = simplify(websitesFull);
  const promSimp = simplify(promptsFull);
  const gitSimp = simplify(githubFull);
  fs.writeFileSync(`${OUT}/api-final-websites-simplified.json`, JSON.stringify(webSimp,null,2));
  fs.writeFileSync(`${OUT}/api-final-prompts-simplified.json`, JSON.stringify(promSimp,null,2));
  fs.writeFileSync(`${OUT}/api-final-github-simplified.json`, JSON.stringify(gitSimp,null,2));

  // Merge all for categorization
  const all = [...webSimp.map(s=>({...s, collection:"websites"})), ...promSimp.map(s=>({...s, collection:"prompts"})), ...gitSimp.map(s=>({...s, collection:"github"}))];
  log(`\nCombined total posts: ${all.length}`);

  // Categorize into 6 groups as user requested
  const groups={websites:[], prompts:[], github:[], breakai:[], security:[], ai:[]};
  for(const p of all){
    const txt=(p.caption+" "+p.user).toLowerCase();
    // Websites: already in websites collection, but also filter those with tool/site language
    if(p.collection==="websites") groups.websites.push(p);
    if(p.collection==="prompts") groups.prompts.push(p);
    if(p.collection==="github") groups.github.push(p);
    // BreakAI: jailbreak/bypass
    if(/jailbreak|bypass|uncensored|dan\s|prompt\s*inject|exploit\s*prompt|universal\s*jailbreak/.test(txt)) groups.breakai.push(p);
    // Security
    if(/security|vuln|cve-\d|exploit|pentest|ctf|osint|malware|phishing|ransomware|breach|zero\s*day/.test(txt)) groups.security.push(p);
    // AI
    if(/(\bai\b|llm|gpt|claude|gemini|openai|anthropic|model|agent|mcp|workflow|automation|neural)/.test(txt)) groups.ai.push(p);
  }
  for(const [k,v] of Object.entries(groups)) log(`Group ${k}: ${v.length}`);

  // Extract all websites referenced (https URLs)
  const urlRegex=/(https?:\/\/[^\s"'\)]+)/g;
  const allUrls=[];
  const urlSet=new Map();
  for(const p of all){
    const ms = String(p.caption).match(urlRegex) || [];
    for(const u of ms){
      const clean=u.replace(/[.,;!]+$/,"");
      if(!urlSet.has(clean)) urlSet.set(clean, {url:clean, post:p.url, user:p.user, collection:p.collection, excerpt:p.caption.slice(0,80).replace(/\n/g," ")});
    }
  }
  log(`\nUnique https URLs in captions: ${urlSet.size}`);
  for(const [u,info] of Array.from(urlSet.entries()).slice(0,10)) log(` - ${u} from ${info.post}`);

  // Save groups
  fs.writeFileSync(`${OUT}/final-groups.json`, JSON.stringify(groups,null,2));
  fs.writeFileSync(`${OUT}/final-all-urls.json`, JSON.stringify(Array.from(urlSet.values()),null,2));

  // Build categorized markdown
  let md=`# shane.gee2 — FULL Collections (API)\n\nFetched ${all.length} posts (websites ${webSimp.length}/734, prompts ${promSimp.length}/490, github ${gitSimp.length}/6). BreakAi/Security/Ai collections do NOT exist — categorized by caption keywords.\n\n`;
  for(const [k,v] of Object.entries(groups)){
    md+=`## ${k.toUpperCase()} — ${v.length} posts\n\n`;
    if(v.length===0) md+=`_No posts matched this keyword filter. Check raw captions or broaden keywords._\n\n`;
    else {
      for(let i=0;i<Math.min(v.length, 15);i++){
        const p=v[i];
        md+=`- [${p.code}](https://www.instagram.com/p/${p.code}/) @${p.user} — ${p.caption.slice(0,140).replace(/\n/g," ")}...\n`;
      }
      if(v.length>15) md+=`\n_...and ${v.length-15} more in \`${OUT}/final-groups.json\`_\n`;
      md+=`\n`;
    }
  }
  md+=`## All https URLs found (${urlSet.size})\n\n`;
  for(const u of Array.from(urlSet.values())) md+=`- ${u.url} ← ${u.post} (@${u.user} ${u.collection})\n`;
  fs.writeFileSync(`${OUT}/FINAL-CATEGORIZED.md`, md);
  log(`Wrote FINAL-CATEGORIZED.md`);

  await page.close(); await ctx.close();
}
main().catch(e=>{console.error(e); process.exit(1)});
