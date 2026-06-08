import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { tmpdir } from "node:os";
import path from "node:path";

const timeoutMs = Number(process.env.OCEAN_LAB_FLUID_RENDER_TIMEOUT_MS || 30_000);
const root = process.cwd();
const outPath = process.env.OCEAN_LAB_FLUID_RENDER_OUT || "reports/fluid-render-probe-latest.json";
const executablePath = process.env.OCEAN_LAB_FLUID_RENDER_EXECUTABLE;
const useDefaultUserData = process.env.OCEAN_LAB_FLUID_RENDER_USER_DATA === "default";
const userDataRoot = useDefaultUserData ? null : await mkdtemp(path.join(tmpdir(), "ocean-lab-fluid-render-"));
const userDataPath = userDataRoot ? await realpath(userDataRoot) : null;

let electron;
try {
  ({ _electron: electron } = await import("playwright"));
} catch (error) {
  throw new Error(`Playwright is required for the fluid render probe. Original error: ${error instanceof Error ? error.message : String(error)}`);
}

let electronApp;
try {
  if (executablePath) await access(executablePath);
  electronApp = await electron.launch({
    ...(executablePath ? { executablePath } : { args: [root] }),
    env: {
      ...process.env,
      ...(userDataPath ? { HARBORLINE_USER_DATA_DIR: userDataPath } : {}),
    },
    timeout: timeoutMs,
  });

  const page = await electronApp.firstWindow({ timeout: timeoutMs });
  const consoleErrors = [];
  const webgpuValidationWarnings = [];
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() === "error") consoleErrors.push(text);
    if (message.type() === "warning" && /Invalid |storage buffers|CommandBuffer|ComputePipeline|BindGroupLayout/.test(text)) {
      webgpuValidationWarnings.push(text);
    }
  });

  await page.getByRole("heading", { name: "Physics ocean" }).waitFor({ state: "visible", timeout: timeoutMs });
  await page.waitForFunction(() => {
    const canvas = document.querySelector(".ocean-canvas");
    return Number(canvas?.getAttribute("data-water-frames") ?? 0) >= 6;
  }, undefined, { timeout: timeoutMs });

  await page.getByRole("button", { name: "Concrete cube" }).click({ timeout: timeoutMs });
  await page.getByRole("button", { name: "Drop" }).click({ timeout: timeoutMs });
  await page.waitForTimeout(350);

  const telemetry = await page.locator(".ocean-canvas").evaluate((canvas) => ({
    frames: Number(canvas.getAttribute("data-water-frames") ?? 0),
    grid: canvas.getAttribute("data-water-grid"),
    renderer: canvas.getAttribute("data-water-renderer"),
    status: canvas.getAttribute("data-water-status"),
    tier: canvas.getAttribute("data-water-tier"),
    waterContext: canvas.getAttribute("data-water-context"),
  }));
  assert.equal(telemetry.renderer, "webgpu-grid-primary-v1", "primary water renderer should be WebGPU grid");
  assert.equal(telemetry.waterContext, "webgpu", "primary water canvas should use a webgpu context");
  assert.notEqual(telemetry.renderer, "legacy-canvas-diagnostic-v1", "Canvas 2D must not be the primary water renderer");
  assert.ok(telemetry.frames >= 6, `expected at least 6 WebGPU frames, got ${telemetry.frames}`);

  const png = await page.locator(".ocean-canvas").screenshot({ timeout: timeoutMs });
  const summary = summarizePng(png);
  assert.equal(summary.status, "nonblank", "WebGPU canvas should not be blank");
  assert.equal(summary.variety, "varied", "WebGPU canvas should have varied pixels");
  assert.deepEqual(consoleErrors, [], `Electron console errors: ${consoleErrors.join("\n")}`);
  assert.deepEqual(webgpuValidationWarnings, [], `WebGPU validation warnings: ${webgpuValidationWarnings.join("\n")}`);

  const report = {
    generatedAt: new Date().toISOString(),
    gate: "G-FG-03",
    launchMode: executablePath ? "packaged-executable" : "electron-source",
    pass: true,
    pixelProbe: summary,
    telemetry,
    userData: userDataPath ? "temporary" : "default",
  };
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Fluid render probe written to ${outPath}`);
  console.log(`- renderer: ${telemetry.renderer}`);
  console.log(`- context: ${telemetry.waterContext}`);
  console.log(`- pixels: ${summary.status}/${summary.variety}, ${summary.colorBuckets} color buckets`);
} finally {
  if (electronApp) await electronApp.close().catch(() => undefined);
  if (userDataPath) await rm(userDataPath, { force: true, recursive: true });
}

function summarizePng(buffer) {
  const image = decodePngRgba(buffer);
  const samples = [];
  const stepX = Math.max(1, Math.floor(image.width / 64));
  const stepY = Math.max(1, Math.floor(image.height / 42));
  for (let y = 0; y < image.height; y += stepY) {
    for (let x = 0; x < image.width; x += stepX) {
      const index = (y * image.width + x) * 4;
      samples.push([image.data[index], image.data[index + 1], image.data[index + 2], image.data[index + 3]]);
    }
  }
  let opaqueSamples = 0;
  let lumaTotal = 0;
  const buckets = new Set();
  for (const [r, g, b, a] of samples) {
    if (a > 8) opaqueSamples += 1;
    lumaTotal += 0.2126 * r + 0.7152 * g + 0.0722 * b;
    buckets.add(`${Math.floor(r / 24)}-${Math.floor(g / 24)}-${Math.floor(b / 24)}-${Math.floor(a / 64)}`);
  }
  const averageLuma = lumaTotal / Math.max(1, samples.length);
  return {
    averageLuma,
    colorBuckets: buckets.size,
    height: image.height,
    opaqueSamples,
    samples: samples.length,
    status: opaqueSamples > samples.length * 0.92 && averageLuma > 5 ? "nonblank" : "blank",
    variety: buckets.size >= 18 ? "varied" : "flat",
    width: image.width,
  };
}

function decodePngRgba(buffer) {
  const signature = buffer.subarray(0, 8).toString("hex");
  assert.equal(signature, "89504e470d0a1a0a", "expected PNG signature");
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const chunks = [];
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
  const outputBytesPerPixel = 4;
  const stride = width * sourceBytesPerPixel;
  const unfiltered = Buffer.alloc(width * height * sourceBytesPerPixel);
  const output = Buffer.alloc(width * height * outputBytesPerPixel);
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
      const target = (y * width + x) * outputBytesPerPixel;
      output[target] = unfiltered[source];
      output[target + 1] = unfiltered[source + 1];
      output[target + 2] = unfiltered[source + 2];
      output[target + 3] = colorType === 6 ? unfiltered[source + 3] : 255;
    }
  }
  return { data: output, height, width };
}

function unfilter(filter, raw, left, up, upLeft) {
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

function paeth(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}
