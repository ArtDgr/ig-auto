// Keeps the X session alive without a human.
// Runs Mon-Fri 05:10 (before first slot): checks persistent profile, tries auto-login from credentials/x.json
import { ensureSession } from "./x-bot.js";
const r=await ensureSession();
console.log("[x-session-check] "+(r.ok?"OK session valid":"FAIL "+(r.reason||"unknown")));
process.exitCode=r.ok?0:1;
