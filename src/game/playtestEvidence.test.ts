import { describe, expect, it } from "vitest";
import { playtestEvidencePacketFor, playtestScorecardDraftFor } from "./playtestEvidence";
import { createInitialState, reduceGame } from "./reducer";

describe("playtest evidence packet", () => {
  it("exports build context, run state, route choices, and observer fields", () => {
    const state = reduceGame(createInitialState(), { type: "selectPort", portId: "saffron" });

    const packet = playtestEvidencePacketFor(state, {
      build: "0.1.0-test",
      generatedAt: "2026-06-06T12:00:00.000Z",
      graphicsMode: "balanced",
      reducedMotion: true,
      runtime: "Electron",
      storagePath: "/tmp/harborline-game",
      logsPath: "/tmp/harborline-runtime.ndjson",
    });

    expect(packet).toContain("# Harborline Playtest Evidence Packet");
    expect(packet).toContain("- Build: 0.1.0-test");
    expect(packet).toContain("- Runtime: Electron");
    expect(packet).toContain("- Reduced motion: yes");
    expect(packet).toContain("- Latest scorecard target: /tmp/harborline-game/playtest.latest.md");
    expect(packet).toContain("- Scorecard history target: /tmp/harborline-game/playtest.history.v1.json");
    expect(packet).toContain("Grayhaven -> Saffron Quay");
    expect(packet).toContain("## Route Choice Read");
    expect(packet).toContain("## Required Observer Notes");
    expect(packet).toContain("- First confusing moment:");
    expect(packet).toContain("| Loop | Start port | Chosen destination |");
    expect(packet).toContain("Auto-filled from completed route history");
    expect(packet).toContain("## Evidence Links");
  });

  it("records upgrades, crew, contracts, runtime errors, and recent ledger evidence", () => {
    let state = createInitialState();
    state.cash = 2600;
    const offer = state.contracts.find((contract) => contract.originPortId === state.currentPort && contract.status === "available");
    if (offer) state = reduceGame(state, { type: "acceptContract", contractId: offer.id });
    state = reduceGame(state, { type: "buyEquipment", equipmentId: "weather_glass" });
    state = reduceGame(state, { type: "hireCrew", crewId: "navigator" });
    state = reduceGame(state, { type: "recordError", error: { message: "Playtest probe", source: "test" } });

    const packet = playtestEvidencePacketFor(state, { generatedAt: "2026-06-06T12:00:00.000Z" });

    expect(packet).toContain("Weather Glass");
    expect(packet).toContain("Navigator");
    expect(packet).toContain("- Runtime errors: 1");
    expect(packet).toMatch(/Day \d+: Installed Weather Glass/);
    expect(packet).toContain("## Active Contracts");
    expect(packet).toContain("Charter Bank");
  });

  it("prefills route loop rows from completed route history", () => {
    const state = createInitialState();
    state.routeHistory = [
      {
        day: 8,
        fromId: "grayhaven",
        toId: "saffron",
        sailPlan: "hard",
        projectedProfit: 260,
        risk: 0.24,
        wear: 4,
        outcome: "clean",
        reason: "cargo swing +$260",
        cargoSummary: "3 Tea",
        label: "Good cargo swing",
        detail: "hard order | +$260 cargo swing | 4 wear | 24% risk",
      },
    ];

    const packet = playtestEvidencePacketFor(state, { generatedAt: "2026-06-06T12:00:00.000Z" });

    expect(packet).toContain("| 1 | Grayhaven | Saffron Quay | cargo swing +$260 | 3 Tea | Hard Sail | Good cargo swing; hard order");
    expect(packet).toContain("| 2 |  |  |  |  |  |  |  |");
  });

  it("generates a complete scorecard draft with attached evidence", () => {
    const state = createInitialState();
    state.routeHistory = [
      {
        day: 9,
        fromId: "grayhaven",
        toId: "glassport",
        sailPlan: "balanced",
        projectedProfit: 180,
        risk: 0.18,
        wear: 2,
        outcome: "clean",
        reason: "contract delivery",
        cargoSummary: "2 Tea contract",
        label: "Clean crossing",
        detail: "balanced order | +$180 cargo swing | 2 wear | 18% risk",
      },
    ];

    const draft = playtestScorecardDraftFor(state, {
      build: "0.1.0-test",
      generatedAt: "2026-06-06T12:00:00.000Z",
      runtime: "Electron",
      storagePath: "/tmp/harborline-game",
    });

    expect(draft).toContain("# Harborline Playtest Scorecard Draft");
    expect(draft).toContain("- Date: 2026-06-06");
    expect(draft).toContain("- Build or URL: 0.1.0-test");
    expect(draft).toContain("- Observer script read before launch: yes/no");
    expect(draft).toContain("- Playtest Scorecard draft generated and edited in Settings: yes/no");
    expect(draft).toContain("- Collected playtest.latest.md path: /tmp/harborline-game/playtest.latest.md");
    expect(draft).toContain("- Collected playtest.history.v1.json path, or separate-scorecard assembly note: /tmp/harborline-game/playtest.history.v1.json");
    expect(draft).toContain("| Route-choice speed |  |  |");
    expect(draft).toContain("## Friction Log");
    expect(draft).toContain("| 1 | Grayhaven | Glassport | contract delivery | 2 Tea contract | Balanced");
    expect(draft).toContain("## Attached Evidence Packet");
    expect(draft).toContain("# Harborline Playtest Evidence Packet");
    expect(draft).toContain("- Runtime: Electron");
  });
});
