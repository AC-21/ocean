import { factions, goods, ports } from "./data";
import { freightPressureSignalFor, portLogisticsPressure, routeTradePlanFor } from "./economy";
import { money } from "./math";
import { routeDays, routeRisk, shippingLanePressure } from "./routing";
import type { GameState } from "./types";

export type PortIdentity = {
  id: string;
  label: string;
  mapTag: string;
  marketHook: string;
  politics: string;
  routeHook: string;
  visualCue: string;
};

export type DestinationRead = {
  compact: string;
  detail: string;
  label: string;
  market: string;
  politics: string;
  route: string;
};

const portIdentities: Record<string, PortIdentity> = {
  grayhaven: {
    id: "grayhaven",
    label: "Counting House",
    mapTag: "credit hub",
    marketHook: "iron/tools out, silk/medicine in",
    politics: "Charter tariffs reward permit play",
    routeHook: "low-risk ledger lane",
    visualCue: "fog banks, slate quays, counting-house lamps",
  },
  saffron: {
    id: "saffron",
    label: "Spice Rush",
    mapTag: "fast market",
    marketHook: "spice/tea out, iron/tools in",
    politics: "Freeport docks favor speed and open access",
    routeHook: "wind-window speculation",
    visualCue: "bright piers, saffron awnings, quick cutters",
  },
  glassport: {
    id: "glassport",
    label: "Contract Exchange",
    mapTag: "contract desk",
    marketHook: "glass/medicine out, tea/spice in",
    politics: "Charter clerks price paperwork and reputation",
    routeHook: "central relay and deadline routing",
    visualCue: "glass warehouses, small print, cold lamps",
  },
  stormhook: {
    id: "stormhook",
    label: "Hard-Water Arsenal",
    mapTag: "gun harbor",
    marketHook: "iron/medicine out, silk/tea in",
    politics: "Admiralty law rewards guns and convoy standing",
    routeHook: "danger lane with strong bounties",
    visualCue: "black rocks, cannon yards, breaking surf",
  },
  orchid: {
    id: "orchid",
    label: "Luxury Roadstead",
    mapTag: "silk buyers",
    marketHook: "silk/glass out, tools/spice in",
    politics: "Freeport buyers reward quiet high-value cargo",
    routeHook: "rich southern bids and customs tension",
    visualCue: "deep-water villas, silk stores, sheltered roads",
  },
  lowmarket: {
    id: "lowmarket",
    label: "Labor Wharf",
    mapTag: "bulk docks",
    marketHook: "tools/tea out, medicine/glass in",
    politics: "League strikes and workgangs swing freight cost",
    routeHook: "bulk-margin recovery lane",
    visualCue: "weigh houses, cranes, practical workboats",
  },
};

export function portIdentityFor(portId: string): PortIdentity {
  const port = ports.find((entry) => entry.id === portId);
  return portIdentities[portId] ?? {
    id: portId,
    label: port?.name ?? "Unknown Harbor",
    mapTag: "open port",
    marketHook: "general cargo",
    politics: "local politics unclear",
    routeHook: "unscouted lane",
    visualCue: "unmapped harbor",
  };
}

export function portIdentityLine(portId: string) {
  const identity = portIdentityFor(portId);
  return `${identity.label} | ${identity.marketHook}`;
}

export function destinationReadFor(state: GameState, fromId: string, toId: string): DestinationRead {
  const identity = portIdentityFor(toId);
  const port = ports.find((entry) => entry.id === toId);
  const faction = factions.find((entry) => entry.id === port?.faction);
  const logistics = portLogisticsPressure(state, toId);
  const bestSignal = bestFreightSignalForPort(state, toId);
  const plan = fromId !== toId ? routeTradePlanFor(state, toId, fromId) : null;
  const route = fromId === toId ? "current harbor" : routeReadFor(state, fromId, toId);
  const market =
    plan && plan.maxBuy > 0 && plan.riskAdjustedMargin > 0
      ? `${plan.goodName} ${money(plan.riskAdjustedMargin)}/u`
      : bestSignal
        ? `${goodName(bestSignal.goodId)} ${bestSignal.label.toLowerCase()}`
        : identity.marketHook;
  const standing = faction ? state.factionStanding[faction.id] ?? 0 : 0;
  const politics = faction ? `${faction.name} ${standing >= 8 ? "favored" : standing <= -6 ? "strained" : "neutral"}` : identity.politics;
  return {
    compact: `${identity.mapTag} | ${route}`,
    detail: `${market} | ${logistics.label} | ${identity.routeHook}`,
    label: identity.label,
    market,
    politics,
    route,
  };
}

function bestFreightSignalForPort(state: GameState, portId: string) {
  return goods
    .map((good) => freightPressureSignalFor(state, portId, good.id))
    .sort((left, right) => right.score - left.score || signalPriority(right.kind) - signalPriority(left.kind))
    [0] ?? null;
}

function routeReadFor(state: GameState, fromId: string, toId: string) {
  const risk = routeRisk(state, fromId, toId);
  const days = routeDays(state, fromId, toId);
  const pressure = shippingLanePressure(state.day, fromId, toId);
  const lane =
    risk >= 0.32 ? "danger lane" : pressure >= 0.5 ? "strained lane" : risk <= 0.16 ? "safe lane" : "open lane";
  return `${days}d ${lane}`;
}

function goodName(goodId: string) {
  return goods.find((good) => good.id === goodId)?.name ?? goodId;
}

function signalPriority(kind: ReturnType<typeof freightPressureSignalFor>["kind"]) {
  if (kind === "stockout") return 4;
  if (kind === "import-pressure") return 3;
  if (kind === "export-surplus") return 2;
  if (kind === "political-friction") return 1;
  return 0;
}
