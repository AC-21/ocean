import { spawn } from "node:child_process";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

await run("npm", ["run", "test"]);
await run("npm", ["run", "desktop:storage-smoke"]);
await run("npm", ["run", "assets:verify"]);
await run("npm", ["run", "build"]);
await smokeBuildArtifacts();
await run("npm", ["run", "browser:smoke"]);

console.log("\nVerification complete: tests, production build, artifact smoke, and browser regression smoke passed.");

async function smokeBuildArtifacts() {
  const htmlPath = path.resolve("dist/index.html");
  const html = await readFile(htmlPath, "utf8");
  assertIncludes(html, '<div id="root">', "dist HTML root");
  assertIncludes(html, 'data-testid="boot-screen"', "dist loading state");

  const htmlAssetPaths = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1]);
  if (!htmlAssetPaths.length) throw new Error("No JS/CSS assets found in dist HTML.");

  const assetDir = path.resolve("dist/assets");
  const assetPaths = (await readdir(assetDir))
    .filter((fileName) => /\.(?:js|css)$/.test(fileName))
    .map((fileName) => path.join("assets", fileName));
  if (!assetPaths.length) throw new Error("No built JS/CSS assets found in dist/assets.");

  for (const assetPath of assetPaths) {
    const filePath = path.resolve("dist", assetPath);
    const file = await stat(filePath);
    if (!file.isFile() || file.size <= 0) throw new Error(`Built asset is empty or missing: ${filePath}`);
  }

  console.log(`\nProduction artifact smoke passed (${assetPaths.length} assets).`);
}

async function run(command, args) {
  console.log(`\n$ ${[command, ...args].join(" ")}`);
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

function assertIncludes(value, expected, label) {
  if (!value.includes(expected)) throw new Error(`${label} did not include ${expected}`);
}
