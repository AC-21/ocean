import { factions, ports } from "./data";
import { money } from "./math";
import type { GameState } from "./types";

export type FactionFavorKind = "ledger_credit" | "tide_runner_writ" | "patrol_cover" | "stevedore_shift";

export type FactionFavorSpec = {
  actionLabel: string;
  cost: number;
  detail: string;
  effect: string;
  factionId: string;
  kind: FactionFavorKind;
  label: string;
  minimumStanding: number;
  standingCost: number;
};

export type FactionFavorQuote = FactionFavorSpec & {
  available: boolean;
  factionName: string;
  reason: string;
  standing: number;
};

const factionFavorSpecs: Record<string, FactionFavorSpec> = {
  charter: {
    actionLabel: "Draw",
    cost: 50,
    detail: "Letter of credit converts influence into cheaper working cash.",
    effect: "+$520 cash, +$540 debt",
    factionId: "charter",
    kind: "ledger_credit",
    label: "Ledger Credit",
    minimumStanding: 6,
    standingCost: 2.4,
  },
  freeports: {
    actionLabel: "Rush",
    cost: 90,
    detail: "Dock runners clear a fast lane and loosen near-term cargo terms.",
    effect: "-8 route risk, -5% local prices for 5 days",
    factionId: "freeports",
    kind: "tide_runner_writ",
    label: "Tide Runner Writ",
    minimumStanding: 6,
    standingCost: 2.2,
  },
  admiralty: {
    actionLabel: "Patrol",
    cost: 120,
    detail: "A patrol flag makes pirate lanes think twice for a short window.",
    effect: "-18 route risk for 6 days",
    factionId: "admiralty",
    kind: "patrol_cover",
    label: "Patrol Cover",
    minimumStanding: 6,
    standingCost: 2.8,
  },
  league: {
    actionLabel: "Shift",
    cost: 80,
    detail: "Stevedores pull hidden stock into the current port's export sheds.",
    effect: "+8 local export stock, -6% local prices for 4 days",
    factionId: "league",
    kind: "stevedore_shift",
    label: "Stevedore Shift",
    minimumStanding: 6,
    standingCost: 2,
  },
};

export function factionFavorQuoteFor(
  state: Pick<GameState, "cash" | "currentPort" | "encounter" | "factionStanding" | "gameOver" | "voyage">
): FactionFavorQuote | null {
  const port = ports.find((entry) => entry.id === state.currentPort);
  if (!port) return null;
  const spec = factionFavorSpecs[port.faction];
  const faction = factions.find((entry) => entry.id === port.faction);
  if (!spec || !faction) return null;
  const standing = state.factionStanding[port.faction] ?? 0;
  const busy = Boolean(state.voyage || state.encounter || state.gameOver);
  const available = !busy && standing >= spec.minimumStanding && state.cash >= spec.cost;
  return {
    ...spec,
    available,
    factionName: faction.name,
    reason: favorReason({ busy, cash: state.cash, cost: spec.cost, minimumStanding: spec.minimumStanding, standing }),
    standing,
  };
}

export function allFactionFavorSpecs() {
  return Object.values(factionFavorSpecs);
}

function favorReason({
  busy,
  cash,
  cost,
  minimumStanding,
  standing,
}: {
  busy: boolean;
  cash: number;
  cost: number;
  minimumStanding: number;
  standing: number;
}) {
  if (busy) return "ship busy";
  if (standing < minimumStanding) return `needs ${minimumStanding.toFixed(1)} standing`;
  if (cash < cost) return `${money(cost - cash)} short`;
  return "ready";
}
