import { ports } from "./data";
import { clamp, money } from "./math";
import type { GameState, RouteMemory, RouteMemoryMap, RouteMemoryTone, SailPlanId } from "./types";

export type RouteMemoryEvent = "clean" | "heavy-weather" | "pirate" | "inspection";

export type RouteMemoryOutcome = {
  fromId: string;
  toId: string;
  day: number;
  projectedProfit: number;
  wear: number;
  risk: number;
  sailPlan?: SailPlanId;
  event: RouteMemoryEvent;
};

export type RouteMemorySummary = {
  label: string;
  compact: string;
  detail: string;
  tone: RouteMemoryTone;
};

export function routeMemoryKey(fromId: string, toId: string) {
  return `${fromId}->${toId}`;
}

export function routeMemoryFor(state: Pick<GameState, "routeMemory">, fromId: string, toId: string) {
  return state.routeMemory?.[routeMemoryKey(fromId, toId)] ?? null;
}

export function rememberRouteOutcome(state: Pick<GameState, "routeMemory">, outcome: RouteMemoryOutcome) {
  const key = routeMemoryKey(outcome.fromId, outcome.toId);
  const previous = state.routeMemory?.[key];
  const trips = (previous?.trips ?? 0) + 1;
  const totalProjectedProfit = (previous?.totalProjectedProfit ?? 0) + outcome.projectedProfit;
  const totalWear = (previous?.totalWear ?? 0) + outcome.wear;
  const memory: RouteMemory = {
    fromId: outcome.fromId,
    toId: outcome.toId,
    trips,
    lastDay: outcome.day,
    totalProjectedProfit,
    bestProjectedProfit: Math.max(previous?.bestProjectedProfit ?? outcome.projectedProfit, outcome.projectedProfit),
    worstProjectedProfit: Math.min(previous?.worstProjectedProfit ?? outcome.projectedProfit, outcome.projectedProfit),
    totalWear,
    worstWear: Math.max(previous?.worstWear ?? 0, outcome.wear),
    pirateTrouble: (previous?.pirateTrouble ?? 0) + (outcome.event === "pirate" ? 1 : 0),
    inspectionTrouble: (previous?.inspectionTrouble ?? 0) + (outcome.event === "inspection" ? 1 : 0),
    heavyWeather: (previous?.heavyWeather ?? 0) + (outcome.event === "heavy-weather" || outcome.wear >= 8 ? 1 : 0),
    lastLabel: routeOutcomeLabel(outcome),
    lastDetail: routeOutcomeDetail(outcome),
    tone: routeOutcomeTone(outcome),
  };
  state.routeMemory = { ...(state.routeMemory ?? {}), [key]: memory };
  return memory;
}

export function routeMemorySummary(memory: RouteMemory | null): RouteMemorySummary {
  if (!memory) {
    return {
      label: "Unwritten water",
      compact: "No memory",
      detail: "No crossings logged on this lane yet.",
      tone: "neutral",
    };
  }

  const averageProfit = memory.totalProjectedProfit / Math.max(1, memory.trips);
  const averageWear = memory.totalWear / Math.max(1, memory.trips);
  const trouble = memory.pirateTrouble + memory.inspectionTrouble + memory.heavyWeather;
  const troubleRate = trouble / Math.max(1, memory.trips);

  if (memory.pirateTrouble >= 2 || memory.pirateTrouble / memory.trips >= 0.5) {
    return routeSummary(memory, "Pirate water", "Pirates remembered this lane.", "risk");
  }
  if (memory.inspectionTrouble >= 2 || memory.inspectionTrouble / memory.trips >= 0.5) {
    return routeSummary(memory, "Customs watched", "Authority pressure has found this lane.", "risk");
  }
  if (memory.worstWear >= 12 || memory.heavyWeather >= 2) {
    return routeSummary(memory, "Hard-water lane", `Worst crossing cost ${memory.worstWear} hull.`, "risk");
  }
  if (averageProfit >= 220 && troubleRate < 0.5) {
    return routeSummary(memory, "Proven money lane", `Average cargo swing ${money(averageProfit)}.`, "gain");
  }
  if (memory.bestProjectedProfit >= 520) {
    return routeSummary(memory, "Rich lane", `Best cargo swing ${money(memory.bestProjectedProfit)}.`, "gain");
  }
  if (averageProfit < -80) {
    return routeSummary(memory, "Bad ledger lane", `Average cargo swing ${money(averageProfit)}.`, "loss");
  }
  if (averageWear <= 2 && trouble === 0) {
    return routeSummary(memory, "Clean known lane", `Average wear ${averageWear.toFixed(1)} hull.`, "progress");
  }
  return routeSummary(memory, "Known lane", memory.lastDetail, memory.tone);
}

export function normalizeRouteMemory(value: unknown, day: number): RouteMemoryMap {
  if (!isRecord(value)) return {};
  const memory: RouteMemoryMap = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const fromId = normalizePortId(entry.fromId);
    const toId = normalizePortId(entry.toId);
    if (!fromId || !toId || fromId === toId) continue;
    const canonicalKey = routeMemoryKey(fromId, toId);
    if (key !== canonicalKey && memory[canonicalKey]) continue;
    const trips = boundedInteger(entry.trips, 1, 1, 999);
    const normalized: RouteMemory = {
      fromId,
      toId,
      trips,
      lastDay: boundedInteger(entry.lastDay, day, 1, day + 60),
      totalProjectedProfit: boundedInteger(entry.totalProjectedProfit, 0, -999999, 999999),
      bestProjectedProfit: boundedInteger(entry.bestProjectedProfit, 0, -999999, 999999),
      worstProjectedProfit: boundedInteger(entry.worstProjectedProfit, 0, -999999, 999999),
      totalWear: boundedInteger(entry.totalWear, 0, 0, 9999),
      worstWear: boundedInteger(entry.worstWear, 0, 0, 99),
      pirateTrouble: boundedInteger(entry.pirateTrouble, 0, 0, trips),
      inspectionTrouble: boundedInteger(entry.inspectionTrouble, 0, 0, trips),
      heavyWeather: boundedInteger(entry.heavyWeather, 0, 0, trips),
      lastLabel: cleanText(entry.lastLabel, "Known lane", 48),
      lastDetail: cleanText(entry.lastDetail, "Crossing restored from save.", 120),
      tone: normalizeTone(entry.tone),
    };
    memory[canonicalKey] = normalized;
  }
  return memory;
}

function routeSummary(memory: RouteMemory, label: string, reason: string, tone: RouteMemoryTone): RouteMemorySummary {
  const averageProfit = memory.totalProjectedProfit / Math.max(1, memory.trips);
  const averageWear = memory.totalWear / Math.max(1, memory.trips);
  return {
    label,
    compact: `${label} ${memory.trips}x`,
    detail: `${reason} ${memory.trips}x | avg ${signedMoney(averageProfit)} | wear ${averageWear.toFixed(1)} | trouble ${
      memory.pirateTrouble + memory.inspectionTrouble + memory.heavyWeather
    }`,
    tone,
  };
}

function routeOutcomeLabel(outcome: RouteMemoryOutcome) {
  if (outcome.event === "pirate") return "Pirates sighted";
  if (outcome.event === "inspection") return "Customs hail";
  if (outcome.event === "heavy-weather") return "Hard water";
  if (outcome.projectedProfit >= 220) return "Good cargo swing";
  if (outcome.projectedProfit < -80) return "Bad cargo swing";
  return "Clean crossing";
}

function routeOutcomeDetail(outcome: RouteMemoryOutcome) {
  const plan = outcome.sailPlan ? `${outcome.sailPlan} order` : "unknown order";
  return `${plan} | ${signedMoney(outcome.projectedProfit)} cargo swing | ${outcome.wear} wear | ${Math.round(outcome.risk * 100)}% risk`;
}

function routeOutcomeTone(outcome: RouteMemoryOutcome): RouteMemoryTone {
  if (outcome.event === "pirate" || outcome.event === "inspection" || outcome.event === "heavy-weather") return "risk";
  if (outcome.projectedProfit >= 220) return "gain";
  if (outcome.projectedProfit < -80) return "loss";
  return "progress";
}

function signedMoney(value: number) {
  if (value < 0) return `-${money(Math.abs(value))}`;
  return `+${money(value)}`;
}

function normalizeTone(value: unknown): RouteMemoryTone {
  return value === "gain" || value === "loss" || value === "risk" || value === "progress" || value === "neutral" ? value : "neutral";
}

function normalizePortId(value: unknown) {
  return typeof value === "string" && ports.some((port) => port.id === value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  return Math.round(clamp(finiteNumber(value, fallback), min, max));
}

function finiteNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : fallback;
}
