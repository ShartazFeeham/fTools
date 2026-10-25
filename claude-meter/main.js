// Claude meter: a floating bubble (always on top, every desktop). Click it: 5-hour and weekly usage-limit used, with
// reset times. Numbers come straight from Anthropic's usage endpoint with the Claude Code login found on this machine
// (lib.js); no setup. Without a login the three numbers turn into a warning sign and a click starts `claude auth login`.
const { app, BrowserWindow, screen, ipcMain, dialog, shell } = require("electron");
const fs = require("fs");
const path = require("path");
const lib = require("./lib");

let win = null, quitting = false, api = null, loggingIn = false, timer = null;

// A fixed data folder (the package name has a slash, and a missing parent folder breaks the single-instance lock on a fresh machine).
app.setPath("userData", path.join(app.getPath("appData"), "claude-meter"));

function refresh() {   // every 60 s when it works, every 30 s while anything is wrong (so a fresh login shows up fast)
  return lib.getUsage().then((u) => { api = u; }, (e) => {
    // a login problem must not keep showing the previous account's numbers
    api = lib.NEEDS_LOGIN.has(e.code) ? { error: e.message, needLogin: true } : { ...(api && api.rate_limits ? api : {}), error: e.message };
  }).then(() => { clearTimeout(timer); timer = setTimeout(refresh, api.error ? 30000 : 60000); });
}
const currentData = () => (api || loggingIn ? { ...(api || {}), loggingIn } : null);

function startLogin() {
  if (loggingIn) return;
  let c;
  try { c = lib.login(); } catch (e) { api = { error: e.message, needLogin: true }; return; }
  loggingIn = true;
  const done = () => { if (loggingIn) { loggingIn = false; refresh(); } };
  c.on("exit", done); c.on("error", done);
  setTimeout(() => { try { c.kill(); } catch {} }, 300000);   // give up after 5 minutes
}

// Position: an anchor (right edge x, top edge y of the window). Draggable anywhere and remembered. Default: middle of
// the right edge, just below the centre line. The panel grows downward.
let POS, anchor = null, curSize = { w: 76, h: 66 }, snap = null;
function defaultAnchor() { const wa = screen.getPrimaryDisplay().workArea; return { r: wa.x + wa.width - 8, t: wa.y + Math.round(wa.height / 2) + 4 }; }
function loadAnchor() { try { const a = JSON.parse(fs.readFileSync(POS, "utf8")); if (Number.isFinite(a.r) && Number.isFinite(a.t)) return a; } catch {} return defaultAnchor(); }
function clampAnchor() {
  const d = screen.getDisplayNearestPoint({ x: Math.round(anchor.r - 10), y: Math.round(anchor.t + 10) }).workArea;
  anchor.r = Math.min(Math.max(anchor.r, d.x + curSize.w), d.x + d.width);
  anchor.t = Math.min(Math.max(anchor.t, d.y), d.y + d.height - curSize.h);
}
function place(w, h) {
  if (!anchor) anchor = loadAnchor();
  curSize = { w: Math.round(w), h: Math.round(h) }; clampAnchor();
  win.setBounds({ x: Math.round(anchor.r - curSize.w), y: Math.round(anchor.t), width: curSize.w, height: curSize.h });
}
ipcMain.on("drag-start", () => { if (anchor) snap = { ...anchor }; });
ipcMain.on("drag-move", (_e, { dx, dy }) => { if (!snap || !win) return; anchor = { r: snap.r + dx, t: snap.t + dy }; place(curSize.w, curSize.h); });
ipcMain.on("drag-end", () => { snap = null; try { fs.writeFileSync(POS, JSON.stringify(anchor)); } catch {} });

function createWindow() {
  win = new BrowserWindow({
    width: 76, height: 66, frame: false, transparent: true, backgroundColor: "#00000000", roundedCorners: false,
    alwaysOnTop: true, hasShadow: false, resizable: false, minimizable: false, maximizable: false,
    fullscreenable: false, skipTaskbar: true, title: "Claude meter",
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  win.setBackgroundColor("#00000000");
  win.setHasShadow(false);
  win.webContents.on("did-finish-load", () => win.webContents.insertCSS("html,body{background:rgba(0,0,0,0) !important}"));
  win.setAlwaysOnTop(true, "screen-saver");
  if (process.platform !== "win32") win.setVisibleOnAllWorkspaces(true);
  place(76, 66);
  win.loadFile(path.join(__dirname, "meter.html"));
}

function confirmQuit() {
  dialog.showMessageBox({
    type: "question", buttons: ["Cancel", "Close meter"], defaultId: 0, cancelId: 0,
    title: "Close the Claude meter?", message: "Close the Claude meter?",
    detail: "It starts again at your next login. To remove it for good, run: claude-meter down",
  }).then((r) => { if (r.response === 1) { quitting = true; app.quit(); } });
}

ipcMain.on("resize", (_e, { w, h }) => { if (win) place(w, h); });
ipcMain.on("quit", confirmQuit);
ipcMain.on("login", startLogin);
ipcMain.on("open-link", (_e, url) => { if (/^https:\/\/claude\.ai\//.test(url)) shell.openExternal(url); });   // only claude.ai links
ipcMain.handle("data", currentData);
app.on("before-quit", (e) => { if (!quitting) { e.preventDefault(); confirmQuit(); } });
process.on("SIGTERM", () => { quitting = true; app.quit(); });   // `claude-meter down`, launchctl bootout
app.on("window-all-closed", () => { quitting = true; app.quit(); });

if (!app.requestSingleInstanceLock()) app.exit(0);   // only one meter, even if started twice (exit, not quit: quit asks "close the meter?")
else {
  app.on("second-instance", () => { if (win) win.show(); });
  app.whenReady().then(() => {
    POS = path.join(app.getPath("userData"), "pos.json");
    try { fs.mkdirSync(lib.DIR, { recursive: true }); fs.writeFileSync(lib.PID, String(process.pid)); } catch {}   // lets `claude-meter status/down` find us
    process.on("exit", () => { try { if (fs.readFileSync(lib.PID, "utf8") === String(process.pid)) fs.rmSync(lib.PID); } catch {} });
    createWindow();
    refresh();
    setInterval(() => { if (win && !win.isDestroyed()) win.webContents.send("data", currentData()); }, 2000);
  });
}
