import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";
import { rand, sleep, humanDelay, moveMouse, humanReview, ensureProfileDir, setSpeed } from "./human.js";
import { notify } from "./notify.js";

const xcfg = config.x || {};
setSpeed(xcfg.speed ?? 0.6);
async function wr(a,b){ await sleep(Math.max(120, Math.round(rand(a,b)*(xcfg.speed??0.6)))); }
const X_HANDLE = (xcfg.handle||"@theitsupprtguru").replace(/^@/,"");

function daysSinceStart(){ const s=new Date(config.startedAt||"2026-08-01").getTime(); return Math.floor((Date.now()-s)/86400000); }
function todayLocal(){ const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); }
function log(...a){ console.log("["+new Date().toLocaleTimeString()+"] "+a.join(" ")); }

function requireWarmup(){
  if(xcfg.enabled===false) throw new Error("x.enabled is false in config");
  const age=daysSinceStart();
  log(`Account age: ${age} day(s) (warmup requires ${xcfg.minWarmupDays||0})`);
  if(age < (xcfg.minWarmupDays||0)) throw new Error(`Still in warmup (${age}/${xcfg.minWarmupDays}). Post manually from out/x-ready until warmup passes.`);
}
function loadManifest(){
  const file=path.join(xcfg.postDir||"out/x-ready","manifest.json");
  if(!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file,"utf8"));
}
function pendingPosts(manifest,{byId,slot}){
  if(!manifest) return [];
  let posts=manifest.posts||[];
  if(byId) posts=posts.filter(p=>p.id===byId);
  else { if(manifest.date!==todayLocal()) return []; if(slot!==undefined&&slot!==null) posts=posts.filter(p=>p.slot===slot); }
  posts=posts.filter(p=>!fs.existsSync(path.join(xcfg.postDir||"out/x-ready", p.id,".posted"))).sort((a,b)=>a.slot-b.slot);
  return byId?posts.slice(0,1):posts.slice(0,xcfg.maxPerDay||4);
}
async function isLoggedIn(page){
  try{
    await page.goto("https://x.com/home",{waitUntil:"domcontentloaded",timeout:40000});
    await sleep(1800);
    if(await page.getByRole("button",{name:/Log in/i}).first().isVisible().catch(()=>false)) return false;
    if(await page.locator(`a[href="/${X_HANDLE}"]`).first().isVisible().catch(()=>false)) return true;
    if(await page.getByTestId("SideNav_AccountSwitcher_Button").first().isVisible().catch(()=>false)) return true;
    // fallback: composer visible means logged in
    if(await page.getByTestId("tweetTextarea_0").first().isVisible().catch(()=>false)) return true;
    return false;
  }catch(e){ log("login check error: "+e.message); return false; }
}
function readXCreds(){
  try{
    const candidates=["credentials/x.json","credentials/twitter.json"];
    for(const c of candidates){
      if(fs.existsSync(c)){
        const j=JSON.parse(fs.readFileSync(c,"utf8"));
        if(j&&j.username&&j.password) return j;
      }
    }
  }catch{}
  return null;
}
async function autoLogin(page){
  const cred=readXCreds();
  if(!cred) return{ok:false,reason:"no-creds"};
  log("Session invalid — attempting X credential login…");
  await page.goto("https://x.com/login",{waitUntil:"domcontentloaded",timeout:45000}).catch(()=>{});
  await wr(1500,3200);
  // X login flow: username -> Next -> password
  const userInput=page.locator('input[autocomplete="username"], input[name="text"]').first();
  if(!(await userInput.isVisible().catch(()=>false))) return{ok:false,reason:"login-page-missing"};
  await userInput.fill(cred.username);
  await humanDelay([300,900]);
  const nextBtn=page.locator('div[role="button"]:has-text("Next"), button:has-text("Next")').first();
  await nextBtn.click().catch(()=>{});
  await wr(1500,2800);
  // maybe asks for unusual login / email; try password directly
  const passInput=page.locator('input[name="password"], input[type="password"]').first();
  if(await passInput.isVisible().catch(()=>false)){
    await passInput.fill(cred.password);
    await humanDelay([600,1400]);
    const loginBtn=page.locator('div[data-testid="LoginForm_Login_Button"], div[role="button"]:has-text("Log in")').first();
    await loginBtn.click().catch(async()=>{ await page.keyboard.press("Enter"); });
  } else {
    // X sometimes shows "Enter phone or email" challenge
    const maybePass=page.locator('input[type="password"]').first();
    if(await maybePass.isVisible().catch(()=>false)){
      await maybePass.fill(cred.password);
      await page.keyboard.press("Enter");
    } else {
      return{ok:false,reason:"challenge"};
    }
  }
  for(let i=0;i<20;i++){
    await sleep(2000);
    if(await isLoggedIn(page).catch(()=>false)){ log("X credential login succeeded."); return{ok:true}; }
    if(await page.getByText(/Confirm it.*you|Challenge|unusual login/i).first().isVisible().catch(()=>false)) return{ok:false,reason:"challenge"};
    if(await page.getByText(/Wrong password|Incorrect/i).first().isVisible().catch(()=>false)) return{ok:false,reason:"bad-credentials"};
  }
  return{ok:false,reason:"timeout"};
}
export async function ensureSession(){
  ensureProfileDir(xcfg.profileDir||"profiles/x");
  const context=await launchStealth(config,{profileDir:xcfg.profileDir||"profiles/x", headless:true});
  const page=await context.newPage();
  try{
    if(await isLoggedIn(page)) return{ok:true};
    return await autoLogin(page);
  } finally { await page.close().catch(()=>{}); await context.close().catch(()=>{}); }
}
async function doOrganicActivity(page, clicks){
  for(let i=0;i<clicks;i++){
    await humanDelay([900,2400]);
    const like=page.locator('div[data-testid="like"]').first();
    if(await like.isVisible().catch(()=>false)){ await moveMouse(page, rand(300,1100), rand(300,900)); await like.click().catch(()=>{}); await humanDelay([1200,3500]); }
    await page.mouse.wheel(0, rand(500,1400)).catch(()=>{});
    await humanDelay([800,2000]);
  }
}
async function uploadPost(page, media, caption, dryRun){
  if(dryRun){ log("[dry-run] would post X -> "+path.basename(path.dirname(media[0]))+" ("+media.length+" img) | "+JSON.stringify(caption.slice(0,80)+"...")); return; }
  await page.goto("https://x.com/compose/post",{waitUntil:"domcontentloaded",timeout:40000}).catch(async()=>{ await page.goto("https://x.com/home",{waitUntil:"domcontentloaded",timeout:40000}); });
  await wr(1500,3000);
  // Composer textarea
  const box=page.locator('div[data-testid="tweetTextarea_0"], div[role="textbox"][contenteditable="true"]').first();
  await box.waitFor({state:"visible",timeout:15000}).catch(()=>{ throw new Error("X composer not found — layout may have changed"); });
  await box.click().catch(()=>{});
  await humanDelay([400,900]);
  await page.keyboard.type(caption, {delay: rand(20,55)}).catch(()=>{});
  await wr(600,1400);
  // Attach images (1-4). X uses input[type=file] with accept image/*
  if(media.length){
    const input=page.locator('input[data-testid="fileInput"], input[type="file"][accept*="image"]').first();
    await input.waitFor({state:"attached",timeout:10000}).catch(()=>{});
    if(await input.count().catch(()=>0)){
      // X allows up to 4 images per post; attach first up to 4
      const toAttach=media.slice(0,4);
      await input.setInputFiles(toAttach);
      log("X files attached: "+toAttach.length);
      await wr(2500,4500);
    } else {
      log("X file input not found — posting text-only");
    }
  }
  await humanReview(page, rand(700,1100), rand(300,600));
  const postBtn=page.locator('div[data-testid="tweetButtonInline"], div[data-testid="tweetButton"], div[role="button"]:has-text("Post")').first();
  await postBtn.waitFor({state:"visible",timeout:15000}).catch(()=>{ throw new Error("X Post button not found"); });
  await postBtn.click().catch(()=>{ throw new Error("Could not click Post"); });
  log("X post submitted");
  for(let i=0;i<12;i++){ await sleep(1000); if(await page.getByText(/Your post was sent|View/i).first().isVisible().catch(()=>false)) break; }
}

async function runBot({dryRun=false, force=false, byId=null, slot=null}={}){
  if(!force) requireWarmup();
  ensureProfileDir(xcfg.profileDir||"profiles/x");
  const manifest=loadManifest();
  if(!manifest){ log("No manifest at "+path.join(xcfg.postDir||"out/x-ready","manifest.json")+" — run x pipeline first."); return{posted:0}; }
  const posts=pendingPosts(manifest,{byId,slot});
  if(!posts.length){ log("Nothing to post"+(slot!==null?" for slot "+slot:"")+"."); return{posted:0}; }
  log("Posting "+posts.length+" from "+manifest.posts.length+" in X manifest.");
  const context=await launchStealth(config,{profileDir:xcfg.profileDir||"profiles/x", headless: xcfg.headless!==false});
  const page=await context.newPage();
  let posted=0;
  const postedTitles=[];
  try{
    if(!(await isLoggedIn(page))){
      const res=await autoLogin(page);
      if(!res.ok){
        await page.screenshot({path: res.reason==="challenge"?"out/x-challenge.png":"out/x-not-logged-in.png"}).catch(()=>{});
        const msg={ "no-creds":"Not logged in and no credentials/x.json — run: node src/x-bot.js login  (then log in once).", challenge:"X challenge/checkpoint after auto-login — needs human: node src/x-bot.js login", "bad-credentials":"X rejected credentials/x.json — fix or run: node src/x-bot.js login", "login-page-missing":"Login page didn't load — run: node src/x-bot.js login", timeout:"Auto-login timed out — run: node src/x-bot.js login" }[res.reason]||"Could not re-authenticate. Run: node src/x-bot.js login";
        throw new Error(msg);
      }
    }
    log("Logged in as @"+X_HANDLE+" on X. Starting humanized session.");
    if((xcfg.speed??0.6) < 0.5) log("fast mode ("+xcfg.speed+") — skipping organic activity.");
    else await doOrganicActivity(page, rand(xcfg.scrollClicksDuringSession?.[0]??1, xcfg.scrollClicksDuringSession?.[1]??2));
    for(const p of posts){
      const media=(p.media||[]).filter(m=>m&&fs.existsSync(m));
      log(`[x slot ${p.slot}] ${p.format} · ${p.title} (${p.caption.length} chars)`);
      await uploadPost(page, media, p.caption, dryRun);
      if(!dryRun){ fs.writeFileSync(path.join(xcfg.postDir||"out/x-ready", p.id, ".posted"), new Date().toISOString()); posted++; postedTitles.push(p.title); } else posted++;
      if(posts.indexOf(p) < posts.length-1){ const gap=rand((xcfg.staggerMinutes?.[0]??3)*1000, (xcfg.staggerMinutes?.[1]??7)*1000); log("staggering ~"+Math.round(gap/1000)+"s before next."); await sleep(gap); }
    }
    await page.close();
  } finally { await context.close().catch(()=>{}); }
  log("Done. Treated: "+posted);
  if(posted>0 && !dryRun){
    await notify({ title:"X post published", message: posted+(posted===1?" post":" posts")+" live on @"+X_HANDLE+":\n"+postedTitles.slice(0,3).map(t=>"• "+String(t).replace(/\s+/g," ").slice(0,60)).join("\n") });
  }
  return{posted};
}

// ---- CLI ----
const isMain=process.argv[1] && pathToFileURL(process.argv[1]).href===import.meta.url;
if(isMain){
  const args=process.argv.slice(2);
  const mode=args.find(a=>!a.startsWith("--"))||"run";
  const dry=args.includes("--dry");
  const force=args.includes("--force");
  const byIdArg=args.find(a=>a.startsWith("--post="));
  const slotArg=args.find(a=>a.startsWith("--slot="));
  const byId=byIdArg?byIdArg.split("=")[1]:null;
  const slot=slotArg?parseInt(slotArg.split("=")[1],10):null;
  if(mode==="login"){
    ensureProfileDir(xcfg.profileDir||"profiles/x");
    (async()=>{
      const context=await launchStealth(config,{profileDir:xcfg.profileDir||"profiles/x", headless:false});
      const page=await context.newPage();
      await page.goto("https://x.com/login",{waitUntil:"domcontentloaded",timeout:40000});
      log(""); log("──────────────────────────────────────────────────────────────");
      log("A NEW Firefox window just opened. Log into @"+X_HANDLE+" THERE.");
      log("Complete any verification steps in it. Window stays open ~5 minutes.");
      log("──────────────────────────────────────────────────────────────");
      let detected=false;
      for(let i=0;i<300;i++){
        await sleep(1000);
        if(await page.locator(`a[href="/${X_HANDLE}"]`).first().isVisible().catch(()=>false)){ detected=true; break; }
        if(await page.getByTestId("SideNav_AccountSwitcher_Button").first().isVisible().catch(()=>false)){ detected=true; break; }
        if(i%30===29) log("still waiting… "+(i+1)+"s | url="+page.url().slice(0,60));
      }
      const cookies=await context.cookies("https://x.com").catch(()=>[]);
      const hasSession=cookies.some(c=>["auth_token","twid"].includes(c.name)&&(c.value||"").length>4);
      if(hasSession) log("SESSION CONFIRMED: saved to "+(xcfg.profileDir||"profiles/x"));
      else if(detected) log("Profile seen but no session cookie yet — finish verification and run again.");
      else { log("NOT DETECTED — login did not persist. Retry `node src/x-bot.js login`."); process.exitCode=1; }
      await page.close(); await context.close();
    })().catch(e=>{ console.error("Login error: "+e.message); process.exit(1); });
  } else if(mode==="run"||mode==="post"){
    runBot({dryRun:dry, force, byId, slot}).then(r=>{ if(!r.posted) process.exitCode=1; }).catch(e=>{ console.error("X Bot error: "+e.message); process.exit(1); });
  }
}
export default { runBot };
