import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { createHarborlineStorage, desktopStorageFiles } = require("./storage.cjs");

const temporaryRoots = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe("Electron storage bridge filesystem", () => {
  it("writes app-owned save files atomically and reports storage info", async () => {
    const { root, storage } = await createStorage();

    await storage.writeText(desktopStorageFiles.save, "{\"version\":2}");
    await storage.writeText(desktopStorageFiles.best, "4200");
    await storage.writeText(desktopStorageFiles.playtestArtifact, "# Scorecard\n");
    await storage.writeText(desktopStorageFiles.playtestHistory, "{\"schema\":1,\"entries\":[]}");

    expect(await storage.readText(desktopStorageFiles.save)).toBe("{\"version\":2}");
    expect(await storage.readText(desktopStorageFiles.best)).toBe("4200");
    expect(await storage.readText(desktopStorageFiles.playtestArtifact)).toBe("# Scorecard\n");
    expect(await storage.readText(desktopStorageFiles.playtestHistory)).toBe("{\"schema\":1,\"entries\":[]}");
    expect(await readFile(path.join(root, "userData", "harborline-game", desktopStorageFiles.save), "utf8")).toBe("{\"version\":2}");
    expect(await readFile(path.join(root, "userData", "harborline-game", desktopStorageFiles.playtestArtifact), "utf8")).toBe("# Scorecard\n");
    expect(await readFile(path.join(root, "userData", "harborline-game", desktopStorageFiles.playtestHistory), "utf8")).toBe("{\"schema\":1,\"entries\":[]}");

    const info = await storage.info();
    expect(info.kind).toBe("electron");
    expect(info.appName).toBe("Harborline");
    expect(info.basePath).toBe(path.join(root, "userData", "harborline-game"));
    expect(info.logsPath).toBe(path.join(root, "logs"));
  });

  it("removes missing files safely and blocks unsafe file names", async () => {
    const { storage } = await createStorage();

    await expect(storage.remove(desktopStorageFiles.save)).resolves.toBeUndefined();
    await expect(storage.readText("../save.v2.json")).rejects.toThrow(/Blocked unsafe/);
    await expect(storage.writeText("save.v2.json.tmp", "{}")).rejects.toThrow(/Blocked unsafe/);
    await expect(storage.appendLog("../runtime.v1.ndjson", "{}\n")).rejects.toThrow(/Blocked unsafe/);
  });

  it("appends runtime logs under the logs path and rotates bounded logs", async () => {
    const { root, storage } = await createStorage({ maxLogBytes: 32 });
    const logPath = path.join(root, "logs", desktopStorageFiles.runtimeLog);

    await mkdir(path.dirname(logPath), { recursive: true });
    await writeFile(logPath, "x".repeat(40), "utf8");
    await storage.appendLog(desktopStorageFiles.runtimeLog, "{\"message\":\"fresh\"}\n");

    expect(await readFile(logPath, "utf8")).toBe("{\"message\":\"fresh\"}\n");
    expect(await readFile(`${logPath}.1`, "utf8")).toBe("x".repeat(40));
  });
});

async function createStorage(options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "harborline-electron-storage-"));
  temporaryRoots.push(root);
  const app = {
    getName: () => "Harborline",
    getPath: (name) => {
      if (name === "logs") return path.join(root, "logs");
      if (name === "userData") return path.join(root, "userData");
      throw new Error(`Unexpected app path: ${name}`);
    },
    getVersion: () => "0.1.0-test",
  };
  return { root, storage: createHarborlineStorage({ app, ...options }) };
}
