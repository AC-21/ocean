import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  electronZipDirArgs,
  electronZipFileName,
  findCachedElectronZip,
} from "./electron_zip_cache.mjs";

const temporaryRoots = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe("Electron zip cache discovery", () => {
  it("builds the exact Electron zip name for the package target", () => {
    expect(electronZipFileName({ arch: "arm64", platform: "darwin", version: "42.3.3" })).toBe(
      "electron-v42.3.3-darwin-arm64.zip"
    );
  });

  it("finds a matching cached Electron zip in nested @electron/get cache directories", async () => {
    const root = await temporaryRoot();
    const nested = path.join(root, "hash");
    await mkdir(nested, { recursive: true });
    const zipPath = path.join(nested, "electron-v42.3.3-darwin-arm64.zip");
    await writeFile(zipPath, "zip");

    await expect(findCachedElectronZip({ arch: "arm64", cacheRoots: [root], platform: "darwin", version: "42.3.3" })).resolves.toEqual({
      directory: nested,
      fileName: "electron-v42.3.3-darwin-arm64.zip",
      path: zipPath,
    });
  });

  it("prefers direct explicit cache directories when they contain the zip", async () => {
    const root = await temporaryRoot();
    const zipPath = path.join(root, "electron-v42.3.3-darwin-arm64.zip");
    await writeFile(zipPath, "zip");

    await expect(electronZipDirArgs({ arch: "arm64", cacheRoots: [root], platform: "darwin", version: "42.3.3" })).resolves.toEqual({
      args: [`--electron-zip-dir=${root}`],
      cached: {
        directory: root,
        fileName: "electron-v42.3.3-darwin-arm64.zip",
        path: zipPath,
      },
    });
  });

  it("returns no packager args when the matching artifact is absent", async () => {
    const root = await temporaryRoot();

    await expect(electronZipDirArgs({ arch: "arm64", cacheRoots: [root], platform: "darwin", version: "42.3.3" })).resolves.toEqual({
      args: [],
      cached: null,
    });
  });
});

async function temporaryRoot() {
  const root = await mkdtemp(path.join(tmpdir(), "ocean-lab-electron-cache-test-"));
  temporaryRoots.push(root);
  return root;
}
