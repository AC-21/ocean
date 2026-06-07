import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runFluidGridBenchmark } from "./fluid/fluidGridGpu";
import {
  createFluidWaterRenderer,
  legacyCanvasWaterTelemetry,
  type FluidWaterRenderer,
  type FluidWaterRenderInput,
} from "./fluid/fluidWaterRenderer";
import { detectFluidCapability, pendingFluidCapabilityReport, type FluidCapabilityReport } from "./fluid/webgpuCapability";
import {
  characteristicLengthM,
  cloneObjectSpec,
  createSimulation,
  currentEffectiveDensityKgM3,
  defaultOceanSettings,
  diagnosticsFor,
  dryMassKg,
  equilibriumDeviationFor,
  formatDuration,
  objectDepthM,
  objectHeightM,
  objectPresets,
  objectVolumeM3,
  objectWidthM,
  predictFloatOutcome,
  projectedVerticalAreaAtAngleM2,
  resolvedSurfaceElevationAt,
  startDrop,
  stepSimulation,
  type GridFluidCouplingForces,
  type ObjectSpec,
  type OceanSettings,
  type ShapeKind,
  type SimulationState,
} from "./physicsOcean";

const shapeLabels: Record<ShapeKind, string> = {
  box: "Box",
  horizontalCylinder: "Horizontal cylinder",
  sphere: "Sphere",
  verticalCylinder: "Vertical cylinder",
};

const waterTypeOptions = [
  { label: "Fresh", density: 997 },
  { label: "Brackish", density: 1010 },
  { label: "Sea", density: 1025 },
  { label: "Dense sea", density: 1030 },
];

export default function OceanPhysicsApp() {
  const [selectedPresetId, setSelectedPresetId] = useState(objectPresets[0].id);
  const [spec, setSpec] = useState<ObjectSpec>(() => cloneObjectSpec(objectPresets[0]));
  const [settings, setSettings] = useState<OceanSettings>(defaultOceanSettings);
  const [dropHeightM, setDropHeightM] = useState(8);
  const [releaseAngleDeg, setReleaseAngleDeg] = useState(-6);
  const [timeScale, setTimeScale] = useState(1);
  const [paused, setPaused] = useState(false);
  const [running, setRunning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const specRef = useRef(spec);
  const settingsRef = useRef(settings);
  const simulationRef = useRef<SimulationState>(createSimulation(spec, dropHeightM));
  const [snapshot, setSnapshot] = useState<SimulationState>(simulationRef.current);
  const [fluidCapability, setFluidCapability] = useState<FluidCapabilityReport>(() => pendingFluidCapabilityReport());
  const [waterRenderMode, setWaterRenderMode] = useState<"fallback" | "initializing" | "webgpu">("initializing");
  const waterRendererRef = useRef<FluidWaterRenderer | null>(null);
  const waterFallbackReasonRef = useRef("WebGPU water renderer is still initializing.");
  const gridCouplingRef = useRef<GridFluidCouplingForces | null>(null);

  specRef.current = spec;
  settingsRef.current = settings;

  useEffect(() => {
    let cancelled = false;
    window.__runFluidGridBenchmark = runFluidGridBenchmark;
    window.__fluidGridCapabilityReport = fluidCapability;
    detectFluidCapability().then((report) => {
      if (cancelled) return;
      window.__fluidGridCapabilityReport = report;
      setFluidCapability(report);
    });
    return () => {
      cancelled = true;
      delete window.__runFluidGridBenchmark;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas || fluidCapability.status === "checking") return;
    waterRendererRef.current?.destroy();
    waterRendererRef.current = null;
    if (fluidCapability.status !== "webgpu-ready") {
      waterFallbackReasonRef.current = fluidCapability.fallbackReason ?? "WebGPU capability report selected CPU fallback.";
      setWaterRenderMode("fallback");
      return;
    }

    setWaterRenderMode("initializing");
    createFluidWaterRenderer(canvas, fluidCapability.selectedTier)
      .then((renderer) => {
        if (cancelled) {
          renderer.destroy();
          return;
        }
        waterRendererRef.current = renderer;
        window.__fluidWaterRenderStats = renderer.stats();
        setWaterRenderMode("webgpu");
      })
      .catch((error) => {
        if (cancelled) return;
        waterFallbackReasonRef.current = error instanceof Error ? error.message : String(error);
        legacyCanvasWaterTelemetry(canvas, waterFallbackReasonRef.current);
        setWaterRenderMode("fallback");
      });

    return () => {
      cancelled = true;
    };
  }, [fluidCapability.selectedTier, fluidCapability.status, fluidCapability.fallbackReason]);

  const resetSimulation = useCallback(() => {
    const next = createSimulation(specRef.current, dropHeightM, degreesToRadians(releaseAngleDeg));
    simulationRef.current = next;
    gridCouplingRef.current = null;
    setSnapshot(next);
    setRunning(false);
    setPaused(false);
  }, [dropHeightM, releaseAngleDeg]);

  useEffect(() => {
    if (running) return;
    resetSimulation();
  }, [dropHeightM, releaseAngleDeg, resetSimulation, running, selectedPresetId, spec]);

  useEffect(() => {
    let animationFrame = 0;
    let lastTime = performance.now();
    let lastSnapshot = 0;

    const tick = (now: number) => {
      const realDt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      let current = simulationRef.current;
      const active = running && !paused && current.phase !== "sank";
      if (active) {
        const simulatedDt = realDt * timeScale;
        const substeps = Math.max(1, Math.ceil(simulatedDt / 0.018));
        const stepDt = simulatedDt / substeps;
        for (let index = 0; index < substeps; index += 1) {
          current = stepSimulation(current, specRef.current, settingsRef.current, stepDt, gridCouplingRef.current);
          if (current.phase === "sank") break;
        }
        simulationRef.current = current;
      }
      if (running && current.phase === "sank") {
        setRunning(false);
      }

      const canvas = canvasRef.current;
      if (canvas) {
        if (waterRendererRef.current && waterRenderMode === "webgpu") {
          const stats = waterRendererRef.current.render(fluidWaterInputFor(canvas, current, specRef.current, settingsRef.current, dropHeightM));
          window.__fluidWaterRenderStats = stats;
          gridCouplingRef.current =
            stats.lastCoupling?.active === true
              ? {
                  active: true,
                  gridVelocityMps: stats.lastCoupling.gridVelocityMps,
                  horizontalForceDeltaN: stats.lastCoupling.horizontalForceDeltaN,
                  sampleTimeS: stats.lastCoupling.sampleTimeS,
                  verticalForceDeltaN: stats.lastCoupling.verticalForceDeltaN,
                }
              : null;
        } else if (waterRenderMode === "fallback") {
          gridCouplingRef.current = null;
          legacyCanvasWaterTelemetry(canvas, waterFallbackReasonRef.current);
          renderOcean(canvas, current, specRef.current, settingsRef.current, dropHeightM);
        }
      }
      const chart = chartRef.current;
      if (chart) {
        renderHistoryChart(chart, current, settingsRef.current);
      }
      if (now - lastSnapshot > 80) {
        lastSnapshot = now;
        setSnapshot(current);
      }
      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [dropHeightM, paused, running, timeScale, waterRenderMode]);

  const diagnostics = useMemo(() => diagnosticsFor(snapshot, spec, settings), [settings, snapshot, spec]);
  const prediction = useMemo(() => predictFloatOutcome(spec, settings), [settings, spec]);
  const equilibriumDeviation = useMemo(() => equilibriumDeviationFor(snapshot, spec, settings), [settings, snapshot, spec]);
  const volumeM3 = useMemo(() => objectVolumeM3(spec), [spec]);
  const dryMass = useMemo(() => dryMassKg(spec), [spec]);
  const currentDensity = useMemo(() => currentEffectiveDensityKgM3(spec, snapshot, settings), [settings, snapshot, spec]);
  const liveFloatDuration =
    snapshot.impact && snapshot.phase !== "sank" ? Math.max(0, snapshot.timeS - snapshot.impact.atS) : snapshot.sankAtS && snapshot.impact ? snapshot.sankAtS - snapshot.impact.atS : null;

  const selectPreset = (preset: ObjectSpec) => {
    setSelectedPresetId(preset.id);
    setSpec(cloneObjectSpec(preset));
  };

  const launchDrop = () => {
    const next = startDrop(createSimulation(specRef.current, dropHeightM, degreesToRadians(releaseAngleDeg)));
    simulationRef.current = next;
    gridCouplingRef.current = null;
    setSnapshot(next);
    setRunning(true);
    setPaused(false);
  };

  const updateSpec = (patch: Partial<ObjectSpec>) => {
    setSelectedPresetId("custom");
    setSpec((current) => ({ ...current, ...patch, id: "custom", name: current.id === "custom" ? current.name : "Custom object" }));
  };

  const updateDimension = (key: keyof ObjectSpec["dimensions"], value: number) => {
    setSelectedPresetId("custom");
    setSpec((current) => ({
      ...current,
      id: "custom",
      name: current.id === "custom" ? current.name : "Custom object",
      dimensions: { ...current.dimensions, [key]: clamp(value, 0.05, 12) },
    }));
  };

  const updateShape = (shape: ShapeKind) => {
    setSelectedPresetId("custom");
    setSpec((current) => withShapeDefaults({ ...current, id: "custom", name: "Custom object", shape }));
  };

  return (
    <main className="ocean-lab">
      <section className="control-panel" aria-label="Object and ocean controls">
        <div className="brand-block">
          <p className="eyebrow">Ocean Impact Lab</p>
          <h1>Physics ocean</h1>
        </div>

        <div className="control-group">
          <div className="section-title">
            <span>Objects</span>
            <strong>{selectedPresetId === "custom" ? "Custom" : "Preset"}</strong>
          </div>
          <div className="preset-grid">
            {objectPresets.map((preset) => (
              <button
                className={selectedPresetId === preset.id ? "preset-button active" : "preset-button"}
                key={preset.id}
                onClick={() => selectPreset(preset)}
                type="button"
              >
                <span className="object-chip" style={{ background: preset.color }} />
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group">
          <div className="section-title">
            <span>Object Physics</span>
            <strong>{Math.round(currentDensity)} kg/m3</strong>
          </div>
          <label className="field">
            <span>Shape</span>
            <select value={spec.shape} onChange={(event) => updateShape(event.target.value as ShapeKind)}>
              {Object.entries(shapeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <RangeField
            label="Dry density"
            max={8000}
            min={20}
            onChange={(value) => updateSpec({ densityKgM3: value })}
            step={5}
            suffix="kg/m3"
            value={spec.densityKgM3}
          />
          <RangeField
            label="Drag coefficient"
            max={1.5}
            min={0.2}
            onChange={(value) => updateSpec({ dragCoefficient: value })}
            step={0.01}
            value={spec.dragCoefficient}
          />
          {spec.shape === "box" && (
            <div className="dimension-grid">
              <NumberField label="Width" onChange={(value) => updateDimension("width", value)} suffix="m" value={objectWidthM(spec)} />
              <NumberField label="Height" onChange={(value) => updateDimension("height", value)} suffix="m" value={objectHeightM(spec)} />
              <NumberField label="Depth" onChange={(value) => updateDimension("depth", value)} suffix="m" value={objectDepthM(spec)} />
            </div>
          )}
          {spec.shape === "sphere" && <NumberField label="Diameter" onChange={(value) => updateDimension("diameter", value)} suffix="m" value={objectHeightM(spec)} />}
          {spec.shape === "horizontalCylinder" && (
            <div className="dimension-grid two">
              <NumberField label="Length" onChange={(value) => updateDimension("length", value)} suffix="m" value={objectWidthM(spec)} />
              <NumberField label="Diameter" onChange={(value) => updateDimension("diameter", value)} suffix="m" value={objectHeightM(spec)} />
            </div>
          )}
          {spec.shape === "verticalCylinder" && (
            <div className="dimension-grid two">
              <NumberField label="Diameter" onChange={(value) => updateDimension("diameter", value)} suffix="m" value={objectWidthM(spec)} />
              <NumberField label="Height" onChange={(value) => updateDimension("height", value)} suffix="m" value={objectHeightM(spec)} />
            </div>
          )}
          <div className="dimension-grid two">
            <NumberField
              label="Water ingress"
              onChange={(value) => updateSpec({ leakAreaM2: undefined, porousAbsorptionRatePerMinute: value / 100, waterFillRatePerMinute: value / 100 })}
              suffix="%/min"
              value={spec.waterFillRatePerMinute * 100}
            />
            <NumberField
              label="Max fill"
              onChange={(value) => updateSpec({ maxWaterFillFraction: value / 100 })}
              suffix="%"
              value={spec.maxWaterFillFraction * 100}
            />
          </div>
          <div className="dimension-grid two">
            <NumberField
              label="Leak area"
              onChange={(value) => updateSpec({ leakAreaM2: clamp(value, 0, 50) / 10000, leakDischargeCoefficient: spec.leakDischargeCoefficient ?? 0.62 })}
              suffix="cm2"
              value={(spec.leakAreaM2 ?? 0) * 10000}
            />
            <NumberField
              label="Discharge"
              onChange={(value) => updateSpec({ leakDischargeCoefficient: clamp(value, 0.05, 1) })}
              value={spec.leakDischargeCoefficient ?? 0.62}
            />
          </div>
          <NumberField
            label="Air relief"
            onChange={(value) =>
              updateSpec({
                airReliefCoefficient: clamp(value, 0, 100) / 100,
                vented: value >= 99.5,
              })
            }
            suffix="%"
            value={(spec.vented === true ? 1 : spec.airReliefCoefficient ?? 0) * 100}
          />
        </div>

        <div className="control-group">
          <div className="section-title">
            <span>Ocean</span>
            <strong>{Math.round(settings.waterDensityKgM3)} kg/m3</strong>
          </div>
          <div className="segmented">
            {waterTypeOptions.map((option) => (
              <button
                className={Math.abs(settings.waterDensityKgM3 - option.density) < 0.5 ? "active" : ""}
                key={option.label}
                onClick={() => setSettings((current) => ({ ...current, waterDensityKgM3: option.density }))}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <RangeField label="Drop height" max={30} min={0.25} onChange={setDropHeightM} step={0.25} suffix="m" value={dropHeightM} />
          <RangeField label="Release angle" max={65} min={-65} onChange={setReleaseAngleDeg} step={1} suffix="deg" value={releaseAngleDeg} />
          <RangeField
            label="Wave height"
            max={4}
            min={0}
            onChange={(value) => setSettings((current) => ({ ...current, waveHeightM: value }))}
            step={0.05}
            suffix="m"
            value={settings.waveHeightM}
          />
          <RangeField
            label="Wave period"
            max={14}
            min={2}
            onChange={(value) => setSettings((current) => ({ ...current, wavePeriodS: value }))}
            step={0.1}
            suffix="s"
            value={settings.wavePeriodS}
          />
          <RangeField
            label="Current"
            max={1.8}
            min={-1.8}
            onChange={(value) => setSettings((current) => ({ ...current, currentSpeedMps: value }))}
            step={0.02}
            suffix="m/s"
            value={settings.currentSpeedMps}
          />
          <RangeField
            label="Time scale"
            max={120}
            min={0.25}
            onChange={setTimeScale}
            step={0.25}
            suffix="x"
            value={timeScale}
          />
        </div>
      </section>

      <section
        aria-label="Ocean simulation"
        className="simulation-stage"
        data-fluid-backend={fluidCapability.backend}
        data-fluid-capability={fluidCapability.status}
        data-fluid-tier={fluidCapability.selectedTier}
        data-water-render-mode={waterRenderMode}
      >
        <div className="stage-toolbar">
          <div>
            <p className="eyebrow">Live State</p>
            <strong>{phaseLabel(snapshot.phase)}</strong>
          </div>
          <div className="sim-actions">
            <button className="primary-action" onClick={launchDrop} type="button">
              Drop
            </button>
            <button onClick={() => setPaused((current) => !current)} type="button">
              {paused ? "Resume" : "Pause"}
            </button>
            <button onClick={resetSimulation} type="button">
              Reset
            </button>
          </div>
        </div>
        <canvas className="ocean-canvas" ref={canvasRef} />
        <div className="stage-readout">
          <Metric label="Depth" value={`${Math.max(0, -snapshot.object.centerYM).toFixed(2)} m`} />
          <Metric label="Vertical speed" value={`${Math.abs(snapshot.object.vyMps).toFixed(2)} m/s ${snapshot.object.vyMps < 0 ? "down" : "up"}`} />
          <Metric label="Attitude" value={`${radiansToDegrees(snapshot.object.angleRad).toFixed(1)} deg`} />
          <Metric label="Spin" value={`${radiansToDegrees(snapshot.object.angularVelocityRadps).toFixed(1)} deg/s`} />
          <Metric label="Submerged" value={`${Math.round(diagnostics.submergedFraction * 100)}%`} />
          <Metric label="Runtime" value={formatDuration(snapshot.timeS)} />
        </div>
      </section>

      <section className="metrics-panel" aria-label="Physics measurements">
        <div className="readout-block large">
          <span>Float Result</span>
          <strong>{floatResultText(snapshot, prediction.secondsUntilSink)}</strong>
          <em>{prediction.outcome === "floats-indefinitely" ? "Stable density below water" : prediction.outcome === "sinks-immediately" ? "Density exceeds displaced water" : "Water ingress crosses neutral buoyancy"}</em>
        </div>

        <div className="readout-block">
          <span>Fluid Backend</span>
          <strong>{fluidCapabilityTitle(fluidCapability)}</strong>
          <em>{fluidCapability.fallbackReason ?? `${fluidCapability.selectedTier} grid selected from WebGPU adapter limits`}</em>
          <div className="small-grid">
            <Metric label="Backend" value={fluidCapability.backend} />
            <Metric label="Tier" value={fluidCapability.selectedTier} tone={fluidCapability.status === "webgpu-ready" ? "positive" : undefined} />
            <Metric label="Grid" value={`${fluidCapability.grid.cellsX} x ${fluidCapability.grid.cellsY}`} />
            <Metric label="Grid mem" value={formatBytes(fluidCapability.grid.estimatedBytes)} />
            <Metric label="Adapter" value={compactText(fluidCapability.adapterName ?? "-", 30)} />
            <Metric label="Storage lim" value={formatOptionalBytes(fluidCapability.limits.maxStorageBufferBindingSize)} />
            <Metric label="Renderer" value={waterRenderMode === "webgpu" ? "WebGPU grid" : waterRenderMode === "fallback" ? "Diagnostic 2D" : "Starting"} />
          </div>
        </div>

        <div className="metrics-grid">
          <Metric label="Volume" value={`${volumeM3.toFixed(3)} m3`} />
          <Metric label="Dry mass" value={`${dryMass.toFixed(1)} kg`} />
          <Metric label="Displaced" value={`${diagnostics.displacedVolumeM3.toFixed(3)} m3`} />
          <Metric label="Net force" value={`${(diagnostics.netForceN / 1000).toFixed(2)} kN`} tone={diagnostics.netForceN >= 0 ? "positive" : "negative"} />
          <Metric label="Buoyancy" value={`${(diagnostics.buoyancyN / 1000).toFixed(2)} kN`} />
          <Metric label="Surface tension" value={`${diagnostics.surfaceTensionForceN.toFixed(3)} N`} />
          <Metric label="Weight" value={`${(diagnostics.weightN / 1000).toFixed(2)} kN`} />
        </div>

        <div className="readout-block">
          <span>Impact</span>
          <strong>{snapshot.impact ? `${snapshot.impact.impactSpeedMps.toFixed(2)} m/s` : "Awaiting entry"}</strong>
          <div className="small-grid">
            <Metric label="Energy" value={snapshot.impact ? `${(snapshot.impact.kineticEnergyJ / 1000).toFixed(2)} kJ` : "-"} />
            <Metric label="Froude" value={snapshot.impact ? snapshot.impact.froudeNumber.toFixed(2) : "-"} />
            <Metric label="Reynolds" value={snapshot.impact ? compactNumber(snapshot.impact.reynoldsNumber) : "-"} />
            <Metric label="Weber" value={snapshot.impact ? compactNumber(snapshot.impact.weberNumber) : "-"} />
            <Metric label="Entry u" value={snapshot.impact ? `${snapshot.impact.horizontalEntrySpeedMps.toFixed(2)} m/s` : "-"} />
            <Metric label="Asym" value={snapshot.impact ? snapshot.impact.splashAsymmetry.toFixed(2) : "-"} />
            <Metric label="Impact step" value={snapshot.impact ? snapshot.impact.substepFraction.toFixed(2) : "-"} />
            <Metric label="Impact y" value={snapshot.impact ? `${snapshot.impact.surfaceYM.toFixed(2)} m` : "-"} />
            <Metric label="Splash" value={snapshot.impact ? `${snapshot.impact.splashHeightM.toFixed(2)} m` : "-"} />
            <Metric label="Water thrown" value={snapshot.impact ? `${snapshot.impact.ejectedWaterKg.toFixed(1)} kg` : "-"} />
            <Metric label="Splash energy" value={snapshot.impact ? `${(snapshot.impact.splashEnergyJ / 1000).toFixed(2)} kJ` : "-"} />
            <Metric label="Coupled mass" value={snapshot.impact ? `${snapshot.impact.coupledWaterMassKg.toFixed(1)} kg` : "-"} />
            <Metric label="Cavity" value={snapshot.impact ? `${snapshot.impact.cavityDepthM.toFixed(2)} m` : "-"} />
            <Metric label="Collapse" value={snapshot.impact ? `${snapshot.impact.cavityCollapseTimeS.toFixed(2)} s` : "-"} />
            <Metric label="Ventilation" value={`${Math.round(diagnostics.cavityVentilationFraction * 100)}%`} />
            <Metric label="Cavity left" value={`${diagnostics.cavityDepthRemainingM.toFixed(2)} m`} />
            <Metric label="Wetted disp" value={`${diagnostics.wettedDisplacedVolumeM3.toFixed(3)} m3`} />
          </div>
        </div>

        <div className="readout-block">
          <span>Float Timing</span>
          <div className="timing-list">
            <Metric label="Live afloat" value={liveFloatDuration === null ? "-" : formatDuration(liveFloatDuration)} />
            <Metric label="Settled" value={snapshot.settledAtS === null ? "-" : formatDuration(snapshot.settledAtS)} />
            <Metric label="Sank" value={snapshot.sankAtS === null ? "-" : formatDuration(snapshot.sankAtS)} />
            <Metric label="Bottom impact" value={`${snapshot.lastSeabedImpactEnergyJ.toFixed(1)} J`} />
            <Metric label="Bottom impulse" value={`${snapshot.lastSeabedNormalImpulseNs.toFixed(1)} N s`} />
            <Metric label="Bottom scrape" value={`${snapshot.lastSeabedFrictionImpulseNs.toFixed(1)} N s`} />
            <Metric label="Bottom pen" value={`${snapshot.lastSeabedPenetrationM.toFixed(3)} m`} />
            <Metric label="Predicted sink" value={formatDuration(prediction.secondsUntilSink)} />
            <Metric label="Static draft" value={prediction.initialEquilibrium ? `${prediction.initialEquilibrium.submergedDepthM.toFixed(2)} m` : "-"} />
            <Metric label="Static heel" value={prediction.initialEquilibrium ? `${radiansToDegrees(prediction.initialEquilibrium.angleRad).toFixed(1)} deg` : "-"} />
            <Metric
              label="Neutral fill"
              value={prediction.criticalWaterFillFraction === null ? "-" : `${Math.round(prediction.criticalWaterFillFraction * 100)}%`}
            />
            <Metric label="Eq status" value={equilibriumDeviation.withinTolerance ? "Matched" : equilibriumDeviation.equilibrium ? "Converging" : "-"} />
            <Metric label="Draft error" value={equilibriumDeviation.draftErrorM === null ? "-" : `${equilibriumDeviation.draftErrorM.toFixed(3)} m`} />
            <Metric label="Heel error" value={equilibriumDeviation.angleErrorRad === null ? "-" : `${radiansToDegrees(equilibriumDeviation.angleErrorRad).toFixed(1)} deg`} />
          </div>
        </div>

        <div className="readout-block">
          <span>Flooding</span>
          <div className="small-grid">
            <Metric label="Ingress" value={`${(diagnostics.waterIngressRatePerMinute * 100).toFixed(3)}%/min`} />
            <Metric label="Leak flow" value={`${(diagnostics.leakFlowM3ps * 1_000_000).toFixed(2)} ml/s`} />
            <Metric label="Head" value={`${diagnostics.hydrostaticHeadM.toFixed(3)} m`} />
            <Metric label="Water fill" value={`${Math.round(snapshot.object.waterFillFraction * 100)}%`} />
            <Metric label="Pressure delta" value={`${(diagnostics.pressureDifferentialPa / 1000).toFixed(2)} kPa`} />
            <Metric label="Internal air" value={`${(diagnostics.internalAirPressurePa / 1000).toFixed(1)} kPa`} />
            <Metric label="Trapped air" value={`${(diagnostics.trappedAirVolumeM3 * 1000).toFixed(1)} L`} />
          </div>
        </div>

        <div className="readout-block">
          <span>Hydrostatic Stability</span>
          <strong>{stabilityLabel(diagnostics.rotationalStability)}</strong>
          <div className="small-grid">
            <Metric label="GM" value={`${diagnostics.metacentricHeightM.toFixed(3)} m`} tone={diagnostics.metacentricHeightM >= 0 ? "positive" : "negative"} />
            <Metric label="Righting moment" value={`${(diagnostics.restoringMomentNm / 1000).toFixed(2)} kN m`} />
            <Metric label="Free-surface loss" value={`${diagnostics.internalFreeSurfaceGMReductionM.toFixed(3)} m`} />
            <Metric label="Slosh moment" value={`${(diagnostics.internalFreeSurfaceMomentNm / 1000).toFixed(2)} kN m`} />
            <Metric label="Wave slope" value={`${radiansToDegrees(diagnostics.waveSlopeRad).toFixed(1)} deg`} />
            <Metric label="Slope rate" value={`${radiansToDegrees(diagnostics.waveSlopeRateRadps).toFixed(1)} deg/s`} />
            <Metric label="Slope accel" value={`${radiansToDegrees(diagnostics.waveSlopeAccelerationRadps2).toFixed(1)} deg/s2`} />
            <Metric label="Water roll" value={`${radiansToDegrees(diagnostics.waveAngularVelocityRadps).toFixed(1)} deg/s`} />
            <Metric label="Water roll a" value={`${radiansToDegrees(diagnostics.waveAngularAccelerationRadps2).toFixed(1)} deg/s2`} />
            <Metric label="Rel roll" value={`${radiansToDegrees(diagnostics.relativeAngularVelocityRadps).toFixed(1)} deg/s`} />
            <Metric label="Roll damping" value={`${(diagnostics.angularDragNm / 1000).toFixed(2)} kN m`} />
            <Metric label="Roll excite" value={`${(diagnostics.rollExcitationTorqueNm / 1000).toFixed(2)} kN m`} />
            <Metric label="Load moment" value={`${(diagnostics.hydrodynamicLoadMomentNm / 1000).toFixed(2)} kN m`} />
            <Metric label="Roll added I" value={`${diagnostics.angularAddedInertiaKgM2.toFixed(1)} kg m2`} />
            <Metric label="Waterplane I" value={`${diagnostics.waterplaneSecondMomentM4.toFixed(4)} m4`} />
            <Metric label="Tank surface I" value={`${diagnostics.internalFreeSurfaceMomentM4.toFixed(4)} m4`} />
            <Metric label="Capillary line" value={`${diagnostics.capillaryPerimeterM.toFixed(3)} m`} />
            <Metric label="Bond" value={diagnostics.bondNumber.toFixed(1)} />
            <Metric label="Buoyancy arm" value={`${diagnostics.centerOfBuoyancyXM.toFixed(3)} m`} />
            <Metric label="Gravity arm" value={`${diagnostics.centerOfGravityXM.toFixed(3)} m`} />
            <Metric label="Pressure arm" value={`${diagnostics.hydrodynamicCenterOfPressureXM.toFixed(3)} m`} />
            <Metric label="Pressure depth" value={`${diagnostics.hydrodynamicCenterOfPressureYM.toFixed(3)} m`} />
          </div>
        </div>

        <div className="readout-block">
          <span>Free Surface</span>
          <div className="small-grid">
            <Metric label="Wave energy" value={`${diagnostics.freeSurfaceEnergyJ.toFixed(0)} J`} />
            <Metric label="Max disturbance" value={`${diagnostics.freeSurfaceMaxDisplacementM.toFixed(3)} m`} />
            <Metric label="Volume err" value={`${diagnostics.freeSurfaceVolumePerMeterM2.toExponential(1)} m2`} />
            <Metric label="Impact c" value={`${diagnostics.freeSurfaceWaveSpeedMps.toFixed(2)} m/s`} />
            <Metric label="Impact depth" value={`${diagnostics.freeSurfaceEffectiveDepthM.toFixed(2)} m`} />
            <Metric label="Spray returns" value={`${snapshot.lastSprayReentryCount}`} />
            <Metric label="Spray energy" value={`${snapshot.lastSprayReentryEnergyJ.toFixed(2)} J`} />
            <Metric label="Spray mass" value={`${(snapshot.lastSprayReentryMassKg * 1000).toFixed(1)} g`} />
            <Metric label="Waterplane area" value={`${diagnostics.waterplaneAreaM2.toFixed(3)} m2`} />
            <Metric label="Surface slope" value={`${radiansToDegrees(diagnostics.waveSlopeRad).toFixed(1)} deg`} />
            <Metric label="Fluid u" value={`${diagnostics.fluidVelocityXMps.toFixed(2)} m/s`} />
            <Metric label="Fluid w" value={`${diagnostics.fluidVelocityYMps.toFixed(2)} m/s`} />
            <Metric label="Orbital speed" value={`${diagnostics.waveOrbitalSpeedMps.toFixed(2)} m/s`} />
            <Metric label="Orbital depth" value={`${diagnostics.waveOrbitalDepthM.toFixed(2)} m`} />
            <Metric label="Wave length" value={`${diagnostics.waveLengthM.toFixed(1)} m`} />
            <Metric label="Wave speed" value={`${diagnostics.wavePhaseSpeedMps.toFixed(2)} m/s`} />
            <Metric label="Entry slam" value={`${(snapshot.lastWaterEntrySlamN / 1000).toFixed(2)} kN`} />
            <Metric label="Slam moment" value={`${(snapshot.lastWaterEntrySlamMomentNm / 1000).toFixed(2)} kN m`} />
            <Metric label="Slam arm" value={`${snapshot.lastWaterEntrySlamCenterXM.toFixed(3)} m`} />
            <Metric label="Slam depth" value={`${snapshot.lastWaterEntrySlamCenterYM.toFixed(3)} m`} />
            <Metric label="Wake turb" value={`${diagnostics.wakeTurbulence.toFixed(2)}`} />
            <Metric label="Wake drag" value={`${(diagnostics.wakeDragN / 1000).toFixed(2)} kN`} />
            <Metric label="Wake mass" value={`${diagnostics.wakeEntrainedMassKg.toFixed(1)} kg`} />
            <Metric label="Vortex freq" value={`${diagnostics.wakeSheddingFrequencyHz.toFixed(2)} Hz`} />
            <Metric label="Radiation" value={`${(diagnostics.heaveRadiationForceN / 1000).toFixed(2)} kN`} />
            <Metric label="Fluid ax" value={`${diagnostics.fluidAccelerationXMps2.toFixed(2)} m/s2`} />
            <Metric label="Fluid ay" value={`${diagnostics.fluidAccelerationYMps2.toFixed(2)} m/s2`} />
            <Metric label="Wave Fx" value={`${(diagnostics.waveExcitationForceXN / 1000).toFixed(2)} kN`} />
            <Metric label="Wave Fy" value={`${(diagnostics.waveExcitationForceYN / 1000).toFixed(2)} kN`} />
            <Metric label="Water Fx" value={`${(diagnostics.hydrodynamicLoadForceXN / 1000).toFixed(2)} kN`} />
            <Metric label="Water Fy" value={`${(diagnostics.hydrodynamicLoadForceYN / 1000).toFixed(2)} kN`} />
            <Metric label="Drag Fx" value={`${(diagnostics.hydrodynamicDragForceXN / 1000).toFixed(2)} kN`} />
            <Metric label="Drag Fy" value={`${(diagnostics.hydrodynamicDragForceYN / 1000).toFixed(2)} kN`} />
            <Metric label="Lift Fx" value={`${(diagnostics.hydrodynamicLiftForceXN / 1000).toFixed(2)} kN`} />
            <Metric label="Lift Fy" value={`${(diagnostics.hydrodynamicLiftForceYN / 1000).toFixed(2)} kN`} />
            <Metric label="Lift Cl" value={diagnostics.hydrodynamicLiftCoefficient.toFixed(2)} />
            <Metric label="AoA" value={`${radiansToDegrees(diagnostics.hydrodynamicAngleOfAttackRad).toFixed(1)} deg`} />
            <Metric label="Wave Cm" value={diagnostics.waveInertiaCoefficient.toFixed(2)} />
            <Metric label="Wetting rate" value={`${snapshot.lastDisplacedVolumeRateM3ps.toFixed(3)} m3/s`} />
            <Metric label="Wave coupled" value={`${snapshot.lastWaveCoupledVolumeM3.toFixed(4)} m3`} />
            <Metric label="Heave period" value={diagnostics.heaveNaturalPeriodS === null ? "-" : `${diagnostics.heaveNaturalPeriodS.toFixed(2)} s`} />
            <Metric label="Heave B" value={`${diagnostics.heaveRadiationDampingNsPerM.toFixed(0)} N s/m`} />
            <Metric label="Heave K" value={`${diagnostics.hydrostaticStiffnessNpm.toFixed(0)} N/m`} />
            <Metric label="Added mass" value={`${diagnostics.addedMassKg.toFixed(1)} kg`} />
          </div>
        </div>

        <div className="chart-block">
          <div className="section-title">
            <span>Depth Trace</span>
            <strong>{snapshot.history.length} samples</strong>
          </div>
          <canvas ref={chartRef} />
        </div>

        <div className="readout-block coefficients">
          <span>Model Inputs</span>
          <dl>
            <div>
              <dt>Projected area</dt>
              <dd>{projectedVerticalAreaAtAngleM2(spec, snapshot.object.angleRad).toFixed(3)} m2</dd>
            </div>
            <div>
              <dt>Effective Cd</dt>
              <dd>{diagnostics.effectiveDragCoefficient.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Drag speed</dt>
              <dd>{diagnostics.hydrodynamicDragSpeedMps.toFixed(2)} m/s</dd>
            </div>
            <div>
              <dt>Drag area</dt>
              <dd>{diagnostics.hydrodynamicDragAreaM2.toFixed(3)} m2</dd>
            </div>
            <div>
              <dt>Reynolds</dt>
              <dd>{compactNumber(diagnostics.reynoldsNumber)}</dd>
            </div>
            <div>
              <dt>Terminal speed</dt>
              <dd>{diagnostics.terminalVelocityMps === null ? "-" : `${diagnostics.terminalVelocityMps.toFixed(2)} m/s`}</dd>
            </div>
            <div>
              <dt>Added mass</dt>
              <dd>{spec.addedMassCoefficient.toFixed(2)}</dd>
            </div>
            <div>
              <dt>Characteristic length</dt>
              <dd>{characteristicLengthM(spec).toFixed(2)} m</dd>
            </div>
            <div>
              <dt>Water fill</dt>
              <dd>{Math.round(snapshot.object.waterFillFraction * 100)}%</dd>
            </div>
            <div>
              <dt>Inertia</dt>
              <dd>{diagnostics.momentOfInertiaKgM2.toFixed(2)} kg m2</dd>
            </div>
          </dl>
        </div>
      </section>
    </main>
  );
}

type RangeFieldProps = {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  suffix?: string;
  value: number;
};

function RangeField({ label, max, min, onChange, step, suffix = "", value }: RangeFieldProps) {
  return (
    <label className="range-field">
      <span>
        {label}
        <strong>
          {formatControlValue(value)} {suffix}
        </strong>
      </span>
      <input max={max} min={min} onChange={(event) => onChange(Number(event.target.value))} step={step} type="range" value={value} />
    </label>
  );
}

type NumberFieldProps = {
  label: string;
  onChange: (value: number) => void;
  suffix?: string;
  value: number;
};

function NumberField({ label, onChange, suffix = "", value }: NumberFieldProps) {
  return (
    <label className="number-field">
      <span>{label}</span>
      <div>
        <input
          min={0}
          onChange={(event) => onChange(Number(event.target.value))}
          step={suffix === "%/min" ? 0.01 : 0.01}
          type="number"
          value={Number.isInteger(value) ? value : Number(value.toFixed(3))}
        />
        <small>{suffix}</small>
      </div>
    </label>
  );
}

function Metric({ label, tone, value }: { label: string; tone?: "negative" | "positive"; value: string }) {
  return (
    <div className={tone ? `metric ${tone}` : "metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function fluidCapabilityTitle(report: FluidCapabilityReport) {
  if (report.status === "checking") return "Checking GPU";
  if (report.status === "webgpu-ready") return "WebGPU compute ready";
  return "CPU reference fallback";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatOptionalBytes(bytes: number | null) {
  return bytes === null ? "-" : formatBytes(bytes);
}

function compactText(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, Math.max(0, maxLength - 1))}...`;
}

function fluidWaterInputFor(
  canvas: HTMLCanvasElement,
  state: SimulationState,
  spec: ObjectSpec,
  settings: OceanSettings,
  dropHeightM: number
): FluidWaterRenderInput {
  const rect = canvas.getBoundingClientRect();
  const objectHeight = objectHeightM(spec);
  const objectWidth = objectWidthM(spec);
  const objectDepth = objectDepthM(spec);
  const aboveM = Math.max(dropHeightM + objectHeight + 1.2, 5);
  const belowM = settings.waterDepthM + 1.5;
  const scale = Math.min(rect.width / 26, rect.height / (aboveM + belowM));
  const centerX = rect.width * 0.5;
  const surfaceBaseY = Math.max(90, Math.min(rect.height * 0.48, 28 + aboveM * scale));
  const diagnostics = diagnosticsFor(state, spec, settings);
  const impactStrength =
    state.impact === null ? 0 : clamp(1 - Math.max(0, state.timeS - state.impact.atS) / Math.max(0.1, state.impact.cavityCollapseTimeS), 0, 1);
  return {
    buoyancyN: diagnostics.buoyancyN,
    currentSpeedMps: settings.currentSpeedMps,
    displacedVolumeM3: diagnostics.displacedVolumeM3,
    displacedVolumeRateM3ps: state.lastDisplacedVolumeRateM3ps,
    dragForceXN: diagnostics.hydrodynamicDragForceXN,
    dragForceYN: diagnostics.hydrodynamicDragForceYN,
    gravityMps2: settings.gravity,
    impactStrength,
    massKg: diagnostics.massKg,
    netForceN: diagnostics.netForceN,
    objectAngleRad: state.object.angleRad,
    objectCenterXPx: centerX + state.object.xM * scale,
    objectCenterYPx: surfaceBaseY - state.object.centerYM * scale,
    objectDepthM: objectDepth,
    objectHalfHeightPx: Math.max(3, objectHeight * scale * 0.5),
    objectHalfWidthPx: Math.max(3, objectWidth * scale * 0.5),
    objectHeightM: objectHeight,
    objectVxMps: state.object.vxMps,
    objectVyMps: state.object.vyMps,
    objectWidthM: objectWidth,
    scalePxPerM: scale,
    shape: spec.shape,
    slamForceN: state.lastWaterEntrySlamN,
    submergedFraction: diagnostics.submergedFraction,
    surfaceYPx: surfaceBaseY,
    timeS: state.timeS,
    waterDensityKgM3: settings.waterDensityKgM3,
    waterDepthM: settings.waterDepthM,
    waveHeightM: settings.waveHeightM,
  };
}

function renderOcean(canvas: HTMLCanvasElement, state: SimulationState, spec: ObjectSpec, settings: OceanSettings, dropHeightM: number) {
  const context = getCanvasContext(canvas);
  if (!context) return;
  const { ctx, height, width } = context;
  const objectHeight = objectHeightM(spec);
  const aboveM = Math.max(dropHeightM + objectHeight + 1.2, 5);
  const belowM = settings.waterDepthM + 1.5;
  const scale = Math.min(width / 26, height / (aboveM + belowM));
  const centerX = width * 0.5;
  const surfaceBaseY = Math.max(90, Math.min(height * 0.48, 28 + aboveM * scale));
  const metersToX = (xM: number) => centerX + xM * scale;
  const metersToY = (yM: number) => surfaceBaseY - yM * scale;
  const time = state.timeS;

  const sky = ctx.createLinearGradient(0, 0, 0, surfaceBaseY);
  sky.addColorStop(0, "#dff0f3");
  sky.addColorStop(0.64, "#f2ead8");
  sky.addColorStop(1, "#d4e9e8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  drawSunGlare(ctx, width, surfaceBaseY);
  const surfacePath = new Path2D();
  surfacePath.moveTo(0, surfaceBaseY);
  for (let px = 0; px <= width + 4; px += 4) {
    const xM = (px - centerX) / scale;
    const elevation = resolvedSurfaceElevationAt(state, xM, time, settings) + rippleElevationAt(xM, state);
    surfacePath.lineTo(px, metersToY(elevation));
  }
  surfacePath.lineTo(width, height);
  surfacePath.lineTo(0, height);
  surfacePath.closePath();

  const water = ctx.createLinearGradient(0, surfaceBaseY, 0, height);
  water.addColorStop(0, "rgba(47, 137, 154, 0.82)");
  water.addColorStop(0.34, "rgba(24, 91, 112, 0.9)");
  water.addColorStop(1, "rgba(12, 42, 55, 0.97)");
  ctx.fillStyle = water;
  ctx.fill(surfacePath);

  ctx.save();
  ctx.clip(surfacePath);
  drawDepthLines(ctx, width, settings, scale, surfaceBaseY);
  drawCaustics(ctx, width, height, surfaceBaseY, time);
  drawObject(ctx, state, spec, settings, metersToX, metersToY, scale, true);
  ctx.restore();

  drawSurfaceLine(ctx, width, centerX, surfaceBaseY, scale, time, settings, state);
  drawSplashParticles(ctx, state, metersToX, metersToY, scale);
  drawObject(ctx, state, spec, settings, metersToX, metersToY, scale, false);
  drawDropGuide(ctx, state, metersToX, metersToY, scale, surfaceBaseY);
  drawSeabed(ctx, width, height, surfaceBaseY, settings.waterDepthM, scale);
}

function renderHistoryChart(canvas: HTMLCanvasElement, state: SimulationState, settings: OceanSettings) {
  const context = getCanvasContext(canvas);
  if (!context) return;
  const { ctx, height, width } = context;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#101716";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.11)";
  ctx.lineWidth = 1;
  for (let index = 1; index < 4; index += 1) {
    const y = (height / 4) * index;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  if (state.history.length < 2) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
    ctx.font = "700 12px Inter, system-ui, sans-serif";
    ctx.fillText("Waiting for samples", 14, 26);
    return;
  }
  const start = state.history[0].timeS;
  const end = state.history[state.history.length - 1].timeS;
  const duration = Math.max(1, end - start);
  ctx.strokeStyle = "#d8b24c";
  ctx.lineWidth = 2;
  ctx.beginPath();
  state.history.forEach((sample, index) => {
    const x = ((sample.timeS - start) / duration) * width;
    const depth = Math.max(0, -sample.centerYM);
    const y = 10 + (depth / Math.max(1, settings.waterDepthM)) * (height - 20);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.strokeStyle = "#75d0cf";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  state.history.forEach((sample, index) => {
    const x = ((sample.timeS - start) / duration) * width;
    const y = height - 8 - sample.submergedFraction * (height - 16);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function drawObject(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  spec: ObjectSpec,
  settings: OceanSettings,
  metersToX: (xM: number) => number,
  metersToY: (yM: number) => number,
  scale: number,
  underwaterPass: boolean
) {
  const diagnostics = diagnosticsFor(state, spec, settings);
  const x = metersToX(state.object.xM);
  const y = metersToY(state.object.centerYM);
  const width = objectWidthM(spec) * scale;
  const height = objectHeightM(spec) * scale;
  const depthTint = underwaterPass ? "rgba(120, 198, 202, 0.35)" : "rgba(255, 255, 255, 0)";
  const fill = underwaterPass ? mixColor(spec.color, "#2c7f91", 0.42) : spec.color;
  const waveFollower = diagnostics.waveSlopeRad * diagnostics.submergedFraction * 0.18;
  const roll = state.object.angleRad + waveFollower;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(roll);
  ctx.globalAlpha = underwaterPass ? 0.72 : 1;
  ctx.shadowColor = underwaterPass ? "transparent" : "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = underwaterPass ? 0 : 18;
  ctx.shadowOffsetY = underwaterPass ? 0 : 10;
  ctx.fillStyle = fill;
  ctx.strokeStyle = underwaterPass ? "rgba(191, 232, 231, 0.45)" : "rgba(16, 22, 21, 0.5)";
  ctx.lineWidth = Math.max(1, scale * 0.025);

  if (spec.shape === "sphere") {
    ctx.beginPath();
    ctx.arc(0, 0, height / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = depthTint;
    ctx.fill();
    drawSpecular(ctx, -width * 0.18, -height * 0.2, Math.max(4, height * 0.13));
  } else if (spec.shape === "horizontalCylinder") {
    const radius = height / 2;
    roundedRect(ctx, -width / 2, -height / 2, width, height, Math.min(radius, 8));
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(-width / 2 + radius * 0.25, 0, radius * 0.28, radius * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    drawSpecular(ctx, -width * 0.18, -height * 0.19, Math.max(5, height * 0.09));
  } else if (spec.shape === "verticalCylinder") {
    roundedRect(ctx, -width / 2, -height / 2, width, height, Math.min(width * 0.28, 8));
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -height / 2 + width * 0.09, width / 2, width * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();
    drawSpecular(ctx, -width * 0.16, -height * 0.2, Math.max(4, width * 0.12));
  } else {
    roundedRect(ctx, -width / 2, -height / 2, width, height, 5);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = underwaterPass ? "rgba(202, 239, 237, 0.24)" : "rgba(255, 255, 255, 0.2)";
    ctx.beginPath();
    ctx.moveTo(-width / 2 + 8, -height / 2 + 8);
    ctx.lineTo(width / 2 - 8, height / 2 - 8);
    ctx.moveTo(width / 2 - 8, -height / 2 + 8);
    ctx.lineTo(-width / 2 + 8, height / 2 - 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSurfaceLine(
  ctx: CanvasRenderingContext2D,
  width: number,
  centerX: number,
  surfaceBaseY: number,
  scale: number,
  time: number,
  settings: OceanSettings,
  state: SimulationState
) {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(237, 255, 252, 0.88)";
  ctx.beginPath();
  for (let px = 0; px <= width + 4; px += 4) {
    const xM = (px - centerX) / scale;
    const elevation = resolvedSurfaceElevationAt(state, xM, time, settings) + rippleElevationAt(xM, state);
    const py = surfaceBaseY - elevation * scale;
    if (px === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  for (const ripple of state.ripples) {
    const ageRatio = ripple.ageS / ripple.lifetimeS;
    const radius = ripple.ageS * ripple.speedMps * scale;
    const x = centerX + ripple.xM * scale;
    ctx.globalAlpha = Math.max(0, 1 - ageRatio);
    ctx.beginPath();
    ctx.ellipse(x, surfaceBaseY, radius, 5 + ripple.amplitudeM * scale * (1 - ageRatio), 0, Math.PI, 0);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSplashParticles(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  metersToX: (xM: number) => number,
  metersToY: (yM: number) => number,
  scale: number
) {
  ctx.save();
  for (const particle of state.particles) {
    const alpha = Math.max(0, 1 - particle.ageS / particle.lifetimeS);
    ctx.fillStyle = `rgba(234, 255, 253, ${0.28 + alpha * 0.62})`;
    ctx.beginPath();
    ctx.arc(metersToX(particle.xM), metersToY(particle.yM), Math.max(1.2, particle.radiusM * scale), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawDropGuide(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  metersToX: (xM: number) => number,
  metersToY: (yM: number) => number,
  scale: number,
  surfaceBaseY: number
) {
  if (state.phase !== "ready") return;
  const x = metersToX(state.object.xM);
  const y = metersToY(state.object.centerYM);
  ctx.save();
  ctx.strokeStyle = "rgba(17, 23, 22, 0.25)";
  ctx.setLineDash([6, 7]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, surfaceBaseY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(17, 23, 22, 0.7)";
  ctx.font = `800 ${Math.max(11, scale * 0.18)}px Inter, system-ui, sans-serif`;
  ctx.fillText("release line", x + 10, Math.min(surfaceBaseY - 10, y + 22));
  ctx.restore();
}

function drawDepthLines(ctx: CanvasRenderingContext2D, width: number, settings: OceanSettings, scale: number, surfaceBaseY: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(218, 245, 243, 0.13)";
  ctx.fillStyle = "rgba(238, 255, 253, 0.48)";
  ctx.font = "700 11px Inter, system-ui, sans-serif";
  ctx.lineWidth = 1;
  for (let depth = 5; depth <= settings.waterDepthM; depth += 5) {
    const y = surfaceBaseY + depth * scale;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.fillText(`${depth} m`, 14, y - 4);
  }
  ctx.restore();
}

function drawCaustics(ctx: CanvasRenderingContext2D, width: number, height: number, surfaceBaseY: number, time: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(204, 238, 229, 0.08)";
  ctx.lineWidth = 1;
  for (let index = 0; index < 18; index += 1) {
    const y = surfaceBaseY + 28 + index * 38;
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 22) {
      const py = y + Math.sin(x * 0.026 + time * 1.6 + index) * 5;
      if (x === -20) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawSunGlare(ctx: CanvasRenderingContext2D, width: number, surfaceBaseY: number) {
  const glow = ctx.createRadialGradient(width * 0.76, surfaceBaseY * 0.32, 4, width * 0.76, surfaceBaseY * 0.32, width * 0.28);
  glow.addColorStop(0, "rgba(255, 232, 168, 0.72)");
  glow.addColorStop(1, "rgba(255, 232, 168, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, surfaceBaseY);
}

function drawSeabed(ctx: CanvasRenderingContext2D, width: number, height: number, surfaceBaseY: number, depthM: number, scale: number) {
  const seabedY = surfaceBaseY + depthM * scale;
  if (seabedY > height + 40) return;
  ctx.save();
  const bed = ctx.createLinearGradient(0, seabedY - 20, 0, height);
  bed.addColorStop(0, "rgba(88, 78, 61, 0.58)");
  bed.addColorStop(1, "rgba(45, 38, 31, 0.94)");
  ctx.fillStyle = bed;
  ctx.beginPath();
  ctx.moveTo(0, seabedY);
  for (let x = 0; x <= width; x += 24) {
    ctx.lineTo(x, seabedY + Math.sin(x * 0.03) * 7 + Math.cos(x * 0.011) * 4);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function renderScale(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return { height, ratio, width };
}

function getCanvasContext(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const { width, height, ratio } = renderScale(canvas);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, width: width / ratio, height: height / ratio };
}

function rippleElevationAt(xM: number, state: SimulationState): number {
  let elevation = 0;
  for (const ripple of state.ripples) {
    const ageRatio = ripple.ageS / ripple.lifetimeS;
    const distance = Math.abs(xM - ripple.xM);
    const radius = ripple.ageS * ripple.speedMps;
    const envelope = Math.exp(-((distance - radius) ** 2) / 1.8) * (1 - ageRatio);
    elevation += ripple.amplitudeM * envelope * Math.sin(distance * 5.5 - ripple.ageS * 7);
  }
  return elevation;
}

function withShapeDefaults(spec: ObjectSpec): ObjectSpec {
  const height = objectHeightM(spec);
  const width = objectWidthM(spec);
  const depth = objectDepthM(spec);
  if (spec.shape === "sphere") {
    return { ...spec, dimensions: { diameter: Math.max(0.1, height || width || 0.7) } };
  }
  if (spec.shape === "horizontalCylinder") {
    return { ...spec, dimensions: { length: Math.max(0.1, width || 1.2), diameter: Math.max(0.1, height || depth || 0.45) } };
  }
  if (spec.shape === "verticalCylinder") {
    return { ...spec, dimensions: { diameter: Math.max(0.1, width || depth || 0.55), height: Math.max(0.1, height || 0.8) } };
  }
  return { ...spec, dimensions: { width: Math.max(0.1, width || 0.8), height: Math.max(0.1, height || 0.7), depth: Math.max(0.1, depth || 0.7) } };
}

function phaseLabel(phase: SimulationState["phase"]) {
  switch (phase) {
    case "falling":
      return "Falling";
    case "floating":
      return "Floating";
    case "sank":
      return "On seabed";
    case "sinking":
      return "Sinking";
    case "ready":
    default:
      return "Ready";
  }
}

function stabilityLabel(stability: "negative" | "neutral" | "positive") {
  if (stability === "positive") return "Self-righting";
  if (stability === "negative") return "Unstable";
  return "Neutral";
}

function floatResultText(state: SimulationState, predictedSinkS: number | null) {
  if (state.sankAtS !== null) return `Sank after ${formatDuration(state.sankAtS)}`;
  if (state.settledAtS !== null) return `Settled after ${formatDuration(state.settledAtS)}`;
  if (state.impact && state.phase === "floating") return `Floating for ${formatDuration(state.timeS - state.impact.atS)}`;
  if (predictedSinkS !== null && predictedSinkS > 0) return `Predicted ${formatDuration(predictedSinkS)}`;
  return "Indefinite if intact";
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

function formatControlValue(value: number) {
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function compactNumber(value: number) {
  if (!Number.isFinite(value)) return "-";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1)}k`;
  if (abs >= 1000) return `${(value / 1000).toFixed(2)}k`;
  if (abs >= 10) return value.toFixed(0);
  return value.toFixed(2);
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawSpecular(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, "rgba(255, 255, 255, 0.58)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function mixColor(hexA: string, hexB: string, amount: number) {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  const mix = a.map((channel, index) => Math.round(channel + (b[index] - channel) * amount));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

function parseHex(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return [120, 120, 120];
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
