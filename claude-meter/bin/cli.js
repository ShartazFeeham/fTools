#!/usr/bin/env node
// claude-meter up | down | status | login
const fs = require("fs"), os = require("os"), path = require("path");
const { execFileSync, spawn } = require("child_process");
const lib = require("../lib");
const pkg = require("../package.json");

const APP = path.join(__dirname, "..");
const LABEL = "io.github.shartazfeeham.claude-meter";
const PLIST = path.join(os.homedir(), "Library", "LaunchAgents", LABEL + ".plist");
const RUN_KEY = "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";
const mac = process.platform === "darwin", win = process.platform === "win32";
const uid = process.getuid && process.getuid();

const die = (m) => { console.error("✗ " + m); process.exit(1); };
const sh = (cmd, args) => { try { return execFileSync(cmd, args, { stdio: ["ignore", "pipe", "ignore"], timeout: 15000 }).toString(); } catch { return null; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alive = (p) => { try { process.kill(p, 0); return true; } catch { return false; } };
const pid = () => { try { const p = +fs.readFileSync(lib.PID, "utf8"); return alive(p) ? p : 0; } catch { return 0; } };
const electron = () => { try { return require("electron"); } catch { return die("Electron is not installed. Reinstall: npm i -g github:ShartazFeeham/fTools"); } };

// "Starts at login": a LaunchAgent on macOS, a Run registry key on Windows. (No Linux autostart: `up` just starts it.)
async function autostart(on) {
  if (mac) {
    sh("launchctl", ["bootout", `gui/${uid}/${LABEL}`]);   // also stops a running meter, so launchd does not restart it
    if (!on) return fs.rmSync(PLIST, { force: true });
    fs.mkdirSync(path.dirname(PLIST), { recursive: true });
    fs.writeFileSync(PLIST, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key><array><string>${electron()}</string><string>${APP}</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>ProcessType</key><string>Interactive</string>
  <key>StandardOutPath</key><string>${path.join(lib.DIR, "meter.log")}</string>
  <key>StandardErrorPath</key><string>${path.join(lib.DIR, "meter.log")}</string>
</dict></plist>
`);
    fs.mkdirSync(lib.DIR, { recursive: true });
    for (let i = 0; i < 10 && sh("launchctl", ["bootstrap", `gui/${uid}`, PLIST]) === null; i++) await sleep(500);   // retry: right after a bootout it can still be busy; RunAtLoad starts it
  } else if (win) {
    if (on) sh("reg", ["add", RUN_KEY, "/v", "ClaudeMeter", "/t", "REG_SZ", "/d", `"${electron()}" "${APP}"`, "/f"]);
    else sh("reg", ["delete", RUN_KEY, "/v", "ClaudeMeter", "/f"]);
  }
}
const autostarts = () => (mac ? fs.existsSync(PLIST) && sh("launchctl", ["print", `gui/${uid}/${LABEL}`]) !== null : win ? sh("reg", ["query", RUN_KEY, "/v", "ClaudeMeter"]) !== null : false);

async function stop() {
  const p = pid();
  if (mac) await autostart(false);
  if (p) {
    if (win) sh("taskkill", ["/PID", String(p), "/T", "/F"]); else try { process.kill(p); } catch {}
    for (let i = 0; i < 20 && alive(p); i++) await sleep(250);   // wait until it is really gone, or a restart hits its single-instance lock
    if (alive(p) && !win) try { process.kill(p, "SIGKILL"); } catch {}
  }
  fs.rmSync(lib.PID, { force: true });
}

const dur = (s) => { const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60); return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`; };
const win_ = (n, w) => (w ? `${n} ${Math.round(w.used_percentage)}% used (resets in ${dur(w.resets_at - Date.now() / 1000)})` : `${n} no data`);

const commands = {
  async up() {
    const bin = electron();
    await stop();
    await autostart(true);
    if (!mac) spawn(bin, [APP], { detached: true, stdio: "ignore", windowsHide: true, env: { ...process.env, ELECTRON_RUN_AS_NODE: "" } }).unref();
    for (let i = 0; i < 40 && !pid(); i++) await sleep(250);
    if (!pid()) die("the meter did not start" + (mac ? ` (see ${path.join(lib.DIR, "meter.log")})` : ""));
    console.log("✓ Claude meter is up" + (mac || win ? " (and starts at login)." : "."));
  },
  async down() {
    await stop();
    console.log("✓ Claude meter is down" + (mac || win ? " (it will not start at login until you run: claude-meter up)." : "."));
  },
  login() {
    let c; try { c = lib.login({ inherit: true }); } catch (e) { die(e.message); }
    c.on("error", (e) => die(e.message));
    c.on("exit", (code) => { if (!code) console.log("The meter picks up the new login within about 30 seconds."); process.exit(code || 0); });
  },
  async status() {
    const ok = (m) => console.log("  ✓ " + m), no = (m) => console.log("  ✗ " + m), warn = (m) => console.log("  ⚠ " + m);
    console.log(`Claude meter ${pkg.version}\n\nIntegration`);
    const bin = lib.claudeBin();
    if (bin) { const v = sh(bin, ["--version"]); ok(`Claude Code CLI: ${v ? v.trim() : "found"} (${bin})`); } else no("Claude Code CLI not found (npm i -g @anthropic-ai/claude-code)");
    let u = null;
    try {
      const c = await lib.getCreds();
      ok(`login found in ${c.source}${c.plan ? ` (${c.plan} plan)` : ""}`);
      u = await lib.getUsage().catch((e) => { warn("usage request failed: " + e.message); return null; });
    } catch (e) {
      (e.code === "keychain" ? warn : no)(e.message + (lib.NEEDS_LOGIN.has(e.code) ? "  → run: claude-meter login" : ""));
    }
    if (u) { ok("Anthropic usage API reachable"); console.log("\nUsage\n  " + win_("5-hour limit:", u.rate_limits.five_hour) + "\n  " + win_("Weekly limit:", u.rate_limits.seven_day)); }
    else console.log("\nUsage\n  – unavailable");
    console.log("\nMeter app");
    const p = pid();
    p ? ok(`running (pid ${p}), refreshes every 60 s (30 s while in error)`) : no("not running → run: claude-meter up");
    mac || win ? (autostarts() ? ok("starts at login") : no("does not start at login")) : 0;
  },
  help() {
    console.log(`claude-meter ${pkg.version}: floating Claude usage meter (5-hour and weekly limits)

  claude-meter up       start the meter (restarts it if running) and start it at every login
  claude-meter down     stop it and remove it from login
  claude-meter status   usage numbers, Claude Code login check, meter state
  claude-meter login    sign in to Claude Code (claude auth login)

It finds your Claude Code login by itself; nothing to configure.`);
  },
};

const cmd = process.argv[2] || "help";
(commands[cmd] || (() => { commands.help(); process.exit(1); }))();
