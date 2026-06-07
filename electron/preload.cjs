const { contextBridge, ipcRenderer } = require("electron");

const invokeStorage = (channel, ...args) => ipcRenderer.invoke(`harborline:storage:${channel}`, ...args);

contextBridge.exposeInMainWorld("harborlineDesktop", {
  storage: {
    appendLog: (fileName, line) => invokeStorage("appendLog", fileName, line),
    info: () => invokeStorage("info"),
    readText: (fileName) => invokeStorage("readText", fileName),
    remove: (fileName) => invokeStorage("remove", fileName),
    writeText: (fileName, value) => invokeStorage("writeText", fileName, value),
  },
});
