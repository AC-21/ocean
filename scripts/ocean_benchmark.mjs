import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

const sampleTarget = Number(process.env.HARBORLINE_OCEAN_BENCHMARK_SAMPLES || 8);
const reportPath = process.env.HARBORLINE_OCEAN_BENCHMARK_REPORT || "reports/ocean-benchmark-latest.json";
const desktopViewport = { width: 1440, height: 920, deviceScaleFactor: 1 };
const compactViewport = { width: 900, height: 700, deviceScaleFactor: 1 };

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch (error) {
  throw new Error(
    `Playwright is required for ocean benchmark. Run npm install first. Original error: ${error instanceof Error ? error.message : String(error)}`
  );
}

const cases = [
  {
    id: "default-desktop",
    path: "/?verify=ocean-benchmark",
    viewport: desktopViewport,
    expectedRenderer: "shader-mesh-v2",
    minAverageFps: Number(process.env.HARBORLINE_OCEAN_DEFAULT_MIN_FPS || 30),
  },
  {
    id: "compact-desktop",
    path: "/?verify=ocean-benchmark-compact",
    viewport: compactViewport,
    expectedRenderer: "shader-mesh-v2",
    minAverageFps: Number(process.env.HARBORLINE_OCEAN_COMPACT_MIN_FPS || 30),
  },
  {
    id: "low-power",
    path: "/?graphics=low&verify=ocean-benchmark-low",
    viewport: desktopViewport,
    expectedRenderer: "low-power-graphics-v2",
    minAverageFps: Number(process.env.HARBORLINE_OCEAN_LOW_MIN_FPS || 24),
  },
  {
    id: "compact-low-power",
    path: "/?graphics=low&verify=ocean-benchmark-compact-low",
    viewport: compactViewport,
    expectedRenderer: "low-power-graphics-v2",
    minAverageFps: Number(process.env.HARBORLINE_OCEAN_COMPACT_LOW_MIN_FPS || 24),
  },
];

await runBenchmark();

async function runBenchmark() {
  await assertBuiltAppExists();

  const previewPort = Number(process.env.HARBORLINE_VERIFY_PORT || 0) || await findFreePort();
  const previewUrl = `http://127.0.0.1:${previewPort}`;
  const viteBin = process.platform === "win32" ? "node_modules/.bin/vite.cmd" : "node_modules/.bin/vite";
  const server = spawn(viteBin, ["preview", "--host", "127.0.0.1", "--port", String(previewPort), "--strictPort"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  server.stdout.on("data", (chunk) => {
    output += String(chunk);
  });
  server.stderr.on("data", (chunk) => {
    output += String(chunk);
  });

  let report;
  try {
    await waitForServer(previewUrl, 12_000);
    report = await measureCases(previewUrl);
  } finally {
    server.kill("SIGTERM");
    await onceExit(server, 2_000).catch(() => server.kill("SIGKILL"));
  }

  if (server.exitCode && server.exitCode !== 0 && !output.includes("SIGTERM")) {
    throw new Error(`Preview server exited unexpectedly:\n${output}`);
  }

  await mkdir(path.dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nOcean benchmark passed. Report written to ${reportPath}.`);
  for (const result of report.results) {
    console.log(
      `- ${result.id} ${result.viewport.width}x${result.viewport.height}: ${result.renderQuality}/${result.waterRenderer}, avg ${result.renderFpsAvg} FPS, recent ${result.renderFpsRecentAvg} FPS, min ${result.renderFpsMin}, fallback ${result.renderAdaptiveFallback}`
    );
  }
}

async function measureCases(previewUrl) {
  const browser = await chromium.launch({
    headless: process.env.HARBORLINE_BROWSER_SMOKE_HEADED !== "1",
    executablePath: await browserExecutablePath(),
    args: ["--disable-dev-shm-usage", "--enable-unsafe-swiftshader", "--enable-webgl", "--ignore-gpu-blocklist", "--use-gl=swiftshader"],
  });

  const report = {
    generatedAt: new Date().toISOString(),
    previewUrl,
    samplesPerCase: sampleTarget,
    results: [],
  };

  try {
    for (const benchmarkCase of cases) {
      const result = await measureCase(browser, previewUrl, benchmarkCase);
      report.results.push(result);
    }
    assertLowPowerMateriallyCheaper(report.results);
  } finally {
    await browser.close();
  }

  return report;
}

async function measureCase(browser, previewUrl, benchmarkCase) {
  const context = await browser.newContext({
    viewport: { width: benchmarkCase.viewport.width, height: benchmarkCase.viewport.height },
    deviceScaleFactor: benchmarkCase.viewport.deviceScaleFactor,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  try {
    await page.goto(`${previewUrl}${benchmarkCase.path}`, { waitUntil: "domcontentloaded" });
    await page.getByTestId("route-command").waitFor({ state: "visible", timeout: 15_000 });
    const runtimeHealthInitial = await assertRuntimeClean(page);
    await assertCanvasProbe(page);
    await page.waitForFunction(
      (samples) => Number(document.querySelector('[data-testid="map-canvas"]')?.getAttribute("data-render-fps-samples") ?? 0) >= samples,
      sampleTarget,
      { timeout: Math.max(18_000, (sampleTarget + 5) * 1200) }
    );
    const runtimeHealthFinal = await assertRuntimeClean(page);

    const result = await page.getByTestId("map-canvas").evaluate((map) => ({
      renderQuality: map.getAttribute("data-render-quality"),
      renderScale: map.getAttribute("data-render-scale"),
      renderFps: Number(map.getAttribute("data-render-fps") ?? 0),
      renderFpsAvg: Number(map.getAttribute("data-render-fps-avg") ?? 0),
      renderFpsMin: Number(map.getAttribute("data-render-fps-min") ?? 0),
      renderFpsMax: Number(map.getAttribute("data-render-fps-max") ?? 0),
      renderFpsRecentAvg: Number(map.getAttribute("data-render-fps-recent-avg") ?? 0),
      renderFpsSamples: Number(map.getAttribute("data-render-fps-samples") ?? 0),
      renderFpsStability: map.getAttribute("data-render-fps-stability"),
      renderFpsTarget: Number(map.getAttribute("data-render-fps-target") ?? 0),
      renderFpsContext: map.getAttribute("data-render-fps-context"),
      renderAdaptiveFallback: map.getAttribute("data-render-adaptive-fallback"),
      renderAdaptiveReason: map.getAttribute("data-render-adaptive-reason"),
      waterRenderer: map.getAttribute("data-water-renderer"),
      pixelStatus: map.getAttribute("data-canvas-pixel-status"),
      pixelVariety: map.getAttribute("data-canvas-pixel-variety"),
      pixelSamples: Number(map.getAttribute("data-canvas-pixel-samples") ?? 0),
      pixelColors: Number(map.getAttribute("data-canvas-pixel-colors") ?? 0),
    }));

    assert.equal(result.waterRenderer, benchmarkCase.expectedRenderer, `${benchmarkCase.id} should use ${benchmarkCase.expectedRenderer}`);
    assert.ok(result.renderFpsAvg >= benchmarkCase.minAverageFps, `${benchmarkCase.id} average FPS ${result.renderFpsAvg} < ${benchmarkCase.minAverageFps}`);
    assert.notEqual(result.renderFpsStability, "unstable", `${benchmarkCase.id} reported unstable frame pacing`);
    assert.deepEqual(pageErrors, [], `${benchmarkCase.id} page errors: ${pageErrors.join("\n")}`);
    assert.deepEqual(consoleErrors, [], `${benchmarkCase.id} console errors: ${consoleErrors.join("\n")}`);

    return {
      id: benchmarkCase.id,
      url: `${previewUrl}${benchmarkCase.path}`,
      minAverageFps: benchmarkCase.minAverageFps,
      viewport: benchmarkCase.viewport,
      runtimeHealthInitial,
      runtimeHealthFinal,
      consoleErrorCount: consoleErrors.length,
      pageErrorCount: pageErrors.length,
      ...result,
    };
  } finally {
    await page.close();
    await context.close();
  }
}

function assertLowPowerMateriallyCheaper(results) {
  assertLowPowerPair(results, "default-desktop", "low-power");
  assertLowPowerPair(results, "compact-desktop", "compact-low-power");
}

function assertLowPowerPair(results, shaderId, lowPowerId) {
  const shader = results.find((result) => result.id === shaderId);
  const lowPower = results.find((result) => result.id === lowPowerId);
  assert.ok(shader, `${shaderId} result missing`);
  assert.ok(lowPower, `${lowPowerId} result missing`);
  assert.equal(shader.waterRenderer, "shader-mesh-v2", `${shaderId} should use shader water`);
  assert.equal(lowPower.waterRenderer, "low-power-graphics-v2", `${lowPowerId} should use low-power water`);
  assert.ok(Number(lowPower.renderScale) < Number(shader.renderScale), `${lowPowerId} render scale should be lower than ${shaderId}`);
  assert.ok(lowPower.pixelColors <= shader.pixelColors, `${lowPowerId} should not be visually more complex than ${shaderId}`);
}

async function assertRuntimeClean(page) {
  const health = await page.getByTestId("runtime-health").innerText();
  if (!/Runtime\s+Clean/i.test(health)) {
    await page.getByTestId("runtime-health").click().catch(() => undefined);
    const errorText = await page.getByTestId("error-log").textContent().catch(() => "");
    throw new Error(`Runtime health should be clean, got: ${health}\n${errorText || "No error details visible."}`);
  }
  return health.replace(/\s+/g, " ").trim();
}

async function assertCanvasProbe(page) {
  await page.waitForFunction(() => {
    const map = document.querySelector('[data-testid="map-canvas"]');
    return map?.getAttribute("data-canvas-pixel-status") === "nonblank" && map?.getAttribute("data-canvas-pixel-variety") === "varied";
  }, null, { timeout: 12_000 });
}

async function browserExecutablePath() {
  const candidates = [
    process.env.HARBORLINE_BROWSER_EXECUTABLE,
    chromium.executablePath(),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }

  throw new Error(`No browser executable found for ocean benchmark. Checked:\n${candidates.join("\n")}`);
}

async function assertBuiltAppExists() {
  const htmlPath = path.resolve("dist/index.html");
  const html = await readFile(htmlPath, "utf8");
  assert.match(html, /<div\s+id="root"/, "dist/index.html should contain the React root");
  assert.match(html, /data-testid="boot-screen"/, "dist/index.html should contain the loading state");
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await delay(150);
  }
  throw new Error(`Timed out waiting for preview server at ${url}`);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not allocate a local preview port.")));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onceExit(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Timed out waiting for process exit.")), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
