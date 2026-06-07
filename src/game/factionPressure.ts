import { factions, goods, ports } from "./data";
import { standingBenefits, standingTier } from "./politics";
import type { GameState, PoliticalEvent } from "./types";

export type FactionPressureKind = "edge" | "squeeze" | "risk" | "watched" | "quiet";

export type FactionPressureSignal = {
  activeEvents: PoliticalEvent[];
  detail: string;
  factionId: string;
  factionName: string;
  kind: FactionPressureKind;
  label: string;
  priceDeltaPercent: number;
  routeRiskDelta: number;
  score: number;
  standing: number;
  standingLabel: string;
};

export function factionPressureSignalFor(
  state: Pick<GameState, "day" | "factionStanding" | "politicalEvents">,
  factionId: string
): FactionPressureSignal {
  const faction = factions.find((entry) => entry.id === factionId);
  const standing = state.factionStanding[factionId] ?? 0;
  const benefits = standingBenefits(standing);
  const activeEvents = state.politicalEvents.filter((event) => event.factionId === factionId && event.expires >= state.day);
  const eventRiskDelta = activeEvents.reduce((sum, event) => sum + event.riskModifier, 0);
  const eventPriceModifier = activeEvents.reduce((modifier, event) => modifier * event.priceModifier, 1);
  const routeRiskDelta = Number((benefits.routeRiskModifier + eventRiskDelta).toFixed(3));
  const priceDeltaPercent = Math.round((benefits.priceModifier * eventPriceModifier - 1) * 100);
  const kind = factionPressureKind({ activeEvents, priceDeltaPercent, routeRiskDelta, standing });
  const standingLabel = standingTier(standing).label;

  return {
    activeEvents,
    detail: factionPressureDetail({ activeEvents, priceDeltaPercent, routeRiskDelta, standingLabel }),
    factionId,
    factionName: faction?.name ?? factionId,
    kind,
    label: factionPressureLabel(kind, activeEvents),
    priceDeltaPercent,
    routeRiskDelta,
    score: factionPressureScore({ activeEvents, priceDeltaPercent, routeRiskDelta, standing }),
    standing,
    standingLabel,
  };
}

export function topFactionPressureSignals(
  state: Pick<GameState, "day" | "factionStanding" | "politicalEvents">,
  limit = 4
): FactionPressureSignal[] {
  return factions
    .map((faction) => factionPressureSignalFor(state, faction.id))
    .sort((left, right) => {
      return right.score - left.score || factionKindPriority(right.kind) - factionKindPriority(left.kind) || left.factionName.localeCompare(right.factionName);
    })
    .slice(0, limit);
}

export function routeFactionPressureFor(
  state: Pick<GameState, "day" | "factionStanding" | "politicalEvents">,
  fromPortId: string,
  toPortId: string
): FactionPressureSignal | null {
  const from = ports.find((port) => port.id === fromPortId);
  const to = ports.find((port) => port.id === toPortId);
  const factionIds = [...new Set([from?.faction, to?.faction].filter((id): id is string => Boolean(id)))];
  if (!factionIds.length) return null;
  const signals = factionIds.map((factionId) => factionPressureSignalFor(state, factionId));
  const signal = signals.sort((left, right) => right.score - left.score || factionKindPriority(right.kind) - factionKindPriority(left.kind))[0];
  return signal.score > 0 ? signal : null;
}

function factionPressureKind({
  activeEvents,
  priceDeltaPercent,
  routeRiskDelta,
  standing,
}: {
  activeEvents: PoliticalEvent[];
  priceDeltaPercent: number;
  routeRiskDelta: number;
  standing: number;
}): FactionPressureKind {
  if (routeRiskDelta <= -0.045 || priceDeltaPercent <= -5) return "edge";
  if (priceDeltaPercent >= 7) return "squeeze";
  if (routeRiskDelta >= 0.045) return "risk";
  if (standing <= -4 || activeEvents.length) return "watched";
  return "quiet";
}

function factionPressureLabel(kind: FactionPressureKind, activeEvents: PoliticalEvent[]) {
  if (kind === "edge" && activeEvents.some((event) => event.kind === "convoy")) return "Convoy cover";
  if (kind === "edge" && activeEvents.some((event) => event.kind === "permit")) return "Permit edge";
  if (kind === "edge") return "Political edge";
  if (kind === "squeeze" && activeEvents.some((event) => event.kind === "tariff")) return "Tariff squeeze";
  if (kind === "squeeze" && activeEvents.some((event) => event.kind === "strike")) return "Dock squeeze";
  if (kind === "squeeze") return "Faction squeeze";
  if (kind === "risk" && activeEvents.some((event) => event.kind === "inspection")) return "Inspection risk";
  if (kind === "risk") return "Route risk";
  if (kind === "watched") return "Watched docks";
  return "Neutral water";
}

function factionPressureDetail({
  activeEvents,
  priceDeltaPercent,
  routeRiskDelta,
  standingLabel,
}: {
  activeEvents: PoliticalEvent[];
  priceDeltaPercent: number;
  routeRiskDelta: number;
  standingLabel: string;
}) {
  const eventText = activeEvents.length ? activeEvents.map(eventName).slice(0, 2).join("/") : "no edict";
  return `${standingLabel} | routes ${signedPoints(routeRiskDelta)} | prices ${signedPercent(priceDeltaPercent)} | ${eventText}`;
}

function factionPressureScore({
  activeEvents,
  priceDeltaPercent,
  routeRiskDelta,
  standing,
}: {
  activeEvents: PoliticalEvent[];
  priceDeltaPercent: number;
  routeRiskDelta: number;
  standing: number;
}) {
  return Math.round(Math.abs(routeRiskDelta) * 120 + Math.abs(priceDeltaPercent) * 1.1 + activeEvents.length * 6 + Math.abs(standing) * 0.25);
}

function factionKindPriority(kind: FactionPressureKind) {
  const priority: Record<FactionPressureKind, number> = {
    edge: 5,
    squeeze: 4,
    risk: 3,
    watched: 2,
    quiet: 1,
  };
  return priority[kind];
}

function eventName(event: PoliticalEvent) {
  const goodName = event.goodId ? ` ${goods.find((good) => good.id === event.goodId)?.name ?? event.goodId}` : "";
  return `${event.kind}${goodName} to d${event.expires}`;
}

function signedPoints(value: number) {
  const points = Math.round(value * 100);
  if (points === 0) return "flat";
  return `${points > 0 ? "+" : ""}${points}pt`;
}

function signedPercent(value: number) {
  if (value === 0) return "flat";
  return `${value > 0 ? "+" : ""}${value}%`;
}
