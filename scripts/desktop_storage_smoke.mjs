import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const { createHarborlineStorage, desktopStorageFiles } = require("../electron/storage.cjs");

const root = await mkdtemp(path.join(tmpdir(), "harborline-desktop-storage-smoke-"));

try {
  const app = {
    getName: () => "Harborline",
    getPath: (name) => {
      if (name === "logs") return path.join(root, "logs");
      if (name === "userData") return path.join(root, "userData");
      throw new Error(`Unexpected app path: ${name}`);
    },
    getVersion: () => "0.1.0-smoke",
  };
  const storage = createHarborlineStorage({ app, maxLogBytes: 48 });

  await storage.writeText(desktopStorageFiles.save, "{\"version\":2,\"state\":{\"currentPort\":\"grayhaven\"}}");
  await storage.writeText(desktopStorageFiles.backup, "{\"version\":2,\"state\":{\"currentPort\":\"saffron\"}}");
  await storage.writeText(desktopStorageFiles.best, "3900");
  await storage.writeText(desktopStorageFiles.fluidCalibrationProfile, "{\"schema\":\"ocean-fluid-calibration-profile-v1\",\"selectedTier\":\"ultra\",\"pass\":true}");
  await storage.writeText(desktopStorageFiles.playtestArtifact, "# Harborline Playtest Scorecard Draft\n");
  await storage.writeText(desktopStorageFiles.playtestHistory, "{\"schema\":1,\"entries\":[]}");

  assert.equal(await storage.readText(desktopStorageFiles.save), "{\"version\":2,\"state\":{\"currentPort\":\"grayhaven\"}}");
  assert.equal(await storage.readText(desktopStorageFiles.backup), "{\"version\":2,\"state\":{\"currentPort\":\"saffron\"}}");
  assert.equal(await storage.readText(desktopStorageFiles.best), "3900");
  assert.equal(await storage.readText(desktopStorageFiles.fluidCalibrationProfile), "{\"schema\":\"ocean-fluid-calibration-profile-v1\",\"selectedTier\":\"ultra\",\"pass\":true}");
  assert.equal(await storage.readText(desktopStorageFiles.playtestArtifact), "# Harborline Playtest Scorecard Draft\n");
  assert.equal(await storage.readText(desktopStorageFiles.playtestHistory), "{\"schema\":1,\"entries\":[]}");

  const logPath = path.join(root, "logs", desktopStorageFiles.runtimeLog);
  await mkdir(path.dirname(logPath), { recursive: true });
  await writeFile(logPath, "x".repeat(64), "utf8");
  await storage.appendLog(desktopStorageFiles.runtimeLog, "{\"source\":\"desktop-smoke\"}\n");
  assert.equal(await readFile(logPath, "utf8"), "{\"source\":\"desktop-smoke\"}\n");

  await storage.remove(desktopStorageFiles.save);
  assert.equal(await storage.readText(desktopStorageFiles.save), null);

  await assert.rejects(() => storage.writeText("../save.v2.json", "{}"), /Blocked unsafe/);
  const info = await storage.info();
  assert.equal(info.kind, "electron");
  assert.equal(info.basePath, path.join(root, "userData", "harborline-game"));

  console.log(`Desktop storage smoke passed at ${root}.`);
} finally {
  await rm(root, { force: true, recursive: true });
}
