// Thin wrapper around src/toast.ps1 so Node can raise a Windows toast.
// Never throws or blocks: notifications are best-effort.
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TOAST_PS = path.join(path.dirname(fileURLToPath(import.meta.url)), "toast.ps1");

export function notify({ title = "Faceless Studio", message = "" } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    try {
      const child = spawn(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", TOAST_PS, "-Title", String(title), "-Message", String(message)],
        { windowsHide: true, stdio: "ignore" }
      );
      child.on("exit", done);
      child.on("error", done);
      setTimeout(done, 6000);
    } catch {
      done();
    }
  });
}

export default { notify };