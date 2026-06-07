import { describe, expect, it } from "vitest";
import {
  audioCueLabel,
  audioCueSpecs,
  audioSceneSpecs,
  audioStatusLabel,
  audioVolumePercent,
  defaultAudioPreferences,
  normalizeAudioPreferences,
  readAudioPreferences,
  writeAudioPreferences,
} from "./audio";
import { feedbackTaxonomy } from "./feedback";

describe("audio cue design", () => {
  it("backs every feedback audio cue with a procedural sound spec", () => {
    const requiredCues = [...new Set(Object.values(feedbackTaxonomy).map((spec) => spec.audioCue))].sort();
    expect(Object.keys(audioCueSpecs).sort()).toEqual(requiredCues);

    for (const cue of requiredCues) {
      const spec = audioCueSpecs[cue as keyof typeof audioCueSpecs];
      expect(spec.label).toMatch(/\S/);
      expect(spec.gain).toBeGreaterThan(0);
      expect(spec.attack).toBeGreaterThanOrEqual(0);
      expect(spec.release).toBeGreaterThan(0);
      expect(spec.steps.length + (spec.noise ? 1 : 0)).toBeGreaterThan(0);
      for (const step of spec.steps) {
        expect(step.frequency).toBeGreaterThan(40);
        expect(step.duration).toBeGreaterThan(0);
      }
    }
  });

  it("normalizes mute and volume preferences before persistence or playback", () => {
    expect(normalizeAudioPreferences({ muted: true, volume: 1.8 })).toEqual({ muted: true, volume: 1 });
    expect(normalizeAudioPreferences({ muted: false, volume: -0.5 })).toEqual({ muted: false, volume: 0 });
    expect(normalizeAudioPreferences({ muted: false, volume: Number.NaN })).toEqual(defaultAudioPreferences);
    expect(audioVolumePercent({ muted: false, volume: 0.375 })).toBe(38);
  });

  it("round-trips audio preferences through the same storage shape used by settings", () => {
    const store: Record<string, string> = {};
    const storage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
    };

    writeAudioPreferences({ muted: true, volume: 0.25 }, storage);

    expect(readAudioPreferences(storage)).toEqual({ muted: true, volume: 0.25 });
  });

  it("exposes compact labels for Settings and smoke checks", () => {
    expect(audioCueLabel("storm-warning")).toBe("Storm warning");
    expect(audioSceneSpecs["open-water"].label).toBe("Open Water");
    expect(audioStatusLabel({ muted: false, volume: 0.5 }, "open-water", "route-commit")).toBe("50% | Open Water | Route set");
    expect(audioStatusLabel({ muted: true, volume: 0.5 }, "harbor", "market-shift")).toBe("Muted | Harbor | Market tick");
  });
});
