import { factions, ports } from "./data";
import { money } from "./math";
import type { GameState } from "./types";

export type FeedbackTone = "gain" | "loss" | "risk" | "progress" | "neutral";
export type FeedbackKind =
  | "contract"
  | "damage"
  | "economy"
  | "encounter"
  | "progress"
  | "profit"
  | "route"
  | "save"
  | "upgrade";
export type FeedbackCategory =
  | "contract"
  | "crew"
  | "customs"
  | "damage"
  | "game-over"
  | "insurance"
  | "market"
  | "pirate"
  | "profit"
  | "loss"
  | "rank-up"
  | "route"
  | "save"
  | "storm"
  | "upgrade";
export type FeedbackMotion = "calm" | "pop" | "shake" | "surge" | "flash" | "drop";
export type FeedbackPriority = "ambient" | "normal" | "high" | "critical";
export type FeedbackAudioCue =
  | "coin-profit"
  | "coin-loss"
  | "contract-paid"
  | "crew-change"
  | "customs-hail"
  | "game-over"
  | "hull-hit"
  | "insurance-claim"
  | "market-shift"
  | "pirate-contact"
  | "rank-up"
  | "route-commit"
  | "save-confirm"
  | "storm-warning"
  | "upgrade-installed";

export type FeedbackTaxonomySpec = {
  audioCue: FeedbackAudioCue;
  motion: FeedbackMotion;
  priority: FeedbackPriority;
};

export type FeedbackPulse = {
  id: string;
  day: number;
  tone: FeedbackTone;
  kind: FeedbackKind;
  category: FeedbackCategory;
  audioCue: FeedbackAudioCue;
  motion: FeedbackMotion;
  priority: FeedbackPriority;
  label: string;
  title: string;
  detail: string;
  metric: string;
};

export const feedbackTaxonomy: Record<FeedbackCategory, FeedbackTaxonomySpec> = {
  contract: { audioCue: "contract-paid", motion: "surge", priority: "normal" },
  crew: { audioCue: "crew-change", motion: "pop", priority: "normal" },
  customs: { audioCue: "customs-hail", motion: "flash", priority: "high" },
  damage: { audioCue: "hull-hit", motion: "shake", priority: "high" },
  "game-over": { audioCue: "game-over", motion: "surge", priority: "critical" },
  insurance: { audioCue: "insurance-claim", motion: "pop", priority: "normal" },
  market: { audioCue: "market-shift", motion: "calm", priority: "ambient" },
  pirate: { audioCue: "pirate-contact", motion: "shake", priority: "high" },
  profit: { audioCue: "coin-profit", motion: "surge", priority: "normal" },
  loss: { audioCue: "coin-loss", motion: "drop", priority: "high" },
  "rank-up": { audioCue: "rank-up", motion: "surge", priority: "normal" },
  route: { audioCue: "route-commit", motion: "calm", priority: "ambient" },
  save: { audioCue: "save-confirm", motion: "calm", priority: "ambient" },
  storm: { audioCue: "storm-warning", motion: "shake", priority: "high" },
  upgrade: { audioCue: "upgrade-installed", motion: "pop", priority: "normal" },
};

type LogEntry = GameState["log"][number];

export function feedbackPulseFor(state: GameState): FeedbackPulse {
  if (state.gameOver) return gameOverPulseFor(state);
  if (state.encounter) return encounterPulseFor(state);
  if (state.voyage) return voyagePulseFor(state);
  return feedbackPulseForLog(latestMeaningfulLog(state.log), state.day);
}

export function feedbackPulseForLog(entry: LogEntry | undefined, fallbackDay = 1): FeedbackPulse {
  if (!entry) return pulse("steady", fallbackDay, "neutral", "route", "Ledger", "Awaiting Orders", "No recent event.", "Ready", "route");

  const text = entry.text.trim();
  const lower = text.toLowerCase();

  if (lower.startsWith("reward: dockside tip")) {
    return pulse(text, entry.day, "neutral", "economy", "Tip", "Dockside Lead", text, dayMetricFor(text), "market");
  }

  if (lower.startsWith("reward: clean crossing")) {
    const morale = text.match(/morale to (\d+)/i);
    return pulse(text, entry.day, "progress", "route", "Reward", "Clean Crossing", text, morale?.[1] ? `${morale[1]} morale` : "+morale", "route");
  }

  if (lower.startsWith("reward: hard-water story")) {
    const standing = text.match(/standing \+([\d.]+)/i);
    return pulse(text, entry.day, "progress", "route", "Reward", "Hard-Water Story", text, standing?.[1] ? `+${standing[1]}` : "+standing", "route");
  }

  const sale = text.match(/^Sold .*; (profit|loss) (\$[\d,]+)\./i);
  if (sale) {
    const won = sale[1].toLowerCase() === "profit";
    return pulse(text, entry.day, won ? "gain" : "loss", "profit", won ? "Profit" : "Loss", won ? "Trade Cleared" : "Trade Cut", text, sale[2], won ? "profit" : "loss");
  }

  const contractPaid = text.match(/^(Completed|Partial delivery).*?(earned|paid) (\$[\d,]+)/i);
  if (contractPaid) return pulse(text, entry.day, "gain", "contract", "Contract", "Work Paid", text, contractPaid[3], "contract");

  const pirateBounty = text.match(/^Defeated .* claimed (\$[\d,]+)\./i);
  if (pirateBounty) return pulse(text, entry.day, "gain", "encounter", "Bounty", "Raiders Beaten", text, pirateBounty[1], "pirate");

  const insuranceClaim = text.match(/^Cargo policy paid (\$[\d,]+)/i);
  if (insuranceClaim) return pulse(text, entry.day, "gain", "contract", "Claim", "Cargo Covered", text, insuranceClaim[1], "insurance");

  const xp = text.match(/\+([\d,]+) XP/i);
  if (lower.includes("captain advanced")) return pulse(text, entry.day, "progress", "progress", "Rank", "Captain Advanced", text, "+1 skill", "rank-up");
  if (lower.includes(" became ") || xp) return pulse(text, entry.day, "progress", "progress", "Crew", lower.includes(" became ") ? "Crew Ranked Up" : "Experience Gained", text, xp ? `+${xp[1]} XP` : "Rank up", "rank-up");

  if (lower.startsWith("installed ") || lower.startsWith("replaced ") || lower.startsWith("trained ") || lower.startsWith("changed command") || lower.match(/^bought .*\. build/)) {
    return pulse(text, entry.day, "progress", "upgrade", "Upgrade", upgradeTitleFor(lower), text, buildMetricFor(text), "upgrade");
  }

  if (lower.startsWith("hired ") || lower.startsWith("shore leave restored")) {
    return pulse(text, entry.day, "progress", "progress", "Crew", lower.startsWith("hired ") ? "Crew Joined" : "Morale Restored", text, crewMetricFor(text), "crew");
  }

  const hullLoss = text.match(/(?:cost\s+|hull\s+-)(\d+) hull/i);
  if (hullLoss || lower.includes("mauled") || lower.startsWith("lost ") || lower.includes("failed") || lower.includes("missed ") || lower.includes("penalty") || lower.includes("fine")) {
    return pulse(text, entry.day, "loss", "damage", damageLabelFor(lower), damageTitleFor(lower), text, hullLoss ? `-${hullLoss[1]} hull` : moneyMetricFor(text, "Loss"), lower.includes("fine") || lower.includes("customs") ? "customs" : "damage");
  }

  if (lower.includes("customs") || lower.includes("pirate sails") || lower.includes("storm front") || lower.includes("green water") || lower.includes("heavy watch")) {
    return pulse(text, entry.day, "risk", "encounter", "Risk", riskTitleFor(lower), text, moneyMetricFor(text, "Decision"), riskCategoryFor(lower));
  }

  if (lower.startsWith("bought cargo policy")) {
    return pulse(text, entry.day, "risk", "contract", "Risk", "Cargo Covered", text, moneyMetricFor(text, "Insured"), "insurance");
  }

  if (lower.includes("shortage until") || lower.includes("glut until") || lower.includes("tariff") || lower.includes("convoy") || lower.includes("labor action") || lower.includes("inspectors")) {
    return pulse(text, entry.day, "neutral", "economy", "Market", "World Shifted", text, dayMetricFor(text), "market");
  }

  if (lower.startsWith("sailed for ") || lower.startsWith("loaded ") || lower.startsWith("bought ") || lower.startsWith("waited for tide")) {
    return pulse(text, entry.day, "neutral", "route", "Move", routeTitleFor(lower), text, moneyMetricFor(text, "Set"), "route");
  }

  if (lower.includes("run saved")) return pulse(text, entry.day, "neutral", "save", "Save", "Run Saved", text, "Device", "save");

  return pulse(text, entry.day, "neutral", "economy", "Log", "Ledger Updated", text, dayMetricFor(text), "market");
}

function encounterPulseFor(state: GameState): FeedbackPulse {
  const encounter = state.encounter!;
  if (encounter.kind === "pirate") {
    return pulse("pirate", state.day, "risk", "encounter", "Threat", "Pirate Contact", `Strength ${encounter.strength} near ${encounter.portName}.`, money(encounter.bounty), "pirate");
  }
  if (encounter.kind === "inspection") {
    const faction = factions.find((entry) => entry.id === encounter.factionId);
    return pulse("inspection", state.day, "risk", "encounter", "Authority", "Customs Hail", `${faction?.name ?? "Customs"} is holding the ship near ${encounter.portName}.`, money(encounter.fine ?? 0), "customs");
  }
  return pulse(
    "sea",
    state.day,
    "risk",
    "encounter",
    "Water",
    encounter.seaKind === "storm" ? "Storm Decision" : "Sea Watch",
    `${encounter.name} near ${encounter.portName}.`,
    `${Math.round((encounter.roughness ?? 0) * 100)}% sea`,
    encounter.seaKind === "storm" ? "storm" : "route"
  );
}

function voyagePulseFor(state: GameState): FeedbackPulse {
  const voyage = state.voyage!;
  const from = ports.find((port) => port.id === voyage.fromId)?.name ?? "Origin";
  const to = ports.find((port) => port.id === voyage.toId)?.name ?? "Destination";
  return pulse(
    "voyage",
    state.day,
    "neutral",
    "route",
    "Sailing",
    "Crossing Underway",
    `${from} to ${to}; ${voyage.seaLabel ?? "open water"}.`,
    `${Math.round(voyage.progress * 100)}%`,
    "route"
  );
}

function gameOverPulseFor(state: GameState): FeedbackPulse {
  const survived = state.day > 1;
  return pulse(
    "game-over",
    state.day,
    survived ? "progress" : "loss",
    "progress",
    "Run",
    "Run Closed",
    survived ? `Ledger closed on day ${state.day}.` : "Ledger closed before the first route paid.",
    `Day ${state.day}`,
    "game-over"
  );
}

function latestMeaningfulLog(log: GameState["log"]): LogEntry | undefined {
  return log.find((entry) => !isMundaneArrivalLog(entry.text)) ?? log[0];
}

function isMundaneArrivalLog(text: string) {
  const lower = text.trim().toLowerCase();
  return lower.startsWith("docked at ") || lower.startsWith("cargo policy closed at ");
}

function pulse(
  idSource: string,
  day: number,
  tone: FeedbackTone,
  kind: FeedbackKind,
  label: string,
  title: string,
  detail: string,
  metric: string,
  category: FeedbackCategory
): FeedbackPulse {
  const taxonomy = feedbackTaxonomy[category];
  return {
    id: `${day}-${kind}-${hashText(idSource)}`,
    day,
    tone,
    kind,
    category,
    audioCue: taxonomy.audioCue,
    motion: taxonomy.motion,
    priority: taxonomy.priority,
    label,
    title,
    detail,
    metric,
  };
}

function upgradeTitleFor(lower: string) {
  if (lower.startsWith("trained ")) return "Skill Trained";
  if (lower.startsWith("changed command") || lower.match(/^bought .*\. build/)) return "Command Changed";
  if (lower.startsWith("replaced ")) return "Refit Replaced";
  return "Refit Installed";
}

function damageLabelFor(lower: string) {
  if (lower.includes("missed ") || lower.includes("penalty")) return "Deadline";
  if (lower.includes("fine") || lower.includes("customs")) return "Fine";
  return "Damage";
}

function damageTitleFor(lower: string) {
  if (lower.includes("missed ") || lower.includes("penalty")) return "Penalty Posted";
  if (lower.includes("mauled") || lower.includes("pirate")) return "Fight Went Bad";
  if (lower.includes("failed")) return "Attempt Failed";
  return "Hull Took It";
}

function riskTitleFor(lower: string) {
  if (lower.includes("customs")) return "Inspection Pressure";
  if (lower.includes("pirate")) return "Raiders Sighted";
  if (lower.includes("storm")) return "Storm Water";
  return "Hard Water";
}

function riskCategoryFor(lower: string): FeedbackCategory {
  if (lower.includes("customs")) return "customs";
  if (lower.includes("pirate")) return "pirate";
  if (lower.includes("storm")) return "storm";
  return "route";
}

function routeTitleFor(lower: string) {
  if (lower.startsWith("sailed for ")) return "Route Committed";
  if (lower.startsWith("loaded ")) return "Hold Loaded";
  if (lower.startsWith("waited for tide")) return "Day Spent";
  return "Cargo Bought";
}

function buildMetricFor(text: string) {
  const build = text.match(/Build ([^.;]+)/i);
  const route = text.match(/Route ([^.;]+)/i);
  return build?.[1] ?? route?.[1] ?? "Built";
}

function crewMetricFor(text: string) {
  const morale = text.match(/morale (?:to|restored).*(\d+)/i);
  const payroll = text.match(/Payroll \+(\$[\d,]+)/i);
  return morale?.[1] ? `${morale[1]} morale` : payroll?.[1] ?? "Crew";
}

function moneyMetricFor(text: string, fallback: string) {
  const value = text.match(/\$[\d,]+/);
  return value?.[0] ?? fallback;
}

function dayMetricFor(text: string) {
  const day = text.match(/day (\d+)/i);
  return day ? `Day ${day[1]}` : "Now";
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash.toString(36);
}
