// QA gate for X posts — mirrors qa-check.js but for out/x-ready + 280-char limit
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import config from "../config.json" with { type: "json" };

const X = config.x || {};
const MANIFEST = path.join(X.postDir||"out/x-ready","manifest.json");
function todayLocal(){ const d=new Date(); return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10); }
const PLACEHOLDERS=["this is moving the whole field right now","what changed:","what to watch: the follow-on tests","follow-on tests, teardowns","launch hype","good morning","hope you had a great weekend","today i’m reading","today i'm reading","as a reminder","subscribe","unsubscribe"];

export function checkXManifest(){
  if(!fs.existsSync(MANIFEST)){
    console.log("[x-qa] FAIL — no manifest at "+MANIFEST+" (run X pipeline first)");
    return{ok:false,errors:["no manifest"]};
  }
  const m=JSON.parse(fs.readFileSync(MANIFEST,"utf8"));
  const today=todayLocal();
  const errors=[];
  if(m.date!==today) errors.push("manifest.date "+m.date+" != today "+today);
  for(const p of m.posts||[]){
    const where="["+p.slot+"] "+(p.id||p.title||"");
    if(p.id && fs.existsSync(path.join(X.postDir||"out/x-ready", p.id,".posted"))) continue;
    const texts=[p.title];
    if(p.caption) texts.push(p.caption);
    for(const s of p.slides||[]) texts.push(s.text);
    if(/&\w+;|&#\d+;/i.test(texts.join("\n"))) errors.push(where+" — lingering HTML entity in text");
    const all=texts.join(" ").toLowerCase();
    for(const ph of PLACEHOLDERS){ if(all.includes(ph)){ errors.push(where+" — placeholder/filler: \""+ph+"\""); break; } }
    if(p.id && /-\d+2?\d?-[\w-]/.test(p.id) && /&#|&[a-z]+;/.test(p.id)) errors.push(where+" — id carries escaped junk");
    if(p.caption && p.caption.length > (X.charLimit||280)) errors.push(where+" — caption "+p.caption.length+" chars exceeds "+(X.charLimit||280)+" (\""+p.caption.slice(0,40)+"…\")");
    if(!p.caption || !p.caption.trim()) errors.push(where+" — empty caption");
    const factLines=[];
    for(const s of p.slides||[]){ if(s.kind==="facts"||s.kind==="brief"){ for(const l of String(s.text||"").split("\n")){ const t=l.trim().replace(/^[•▸\-*]\s*/,"").toLowerCase(); if(t) factLines.push(t); }}}
    for(const s of p.slides||[]){
      if((s.kind==="body") && /TAKEAWAY|WHAT TO WATCH/i.test(s.text||"")){
        const n=String(s.text).replace(/^(THE TAKEAWAY|WHAT TO WATCH)\s*—\s*/i,"").trim().toLowerCase();
        if(n&&factLines.includes(n)) errors.push(where+" — "+s.text.split("—")[0].trim()+" duplicates a facts bullet");
      }
      if((s.kind==="body"||s.kind==="facts"||s.kind==="brief") && !String(s.text||"").trim()) errors.push(where+" — empty slide ("+s.kind+")");
    }
    if(p.kind==="news" && factLines.length<2) errors.push(where+" — news post has only "+factLines.length+" fact bullet(s)");
    // X images: up to 4 attachments; slides may be 3-5 but caption covers it; don't enforce media count here
  }
  return{ok:errors.length===0,errors,date:m.date,posts:(m.posts||[]).length};
}
if(process.argv[1] && pathToFileURL(process.argv[1]).href===import.meta.url){
  const r=checkXManifest();
  if(r.ok){ console.log("[x-qa] PASS "+r.date+" · "+r.posts+" pending X post(s), no defects."); process.exit(0); }
  console.log("[x-qa] FAIL — "+r.errors.length+" defect(s):");
  for(const e of r.errors) console.log("  • "+e);
  process.exit(1);
}
export default { checkXManifest };
