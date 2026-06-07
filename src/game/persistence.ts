import type { GameError, GameState } from "./types";

export const bestKey = "harborline.bestNetWorth";
export const backupSaveKey = "harborline.save.backup.v2";
export const currentSaveVersion = 2;
export const currentStateVersion = 2;
export const saveKey = "harborline.save.v2";
export const legacySaveKeys = ["harborline.save.v1"] as const;
export const runtimeLogKey = "harborline.runtimeLog.v1";
export const playtestArtifactKey = "harborline.playtestArtifact.latest";
export const playtestHistoryKey = "harborline.playtestArtifact.history.v1";
export const runtimeLogLimit = 120;
export const playtestHistoryLimit = 12;
export const desktopStorageFiles = {
  best: "best.v2.json",
  backup: "save.backup.v2.json",
  playtestArtifact: "playtest.latest.md",
  playtestHistory: "playtest.history.v1.json",
  runtimeLog: "runtime.v1.ndjson",
  save: "save.v2.json",
  settings: "settings.v1.json",
} as const;
export const legacyDesktopSaveFiles = ["save.v1.json"] as const;

type StorageSlot = "best" | "backup" | "playtestArtifact" | "playtestHistory" | "runtimeLog" | "save" | "settings";

type SaveEnvelope = {
  version: number;
  state: Partial<GameState>;
};

export type PlaytestArtifactHistoryEntry = {
  id: string;
  kind: PlaytestArtifactKind;
  markdown: string;
  savedAt: string;
  title: string;
};

export type PlaytestArtifactKind = "artifact" | "evidence" | "scorecard" | "triage";

export type PlaytestArtifactHistory = {
  entries: PlaytestArtifactHistoryEntry[];
  schema: 1;
};

export type HarborlineDesktopStorageInfo = {
  appName?: string;
  basePath?: string;
  kind?: "browser" | "electron";
  logsPath?: string;
  platform?: string;
  version?: string;
};

export type HarborlineDesktopStorageBridge = {
  appendLog?: (fileName: string, line: string) => Promise<void>;
  info?: () => Promise<HarborlineDesktopStorageInfo>;
  readText: (fileName: string) => Promise<string | null>;
  remove: (fileName: string) => Promise<void>;
  writeText: (fileName: string, value: string) => Promise<void>;
};

export type HarborlineDesktopBridge = {
  storage?: HarborlineDesktopStorageBridge;
};

export type BrowserStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type AppStorageDriver =
  | {
      kind: "browser";
      storage: BrowserStorageLike;
    }
  | {
      bridge: HarborlineDesktopStorageBridge;
      kind: "desktop";
    };

declare global {
  interface Window {
    harborlineDesktop?: HarborlineDesktopBridge;
  }
}

const supportedSaveVersions = new Set([1, currentSaveVersion]);

export function readBest() {
  const value = Number(localStorage.getItem(bestKey) || 0);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

export function writeBest(value: number) {
  localStorage.setItem(bestKey, String(Math.max(0, Math.round(value || 0))));
}

export function saveGame(state: GameState) {
  backupCurrentSave();
  const envelope = saveEnvelopeFor(state);
  localStorage.setItem(saveKey, JSON.stringify(envelope));
  writeBest(state.best);
}

export function loadGame() {
  for (const key of [saveKey, ...legacySaveKeys]) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const state = parseSavedState(raw);
    if (state) return state as GameState;
  }
  return null;
}

export function serializeGameSave(state: GameState) {
  return JSON.stringify(saveEnvelopeFor(state), null, 2);
}

export function importGameSave(raw: string): Partial<GameState> | null {
  const state = parseSavedState(raw);
  if (!state) return null;
  backupCurrentSave();
  localStorage.setItem(saveKey, JSON.stringify(saveEnvelopeFor(state)));
  return state;
}

export function clearSavedGame() {
  backupCurrentSave();
  localStorage.removeItem(saveKey);
  for (const key of legacySaveKeys) localStorage.removeItem(key);
}

export function hasRecoverableSave() {
  const raw = localStorage.getItem(backupSaveKey);
  return Boolean(raw && parseSavedState(raw));
}

export function recoverSavedGame() {
  const raw = localStorage.getItem(backupSaveKey);
  if (!raw) return null;
  const state = parseSavedState(raw);
  if (!state) return null;
  localStorage.setItem(saveKey, JSON.stringify(saveEnvelopeFor(state)));
  return state;
}

export function clearSaveBackup() {
  localStorage.removeItem(backupSaveKey);
}

export function activeAppStorageDriver(): AppStorageDriver {
  const bridge = activeDesktopBridge()?.storage;
  if (bridge && typeof bridge.readText === "function" && typeof bridge.writeText === "function" && typeof bridge.remove === "function") {
    return desktopStorageDriver(bridge);
  }
  return browserStorageDriver();
}

export function browserStorageDriver(storage: BrowserStorageLike = localStorage): AppStorageDriver {
  return { kind: "browser", storage };
}

export function desktopStorageDriver(bridge: HarborlineDesktopStorageBridge): AppStorageDriver {
  return { bridge, kind: "desktop" };
}

export async function readBestAsync(driver = activeAppStorageDriver()) {
  const raw = await readSlot(driver, "best");
  const value = Number(raw || 0);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

export async function writeBestAsync(value: number, driver = activeAppStorageDriver()) {
  await writeSlot(driver, "best", String(Math.max(0, Math.round(value || 0))));
}

export async function saveGameAsync(state: GameState, driver = activeAppStorageDriver()) {
  await backupCurrentSaveAsync(driver);
  const envelope = saveEnvelopeFor(state);
  await writeSlot(driver, "save", JSON.stringify(envelope));
  await writeBestAsync(state.best, driver);
}

export async function loadGameAsync(driver = activeAppStorageDriver()) {
  let primaryWasDamaged = false;
  const primary = await readSlot(driver, "save");
  if (primary) {
    const state = parseSavedState(primary);
    if (state) return state as GameState;
    primaryWasDamaged = true;
  }

  for (const raw of await readLegacySaveCandidates(driver)) {
    if (!raw) continue;
    const state = parseSavedState(raw);
    if (state) return state as GameState;
  }

  if (primaryWasDamaged) {
    const backup = await readSlot(driver, "backup");
    if (backup) {
      const state = parseSavedState(backup);
      if (state) return state as GameState;
    }
  }

  return null;
}

export async function importGameSaveAsync(raw: string, driver = activeAppStorageDriver()) {
  const state = parseSavedState(raw);
  if (!state) return null;
  await backupCurrentSaveAsync(driver);
  await writeSlot(driver, "save", JSON.stringify(saveEnvelopeFor(state)));
  return state;
}

export async function clearSavedGameAsync(driver = activeAppStorageDriver()) {
  await backupCurrentSaveAsync(driver);
  await removeSlot(driver, "save");
  await removeLegacySaveCandidates(driver);
}

export async function hasRecoverableSaveAsync(driver = activeAppStorageDriver()) {
  const raw = await readSlot(driver, "backup");
  return Boolean(raw && parseSavedState(raw));
}

export async function recoverSavedGameAsync(driver = activeAppStorageDriver()) {
  const raw = await readSlot(driver, "backup");
  if (!raw) return null;
  const state = parseSavedState(raw);
  if (!state) return null;
  await writeSlot(driver, "save", JSON.stringify(saveEnvelopeFor(state)));
  return state;
}

export async function clearSaveBackupAsync(driver = activeAppStorageDriver()) {
  await removeSlot(driver, "backup");
}

export async function readDesktopStorageInfoAsync(driver = activeAppStorageDriver()): Promise<HarborlineDesktopStorageInfo> {
  if (driver.kind === "desktop" && driver.bridge.info) return driver.bridge.info();
  return {
    appName: "Harborline",
    kind: "browser",
    platform: navigatorLikePlatform(),
    version: "dev",
  };
}

export async function appendRuntimeErrorAsync(error: GameError, driver = activeAppStorageDriver()) {
  const line = JSON.stringify({ schema: 1, ...error });
  if (driver.kind === "desktop" && driver.bridge.appendLog) {
    await driver.bridge.appendLog(desktopStorageFiles.runtimeLog, `${line}\n`);
    return;
  }

  const current = await readSlot(driver, "runtimeLog");
  const entries = parseBrowserRuntimeLog(current);
  entries.push(line);
  await writeSlot(driver, "runtimeLog", JSON.stringify(entries.slice(-runtimeLogLimit)));
}

export async function writePlaytestArtifactAsync(markdown: string, driver = activeAppStorageDriver()) {
  const value = normalizePlaytestArtifact(markdown);
  const artifactKind = playtestArtifactKind(value);
  await writeSlot(driver, "playtestArtifact", value);
  const history = await appendPlaytestHistoryEntry(driver, value);
  const scorecardCount = scorecardEntries(history).length;
  return {
    artifactKind,
    fileName: desktopStorageFiles.playtestArtifact,
    history,
    historyCount: history.entries.length,
    historyFileName: desktopStorageFiles.playtestHistory,
    kind: driver.kind,
    scorecardCount,
    value,
  };
}

export async function readPlaytestHistoryAsync(driver = activeAppStorageDriver()) {
  return parsePlaytestHistory(await readSlot(driver, "playtestHistory"));
}

export function scorecardEntries(history: PlaytestArtifactHistory) {
  return history.entries.filter((entry) => entry.kind === "scorecard");
}

export function playtestArtifactKindFor(markdown: string): PlaytestArtifactKind {
  return playtestArtifactKind(markdown);
}

function saveEnvelopeFor(state: Partial<GameState>): SaveEnvelope {
  return {
    version: currentSaveVersion,
    state: { ...state, version: currentStateVersion },
  };
}

function parseSavedState(raw: string): Partial<GameState> | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  return extractSavedState(json);
}

function backupCurrentSave() {
  const current = localStorage.getItem(saveKey);
  if (current && parseSavedState(current)) {
    localStorage.setItem(backupSaveKey, current);
    return;
  }

  for (const key of legacySaveKeys) {
    const raw = localStorage.getItem(key);
    if (raw && parseSavedState(raw)) {
      localStorage.setItem(backupSaveKey, JSON.stringify(saveEnvelopeFor(parseSavedState(raw)!)));
      return;
    }
  }
}

async function backupCurrentSaveAsync(driver: AppStorageDriver) {
  const current = await readSlot(driver, "save");
  if (current && parseSavedState(current)) {
    await writeSlot(driver, "backup", current);
    return;
  }

  for (const raw of await readLegacySaveCandidates(driver)) {
    if (raw && parseSavedState(raw)) {
      await writeSlot(driver, "backup", JSON.stringify(saveEnvelopeFor(parseSavedState(raw)!)));
      return;
    }
  }
}

async function readSlot(driver: AppStorageDriver, slot: StorageSlot) {
  if (driver.kind === "desktop") return driver.bridge.readText(desktopStorageFiles[slot]);
  return driver.storage.getItem(browserKeyForSlot(slot));
}

async function writeSlot(driver: AppStorageDriver, slot: StorageSlot, value: string) {
  if (driver.kind === "desktop") {
    await driver.bridge.writeText(desktopStorageFiles[slot], value);
    return;
  }
  driver.storage.setItem(browserKeyForSlot(slot), value);
}

async function removeSlot(driver: AppStorageDriver, slot: StorageSlot) {
  if (driver.kind === "desktop") {
    await driver.bridge.remove(desktopStorageFiles[slot]);
    return;
  }
  driver.storage.removeItem(browserKeyForSlot(slot));
}

async function readLegacySaveCandidates(driver: AppStorageDriver) {
  if (driver.kind === "desktop") return Promise.all(legacyDesktopSaveFiles.map((fileName) => driver.bridge.readText(fileName)));
  return legacySaveKeys.map((key) => driver.storage.getItem(key));
}

async function removeLegacySaveCandidates(driver: AppStorageDriver) {
  if (driver.kind === "desktop") {
    await Promise.all(legacyDesktopSaveFiles.map((fileName) => driver.bridge.remove(fileName)));
    return;
  }
  for (const key of legacySaveKeys) driver.storage.removeItem(key);
}

function browserKeyForSlot(slot: StorageSlot) {
  if (slot === "backup") return backupSaveKey;
  if (slot === "best") return bestKey;
  if (slot === "playtestArtifact") return playtestArtifactKey;
  if (slot === "playtestHistory") return playtestHistoryKey;
  if (slot === "runtimeLog") return runtimeLogKey;
  if (slot === "save") return saveKey;
  return "harborline.settings.v1";
}

async function appendPlaytestHistoryEntry(driver: AppStorageDriver, markdown: string): Promise<PlaytestArtifactHistory> {
  const existing = parsePlaytestHistory(await readSlot(driver, "playtestHistory"));
  const savedAt = new Date().toISOString();
  const entry: PlaytestArtifactHistoryEntry = {
    id: `playtest-${savedAt.replace(/[^0-9]/g, "").slice(0, 14)}`,
    kind: playtestArtifactKind(markdown),
    markdown,
    savedAt,
    title: playtestArtifactTitle(markdown),
  };
  const history = {
    schema: 1 as const,
    entries: [...existing.entries, entry].slice(-playtestHistoryLimit),
  };
  await writeSlot(driver, "playtestHistory", JSON.stringify(history, null, 2));
  return history;
}

function parsePlaytestHistory(raw: string | null): PlaytestArtifactHistory {
  if (!raw) return { schema: 1, entries: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.entries)) return { schema: 1, entries: [] };
    return {
      schema: 1,
      entries: parsed.entries
        .flatMap((entry): PlaytestArtifactHistoryEntry[] => {
          if (!isRecord(entry) || typeof entry.markdown !== "string") return [];
          return [
            {
              id: cleanText(entry.id, "playtest-restored", 80),
              kind: playtestArtifactKind(cleanText(entry.kind, "", 40) || entry.markdown),
              markdown: normalizePlaytestArtifact(entry.markdown),
              savedAt: cleanText(entry.savedAt, new Date(0).toISOString(), 40),
              title: cleanText(entry.title, playtestArtifactTitle(entry.markdown), 120),
            },
          ];
        })
        .slice(-playtestHistoryLimit),
    };
  } catch {
    return { schema: 1, entries: [] };
  }
}

function normalizePlaytestArtifact(value: string) {
  const normalized = String(value || "").replace(/\r\n/g, "\n").trim();
  return `${normalized || "# Harborline Playtest Artifact\n\nNo scorecard generated yet."}\n`;
}

function playtestArtifactTitle(markdown: string) {
  const heading = markdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("# "));
  return cleanText(heading?.replace(/^#+\s*/, ""), "Harborline Playtest Artifact", 120);
}

function playtestArtifactKind(value: unknown): PlaytestArtifactKind {
  if (value === "scorecard" || value === "evidence" || value === "triage" || value === "artifact") return value;
  if (typeof value !== "string") return "artifact";
  const text = value.toLowerCase();
  if (text.includes("harborline playtest triage report")) return "triage";
  if (text.includes("harborline playtest scorecard draft")) return "scorecard";
  if (text.includes("## core scores") && text.includes("## friction log")) return "scorecard";
  if (text.includes("harborline playtest evidence packet")) return "evidence";
  return "artifact";
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : fallback;
}

function activeDesktopBridge(): HarborlineDesktopBridge | undefined {
  const global = globalThis as typeof globalThis & {
    harborlineDesktop?: HarborlineDesktopBridge;
    window?: Window & { harborlineDesktop?: HarborlineDesktopBridge };
  };
  return global.window?.harborlineDesktop ?? global.harborlineDesktop;
}

function parseBrowserRuntimeLog(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string").slice(-runtimeLogLimit) : [];
  } catch {
    return [];
  }
}

function navigatorLikePlatform() {
  const platform = typeof navigator === "undefined" ? "" : navigator.platform;
  return platform || "browser";
}

function extractSavedState(value: unknown): Partial<GameState> | null {
  if (!isRecord(value)) return null;

  if ("state" in value) {
    const version = optionalVersion(value.version);
    if (version !== null && !supportedSaveVersions.has(version)) return null;
    return isRecord(value.state) ? (value.state as Partial<GameState>) : null;
  }

  return looksLikeLegacyState(value) ? (value as Partial<GameState>) : null;
}

function optionalVersion(value: unknown) {
  if (value === undefined || value === null) return null;
  const version = Number(value);
  return Number.isFinite(version) ? Math.round(version) : -1;
}

function looksLikeLegacyState(value: Record<string, unknown>) {
  return "currentPort" in value || "market" in value || "cargo" in value || "day" in value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
