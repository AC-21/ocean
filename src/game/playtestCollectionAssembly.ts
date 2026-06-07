import { playtestArtifactKindFor, type PlaytestArtifactHistory, type PlaytestArtifactHistoryEntry } from "./persistence";
import { playtestCollectionAuditFor, type PlaytestCollectionAudit } from "./playtestCollectionAudit";

export type PlaytestScorecardSource = {
  markdown: string;
  savedAt?: string;
  sourcePath: string;
};

export type PlaytestCollectionAssembly = {
  audit: PlaytestCollectionAudit;
  errors: string[];
  history: PlaytestArtifactHistory;
};

export function assemblePlaytestHistoryFromScorecards(
  sources: PlaytestScorecardSource[],
  {
    generatedAt = new Date().toISOString(),
    sourcePath = "assembled scorecards",
  }: {
    generatedAt?: string;
    sourcePath?: string;
  } = {}
): PlaytestCollectionAssembly {
  const errors: string[] = [];
  const usedIds = new Set<string>();
  const entries = sources.flatMap((source, index): PlaytestArtifactHistoryEntry[] => {
    const markdown = normalizeMarkdown(source.markdown);
    if (!markdown.trim()) {
      errors.push(`${source.sourcePath} is empty.`);
      return [];
    }

    const kind = playtestArtifactKindFor(markdown);
    if (kind !== "scorecard") {
      errors.push(`${source.sourcePath} is ${kind}, not a scorecard.`);
      return [];
    }

    const baseId = uniqueIdFor(source.sourcePath, index);
    const id = uniqueId(baseId, usedIds);
    return [
      {
        id,
        kind,
        markdown,
        savedAt: source.savedAt || generatedAt,
        title: titleFor(markdown, index),
      },
    ];
  });
  const history: PlaytestArtifactHistory = {
    entries,
    schema: 1,
  };
  const audit = playtestCollectionAuditFor(JSON.stringify(history), {
    generatedAt,
    sourcePath,
  });
  const invalidMarkdown = errors.length ? invalidAssemblyMarkdown(audit.markdown, errors) : audit.markdown;
  return {
    audit: errors.length
      ? {
          ...audit,
          errors: [...errors, ...audit.errors],
          markdown: invalidMarkdown,
          pass: false,
          status: "invalid-history",
        }
      : audit,
    errors,
    history,
  };
}

export function serializePlaytestHistory(history: PlaytestArtifactHistory) {
  return `${JSON.stringify(history, null, 2)}\n`;
}

function normalizeMarkdown(value: string) {
  return String(value || "").replace(/\r\n/g, "\n").trimEnd();
}

function titleFor(markdown: string, index: number) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || `Playtest ${index + 1}`;
}

function uniqueIdFor(sourcePath: string, index: number) {
  const leaf = sourcePath.split(/[\\/]/).pop() || `scorecard-${index + 1}`;
  const slug = leaf
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `assembled-${index + 1}-${slug || "scorecard"}`;
}

function uniqueId(baseId: string, usedIds: Set<string>) {
  let id = baseId;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

function invalidAssemblyMarkdown(markdown: string, errors: string[]) {
  return markdown
    .replace(/- Status: .+/, "- Status: invalid-history")
    .replace(/- Pass: .+/, "- Pass: no")
    .replace(/- Next action: .+/, "- Next action: Fix the assembled scorecard files before triage.")
    .replace("## History Validation\n\n- History JSON is readable and schema-valid.", `## History Validation\n\n${errors.map((error) => `- ${error}`).join("\n")}`);
}
