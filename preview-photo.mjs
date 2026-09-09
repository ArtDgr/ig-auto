import { chromium } from "playwright";
const imgs = {
  battery: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=1080&h=1350&fit=crop",
  hardware: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=1080&h=1350&fit=crop",
  security: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1080&h=1350&fit=crop",
  ai: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1080&h=1350&fit=crop",
};
const samples = [
  { id:"photo-battery", img: imgs.battery, kicker:"IT GURU SECRETS", title:"HOW TO TELL IF YOUR BATTERY IS REALLY DYING", niche:"Smartphones & Gadgets", accent:"#16A34A" },
  { id:"photo-hardware", img: imgs.hardware, kicker:"BENCHMARK", title:"RTX 5070 BENCHMARKED", niche:"Laptops & PC Hardware", accent:"#0D9488" },
  { id:"photo-security", img: imgs.security, kicker:"RED FLAG", title:"RANSOMWARE HITS HOSPITALS", niche:"Cybersecurity", accent:"#FF3B30" },
  { id:"photo-ai", img: imgs.ai, kicker:"FRONTIER AI", title:"AI AGENTS ARE HERE", niche:"Frontier AI", accent:"#7C3AED" },
];
const browser = await chromium.launch();
const ctx = await browser.newContext({viewport:{width:1080,height:1350}});
const page = await ctx.newPage();
for(const s of samples){
  const html=`<!doctype html><html><head><meta charset="utf-8"/><style>
*{box-sizing:border-box;margin:0;padding:0} html,body{width:1080px;height:1350px;overflow:hidden}
body{font-family:"Bahnschrift","Arial Narrow",Arial,sans-serif;color:#fff;position:relative;display:flex;flex-direction:column;padding:46px 54px 42px;border:26px solid ${s.accent};}
.bg{position:absolute;inset:0;background: url('${s.img}') center/cover no-repeat; filter: brightness(0.55) saturate(1.1);}
.overlay{position:absolute;inset:0;background: linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.72) 100%);}
.top,.stage,.bottom{position:relative;z-index:1}
.top{display:flex;justify-content:space-between;font-size:30px;letter-spacing:3px;color:#E2E8F0;text-shadow:0 2px 12px rgba(0,0,0,0.8)}
.kicker{font-size:30px;letter-spacing:8px;color:${s.accent};font-weight:900;margin-bottom:26px;text-shadow:0 2px 10px rgba(0,0,0,0.9)}
h1{font-size:86px;line-height:1.04;font-weight:900;letter-spacing:-1px;text-transform:uppercase;text-shadow:0 4px 20px rgba(0,0,0,0.9)}
.stage{flex:1;display:flex;align-items:center;justify-content:center;padding:30px 8px 20px}
.bottom{display:flex;justify-content:space-between;font-size:26px;color:#E2E8F0;margin-top:auto;text-shadow:0 2px 8px rgba(0,0,0,0.9)}
</style></head><body>
<div class="bg"></div><div class="overlay"></div>
<div class="top"><div>THE IT SUPPORT GURU</div><div>@theitsupportguru</div></div>
<div class="stage"><div><div class="kicker">${s.kicker}</div><h1>${s.title}</h1><div style="width:140px;height:12px;background:${s.accent};margin-top:44px;box-shadow:0 4px 12px rgba(0,0,0,0.5)"></div></div></div>
<div class="bottom"><div>${s.niche} • daily tech fixes</div><div>1 / 3</div></div>
</body></html>`;
  await page.setContent(html,{waitUntil:"load"});
  await page.waitForTimeout(800);
  await page.screenshot({path:`out/preview-${s.id}.png`, clip:{x:0,y:0,width:1080,height:1350}});
  console.log(`photo ${s.id}`);
}
await browser.close();
