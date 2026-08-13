import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

const src = path.join(process.cwd(), "profiles", "tiktok", "cookies.sqlite");
const tmp = path.join(os.tmpdir(), "readcookies-" + Date.now() + ".sqlite");
fs.copyFileSync(src, tmp);
try {
  const out = execSync(`node -e "const {DatabaseSync}=require('node:sqlite');process.stdout.write('ok')"`, { encoding: "utf8" });
  console.log("node:sqlite available");
} catch {
  console.log("node:sqlite NOT available, falling back to python");
}
const py = `import sqlite3,sys
db=sqlite3.connect(r"${tmp}")
rows=db.execute("SELECT name,host,value FROM moz_cookies WHERE name IN ('sessionid','sessionid_ss','sid_tt','uid_tt') AND length(value)>4").fetchall()
print("session cookies:",len(rows))
for r in rows: print("  ",r[0],"@",r[1],"len",len(r[2]))
`;
try {
  execSync(`py -3 -c ${JSON.stringify(py)}`, { stdio: "inherit" });
} catch (e) { console.log("python read failed:", e.message); }
fs.rmSync(tmp, { force: true });