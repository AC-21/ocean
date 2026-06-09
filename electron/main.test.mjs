import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Electron main window lifecycle", () => {
  it("recovers a running zero-window desktop app when the launcher is opened again", async () => {
    const mainProcess = await readFile(new URL("./main.cjs", import.meta.url), "utf8");

    expect(mainProcess).toContain("app.requestSingleInstanceLock()");
    expect(mainProcess).toContain('app.on("second-instance", requestMainWindow)');
    expect(mainProcess).toContain('app.on("open-file"');
    expect(mainProcess).toContain('app.on("open-url"');
    expect(mainProcess).toContain('app.on("activate", requestMainWindow)');
    expect(mainProcess).toContain("pendingWindowRequest = true");
    expect(mainProcess).toContain("BrowserWindow.getAllWindows().length === 0");
    expect(mainProcess).toContain("void createMainWindow()");
  });

  it("applies temporary userData before taking the single-instance lock", async () => {
    const mainProcess = await readFile(new URL("./main.cjs", import.meta.url), "utf8");

    const userDataOverrideIndex = mainProcess.indexOf('app.setPath("userData", process.env.HARBORLINE_USER_DATA_DIR)');
    const singleInstanceLockIndex = mainProcess.indexOf("app.requestSingleInstanceLock()");

    expect(userDataOverrideIndex).toBeGreaterThanOrEqual(0);
    expect(singleInstanceLockIndex).toBeGreaterThan(userDataOverrideIndex);
  });
});
