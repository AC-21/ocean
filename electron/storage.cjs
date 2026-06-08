const fs = require("node:fs/promises");
const path = require("node:path");

const desktopStorageFiles = Object.freeze({
  best: "best.v2.json",
  backup: "save.backup.v2.json",
  fluidCalibrationProfile: "fluid-calibration.v1.json",
  playtestArtifact: "playtest.latest.md",
  playtestHistory: "playtest.history.v1.json",
  runtimeLog: "runtime.v1.ndjson",
  save: "save.v2.json",
  settings: "settings.v1.json",
});
const legacyDesktopSaveFiles = Object.freeze(["save.v1.json"]);
const allowedStorageFiles = new Set([...Object.values(desktopStorageFiles), ...legacyDesktopSaveFiles]);
const allowedLogFiles = new Set([desktopStorageFiles.runtimeLog]);
const defaultMaxLogBytes = 256 * 1024;

function createHarborlineStorage({
  app,
  fileSystem = fs,
  maxLogBytes = defaultMaxLogBytes,
  pathModule = path,
  storageDirectoryName = "harborline-game",
} = {}) {
  if (!app || typeof app.getPath !== "function") {
    throw new Error("Harborline storage requires an Electron app-like object with getPath().");
  }

  const userDataPath = app.getPath("userData");
  const basePath = pathModule.join(userDataPath, storageDirectoryName);
  const logsPath = resolveLogsPath(app, pathModule, userDataPath);

  return {
    appendLog: async (fileName, line) => {
      const filePath = resolveSafeFile(logsPath, fileName, allowedLogFiles, "log", pathModule);
      await fileSystem.mkdir(pathModule.dirname(filePath), { recursive: true });
      await rotateLogIfNeeded(fileSystem, filePath, maxLogBytes);
      await fileSystem.appendFile(filePath, String(line), "utf8");
    },
    basePath,
    info: async () => ({
      appName: typeof app.getName === "function" ? app.getName() : "Harborline",
      basePath,
      kind: "electron",
      logsPath,
      platform: process.platform,
      version: typeof app.getVersion === "function" ? app.getVersion() : undefined,
    }),
    logsPath,
    readText: async (fileName) => {
      const filePath = resolveSafeFile(basePath, fileName, allowedStorageFiles, "storage", pathModule);
      try {
        return await fileSystem.readFile(filePath, "utf8");
      } catch (error) {
        if (error && error.code === "ENOENT") return null;
        throw error;
      }
    },
    remove: async (fileName) => {
      const filePath = resolveSafeFile(basePath, fileName, allowedStorageFiles, "storage", pathModule);
      try {
        await fileSystem.unlink(filePath);
      } catch (error) {
        if (!error || error.code !== "ENOENT") throw error;
      }
    },
    writeText: async (fileName, value) => {
      const filePath = resolveSafeFile(basePath, fileName, allowedStorageFiles, "storage", pathModule);
      await writeTextAtomic(fileSystem, filePath, String(value), pathModule);
    },
  };
}

function resolveLogsPath(app, pathModule, userDataPath) {
  try {
    const logsPath = app.getPath("logs");
    if (logsPath) return logsPath;
  } catch {
    // Older or test app shims may not support the logs path.
  }
  return pathModule.join(userDataPath, "logs");
}

function resolveSafeFile(basePath, fileName, allowedFiles, label, pathModule) {
  if (typeof fileName !== "string" || !allowedFiles.has(fileName) || pathModule.basename(fileName) !== fileName) {
    throw new Error(`Blocked unsafe Harborline ${label} file: ${String(fileName)}`);
  }
  return pathModule.join(basePath, fileName);
}

async function writeTextAtomic(fileSystem, filePath, value, pathModule) {
  await fileSystem.mkdir(pathModule.dirname(filePath), { recursive: true });
  const temporaryPath = pathModule.join(
    pathModule.dirname(filePath),
    `.${pathModule.basename(filePath)}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`
  );

  let handle;
  try {
    handle = await fileSystem.open(temporaryPath, "w");
    await handle.writeFile(value, "utf8");
    await handle.sync().catch(() => undefined);
    await handle.close();
    handle = undefined;
    await fileSystem.rename(temporaryPath, filePath);
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined);
    await fileSystem.unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function rotateLogIfNeeded(fileSystem, filePath, maxLogBytes) {
  if (!Number.isFinite(maxLogBytes) || maxLogBytes <= 0) return;
  let current;
  try {
    current = await fileSystem.stat(filePath);
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }
  if (!current.isFile() || current.size < maxLogBytes) return;

  const rotatedPath = `${filePath}.1`;
  if (typeof fileSystem.rm === "function") {
    await fileSystem.rm(rotatedPath, { force: true }).catch(() => undefined);
  } else {
    await fileSystem.unlink(rotatedPath).catch(() => undefined);
  }
  await fileSystem.rename(filePath, rotatedPath).catch((error) => {
    if (!error || error.code !== "ENOENT") throw error;
  });
}

module.exports = {
  allowedLogFiles,
  allowedStorageFiles,
  createHarborlineStorage,
  defaultMaxLogBytes,
  desktopStorageFiles,
  legacyDesktopSaveFiles,
};
