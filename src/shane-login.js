import { launchStealth } from "./stealth.js";
import { ensureProfileDir } from "./human.js";
import fs from "node:fs";

const PROFILE = "profiles/shane-gee2";
const HANDLE = "shane.gee2";

async function main(){
  ensureProfileDir(PROFILE);
  console.log(`[shane-login] launching browser profile=${PROFILE} handle=@${HANDLE}`);
  const cfg = { tiktokBot: { profileDir: PROFILE, headless: false, engine: "firefox" } };
  const ctx = await launchStealth(cfg, { profileDir: PROFILE, headless: false, engine: "firefox" });
  const page = await ctx.newPage();
  await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "domcontentloaded", timeout: 45000 }).catch(()=>{});
  console.log("");
  console.log("──────────────────────────────────────────────────────────────");
  console.log(`A Firefox window just opened. Log into @${HANDLE} THERE.`);
  console.log("It is Playwright's own Firefox — not your normal browser.");
  console.log("Complete any 'Confirm it's you' / 2FA / verification steps.");
  console.log("The window stays open ~5 minutes. Waiting for session…");
  console.log("──────────────────────────────────────────────────────────────");
  let detected=false;
  const marker = `a[href="/${HANDLE}/"], svg[aria-label="Profile"], [aria-label*="profile picture"]`;
  for(let i=0;i<300;i++){
    await new Promise(r=>setTimeout(r,1000));
    try{
      if(await page.locator(marker).first().isVisible().catch(()=>false)){ detected=true; break; }
    }catch{}
    if(i%30===29) console.log(`still waiting… ${i+1}s | url=${page.url().slice(0,70)}`);
    // also check if we are on saved page after login
    if(page.url().includes("/accounts/onetap") || page.url().includes("instagram.com/")){
      // check cookies
      const cookies = await ctx.cookies("https://www.instagram.com").catch(()=>[]);
      const has = cookies.some(c=>["sessionid","ds_user_id"].includes(c.name) && (c.value||"").length>4);
      if(has && page.url().includes("instagram.com") && !page.url().includes("/accounts/login")){
        // try to see if logged in via nav
        const logged = await page.locator('svg[aria-label="Home"], svg[aria-label="Search"]').first().isVisible().catch(()=>false);
        if(logged){ detected=true; break; }
      }
    }
  }
  const cookies = await ctx.cookies("https://www.instagram.com").catch(()=>[]);
  const hasSession = cookies.some(c=>["sessionid","ds_user_id"].includes(c.name) && (c.value||"").length>4);
  console.log(`\nCookies: ${cookies.map(c=>c.name+`=${(c.value||"").slice(0,5)}…`).join(", ")}`);
  if(hasSession){
    console.log(`SESSION CONFIRMED: session cookies saved to ${PROFILE}. You're done. Close the window or wait 10s.`);
    // verify by navigating to profile
    await page.goto(`https://www.instagram.com/${HANDLE}/`, {waitUntil:"domcontentloaded"}).catch(()=>{});
    await new Promise(r=>setTimeout(r,5000));
  } else if(detected){
    console.log("Profile icon seen but no session cookie yet — finish login/verification inside the window and keep waiting.");
  } else {
    console.log("");
    console.log("NOT DETECTED — login did not persist.");
    console.log("Retry: node src/shane-login.js and sign in INSIDE the window that opens.");
    process.exitCode=1;
  }
  await page.close().catch(()=>{});
  await ctx.close().catch(()=>{});
}
main().catch(e=>{ console.error("Login error: "+e.message); process.exit(1); });
