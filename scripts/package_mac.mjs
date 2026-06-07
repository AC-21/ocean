import { access, copyFile, mkdir, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const appName = packageJson.productName ?? "Ocean Impact Lab";
const arch = process.env.OCEAN_LAB_PACKAGE_ARCH || process.env.HARBORLINE_PACKAGE_ARCH || process.arch;
const iconPath = path.resolve("assets/app-icon.icns");
const releaseDir = path.resolve("release");
const appBundlePath = path.resolve("release", `${appName}-darwin-${arch}`, `${appName}.app`);
const iconBundlePath = path.join(appBundlePath, "Contents", "Resources", "app-icon.icns");
const plistPath = path.join(appBundlePath, "Contents", "Info.plist");
const packagerBin = process.platform === "win32" ? "node_modules/.bin/electron-packager.cmd" : "node_modules/.bin/electron-packager";

await access("dist/index.html");
await access(iconPath);
await mkdir(releaseDir, { recursive: true });

await run(packagerBin, [
  ".",
  appName,
  "--platform=darwin",
  `--arch=${arch}`,
  "--out=release",
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
]);

await copyFile(iconPath, iconBundlePath);
await run("plutil", ["-replace", "CFBundleIconFile", "-string", "app-icon.icns", plistPath]);

console.log(`Packaged ${appName} at ${path.join("release", `${appName}-darwin-${arch}`, `${appName}.app`)}.`);

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
