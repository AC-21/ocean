import { playtestReadinessFor } from "./playtestReadiness";
import { playtestTriageMarkdownFor, playtestTriageReportFor, type PlaytestTriageReport } from "./playtestTriage";
import { playtestArtifactKindFor, type PlaytestArtifactHistory, type PlaytestArtifactHistoryEntry, type PlaytestArtifactKind } from "./persistence";

export type PlaytestCollectionAuditStatus = "invalid-history" | "collecting" | "score-needs-work" | "release-blockers" | "ready-for-m026b";

export type ParsedPlaytestHistory = {
  errors: string[];
  history: PlaytestArtifactHistory;
};

export type PlaytestCollectionAudit = {
  errors: string[];
  generatedAt: string;
  markdown: string;
  pass: boolean;
  sourcePath: string;
  status: PlaytestCollectionAuditStatus;
  triage: PlaytestTriageReport;
  triageMarkdown: string;
};

const artifactKinds: PlaytestArtifactKind[] = ["artifact", "evidence", "scorecard", "triage"];

export function parseCollectedPlaytestHistory(raw: string): ParsedPlaytestHistory {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return invalidHistory("History root must be a JSON object.");
    if (parsed.schema !== 1) return invalidHistory("History schema must be 1.");
    if (!Array.isArray(parsed.entries)) return invalidHistory("History entries must be an array.");

    const errors: string[] = [];
    const entries = parsed.entries.flatMap((entry, index): PlaytestArtifactHistoryEntry[] => {
      if (!isRecord(entry)) {
        errors.push(`Entry ${index + 1} must be an object.`);
        return [];
      }
      if (typeof entry.markdown !== "string" || !entry.markdown.trim()) {
        errors.push(`Entry ${index + 1} must include non-empty markdown.`);
        return [];
      }
      const kind = artifactKind(entry.kind, entry.markdown);
      return [
        {
          id: textValue(entry.id, `playtest-${index + 1}`),
          kind,
          markdown: entry.markdown.trimEnd(),
          savedAt: textValue(entry.savedAt, new Date(0).toISOString()),
          title: textValue(entry.title, titleFor(entry.markdown, index)),
        },
      ];
    });

    return {
      errors,
      history: {
        entries,
        schema: 1,
      },
    };
  } catch (error) {
    return invalidHistory(`History JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function playtestCollectionAuditFor(
  rawHistory: string,
  {
    generatedAt = new Date().toISOString(),
    sourcePath = "playtest.history.v1.json",
  }: {
    generatedAt?: string;
    sourcePath?: string;
  } = {}
): PlaytestCollectionAudit {
  const parsed = parseCollectedPlaytestHistory(rawHistory);
  const triage = playtestTriageReportFor(parsed.history, generatedAt);
  const triageMarkdown = playtestTriageMarkdownFor(parsed.history, generatedAt);
  const status = collectionStatus(parsed.errors, triage);
  const pass = status === "ready-for-m026b";
  const audit = {
    errors: parsed.errors,
    generatedAt,
    markdown: "",
    pass,
    sourcePath,
    status,
    triage,
    triageMarkdown,
  };
  return {
    ...audit,
    markdown: collectionAuditMarkdown(audit),
  };
}

function collectionStatus(errors: string[], triage: PlaytestTriageReport): PlaytestCollectionAuditStatus {
  if (errors.length) return "invalid-history";
  if (triage.readiness.status !== "ready-for-triage") return "collecting";
  if (triage.readiness.scoreQualityStatus === "needs-work") return "score-needs-work";
  if (triage.findings.some((finding) => finding.classification === "release-blocker")) return "release-blockers";
  return "ready-for-m026b";
}

function collectionAuditMarkdown(audit: Omit<PlaytestCollectionAudit, "markdown">) {
  const releaseBlockers = audit.triage.findings.filter((finding) => finding.classification === "release-blocker");
  return [
    "# Harborline Playtest Collection Audit",
    "",
    "## Gate Status",
    "",
    `- Generated: ${audit.generatedAt}`,
    `- Source: ${audit.sourcePath}`,
    `- Status: ${audit.status}`,
    `- Pass: ${audit.pass ? "yes" : "no"}`,
    `- Sessions archived: ${audit.triage.readiness.label}`,
    `- Score quality: ${audit.triage.readiness.scoreQualityStatus}`,
    `- Release blocker findings: ${releaseBlockers.length}`,
    `- Next action: ${nextActionForStatus(audit.status, audit.triage)}`,
    "",
    "## History Validation",
    "",
    audit.errors.length ? audit.errors.map((error) => `- ${error}`).join("\n") : "- History JSON is readable and schema-valid.",
    "",
    "## Score Gate",
    "",
    "| Category | Average | Sessions | Gate |",
    "| --- | --- | --- | --- |",
    ...audit.triage.readiness.scoreAverages.map(
      (entry) =>
        `| ${entry.category} | ${entry.average === null ? "n/a" : `${entry.average}/5`} | ${entry.count} | ${
          entry.passes ? "pass" : "needs work"
        } |`
    ),
    "",
    "## Triage Report",
    "",
    audit.triageMarkdown,
  ].join("\n");
}

function nextActionForStatus(status: PlaytestCollectionAuditStatus, triage: PlaytestTriageReport) {
  if (status === "invalid-history") return "Fix the collected playtest history JSON before triage.";
  if (status === "collecting") return `Collect ${triage.readiness.remainingSessions} more unique qualified fresh-player scorecard(s).`;
  if (status === "score-needs-work") return "Promote low-scoring release categories into M-026B before scope freeze.";
  if (status === "release-blockers") return "Promote release-blocker findings into RELEASE_BLOCKERS.md with reproduction and exit proof.";
  return "Collection gate is ready for M-026B triage and release-candidate blocker review.";
}

function invalidHistory(error: string): ParsedPlaytestHistory {
  return {
    errors: [error],
    history: {
      entries: [],
      schema: 1,
    },
  };
}

function artifactKind(value: unknown, markdown: string): PlaytestArtifactKind {
  if (typeof value === "string" && artifactKinds.includes(value as PlaytestArtifactKind)) return value as PlaytestArtifactKind;
  return playtestArtifactKindFor(markdown);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function textValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function titleFor(markdown: string, index: number) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || `Playtest ${index + 1}`;
}
