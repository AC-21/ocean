import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const requiredFiles = [
  "docs/FLUID_GRID_REMAP.md",
  "docs/TRACKING.md",
  "docs/GITHUB_SETUP.md",
  "docs/evidence/FG-01-fluid-capability-2026-06-07.json",
  "docs/evidence/FG-02-fluid-grid-benchmark-2026-06-07.json",
  "docs/evidence/FG-03-fluid-render-probe-2026-06-07.json",
  "docs/evidence/FG-04-fluid-coupling-2026-06-07.json",
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
const fg01Evidence = files.get("docs/evidence/FG-01-fluid-capability-2026-06-07.json") ?? "";
const fg02Evidence = files.get("docs/evidence/FG-02-fluid-grid-benchmark-2026-06-07.json") ?? "";
const fg03Evidence = files.get("docs/evidence/FG-03-fluid-render-probe-2026-06-07.json") ?? "";
const fg04Evidence = files.get("docs/evidence/FG-04-fluid-coupling-2026-06-07.json") ?? "";
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

if (!tracking.includes("FG-00-T04") || !tracking.includes("origin/main")) {
  errors.push("docs/TRACKING.md must record that the GitHub remote tracks origin/main");
}

if (!gateTemplate.includes("Production water path does not use Canvas 2D")) {
  errors.push("fluid_grid_gate.yml must preserve the no-primary-Canvas invariant");
}

if (!fg01Evidence.includes("\"status\": \"webgpu-ready\"") || !fg01Evidence.includes("\"selectedTier\": \"high\"")) {
  errors.push("FG-01 evidence must record a WebGPU-ready high-tier report");
}

if (!fg02Evidence.includes("\"gate\": \"G-FG-02\"") || !fg02Evidence.includes("\"pass\": true") || !fg02Evidence.includes("\"noFullGridReadbackPerFrame\": true")) {
  errors.push("FG-02 evidence must record a passing grid benchmark without per-frame full-grid readback");
}

if (!fg03Evidence.includes("\"gate\": \"G-FG-03\"") || !fg03Evidence.includes("\"renderer\": \"webgpu-grid-primary-v1\"") || !fg03Evidence.includes("\"waterContext\": \"webgpu\"")) {
  errors.push("FG-03 evidence must record WebGPU grid renderer telemetry");
}

if (
  !fg04Evidence.includes("\"gate\": \"G-FG-04\"") ||
  !fg04Evidence.includes("\"coupling\": \"object-grid-v1\"") ||
  !fg04Evidence.includes("\"boundedDiagnostics\": true") ||
  !fg04Evidence.includes("\"noFullGridReadbackPerFrame\": true")
) {
  errors.push("FG-04 evidence must record bounded WebGPU object-grid coupling telemetry without per-frame full-grid readback");
}

if (errors.length > 0) {
  console.error("Fluid remap tracking check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Fluid remap tracking check passed: ${milestoneIds.length} milestones, ${gateIds.length} gates, ${requiredFiles.length} files.`);
