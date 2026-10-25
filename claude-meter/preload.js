const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("api", {
  onData: (cb) => ipcRenderer.on("data", (_e, d) => cb(d)),
  data: () => ipcRenderer.invoke("data"),
  resize: (w, h) => ipcRenderer.send("resize", { w, h }),
  quit: () => ipcRenderer.send("quit"),
  login: () => ipcRenderer.send("login"),
  openLink: (url) => ipcRenderer.send("open-link", url),
  dragStart: () => ipcRenderer.send("drag-start"),
  dragMove: (dx, dy) => ipcRenderer.send("drag-move", { dx, dy }),
  dragEnd: () => ipcRenderer.send("drag-end"),
});
