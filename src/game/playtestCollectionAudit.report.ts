// @ts-nocheck
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { playtestCollectionAuditFor } from "./playtestCollectionAudit";

const args = parseArgs(process.argv.slice(2));
const historyPath = args.history ?? "release/playtest-handoff/playtest.history.v1.json";
const outPath = args.out ?? "reports/playtest-collection-latest.md";
const allowIncomplete = Boolean(args["allow-incomplete"]);

const raw = await readFile(historyPath, "utf8");
const audit = playtestCollectionAuditFor(raw, {
  generatedAt: new Date().toISOString(),
  sourcePath: historyPath,
});

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, `${audit.markdown.trimEnd()}\n`, "utf8");

console.log(`Playtest collection audit written to ${outPath}`);
console.log(`- status: ${audit.status}`);
console.log(`- sessions: ${audit.triage.readiness.label}`);
console.log(`- score quality: ${audit.triage.readiness.scoreQualityStatus}`);
console.log(`- release blockers: ${audit.triage.findings.filter((finding) => finding.classification === "release-blocker").length}`);
console.log(`- pass: ${audit.pass ? "yes" : "no"}`);

if (!audit.pass && !allowIncomplete) process.exitCode = 1;

function parseArgs(rawArgs: string[]) {
  const parsed: Record<string, string | boolean> = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = rawArgs[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
