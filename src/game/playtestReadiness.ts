import { scorecardEntries, type PlaytestArtifactHistory } from "./persistence";

export const requiredExternalPlaytestSessions = 3;
export const requiredScoreAverage = 4;
export const scoreQualityCategories = ["Route-choice speed", "Trade clarity", "Risk readability", "Addictive pull", "Replay desire"] as const;

export type PlaytestReadinessStatus = "not-started" | "collecting" | "ready-for-triage";
export type PlaytestScoreQualityStatus = "pending" | "passing" | "needs-work";

export type PlaytestScoreAverage = {
  average: number | null;
  category: (typeof scoreQualityCategories)[number];
  count: number;
  passes: boolean;
};

export type PlaytestScorecardQualification = {
  duplicateTester: boolean;
  entryId: string;
  missing: string[];
  qualified: boolean;
  testerName: string | null;
  title: string;
};

export type PlaytestReadiness = {
  archivedScorecards: number;
  archivedSessions: number;
  detail: string;
  disqualifiedScorecards: number;
  duplicateTesterScorecards: number;
  label: string;
  latestSavedAt: string | null;
  latestTitle: string | null;
  qualifications: PlaytestScorecardQualification[];
  qualifiedSessions: number;
  remainingSessions: number;
  requiredSessions: number;
  scoreAverages: PlaytestScoreAverage[];
  scoreQualityDetail: string;
  scoreQualityLabel: string;
  scoreQualityStatus: PlaytestScoreQualityStatus;
  status: PlaytestReadinessStatus;
};

export function playtestReadinessFor(
  history: PlaytestArtifactHistory,
  requiredSessions = requiredExternalPlaytestSessions
): PlaytestReadiness {
  const required = Math.max(1, Math.floor(requiredSessions));
  const scorecards = scorecardEntries(history);
  const qualifications = scorecardQualificationsFor(scorecards);
  const qualifiedScorecards = scorecards.filter((_, index) => qualifications[index]?.qualified);
  const archived = Math.max(0, qualifiedScorecards.length);
  const remaining = Math.max(0, required - archived);
  const latest = qualifiedScorecards[qualifiedScorecards.length - 1] ?? null;
  const disqualified = Math.max(0, scorecards.length - qualifiedScorecards.length);
  const duplicates = qualifications.filter((entry) => entry.duplicateTester).length;
  const scoreAverages = scoreAveragesFor(qualifiedScorecards);
  const scoreQualityStatus = scoreQualityStatusFor(scoreAverages, archived, required);
  const status: PlaytestReadinessStatus =
    archived === 0 ? "not-started" : remaining === 0 ? "ready-for-triage" : "collecting";

  return {
    archivedScorecards: scorecards.length,
    archivedSessions: archived,
    detail: readinessDetail(status, remaining, required, disqualified, duplicates),
    disqualifiedScorecards: disqualified,
    duplicateTesterScorecards: duplicates,
    label: `${Math.min(archived, required)}/${required} unique qualified testers`,
    latestSavedAt: latest?.savedAt ?? null,
    latestTitle: latest?.title ?? null,
    qualifications,
    qualifiedSessions: archived,
    remainingSessions: remaining,
    requiredSessions: required,
    scoreAverages,
    scoreQualityDetail: scoreQualityDetail(scoreQualityStatus, scoreAverages, archived, required),
    scoreQualityLabel: scoreQualityLabel(scoreQualityStatus),
    scoreQualityStatus,
    status,
  };
}

export function qualifiedScorecardEntries(history: PlaytestArtifactHistory) {
  const scorecards = scorecardEntries(history);
  const qualifications = scorecardQualificationsFor(scorecards);
  return scorecards.filter((_, index) => qualifications[index]?.qualified);
}

export function scorecardQualificationFor(entry: { id: string; markdown: string; title: string }): PlaytestScorecardQualification {
  const testerName = requiredValue(entry.markdown, "Tester");
  const missing = [
    testerName ? "" : "tester",
    requiredValue(entry.markdown, "Observer") ? "" : "observer",
    /^yes\b/i.test(requiredValue(entry.markdown, "First-time player") ?? "") ? "" : "first-time player yes",
    ...requiredScores(entry.markdown),
    ...requiredObserverNotes(entry.markdown),
    firstBulletInSection(entry.markdown, "Single Next Change") ? "" : "single next change",
  ].filter(Boolean);

  return {
    duplicateTester: false,
    entryId: entry.id,
    missing,
    qualified: missing.length === 0,
    testerName,
    title: entry.title,
  };
}

function scorecardQualificationsFor(scorecards: Array<{ id: string; markdown: string; title: string }>) {
  const seenTesterNames = new Set<string>();
  return scorecards.map((scorecard) => {
    const qualification = scorecardQualificationFor(scorecard);
    const testerKey = normalizeTesterName(qualification.testerName);
    if (!qualification.qualified || !testerKey) return qualification;
    if (!seenTesterNames.has(testerKey)) {
      seenTesterNames.add(testerKey);
      return qualification;
    }
    return {
      ...qualification,
      duplicateTester: true,
      missing: [...qualification.missing, "unique tester"],
      qualified: false,
    };
  });
}

function readinessDetail(status: PlaytestReadinessStatus, remaining: number, required: number, disqualified: number, duplicates: number) {
  if (status === "ready-for-triage") return "Ready for M-026B triage once these are confirmed fresh-player sessions.";
  const fieldIssues = Math.max(0, disqualified - duplicates);
  const hints = [
    fieldIssues ? `${fieldIssues} archived ${sessionLabel(fieldIssues)} still needs observer fields.` : "",
    duplicates ? `${duplicates} duplicate tester ${sessionLabel(duplicates)} ${duplicates === 1 ? "needs" : "need"} a different tester.` : "",
  ].filter(Boolean);
  const qualityHint = hints.length ? ` ${hints.join(" ")}` : "";
  if (status === "collecting") return `${remaining} more unique tester ${sessionLabel(remaining)} needed for M-026A.${qualityHint}`;
  return `Need ${required} completed fresh-player ${sessionLabel(required)} from unique testers for M-026A before release-candidate scope freeze.${qualityHint}`;
}

function scoreAveragesFor(scorecards: Array<{ markdown: string }>): PlaytestScoreAverage[] {
  const scoreRows = scorecards.map((entry) => markdownRows(section(entry.markdown, "Core Scores")));
  return scoreQualityCategories.map((category) => {
    const scores = scoreRows
      .map((rows) => scoreForCategory(rows, category))
      .filter((score): score is number => typeof score === "number");
    const average = scores.length ? roundScoreAverage(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
    return {
      average,
      category,
      count: scores.length,
      passes: average !== null && average >= requiredScoreAverage,
    };
  });
}

function scoreQualityStatusFor(averages: PlaytestScoreAverage[], qualifiedSessions: number, requiredSessions: number): PlaytestScoreQualityStatus {
  if (qualifiedSessions < requiredSessions) return "pending";
  return averages.every((entry) => entry.passes) ? "passing" : "needs-work";
}

function scoreQualityLabel(status: PlaytestScoreQualityStatus) {
  if (status === "passing") return "Score Gate Passing";
  if (status === "needs-work") return "Score Gate Needs Work";
  return "Score Gate Pending";
}

function scoreQualityDetail(status: PlaytestScoreQualityStatus, averages: PlaytestScoreAverage[], qualifiedSessions: number, requiredSessions: number) {
  if (status === "pending") return `Needs ${requiredSessions} unique qualified testers before the 4/5 average gate can close.`;
  const lowest = [...averages].sort((left, right) => (left.average ?? 0) - (right.average ?? 0))[0];
  if (status === "passing") return `All five release scores average at least ${requiredScoreAverage}/5 across ${qualifiedSessions} testers.`;
  return `${lowest.category} averages ${formatAverage(lowest.average)}/5; every release score needs at least ${requiredScoreAverage}/5.`;
}

function sessionLabel(count: number) {
  return count === 1 ? "scorecard" : "scorecards";
}

function requiredScores(markdown: string) {
  const rows = markdownRows(section(markdown, "Core Scores"));
  return scoreQualityCategories.flatMap((category) => (scoreForCategory(rows, category) ? [] : [`${category} score`]));
}

function requiredObserverNotes(markdown: string) {
  const labels = ["First confusing moment", "First fun spike", "First one-more-route moment", "First dead turn or pure wait"];
  return labels.flatMap((label) => (requiredValue(markdown, label) ? [] : [label.toLowerCase()]));
}

function requiredValue(markdown: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`^-[ \\t]*${escaped}\\??:[ \\t]*(.*)$`, "im"));
  const value = match?.[1]?.trim() ?? "";
  if (!value || value === "-" || /^yes\/no$/i.test(value)) return null;
  return value;
}

function normalizeTesterName(value: string | null) {
  return value?.replace(/\s+/g, " ").trim().toLowerCase() ?? "";
}

function scoreForCategory(rows: string[][], category: string) {
  const row = rows.find((columns) => columns[0]?.toLowerCase() === category.toLowerCase());
  const score = Number.parseInt(row?.[1] ?? "", 10);
  return Number.isFinite(score) && score >= 1 && score <= 5 ? score : null;
}

function roundScoreAverage(value: number) {
  return Math.round(value * 10) / 10;
}

function formatAverage(value: number | null) {
  return value === null ? "n/a" : value.toFixed(1).replace(/\.0$/, "");
}

function firstBulletInSection(markdown: string, heading: string) {
  const match = section(markdown, heading)
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^-\s+\S/.test(line) && line !== "-");
  return match?.replace(/^-\s+/, "").trim() ?? null;
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
    .filter((columns) => !columns.every((column) => column === "") && !columns.join(" ").toLowerCase().includes("category score evidence"));
}
