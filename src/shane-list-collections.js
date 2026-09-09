import { launchStealth } from "./stealth.js";
import { ensureProfileDir } from "./human.js";
import fs from "node:fs";

const PROFILE="profiles/shane-gee2";
const HANDLE="shane.gee2";
async function main(){
  ensureProfileDir(PROFILE);
  const ctx=await launchStealth({tiktokBot:{profileDir:PROFILE, headless:false, engine:"firefox"}}, {profileDir:PROFILE, headless:false, engine:"firefox"});
  const page=await ctx.newPage();
  await page.goto(`https://www.instagram.com/${HANDLE}/saved/`, {waitUntil:"domcontentloaded"});
  await page.waitForTimeout(3000);
  // scroll to load all collections
  for(let i=0;i<12;i++){
    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(800);
    const cnt= await page.evaluate(()=> document.querySelectorAll('a[href*="/saved/"]').length).catch(()=>0);
    console.log(`scroll ${i} links=${cnt}`);
  }
  const cols= await page.evaluate(()=>{
    const links=Array.from(document.querySelectorAll('a[href*="/saved/"]'));
    return links.map(a=> ({text:(a.getAttribute("aria-label")||a.innerText||"").trim().replace(/\s+/g," ").slice(0,60), href:a.href, outer:a.outerHTML.slice(0,250)})).filter(x=> x.href.includes("/saved/"));
  });
  console.log(JSON.stringify(cols, null,2));
  fs.writeFileSync("out/shane-gee2/all-collections.json", JSON.stringify(cols, null,2));
  const names=cols.map(c=>c.text);
  console.log("names:", names.join(" | "));
  await page.close(); await ctx.close();
}
main().catch(e=>{console.error(e); process.exit(1)});
