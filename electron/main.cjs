const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createHarborlineStorage } = require("./storage.cjs");

const appRoot = path.resolve(__dirname, "..");
const distRootUrl = pathToFileURL(path.join(appRoot, "dist") + path.sep).href;
const appIconPath = path.join(appRoot, "dist", "app-icon.svg");
const devServerUrl = process.env.HARBORLINE_DEV_SERVER_URL;
const requestedFluidTier = process.env.OCEAN_LAB_FLUID_TIER;
const calibratedFluidTier = process.env.OCEAN_LAB_CALIBRATED_FLUID_TIER;
let storage;

app.setName("Ocean Impact Lab");
if (process.env.HARBORLINE_USER_DATA_DIR) app.setPath("userData", process.env.HARBORLINE_USER_DATA_DIR);
if (process.platform === "win32") app.setAppUserModelId("com.harborline.game");

function installStorageHandlers() {
  const handlers = {
    appendLog: (_event, fileName, line) => storage.appendLog(fileName, line),
    info: () => storage.info(),
    readText: (_event, fileName) => storage.readText(fileName),
    remove: (_event, fileName) => storage.remove(fileName),
    writeText: (_event, fileName, value) => storage.writeText(fileName, value),
  };

  for (const [name, handler] of Object.entries(handlers)) {
    ipcMain.handle(`harborline:storage:${name}`, (event, ...args) => {
      assertTrustedRenderer(event);
      return handler(event, ...args);
    });
  }
}

function assertTrustedRenderer(event) {
  const url = event.senderFrame?.url ?? "";
  if (isTrustedRendererUrl(url)) return;
  throw new Error(`Blocked Harborline desktop bridge call from ${url || "unknown renderer"}.`);
}

function isTrustedRendererUrl(url) {
  if (url.startsWith(distRootUrl)) return true;
  if (devServerUrl && url.startsWith(devServerUrl)) return true;
  return false;
}

async function createMainWindow() {
  const window = new BrowserWindow({
    backgroundColor: "#dce8e4",
    height: 900,
    minHeight: 720,
    minWidth: 1040,
    icon: appIconPath,
    show: false,
    title: "Ocean Impact Lab",
    webPreferences: {
      contextIsolation: true,
      devTools: !app.isPackaged || process.env.HARBORLINE_DEVTOOLS === "1",
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: true,
    },
    width: 1360,
  });

  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedRendererUrl(url)) event.preventDefault();
  });

  if (devServerUrl) {
    const url = new URL(devServerUrl);
    appendFluidTierQuery(url.searchParams);
    await window.loadURL(url.toString());
    return;
  }

  const fluidTierQuery = fluidTierQueryObject();
  await window.loadFile(path.join(appRoot, "dist", "index.html"), Object.keys(fluidTierQuery).length > 0 ? { query: fluidTierQuery } : undefined);
}

function appendFluidTierQuery(searchParams) {
  if (requestedFluidTier) searchParams.set("fluidTier", requestedFluidTier);
  if (calibratedFluidTier) searchParams.set("calibratedFluidTier", calibratedFluidTier);
}

function fluidTierQueryObject() {
  return {
    ...(requestedFluidTier ? { fluidTier: requestedFluidTier } : {}),
    ...(calibratedFluidTier ? { calibratedFluidTier } : {}),
  };
}

app.whenReady().then(async () => {
  app.setAppLogsPath(path.join(app.getPath("userData"), "logs"));
  storage = createHarborlineStorage({ app });
  Menu.setApplicationMenu(null);
  installStorageHandlers();
  await createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
