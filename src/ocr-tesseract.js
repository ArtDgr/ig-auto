import fs from "node:fs";
import path from "node:path";
import { createWorker } from "tesseract.js";

const IMG_DIR="out/shane-gee2/images";
const OUT="out/shane-gee2/ocr-results.json";

async function main(){
  const files=fs.readdirSync(IMG_DIR).filter(f=> f.endsWith(".jpg")||f.endsWith(".png"));
  console.log(`OCR tesseract.js on ${files.length} images`);
  if(files.length===0){ console.log("no images"); return; }
  const worker = await createWorker("eng");
  const results=[];
  for(const f of files){
    const p=path.join(IMG_DIR,f);
    console.log(`OCR ${f}...`);
    try{
      const { data } = await worker.recognize(p);
      const txt=(data.text||"").trim();
      console.log(` -> ${txt.slice(0,100).replace(/\n/g," ")}`);
      if(txt.length>10) results.push({image:f, text: txt.slice(0,4000), confidence: data.confidence});
    }catch(e){ console.log(` fail ${f}: ${e.message.slice(0,80)}`); }
  }
  await worker.terminate();
  fs.writeFileSync(OUT, JSON.stringify(results,null,2));
  console.log(`Done ${results.length} OCR results -> ${OUT}`);
}
main().catch(e=>{console.error(e); process.exit(1)});
