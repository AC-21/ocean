import { access, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export function electronZipFileName({ arch, platform, version }) {
  return `electron-v${version}-${platform}-${arch}.zip`;
}

export function defaultElectronCacheRoots(homeDir = os.homedir()) {
  return [
    process.env.OCEAN_LAB_ELECTRON_ZIP_DIR,
    process.env.ELECTRON_CACHE,
    process.env.electron_config_cache,
    path.join(homeDir, "Library", "Caches", "electron"),
    path.join(homeDir, ".cache", "electron"),
    path.join(homeDir, ".electron"),
  ].filter((value) => typeof value === "string" && value.length > 0);
}

export async function findCachedElectronZip(options) {
  const fileName = electronZipFileName(options);
  const cacheRoots = options.cacheRoots ?? defaultElectronCacheRoots(options.homeDir);
  for (const root of cacheRoots) {
    const directCandidate = path.join(root, fileName);
    if (await fileExists(directCandidate)) return { directory: root, fileName, path: directCandidate };
    const nestedCandidate = await findNestedCandidate(root, fileName);
    if (nestedCandidate) return nestedCandidate;
  }
  return null;
}

export async function electronZipDirArgs(options) {
  const cached = await findCachedElectronZip(options);
  return cached ? { args: [`--electron-zip-dir=${cached.directory}`], cached } : { args: [], cached: null };
}

async function findNestedCandidate(root, fileName) {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const directory = path.join(root, entry.name);
    const candidate = path.join(directory, fileName);
    if (await fileExists(candidate)) return { directory, fileName, path: candidate };
  }
  return null;
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
