import { describe, expect, it } from "vitest";
import { ports } from "./data";
import { destinationReadFor, portIdentityFor, portIdentityLine } from "./portIdentity";
import { createInitialState } from "./reducer";

describe("port identity", () => {
  it("gives every port a market, politics, route, and visual identity", () => {
    for (const port of ports) {
      const identity = portIdentityFor(port.id);

      expect(identity.label.length).toBeGreaterThan(4);
      expect(identity.mapTag.length).toBeGreaterThan(4);
      expect(identity.marketHook).toContain("out");
      expect(identity.politics.length).toBeGreaterThan(10);
      expect(identity.routeHook.length).toBeGreaterThan(8);
      expect(identity.visualCue.length).toBeGreaterThan(12);
      expect(portIdentityLine(port.id)).toContain(identity.label);
    }
  });

  it("turns a destination into a compact route decision read", () => {
    const state = createInitialState();
    state.currentPort = "grayhaven";
    state.selectedPort = "stormhook";

    const read = destinationReadFor(state, "grayhaven", "stormhook");

    expect(read.label).toBe("Hard-Water Arsenal");
    expect(read.compact).toContain("gun harbor");
    expect(read.route).toMatch(/\dd/);
    expect(read.detail).toContain("danger lane with strong bounties");
    expect(read.politics).toContain("Admiralty Court");
  });

  it("labels the current harbor without pretending it is a route", () => {
    const state = createInitialState();

    const read = destinationReadFor(state, "grayhaven", "grayhaven");

    expect(read.compact).toContain("current harbor");
    expect(read.label).toBe("Counting House");
    expect(read.detail).toContain("low-risk ledger lane");
  });
});
