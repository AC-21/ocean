import { describe, expect, it } from "vitest";
import { parseCollectedPlaytestHistory, playtestCollectionAuditFor } from "./playtestCollectionAudit";
import type { PlaytestArtifactHistory } from "./persistence";

describe("playtest collection audit", () => {
  it("rejects invalid history JSON before triage", () => {
    const audit = playtestCollectionAuditFor("{not-json", {
      generatedAt: "2026-06-07T20:30:00.000Z",
      sourcePath: "broken.json",
    });

    expect(audit.status).toBe("invalid-history");
    expect(audit.pass).toBe(false);
    expect(audit.markdown).toContain("History JSON could not be parsed");
    expect(audit.markdown).toContain("Fix the collected playtest history JSON before triage.");
  });

  it("keeps a partial collection in collecting status", () => {
    const audit = playtestCollectionAuditFor(historyJson([scorecard("Session One")]), {
      generatedAt: "2026-06-07T20:30:00.000Z",
      sourcePath: "playtest.history.v1.json",
    });

    expect(audit.status).toBe("collecting");
    expect(audit.pass).toBe(false);
    expect(audit.triage.readiness.label).toBe("1/3 unique qualified testers");
    expect(audit.markdown).toContain("Collect 2 more unique qualified fresh-player scorecard(s).");
  });

  it("fails the audit when the release score gate needs work", () => {
    const audit = playtestCollectionAuditFor(
      historyJson([
        scorecard("Session One", { riskReadability: 3 }),
        scorecard("Session Two", { riskReadability: 3 }),
        scorecard("Session Three", { riskReadability: 3 }),
      ])
    );

    expect(audit.status).toBe("score-needs-work");
    expect(audit.pass).toBe(false);
    expect(audit.triage.readiness.scoreQualityStatus).toBe("needs-work");
    expect(audit.markdown).toContain("| Risk readability | 3/5 | 3 | needs work |");
    expect(audit.markdown).toContain("Promote low-scoring release categories into M-026B");
  });

  it("fails the audit when qualified sessions contain release blockers", () => {
    const audit = playtestCollectionAuditFor(
      historyJson([
        scorecard("Session One", { launch: "no, macOS blocked launch" }),
        scorecard("Session Two"),
        scorecard("Session Three"),
      ])
    );

    expect(audit.status).toBe("release-blockers");
    expect(audit.pass).toBe(false);
    expect(audit.triage.findings.some((finding) => finding.classification === "release-blocker" && finding.surface === "Launch")).toBe(true);
    expect(audit.markdown).toContain("Promote release-blocker findings into RELEASE_BLOCKERS.md");
  });

  it("passes when three unique qualified sessions clear the score gate without release blockers", () => {
    const audit = playtestCollectionAuditFor(
      historyJson([scorecard("Session One"), scorecard("Session Two"), scorecard("Session Three")]),
      {
        generatedAt: "2026-06-07T20:30:00.000Z",
        sourcePath: "collected/playtest.history.v1.json",
      }
    );

    expect(audit.status).toBe("ready-for-m026b");
    expect(audit.pass).toBe(true);
    expect(audit.triage.readiness.label).toBe("3/3 unique qualified testers");
    expect(audit.triage.readiness.scoreQualityStatus).toBe("passing");
    expect(audit.markdown).toContain("Collection gate is ready for M-026B triage");
    expect(audit.markdown).toContain("## Triage Report");
  });

  it("normalizes valid entries and reports malformed entries", () => {
    const parsed = parseCollectedPlaytestHistory(
      JSON.stringify({
        schema: 1,
        entries: [
          { id: "ok", kind: "scorecard", markdown: scorecard("Session One"), savedAt: "2026-06-07T10:00:00.000Z", title: "Session One" },
          { id: "bad" },
        ],
      })
    );

    expect(parsed.history.entries).toHaveLength(1);
    expect(parsed.errors).toContain("Entry 2 must include non-empty markdown.");
  });
});

function historyJson(markdowns: string[]) {
  const history: PlaytestArtifactHistory = {
    entries: markdowns.map((markdown, index) => ({
      id: `playtest-${index + 1}`,
      kind: "scorecard",
      markdown,
      savedAt: `2026-06-07T1${index}:00:00.000Z`,
      title: markdown.match(/^#\s+(.+)$/m)?.[1] ?? `Session ${index + 1}`,
    })),
    schema: 1,
  };
  return JSON.stringify(history, null, 2);
}

function scorecard(
  title: string,
  {
    launch = "yes",
    riskReadability = 4,
  }: {
    launch?: string;
    riskReadability?: number;
  } = {}
) {
  return [
    `# ${title}`,
    "",
    "## Session Info",
    "",
    `- Tester: ${title} Tester`,
    "- Observer: Sasha",
    "- First-time player: yes",
    "- Device/display: MacBook",
    "- Input method: mouse",
    "",
    "## Launch And Setup",
    "",
    `- Could the tester launch without help: ${launch}`,
    "- Could the tester start a run without help: yes",
    "- Fresh console/runtime errors: 0",
    "",
    "## Core Scores",
    "",
    "| Category | Score | Evidence |",
    "| --- | --- | --- |",
    "| Route-choice speed | 4 | Chose a route quickly. |",
    "| Trade clarity | 4 | Understood buy/sell. |",
    `| Risk readability | ${riskReadability} | Understood route risk. |`,
    "| Addictive pull | 4 | Wanted one more route. |",
    "| Replay desire | 4 | Wanted another run. |",
    "",
    "## Required Observations",
    "",
    "- First confusing moment: Route margin read.",
    "- First fun spike: First profitable sale.",
    "- First one-more-route moment: After the first contract delivery.",
    "- First dead turn or pure wait: none",
    "",
    "## Decision",
    "",
    "- Promote",
    "",
    "## Single Next Change",
    "",
    "- Keep tuning the first route read.",
    "",
  ].join("\n");
}
