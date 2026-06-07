import { describe, expect, it } from "vitest";
import { ports, shipCatalog } from "./data";
import {
  missingPortSpriteSpecs,
  missingShipSpriteSpecs,
  portHitRadius,
  portSpriteSpecFor,
  portSpriteVisualFor,
  shipDockOffset,
  shipSpriteSpecFor,
  shipSpriteWidth,
} from "./visuals";

describe("sprite visual specs", () => {
  it("covers every playable ship and port with explicit production metadata", () => {
    expect(missingShipSpriteSpecs()).toEqual([]);
    expect(missingPortSpriteSpecs()).toEqual([]);

    for (const ship of shipCatalog) {
      const spec = shipSpriteSpecFor(ship.id);
      expect(spec.anchorX).toBeGreaterThanOrEqual(0.45);
      expect(spec.anchorX).toBeLessThanOrEqual(0.55);
      expect(spec.anchorY).toBeGreaterThanOrEqual(0.5);
      expect(spec.anchorY).toBeLessThanOrEqual(0.62);
      expect(spec.wakeScale).toBeGreaterThan(0.9);
    }

    for (const port of ports) {
      const spec = portSpriteSpecFor(port.id);
      expect(spec.anchorX).toBeGreaterThanOrEqual(0.45);
      expect(spec.anchorX).toBeLessThanOrEqual(0.55);
      expect(spec.anchorY).toBeGreaterThanOrEqual(0.68);
      expect(spec.anchorY).toBeLessThanOrEqual(0.76);
      expect(spec.hitScale).toBeGreaterThanOrEqual(0.7);
    }
  });

  it("keeps ship and port sprites readable at map scale", () => {
    const desktopBase = 600;
    for (const ship of shipCatalog) {
      const width = shipSpriteWidth(desktopBase, ship.id);
      expect(width).toBeGreaterThanOrEqual(44);
      expect(width).toBeLessThanOrEqual(72);
      expect(shipDockOffset(desktopBase, ship.id)).toBeGreaterThanOrEqual(22);
    }

    for (const port of ports) {
      const width = portSpriteVisualFor(desktopBase, port.id).width;
      expect(width).toBeGreaterThanOrEqual(80);
      expect(width).toBeLessThanOrEqual(128);
      expect(portHitRadius(desktopBase, port.id)).toBeGreaterThanOrEqual(42);
    }
  });

  it("gives selected and hovered ports distinct presentation states", () => {
    const base = 600;
    const neutral = portSpriteVisualFor(base, "saffron");
    const hovered = portSpriteVisualFor(base, "saffron", { hovered: true });
    const selected = portSpriteVisualFor(base, "saffron", { selected: true });
    const current = portSpriteVisualFor(base, "saffron", { current: true });

    expect(hovered.width).toBeGreaterThan(neutral.width);
    expect(selected.width).toBeGreaterThan(hovered.width);
    expect(current.width).toBeGreaterThan(neutral.width);
    expect(new Set([neutral.tint, hovered.tint, selected.tint, current.tint]).size).toBe(4);
    expect(selected.markerAlpha).toBeGreaterThan(neutral.markerAlpha);
  });
});
