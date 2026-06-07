import { describe, expect, it } from "vitest";
import { playtestReadinessFor } from "./playtestReadiness";
import type { PlaytestArtifactHistory } from "./persistence";

describe("playtest readiness", () => {
  it("keeps the external validation gate pending before any scorecards are archived", () => {
    const readiness = playtestReadinessFor(historyWith([]));

    expect(readiness.status).toBe("not-started");
    expect(readiness.label).toBe("0/3 unique qualified testers");
    expect(readiness.remainingSessions).toBe(3);
    expect(readiness.detail).toContain("Need 3 completed fresh-player scorecards from unique testers");
  });

  it("reports remaining scorecards while sessions are being collected", () => {
    const readiness = playtestReadinessFor(
      historyWith([
        ["playtest-1", "Session One", "2026-06-07T10:00:00.000Z"],
        ["playtest-2", "Session Two", "2026-06-07T11:00:00.000Z"],
      ])
    );

    expect(readiness.status).toBe("collecting");
    expect(readiness.label).toBe("2/3 unique qualified testers");
    expect(readiness.remainingSessions).toBe(1);
    expect(readiness.latestTitle).toBe("Session Two");
    expect(readiness.latestSavedAt).toBe("2026-06-07T11:00:00.000Z");
    expect(readiness.detail).toBe("1 more unique tester scorecard needed for M-026A.");
  });

  it("marks the archive ready for triage once the session threshold is met", () => {
    const readiness = playtestReadinessFor(
      historyWith([
        ["playtest-1", "Session One", "2026-06-07T10:00:00.000Z"],
        ["playtest-2", "Session Two", "2026-06-07T11:00:00.000Z"],
        ["playtest-3", "Session Three", "2026-06-07T12:00:00.000Z"],
        ["playtest-4", "Extra Session", "2026-06-07T13:00:00.000Z"],
      ])
    );

    expect(readiness.status).toBe("ready-for-triage");
    expect(readiness.label).toBe("3/3 unique qualified testers");
    expect(readiness.remainingSessions).toBe(0);
    expect(readiness.latestTitle).toBe("Extra Session");
    expect(readiness.detail).toContain("Ready for M-026B triage");
    expect(readiness.scoreQualityStatus).toBe("passing");
    expect(readiness.scoreQualityLabel).toBe("Score Gate Passing");
  });

  it("flags ready archives whose release-score averages miss the 4 out of 5 bar", () => {
    const readiness = playtestReadinessFor(
      historyWith(
        [
          ["playtest-1", "Session One", "2026-06-07T10:00:00.000Z"],
          ["playtest-2", "Session Two", "2026-06-07T11:00:00.000Z"],
          ["playtest-3", "Session Three", "2026-06-07T12:00:00.000Z"],
        ],
        { riskReadabilityScore: 3 }
      )
    );

    expect(readiness.status).toBe("ready-for-triage");
    expect(readiness.scoreQualityStatus).toBe("needs-work");
    expect(readiness.scoreQualityLabel).toBe("Score Gate Needs Work");
    expect(readiness.scoreQualityDetail).toContain("Risk readability averages 3/5");
    expect(readiness.scoreAverages.find((entry) => entry.category === "Risk readability")?.passes).toBe(false);
  });

  it("does not count saved evidence packets or triage reports as fresh-player scorecards", () => {
    const history = historyWith([["playtest-1", "Session One", "2026-06-07T10:00:00.000Z"]]);
    history.entries.push({
      id: "triage-1",
      kind: "triage",
      markdown: "# Harborline Playtest Triage Report\n",
      savedAt: "2026-06-07T11:00:00.000Z",
      title: "Harborline Playtest Triage Report",
    });

    const readiness = playtestReadinessFor(history);

    expect(readiness.status).toBe("collecting");
    expect(readiness.label).toBe("1/3 unique qualified testers");
    expect(readiness.latestTitle).toBe("Session One");
  });

  it("does not qualify blank generated scorecards without fresh-player evidence", () => {
    const history = historyWith([["playtest-1", "Blank Draft", "2026-06-07T10:00:00.000Z"]], { blank: true });

    const readiness = playtestReadinessFor(history);

    expect(readiness.status).toBe("not-started");
    expect(readiness.archivedScorecards).toBe(1);
    expect(readiness.qualifiedSessions).toBe(0);
    expect(readiness.disqualifiedScorecards).toBe(1);
    expect(readiness.label).toBe("0/3 unique qualified testers");
    expect(readiness.detail).toContain("1 archived scorecard still needs observer fields");
    expect(readiness.qualifications[0].missing).toContain("first-time player yes");
    expect(readiness.qualifications[0].missing).toContain("Route-choice speed score");
  });

  it("does not count duplicate tester scorecards toward the fresh-player gate", () => {
    const readiness = playtestReadinessFor(
      historyWith(
        [
          ["playtest-1", "Session One", "2026-06-07T10:00:00.000Z"],
          ["playtest-2", "Session Two", "2026-06-07T11:00:00.000Z"],
          ["playtest-3", "Session Three", "2026-06-07T12:00:00.000Z"],
        ],
        { testerName: "Same Tester" }
      )
    );

    expect(readiness.status).toBe("collecting");
    expect(readiness.label).toBe("1/3 unique qualified testers");
    expect(readiness.remainingSessions).toBe(2);
    expect(readiness.duplicateTesterScorecards).toBe(2);
    expect(readiness.disqualifiedScorecards).toBe(2);
    expect(readiness.detail).toContain("2 duplicate tester scorecards need a different tester");
    expect(readiness.qualifications[0].qualified).toBe(true);
    expect(readiness.qualifications[1].qualified).toBe(false);
    expect(readiness.qualifications[1].missing).toContain("unique tester");
    expect(readiness.scoreQualityStatus).toBe("pending");
  });
});

function historyWith(
  entries: Array<[id: string, title: string, savedAt: string]>,
  options: { blank?: boolean; riskReadabilityScore?: number; testerName?: string } = {}
): PlaytestArtifactHistory {
  return {
    schema: 1,
    entries: entries.map(([id, title, savedAt]) => ({
      id,
      kind: "scorecard",
      markdown: options.blank ? blankScorecard(title) : qualifiedScorecard(title, options.testerName ?? title, options.riskReadabilityScore ?? 4),
      savedAt,
      title,
    })),
  };
}

function qualifiedScorecard(title: string, testerName: string, riskReadabilityScore: number) {
  return [
    `# ${title}`,
    "",
    "## Session Info",
    "",
    `- Tester: ${testerName}`,
    "- First-time player: yes",
    "- Observer: Sasha",
    "",
    "## Core Scores",
    "",
    "| Category | Score | Evidence |",
    "| --- | --- | --- |",
    "| Route-choice speed | 4 | Picked a route quickly. |",
    "| Trade clarity | 4 | Understood buy/sell. |",
    `| Risk readability | ${riskReadabilityScore} | Read the risk. |`,
    "| Addictive pull | 4 | Wanted one more route. |",
    "| Replay desire | 4 | Wanted a new build. |",
    "",
    "## Required Observations",
    "",
    "- First confusing moment: Contract timing.",
    "- First fun spike: Big sale.",
    "- First one-more-route moment: After first profit.",
    "- First dead turn or pure wait: none",
    "",
    "## Single Next Change",
    "",
    "- Sharpen route profit copy.",
    "",
  ].join("\n");
}

function blankScorecard(title: string) {
  return [
    `# ${title}`,
    "",
    "## Session Info",
    "",
    "- Tester:",
    "- First-time player: yes/no",
    "- Observer:",
    "",
    "## Core Scores",
    "",
    "| Category | Score | Evidence |",
    "| --- | --- | --- |",
    "| Route-choice speed |  |  |",
    "| Trade clarity |  |  |",
    "| Risk readability |  |  |",
    "| Addictive pull |  |  |",
    "| Replay desire |  |  |",
    "",
    "## Required Observations",
    "",
    "- First confusing moment:",
    "- First fun spike:",
    "- First one-more-route moment:",
    "- First dead turn or pure wait:",
    "",
    "## Single Next Change",
    "",
    "-",
    "",
  ].join("\n");
}
