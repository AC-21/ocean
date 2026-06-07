import { afterEach, describe, expect, it } from "vitest";
import {
  appendRuntimeErrorAsync,
  backupSaveKey,
  browserStorageDriver,
  desktopStorageDriver,
  desktopStorageFiles,
  hasRecoverableSaveAsync,
  importGameSaveAsync,
  loadGameAsync,
  playtestArtifactKindFor,
  playtestArtifactKey,
  playtestHistoryKey,
  readPlaytestHistoryAsync,
  recoverSavedGameAsync,
  runtimeLogKey,
  saveGameAsync,
  saveKey,
  serializeGameSave,
  writePlaytestArtifactAsync,
  type HarborlineDesktopStorageBridge,
} from "./persistence";
import { createInitialState } from "./reducer";

describe("app storage persistence", () => {
  afterEach(() => {
    delete (globalThis as { harborlineDesktop?: unknown }).harborlineDesktop;
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("uses Electron bridge files for saves, best score, backups, and damaged-primary recovery", async () => {
    const { bridge, files } = installDesktopStorage();
    const driver = desktopStorageDriver(bridge);

    const first = createInitialState();
    first.best = 1400;
    first.currentPort = "saffron";
    await saveGameAsync({ ...first, lastSavedAt: "2026-06-06T12:00:00.000Z" }, driver);

    expect(JSON.parse(files[desktopStorageFiles.save]).state.currentPort).toBe("saffron");
    expect(files[desktopStorageFiles.best]).toBe("1400");
    expect(await hasRecoverableSaveAsync(driver)).toBe(false);

    const second = createInitialState();
    second.best = 2200;
    second.currentPort = "stormhook";
    await saveGameAsync({ ...second, lastSavedAt: "2026-06-06T13:00:00.000Z" }, driver);

    expect(JSON.parse(files[desktopStorageFiles.save]).state.currentPort).toBe("stormhook");
    expect(JSON.parse(files[desktopStorageFiles.backup]).state.currentPort).toBe("saffron");
    expect(files[desktopStorageFiles.best]).toBe("2200");
    expect(await hasRecoverableSaveAsync(driver)).toBe(true);

    files[desktopStorageFiles.save] = "{bad json";
    const recoveredFromBackup = await loadGameAsync(driver);
    expect(recoveredFromBackup?.currentPort).toBe("saffron");
  });

  it("keeps import, delete, and recover semantics on the app-storage driver", async () => {
    const { bridge, files } = installDesktopStorage();
    const driver = desktopStorageDriver(bridge);
    const original = createInitialState();
    original.currentPort = "grayhaven";
    await saveGameAsync({ ...original, lastSavedAt: "2026-06-06T12:00:00.000Z" }, driver);

    const imported = createInitialState();
    imported.currentPort = "orchid";
    imported.cash = 3333;
    expect((await importGameSaveAsync(serializeGameSave(imported), driver))?.currentPort).toBe("orchid");
    expect(JSON.parse(files[desktopStorageFiles.backup]).state.currentPort).toBe("grayhaven");

    expect(await importGameSaveAsync("{bad json", driver)).toBeNull();
    expect((await loadGameAsync(driver))?.currentPort).toBe("orchid");

    await bridge.remove(desktopStorageFiles.save);
    expect(await loadGameAsync(driver)).toBeNull();
    const recovered = await recoverSavedGameAsync(driver);
    expect(recovered?.currentPort).toBe("grayhaven");
    expect((await loadGameAsync(driver))?.currentPort).toBe("grayhaven");
  });

  it("prefers the active desktop bridge over browser local storage when both exist", async () => {
    const browserStore = installLocalStorage();
    const browserState = createInitialState();
    browserState.currentPort = "saffron";
    await saveGameAsync(browserState, browserStorageDriver(globalThis.localStorage));

    const { bridge } = installDesktopStorage();
    (globalThis as { harborlineDesktop?: unknown }).harborlineDesktop = { storage: bridge };
    const desktopState = createInitialState();
    desktopState.currentPort = "lowmarket";
    await saveGameAsync(desktopState, desktopStorageDriver(bridge));

    expect(browserStore[saveKey]).toContain("saffron");
    expect((await loadGameAsync())?.currentPort).toBe("lowmarket");
  });

  it("writes runtime logs through the desktop bridge and caps browser fallback logs", async () => {
    const { bridge, logs } = installDesktopStorage();
    const error = {
      day: 9,
      id: "err-1",
      message: "Test runtime fault",
      source: "test",
      time: "2026-06-06T14:00:00.000Z",
    };

    await appendRuntimeErrorAsync(error, desktopStorageDriver(bridge));
    expect(logs).toHaveLength(1);
    expect(logs[0].fileName).toBe(desktopStorageFiles.runtimeLog);
    expect(JSON.parse(logs[0].line).message).toBe("Test runtime fault");

    const browserStore = installLocalStorage();
    const browserDriver = browserStorageDriver(globalThis.localStorage);
    for (let index = 0; index < 125; index += 1) {
      await appendRuntimeErrorAsync({ ...error, id: `err-${index}`, message: `Fault ${index}` }, browserDriver);
    }

    const entries = JSON.parse(browserStore[runtimeLogKey]);
    expect(entries).toHaveLength(120);
    expect(JSON.parse(entries[0]).message).toBe("Fault 5");
    expect(JSON.parse(entries[119]).message).toBe("Fault 124");
  });

  it("writes the latest playtest artifact and appends history through desktop and browser storage", async () => {
    const { bridge, files } = installDesktopStorage();
    const desktopResult = await writePlaytestArtifactAsync("# Harborline Playtest Scorecard Draft\n", desktopStorageDriver(bridge));
    expect(desktopResult.kind).toBe("desktop");
    expect(desktopResult.artifactKind).toBe("scorecard");
    expect(desktopResult.fileName).toBe(desktopStorageFiles.playtestArtifact);
    expect(desktopResult.historyFileName).toBe(desktopStorageFiles.playtestHistory);
    expect(desktopResult.historyCount).toBe(1);
    expect(desktopResult.scorecardCount).toBe(1);
    expect(files[desktopStorageFiles.playtestArtifact]).toBe("# Harborline Playtest Scorecard Draft\n");
    expect(JSON.parse(files[desktopStorageFiles.playtestHistory]).entries[0].title).toBe("Harborline Playtest Scorecard Draft");
    expect(JSON.parse(files[desktopStorageFiles.playtestHistory]).entries[0].kind).toBe("scorecard");

    const secondResult = await writePlaytestArtifactAsync("# Harborline Playtest Triage Report\n\n## Intake Status\n", desktopStorageDriver(bridge));
    const readBackHistory = await readPlaytestHistoryAsync(desktopStorageDriver(bridge));
    const desktopHistory = JSON.parse(files[desktopStorageFiles.playtestHistory]);
    expect(secondResult.historyCount).toBe(2);
    expect(secondResult.scorecardCount).toBe(1);
    expect(secondResult.history.entries).toHaveLength(2);
    expect(readBackHistory.entries.map((entry) => entry.kind)).toEqual(["scorecard", "triage"]);
    expect(readBackHistory.entries.map((entry) => entry.title)).toEqual(["Harborline Playtest Scorecard Draft", "Harborline Playtest Triage Report"]);
    expect(desktopHistory.entries.map((entry: { title: string }) => entry.title)).toEqual([
      "Harborline Playtest Scorecard Draft",
      "Harborline Playtest Triage Report",
    ]);

    const browserStore = installLocalStorage();
    const browserResult = await writePlaytestArtifactAsync("# Browser Scorecard\n\n## Core Scores\n\n## Friction Log\n", browserStorageDriver(globalThis.localStorage));
    expect(browserResult.kind).toBe("browser");
    expect(browserResult.artifactKind).toBe("scorecard");
    expect(browserStore[playtestArtifactKey]).toBe("# Browser Scorecard\n\n## Core Scores\n\n## Friction Log\n");
    expect(JSON.parse(browserStore[playtestHistoryKey]).entries[0].kind).toBe("scorecard");
    expect(JSON.parse(browserStore[playtestHistoryKey]).entries[0].markdown).toBe("# Browser Scorecard\n\n## Core Scores\n\n## Friction Log\n");

    const attachedEvidenceResult = await writePlaytestArtifactAsync(
      "# Harborline Playtest Scorecard Draft\n\n## Core Scores\n\n## Friction Log\n\n## Attached Evidence Packet\n\n# Harborline Playtest Evidence Packet\n",
      browserStorageDriver(globalThis.localStorage)
    );
    expect(attachedEvidenceResult.artifactKind).toBe("scorecard");
  });

  it("classifies playtest text without writing it", () => {
    expect(playtestArtifactKindFor("# Harborline Playtest Scorecard Draft\n")).toBe("scorecard");
    expect(playtestArtifactKindFor("# Harborline Playtest Triage Report\n")).toBe("triage");
    expect(playtestArtifactKindFor("# Harborline Playtest Evidence Packet\n")).toBe("evidence");
    expect(playtestArtifactKindFor("# Scratch notes\n")).toBe("artifact");
  });

  it("normalizes old untyped playtest history without letting reports count as scorecards", async () => {
    const { bridge, files } = installDesktopStorage();
    files[desktopStorageFiles.playtestHistory] = JSON.stringify({
      schema: 1,
      entries: [
        {
          id: "old-scorecard",
          markdown: "# Renamed Session\n\n## Core Scores\n\n## Friction Log\n",
          savedAt: "2026-06-07T10:00:00.000Z",
          title: "Renamed Session",
        },
        {
          id: "old-triage",
          markdown: "# Harborline Playtest Triage Report\n\n## Intake Status\n",
          savedAt: "2026-06-07T11:00:00.000Z",
          title: "Harborline Playtest Triage Report",
        },
      ],
    });

    const history = await readPlaytestHistoryAsync(desktopStorageDriver(bridge));

    expect(history.entries.map((entry) => entry.kind)).toEqual(["scorecard", "triage"]);
  });
});

function installDesktopStorage() {
  const files: Record<string, string> = {};
  const logs: Array<{ fileName: string; line: string }> = [];
  const bridge: HarborlineDesktopStorageBridge = {
    appendLog: async (fileName, line) => {
      logs.push({ fileName, line: line.trim() });
    },
    readText: async (fileName) => files[fileName] ?? null,
    remove: async (fileName) => {
      delete files[fileName];
    },
    writeText: async (fileName, value) => {
      files[fileName] = value;
    },
  };
  return { bridge, files, logs };
}

function installLocalStorage() {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store[key] ?? null,
      removeItem: (key: string) => {
        delete store[key];
      },
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    },
  });
  return store;
}
