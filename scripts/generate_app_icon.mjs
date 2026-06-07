import { access, mkdir, readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const sourcePath = path.resolve("assets/app-icon.svg");
const outputPngPath = path.resolve("assets/app-icon.png");
const iconsetPath = path.resolve("assets/app-icon.iconset");
const icnsPath = path.resolve("assets/app-icon.icns");

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch (error) {
  throw new Error(
    `Playwright is required to render the app icon. Run npm install first. Original error: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
}

const svg = await readFile(sourcePath, "utf8");
const browser = await chromium.launch({
  args: ["--disable-dev-shm-usage"],
  executablePath: await browserExecutablePath(),
});

try {
  await rm(iconsetPath, { force: true, recursive: true });
  await mkdir(iconsetPath, { recursive: true });
  await renderPng(browser, svg, 1024, outputPngPath);

  const iconsetSizes = [
    ["icon_16x16.png", 16],
    ["icon_16x16@2x.png", 32],
    ["icon_32x32.png", 32],
    ["icon_32x32@2x.png", 64],
    ["icon_128x128.png", 128],
    ["icon_128x128@2x.png", 256],
    ["icon_256x256.png", 256],
    ["icon_256x256@2x.png", 512],
    ["icon_512x512.png", 512],
    ["icon_512x512@2x.png", 1024],
  ];
  for (const [fileName, size] of iconsetSizes) {
    await renderPng(browser, svg, size, path.join(iconsetPath, fileName));
  }
} finally {
  await browser.close();
}

if (process.platform === "darwin") {
  await run("iconutil", ["-c", "icns", "-o", icnsPath, iconsetPath]);
  console.log(`Generated app icon: ${path.relative(process.cwd(), icnsPath)}`);
} else {
  console.log(`Generated app icon PNGs in ${path.relative(process.cwd(), iconsetPath)}; ICNS generation is macOS-only.`);
}

async function renderPng(browser, svgText, size, outputPath) {
  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: size, height: size } });
  try {
    await page.setContent(
      `<!doctype html><html><head><style>html,body{margin:0;width:${size}px;height:${size}px;background:transparent;}img{width:${size}px;height:${size}px;display:block;}</style></head><body><img alt="" src="data:image/svg+xml;base64,${Buffer.from(
        svgText
      ).toString("base64")}"></body></html>`
    );
    await page.locator("img").waitFor({ state: "visible", timeout: 5_000 });
    await page.screenshot({ omitBackground: true, path: outputPath });
  } finally {
    await page.close();
  }
}

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

  throw new Error(`No browser executable found for app icon generation. Checked:\n${candidates.join("\n")}`);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
