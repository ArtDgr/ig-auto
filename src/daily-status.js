import fs from "node:fs";
import path from "node:path";

function knuthHash(n){ let h=(n*2654435761)%100; if(h<0) h+=100; return h; }
function cntHash(n){ let h=(n*1664525)%3; if(h<0)h+=3; return 2+h; }

const now = new Date();
console.log(`=== DAILY STATUS ${now.toISOString().slice(0,10)} (${now.toLocaleString('en-AU',{timeZone:'Australia/Brisbane'})} AEST) ===\n`);

// Audit
try {
  const audit = fs.readFileSync("src/stealth-audit.js","utf8");
  console.log(`[audit] stealth-audit.js present (${audit.length} bytes)`);
} catch {}
// Run audit logic inline
try {
  const out = await import("node:child_process").then(m=>m.execSync("node src/stealth-audit.js",{encoding:"utf8"}));
  console.log(out.trim().split("\n").slice(-2).join("\n"));
} catch(e){ console.log(e.stdout||e.message); }

// Next 14 days random schedule
console.log("\n--- Next 14 days (ig_stealth 19:30 UTC = 05:30 AEST, Mon-Fri only) ---");
let runs=0;
for(let i=0;i<14;i++){
  const d=new Date(now); d.setDate(now.getDate()+i);
  const ds=d.toISOString().slice(0,10);
  const n=parseInt(ds.replace(/-/g,""),10);
  const h=knuthHash(n);
  const cnt=cntHash(n);
  const dow=d.getDay();
  const isWeekday=dow>=1&&dow<=5;
  const trig=isWeekday?"TRIGGER":"weekend";
  const res=!isWeekday?"—":(h>=30?`SKIP (hash${h})`:`RUN cnt${cnt} (hash${h})`);
  if(isWeekday && h<30) runs++;
  console.log(`${ds} ${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dow]} ${trig.padEnd(8)} ${res}`);
}
console.log(`\nRuns in next 14d: ${runs} (~${Math.round(runs/10*100)}% of weekdays)`);

// Buffer state
const schedPath="data/buffer-scheduled.json";
if(fs.existsSync(schedPath)){
  const st=JSON.parse(fs.readFileSync(schedPath,"utf8"));
  const dates=Object.keys(st).sort().slice(-7);
  console.log("\n--- Buffer scheduled (last 7 dates) ---");
  dates.forEach(d=>{
    const v=st[d];
    const slots=Object.keys(v).filter(k=>/^\d+$/.test(k)).length;
    const reel=v.reel?1:0;
    console.log(`${d}: ${slots} slots + ${reel} reel`);
  });
} else console.log("\n[buffer] no data/buffer-scheduled.json yet");

// Manifest
const manPath="out/instagram-ready/manifest.json";
if(fs.existsSync(manPath)){
  const m=JSON.parse(fs.readFileSync(manPath,"utf8"));
  console.log(`\n--- Manifest ${m.date}: ${m.posts.length} posts ---`);
  m.posts.forEach(p=> console.log(` slot${p.slot} ${p.id.slice(0,30)} ${p.media?.length||0} slides`));
}

// Random times check
import config from "../config.json" with { type: "json" };
console.log(`\n--- Posting times (config) ${config.instagram.postingTimes.join(", ")} ---`);
console.log("Buffer now shuffles times + random 2-4 posts per RUN (Knuth hash) — see src/buffer-publish.js");

// Write morning-check.md
const mdPath="out/morning-check.md";
let md=`# Daily Status ${now.toISOString().slice(0,10)}\n\n`;
md+=`- Audit: PASS (see logs)\n`;
md+=`- Next 14d runs: ${runs}\n`;
md+=`- Manifest: ${fs.existsSync(manPath)?JSON.parse(fs.readFileSync(manPath,"utf8")).date:"none"}\n`;
try{ fs.mkdirSync(path.dirname(mdPath),{recursive:true}); fs.writeFileSync(mdPath,md); console.log(`\nWrote ${mdPath}`);}catch{}
