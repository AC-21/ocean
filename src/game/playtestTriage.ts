import { playtestReadinessFor, qualifiedScorecardEntries } from "./playtestReadiness";
import { scorecardEntries, type PlaytestArtifactHistory, type PlaytestArtifactHistoryEntry } from "./persistence";

export type PlaytestFindingClass = "release-blocker" | "high-value-polish" | "watchlist" | "post-release";

export type PlaytestFinding = {
  candidateTask: string;
  classification: PlaytestFindingClass;
  evidence: string;
  exitProof: string;
  sessionTitle: string;
  source: string;
  surface: string;
};

export type PlaytestTriageReport = {
  decision: string;
  duplicateTesterScorecards: number;
  findings: PlaytestFinding[];
  generatedAt: string;
  ignoredArtifacts: number;
  unqualifiedScorecards: number;
  readiness: ReturnType<typeof playtestReadinessFor>;
  sessions: Array<{
    id: string;
    savedAt: string;
    title: string;
  }>;
};

export function playtestTriageReportFor(history: PlaytestArtifactHistory, generatedAt = new Date().toISOString()): PlaytestTriageReport {
  const readiness = playtestReadinessFor(history);
  const allScorecards = scorecardEntries(history);
  const scorecards = qualifiedScorecardEntries(history);
  const findings = scorecards.flatMap((entry) => findingsForEntry(entry));
  return {
    decision: triageDecision(readiness, findings),
    duplicateTesterScorecards: readiness.duplicateTesterScorecards,
    findings,
    generatedAt,
    ignoredArtifacts: Math.max(0, history.entries.length - scorecards.length),
    unqualifiedScorecards: Math.max(0, allScorecards.length - scorecards.length),
    readiness,
    sessions: scorecards.map((entry) => ({
      id: entry.id,
      savedAt: entry.savedAt,
      title: entry.title,
    })),
  };
}

export function playtestTriageMarkdownFor(history: PlaytestArtifactHistory, generatedAt = new Date().toISOString()) {
  const report = playtestTriageReportFor(history, generatedAt);
  const grouped = groupFindings(report.findings);
  return [
    "# Harborline Playtest Triage Report",
    "",
    "## Intake Status",
    "",
    `- Generated: ${report.generatedAt}`,
    `- Sessions archived: ${report.readiness.label}`,
    `- Unqualified scorecards ignored: ${report.unqualifiedScorecards}`,
    `- Duplicate tester scorecards ignored: ${report.duplicateTesterScorecards}`,
    `- Non-scorecard artifacts ignored: ${Math.max(0, report.ignoredArtifacts - report.unqualifiedScorecards)}`,
    `- Readiness: ${report.readiness.status}`,
    `- Score quality: ${report.readiness.scoreQualityStatus}`,
    `- Decision: ${report.decision}`,
    report.readiness.latestTitle ? `- Latest session: ${report.readiness.latestTitle}` : "- Latest session: none",
    "",
    "## Score Quality Gate",
    "",
    `- ${report.readiness.scoreQualityLabel}: ${report.readiness.scoreQualityDetail}`,
    "",
    scoreAveragesTable(report.readiness.scoreAverages),
    "",
    "## Unqualified Scorecards",
    "",
    unqualifiedScorecardsTable(report.readiness.qualifications.filter((entry) => !entry.qualified)),
    "",
    "## Release Blockers",
    "",
    findingsTable(grouped["release-blocker"]),
    "",
    "## High-Value Polish",
    "",
    findingsTable(grouped["high-value-polish"]),
    "",
    "## Watchlist",
    "",
    findingsTable(grouped.watchlist),
    "",
    "## Post-Release Backlog",
    "",
    findingsTable(grouped["post-release"]),
    "",
    "## Session Index",
    "",
    "| Saved | Title | Artifact ID |",
    "| --- | --- | --- |",
    ...(report.sessions.length
      ? report.sessions.map((session) => `| ${cell(session.savedAt)} | ${cell(session.title)} | ${cell(session.id)} |`)
      : ["|  | No archived playtest scorecards yet |  |"]),
    "",
    "## Next Action",
    "",
    nextActionFor(report),
    "",
  ].join("\n");
}

function findingsForEntry(entry: PlaytestArtifactHistoryEntry): PlaytestFinding[] {
  return [
    ...launchFindings(entry),
    ...scoreFindings(entry),
    ...frictionFindings(entry),
    ...singleNextChangeFindings(entry),
    ...followUpTaskFindings(entry),
  ];
}

function launchFindings(entry: PlaytestArtifactHistoryEntry): PlaytestFinding[] {
  const markdown = entry.markdown;
  const findings: PlaytestFinding[] = [];
  const launch = bulletValue(markdown, "Could the tester launch without help");
  const start = bulletValue(markdown, "Could the tester start a run without help");
  const runtimeErrors = Number.parseInt(bulletValue(markdown, "Fresh console/runtime errors") ?? "0", 10);

  if (launch && isNegative(launch)) {
    findings.push(finding(entry, "Launch", "release-blocker", "Tester could not launch without help.", launch, "Package launch smoke plus fresh-player retest."));
  }
  if (start && isNegative(start)) {
    findings.push(finding(entry, "Onboarding", "release-blocker", "Tester could not start a run without help.", start, "Fresh-player retest starts a run without coaching."));
  }
  if (Number.isFinite(runtimeErrors) && runtimeErrors > 0) {
    findings.push(
      finding(
        entry,
        "Runtime",
        "release-blocker",
        "Fresh console or runtime errors were recorded.",
        `${runtimeErrors} errors`,
        "Runtime log is clean in browser smoke and packaged smoke."
      )
    );
  }
  return findings;
}

function scoreFindings(entry: PlaytestArtifactHistoryEntry): PlaytestFinding[] {
  return markdownRows(section(entry.markdown, "Core Scores"))
    .flatMap((columns): PlaytestFinding[] => {
      if (columns.length < 3) return [];
      const [category, scoreText, evidence] = columns;
      const score = Number.parseInt(scoreText, 10);
      if (!Number.isFinite(score) || score > 2) return [];
      return [
        finding(
          entry,
          category,
          score <= 1 ? "release-blocker" : "high-value-polish",
          `Core score ${score}/5: ${category}`,
          evidence || "Low score without written evidence.",
          `Next playtest scores ${category} at 3/5 or better with supporting evidence.`
        ),
      ];
    });
}

function frictionFindings(entry: PlaytestArtifactHistoryEntry): PlaytestFinding[] {
  return markdownRows(section(entry.markdown, "Friction Log"))
    .flatMap((columns): PlaytestFinding[] => {
      if (columns.length < 6) return [];
      const [time, surface, happened, quote, severity, candidate] = columns;
      if (![surface, happened, quote, severity, candidate].some((value) => Boolean(value.trim()))) return [];
      return [
        finding(
          entry,
          surface || "Unspecified surface",
          classifySeverity(severity),
          happened || candidate || "Friction logged without detail.",
          quote || time || "No quote recorded.",
          candidate || "Add reproduction proof, fix, and regression check."
        ),
      ];
    });
}

function singleNextChangeFindings(entry: PlaytestArtifactHistoryEntry): PlaytestFinding[] {
  const change = firstBulletInSection(entry.markdown, "Single Next Change");
  if (!change) return [];
  const decision = bulletValue(entry.markdown, "Promote / Fix blocker / Polish next / Rescope") ?? section(entry.markdown, "Decision");
  const classification = /fix blocker|blocker|rescope/i.test(decision) ? "release-blocker" : "high-value-polish";
  return [finding(entry, "Playtest synthesis", classification, "Observer named a single strongest next change.", change, "Change is implemented or explicitly deferred with evidence.")];
}

function followUpTaskFindings(entry: PlaytestArtifactHistoryEntry): PlaytestFinding[] {
  return markdownRows(section(entry.markdown, "Follow-Up Tasks"))
    .flatMap((columns): PlaytestFinding[] => {
      if (columns.length < 4) return [];
      const [task, type, , exitProof] = columns;
      if (!task.trim()) return [];
      return [
        finding(
          entry,
          type || "Follow-up",
          classifySeverity(type),
          task,
          `Follow-up task from ${entry.title}.`,
          exitProof || "Define proof before implementation."
        ),
      ];
    });
}

function finding(
  entry: PlaytestArtifactHistoryEntry,
  surface: string,
  classification: PlaytestFindingClass,
  source: string,
  evidence: string,
  exitProof: string
): PlaytestFinding {
  return {
    candidateTask: source,
    classification,
    evidence,
    exitProof,
    sessionTitle: entry.title,
    source: entry.id,
    surface,
  };
}

function groupFindings(findings: PlaytestFinding[]) {
  return {
    "release-blocker": findings.filter((finding) => finding.classification === "release-blocker"),
    "high-value-polish": findings.filter((finding) => finding.classification === "high-value-polish"),
    watchlist: findings.filter((finding) => finding.classification === "watchlist"),
    "post-release": findings.filter((finding) => finding.classification === "post-release"),
  };
}

function findingsTable(findings: PlaytestFinding[]) {
  if (!findings.length) return "No findings in this class yet.";
  return [
    "| Session | Surface | Evidence | Candidate task | Exit proof |",
    "| --- | --- | --- | --- | --- |",
    ...findings.map(
      (finding) =>
        `| ${cell(finding.sessionTitle)} | ${cell(finding.surface)} | ${cell(finding.evidence)} | ${cell(finding.candidateTask)} | ${cell(
          finding.exitProof
        )} |`
    ),
  ].join("\n");
}

function scoreAveragesTable(averages: PlaytestTriageReport["readiness"]["scoreAverages"]) {
  return [
    "| Category | Average | Sessions | Gate |",
    "| --- | --- | --- | --- |",
    ...averages.map(
      (entry) =>
        `| ${cell(entry.category)} | ${cell(entry.average === null ? "n/a" : `${entry.average}/5`)} | ${entry.count} | ${
          entry.passes ? "pass" : "needs work"
        } |`
    ),
  ].join("\n");
}

function unqualifiedScorecardsTable(scorecards: PlaytestTriageReport["readiness"]["qualifications"]) {
  if (!scorecards.length) return "No unqualified scorecards.";
  return [
    "| Scorecard | Missing fields |",
    "| --- | --- |",
    ...scorecards.map((scorecard) => `| ${cell(scorecard.title)} | ${cell(scorecard.missing.join(", "))} |`),
  ].join("\n");
}

function triageDecision(readiness: ReturnType<typeof playtestReadinessFor>, findings: PlaytestFinding[]) {
  if (findings.some((finding) => finding.classification === "release-blocker")) return "Fix blocker candidates before release-candidate scope freeze.";
  if (readiness.status !== "ready-for-triage") return "Collect more fresh-player scorecards for M-026A.";
  if (readiness.scoreQualityStatus === "needs-work") return "Fix low-scoring release categories before release-candidate scope freeze.";
  if (findings.length) return "Triage findings into M-026B blocker, polish, watchlist, or backlog entries.";
  return "Ready to freeze scope if scorecards confirm launch, comprehension, finish/fail clarity, and replay desire.";
}

function nextActionFor(report: PlaytestTriageReport) {
  if (report.readiness.status !== "ready-for-triage") {
    return `Archive ${report.readiness.remainingSessions} more unique qualified fresh-player ${report.readiness.remainingSessions === 1 ? "scorecard" : "scorecards"} before closing M-026A.`;
  }
  if (report.findings.some((finding) => finding.classification === "release-blocker")) {
    return "Promote each release-blocker row into `RELEASE_BLOCKERS.md` with reproduction and exit proof.";
  }
  if (report.readiness.scoreQualityStatus === "needs-work") {
    return "Promote the lowest release-score category into M-026B before release-candidate scope freeze.";
  }
  if (report.findings.length) return "Classify the remaining rows as high-value polish, watchlist, or post-release backlog in M-026B.";
  return "Review the three scorecards manually, then freeze release-candidate scope if no hidden blockers remain.";
}

function section(markdown: string, heading: string) {
  const lines = markdown.split("\n");
  const headingIndex = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (headingIndex < 0) return "";
  const nextHeading = lines.findIndex((line, index) => index > headingIndex && /^##\s+/.test(line.trim()));
  return lines.slice(headingIndex + 1, nextHeading < 0 ? lines.length : nextHeading).join("\n");
}

function markdownRows(sectionMarkdown: string) {
  return sectionMarkdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !/^\|\s*-/.test(line) && !/\|\s*---/.test(line))
    .map((line) =>
      line
        .slice(1, line.endsWith("|") ? -1 : undefined)
        .split("|")
        .map((column) => column.trim())
    )
    .filter((columns) => !columns.every((column) => column === "") && !isHeaderRow(columns));
}

function isHeaderRow(columns: string[]) {
  const joined = columns.join(" ").toLowerCase();
  return (
    joined.includes("category score evidence") ||
    joined.includes("time surface what happened") ||
    joined.includes("task type owner exit proof")
  );
}

function bulletValue(markdown: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`^-[ \\t]*${escaped}\\??:[ \\t]*(.+)$`, "im"));
  return match?.[1]?.trim() ?? null;
}

function firstBulletInSection(markdown: string, heading: string) {
  const match = section(markdown, heading)
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^-\s+\S/.test(line) && line !== "-");
  return match?.replace(/^-\s+/, "").trim() ?? null;
}

function classifySeverity(value: string): PlaytestFindingClass {
  const normalized = value.toLowerCase();
  if (/\bs0\b|blocker|fix blocker|rescope|stopped|corrupt|crash/.test(normalized)) return "release-blocker";
  if (/\bs1\b|high|polish/.test(normalized)) return "high-value-polish";
  if (/\bs2\b|medium|watch/.test(normalized)) return "watchlist";
  if (/low|post|future|backlog/.test(normalized)) return "post-release";
  return "watchlist";
}

function isNegative(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "yes/no" || normalized === "no/yes") return false;
  return /^no\b/.test(normalized) || /\b(failed|blocked|could not|unable)\b/.test(normalized);
}

function cell(value: string | number) {
  return String(value || "")
    .replace(/\|/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}
