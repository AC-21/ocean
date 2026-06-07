import { describe, expect, it } from "vitest";
import { factionPressureSignalFor, routeFactionPressureFor, topFactionPressureSignals } from "./factionPressure";
import { createInitialState } from "./reducer";

describe("faction pressure", () => {
  it("ranks active tariff squeezes above quiet faction water", () => {
    const state = createInitialState();
    state.politicalEvents = [
      {
        id: "tariff-test",
        factionId: "charter",
        kind: "tariff",
        goodId: "silk",
        riskModifier: 0.02,
        priceModifier: 1.18,
        expires: state.day + 6,
        text: "Charter Bank raised tariff ledgers on silk.",
      },
    ];

    const signal = factionPressureSignalFor(state, "charter");
    const ranked = topFactionPressureSignals(state, 2);

    expect(signal.kind).toBe("squeeze");
    expect(signal.label).toBe("Tariff squeeze");
    expect(signal.priceDeltaPercent).toBeGreaterThan(10);
    expect(signal.detail).toContain("tariff Silk");
    expect(ranked[0].factionId).toBe("charter");
  });

  it("reads route-specific convoy cover from either endpoint faction", () => {
    const state = createInitialState();
    state.politicalEvents = [
      {
        id: "convoy-test",
        factionId: "freeports",
        kind: "convoy",
        riskModifier: -0.08,
        priceModifier: 0.97,
        expires: state.day + 5,
        text: "Freeport Compact posted convoy escorts near its harbors.",
      },
    ];

    const signal = routeFactionPressureFor(state, "grayhaven", "saffron");

    expect(signal?.factionId).toBe("freeports");
    expect(signal?.kind).toBe("edge");
    expect(signal?.label).toBe("Convoy cover");
    expect(signal?.routeRiskDelta).toBeLessThan(0);
  });
});
