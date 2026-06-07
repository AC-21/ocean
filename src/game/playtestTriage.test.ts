import { describe, expect, it } from "vitest";
import { playtestTriageMarkdownFor, playtestTriageReportFor } from "./playtestTriage";
import type { PlaytestArtifactHistory } from "./persistence";

describe("playtest triage", () => {
  it("turns archived scorecards into blocker, polish, watchlist, and backlog candidates", () => {
    const report = playtestTriageReportFor(
      historyWith([
        scorecard(
          "Session One",
          [
            "- Could the tester launch without help: no, Gatekeeper confused them",
            "- Could the tester start a run without help: yes",
            "- Fresh console/runtime errors: 2",
          ],
          [
            "| Route-choice speed | 2 | Tester hunted between map and market. |",
            "| Replay desire | 4 | Wanted another run. |",
          ],
          [
            "| 00:04 | Route Command | Did not know why Saffron was best | \"Where is the money?\" | High | Pin expected profit beside Sail |",
            "| 00:11 | Contract Board | Contract copy was okay but dense | \"I get it, barely\" | Medium | Shorten contract read |",
          ],
          "- Polish next",
          "- Make the first profitable route louder.",
          ["| Add first-route nudge | S1 | Codex | Browser smoke plus retest |"]
        ),
        scorecard(
          "Session Two",
          ["- Could the tester launch without help: yes", "- Could the tester start a run without help: yes", "- Fresh console/runtime errors: 0"],
          ["| Ocean feel | 1 | Water looked like a flat overlay. |"],
          ["| 00:09 | Visuals | Ocean did not match voyage result | \"It says waves but I don't see waves\" | Low | Defer water v2 polish |"],
          "- Fix blocker",
          "- Fix ocean trust gap.",
          ["| Fix ocean trust gap | S0 | Codex | Visual approval plus benchmark |"]
        ),
      ]),
      "2026-06-07T20:30:00.000Z"
    );

    expect(report.readiness.status).toBe("collecting");
    expect(report.findings.some((finding) => finding.classification === "release-blocker" && finding.surface === "Launch")).toBe(true);
    expect(report.findings.some((finding) => finding.classification === "release-blocker" && finding.surface === "Runtime")).toBe(true);
    expect(report.findings.some((finding) => finding.classification === "release-blocker" && finding.surface === "Ocean feel")).toBe(true);
    expect(report.findings.some((finding) => finding.classification === "high-value-polish" && finding.surface === "Route Command")).toBe(true);
    expect(report.findings.some((finding) => finding.classification === "watchlist" && finding.surface === "Contract Board")).toBe(true);
    expect(report.findings.some((finding) => finding.classification === "post-release" && finding.surface === "Visuals")).toBe(true);
    expect(report.decision).toContain("Fix blocker candidates");
  });

  it("writes an M-026B-ready markdown report with the next action", () => {
    const markdown = playtestTriageMarkdownFor(
      historyWith([
        scorecard(
          "Session One",
          ["- Could the tester launch without help: yes", "- Could the tester start a run without help: yes", "- Fresh console/runtime errors: 0"],
          ["| Upgrade desire | 2 | Shipyard was tempting but hard to compare. |"],
          [],
          "- Polish next",
          "- Improve shipyard deltas.",
          []
        ),
        scorecard(
          "Session Two",
          ["- Could the tester launch without help: yes", "- Could the tester start a run without help: yes", "- Fresh console/runtime errors: 0"],
          [],
          [],
          "- Promote",
          "- Keep current direction.",
          []
        ),
        scorecard(
          "Session Three",
          ["- Could the tester launch without help: yes", "- Could the tester start a run without help: yes", "- Fresh console/runtime errors: 0"],
          [],
          [],
          "- Promote",
          "- Keep current direction.",
          []
        ),
      ]),
      "2026-06-07T20:30:00.000Z"
    );

    expect(markdown).toContain("# Harborline Playtest Triage Report");
    expect(markdown).toContain("- Sessions archived: 3/3 unique qualified testers");
    expect(markdown).toContain("- Duplicate tester scorecards ignored: 0");
    expect(markdown).toContain("- Score quality: passing");
    expect(markdown).toContain("## Score Quality Gate");
    expect(markdown).toContain("Score Gate Passing");
    expect(markdown).toContain("- Readiness: ready-for-triage");
    expect(markdown).toContain("## High-Value Polish");
    expect(markdown).toContain("Shipyard was tempting but hard to compare.");
    expect(markdown).toContain("Classify the remaining rows as high-value polish");
    expect(markdown).toContain("| 2026-06-07T10:00:00.000Z | Session One | playtest-1 |");
  });

  it("keeps low average release scores visible after collection is complete", () => {
    const markdown = playtestTriageMarkdownFor(
      historyWith([
        scorecard(
          "Session One",
          ["- Could the tester launch without help: yes", "- Could the tester start a run without help: yes", "- Fresh console/runtime errors: 0"],
          ["| Risk readability | 3 | Storm/cargo risk was hard to read. |"],
          [],
          "- Polish next",
          "- Clarify route risk.",
          []
        ),
        scorecard(
          "Session Two",
          ["- Could the tester launch without help: yes", "- Could the tester start a run without help: yes", "- Fresh console/runtime errors: 0"],
          ["| Risk readability | 3 | Customs and storm risk blurred together. |"],
          [],
          "- Polish next",
          "- Clarify route risk.",
          []
        ),
        scorecard(
          "Session Three",
          ["- Could the tester launch without help: yes", "- Could the tester start a run without help: yes", "- Fresh console/runtime errors: 0"],
          ["| Risk readability | 3 | The route felt risky but not readable. |"],
          [],
          "- Polish next",
          "- Clarify route risk.",
          []
        ),
      ]),
      "2026-06-07T20:30:00.000Z"
    );

    expect(markdown).toContain("- Sessions archived: 3/3 unique qualified testers");
    expect(markdown).toContain("- Score quality: needs-work");
    expect(markdown).toContain("Score Gate Needs Work");
    expect(markdown).toContain("Risk readability averages 3/5");
    expect(markdown).toContain("| Risk readability | 3/5 | 3 | needs work |");
    expect(markdown).toContain("Fix low-scoring release categories before release-candidate scope freeze.");
  });

  it("keeps an empty archive as collection work instead of fake triage", () => {
    const markdown = playtestTriageMarkdownFor(historyWith([]), "2026-06-07T20:30:00.000Z");

    expect(markdown).toContain("- Sessions archived: 0/3 unique qualified testers");
    expect(markdown).toContain("No archived playtest scorecards yet");
    expect(markdown).toContain("No unqualified scorecards.");
    expect(markdown).toContain("Archive 3 more unique qualified fresh-player scorecards before closing M-026A.");
  });

  it("does not treat unedited yes/no template placeholders as launch failures", () => {
    const report = playtestTriageReportFor(
      historyWith([
        scorecard(
          "Unedited Template",
          [
            "- Could the tester launch without help: yes/no",
            "- Could the tester start a run without help: yes/no",
            "- Fresh console/runtime errors: 0",
          ],
          [],
          [],
          "- Promote / Fix blocker / Polish next / Rescope:",
          "-",
          []
        ),
      ])
    );

    expect(report.findings.some((finding) => finding.surface === "Launch")).toBe(false);
    expect(report.findings.some((finding) => finding.surface === "Onboarding")).toBe(false);
    expect(report.decision).toBe("Collect more fresh-player scorecards for M-026A.");
  });

  it("ignores saved triage reports and unqualified scorecards when building the next triage report", () => {
    const report = playtestTriageReportFor(
      historyWith([
        scorecard(
          "Session One",
          ["- Could the tester launch without help: yes", "- Could the tester start a run without help: yes", "- Fresh console/runtime errors: 0"],
          ["| Route-choice speed | 2 | Tester hunted between map and market. |"],
          [],
          "- Polish next",
          "- Improve route-choice speed.",
          []
        ),
        "# Blank Scorecard\n\n## Session Info\n\n- First-time player: yes/no\n\n## Core Scores\n\n| Category | Score | Evidence |\n| --- | --- | --- |\n| Route-choice speed |  |  |\n\n## Friction Log\n",
        "# Harborline Playtest Triage Report\n\n## Intake Status\n\n- Sessions archived: 1/3 scorecards archived\n",
      ])
    );

    expect(report.ignoredArtifacts).toBe(2);
    expect(report.unqualifiedScorecards).toBe(1);
    expect(report.readiness.label).toBe("1/3 unique qualified testers");
    expect(report.sessions).toHaveLength(1);
    expect(report.findings.some((finding) => finding.surface === "Route-choice speed")).toBe(true);
    expect(report.findings.every((finding) => finding.sessionTitle === "Session One")).toBe(true);
  });

  it("lists missing fields for unqualified scorecards in the markdown report", () => {
    const markdown = playtestTriageMarkdownFor(
      historyWith([
        "# Blank Scorecard\n\n## Session Info\n\n- Tester:\n- First-time player: yes/no\n- Observer:\n\n## Core Scores\n\n| Category | Score | Evidence |\n| --- | --- | --- |\n| Route-choice speed |  |  |\n\n## Required Observations\n\n- First confusing moment:\n\n## Single Next Change\n\n-\n",
      ]),
      "2026-06-07T20:30:00.000Z"
    );

    expect(markdown).toContain("## Unqualified Scorecards");
    expect(markdown).toContain("| Blank Scorecard |");
    expect(markdown).toContain("tester, observer, first-time player yes");
    expect(markdown).toContain("Route-choice speed score");
  });

  it("keeps duplicate tester scorecards out of the M-026A triage count", () => {
    const markdown = playtestTriageMarkdownFor(
      historyWith([
        scorecard("Session One", ["- Could the tester launch without help: yes", "- Could the tester start a run without help: yes"], [], [], "- Promote", "- Keep going.", [], "Same Tester"),
        scorecard("Session Two", ["- Could the tester launch without help: yes", "- Could the tester start a run without help: yes"], [], [], "- Promote", "- Keep going.", [], "Same Tester"),
      ]),
      "2026-06-07T20:30:00.000Z"
    );

    expect(markdown).toContain("- Sessions archived: 1/3 unique qualified testers");
    expect(markdown).toContain("- Duplicate tester scorecards ignored: 1");
    expect(markdown).toContain("| Session Two | unique tester |");
    expect(markdown).toContain("Archive 2 more unique qualified fresh-player scorecards before closing M-026A.");
  });
});

function historyWith(markdowns: string[]): PlaytestArtifactHistory {
  return {
    schema: 1,
    entries: markdowns.map((markdown, index) => ({
      id: `playtest-${index + 1}`,
      kind: markdown.includes("Harborline Playtest Triage Report") ? "triage" : "scorecard",
      markdown,
      savedAt: `2026-06-07T1${index}:00:00.000Z`,
      title: markdown.match(/^#\s+(.+)$/m)?.[1] ?? `Session ${index + 1}`,
    })),
  };
}

function scorecard(
  title: string,
  launchLines: string[],
  scoreRows: string[],
  frictionRows: string[],
  decision: string,
  singleNextChange: string,
  followUpRows: string[],
  testerName = `${title} Tester`
) {
  return [
    `# ${title}`,
    "",
    "## Session Info",
    "",
    `- Tester: ${testerName}`,
    "- Device/display: MacBook",
    "- Input method: mouse",
    "- First-time player: yes",
    "- Session length: 25 minutes",
    "- Observer: Sasha",
    "",
    "## Launch And Setup",
    "",
    ...launchLines,
    "",
    "## Core Scores",
    "",
    "| Category | Score | Evidence |",
    "| --- | --- | --- |",
    ...scoreRowsWithDefaults(scoreRows),
    "",
    "## Friction Log",
    "",
    "| Time | Surface | What happened | Tester quote or behavior | Severity | Candidate task |",
    "| --- | --- | --- | --- | --- | --- |",
    ...frictionRows,
    "",
    "## Required Observations",
    "",
    "- First confusing moment: Route margin read.",
    "- First fun spike: First profitable sale.",
    "- First one-more-route moment: After the first contract delivery.",
    "- First dead turn or pure wait: none",
    "",
    "## Exploit And Balance Checks",
    "",
    "- Did one route, cargo, contract, or posture look obviously dominant?",
    "",
    "## Decision",
    "",
    decision,
    "",
    "## Single Next Change",
    "",
    singleNextChange,
    "",
    "## Follow-Up Tasks",
    "",
    "| Task | Type | Owner | Exit proof |",
    "| --- | --- | --- | --- |",
    ...followUpRows,
    "",
  ].join("\n");
}

function scoreRowsWithDefaults(scoreRows: string[]) {
  const provided = new Set(
    scoreRows
      .map((row) => row.split("|")[1]?.trim().toLowerCase())
      .filter(Boolean)
  );
  const defaults = [
    "| Route-choice speed | 4 | Chose a route quickly. |",
    "| Trade clarity | 4 | Understood buy/sell. |",
    "| Risk readability | 4 | Understood risk. |",
    "| Addictive pull | 4 | Wanted one more route. |",
    "| Replay desire | 4 | Wanted another run. |",
  ];
  return [...scoreRows, ...defaults.filter((row) => !provided.has(row.split("|")[1]?.trim().toLowerCase()))];
}
