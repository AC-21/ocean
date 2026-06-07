import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "docs/FLUID_GRID_REMAP.md",
  "docs/TRACKING.md",
  "docs/GITHUB_SETUP.md",
  ".github/ISSUE_TEMPLATE/fluid_grid_task.yml",
  ".github/ISSUE_TEMPLATE/fluid_grid_gate.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "src/fluid/fluidGridContract.ts",
];

const milestoneIds = ["FG-00", "FG-01", "FG-02", "FG-03", "FG-04", "FG-05", "FG-06"];
const gateIds = ["G-FG-00", "G-FG-01", "G-FG-02", "G-FG-03", "G-FG-04", "G-FG-05", "G-FG-06"];

function readRequired(filePath) {
  const absolutePath = path.join(root, filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required fluid remap file: ${filePath}`);
  }
  return fs.readFileSync(absolutePath, "utf8");
}

const files = new Map(requiredFiles.map((filePath) => [filePath, readRequired(filePath)]));
const tracking = files.get("docs/TRACKING.md") ?? "";
const remap = files.get("docs/FLUID_GRID_REMAP.md") ?? "";
const contract = files.get("src/fluid/fluidGridContract.ts") ?? "";
const taskTemplate = files.get(".github/ISSUE_TEMPLATE/fluid_grid_task.yml") ?? "";
const gateTemplate = files.get(".github/ISSUE_TEMPLATE/fluid_grid_gate.yml") ?? "";

const errors = [];

for (const milestoneId of milestoneIds) {
  if (!tracking.includes(`| ${milestoneId} |`)) errors.push(`docs/TRACKING.md is missing milestone row ${milestoneId}`);
  if (!contract.includes(`"${milestoneId}"`)) errors.push(`src/fluid/fluidGridContract.ts is missing ${milestoneId}`);
  if (!taskTemplate.includes("FG-XX-TXX")) errors.push("fluid_grid_task.yml is missing the task title convention");
}

for (const gateId of gateIds) {
  if (!tracking.includes(`| ${gateId} |`)) errors.push(`docs/TRACKING.md is missing gate row ${gateId}`);
  if (!contract.includes(`"${gateId}"`)) errors.push(`src/fluid/fluidGridContract.ts is missing ${gateId}`);
}

const requiredRemapPhrases = [
  "WebGPU-first fluid grid",
  "Canvas 2D can remain only as a legacy diagnostic",
  "navigator.gpu",
  "full-grid GPU readback every frame",
  "two-way coupling",
];

const normalizedRemap = remap.toLowerCase();
for (const phrase of requiredRemapPhrases) {
  if (!normalizedRemap.includes(phrase.toLowerCase())) errors.push(`docs/FLUID_GRID_REMAP.md is missing required phrase: ${phrase}`);
}

if (!tracking.includes("FG-00-T04") || !tracking.includes("Blocked")) {
  errors.push("docs/TRACKING.md must record the GitHub remote creation blocker");
}

if (!gateTemplate.includes("Production water path does not use Canvas 2D")) {
  errors.push("fluid_grid_gate.yml must preserve the no-primary-Canvas invariant");
}

if (errors.length > 0) {
  console.error("Fluid remap tracking check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Fluid remap tracking check passed: ${milestoneIds.length} milestones, ${gateIds.length} gates, ${requiredFiles.length} files.`);
