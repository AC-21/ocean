import { describe, expect, it } from "vitest";
import { assemblePlaytestHistoryFromScorecards, serializePlaytestHistory } from "./playtestCollectionAssembly";
import { playtestCollectionAuditFor } from "./playtestCollectionAudit";

describe("playtest collection assembly", () => {
  it("turns separate scorecard markdown files into one auditable history", () => {
    const assembly = assemblePlaytestHistoryFromScorecards(
      [
        { markdown: scorecard("Session One"), savedAt: "2026-06-07T10:00:00.000Z", sourcePath: "session-one.md" },
        { markdown: scorecard("Session Two"), savedAt: "2026-06-07T11:00:00.000Z", sourcePath: "session-two.md" },
        { markdown: scorecard("Session Three"), savedAt: "2026-06-07T12:00:00.000Z", sourcePath: "session-three.md" },
      ],
      {
        generatedAt: "2026-06-07T20:30:00.000Z",
        sourcePath: "assembled history",
      }
    );

    expect(assembly.errors).toEqual([]);
    expect(assembly.history.entries).toHaveLength(3);
    expect(assembly.history.entries.map((entry) => entry.id)).toEqual(["assembled-1-session-one", "assembled-2-session-two", "assembled-3-session-three"]);
    expect(assembly.audit.status).toBe("ready-for-m026b");
    expect(assembly.audit.pass).toBe(true);

    const audit = playtestCollectionAuditFor(serializePlaytestHistory(assembly.history), {
      generatedAt: "2026-06-07T20:30:00.000Z",
      sourcePath: "assembled/playtest.history.v1.json",
    });
    expect(audit.status).toBe("ready-for-m026b");
    expect(audit.triage.readiness.label).toBe("3/3 unique qualified testers");
  });

  it("fails when a provided file is not a scorecard", () => {
    const assembly = assemblePlaytestHistoryFromScorecards(
      [
        { markdown: scorecard("Session One"), sourcePath: "session-one.md" },
        { markdown: "# Harborline Playtest Evidence Packet\n\n## Route Choice Read\n", sourcePath: "evidence.md" },
      ],
      {
        generatedAt: "2026-06-07T20:30:00.000Z",
      }
    );

    expect(assembly.errors).toContain("evidence.md is evidence, not a scorecard.");
    expect(assembly.audit.status).toBe("invalid-history");
    expect(assembly.audit.pass).toBe(false);
    expect(assembly.audit.markdown).toContain("- Status: invalid-history");
    expect(assembly.audit.markdown).toContain("evidence.md is evidence, not a scorecard.");
  });
});

function scorecard(title: string) {
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
    "- Could the tester launch without help: yes",
    "- Could the tester start a run without help: yes",
    "- Fresh console/runtime errors: 0",
    "",
    "## Core Scores",
    "",
    "| Category | Score | Evidence |",
    "| --- | --- | --- |",
    "| Route-choice speed | 4 | Chose a route quickly. |",
    "| Trade clarity | 4 | Understood buy/sell. |",
    "| Risk readability | 4 | Understood route risk. |",
    "| Addictive pull | 4 | Wanted one more route. |",
    "| Replay desire | 4 | Wanted another run. |",
    "",
    "## Friction Log",
    "",
    "| Time | Surface | What happened | Tester quote or behavior | Severity | Candidate task |",
    "| --- | --- | --- | --- | --- | --- |",
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
