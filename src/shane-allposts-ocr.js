import { launchStealth } from "./stealth.js";
import { ensureProfileDir } from "./human.js";
import fs from "node:fs";
import path from "node:path";

const PROFILE="profiles/shane-gee2";
const HANDLE="shane.gee2";
const OUT="out/shane-gee2";
const ALL_URL=`https://www.instagram.com/${HANDLE}/saved/all-posts/`;

function log(...a){ console.log("["+new Date().toLocaleTimeString()+"]", ...a); }

async function autoScrollCollect(page, maxScrolls=120){
  let last=0, stable=0;
  for(let i=0;i<maxScrolls;i++){
    const cnt = await page.evaluate(()=> document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]').length).catch(()=>0);
    if(cnt===last) stable++; else stable=0;
    last=cnt;
    await page.mouse.wheel(0, 2000).catch(()=>{});
    await page.waitForTimeout(900);
    if(i%10===0) log(`scroll ${i} posts=${cnt} stable=${stable}`);
    if(stable>=6 && i>15) break;
  }
  const hrefs = await page.evaluate(()=>{
    const els=Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));
    const hrefs=els.map(a=> a.getAttribute("href")).filter(Boolean).map(h=> h.startsWith("http")?h:"https://www.instagram.com"+h).map(u=> u.split("?")[0]);
    return [...new Set(hrefs)];
  });
  return hrefs;
}

async function scrapePost(page, url){
  await page.goto(url, {waitUntil:"domcontentloaded", timeout:45000}).catch(()=>{});
  await page.waitForTimeout(1500);
  // try to advance carousel to get all images? we can just collect all img src in article
  const data = await page.evaluate(()=>{
    let caption="";
    const spans=Array.from(document.querySelectorAll('article span, article div span'));
    let best="";
    for(const s of spans){
      const t=(s.innerText||s.textContent||"").trim();
      if(t.length>best.length && t.length>30 && !t.match(/^(Like|Comment|Share|·)/)) best=t;
    }
    caption=best;
    if(!caption || caption.length<30){
      const meta=document.querySelector('meta[property="og:description"]');
      if(meta) caption=meta.getAttribute("content")||caption;
    }
    const timeEl=document.querySelector('time');
    const time=timeEl? timeEl.getAttribute("datetime")||"" : "";
    const altImgs=Array.from(document.querySelectorAll('article img')).map(img=> ({src: img.src, alt: img.alt||"", w: img.width})).filter(x=> x.src && x.src.includes("scontent"));
    // also try to get carousel image URLs via meta og:image?
    const ogImgs=Array.from(document.querySelectorAll('meta[property="og:image"]')).map(m=> m.getAttribute("content")).filter(Boolean);
    return {caption: caption.slice(0,8000), time, imgs: altImgs.slice(0,12), ogImgs: ogImgs.slice(0,5), body: document.body.innerText.slice(0,5000)};
  }).catch(()=>({caption:"", time:"", imgs:[], ogImgs:[], body:""}));
  // classify by keywords for missing groups
  const text=(data.caption+" "+data.body).toLowerCase();
  const cats=[];
  if(/website|tool|directory|inspo|useful\s*site|toolkit|resource/.test(text) || /ninjaaitools|trickydost|unboxarea|karmendra/.test(text)) cats.push("websites");
  if(/prompt|circle|chatgpt|claude|gptprompts|wisdomhunter|thinkgpt/.test(text)) cats.push("prompts");
  if(/github|repo|openclaw|mcp|instapy|gramaddict|instagrapi|clone/.test(text)) cats.push("github");
  if(/break|jailbreak|bypass|uncensored|dan\s|prompt\s*inject|ox\s*alpha/.test(text)) cats.push("breakai");
  if(/security|vuln|cve|exploit|hack|pentest|osint|ctf|malware|phishing|ransomware|breach/.test(text)) cats.push("security");
  if(/\bai\b|model|agent|workflow|llm|gpt|claude|gemini|openai|anthropic|mcp/.test(text)) cats.push("ai");
  if(cats.length===0) cats.push("uncategorized");
  return {url, ...data, cats};
}

async function main(){
  fs.mkdirSync(path.join(OUT,"images"), {recursive:true});
  ensureProfileDir(PROFILE);
  const ctx=await launchStealth({tiktokBot:{profileDir:PROFILE, headless:false, engine:"firefox"}}, {profileDir:PROFILE, headless:false, engine:"firefox"});
  const page=await ctx.newPage();
  log("Navigating to All Posts: "+ALL_URL);
  await page.goto(ALL_URL, {waitUntil:"domcontentloaded", timeout:45000}).catch(()=>{});
  await page.waitForTimeout(3000);
  const hrefs = await autoScrollCollect(page, 120);
  log(`All Posts: found ${hrefs.length} hrefs`);
  fs.writeFileSync(path.join(OUT,"all-posts-hrefs.json"), JSON.stringify(hrefs,null,2));

  // Load already scraped to skip
  let existing=[];
  try{ existing=JSON.parse(fs.readFileSync(path.join(OUT,"posts-raw.json"),"utf8")); }catch{}
  const existingMap=new Map(existing.map(p=>[p.url,p]));
  log(`Existing scraped: ${existing.length}`);

  const newHrefs = hrefs.filter(h=> !existingMap.has(h));
  log(`New hrefs to scrape: ${newHrefs.length}, total with existing: ${hrefs.length}`);

  let allResults=[...existing];
  // If we want fresh, re-scrape all for consistent cats? Let's add cats to existing too
  for(const r of allResults){
    const text=(r.caption+" "+r.bodyExcerpt).toLowerCase();
    const cats=[];
    if(/website|tool|directory|inspo|useful\s*site|toolkit|resource/.test(text)) cats.push("websites");
    if(/prompt|circle|chatgpt|claude|gptprompts|wisdomhunter|thinkgpt/.test(text)) cats.push("prompts");
    if(/github|repo|openclaw|mcp|instapy|gramaddict|instagrapi|clone/.test(text)) cats.push("github");
    if(/break|jailbreak|bypass|uncensored|dan\s|prompt\s*inject|ox\s*alpha/.test(text)) cats.push("breakai");
    if(/security|vuln|cve|exploit|hack|pentest|osint|ctf|malware|phishing|ransomware|breach/.test(text)) cats.push("security");
    if(/\bai\b|model|agent|workflow|llm|gpt|claude|gemini|openai|anthropic|mcp/.test(text)) cats.push("ai");
    if(cats.length===0) cats.push("uncategorized");
    r.cats=cats;
  }

  let idx=0;
  for(const url of newHrefs){
    idx++;
    log(`[${idx}/${newHrefs.length}] scraping ${url}`);
    const data = await scrapePost(page, url);
    allResults.push(data);
    // collect image URLs for OCR: save ogImgs + imgs
    const imgList=[...data.imgs.map(i=>i.src), ...data.ogImgs];
    // download first 3 images per post for OCR later
    for(let j=0;j<Math.min(3,imgList.length);j++){
      const src=imgList[j];
      try{
        const resp=await fetch(src);
        if(resp.ok){
          const buf=Buffer.from(await resp.arrayBuffer());
          const ext = src.includes(".jpg")? ".jpg" : src.includes(".png")? ".png" : ".jpg";
          const fname = url.split("/p/")[1]?.replace(/\/$/,"") || `img-${idx}-${j}`;
          const fpath=path.join(OUT,"images", `${fname}-${j}${ext}`);
          fs.writeFileSync(fpath, buf);
        }
      }catch(e){}
    }
    fs.writeFileSync(path.join(OUT,"posts-all-raw.json"), JSON.stringify(allResults,null,2));
    await page.waitForTimeout(800+Math.random()*600);
    if(idx>=120) break;
  }

  log(`Done scraping All Posts. Total posts in file: ${allResults.length}`);

  // Categorized summary
  const byCat={websites:[], prompts:[], github:[], breakai:[], security:[], ai:[], uncategorized:[]};
  for(const r of allResults){
    for(const c of (r.cats||[])){
      if(byCat[c]) byCat[c].push(r);
      else byCat.uncategorized.push(r);
    }
  }
  for(const k of Object.keys(byCat)) log(`${k}: ${byCat[k].length}`);
  fs.writeFileSync(path.join(OUT,"by-cat-all.json"), JSON.stringify(byCat,null,2));

  // Try OCR if tesseract available
  let ocrResults=[];
  try{
    const { execSync } = await import("node:child_process");
    execSync("tesseract --version", {stdio:"pipe"});
    log("Tesseract found, running OCR on downloaded images...");
    const images = fs.readdirSync(path.join(OUT,"images")).filter(f=> f.endsWith(".jpg")||f.endsWith(".png")).slice(0,60);
    log(`OCR on ${images.length} images`);
    for(const img of images){
      const imgPath=path.join(OUT,"images", img);
      const outBase=path.join(OUT,"images", img.replace(/\.[^.]+$/,""));
      try{
        execSync(`tesseract "${imgPath}" "${outBase}" -l eng`, {stdio:"pipe"});
        const txtPath=outBase+".txt";
        if(fs.existsSync(txtPath)){
          const txt=fs.readFileSync(txtPath,"utf8").trim();
          if(txt.length>20){
            ocrResults.push({image: img, text: txt.slice(0,3000)});
            log(`OCR ${img}: ${txt.slice(0,80).replace(/\n/g," ")}...`);
          }
        }
      }catch(e){ log(`OCR fail ${img}: ${e.message.slice(0,80)}`); }
    }
    fs.writeFileSync(path.join(OUT,"ocr-results.json"), JSON.stringify(ocrResults,null,2));
    log(`OCR done: ${ocrResults.length} results`);
  }catch(e){
    log(`Tesseract not available: ${e.message.slice(0,100)} — skipping OCR, images saved for manual review`);
    log("Images saved in out/shane-gee2/images/ ("+fs.readdirSync(path.join(OUT,"images")).length+" files)");
  }

  await page.close().catch(()=>{});
  await ctx.close().catch(()=>{});
}
main().catch(e=>{ console.error(e); process.exit(1); });
