import fs from "node:fs";
import path from "node:path";
import { renderPost } from "./src/ig-render.js";
const date="20260909";
const id=`${date}-apple-iphone-18-pro-duo-surprise-and-shine`;
const post={
  id, date: "2026-09-09", slot: 99, niche:"apple", nicheLabel:"Apple & macOS", pillar:"APPLE DROP", kind:"title",
  title:"Apple Unveils iPhone 18 Pro & First Foldable iPhone Duo",
  subtitle:"Surprise and Shine event — live from Cupertino",
  format:"carousel", slides:[
    {kind:"hook", text:"SURPRISE AND SHINE\nApple unveils iPhone 18 Pro & iPhone Duo"},
    {kind:"title", text:"Meet iPhone 18 Pro, Pro Max & the first foldable iPhone Duo"},
    {kind:"brief", text:"iPhone 18 Pro from $1,199 — Pro Max $1,299 — Duo $1,999\nDeep black • Refined silver • Glacier blue • Burgundy\nPro preorders Sep 12 → available Sep 18\nDuo preorders Oct 16 → available Oct 23\nA20 2nm • 12GB RAM • 48MP triple camera"},
    {kind:"facts", text:"iPhone Duo is book-style foldable — first ever iPhone folding\nApple's first event under CEO John Ternus\nAirPods 5 $129 / $149 wireless • Watch Series 12 & Ultra 4 also unveiled\nAll available Sep 18 (Duo Oct 23)"},
    {kind:"cta", text:"Save this drop. Share it. Follow @theitsupportguru — daily Apple intel for pros."}
  ]
};
const outDir = path.join("out/instagram-ready", id);
const media = await renderPost(post, outDir);
console.log(`Rendered ${media.length} slides to ${outDir}`);
// write caption file like ig-render manifest does
const planPath="data/instagram_plans.json";
let plan={date:"2026-09-09", posts:[post]};
if(fs.existsSync(planPath)){
  try{ const p=JSON.parse(fs.readFileSync(planPath,"utf8")); if(p.date==="2026-09-09") plan=p; }catch{}
}
// ensure manifest for today includes this post plus existing 4
import { loadPlan } from "./src/ig-generator.js";
let existing=null; try{ existing=loadPlan(); }catch{}
if(existing && existing.date==="2026-09-09"){
  if(!existing.posts.find(p=>p.id===id)) existing.posts.push(post);
  // rewrite manifest via renderAll logic: need to update out/instagram-ready/manifest.json
  const manPath="out/instagram-ready/manifest.json";
  let man=JSON.parse(fs.readFileSync(manPath,"utf8"));
  if(!man.posts.find(p=>p.id===id)){
    man.posts.push({...post, media});
    fs.writeFileSync(manPath, JSON.stringify(man,null,2));
    console.log("Appended to manifest.json");
  }
} else {
  // create minimal manifest
  const manPath="out/instagram-ready/manifest.json";
  let man={date:"2026-09-09", renderedAt:new Date().toISOString(), posts:[{...post, media}]};
  if(fs.existsSync(manPath)){
    try{ const cur=JSON.parse(fs.readFileSync(manPath,"utf8")); if(cur.posts) man.posts=[...cur.posts, ...man.posts.filter(p=>!cur.posts.find(q=>q.id===p.id))]; man.date=cur.date; }catch{}
    fs.writeFileSync(manPath, JSON.stringify(man,null,2));
  } else fs.writeFileSync(manPath, JSON.stringify(man,null,2));
  console.log("Manifest updated for 2026-09-09");
}
