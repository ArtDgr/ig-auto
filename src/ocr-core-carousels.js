import { launchStealth } from "./stealth.js";
import { ensureProfileDir } from "./human.js";
import fs from "node:fs";
import path from "node:path";
import { createWorker } from "tesseract.js";

const PROFILE="profiles/shane-gee2";
const OUT="out/shane-gee2";
const IMG_DIR=path.join(OUT,"images-core");

async function fetchImagesForUrl(page, url){
  await page.goto(url, {waitUntil:"domcontentloaded", timeout:45000}).catch(()=>{});
  await page.waitForTimeout(1800);
  // try to get all carousel images by swiping?
  const imgs = await page.evaluate(()=>{
    const srcs = Array.from(document.querySelectorAll('article img')).map(i=>i.src).filter(s=> s && s.includes("scontent"));
    const alts = Array.from(document.querySelectorAll('article img')).map(i=>i.alt).filter(Boolean);
    return {srcs: [...new Set(srcs)].slice(0,10), alts};
  }).catch(()=>({srcs:[], alts:[]}));
  // also try to swipe to load more carousel images: click next button up to 8 times
  for(let k=0;k<8;k++){
    const next = page.locator('button[aria-label="Next"], button:has-text("Next")').first();
    if(await next.isVisible().catch(()=>false)){
      await next.click().catch(()=>{});
      await page.waitForTimeout(800);
      const more = await page.evaluate(()=> Array.from(document.querySelectorAll('article img')).map(i=>i.src).filter(s=> s && s.includes("scontent")));
      for(const s of more) if(!imgs.srcs.includes(s)) imgs.srcs.push(s);
    } else break;
  }
  return imgs.srcs.slice(0,10);
}

async function main(){
  fs.mkdirSync(IMG_DIR,{recursive:true});
  // high-value posts from earlier analysis (websites/prompts/github)
  const highValue = [
    "https://www.instagram.com/p/DcbOLfDlgKl/", // 10 websites
    "https://www.instagram.com/p/DcJtc6ak44Z/", // 6 GH
    "https://www.instagram.com/p/DcNOt8mkugc/", // 50 repos
    "https://www.instagram.com/p/Db7NqdJjJ-F/", // 24 MCP
    "https://www.instagram.com/p/DbivYoXEsbe/", // OpenClaw
    "https://www.instagram.com/p/DcEONSaku2o/", // OpenClaw dup
    "https://www.instagram.com/p/DcOPjudTM1S/", // thinkgpt 4 prompts
    "https://www.instagram.com/p/DceNBY-pMMv/", // crcle 1000
    "https://www.instagram.com/p/Db4qRCVidqT/", // gptprompts 1k
    "https://www.instagram.com/p/DcMUxYvkmmh/", // wisdom 100k
    "https://www.instagram.com/p/DcWDFBTCM3z/", // Ox Alpha
    "https://www.instagram.com/p/DcWFTh_jm-k/", // Claude skills
  ];
  ensureProfileDir(PROFILE);
  const ctx=await launchStealth({tiktokBot:{profileDir:PROFILE, headless:false, engine:"firefox"}}, {profileDir:PROFILE, headless:false, engine:"firefox"});
  const page=await ctx.newPage();
  const allImgs=[];
  for(const url of highValue){
    const slug=url.split("/p/")[1].replace("/","");
    console.log(`[${slug}] fetching images...`);
    const srcs = await fetchImagesForUrl(page, url);
    console.log(` -> ${srcs.length} srcs`);
    for(let i=0;i<srcs.length;i++){
      const src=srcs[i];
      try{
        const resp=await fetch(src);
        if(!resp.ok) continue;
        const buf=Buffer.from(await resp.arrayBuffer());
        const fpath=path.join(IMG_DIR, `${slug}-${i}.jpg`);
        fs.writeFileSync(fpath, buf);
        allImgs.push(fpath);
        console.log(`  saved ${fpath} (${buf.length})`);
      }catch(e){ console.log(`  fetch fail ${e.message.slice(0,60)}`); }
    }
    await page.waitForTimeout(800);
  }
  await page.close(); await ctx.close();
  console.log(`\nTotal core images downloaded: ${allImgs.length}`);

  // OCR them
  console.log(`Starting OCR on ${allImgs.length} core images...`);
  const worker = await createWorker("eng");
  const results=[];
  for(const f of allImgs){
    console.log(`OCR ${path.basename(f)}...`);
    try{
      const { data } = await worker.recognize(f);
      const txt=(data.text||"").trim();
      const preview=txt.slice(0,120).replace(/\n/g," ");
      console.log(` -> ${preview}`);
      if(txt.length>20) results.push({image: path.basename(f), url: highValue.find(u=> path.basename(f).startsWith(u.split("/p/")[1].replace("/",""))), text: txt.slice(0,5000), confidence: data.confidence});
    }catch(e){ console.log(` fail ${e.message.slice(0,60)}`); }
  }
  await worker.terminate();
  fs.writeFileSync(path.join(OUT,"ocr-core-results.json"), JSON.stringify(results,null,2));
  console.log(`OCR core done: ${results.length} -> out/shane-gee2/ocr-core-results.json`);
  // also write a readable summary
  let md="# OCR Core Carousels — Extracted Text\n\n";
  for(const r of results){
    md+=`## ${r.image} (${r.url})\n\`\`\`\n${r.text.slice(0,2000)}\n\`\`\`\n\n`;
  }
  fs.writeFileSync(path.join(OUT,"OCR-CORE.md"), md);
  console.log("Wrote OCR-CORE.md");
}
main().catch(e=>{console.error(e); process.exit(1)});
