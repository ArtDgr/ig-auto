// Keeps the Instagram session alive without a human.
// Runs Mon-Fri 05:10 (before the 06:30 first slot, after Daily reloads):
//   - session is valid  -> exit 0 silently
//   - session expired   -> try automatic credential login (credentials/instagram.json)
//   - cannot re-login   -> exit 1 (post-runner will fail loudly with a clear reason)
import { ensureSession } from "./instagram-bot.js";

const r = await ensureSession();
console.log(
  "[session-check] " +
    (r.ok ? "OK session valid" : "FAIL " + (r.reason || "unknown"))
);
process.exitCode = r.ok ? 0 : 1;