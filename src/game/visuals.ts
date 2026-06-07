import { ports, shipCatalog } from "./data";
import { clamp } from "./math";

export type SpriteState = {
  current?: boolean;
  hovered?: boolean;
  selected?: boolean;
};

export type ShipSpriteSpec = {
  id: string;
  anchorX: number;
  anchorY: number;
  mapScale: number;
  minWidth: number;
  maxWidth: number;
  dockOffset: number;
  wakeScale: number;
};

export type PortSpriteSpec = {
  id: string;
  anchorX: number;
  anchorY: number;
  mapScale: number;
  minWidth: number;
  maxWidth: number;
  hitScale: number;
  labelOffset: number;
  markerOffset: number;
};

export type PortSpriteVisual = {
  alpha: number;
  markerAlpha: number;
  markerColor: number;
  outlineWidth: number;
  tint: number;
  width: number;
};

const defaultShipSpec: Omit<ShipSpriteSpec, "id"> = {
  anchorX: 0.5,
  anchorY: 0.56,
  mapScale: 0.1,
  minWidth: 36,
  maxWidth: 78,
  dockOffset: 0.062,
  wakeScale: 1,
};

export const shipSpriteSpecs: Record<string, ShipSpriteSpec> = {
  coastal_sloop: { ...defaultShipSpec, id: "coastal_sloop", mapScale: 0.1, dockOffset: 0.058, wakeScale: 0.96 },
  ledger_brig: { ...defaultShipSpec, id: "ledger_brig", mapScale: 0.104, dockOffset: 0.064, wakeScale: 1.02 },
  clipper_kite: { ...defaultShipSpec, id: "clipper_kite", mapScale: 0.094, dockOffset: 0.06, wakeScale: 1.08 },
  harbor_cutter: { ...defaultShipSpec, id: "harbor_cutter", mapScale: 0.096, dockOffset: 0.061, wakeScale: 1.06 },
  iron_barge: { ...defaultShipSpec, id: "iron_barge", mapScale: 0.118, dockOffset: 0.068, wakeScale: 1.14 },
  league_carrier: { ...defaultShipSpec, id: "league_carrier", mapScale: 0.12, dockOffset: 0.07, wakeScale: 1.1 },
};

const defaultPortSpec: Omit<PortSpriteSpec, "id"> = {
  anchorX: 0.5,
  anchorY: 0.72,
  mapScale: 0.18,
  minWidth: 62,
  maxWidth: 128,
  hitScale: 0.72,
  labelOffset: 0.38,
  markerOffset: 0.13,
};

export const portSpriteSpecs: Record<string, PortSpriteSpec> = {
  grayhaven: { ...defaultPortSpec, id: "grayhaven", mapScale: 0.18, hitScale: 0.74 },
  saffron: { ...defaultPortSpec, id: "saffron", mapScale: 0.17, anchorY: 0.7, hitScale: 0.72 },
  glassport: { ...defaultPortSpec, id: "glassport", mapScale: 0.18, hitScale: 0.74 },
  stormhook: { ...defaultPortSpec, id: "stormhook", mapScale: 0.22, anchorY: 0.74, hitScale: 0.8 },
  orchid: { ...defaultPortSpec, id: "orchid", mapScale: 0.18, anchorY: 0.71, hitScale: 0.72 },
  lowmarket: { ...defaultPortSpec, id: "lowmarket", mapScale: 0.19, anchorY: 0.73, hitScale: 0.76 },
};

export function shipSpriteSpecFor(shipId: string): ShipSpriteSpec {
  return shipSpriteSpecs[shipId] ?? { ...defaultShipSpec, id: shipId };
}

export function portSpriteSpecFor(portId: string): PortSpriteSpec {
  return portSpriteSpecs[portId] ?? { ...defaultPortSpec, id: portId };
}

export function shipSpriteWidth(base: number, shipId: string) {
  const spec = shipSpriteSpecFor(shipId);
  return clamp(base * spec.mapScale, spec.minWidth, spec.maxWidth);
}

export function shipDockOffset(base: number, shipId: string) {
  return clamp(base * shipSpriteSpecFor(shipId).dockOffset, 22, 38);
}

export function portSpriteWidth(base: number, portId: string, state: SpriteState = {}) {
  const spec = portSpriteSpecFor(portId);
  return clamp(base * spec.mapScale * spriteStateScale(state), spec.minWidth, spec.maxWidth);
}

export function portHitRadius(base: number, portId: string) {
  const spec = portSpriteSpecFor(portId);
  return clamp(base * spec.mapScale * spec.hitScale, 42, 78);
}

export function portSpriteVisualFor(base: number, portId: string, state: SpriteState = {}): PortSpriteVisual {
  return {
    alpha: state.selected || state.current || state.hovered ? 1 : 0.9,
    markerAlpha: state.selected || state.current ? 0.82 : state.hovered ? 0.64 : 0.28,
    markerColor: state.selected ? 0xd6a43a : state.current ? 0x4fa36c : state.hovered ? 0x93d4dc : 0xffffff,
    outlineWidth: state.selected || state.current ? 3 : state.hovered ? 2.5 : 2,
    tint: state.selected ? 0xfff1b8 : state.current ? 0xddffe8 : state.hovered ? 0xe9faf7 : 0xffffff,
    width: portSpriteWidth(base, portId, state),
  };
}

function spriteStateScale(state: SpriteState) {
  if (state.selected) return 1.08;
  if (state.current) return 1.05;
  if (state.hovered) return 1.04;
  return 1;
}

export function missingShipSpriteSpecs() {
  return shipCatalog.map((ship) => ship.id).filter((id) => !shipSpriteSpecs[id]);
}

export function missingPortSpriteSpecs() {
  return ports.map((port) => port.id).filter((id) => !portSpriteSpecs[id]);
}
