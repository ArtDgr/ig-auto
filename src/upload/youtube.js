import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { google } from "googleapis";

const execAsync = promisify(exec);
const TOKEN_FILE = "credentials/token.json";
const SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube"];

function getClient(redirectUri) {
  let id, secret;
  try {
    const o = JSON.parse(fs.readFileSync("credentials/google_oauth.json", "utf8"));
    const installed = o.installed || o.web;
    id = installed.client_id;
    secret = installed.client_secret;
  } catch {
    throw new Error(
      "Missing credentials/google_oauth.json. Create a Google Cloud project, enable YouTube Data API v3, " +
      "make an OAuth client, download its JSON into credentials/google_oauth.json."
    );
  }
  return new google.auth.OAuth2(id, secret, redirectUri);
}

async function openBrowser(url) {
  if (process.platform === "win32") {
    try { await execAsync(`start "" "${url}"`); } catch { /* noop */ }
  } else if (process.platform === "darwin") {
    try { await execAsync(`open "${url}"`); } catch { /* noop */ }
  } else {
    try { await execAsync(`xdg-open "${url}"`); } catch { /* noop */ }
  }
}

export async function authenticate() {
  fs.mkdirSync("credentials", { recursive: true });
  const port = 21_237;
  const redirectUri = `http://127.0.0.1:${port}/`;

  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, redirectUri);
      if (u.pathname !== "/") { req.resume(); return; }
      const code = u.searchParams.get("code");
      const err = u.searchParams.get("error");
      if (err) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Authorization failed: " + err + "\nClose this tab.");
        server.close();
        reject(new Error("Authorization failed: " + err));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<h3>FacelessStudio authorized.</h3><p>You can close this tab and return to the terminal.</p>"
      );
      server.close();
      resolve(code);
    });
    server.on("error", reject);
    server.listen(port, "127.0.0.1");
  });

  const auth = getClient(redirectUri);
  const url = auth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    redirect_uri: redirectUri
  });
  console.log("\nOpening your browser for YouTube authorization...");
  console.log("If it does not open, paste this URL manually: " + url);
  await openBrowser(url);

  const { tokens } = await auth.getToken(code);
  auth.setCredentials(tokens);
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
  console.log("\nAuthenticated. Token saved to " + TOKEN_FILE);
}

function loadAuth() {
  const auth = getClient();
  auth.setCredentials(JSON.parse(fs.readFileSync(TOKEN_FILE, "utf8")));
  return auth;
}

export async function uploadOne(filePath, metadata) {
  const auth = loadAuth();
  const yt = google.youtube({ version: "v3", auth });
  const res = await yt.videos.insert({
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: "28"
      },
      status: {
        privacyStatus: "private",
        selfDeclaredMadeForKids: false
      }
    },
    media: { body: fs.createReadStream(filePath) }
  });
  return res.data;
}

export async function uploadAll(dir) {
  if (!fs.existsSync(TOKEN_FILE)) {
    console.log("Not authenticated yet. Run: npm run authenticate");
    return;
  }
  if (!fs.existsSync(dir)) { console.log("No output directory yet: " + dir); return; }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mp4"));
  if (!files.length) { console.log("No videos in " + dir); return; }
  for (const f of files) {
    console.log("Uploading " + f + " ...");
    const ts = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 16);
    const meta = {
      title: f.replace(/\.mp4$/, "").replace(/-/g, " "),
      description: "Automated TechBrief short. #shorts #tech",
      tags: ["tech", "shorts", "ai", "science"]
    };
    try {
      const data = await uploadOne(path.join(dir, f), meta);
      console.log("  uploaded: youtube.com/watch?v=" + data.id + " (private, id=" + ts + ")");
    } catch (e) {
      console.error("  FAILED " + f + ": " + (e.errors?.[0]?.message || e.message));
    }
  }
}

if (process.argv[2] === "auth") authenticate();
if (process.argv[2] === "upload") uploadAll("out/youtube-upload");

export default { authenticate, uploadAll, uploadOne };