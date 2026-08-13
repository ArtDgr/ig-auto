import fs from "node:fs";
import config from "../config.json" with { type: "json" };
import { launchStealth } from "./stealth.js";

const file = process.argv[2];
const list = JSON.parse(fs.readFileSync(file, "utf8"));
const pw = list.map((c) => ({
  name: c.name,
  value: c.value,
  domain: (c.domain || "").replace(/^\./, ""),
  path: c.path || "/",
  expires: c.expirationDate ? Math.floor(c.expirationDate) : -1,
  httpOnly: !!c.httpOnly,
  secure: !!c.secure,
  sameSite: { strict: "Strict", lax: "Lax" }[String(c.sameSite).toLowerCase()] || "None"
}));
const context = await launchStealth(config, { profileDir: config.tiktokBot.profileDir, headless: true });
try {
  await context.addCookies(pw);
  const cks = await context.cookies();
  const have = new Set(cks.map((c) => c.name + "|" + c.domain));
  const missing = pw.filter((c) => !have.has(c.name + "|" + c.domain));
  console.log("MISSING", missing.length, "of", pw.length, ":");
  missing.forEach((c) => console.log("  ", c.name, "@", c.domain, "httpOnly=" + c.httpOnly, "secure=" + c.secure, "sameSite=" + c.sameSite, "expires=" + c.expires));
  const sess = cks.filter((c) => ["sessionid", "sessionid_ss", "sid_tt", "uid_tt"].includes(c.name));
  console.log("session cookies in context:", sess.length);
} finally {
  await context.close().catch(() => {});
  process.exit(0);
}