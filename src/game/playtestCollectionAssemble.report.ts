// @ts-nocheck
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { assemblePlaytestHistoryFromScorecards, serializePlaytestHistory } from "./playtestCollectionAssembly";

const args = parseArgs(process.argv.slice(2));
const scorecardPaths = valuesFor(args.scorecard);
const outPath = stringValue(args.out, "reports/playtest-collection-history.v1.json");
const auditOutPath = stringValue(args["audit-out"], "");
const allowIncomplete = Boolean(args["allow-incomplete"]);

if (!scorecardPaths.length) {
  console.error("At least one --scorecard path is required.");
  process.exit(1);
}

const sources = await Promise.all(
  scorecardPaths.map(async (scorecardPath) => {
    const file = await stat(scorecardPath);
    return {
      markdown: await readFile(scorecardPath, "utf8"),
      savedAt: file.mtime.toISOString(),
      sourcePath: scorecardPath,
    };
  })
);

const assembly = assemblePlaytestHistoryFromScorecards(sources, {
  generatedAt: new Date().toISOString(),
  sourcePath: scorecardPaths.join(", "),
});

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, serializePlaytestHistory(assembly.history), "utf8");

if (auditOutPath) {
  await mkdir(path.dirname(auditOutPath), { recursive: true });
  await writeFile(auditOutPath, `${assembly.audit.markdown.trimEnd()}\n`, "utf8");
}

console.log(`Playtest history assembled at ${outPath}`);
console.log(`- scorecard files: ${scorecardPaths.length}`);
console.log(`- scorecard entries: ${assembly.history.entries.length}`);
console.log(`- audit status: ${assembly.audit.status}`);
console.log(`- sessions: ${assembly.audit.triage.readiness.label}`);
console.log(`- score quality: ${assembly.audit.triage.readiness.scoreQualityStatus}`);
console.log(`- pass: ${assembly.audit.pass ? "yes" : "no"}`);
if (auditOutPath) console.log(`- audit report: ${auditOutPath}`);
if (assembly.errors.length) console.log(`- assembly errors: ${assembly.errors.join("; ")}`);

if (!assembly.audit.pass && !allowIncomplete) process.exitCode = 1;

function parseArgs(rawArgs: string[]) {
  const parsed: Record<string, string | string[] | boolean> = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = rawArgs[index + 1];
    const value = !next || next.startsWith("--") ? true : next;
    if (value !== true) index += 1;
    const current = parsed[key];
    if (current === undefined) parsed[key] = value;
    else if (Array.isArray(current)) current.push(String(value));
    else parsed[key] = [String(current), String(value)];
  }
  return parsed;
}

function valuesFor(value: string | string[] | boolean | undefined) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return [];
}

function stringValue(value: string | string[] | boolean | undefined, fallback: string) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[value.length - 1] ?? fallback;
  return fallback;
}
