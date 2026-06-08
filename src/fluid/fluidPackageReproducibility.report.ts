import assert from "node:assert/strict";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { createFluidPackageReproducibilityReport } from "./fluidPackageReproducibility";
import type { FluidSustainedInteractionPacingReport } from "./fluidSustainedInteractionPacing";
// @ts-ignore The packaging helper is an ESM script module covered by scripts/electron_zip_cache.test.mjs.
import { electronZipFileName, findCachedElectronZip } from "../../scripts/electron_zip_cache.mjs";

const outPath = process.env.OCEAN_LAB_PACKAGE_REPRODUCIBILITY_OUT || "reports/fluid-package-reproducibility-latest.json";
const sustainedOutPath = process.env.OCEAN_LAB_PACKAGE_REPRODUCIBILITY_SUSTAINED_OUT || "reports/fluid-sustained-interaction-pacing-package-reproducibility.json";
const packageJson = await readJson<{ productName?: string; version: string }>("package.json");
const electronPackageJson = await readJson<{ version: string }>("node_modules/electron/package.json");
const productName = packageJson.productName ?? "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.arch;
const platform = "darwin" as const;
const releaseDir = path.resolve(
  process.env.OCEAN_LAB_PACKAGE_REPRODUCIBILITY_RELEASE_DIR || "/private/tmp/ocean-lab-package-reproducibility-release"
);
const appBundlePath = path.join(releaseDir, `${productName}-darwin-${arch}`, `${productName}.app`);
const cached = await findCachedElectronZip({
  arch,
  platform,
  version: electronPackageJson.version,
});

await rm(releaseDir, { force: true, recursive: true });
await run("node", ["scripts/package_mac.mjs"], { OCEAN_LAB_RELEASE_DIR: releaseDir });
await access(path.join(appBundlePath, "Contents", "MacOS", productName));
await run("npx", ["vite-node", "src/fluid/fluidSustainedInteractionPacing.report.ts"], {
  OCEAN_LAB_RELEASE_DIR: releaseDir,
  OCEAN_LAB_SUSTAINED_INTERACTION_OUT: sustainedOutPath,
});

const sustainedInteraction = await readJson<FluidSustainedInteractionPacingReport>(sustainedOutPath);
const report = createFluidPackageReproducibilityReport({
  appBundlePath,
  cache: {
    arch,
    cacheDirectory: cached?.directory ?? null,
    cacheHit: Boolean(cached),
    electronVersion: electronPackageJson.version,
    platform,
    zipFileName: electronZipFileName({ arch, platform, version: electronPackageJson.version }),
    zipPath: cached?.path ?? null,
  },
  generatedAt: new Date().toISOString(),
  productName,
  sustainedInteraction,
  version: packageJson.version,
});

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Fluid package reproducibility report written to ${outPath}`);
console.log(`- cached zip: ${report.package.cache.cacheHit ? report.package.cache.zipPath : "missing"}`);
console.log(`- package: ${report.package.appBundlePath}`);
console.log(
  `- sustained: ${report.sustainedInteraction.runtime.selection?.mode ?? "missing"} -> ${report.sustainedInteraction.runtime.selectedTier}, p95 ${report.sustainedInteraction.summary.p95FrameMs.toFixed(2)} ms, p99 ${report.sustainedInteraction.summary.p99FrameMs.toFixed(2)} ms`
);
assert.equal(report.gate, "G-FG-30", "FG-30 evidence must use the package reproducibility gate id");
assert.deepEqual(report.failures, [], `FG-30 failures:\n${report.failures.join("\n")}`);

async function run(command: string, args: string[], extraEnv: Record<string, string> = {}) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...extraEnv },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}
