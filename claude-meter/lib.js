// Shared by the CLI and the app: find the Claude Code login on this machine and ask Anthropic for its usage limits.
// Read only: the access token is used for one request to api.anthropic.com, never stored or logged, and the refresh
// token is never touched (using it could log Claude Code out).
const fs = require("fs"), os = require("os"), path = require("path"), https = require("https");
const { execFile, spawn } = require("child_process");

const HOME = os.homedir();
const CONFIG = process.env.CLAUDE_CONFIG_DIR || path.join(HOME, ".claude");
const DIR = path.join(HOME, ".claude-meter");          // pid file, log
const PID = path.join(DIR, "pid");
const fail = (code, msg) => Object.assign(new Error(msg), { code });
const NEEDS_LOGIN = new Set(["none", "expired", "rejected", "unreadable"]);   // errors a new login fixes

function parseCreds(raw, source) {
  let o; try { o = JSON.parse(raw).claudeAiOauth; } catch {}
  if (!o || !o.accessToken) throw fail("unreadable", "could not read the Claude Code login");
  if (o.expiresAt && o.expiresAt < Date.now()) throw fail("expired", "login token expired (it refreshes when Claude Code runs)");
  return { token: o.accessToken, plan: o.subscriptionType, source };
}

function readFileCreds() {   // Windows and Linux (and macOS when Claude Code keeps no Keychain item)
  const f = path.join(CONFIG, ".credentials.json");
  let raw; try { raw = fs.readFileSync(f, "utf8"); } catch { throw fail("none", "no Claude Code login found"); }
  return parseCreds(raw, f);
}

function getCreds() {
  if (process.platform !== "darwin") return Promise.resolve().then(readFileCreds);
  return new Promise((resolve, reject) => {
    execFile("/usr/bin/security", ["find-generic-password", "-s", "Claude Code-credentials", "-w"], { timeout: 20000 }, (err, out) => {
      try {
        if (err && err.killed) throw fail("keychain", "waiting for Keychain access (click Always Allow)");
        resolve(err ? readFileCreds() : parseCreds(out, "macOS Keychain"));
      } catch (e) { reject(e); }
    });
  });
}

function parseUsage(body, creds) {
  const j = JSON.parse(body);
  const win = (w) => (w && w.utilization != null ? { used_percentage: w.utilization, resets_at: Date.parse(w.resets_at) / 1000 } : null);
  return { t: Date.now() / 1000, plan: creds.plan, source: creds.source, rate_limits: { five_hour: win(j.five_hour), seven_day: win(j.seven_day) } };
}

function getUsage() {
  return getCreds().then((c) => new Promise((resolve, reject) => {
    const req = https.get({ host: "api.anthropic.com", path: "/api/oauth/usage", timeout: 15000,
      headers: { Authorization: "Bearer " + c.token, "anthropic-beta": "oauth-2025-04-20", "User-Agent": "claude-code/2.1" } },
      (res) => {
        let b = ""; res.on("data", (d) => (b += d));
        res.on("end", () => {
          if (res.statusCode === 401 || res.statusCode === 403) return reject(fail("rejected", "Anthropic rejected the login (HTTP " + res.statusCode + ")"));
          if (res.statusCode !== 200) return reject(fail("http", "usage request answered HTTP " + res.statusCode));
          try { resolve(parseUsage(b, c)); } catch { reject(fail("http", "unreadable usage answer")); }
        });
      });
    req.on("error", (e) => reject(fail("network", e.message)));
    req.on("timeout", () => req.destroy(new Error("timeout")));
  }));
}

function claudeBin() {   // the `claude` CLI: PATH first, then the usual install spots (a login item has a short PATH)
  const win = process.platform === "win32", names = win ? ["claude.exe", "claude.cmd"] : ["claude"];
  const dirs = [...(process.env.PATH || "").split(path.delimiter), path.join(HOME, ".local", "bin"), path.join(HOME, ".claude", "local"),
    "/opt/homebrew/bin", "/usr/local/bin", path.join(process.env.APPDATA || "", "npm"), path.join(process.env.LOCALAPPDATA || "", "Programs", "claude")];
  for (const d of dirs) for (const n of names) { const f = path.join(d, n); if (d && fs.existsSync(f)) return f; }
  return null;
}

function login({ inherit } = {}) {   // `claude auth login`: opens the browser and waits for the sign-in
  const bin = claudeBin();
  if (!bin) throw fail("noclaude", "Claude Code CLI not found (install it: npm i -g @anthropic-ai/claude-code)");
  const win = process.platform === "win32";
  return spawn(win ? `"${bin}"` : bin, ["auth", "login"], { stdio: inherit ? "inherit" : "ignore", shell: win, windowsHide: true });
}

module.exports = { DIR, PID, NEEDS_LOGIN, getCreds, getUsage, parseCreds, parseUsage, claudeBin, login };
