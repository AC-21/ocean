const { app, BrowserWindow, Menu, ipcMain, shell } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createHarborlineStorage, desktopStorageFiles } = require("./storage.cjs");

const appRoot = path.resolve(__dirname, "..");
const distRootUrl = pathToFileURL(path.join(appRoot, "dist") + path.sep).href;
const appIconPath = path.join(appRoot, "dist", "app-icon.svg");
const devServerUrl = process.env.HARBORLINE_DEV_SERVER_URL;
const requestedFluidTier = process.env.OCEAN_LAB_FLUID_TIER;
const envCalibratedFluidTier = process.env.OCEAN_LAB_CALIBRATED_FLUID_TIER;
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
    appendFluidTierQuery(url.searchParams, await fluidTierQueryObject());
    await window.loadURL(url.toString());
    return;
  }

  const fluidTierQuery = await fluidTierQueryObject();
  await window.loadFile(path.join(appRoot, "dist", "index.html"), Object.keys(fluidTierQuery).length > 0 ? { query: fluidTierQuery } : undefined);
}

function appendFluidTierQuery(searchParams, query) {
  if (query.fluidTier) searchParams.set("fluidTier", query.fluidTier);
  if (query.calibratedFluidTier) searchParams.set("calibratedFluidTier", query.calibratedFluidTier);
}

async function fluidTierQueryObject() {
  const storedCalibratedTier = await calibratedFluidTierFromStorage();
  const calibratedFluidTier = validFluidTier(envCalibratedFluidTier) ?? storedCalibratedTier;
  const fluidTier = requestedFluidTier || (!requestedFluidTier && calibratedFluidTier ? "auto" : undefined);
  return {
    ...(fluidTier ? { fluidTier } : {}),
    ...(calibratedFluidTier ? { calibratedFluidTier } : {}),
  };
}

async function calibratedFluidTierFromStorage() {
  if (!storage) return undefined;
  try {
    const raw = await storage.readText(desktopStorageFiles.fluidCalibrationProfile);
    if (!raw) return undefined;
    const profile = JSON.parse(raw);
    if (calibrationProfileFailures(profile, app.getVersion()).length > 0) return undefined;
    return validFluidTier(profile?.selectedTier);
  } catch {
    return undefined;
  }
}

function calibrationProfileFailures(profile, expectedAppVersion) {
  const selectedTier = validFluidTier(profile?.selectedTier);
  return [
    ...(profile?.schema === "ocean-fluid-calibration-profile-v1" ? [] : ["profile schema was invalid"]),
    ...(profile?.pass === true ? [] : ["profile did not pass"]),
    ...(profile?.sourceGate === "G-FG-23" ? [] : ["profile source gate was invalid"]),
    ...(profile?.source?.adaptiveGate === "G-FG-23" ? [] : ["profile adaptive source gate was invalid"]),
    ...(typeof profile?.source?.adaptiveGeneratedAt === "string" && profile.source.adaptiveGeneratedAt.length > 0 ? [] : ["profile adaptive source timestamp was missing"]),
    ...(profile?.source?.selectedTier === profile?.selectedTier ? [] : ["profile source tier did not match selected tier"]),
    ...(selectedTier ? [] : ["profile selected tier was invalid"]),
    ...(profile?.appVersion === expectedAppVersion ? [] : ["profile app version did not match runtime"]),
  ];
}

function validFluidTier(value) {
  return value === "low" || value === "standard" || value === "high" || value === "ultra" ? value : undefined;
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
