import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const handoffArchiveSchemaVersion = 1;
export const handoffSchemaVersion = 2;
export const requiredHandoffSessions = 3;
export const requiredHandoffScoreAverage = 4;
export const handoffScoreCategories = ["Route-choice speed", "Trade clarity", "Risk readability", "Addictive pull", "Replay desire"];

export async function buildPlaytestHandoff({
  appBundlePath,
  generatedAt = new Date().toISOString(),
  outputDir,
  projectRoot = process.cwd(),
} = {}) {
  const packageJsonPath = path.join(projectRoot, "package.json");
  const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
  const arch = process.env.HARBORLINE_PACKAGE_ARCH || process.arch;
  const sourceAppPath = path.resolve(projectRoot, appBundlePath ?? path.join("release", `Harborline-darwin-${arch}`, "Harborline.app"));
  const handoffDir = path.resolve(projectRoot, outputDir ?? path.join("release", "playtest-handoff"));
  const handoffAppPath = path.join(handoffDir, "Harborline.app");

  await readFile(path.join(sourceAppPath, "Contents", "Info.plist"), "utf8");
  await rm(handoffDir, { force: true, recursive: true });
  await mkdir(handoffDir, { recursive: true });
  await cp(sourceAppPath, handoffAppPath, { recursive: true });

  const manifest = {
    appBundle: "Harborline.app",
    collectionLedger: "collection-ledger.md",
    generatedAt,
    packageArch: arch,
    packageSource: path.relative(projectRoot, sourceAppPath),
    productName: packageJson.productName ?? "Harborline",
    requiredSessions: requiredHandoffSessions,
    scoreGate: {
      categories: handoffScoreCategories,
      requiredAverage: requiredHandoffScoreAverage,
    },
    schema: handoffSchemaVersion,
    version: packageJson.version,
  };

  const scorecardTemplate = await readFile(path.join(projectRoot, "PLAYTEST_SCORECARD.md"), "utf8");
  const files = {
    "README.md": handoffReadme(manifest),
    "collection-ledger.md": collectionLedger(manifest),
    "observer-checklist.md": observerChecklist(manifest),
    "scorecard-template.md": scorecardTemplate,
    "handoff-manifest.json": `${JSON.stringify(manifest, null, 2)}\n`,
  };

  await Promise.all(Object.entries(files).map(([fileName, contents]) => writeFile(path.join(handoffDir, fileName), contents, "utf8")));

  return {
    appBundlePath: handoffAppPath,
    files: Object.keys(files).sort(),
    manifest,
    outputDir: handoffDir,
  };
}

export async function verifyPlaytestHandoff({
  outputDir,
  projectRoot = process.cwd(),
} = {}) {
  const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
  const handoffDir = path.resolve(projectRoot, outputDir ?? path.join("release", "playtest-handoff"));
  const manifest = JSON.parse(await readFile(path.join(handoffDir, "handoff-manifest.json"), "utf8"));

  assertEqual(manifest.schema, handoffSchemaVersion, "handoff manifest schema");
  assertEqual(manifest.productName, packageJson.productName ?? "Harborline", "handoff manifest product name");
  assertEqual(manifest.version, packageJson.version, "handoff manifest version");
  assertEqual(manifest.requiredSessions, requiredHandoffSessions, "handoff manifest required sessions");
  assertEqual(manifest.scoreGate?.requiredAverage, requiredHandoffScoreAverage, "handoff manifest score average");
  assertArrayEqual(manifest.scoreGate?.categories ?? [], handoffScoreCategories, "handoff manifest score categories");
  assertEqual(manifest.appBundle, "Harborline.app", "handoff manifest app bundle");
  assertEqual(manifest.collectionLedger, "collection-ledger.md", "handoff manifest collection ledger");
  if (!Number.isFinite(Date.parse(manifest.generatedAt))) throw new Error("handoff manifest generatedAt is not an ISO timestamp");

  const appPath = path.join(handoffDir, manifest.appBundle);
  const appInfo = await stat(appPath);
  if (!appInfo.isDirectory()) throw new Error(`handoff app bundle is not a directory: ${appPath}`);
  const plist = await readFile(path.join(appPath, "Contents", "Info.plist"), "utf8");
  assertIncludes(plist, "Harborline", "handoff app Info.plist");

  const readme = await readFile(path.join(handoffDir, "README.md"), "utf8");
  assertIncludes(readme, `Build: ${manifest.productName} ${manifest.version}`, "handoff README");
  assertIncludes(readme, "Collect three qualified fresh-player sessions", "handoff README");
  assertIncludes(readme, "Do not coach route choices", "handoff README");
  assertIncludes(readme, "Play as if I am not here", "handoff README");
  assertIncludes(readme, "Collect files", "handoff README");
  assertIncludes(readme, "`playtest.latest.md`", "handoff README");
  assertIncludes(readme, "`playtest.history.v1.json`", "handoff README");
  assertIncludes(readme, `${requiredHandoffScoreAverage}/5`, "handoff README");
  assertIncludes(readme, "`collection-ledger.md`", "handoff README");

  const checklist = await readFile(path.join(handoffDir, "observer-checklist.md"), "utf8");
  assertIncludes(checklist, "Play as if I am not here", "handoff observer checklist");
  assertIncludes(checklist, "Collect files", "handoff observer checklist");
  assertIncludes(checklist, "Click `Check` and fix every missing field.", "handoff observer checklist");
  assertIncludes(checklist, "Click `Save` and confirm the status says the scorecard qualifies", "handoff observer checklist");
  assertIncludes(checklist, "`playtest.latest.md`", "handoff observer checklist");
  assertIncludes(checklist, "`playtest.history.v1.json`", "handoff observer checklist");
  assertIncludes(checklist, `Required unique qualified sessions: ${requiredHandoffSessions}`, "handoff observer checklist");
  assertIncludes(checklist, `Required average for release score categories: ${requiredHandoffScoreAverage}/5`, "handoff observer checklist");
  assertIncludes(checklist, "Update `collection-ledger.md`", "handoff observer checklist");

  const ledger = await readFile(path.join(handoffDir, manifest.collectionLedger), "utf8");
  assertIncludes(ledger, "## Session Ledger", "handoff collection ledger");
  assertIncludes(ledger, `Required qualified sessions: ${requiredHandoffSessions}`, "handoff collection ledger");
  assertIncludes(ledger, `Required score average: ${requiredHandoffScoreAverage}/5`, "handoff collection ledger");
  assertIncludes(ledger, "`playtest.latest.md`", "handoff collection ledger");
  assertIncludes(ledger, "`playtest.history.v1.json`", "handoff collection ledger");
  for (let session = 1; session <= requiredHandoffSessions; session += 1) {
    assertIncludes(ledger, `Session ${session}`, "handoff collection ledger");
  }
  for (const category of handoffScoreCategories) assertIncludes(ledger, category, "handoff collection ledger");

  const scorecard = await readFile(path.join(handoffDir, "scorecard-template.md"), "utf8");
  for (const category of handoffScoreCategories) assertIncludes(scorecard, `| ${category} |`, "handoff scorecard template");
  assertIncludes(scorecard, "Observer script read before launch", "handoff scorecard template");
  assertIncludes(scorecard, "Collected `playtest.latest.md` path", "handoff scorecard template");
  assertIncludes(scorecard, "Score Quality Gate result after triage", "handoff scorecard template");
  assertIncludes(scorecard, "Single Next Change", "handoff scorecard template");

  return {
    appBundlePath: appPath,
    manifest,
    outputDir: handoffDir,
  };
}

export async function archivePlaytestHandoff({
  archivePath,
  createdAt = new Date().toISOString(),
  outputDir,
  projectRoot = process.cwd(),
} = {}) {
  if (process.platform !== "darwin") throw new Error("Playtest handoff archive requires macOS ditto so Harborline.app is preserved as an app bundle.");
  const verified = await verifyPlaytestHandoff({ outputDir, projectRoot });
  const archiveFilePath = path.resolve(
    projectRoot,
    archivePath ?? path.join("release", `Harborline-playtest-handoff-${verified.manifest.version}-${verified.manifest.packageArch}.zip`)
  );
  await mkdir(path.dirname(archiveFilePath), { recursive: true });
  await rm(archiveFilePath, { force: true });
  await rm(`${archiveFilePath}.manifest.json`, { force: true });
  await run("ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", verified.outputDir, archiveFilePath]);

  const file = await stat(archiveFilePath);
  const manifest = handoffArchiveManifestFor({
    archivePath: archiveFilePath,
    bytes: file.size,
    createdAt,
    handoffDir: verified.outputDir,
    handoffManifest: verified.manifest,
    projectRoot,
    sha256: await sha256File(archiveFilePath),
  });
  const manifestPath = `${archiveFilePath}.manifest.json`;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const validationErrors = validateHandoffArchiveManifest(manifest);
  if (validationErrors.length) throw new Error(`Archive manifest failed validation: ${validationErrors.join("; ")}`);

  return {
    archivePath: archiveFilePath,
    manifest,
    manifestPath,
  };
}

export function handoffArchiveManifestFor({ archivePath, bytes, createdAt, handoffDir, handoffManifest, projectRoot = process.cwd(), sha256 }) {
  return {
    archiveFile: path.basename(archivePath),
    archivePath: path.relative(projectRoot, archivePath),
    bytes,
    createdAt,
    handoff: {
      appBundle: handoffManifest.appBundle,
      collectionLedger: handoffManifest.collectionLedger,
      generatedAt: handoffManifest.generatedAt,
      packageArch: handoffManifest.packageArch,
      productName: handoffManifest.productName,
      requiredSessions: handoffManifest.requiredSessions,
      schema: handoffManifest.schema,
      scoreGate: handoffManifest.scoreGate,
      version: handoffManifest.version,
    },
    schema: handoffArchiveSchemaVersion,
    sha256,
    sourceHandoff: path.relative(projectRoot, handoffDir),
  };
}

export function validateHandoffArchiveManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return ["archive manifest must be an object"];
  if (manifest.schema !== handoffArchiveSchemaVersion) errors.push(`schema must be ${handoffArchiveSchemaVersion}`);
  if (typeof manifest.archiveFile !== "string" || !manifest.archiveFile.endsWith(".zip")) errors.push("archiveFile must name a zip file");
  if (typeof manifest.archivePath !== "string" || !manifest.archivePath.endsWith(".zip")) errors.push("archivePath must point to a zip file");
  if (!Number.isFinite(manifest.bytes) || manifest.bytes <= 0) errors.push("bytes must be a positive number");
  if (typeof manifest.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(manifest.sha256)) errors.push("sha256 must be a 64-character lowercase hex digest");
  if (!Number.isFinite(Date.parse(manifest.createdAt))) errors.push("createdAt must be an ISO timestamp");
  if (typeof manifest.sourceHandoff !== "string" || !manifest.sourceHandoff) errors.push("sourceHandoff must be present");
  const handoff = manifest.handoff;
  if (!handoff || typeof handoff !== "object" || Array.isArray(handoff)) {
    errors.push("handoff summary must be present");
  } else {
    if (handoff.schema !== handoffSchemaVersion) errors.push(`handoff schema must be ${handoffSchemaVersion}`);
    if (handoff.requiredSessions !== requiredHandoffSessions) errors.push(`handoff requiredSessions must be ${requiredHandoffSessions}`);
    if (handoff.scoreGate?.requiredAverage !== requiredHandoffScoreAverage) errors.push(`handoff score average must be ${requiredHandoffScoreAverage}`);
    const categories = handoff.scoreGate?.categories ?? [];
    if (!Array.isArray(categories) || categories.length !== handoffScoreCategories.length || categories.some((value, index) => value !== handoffScoreCategories[index])) {
      errors.push("handoff score categories must match the release score gate");
    }
  }
  return errors;
}

function handoffReadme(manifest) {
  return [
    "# Harborline Playtest Handoff",
    "",
    `Generated: ${manifest.generatedAt}`,
    `Build: ${manifest.productName} ${manifest.version} (${manifest.packageArch})`,
    "",
    "## What Is In This Folder",
    "",
    "- `Harborline.app`: the exact packaged desktop build for the session.",
    "- `collection-ledger.md`: the three-session collection tracker for observer notes and artifact status.",
    "- `observer-checklist.md`: the order of operations for running a no-coaching playtest.",
    "- `scorecard-template.md`: the canonical scorecard fields the in-app draft must satisfy.",
    "- `handoff-manifest.json`: machine-readable proof of build version, score gate, and required sessions.",
    "",
    "## Session Goal",
    "",
    "Collect three qualified fresh-player sessions from unique testers. A session only counts when the tester launches the packaged app without developer help, starts a run, reaches a finish or failure, and the observer saves an edited in-app Playtest Scorecard that qualifies in Settings.",
    "",
    "## Release Gate",
    "",
    `The three qualified sessions must average at least ${manifest.scoreGate.requiredAverage}/5 for each release score category: ${manifest.scoreGate.categories.join(", ")}.`,
    "",
    "## Observer Rule",
    "",
    "Do not coach route choices, market choices, upgrades, or recovery decisions. If the player asks what to do, record the question and ask what they would try next.",
    "",
    "Before launch, say: \"Play as if I am not here. Talk aloud when useful. If you are unsure, say what you are thinking and choose what you would try next. I can only help if the app will not launch, input is broken, or you cannot continue because of a bug.\"",
    "",
    "Allowed help is limited to OS launch/security friction, broken input, crash/blocking bugs, and clarifying scorecard fields after play ends.",
    "",
    "## Collection Rule",
    "",
    "At the end of the session, open Settings, generate or review the Playtest Scorecard, fill the required fields, click `Check`, then click `Save`. The Save confirmation must say the scorecard qualifies for M-026A. Generate the Playtest Triage Report after saving, but do not count the triage report itself as a scorecard.",
    "",
    "Collection sentence: save the edited scorecard in Settings, then collect `playtest.latest.md`; if multiple sessions used the same app profile, collect `playtest.history.v1.json` too, otherwise collect each session's `playtest.latest.md` and assemble them.",
    "",
    "Use the `Collect files` strip in Playtest Evidence for the exact latest-scorecard and history targets for the current runtime.",
    "",
  ].join("\n");
}

function observerChecklist(manifest) {
  return [
    "# Harborline Observer Checklist",
    "",
    "## Before The Tester Arrives",
    "",
    "- Open `Harborline.app` from this folder once to confirm macOS allows it to launch.",
    "- Start from a clean run unless a documented seed/save file is part of the test.",
    "- Keep this checklist and `scorecard-template.md` visible outside the game.",
    "- Prepare this script: \"Play as if I am not here. Talk aloud when useful. If you are unsure, say what you are thinking and choose what you would try next. I can only help if the app will not launch, input is broken, or you cannot continue because of a bug.\"",
    "- Do not pre-explain market strategy, route safety, upgrades, politics, or recovery options.",
    "",
    "## During The Session",
    "",
    "- Read the observer script, then ask the tester to launch the app and start a run without coaching.",
    "- If the tester asks what to do next, record the question and ask what they would try next.",
    "- Record the first route decision and how long it takes them to choose.",
    "- Record exact quotes for confusion, excitement, distrust, and one-more-route desire.",
    "- Let bad outcomes happen unless the app is blocked or broken.",
    "- Watch for dead turns, unclear risk, ignored upgrades, and any dominant autopilot route.",
    "",
    "## Required End-Of-Session Steps",
    "",
    "1. Open Settings.",
    "2. Generate a Playtest Evidence packet if one is not already present.",
    "3. Generate or edit the Playtest Scorecard draft.",
    "4. Fill tester, observer, first-time player, all core scores, required observations, and Single Next Change.",
    "5. Click `Check` and fix every missing field.",
    "6. Click `Save` and confirm the status says the scorecard qualifies for `M-026A`.",
    "7. Confirm the readiness card shows progress toward unique qualified testers.",
    "8. Generate the Playtest Triage Report after the scorecard is saved.",
    "9. Use the `Collect files` strip in Playtest Evidence to collect `playtest.latest.md`; if multiple sessions used this app profile, also collect `playtest.history.v1.json`.",
    "10. Update `collection-ledger.md` with qualification status, artifact paths, score gate notes, and blocker candidates.",
    "",
    "## Qualification Gate",
    "",
    `- Required unique qualified sessions: ${manifest.requiredSessions}`,
    `- Required average for release score categories: ${manifest.scoreGate.requiredAverage}/5`,
    ...manifest.scoreGate.categories.map((category) => `- ${category}`),
    "",
    "## Artifact Collection",
    "",
    "- Collection sentence: save the edited scorecard in Settings, then collect `playtest.latest.md`; if multiple sessions used the same app profile, collect `playtest.history.v1.json` too.",
    "- Use the `Collect files` strip in Playtest Evidence for the exact latest-scorecard and history targets.",
    "- Collect the tester name or alias, device/display, and input method.",
    "- For separate tester machines, collect each returned `playtest.latest.md` and assemble them with `npm run playtest:collection:assemble`.",
    "- Keep any screenshots, videos, save files, runtime notes, or console notes referenced by the scorecard.",
    "- If the app fails to launch or crashes, preserve the runtime notes and mark the session as a blocker candidate.",
    "",
  ].join("\n");
}

function collectionLedger(manifest) {
  const sessionRows = Array.from({ length: manifest.requiredSessions }, (_, index) => {
    const sessionNumber = index + 1;
    return `| Session ${sessionNumber} |  |  |  |  |  |  |  |  |  |  |`;
  });
  return [
    "# Harborline Playtest Collection Ledger",
    "",
    `Generated: ${manifest.generatedAt}`,
    `Build: ${manifest.productName} ${manifest.version} (${manifest.packageArch})`,
    "",
    "## Gate Summary",
    "",
    `- Required qualified sessions: ${manifest.requiredSessions}`,
    `- Required score average: ${manifest.scoreGate.requiredAverage}/5`,
    `- Release score categories: ${manifest.scoreGate.categories.join(", ")}`,
    "- Counting rule: only unique fresh-player scorecards that Settings marks qualified count toward M-026A.",
    "- Collection sentence: save the edited scorecard in Settings, then collect `playtest.latest.md`; if multiple sessions used the same app profile, collect `playtest.history.v1.json` too.",
    "- Separate-machine rule: collect each returned `playtest.latest.md` and assemble them with `npm run playtest:collection:assemble` before audit.",
    "",
    "## Session Ledger",
    "",
    "| Slot | Tester alias | Observer | Device/display | Qualified in Settings? | Scorecard saved? | Evidence packet attached? | Triage generated? | Artifact path or note | Score gate concern | Blocker candidate IDs |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...sessionRows,
    "",
    "## Score Gate Rollup",
    "",
    "| Category | Session 1 | Session 2 | Session 3 | Average | Passes 4/5? | Notes |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...manifest.scoreGate.categories.map((category) => `| ${category} |  |  |  |  |  |  |`),
    "",
    "## Collection Closeout",
    "",
    "- Three unique qualified scorecards archived:",
    "- All required release score categories average at least 4/5:",
    "- Playtest Triage Report generated after the third qualified scorecard:",
    "- `RELEASE_BLOCKERS.md` updated with S0/S1 findings:",
    "- Any accepted known issues recorded:",
    "",
  ].join("\n");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label} expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
}

function assertArrayEqual(actual, expected, label) {
  if (!Array.isArray(actual) || actual.length !== expected.length || actual.some((value, index) => value !== expected[index])) {
    throw new Error(`${label} expected ${JSON.stringify(expected)} but received ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(value, expected, label) {
  if (!value.includes(expected)) throw new Error(`${label} did not include ${expected}`);
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

async function sha256File(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] ?? "build";
  if (mode === "verify") {
    const result = await verifyPlaytestHandoff();
    console.log(`Playtest handoff verified at ${path.relative(process.cwd(), result.outputDir)}.`);
  } else if (mode === "archive") {
    const result = await archivePlaytestHandoff();
    console.log(`Playtest handoff archive written to ${path.relative(process.cwd(), result.archivePath)}.`);
    console.log(`Archive manifest written to ${path.relative(process.cwd(), result.manifestPath)}.`);
    console.log(`SHA-256: ${result.manifest.sha256}`);
  } else {
    const result = await buildPlaytestHandoff();
    console.log(`Playtest handoff written to ${path.relative(process.cwd(), result.outputDir)}.`);
    console.log(`Included: ${result.files.join(", ")}, Harborline.app`);
  }
}
