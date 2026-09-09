import fs from "node:fs";
import path from "node:path";
import { createWorker } from "tesseract.js";

const OUT="out/shane-gee2";
const IMG_DIR=path.join(OUT,"api-images");

function log(...a){ console.log("["+new Date().toLocaleTimeString()+"]", ...a); }

function getImageUrls(media){
  const urls=[];
  // media can be {media: {...}} or direct
  const m = media.media || media;
  const actual = m.media || m;
  // carousel
  if(actual.carousel_media){
    for(const cm of actual.carousel_media){
      const cands = cm.image_versions2?.candidates || cm.image_versions2?.additional_candidates?.first_frame ? [] : [];
      // Try candidates
      const c = cm.image_versions2?.candidates?.[0]?.url;
      if(c) urls.push(c);
      // fallback: try video cover?
      if(!c && cm.image_versions2) {
        const alt = Object.values(cm.image_versions2.additional_candidates || {})[0]?.url;
        if(alt) urls.push(alt);
      }
    }
  } else {
    const c = actual.image_versions2?.candidates?.[0]?.url;
    if(c) urls.push(c);
  }
  // dedupe and limit to 3 per post
  return [...new Set(urls)].slice(0,3);
}

async function main(){
  fs.mkdirSync(IMG_DIR,{recursive:true});
  const websites = JSON.parse(fs.readFileSync(path.join(OUT,"api-final-websites.json"),"utf8"));
  const prompts = JSON.parse(fs.readFileSync(path.join(OUT,"api-final-prompts.json"),"utf8"));
  const github = JSON.parse(fs.readFileSync(path.join(OUT,"api-final-github.json"),"utf8"));

  const all = [
    ...websites.slice(0,40).map(m=> ({media:m, group:"websites"})),
    ...prompts.slice(0,40).map(m=> ({media:m, group:"prompts"})),
    ...github.map(m=> ({media:m, group:"github"})),
  ];
  log(`Targets: ${all.length} posts (40 websites + 40 prompts + ${github.length} github)`);

  const worker = await createWorker("eng");
  const results=[];
  let idx=0;
  for(const {media, group} of all){
    idx++;
    const m = media.media || media;
    const actual = m.media || m;
    const code = actual.code || m.code || `unknown-${idx}`;
    const user = actual.user?.username || m.user?.username || "unknown";
    const caption = (actual.caption?.text || actual.caption || "").slice(0,200);
    const urls = getImageUrls(media);
    log(`[${idx}/${all.length}] ${group} ${code} @${user} urls=${urls.length} caption=${caption.slice(0,60).replace(/\n/g," ")}`);
    if(urls.length===0){ log(`  no image urls, skip`); continue; }
    for(let i=0;i<urls.length;i++){
      const url=urls[i];
      const outPath=path.join(IMG_DIR, `${group}-${code}-${i}.jpg`);
      try{
        // Download if not exists
        if(!fs.existsSync(outPath)){
          const resp=await fetch(url, {headers:{"User-Agent":"Mozilla/5.0"}});
          if(!resp.ok){ log(`  fetch ${i} failed ${resp.status}`); continue; }
          const buf=Buffer.from(await resp.arrayBuffer());
          fs.writeFileSync(outPath, buf);
          log(`  saved ${path.basename(outPath)} ${buf.length}`);
        }
        // OCR
        if(fs.existsSync(outPath)){
          const { data } = await worker.recognize(outPath);
          const txt=(data.text||"").trim();
          log(`  OCR ${i} chars=${txt.length} conf=${Math.round(data.confidence)} preview=${txt.slice(0,100).replace(/\n/g," ")}`);
          if(txt.length>30){
            results.push({group, code, url: `https://www.instagram.com/p/${code}/`, user, image: path.basename(outPath), ocr: txt.slice(0,4000), confidence: data.confidence, caption: caption.slice(0,200)});
            fs.writeFileSync(path.join(OUT,"direct-ocr-results.json"), JSON.stringify(results,null,2));
          }
        }
      }catch(e){ log(`  error ${i}: ${e.message.slice(0,80)}`); }
      await new Promise(r=>setTimeout(r,300));
    }
    await new Promise(r=>setTimeout(r,400));
  }
  await worker.terminate();

  // Build markdown and extracted URLs
  let md=`# Direct Image OCR — ${results.length} images\n\n`;
  const allUrls=[];
  for(const r of results){
    md+=`## ${r.group.toUpperCase()} ${r.code} @${r.user}\nPost: ${r.url}\nOCR (${Math.round(r.confidence)}%):\n\`\`\`\n${r.ocr.slice(0,2000)}\n\`\`\`\n\n`;
    const urls = (r.ocr.match(/(https?:\/\/[^\s]+|www\.[^\s]+|[a-z0-9.-]+\.(?:com|ai|io|co|net|org|app|dev|tools|gg|ly|to|me)[^\s]*)?/gi)||[]).filter(Boolean).slice(0,20);
    for(const u of urls) allUrls.push({url:u, post:r.url, group:r.group, image:r.image});
  }
  fs.writeFileSync(path.join(OUT,"DIRECT-OCR.md"), md);
  fs.writeFileSync(path.join(OUT,"direct-ocr-urls.json"), JSON.stringify(allUrls,null,2));
  log(`Done. ${results.length} OCR results, ${allUrls.length} URL-like strings`);
  log(`Files: direct-ocr-results.json, DIRECT-OCR.md, direct-ocr-urls.json`);
}
main().catch(e=>{console.error(e); process.exit(1)});
