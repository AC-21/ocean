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
const experimentalFluidGrid = validExperimentalFluidGrid(process.env.OCEAN_LAB_EXPERIMENTAL_FLUID_GRID);
let storage;
let mainWindow = null;
let isQuitting = false;

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
    show: true,
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

  const revealWindow = createMainWindowRevealer(window);
  const revealFallback = setTimeout(revealWindow, 1200);
  revealFallback.unref?.();
  window.on("close", (event) => {
    if (process.platform !== "darwin" || isQuitting) return;
    event.preventDefault();
    window.hide();
  });
  window.once("closed", () => {
    clearTimeout(revealFallback);
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

function createMainWindowRevealer(window) {
  let revealed = false;
  return () => {
    if (revealed || window.isDestroyed()) return;
    revealed = true;
    revealMainWindow(window);
  };
}

function revealMainWindow(window) {
  if (window.isDestroyed()) return;
  if (window.isMinimized()) window.restore();
  if (!window.isVisible()) window.show();
  window.focus();
  app.focus({ steal: true });
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
    if (calibrationProfileFailures(profile, app.getVersion()).length > 0) return undefined;
    const tier = validFluidTier(profile?.selectedTier);
    return tier ? { fingerprint: profile.capability.fingerprint, tier } : undefined;
  } catch {
    return undefined;
  }
}

function calibrationProfileFailures(profile, expectedAppVersion) {
  const selectedTier = validFluidTier(profile?.selectedTier);
  const capability = profile?.capability;
  return [
    ...(profile?.schema === "ocean-fluid-calibration-profile-v1" ? [] : ["profile schema was invalid"]),
    ...(profile?.pass === true ? [] : ["profile did not pass"]),
    ...(profile?.sourceGate === "G-FG-23" ? [] : ["profile source gate was invalid"]),
    ...(profile?.source?.adaptiveGate === "G-FG-23" ? [] : ["profile adaptive source gate was invalid"]),
    ...(typeof profile?.source?.adaptiveGeneratedAt === "string" && profile.source.adaptiveGeneratedAt.length > 0 ? [] : ["profile adaptive source timestamp was missing"]),
    ...(profile?.source?.selectedTier === profile?.selectedTier ? [] : ["profile source tier did not match selected tier"]),
    ...(selectedTier ? [] : ["profile selected tier was invalid"]),
    ...(profile?.appVersion === expectedAppVersion ? [] : ["profile app version did not match runtime"]),
    ...(capability?.sourceGate === "G-FG-01" ? [] : ["profile capability source gate was invalid"]),
    ...(capability?.status === "webgpu-ready" ? [] : ["profile capability status was invalid"]),
    ...(capability?.backend === "webgpu-compute" ? [] : ["profile capability backend was invalid"]),
    ...(typeof capability?.adapterInfo === "string" && capability.adapterInfo.length > 0 ? [] : ["profile capability adapter was missing"]),
    ...(Array.isArray(capability?.features) && capability.features.length > 0 ? [] : ["profile capability features were missing"]),
    ...(capability?.limits?.maxStorageBufferBindingSize !== undefined && capability.limits.maxStorageBufferBindingSize !== null
      ? []
      : ["profile capability storage limit was missing"]),
    ...(capability?.fingerprint === capabilityFingerprint(capability) ? [] : ["profile capability fingerprint did not match provenance"]),
  ];
}

function validFluidTier(value) {
  return value === "low" || value === "standard" || value === "high" || value === "ultra" ? value : undefined;
}

function validExperimentalFluidGrid(value) {
  return value === "1024x576" || value === "1280x720" ? value : undefined;
}

function capabilityFingerprint(capability) {
  if (!capability) return undefined;
  const limitKeys = [
    "maxBufferSize",
    "maxComputeInvocationsPerWorkgroup",
    "maxComputeWorkgroupSizeX",
    "maxComputeWorkgroupSizeY",
    "maxComputeWorkgroupsPerDimension",
    "maxStorageBufferBindingSize",
  ];
  const features = Array.from(new Set(Array.isArray(capability.features) ? capability.features.filter((value) => typeof value === "string" && value.length > 0) : [])).sort().join(",");
  const limits = limitKeys.map((key) => `${key}:${capability.limits?.[key] ?? "null"}`).join(",");
  return [`adapter:${capability.adapterInfo ?? ""}`, `backend:${capability.backend}`, `features:${features}`, `limits:${limits}`, `status:${capability.status}`].join("|");
}

app.whenReady().then(async () => {
  app.setAppLogsPath(path.join(app.getPath("userData"), "logs"));
  storage = createHarborlineStorage({ app });
  Menu.setApplicationMenu(null);
  installStorageHandlers();
  await createMainWindow();

  app.on("activate", () => {
    void createMainWindow();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
