const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createHarborlineStorage, desktopStorageFiles } = require("./storage.cjs");
const {
  calibratedFluidCalibrationFromProfile,
  validExperimentalFluidGrid,
  validFluidTier,
} = require("./fluid-calibration.cjs");

const appRoot = path.resolve(__dirname, "..");
const distRootUrl = pathToFileURL(path.join(appRoot, "dist") + path.sep).href;
const appIconPath = path.join(appRoot, "dist", "app-icon.svg");
const devServerUrl = process.env.HARBORLINE_DEV_SERVER_URL;
const requestedFluidTier = process.env.OCEAN_LAB_FLUID_TIER;
const envCalibratedFluidTier = process.env.OCEAN_LAB_CALIBRATED_FLUID_TIER;
const envExperimentalFluidGrid = validExperimentalFluidGrid(process.env.OCEAN_LAB_EXPERIMENTAL_FLUID_GRID);
let storage;
let mainWindow = null;
let isQuitting = false;
let pendingWindowRequest = false;
const gotSingleInstanceLock = app.requestSingleInstanceLock();

app.setName("Ocean Impact Lab");
if (process.platform === "darwin") app.setActivationPolicy("regular");
if (process.env.HARBORLINE_USER_DATA_DIR) app.setPath("userData", process.env.HARBORLINE_USER_DATA_DIR);
if (process.platform === "win32") app.setAppUserModelId("com.harborline.game");
if (!gotSingleInstanceLock) app.quit();

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
  pendingWindowRequest = false;
  if (mainWindow && !mainWindow.isDestroyed()) {
    revealMainWindow(mainWindow);
    return mainWindow;
  }

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
  mainWindow = window;

  const revealWindow = () => revealMainWindow(window);
  const revealFallbacks = [150, 600, 1200, 2400, 4000].map((delayMs) => {
    const timeout = setTimeout(revealWindow, delayMs);
    return timeout;
  });
  window.once("closed", () => {
    for (const timeout of revealFallbacks) clearTimeout(timeout);
    if (mainWindow === window) mainWindow = null;
  });
  window.once("ready-to-show", revealWindow);
  window.webContents.once("did-finish-load", revealWindow);
  window.webContents.once("did-fail-load", revealWindow);
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (!isTrustedRendererUrl(url)) event.preventDefault();
  });
  revealWindow();

  if (devServerUrl) {
    const url = new URL(devServerUrl);
    appendFluidTierQuery(url.searchParams, await fluidTierQueryObject());
    await window.loadURL(url.toString());
    revealWindow();
    return window;
  }

  const fluidTierQuery = await fluidTierQueryObject();
  await window.loadFile(path.join(appRoot, "dist", "index.html"), Object.keys(fluidTierQuery).length > 0 ? { query: fluidTierQuery } : undefined);
  revealWindow();
  return window;
}

function revealMainWindow(window) {
  if (window.isDestroyed()) return;
  if (process.platform === "darwin") app.setActivationPolicy("regular");
  if (window.isMinimized()) window.restore();
  window.center();
  if (!window.isVisible()) window.show();
  window.setSkipTaskbar(false);
  window.moveTop();
  app.focus({ steal: true });
  window.focus();
}

function requestMainWindow() {
  if (!gotSingleInstanceLock || isQuitting) return;
  if (!app.isReady()) {
    pendingWindowRequest = true;
    return;
  }
  void createMainWindow();
}

function appendFluidTierQuery(searchParams, query) {
  if (query.fluidTier) searchParams.set("fluidTier", query.fluidTier);
  if (query.calibratedFluidTier) searchParams.set("calibratedFluidTier", query.calibratedFluidTier);
  if (query.calibratedFluidFingerprint) searchParams.set("calibratedFluidFingerprint", query.calibratedFluidFingerprint);
  if (query.experimentalFluidGrid) searchParams.set("experimentalFluidGrid", query.experimentalFluidGrid);
}

async function fluidTierQueryObject() {
  const storedCalibration = await calibratedFluidCalibrationFromStorage();
  const envTier = validFluidTier(envCalibratedFluidTier);
  const calibratedFluidTier = envTier ?? storedCalibration?.tier;
  const experimentalFluidGrid = envExperimentalFluidGrid ?? storedCalibration?.runtimeGrid;
  const fluidTier = requestedFluidTier || (!requestedFluidTier && calibratedFluidTier ? "auto" : undefined);
  return {
    ...(fluidTier ? { fluidTier } : {}),
    ...(calibratedFluidTier ? { calibratedFluidTier } : {}),
    ...(!envTier && storedCalibration?.fingerprint ? { calibratedFluidFingerprint: storedCalibration.fingerprint } : {}),
    ...(experimentalFluidGrid ? { experimentalFluidGrid } : {}),
  };
}

async function calibratedFluidCalibrationFromStorage() {
  if (!storage) return undefined;
  try {
    const raw = await storage.readText(desktopStorageFiles.fluidCalibrationProfile);
    if (!raw) return undefined;
    const profile = JSON.parse(raw);
    return calibratedFluidCalibrationFromProfile(profile, app.getVersion());
  } catch {
    return undefined;
  }
}

if (gotSingleInstanceLock) {
  app.on("second-instance", requestMainWindow);
  app.on("open-file", (event) => {
    event.preventDefault();
    requestMainWindow();
  });
  app.on("open-url", (event) => {
    event.preventDefault();
    requestMainWindow();
  });

  app.whenReady().then(async () => {
    app.setAppLogsPath(path.join(app.getPath("userData"), "logs"));
    storage = createHarborlineStorage({ app });
    Menu.setApplicationMenu(null);
    installStorageHandlers();
    await createMainWindow();
    if (pendingWindowRequest || BrowserWindow.getAllWindows().length === 0) await createMainWindow();

    app.on("activate", requestMainWindow);
  });

  app.on("before-quit", () => {
    isQuitting = true;
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
