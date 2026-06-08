import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { _electron as electron, type Page } from "playwright";
import type { OceanPhysicsLiveSnapshot } from "../OceanPhysicsApp";
import { createFluidSurfaceRecoveryReport, type SurfaceRecoverySample, type SurfaceRecoveryVisualMetrics } from "./fluidSurfaceRecovery";
import type { FluidFrameLoopStats } from "./fluidFrameLoop";

const timeoutMs = Number(process.env.OCEAN_LAB_SURFACE_RECOVERY_TIMEOUT_MS || 90_000);
const outPath = process.env.OCEAN_LAB_SURFACE_RECOVERY_OUT || "reports/fluid-surface-recovery-latest.json";
const root = process.cwd();
const appName = "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const packagedExecutablePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`, "Contents", "MacOS", appName);
const launchMode = process.env.OCEAN_LAB_SURFACE_RECOVERY_TARGET === "source" ? "electron-source" : "packaged-app";
const userDataRoot = await mkdtemp(path.join(tmpdir(), "ocean-lab-surface-recovery-"));
const userDataPath = await realpath(userDataRoot);
const recoveryOffsetsS = [0.12, 0.6, 1.2, 2.4, 4.2];

let electronApp: Awaited<ReturnType<typeof electron.launch>> | null = null;
try {
  if (launchMode === "packaged-app") {
    await access(packagedExecutablePath);
  }
  electronApp = await electron.launch({
    ...(launchMode === "packaged-app" ? { executablePath: packagedExecutablePath } : { args: [root] }),
    env: {
      ...process.env,
      HARBORLINE_USER_DATA_DIR: userDataPath,
      OCEAN_LAB_FLUID_TIER: "ultra",
    },
    timeout: timeoutMs,
  });

  const page = await electronApp.firstWindow({ timeout: timeoutMs });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.getByRole("heading", { name: "Physics ocean" }).waitFor({ state: "visible", timeout: timeoutMs });
  await page.waitForFunction(() => {
    const canvas = document.querySelector(".ocean-canvas");
    return (
      window.__oceanPhysicsScenarioControls &&
      window.__fluidGridPreferredTier === "ultra" &&
      window.__fluidGridCapabilityReport?.selectedTier === "ultra" &&
      window.__fluidGridCapabilityReport?.grid?.cellsX === 768 &&
      window.__fluidGridCapabilityReport?.grid?.cellsY === 432 &&
      canvas?.getAttribute("data-water-renderer") === "webgpu-grid-primary-v1" &&
      canvas?.getAttribute("data-water-context") === "webgpu" &&
      canvas?.getAttribute("data-water-tier") === "ultra" &&
      canvas?.getAttribute("data-water-grid") === "768x432" &&
      Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 20
    );
  }, undefined, { timeout: timeoutMs });

  await page.evaluate(() => {
    if (!window.__oceanPhysicsScenarioControls) throw new Error("Missing ocean physics scenario controls");
    window.__oceanPhysicsScenarioControls.configure({
      dropHeightM: 8,
      ocean: {
        currentSpeedMps: 0,
        waterDensityKgM3: 1025,
        waterDepthM: 22,
        waveHeightM: 0,
        windSpeedMps: 0,
      },
      presetId: "concrete-cube",
      releaseAngleRad: 0,
      timeScale: 1,
    });
    window.__oceanPhysicsScenarioControls.drop();
  });
  const impactSnapshot = await waitForSnapshot(page, (snapshot) => snapshot.impact !== null, "concrete impact");
  const impactAtS = impactSnapshot.impact?.atS ?? 0;
  const samples: SurfaceRecoverySample[] = [];

  for (const targetOffsetS of recoveryOffsetsS) {
    const snapshot = await waitForSnapshot(
      page,
      (candidate) => candidate.impact !== null && candidate.timeS >= (candidate.impact?.atS ?? impactAtS) + targetOffsetS,
      `surface recovery ${targetOffsetS}s`
    );
    samples.push(await recoverySampleFor(page, snapshot, impactAtS));
  }

  const report = createFluidSurfaceRecoveryReport({
    generatedAt: new Date().toISOString(),
    launchMode,
    samples,
    scenario: {
      dropHeightM: 8,
      objectPresetId: "concrete-cube",
      waterDepthM: 22,
    },
  });
  const failures = [
    ...report.failures,
    ...consoleErrors.map((entry) => `console error: ${entry}`),
    ...pageErrors.map((entry) => `page error: ${entry}`),
  ];
  const finalReport = {
    ...report,
    failures,
    pass: failures.length === 0,
    summary: {
      ...report.summary,
      visualRecovery: failures.length === 0 ? "recovered" : "not-recovered",
    },
  };

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(finalReport, null, 2)}\n`);
  console.log(`Fluid surface recovery report written to ${outPath}`);
  console.log(`- runtime: ${launchMode}`);
  console.log(`- samples: ${samples.length}, offsets ${samples.map((sample) => sample.offsetAfterImpactS.toFixed(2)).join(", ")} s`);
  console.log(`- visual stddev ratio: ${finalReport.summary.lumaStdDevLateToInitialRatio.toFixed(3)}`);
  console.log(`- visual bucket ratio: ${finalReport.summary.visualBucketsLateToInitialRatio.toFixed(3)}`);
  console.log(`- pressure work ratio: ${finalReport.summary.pressureWorkLateToInitialRatio.toFixed(3)}`);
  assert.equal(finalReport.gate, "G-FG-32", "FG-32 evidence must use the surface recovery gate id");
  assert.deepEqual(finalReport.failures, [], `FG-32 failures:\n${finalReport.failures.join("\n")}`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  await rm(userDataPath, { force: true, recursive: true });
}

async function recoverySampleFor(page: Page, snapshot: OceanPhysicsLiveSnapshot, impactAtS: number): Promise<SurfaceRecoverySample> {
  const png = await page.locator(".ocean-canvas").screenshot({ timeout: timeoutMs });
  const telemetry = await page.locator(".ocean-canvas").evaluate((canvas) => ({
    couplingActive: canvas.getAttribute("data-water-coupling-active") === "true",
    foamEnergyJ: Number(canvas.getAttribute("data-water-splash-foam-energy") ?? 0),
    frames: Number(canvas.getAttribute("data-water-frames") ?? 0),
    grid: canvas.getAttribute("data-water-grid"),
    noFullGridReadbackPerFrame: canvas.getAttribute("data-water-pressure-readback") === "true",
    particleFoam: Number(canvas.getAttribute("data-water-particles-foam") ?? 0),
    particlesActive: canvas.getAttribute("data-water-particles-active") === "true",
    pressureActive: canvas.getAttribute("data-water-pressure-active") === "true",
    pressureImpulseEnergyJ: Number(canvas.getAttribute("data-water-pressure-impulse-energy") ?? 0),
    pressureWorkEstimateJ: Number(canvas.getAttribute("data-water-pressure-work") ?? 0),
    renderMode: document.querySelector(".simulation-stage")?.getAttribute("data-water-render-mode") ?? null,
    renderer: canvas.getAttribute("data-water-renderer"),
    splashActive: canvas.getAttribute("data-water-splash-active") === "true",
    splashGridEnergyJ: Number(canvas.getAttribute("data-water-splash-grid-energy") ?? 0),
    tier: canvas.getAttribute("data-water-tier"),
    waterContext: canvas.getAttribute("data-water-context"),
  }));
  const frameLoop = await page.evaluate(() => window.__fluidFrameLoopStats ?? null) as FluidFrameLoopStats | null;
  return {
    frameLoop,
    objectDepthM: Math.abs(snapshot.object.centerYM),
    objectVelocityYMps: snapshot.object.velocityYMps,
    offsetAfterImpactS: Math.max(0, snapshot.timeS - impactAtS),
    phase: snapshot.phase,
    telemetry,
    timeS: snapshot.timeS,
    visual: summarizeCanvasPng(png),
  };
}

async function waitForSnapshot(page: Page, predicate: (snapshot: OceanPhysicsLiveSnapshot) => boolean, label: string): Promise<OceanPhysicsLiveSnapshot> {
  const deadline = Date.now() + timeoutMs;
  let lastSnapshot: OceanPhysicsLiveSnapshot | null = null;
  while (Date.now() < deadline) {
    lastSnapshot = await page.evaluate(() => window.__oceanPhysicsScenarioControls?.snapshot?.() ?? window.__oceanPhysicsSnapshot ?? null) as OceanPhysicsLiveSnapshot | null;
    if (lastSnapshot && predicate(lastSnapshot)) return lastSnapshot;
    await page.waitForTimeout(80);
  }
  throw new Error(`Timed out waiting for ${label}. Last snapshot:\n${JSON.stringify(lastSnapshot, null, 2)}`);
}

function summarizeCanvasPng(buffer: Buffer): SurfaceRecoveryVisualMetrics {
  const image = decodePngRgba(buffer);
  const startY = Math.floor(image.height * 0.38);
  const endY = Math.floor(image.height * 0.9);
  const stepX = Math.max(1, Math.floor(image.width / 96));
  const stepY = Math.max(1, Math.floor((endY - startY) / 64));
  let sampleCount = 0;
  let lumaSum = 0;
  let lumaSquareSum = 0;
  let brightCount = 0;
  let waterishCount = 0;
  const buckets = new Set<string>();
  for (let y = startY; y < endY; y += stepY) {
    for (let x = 0; x < image.width; x += stepX) {
      const index = (y * image.width + x) * 4;
      const r = image.data[index];
      const g = image.data[index + 1];
      const b = image.data[index + 2];
      const a = image.data[index + 3];
      if (a < 8) continue;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lumaSum += luma;
      lumaSquareSum += luma * luma;
      sampleCount += 1;
      if (luma > 190 && g > 150 && b > 130) brightCount += 1;
      if (g > b * 0.72 && b > 80) waterishCount += 1;
      buckets.add(`${Math.floor(r / 16)}-${Math.floor(g / 16)}-${Math.floor(b / 16)}`);
    }
  }
  const averageLuma = lumaSum / Math.max(1, sampleCount);
  const variance = lumaSquareSum / Math.max(1, sampleCount) - averageLuma * averageLuma;
  return {
    averageLuma,
    brightFraction: brightCount / Math.max(1, sampleCount),
    colorBuckets: buckets.size,
    height: image.height,
    lumaStdDev: Math.sqrt(Math.max(0, variance)),
    sampleCount,
    waterishFraction: waterishCount / Math.max(1, sampleCount),
    width: image.width,
  };
}

function decodePngRgba(buffer: Buffer): { data: Buffer; height: number; width: number } {
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", "expected PNG signature");
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const chunks: Buffer[] = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      assert.equal(data[8], 8, "only 8-bit PNG screenshots are supported");
      assert.ok(colorType === 2 || colorType === 6, "only RGB/RGBA PNG screenshots are supported");
    } else if (type === "IDAT") {
      chunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  const inflated = inflateSync(Buffer.concat(chunks));
  const sourceBytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * sourceBytesPerPixel;
  const unfiltered = Buffer.alloc(width * height * sourceBytesPerPixel);
  const output = Buffer.alloc(width * height * 4);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const row = inflated.subarray(inputOffset, inputOffset + stride);
    inputOffset += stride;
    const previousStart = (y - 1) * stride;
    const outputStart = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = row[x];
      const left = x >= sourceBytesPerPixel ? unfiltered[outputStart + x - sourceBytesPerPixel] : 0;
      const up = y > 0 ? unfiltered[previousStart + x] : 0;
      const upLeft = y > 0 && x >= sourceBytesPerPixel ? unfiltered[previousStart + x - sourceBytesPerPixel] : 0;
      unfiltered[outputStart + x] = unfilter(filter, raw, left, up, upLeft);
    }
    for (let x = 0; x < width; x += 1) {
      const source = outputStart + x * sourceBytesPerPixel;
      const target = (y * width + x) * 4;
      output[target] = unfiltered[source];
      output[target + 1] = unfiltered[source + 1];
      output[target + 2] = unfiltered[source + 2];
      output[target + 3] = colorType === 6 ? unfiltered[source + 3] : 255;
    }
  }
  return { data: output, height, width };
}

function unfilter(filter: number, raw: number, left: number, up: number, upLeft: number): number {
  switch (filter) {
    case 0:
      return raw;
    case 1:
      return (raw + left) & 255;
    case 2:
      return (raw + up) & 255;
    case 3:
      return (raw + Math.floor((left + up) / 2)) & 255;
    case 4:
      return (raw + paeth(left, up, upLeft)) & 255;
    default:
      throw new Error(`Unsupported PNG filter ${filter}`);
  }
}

function paeth(left: number, up: number, upLeft: number): number {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}
