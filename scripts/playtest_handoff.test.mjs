import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildPlaytestHandoff,
  handoffArchiveManifestFor,
  handoffScoreCategories,
  requiredHandoffScoreAverage,
  requiredHandoffSessions,
  validateHandoffArchiveManifest,
  verifyPlaytestHandoff,
} from "./playtest_handoff.mjs";

const temporaryRoots = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

describe("playtest handoff builder", () => {
  it("copies the packaged app and writes observer-ready handoff files", async () => {
    const root = await createFakeProject();
    const outputDir = path.join(root, "release", "playtest-handoff");
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "stale.txt"), "old", "utf8");

    const result = await buildPlaytestHandoff({
      appBundlePath: path.join("release", "Harborline-darwin-test", "Harborline.app"),
      generatedAt: "2026-06-07T20:30:00.000Z",
      outputDir: path.join("release", "playtest-handoff"),
      projectRoot: root,
    });

    expect(result.files).toEqual(["README.md", "collection-ledger.md", "handoff-manifest.json", "observer-checklist.md", "scorecard-template.md"]);
    expect(await readFile(path.join(result.appBundlePath, "Contents", "Info.plist"), "utf8")).toContain("Harborline");
    await expect(readFile(path.join(outputDir, "stale.txt"), "utf8")).rejects.toThrow();

    const readme = await readFile(path.join(result.outputDir, "README.md"), "utf8");
    expect(readme).toContain("Build: Harborline 0.1.0-test");
    expect(readme).toContain("Collect three qualified fresh-player sessions");
    expect(readme).toContain("collection-ledger.md");
    expect(readme).toContain("Do not coach route choices");
    expect(readme).toContain("Play as if I am not here");
    expect(readme).toContain("Collect files");
    expect(readme).toContain("playtest.latest.md");
    expect(readme).toContain("playtest.history.v1.json");
    expect(readme).toContain(handoffScoreCategories.join(", "));

    const checklist = await readFile(path.join(result.outputDir, "observer-checklist.md"), "utf8");
    expect(checklist).toContain("Play as if I am not here");
    expect(checklist).toContain("Collect files");
    expect(checklist).toContain("Click `Check` and fix every missing field.");
    expect(checklist).toContain("Click `Save` and confirm the status says the scorecard qualifies");
    expect(checklist).toContain("playtest.latest.md");
    expect(checklist).toContain("playtest.history.v1.json");
    expect(checklist).toContain("Update `collection-ledger.md`");
    expect(checklist).toContain(`Required unique qualified sessions: ${requiredHandoffSessions}`);
    expect(checklist).toContain(`Required average for release score categories: ${requiredHandoffScoreAverage}/5`);

    const ledger = await readFile(path.join(result.outputDir, "collection-ledger.md"), "utf8");
    expect(ledger).toContain("Harborline Playtest Collection Ledger");
    expect(ledger).toContain(`Required qualified sessions: ${requiredHandoffSessions}`);
    expect(ledger).toContain(`Required score average: ${requiredHandoffScoreAverage}/5`);
    expect(ledger).toContain("Session 1");
    expect(ledger).toContain("Session 2");
    expect(ledger).toContain("Session 3");
    expect(ledger).toContain("Score Gate Rollup");
    expect(ledger).toContain("Blocker candidate IDs");
    expect(ledger).toContain("playtest.latest.md");
    expect(ledger).toContain("playtest.history.v1.json");
    for (const category of handoffScoreCategories) expect(ledger).toContain(category);

    const scorecard = await readFile(path.join(result.outputDir, "scorecard-template.md"), "utf8");
    expect(scorecard).toContain("Harborline Playtest Scorecard");
    expect(scorecard).toContain("Observer script read before launch");
    expect(scorecard).toContain("Collected `playtest.latest.md` path");
    expect(scorecard).toContain("Score Quality Gate result after triage");

    const manifest = JSON.parse(await readFile(path.join(result.outputDir, "handoff-manifest.json"), "utf8"));
    expect(manifest).toMatchObject({
      appBundle: "Harborline.app",
      collectionLedger: "collection-ledger.md",
      generatedAt: "2026-06-07T20:30:00.000Z",
      productName: "Harborline",
      requiredSessions: requiredHandoffSessions,
      schema: 2,
      version: "0.1.0-test",
    });
    expect(manifest.scoreGate).toEqual({
      categories: handoffScoreCategories,
      requiredAverage: requiredHandoffScoreAverage,
    });
    await expect(verifyPlaytestHandoff({ outputDir: path.join("release", "playtest-handoff"), projectRoot: root })).resolves.toMatchObject({
      outputDir,
    });
  });

  it("rejects a handoff missing a required score gate field", async () => {
    const root = await createFakeProject();
    await buildPlaytestHandoff({
      appBundlePath: path.join("release", "Harborline-darwin-test", "Harborline.app"),
      generatedAt: "2026-06-07T20:30:00.000Z",
      outputDir: path.join("release", "playtest-handoff"),
      projectRoot: root,
    });
    await writeFile(path.join(root, "release", "playtest-handoff", "scorecard-template.md"), "# Broken Scorecard\n", "utf8");

    await expect(verifyPlaytestHandoff({ outputDir: path.join("release", "playtest-handoff"), projectRoot: root })).rejects.toThrow(
      /handoff scorecard template did not include/
    );
  });

  it("rejects a handoff missing a collection ledger session slot", async () => {
    const root = await createFakeProject();
    await buildPlaytestHandoff({
      appBundlePath: path.join("release", "Harborline-darwin-test", "Harborline.app"),
      generatedAt: "2026-06-07T20:30:00.000Z",
      outputDir: path.join("release", "playtest-handoff"),
      projectRoot: root,
    });
    await writeFile(
      path.join(root, "release", "playtest-handoff", "collection-ledger.md"),
      [
        "# Harborline Playtest Collection Ledger",
        "",
        "## Session Ledger",
        "",
        `- Required qualified sessions: ${requiredHandoffSessions}`,
        `- Required score average: ${requiredHandoffScoreAverage}/5`,
        "- Collection sentence: save the edited scorecard in Settings, then collect `playtest.latest.md`; if multiple sessions used the same app profile, collect `playtest.history.v1.json` too.",
        ...handoffScoreCategories,
        "Session 1",
        "Session 2",
        "",
      ].join("\n"),
      "utf8"
    );

    await expect(verifyPlaytestHandoff({ outputDir: path.join("release", "playtest-handoff"), projectRoot: root })).rejects.toThrow(
      /handoff collection ledger did not include Session 3/
    );
  });

  it("writes archive manifests with reproducible handoff proof metadata", () => {
    const manifest = handoffArchiveManifestFor({
      archivePath: "/tmp/project/release/Harborline-playtest-handoff-0.1.0-arm64.zip",
      bytes: 12345,
      createdAt: "2026-06-07T20:30:00.000Z",
      handoffDir: "/tmp/project/release/playtest-handoff",
      handoffManifest: {
        appBundle: "Harborline.app",
        collectionLedger: "collection-ledger.md",
        generatedAt: "2026-06-07T20:00:00.000Z",
        packageArch: "arm64",
        productName: "Harborline",
        requiredSessions: requiredHandoffSessions,
        schema: 2,
        scoreGate: {
          categories: handoffScoreCategories,
          requiredAverage: requiredHandoffScoreAverage,
        },
        version: "0.1.0",
      },
      projectRoot: "/tmp/project",
      sha256: "a".repeat(64),
    });

    expect(manifest).toMatchObject({
      archiveFile: "Harborline-playtest-handoff-0.1.0-arm64.zip",
      archivePath: "release/Harborline-playtest-handoff-0.1.0-arm64.zip",
      bytes: 12345,
      schema: 1,
      sha256: "a".repeat(64),
      sourceHandoff: "release/playtest-handoff",
    });
    expect(manifest.handoff).toMatchObject({
      collectionLedger: "collection-ledger.md",
      requiredSessions: requiredHandoffSessions,
      schema: 2,
      version: "0.1.0",
    });
    expect(validateHandoffArchiveManifest(manifest)).toEqual([]);
  });

  it("rejects archive manifests with broken checksums or score gates", () => {
    const manifest = handoffArchiveManifestFor({
      archivePath: "/tmp/project/release/Harborline-playtest-handoff-0.1.0-arm64.zip",
      bytes: 0,
      createdAt: "not-a-date",
      handoffDir: "/tmp/project/release/playtest-handoff",
      handoffManifest: {
        appBundle: "Harborline.app",
        collectionLedger: "collection-ledger.md",
        generatedAt: "2026-06-07T20:00:00.000Z",
        packageArch: "arm64",
        productName: "Harborline",
        requiredSessions: 1,
        schema: 1,
        scoreGate: {
          categories: ["Wrong"],
          requiredAverage: 2,
        },
        version: "0.1.0",
      },
      projectRoot: "/tmp/project",
      sha256: "not-a-hash",
    });

    expect(validateHandoffArchiveManifest(manifest)).toEqual(
      expect.arrayContaining([
        "bytes must be a positive number",
        "sha256 must be a 64-character lowercase hex digest",
        "createdAt must be an ISO timestamp",
        "handoff schema must be 2",
        "handoff requiredSessions must be 3",
        "handoff score average must be 4",
        "handoff score categories must match the release score gate",
      ])
    );
  });
});

async function createFakeProject() {
  const root = await mkdtemp(path.join(tmpdir(), "harborline-playtest-handoff-"));
  temporaryRoots.push(root);
  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ productName: "Harborline", version: "0.1.0-test" }, null, 2),
    "utf8"
  );
  await writeFile(
    path.join(root, "PLAYTEST_SCORECARD.md"),
    [
      "# Harborline Playtest Scorecard",
      "",
      "| Category | Score | Evidence |",
      "| --- | --- | --- |",
      ...handoffScoreCategories.map((category) => `| ${category} |  |  |`),
      "",
      "- Observer script read before launch: yes/no",
      "- Collected `playtest.latest.md` path:",
      "",
      "- Score Quality Gate result after triage:",
      "",
      "## Single Next Change",
      "",
    ].join("\n"),
    "utf8"
  );
  const appContents = path.join(root, "release", "Harborline-darwin-test", "Harborline.app", "Contents");
  await mkdir(appContents, { recursive: true });
  await writeFile(path.join(appContents, "Info.plist"), "<plist><string>Harborline</string></plist>", "utf8");
  return root;
}
