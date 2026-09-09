import fs from "node:fs";
import path from "node:path";
import { createWorker } from "tesseract.js";

const OUT="out/shane-gee2";
const IMG_DIR=path.join(OUT,"api-images");
function log(...a){ console.log("["+new Date().toLocaleTimeString()+"]", ...a); }

function getImageUrls(media){
  const urls=[];
  const m = media.media || media;
  const actual = m.media || m;
  if(actual.carousel_media){
    for(const cm of actual.carousel_media){
      const c = cm.image_versions2?.candidates?.[0]?.url;
      if(c) urls.push(c);
    }
  } else {
    const c = actual.image_versions2?.candidates?.[0]?.url;
    if(c) urls.push(c);
  }
  return [...new Set(urls)].slice(0,3);
}

async function main(){
  const websites = JSON.parse(fs.readFileSync(path.join(OUT,"api-final-websites.json"),"utf8"));
  const prompts = JSON.parse(fs.readFileSync(path.join(OUT,"api-final-prompts.json"),"utf8"));
  const github = JSON.parse(fs.readFileSync(path.join(OUT,"api-final-github.json"),"utf8"));
  const allTargets=[
    ...websites.slice(0,40).map(m=> ({media:m, group:"websites"})),
    ...prompts.slice(0,40).map(m=> ({media:m, group:"prompts"})),
    ...github.map(m=> ({media:m, group:"github"})),
  ];
  const dedup=[...new Map(allTargets.map(t=>{
    const m=t.media.media||t.media;
    const code=(m.media||m).code||t.media.code||Math.random().toString();
    return [code,t];
  })).values()];
  log(`Total targets: ${dedup.length}`);

  let existing=[];
  try{ existing=JSON.parse(fs.readFileSync(path.join(OUT,"direct-ocr-results.json"),"utf8")); }catch{}
  const doneCodes=new Set(existing.map(r=> r.code));
  log(`Already done: ${doneCodes.size} codes, ${existing.length} images`);

  const remaining=dedup.filter(t=>{
    const m=t.media.media||t.media;
    const code=(m.media||m).code||t.media.code;
    return !doneCodes.has(code);
  });
  log(`Remaining: ${remaining.length} posts`);

  if(remaining.length===0){ log("Already complete"); return; }

  const worker=await createWorker("eng");
  const results=[...existing];
  let idx=0;
  for(const {media, group} of remaining){
    idx++;
    const m=media.media||media;
    const actual=m.media||m;
    const code=actual.code||m.code||`unknown-${idx}`;
    const user=actual.user?.username||"unknown";
    const caption=(actual.caption?.text||actual.caption||"").slice(0,200);
    const urls=getImageUrls(media);
    log(`[${idx}/${remaining.length}] ${group} ${code} @${user} urls=${urls.length}`);
    if(urls.length===0) continue;
    for(let i=0;i<urls.length;i++){
      const url=urls[i];
      const outPath=path.join(IMG_DIR, `${group}-${code}-${i}.jpg`);
      try{
        if(!fs.existsSync(outPath)){
          const resp=await fetch(url, {headers:{"User-Agent":"Mozilla/5.0"}});
          if(!resp.ok){ log(` fetch ${i} ${resp.status}`); continue; }
          const buf=Buffer.from(await resp.arrayBuffer());
          fs.writeFileSync(outPath, buf);
          log(`  saved ${path.basename(outPath)}`);
        }
        const { data } = await worker.recognize(outPath);
        const txt=(data.text||"").trim();
        log(`  OCR ${i} ${txt.length} conf=${Math.round(data.confidence)} ${txt.slice(0,80).replace(/\n/g," ")}`);
        if(txt.length>30){
          results.push({group, code, url:`https://www.instagram.com/p/${code}/`, user, image:path.basename(outPath), ocr:txt.slice(0,5000), confidence:data.confidence, caption});
          fs.writeFileSync(path.join(OUT,"direct-ocr-results.json"), JSON.stringify(results,null,2));
        }
      }catch(e){ log(`  err ${i}: ${e.message.slice(0,80)}`); }
      await new Promise(r=>setTimeout(r,300));
    }
    await new Promise(r=>setTimeout(r,400));
  }
  await worker.terminate();
  let md=`# Direct Image OCR — ${results.length} images\n\n`;
  for(const r of results.slice(-30)){
    md+=`## ${r.group.toUpperCase()} ${r.code} @${r.user}\nPost: ${r.url}\nOCR:\n\`\`\`\n${r.ocr.slice(0,2000)}\n\`\`\`\n\n`;
  }
  fs.writeFileSync(path.join(OUT,"DIRECT-OCR-RESUMED.md"), md);
  log(`Done. Total ${results.length} images`);
}
main().catch(e=>{console.error(e); process.exit(1)});
