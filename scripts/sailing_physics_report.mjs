import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const outPath = args.out ?? "reports/sailing-physics-latest.json";
const report = await runSailingPhysicsReport(args);

await writeJson(outPath, report);

if (report.decision.recommendation !== "integrated-oceanfield-sailing-v1") {
  throw new Error(`Sailing physics report failed: ${report.decision.reason}`);
}

console.log(`Sailing physics report written to ${outPath}`);
console.log(`- route: ${report.route.fromId}->${report.route.toId}, day ${report.route.day}, ${report.shipCases.length} ship cases`);
console.log(
  `- wake length ${rangeText(report.ranges.wakeLength)}, wake spread ${rangeText(report.ranges.wakeSpread)}, hull response ${rangeText(report.ranges.hullResponse)}`
);
console.log(
  `- clipper wake advantage ${report.comparisons.clipperWakeLengthAdvantage}, heavy spread advantage ${report.comparisons.heavyWakeSpreadAdvantage}`
);
console.log(`- decision: ${report.decision.recommendation}`);

async function runSailingPhysicsReport(parsedArgs) {
  const env = { ...process.env };
  if (parsedArgs.day) env.HARBORLINE_SAILING_PHYSICS_DAY = parsedArgs.day;
  if (parsedArgs.from) env.HARBORLINE_SAILING_PHYSICS_FROM = parsedArgs.from;
  if (parsedArgs.to) env.HARBORLINE_SAILING_PHYSICS_TO = parsedArgs.to;
  const output = await capture("npm", ["run", "--silent", "sailing:physics:json"], env);
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`Sailing physics report did not produce JSON. Output:\n${output}\n${error instanceof Error ? error.message : String(error)}`);
  }
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
