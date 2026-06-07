import { equipmentCatalog, shipCatalog } from "./data";
import { yardPriceFor } from "./shipyard";
import type { GameState, ShipSpec, UpgradeSpec } from "./types";

export type RunPhaseId = "early" | "mid" | "late";

export type RunPhase = {
  id: RunPhaseId;
  label: string;
  summary: string;
};

export type ContractPacing = {
  minUnits: number;
  maxUnits: number;
  routeUnitPressure: number;
  deadlineMin: number;
  deadlineMax: number;
  rewardMultiplier: number;
  penaltyMultiplier: number;
  label: string;
};

export type UpgradeTiming = {
  name: string;
  kind: "ship" | "equipment";
  price: number;
  gap: number;
  label: string;
  detail: string;
};

export function runPhaseForDay(day: number): RunPhase {
  if (day >= 41) {
    return {
      id: "late",
      label: "Late Gamble",
      summary: "high rewards, tight clocks, rougher obligations",
    };
  }
  if (day >= 17) {
    return {
      id: "mid",
      label: "Upgrade Window",
      summary: "contracts and routes should fund your next hull",
    };
  }
  return {
    id: "early",
    label: "Starter Ledger",
    summary: "cheap lanes, forgiving deadlines, cash discipline",
  };
}

export function contractPacingForDay(day: number): ContractPacing {
  const phase = runPhaseForDay(day).id;
  if (phase === "late") {
    return {
      minUnits: 5,
      maxUnits: 9,
      routeUnitPressure: 1.6,
      deadlineMin: 2,
      deadlineMax: 5,
      rewardMultiplier: 1.72,
      penaltyMultiplier: 0.52,
      label: "premium risk",
    };
  }
  if (phase === "mid") {
    return {
      minUnits: 3,
      maxUnits: 6,
      routeUnitPressure: 1.1,
      deadlineMin: 5,
      deadlineMax: 8,
      rewardMultiplier: 1.34,
      penaltyMultiplier: 0.42,
      label: "upgrade stake",
    };
  }
  return {
    minUnits: 1,
    maxUnits: 3,
    routeUnitPressure: 0.4,
    deadlineMin: 7,
    deadlineMax: 11,
    rewardMultiplier: 1,
    penaltyMultiplier: 0.35,
    label: "starter run",
  };
}

export function nextUpgradeTiming(state: Pick<GameState, "cash" | "currentPort" | "factionStanding" | "ownedShips" | "equipment" | "day">): UpgradeTiming | null {
  const shipTargets = shipCatalog
    .filter((ship) => ship.price > 0 && !state.ownedShips.includes(ship.id))
    .map((ship) => upgradeTimingForItem(state, ship, "ship" as const));
  const equipmentTargets = equipmentCatalog
    .filter((item) => !state.equipment.includes(item.id))
    .map((item) => upgradeTimingForItem(state, item, "equipment" as const));
  const phase = runPhaseForDay(state.day);
  if (phase.id !== "early" && state.ownedShips.length <= 1 && shipTargets.length) {
    return shipTargets.sort((left, right) => left.gap - right.gap || left.price - right.price)[0];
  }
  const targets = [...shipTargets, ...equipmentTargets].sort((left, right) => {
    return left.gap - right.gap || left.price - right.price;
  });
  return targets[0] ?? null;
}

function upgradeTimingForItem(
  state: Pick<GameState, "cash" | "currentPort" | "factionStanding" | "day">,
  item: ShipSpec | UpgradeSpec,
  kind: UpgradeTiming["kind"]
): UpgradeTiming {
  const price = yardPriceFor(state, item);
  const gap = Math.max(0, price - state.cash);
  const phase = runPhaseForDay(state.day);
  const ready = gap <= 0;
  return {
    name: item.name,
    kind,
    price,
    gap,
    label: ready ? "Ready now" : phase.id === "early" ? "Save toward" : phase.id === "mid" ? "Upgrade target" : "Last chance",
    detail: ready ? `${kind === "ship" ? "Command" : "Install"} before the next hard leg` : `${phase.label}: ${phase.summary}`,
  };
}
