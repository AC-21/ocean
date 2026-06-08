import { describe, expect, it } from "vitest";
import {
  createParticleSplashPlan,
  defaultParticleSplashScenario,
  liveParticleSplashFeedbackFor,
  particleSplashBufferRoles,
  particleSplashStepShader,
  referenceSplashBandFor,
  seededParticleSplashFields,
  summarizeParticleSplashFields,
} from "./fluidParticleSplash";

describe("localized particle splash gate", () => {
  it("allocates a bounded particle buffer that scales by grid tier", () => {
    const standard = createParticleSplashPlan({ tier: "standard", steps: 180 });
    const high = createParticleSplashPlan({ tier: "high", steps: 180 });

    expect(standard.bufferRoles).toEqual(["particles"]);
    expect(particleSplashBufferRoles).toEqual(["particles"]);
    expect(standard.particleCapacity).toBe(2048);
    expect(high.particleCapacity).toBe(4096);
    expect(standard.estimatedStorageBytes).toBe(standard.particleCapacity * standard.bytesPerParticle);
    expect(high.localGridFeedbackLimit).toBeGreaterThan(standard.localGridFeedbackLimit);
  });

  it("seeds particle mass and launch energy inside the splash reference band", () => {
    const plan = createParticleSplashPlan({ tier: "standard" });
    const particles = seededParticleSplashFields(plan, defaultParticleSplashScenario);
    const diagnostics = summarizeParticleSplashFields(plan, defaultParticleSplashScenario, particles, particles, null);
    const band = referenceSplashBandFor(defaultParticleSplashScenario);

    expect(diagnostics.particleCount).toBe(plan.particleCapacity);
    expect(diagnostics.initialParticleMassKg).toBeGreaterThan(0);
    expect(diagnostics.massFractionOfDisplaced).toBeGreaterThan(0.08);
    expect(diagnostics.massFractionOfDisplaced).toBeLessThan(0.35);
    expect(diagnostics.momentumFractionOfImpact).toBeLessThan(0.1);
    expect(diagnostics.predictedCrownHeightM).toBeGreaterThanOrEqual(band.minM);
    expect(diagnostics.predictedCrownHeightM).toBeLessThanOrEqual(band.maxM);
  });

  it("accounts for reentered particle mass, energy, foam, and grid feedback", () => {
    const plan = createParticleSplashPlan({ tier: "standard", steps: 180 });
    const initial = seededParticleSplashFields(plan, defaultParticleSplashScenario);
    const final = new Float32Array(initial);

    for (let offset = 0; offset < final.length; offset += plan.particleStride) {
      if (offset % (plan.particleStride * 3) === 0) {
        const mass = final[offset + 4];
        final[offset + 1] = 0;
        final[offset + 3] = -5.5;
        final[offset + 5] = 0;
        final[offset + 6] = 0.5 * mass * 5.5 ** 2;
        final[offset + 7] = 0.22;
      }
    }

    const diagnostics = summarizeParticleSplashFields(plan, defaultParticleSplashScenario, final, initial, null);

    expect(diagnostics.boundedDiagnostics).toBe(true);
    expect(diagnostics.reenteredMassKg).toBeGreaterThan(0);
    expect(diagnostics.reentryEnergyJ).toBeGreaterThan(0);
    expect(diagnostics.foamContribution).toBeGreaterThan(0);
    expect(diagnostics.gridFeedback.sampleCount).toBeGreaterThan(0);
    expect(diagnostics.gridFeedback.energyJ).toBeCloseTo(diagnostics.reentryEnergyJ, 6);
    expect(diagnostics.massRelativeDrift).toBeLessThan(0.00001);
  });

  it("creates bounded live particle feedback for the renderer", () => {
    const feedback = liveParticleSplashFeedbackFor({
      cellSizeM: 0.05,
      currentSpeedMps: 0.18,
      displacedVolumeM3: 0.08,
      ejectedWaterKg: 11.2,
      froudeNumber: 4.35,
      gravityMps2: 9.80665,
      gridCellsX: 512,
      gridCellsY: 288,
      impactStrength: 0.74,
      localGridFeedbackLimit: 2200,
      objectDiameterM: 0.72,
      objectMassKg: 895,
      objectVxMps: 0.3,
      objectVyMps: -6,
      sprayParticleCount: 120,
      sprayReentryEnergyJ: 14,
      sprayReentryMassKg: 0.08,
      splashEnergyJ: 2800,
      splashHeightM: 2.08,
      surfaceTensionNpm: 0.073,
      timeS: 1.2,
      waterDensityKgM3: 1025,
      weberNumber: 1_460_000,
    });

    expect(feedback.coupling).toBe("localized-particle-splash-live-v1");
    expect(feedback.active).toBe(true);
    expect(feedback.noFullGridReadbackPerFrame).toBe(true);
    expect(feedback.massFractionOfDisplaced).toBeGreaterThan(0);
    expect(feedback.massFractionOfDisplaced).toBeLessThan(0.35);
    expect(feedback.momentumFractionOfImpact).toBeLessThan(0.1);
    expect(feedback.predictedCrownHeightM).toBeGreaterThanOrEqual(feedback.referenceSplashBand.minM);
    expect(feedback.predictedCrownHeightM).toBeLessThanOrEqual(feedback.referenceSplashBand.maxM);
    expect(feedback.gridFeedback.sampleCount).toBeGreaterThan(0);
    expect(feedback.gridFeedback.sampleCount).toBeLessThanOrEqual(2200);
    expect(feedback.renderIntensity).toBeGreaterThan(0);
  });

  it("contains a WebGPU particle integration shader with no Canvas dependency", () => {
    expect(particleSplashStepShader).toContain("@compute");
    expect(particleSplashStepShader).toContain("particles");
    expect(particleSplashStepShader).toContain("reentryEnergy");
    expect(particleSplashStepShader).toContain("foam");
    expect(particleSplashStepShader).not.toMatch(/canvas|getContext|2d/i);
  });
});
