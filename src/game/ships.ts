import { shipCatalog } from "./data";
import type { ShipHandling, ShipRoleId, ShipSpec } from "./types";

export const defaultShipHandling: ShipHandling = {
  windAffinity: 0,
  currentAffinity: 0,
  roughWaterRelief: 0,
  cargoDragModifier: 1,
  cargoRiskModifier: 1,
  riskModifier: 0,
  wearModifier: 1,
  resaleModifier: 1,
};

const roleLabels: Record<ShipRoleId, string> = {
  starter: "Starter Cutter",
  balanced: "Ledger Trader",
  clipper: "Route Hunter",
  patrol: "Patrol Cutter",
  barge: "Convoy Barge",
  freighter: "Heavy Freighter",
};

export function shipById(shipId: string) {
  return shipCatalog.find((ship) => ship.id === shipId) ?? shipCatalog[0];
}

export function shipRoleLabel(ship: ShipSpec) {
  return roleLabels[ship.role] ?? "Merchant Hull";
}

export function shipHandlingFor(shipId: string) {
  return shipById(shipId).handling ?? defaultShipHandling;
}

export function shipHandlingLabel(shipId: string) {
  const ship = shipById(shipId);
  const handling = shipHandlingFor(ship.id);
  const wind = Math.round(handling.windAffinity * 100);
  const risk = Math.round(handling.riskModifier * 100);
  const wear = Math.round((1 - handling.wearModifier) * 100);
  return `${shipRoleLabel(ship)} | wind ${signed(wind)} | risk ${risk === 0 ? "flat" : `${signed(risk)}pt`} | wear ${signedBenefit(wear)}`;
}

export function shipIdentitySummary(ship: ShipSpec) {
  return `${shipRoleLabel(ship)} | ${ship.silhouette}`;
}

export function shipUpgradePath(ship: ShipSpec) {
  return `Path: ${ship.upgradePath}`;
}

export function shipResaleProfile(ship: ShipSpec) {
  const modifier = ship.handling?.resaleModifier ?? 1;
  if (modifier >= 1.1) return "strong resale";
  if (modifier >= 1.03) return "steady resale";
  if (modifier <= 0.96) return "soft resale";
  return "standard resale";
}

function signed(value: number) {
  if (value === 0) return "flat";
  return `${value > 0 ? "+" : ""}${value}`;
}

function signedBenefit(value: number) {
  if (value === 0) return "flat";
  return `${value > 0 ? "-" : "+"}${Math.abs(value)}%`;
}
