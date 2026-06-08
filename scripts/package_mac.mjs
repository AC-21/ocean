import { access, copyFile, mkdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { electronZipDirArgs } from "./electron_zip_cache.mjs";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const electronPackageJson = JSON.parse(await readFile("node_modules/electron/package.json", "utf8"));
const appName = packageJson.productName ?? "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.env.HARBORLINE_PACKAGE_ARCH || process.arch;
const platform = "darwin";
const iconPath = path.resolve("assets/app-icon.icns");
const releaseDir = path.resolve(process.env.OCEAN_LAB_RELEASE_DIR || "release");
const appBundlePath = path.join(releaseDir, `${appName}-darwin-${arch}`, `${appName}.app`);
const iconBundlePath = path.join(appBundlePath, "Contents", "Resources", "app-icon.icns");
const plistPath = path.join(appBundlePath, "Contents", "Info.plist");
const packagerBin = process.platform === "win32" ? "node_modules/.bin/electron-packager.cmd" : "node_modules/.bin/electron-packager";

await access("dist/index.html");
await access(iconPath);
await mkdir(releaseDir, { recursive: true });

const localElectronZip = await electronZipDirArgs({
  arch,
  platform,
  version: electronPackageJson.version,
});
if (localElectronZip.cached) {
  console.log(`Using cached Electron zip: ${localElectronZip.cached.path}`);
} else {
  console.log(`No cached Electron zip found for Electron ${electronPackageJson.version} ${platform}-${arch}; Packager may download it.`);
}

await run(packagerBin, [
  ".",
  appName,
  `--platform=${platform}`,
  `--arch=${arch}`,
  `--out=${releaseDir}`,
  "--overwrite",
  "--prune=true",
  "--asar",
  "--app-bundle-id=com.oceanimpactlab.simulator",
  "--app-category-type=public.app-category.education",
  `--app-version=${packageJson.version}`,
  `--build-version=${packageJson.version}`,
  `--executable-name=${appName}`,
  "--ignore=^/release($|/)",
  "--ignore=^/reports($|/)",
  "--ignore=^/src($|/)",
  "--ignore=^/assets/concepts($|/)",
  "--ignore=^/assets/generated/raw($|/)",
  "--ignore=^/node_modules/\\.vite($|/)",
  ...localElectronZip.args,
]);

await copyFile(iconPath, iconBundlePath);
await run("plutil", ["-replace", "CFBundleIconFile", "-string", "app-icon.icns", plistPath]);
await run("xattr", ["-cr", appBundlePath]);
await run("codesign", ["--force", "--deep", "--sign", "-", appBundlePath]);

const printedAppBundlePath = appBundlePath.startsWith(`${process.cwd()}${path.sep}`) ? path.relative(process.cwd(), appBundlePath) : appBundlePath;
console.log(`Packaged ${appName} at ${printedAppBundlePath}.`);

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}
