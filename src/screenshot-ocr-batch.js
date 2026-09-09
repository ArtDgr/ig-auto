import { launchStealth } from "./stealth.js";
import { ensureProfileDir } from "./human.js";
import fs from "node:fs";
import path from "node:path";
import { createWorker } from "tesseract.js";

const PROFILE="profiles/shane-gee2";
const OUT="out/shane-gee2";
const SCREEN_DIR=path.join(OUT,"screenshots");

function log(...a){ console.log("["+new Date().toLocaleTimeString()+"]", ...a); }

async function screenshotPost(page, url, outPath){
  await page.goto(url, {waitUntil:"domcontentloaded", timeout:45000}).catch(()=>{});
  await page.waitForTimeout(2000);
  // Dismiss login popups
  await page.locator('button:has-text("Not Now"), button:has-text("Close")').first().click().catch(()=>{});
  await page.waitForTimeout(500);
  const article = page.locator('article').first();
  const visible = await article.isVisible().catch(()=> false);
  if(!visible){
    log(` no article for ${url}`);
    return false;
  }
  await article.scrollIntoViewIfNeeded().catch(()=>{});
  await page.waitForTimeout(800);
  try{
    await article.screenshot({path: outPath});
    log(` screenshot ${outPath}`);
    return true;
  }catch(e){
    log(` screenshot fail ${url}: ${e.message.slice(0,80)}`);
    try{ await page.screenshot({path: outPath, fullPage:false}); return true; }catch{ return false; }
  }
}

async function main(){
  fs.mkdirSync(SCREEN_DIR,{recursive:true});
  ensureProfileDir(PROFILE);
  const groups = JSON.parse(fs.readFileSync(path.join(OUT,"final-groups.json"),"utf8"));
  // Prioritize: top 15 websites, top 15 prompts, all breakai (6), top 20 security, top 5 github
  const targets=[];
  const pick = (arr,n, label) => arr.slice(0,n).forEach(p=> targets.push({...p, _group:label}));
  pick(groups.websites||[], 15, "websites");
  pick(groups.prompts||[], 15, "prompts");
  pick(groups.github||[], 5, "github");
  pick(groups.breakai||[], 6, "breakai");
  pick(groups.security||[], 20, "security");
  pick(groups.ai||[], 10, "ai"); // extra ai not already covered
  // Dedupe by code
  const dedup = [...new Map(targets.map(t=>[t.code, t])).values()];
  log(`Targets for screenshot OCR: ${dedup.length} (${targets.length} before dedup)`);

  const ctx=await launchStealth({tiktokBot:{profileDir:PROFILE, headless:false, engine:"firefox"}}, {profileDir:PROFILE, headless:false, engine:"firefox"});
  const page=await ctx.newPage();
  await page.goto("https://www.instagram.com/shane.gee2/saved/", {waitUntil:"domcontentloaded"});
  await page.waitForTimeout(1000);

  const worker = await createWorker("eng");
  const results=[];
  let idx=0;
  for(const t of dedup){
    idx++;
    const url=`https://www.instagram.com/p/${t.code}/`;
    const outImg=path.join(SCREEN_DIR, `${t._group}-${t.code}.png`);
    log(`[${idx}/${dedup.length}] ${t._group} ${t.code} @${t.user}`);
    const ok = await screenshotPost(page, url, outImg);
    if(!ok){ log(` skip OCR for ${t.code}`); continue; }
    await page.waitForTimeout(700);
    // OCR with tesseract.js
    try{
      const { data } = await worker.recognize(outImg);
      const txt=(data.text||"").trim();
      log(`  OCR chars=${txt.length} conf=${Math.round(data.confidence)} preview=${txt.slice(0,120).replace(/\n/g," ")}`);
      if(txt.length>30){
        results.push({group:t._group, code:t.code, url, user:t.user, caption:t.caption.slice(0,300), ocr: txt.slice(0,5000), confidence: data.confidence, image: path.basename(outImg)});
        fs.writeFileSync(path.join(OUT,"screenshot-ocr-results.json"), JSON.stringify(results,null,2));
      }
    }catch(e){ log(`  OCR fail: ${e.message.slice(0,80)}`); }
    // Instagram rate limit: pause
    await new Promise(r=>setTimeout(r,800+Math.random()*700));
  }
  await worker.terminate();
  await page.close(); await ctx.close();

  // Build readable md
  let md=`# Screenshot OCR — High-value posts\n\n${results.length} posts OCR'd\n\n`;
  for(const r of results){
    md+=`## ${r.group.toUpperCase()} — ${r.code} @${r.user}\n`;
    md+=`Post: ${r.url}\n`;
    md+=`Caption: ${r.caption.slice(0,180)}...\n`;
    md+=`OCR (${Math.round(r.confidence)}%):\n\`\`\`\n${r.ocr.slice(0,2500)}\n\`\`\`\n\n`;
    // Try to extract URLs/domains from OCR
    const urls = (r.ocr.match(/https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?/gi)||[]).filter(u=> u.includes(".")).slice(0,20);
    if(urls.length) md+=`Extracted from image: ${urls.join(", ")}\n\n`;
  }
  fs.writeFileSync(path.join(OUT,"SCREENSHOT-OCR.md"), md);
  log(`Done. ${results.length} OCR results -> screenshot-ocr-results.json + SCREENSHOT-OCR.md`);
  // Also save urls extracted
  const allExtracted=[];
  for(const r of results){
    const urls = (r.ocr.match(/https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9-]+\.(?:com|ai|io|co|net|org|app|dev|tools|gg|ly|to|me|is|so|sh)[^\s]*/gi)||[]);
    for(const u of urls) allExtracted.push({url:u, post:r.url, group:r.group});
  }
  fs.writeFileSync(path.join(OUT,"screenshot-ocr-urls.json"), JSON.stringify(allExtracted,null,2));
  log(`Extracted ${allExtracted.length} URL-like strings from OCR`);
}
main().catch(e=>{console.error(e); process.exit(1)});
