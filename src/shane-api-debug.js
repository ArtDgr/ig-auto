import { launchStealth } from "./stealth.js";
import { ensureProfileDir } from "./human.js";
import fs from "node:fs";

const PROFILE="profiles/shane-gee2";
async function main(){
  ensureProfileDir(PROFILE);
  const ctx=await launchStealth({tiktokBot:{profileDir:PROFILE, headless:false, engine:"firefox"}}, {profileDir:PROFILE, headless:false, engine:"firefox"});
  const page=await ctx.newPage();
  await page.goto("https://www.instagram.com/shane.gee2/saved/websites/18150947380356077/", {waitUntil:"domcontentloaded"});
  await page.waitForTimeout(2000);

  // Listen to network
  page.on("response", async (resp)=>{
    const url=resp.url();
    if(url.includes("collections") || url.includes("graphql") || url.includes("api/v1")){
      console.log(`[resp] ${resp.status()} ${url.slice(0,150)}`);
      try{
        const txt=await resp.text();
        if(url.includes("collections") && txt.length>0){
          console.log(` body snippet: ${txt.slice(0,800).replace(/\n/g," ")}`);
          fs.writeFileSync(`out/shane-gee2/debug-${Date.now()}.json`, txt.slice(0,10000));
        }
      }catch(e){}
    }
  });

  // Scroll to trigger API
  for(let i=0;i<5;i++){
    await page.mouse.wheel(0, 2000);
    await page.waitForTimeout(1000);
  }

  // Try manual fetches with various endpoints
  const endpoints=[
    "https://www.instagram.com/api/v1/collections/18150947380356077/get/",
    "https://www.instagram.com/api/v1/collections/18150947380356077/get/?include_covered_media=true",
    "https://www.instagram.com/api/v1/feed/collection/18150947380356077/get/",
    "https://i.instagram.com/api/v1/collections/18150947380356077/get/",
  ];
  for(const ep of endpoints){
    const res = await page.evaluate(async (u)=>{
      try{
        const r=await fetch(u, {headers:{"X-Requested-With":"XMLHttpRequest","X-IG-App-ID":"936619743392459"}, credentials:"include"});
        const txt=await r.text();
        return {status:r.status, url:u, body:txt.slice(0,2000), headers: Object.fromEntries(r.headers.entries())};
      }catch(e){ return {url:u, error:e.message}; }
    }, ep);
    console.log(`\nManual ${ep} -> ${JSON.stringify(res).slice(0,600)}`);
  }

  await page.waitForTimeout(3000);
  await page.close(); await ctx.close();
}
main().catch(e=>{console.error(e);process.exit(1)});
