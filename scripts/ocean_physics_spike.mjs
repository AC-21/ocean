import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const days = positiveInteger(args.days ?? process.env.HARBORLINE_OCEAN_PHYSICS_DAYS, 60);
const outPath = args.out ?? "reports/ocean-physics-spike-latest.json";
const benchmarkPath = args.benchmark ?? "reports/ocean-benchmark-latest.json";

const report = await runOceanPhysicsSpike(days);
report.gpuCost = await readGpuCost(benchmarkPath);
if (report.decision.recommendation === "continue-pixi-first" && report.gpuCost.status !== "passed") {
  report.decision = {
    recommendation: "needs-engine-spike",
    reason: `Ocean physics signals passed, but GPU cost proof is ${report.gpuCost.status}; run npm run ocean:benchmark before accepting the production decision.`,
  };
}

await writeJson(outPath, report);

console.log(`Ocean physics spike written to ${outPath}`);
console.log(
  `- ${report.routeCount} routes across ${report.dayCount} days, ${report.waveSampling.samples} route/day samples, field ${report.oceanFieldId}`
);
console.log(
  `- wave ranges: beam ${rangeText(report.waveSampling.beamSeaRange)}, slam ${rangeText(report.waveSampling.cargoSlamRange)}, following ${rangeText(report.waveSampling.followingSeaRange)}, peak ${rangeText(report.waveSampling.peakWaveHeightRange)}`
);
console.log(
  `- ship response lift ${report.shipResponse.responseLift}, cargo slam route ${report.cargoSlamEffect.route} day ${report.cargoSlamEffect.day}, loaded cargo risk ${report.cargoSlamEffect.loadedCargoRisk}`
);
console.log(`- GPU cost ${report.gpuCost.status}${report.gpuCost.minAverageFps === null ? "" : `, min avg ${report.gpuCost.minAverageFps} FPS`}`);
console.log(`- decision: ${report.decision.recommendation}`);

async function runOceanPhysicsSpike(daysToSample) {
  const output = await capture("npm", ["run", "--silent", "ocean:physics-spike:json"], {
    ...process.env,
    HARBORLINE_OCEAN_PHYSICS_DAYS: String(daysToSample),
  });
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Ocean physics spike did not produce JSON. Output:\n${output}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

async function readGpuCost(filePath) {
  try {
    const benchmark = JSON.parse(await readFile(filePath, "utf8"));
    const results = Array.isArray(benchmark.results) ? benchmark.results : [];
    const cases = results.map((result) => ({
      id: String(result.id ?? "unknown"),
      averageFps: Number(result.renderFpsAvg ?? 0),
      minAverageFps: Number(result.minAverageFps ?? 0),
      renderer: String(result.waterRenderer ?? "unknown"),
    }));
    const minAverageFps = cases.length ? Math.min(...cases.map((entry) => entry.averageFps)) : null;
    const passedCases = cases.length > 0 && cases.every((entry) => entry.averageFps >= entry.minAverageFps && entry.renderer !== "unknown");
    const lowPowerCheaper = lowPowerPairCheaper(results, "default-desktop", "low-power") && lowPowerPairCheaper(results, "compact-desktop", "compact-low-power");
    return {
      source: filePath,
      status: passedCases && lowPowerCheaper ? "passed" : "failed",
      minAverageFps,
      lowPowerCheaper,
      cases,
    };
  } catch {
    return {
      source: filePath,
      status: "missing",
      minAverageFps: null,
      lowPowerCheaper: null,
      cases: [],
    };
  }
}

function lowPowerPairCheaper(results, shaderId, lowPowerId) {
  const shader = results.find((result) => result.id === shaderId);
  const lowPower = results.find((result) => result.id === lowPowerId);
  if (!shader || !lowPower) return false;
  return (
    String(shader.waterRenderer) === "shader-mesh-v2" &&
    String(lowPower.waterRenderer) === "low-power-graphics-v2" &&
    Number(lowPower.renderScale) < Number(shader.renderScale) &&
    Number(lowPower.pixelColors) <= Number(shader.pixelColors)
  );
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = rawArgs[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
}

async function capture(command, commandArgs, env) {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`${command} ${commandArgs.join(" ")} exited with ${code}\n${stderr || stdout}`));
    });
  });
}

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function rangeText(range) {
  return `${range.min}..${range.max}`;
}
