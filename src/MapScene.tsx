import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import * as PIXI from "pixi.js";
import { assetUrls } from "./game/assets";
import { activeContracts as getActiveContracts, contractUrgency } from "./game/contracts";
import { ports } from "./game/data";
import { clamp, tau } from "./game/math";
import {
  defaultOceanField,
  oceanDepthToneAt,
  oceanSurfaceRenderSummary,
  oceanRouteDisplayPoint,
  oceanSurfaceSignalKeys,
  oceanWaterPalette,
} from "./game/ocean";
import { summarizeCanvasPixels } from "./game/renderProbe";
import { cargoUnits, portById, routeConditions, routeRisk } from "./game/routing";
import { shipById } from "./game/ships";
import { portHitRadius, portSpriteSpecFor, portSpriteVisualFor, shipDockOffset, shipSpriteSpecFor, shipSpriteWidth } from "./game/visuals";
import type { GameError, GameState } from "./game/types";
import type { OceanFieldFrame } from "./game/ocean";

type MapSceneProps = {
  graphicsMode: MapRenderQuality["mode"];
  state: GameState;
  onRuntimeError?: (error: Omit<GameError, "id" | "day" | "time">) => void;
  onSelectPort: (portId: string) => void;
};

type MapRenderCache = {
  waterKey: string;
  routeKey: string;
  portKey: string;
  lowFpsSamples: number;
  fps: MapRenderPerformance;
  pixelProbeNextAt: number;
  pixelProbePending: boolean;
  quality: MapRenderQuality;
};

type MapRenderPerformance = {
  count: number;
  total: number;
  min: number;
  max: number;
  recent: number[];
};

type PortSpriteItem = {
  container: PIXI.Container;
  label: PIXI.Text;
  marker: PIXI.Graphics;
  sprite?: PIXI.Sprite;
};

type MapRenderQuality = {
  mode: "high" | "balanced" | "low";
  waterRenderer: "shader" | "low-power";
  scale: number;
  targetFps: number;
  waterRate: number;
  routeRate: number;
  portRate: number;
  routeSegments: number;
  wakeLines: number;
};

type RendererShipResponse = {
  bob: number;
  driftStrength: number;
  foam: number;
  hullResponse: number;
  roll: number;
  stormIntensity: number;
  wakeDeflection: number;
  wakeLength: number;
  wakePersistence: number;
  wakeSpread: number;
  wakeTurbulence: number;
  waveEnergy: number;
  yaw: number;
};

type RendererRouteMotion = {
  curvature: number;
  currentAssist: number;
};

const renderQualities: Record<MapRenderQuality["mode"], MapRenderQuality> = {
  high: { mode: "high", waterRenderer: "shader", scale: 1, targetFps: 60, waterRate: 8, routeRate: 10, portRate: 8, routeSegments: 26, wakeLines: 3 },
  balanced: { mode: "balanced", waterRenderer: "shader", scale: 0.72, targetFps: 60, waterRate: 5, routeRate: 6, portRate: 4, routeSegments: 20, wakeLines: 3 },
  low: { mode: "low", waterRenderer: "low-power", scale: 0.5, targetFps: 30, waterRate: 2, routeRate: 3, portRate: 2, routeSegments: 14, wakeLines: 2 },
};

export function MapScene({ graphicsMode, state, onRuntimeError, onSelectPort }: MapSceneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef(state);
  const runtimeErrorRef = useRef(onRuntimeError);
  const onSelectRef = useRef(onSelectPort);
  const reportedErrorsRef = useRef(new Set<string>());
  const reducedMotion = typeof window !== "undefined" ? reducedMotionPreference() : false;

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    runtimeErrorRef.current = onRuntimeError;
  }, [onRuntimeError]);

  useEffect(() => {
    onSelectRef.current = onSelectPort;
  }, [onSelectPort]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const initialQuality = initialMapRenderQuality(graphicsMode);

    let app: PIXI.Application;
    try {
      app = new PIXI.Application({
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: initialQuality.scale,
        resizeTo: host,
      });
    } catch (error) {
      reportMapRuntimeError(runtimeErrorRef, reportedErrorsRef, "pixi:init", error);
      return;
    }

    host.appendChild(app.view as HTMLCanvasElement);
    applyRenderQuality(app, host, initialQuality);
    updateRenderMeasurementContext(host);

    let ocean: PIXI.Mesh<PIXI.Shader>;
    let water: PIXI.Graphics;
    let routeLayer: PIXI.Graphics;
    let portLayer: PIXI.Container;
    let shipWake: PIXI.Graphics;
    let ship: PIXI.Sprite;
    try {
      ocean = createWaterShaderMesh();
      water = new PIXI.Graphics();
      routeLayer = new PIXI.Graphics();
      portLayer = new PIXI.Container();
      shipWake = new PIXI.Graphics();
      ship = PIXI.Sprite.from(shipById(stateRef.current.currentShip).asset ?? assetUrls.ship);
    } catch (error) {
      reportMapRuntimeError(runtimeErrorRef, reportedErrorsRef, "pixi:scene-assets", error);
      app.destroy(true, { children: true, texture: false, baseTexture: false });
      return;
    }
    const initialShipSpec = shipSpriteSpecFor(stateRef.current.currentShip);
    ship.anchor.set(initialShipSpec.anchorX, initialShipSpec.anchorY);
    ship.name = stateRef.current.currentShip;

    app.stage.addChild(ocean, water, routeLayer, portLayer, shipWake, ship);
    const renderCache: MapRenderCache = {
      waterKey: "",
      routeKey: "",
      portKey: "",
      lowFpsSamples: 0,
      fps: { count: 0, total: 0, min: Infinity, max: 0, recent: [] },
      pixelProbeNextAt: 0,
      pixelProbePending: false,
      quality: initialQuality,
    };

    const portSprites = new Map<string, PortSpriteItem>();
    try {
      for (const port of ports) {
        const portSpec = portSpriteSpecFor(port.id);
        const container = new PIXI.Container();
        const marker = new PIXI.Graphics();
        const label = new PIXI.Text(port.name, {
          fill: "#111716",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 12,
          fontWeight: "900",
        });
        label.anchor.set(0.5);
        let sprite: PIXI.Sprite | undefined;
        if (port.asset) {
          sprite = PIXI.Sprite.from(port.asset);
          sprite.anchor.set(portSpec.anchorX, portSpec.anchorY);
          container.addChild(sprite);
        }
        container.addChild(marker, label);
        portLayer.addChild(container);
        portSprites.set(port.id, { container, sprite, marker, label });
      }
    } catch (error) {
      reportMapRuntimeError(runtimeErrorRef, reportedErrorsRef, "pixi:port-assets", error);
      app.destroy(true, { children: true, texture: false, baseTexture: false });
      return;
    }

    const canvas = app.view as HTMLCanvasElement;
    let destroyed = false;
    let pixelProbeTimeout: number | undefined;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      reportMapRuntimeError(runtimeErrorRef, reportedErrorsRef, "pixi:webglcontextlost", "Renderer context lost");
    };
    const handleContextRestored = () => {
      reportMapRuntimeError(runtimeErrorRef, reportedErrorsRef, "pixi:webglcontextrestored", "Renderer context restored");
    };
    let hoveredPortId: string | null = null;
    const nearestSelectablePort = (clientX: number, clientY: number) => {
      const current = stateRef.current;
      if (current.voyage || current.encounter || current.gameOver) return null;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const base = Math.min(rect.width, rect.height);
      let nearest = ports[0];
      let nearestDistance = Infinity;
      for (const port of ports) {
        const px = port.x * rect.width;
        const py = port.y * rect.height;
        const distance = Math.hypot(px - x, py - y);
        if (distance < nearestDistance) {
          nearest = port;
          nearestDistance = distance;
        }
      }
      return nearestDistance < portHitRadius(base, nearest.id) ? nearest.id : null;
    };
    const setHoveredPort = (portId: string | null) => {
      if (hoveredPortId === portId) return;
      hoveredPortId = portId;
      host.dataset.hoverPort = portId ?? "";
      renderCache.portKey = "";
    };
    const handleClick = (event: MouseEvent) => {
      const portId = nearestSelectablePort(event.clientX, event.clientY);
      if (portId) onSelectRef.current(portId);
    };
    const handleMouseMove = (event: MouseEvent) => {
      setHoveredPort(nearestSelectablePort(event.clientX, event.clientY));
    };
    const handleMouseLeave = () => {
      setHoveredPort(null);
    };
    const handleVisibilityChange = () => updateRenderMeasurementContext(host);

    try {
      drawScene(app, ocean, water, routeLayer, portSprites, shipWake, ship, stateRef.current, 0, renderCache, hoveredPortId);
      app.renderer.render(app.stage);
      pixelProbeTimeout = scheduleCanvasPixelProbe(
        app,
        host,
        renderCache,
        performance.now(),
        () => destroyed,
        pixelProbeTimeout,
        (error) => reportMapRuntimeError(runtimeErrorRef, reportedErrorsRef, "pixi:pixel-probe", error)
      );
    } catch (error) {
      reportMapRuntimeError(runtimeErrorRef, reportedErrorsRef, "pixi:initial-draw", error);
    }

    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    canvas.addEventListener("webglcontextlost", handleContextLost);
    canvas.addEventListener("webglcontextrestored", handleContextRestored);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const measurementContextInterval = window.setInterval(handleVisibilityChange, 1000);

    let fpsFrames = 0;
    let fpsStartedAt = performance.now();
    const animationStartedAt = fpsStartedAt;
    app.ticker.add(() => {
      try {
        const now = performance.now();
        const elapsed = (now - animationStartedAt) / 1000;
        fpsFrames += 1;
        const fpsElapsed = now - fpsStartedAt;
        if (fpsElapsed >= 1000) {
          const fps = Math.round((fpsFrames * 1000) / fpsElapsed);
          recordRenderFpsSample(host, renderCache, fps);
          updateRenderMeasurementContext(host);
          updateAdaptiveRenderQuality(app, host, renderCache, fps);
          fpsFrames = 0;
          fpsStartedAt = now;
        }
        drawScene(app, ocean, water, routeLayer, portSprites, shipWake, ship, stateRef.current, elapsed, renderCache, hoveredPortId);
        pixelProbeTimeout = scheduleCanvasPixelProbe(
          app,
          host,
          renderCache,
          now,
          () => destroyed,
          pixelProbeTimeout,
          (error) => reportMapRuntimeError(runtimeErrorRef, reportedErrorsRef, "pixi:pixel-probe", error)
        );
      } catch (error) {
        reportMapRuntimeError(runtimeErrorRef, reportedErrorsRef, "pixi:draw", error);
      }
    });

    return () => {
      destroyed = true;
      if (pixelProbeTimeout != null) window.clearTimeout(pixelProbeTimeout);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(measurementContextInterval);
      app.destroy(true, { children: true, texture: false, baseTexture: false });
    };
  }, [graphicsMode]);

  return (
    <div
      ref={hostRef}
      className="pixi-map"
      data-active-contracts={getActiveContracts(state).length}
      data-active-ship={state.currentShip}
      data-ocean-field={defaultOceanField.id}
      data-render-quality="initializing"
      data-render-layers="shader-plus-sampled-surface-v2"
      data-render-scale="initializing"
      data-render-adaptive-fallback="none"
      data-ocean-depth-contrast="waiting"
      data-render-fps="waiting"
      data-render-fps-avg="waiting"
      data-render-fps-min="waiting"
      data-render-fps-max="waiting"
      data-render-fps-recent-avg="waiting"
      data-render-fps-samples="0"
      data-render-fps-stability="warming"
      data-reduced-motion={reducedMotion ? "true" : "false"}
      data-canvas-pixel-status="waiting"
      data-canvas-pixel-variety="waiting"
      data-map-sprites="production-sprite-specs-v1"
      data-water-signal-current="waiting"
      data-water-signal-foam="waiting"
      data-water-signal-roughness="waiting"
      data-water-signal-route-risk="waiting"
      data-water-signal-storm="waiting"
      data-water-signals={oceanSurfaceSignalKeys.join(",")}
      data-water-surface="production-ocean-surface-v2"
      data-water-surface-current-ribbons="waiting"
      data-water-surface-foam-coverage="waiting"
      data-water-surface-normal-variance="waiting"
      data-water-surface-storm-coverage="waiting"
      data-water-surface-tiles="waiting"
      data-testid="map-canvas"
      data-water-renderer="initializing"
      aria-label="Animated tradewinds map. Use the port buttons above the map to select a destination."
      role="img"
    />
  );
}

const waterVertexShader = `
precision mediump float;

attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
uniform mat3 projectionMatrix;
uniform mat3 translationMatrix;
varying vec2 vTextureCoord;

void main(void) {
  vTextureCoord = aTextureCoord;
  vec3 position = projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const waterFragmentShader = `
precision mediump float;

varying vec2 vTextureCoord;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uWind;
uniform float uWindStrength;
uniform vec2 uCurrent;
uniform float uCurrentStrength;
uniform vec4 uStorm0;
uniform vec4 uStorm1;
uniform vec4 uStorm2;

float wave(vec2 uv, vec2 dir, float scale, float speed, float phase) {
  return sin(dot(uv, normalize(dir)) * scale + uTime * speed + phase);
}

float stormMask(vec2 uv, vec4 storm) {
  vec2 stretch = vec2(1.0, 1.62);
  float dist = length((uv - storm.xy) * stretch);
  float inner = smoothstep(storm.z, storm.z * 0.18, dist);
  return inner * storm.w;
}

void main(void) {
  vec2 uv = vTextureCoord;
  float depth = smoothstep(0.0, 1.0, uv.y);
  float windLean = dot(uv - 0.5, normalize(uWind + vec2(0.001, 0.0))) * 0.16 * uWindStrength;
  float storm = clamp(stormMask(uv, uStorm0) + stormMask(uv, uStorm1) + stormMask(uv, uStorm2), 0.0, 1.0);

  float swellA = wave(uv + windLean, vec2(1.0, -0.42), 31.0, 0.72 + uWindStrength * 0.22, 0.0);
  float swellB = wave(uv, vec2(0.52, 0.86), 49.0, -0.96, 1.7);
  float chop = wave(uv, vec2(-0.78, 0.48), 96.0, 1.8 + storm * 0.75, 2.9);
  float height = swellA * 0.44 + swellB * 0.3 + chop * (0.16 + storm * 0.17);

  float normalLight = clamp(0.5 + height * 0.28 + wave(uv + vec2(0.004, 0.0), vec2(1.0, -0.42), 31.0, 0.72, 0.0) * 0.06, 0.0, 1.0);
  float foamLine = smoothstep(0.72 - storm * 0.2, 0.98, height + storm * 0.38 + chop * 0.12);
  float streaks = smoothstep(0.78, 1.0, wave(uv + uWind * uTime * 0.018, vec2(0.96, -0.28), 124.0, 0.55, 0.2));
  vec2 currentDir = normalize(uCurrent + vec2(0.001, -0.001));
  float currentBands = smoothstep(0.74, 1.0, wave(uv + currentDir * uTime * 0.026, currentDir, 78.0, 0.36 + uCurrentStrength * 0.32, 3.0));
  float foam = clamp(
    foamLine * (0.18 + storm * 0.52) +
    streaks * (0.018 + storm * 0.075) +
    currentBands * min(uCurrentStrength, 1.1) * 0.045,
    0.0,
    0.64
  );

  vec3 shallow = vec3(${glslRgb(oceanWaterPalette.shallow)});
  vec3 mid = vec3(${glslRgb(oceanWaterPalette.mid)});
  vec3 deep = vec3(${glslRgb(oceanWaterPalette.deep)});
  vec3 stormTint = vec3(${glslRgb(oceanWaterPalette.stormTint)});
  vec3 color = mix(shallow, mid, depth);
  color = mix(color, deep, smoothstep(0.34, 1.0, depth));
  color = mix(color, stormTint, storm * 0.5);
  color = mix(color, vec3(${glslRgb(oceanWaterPalette.currentBand)}), currentBands * min(uCurrentStrength, 1.0) * 0.14);
  color += vec3(0.04, 0.09, 0.1) * (normalLight - 0.45);
  color += vec3(${glslRgb(oceanWaterPalette.foam)}) * foam;

  gl_FragColor = vec4(color, 1.0);
}
`;

function glslRgb(color: { r: number; g: number; b: number }) {
  return `${(color.r / 255).toFixed(4)}, ${(color.g / 255).toFixed(4)}, ${(color.b / 255).toFixed(4)}`;
}

function createWaterShaderMesh() {
  const geometry = new PIXI.Geometry()
    .addAttribute("aVertexPosition", [0, 0, 1, 0, 1, 1, 0, 1], 2)
    .addAttribute("aTextureCoord", [0, 0, 1, 0, 1, 1, 0, 1], 2)
    .addIndex([0, 1, 2, 0, 2, 3]);
  const shader = PIXI.Shader.from(waterVertexShader, waterFragmentShader, {
    uTime: 0,
    uResolution: new Float32Array([1000, 700]),
    uWind: new Float32Array([1, 0]),
    uWindStrength: 1,
    uCurrent: new Float32Array([0.2, 0.05]),
    uCurrentStrength: 0.2,
    uStorm0: new Float32Array([0, 0, 0, 0]),
    uStorm1: new Float32Array([0, 0, 0, 0]),
    uStorm2: new Float32Array([0, 0, 0, 0]),
  });
  const mesh = new PIXI.Mesh(geometry, shader);
  return mesh;
}

function updateWaterShader(shader: PIXI.Shader, frame: OceanFieldFrame) {
  shader.uniforms.uTime = frame.time;
  writeVec2(shader.uniforms.uResolution, frame.width, frame.height);
  writeVec2(shader.uniforms.uWind, frame.wind.x, frame.wind.y);
  shader.uniforms.uWindStrength = frame.wind.strength;
  const center = defaultOceanField.samplePoint({ normX: 0.5, normY: 0.54, day: frame.day, time: frame.time, width: frame.width, height: frame.height });
  writeVec2(shader.uniforms.uCurrent, center.current.x, center.current.y);
  shader.uniforms.uCurrentStrength = center.current.strength;
  const fronts = [...frame.stormFronts].sort((a, b) => b.intensity - a.intensity).slice(0, 3);
  writeStormUniform(shader.uniforms.uStorm0, fronts[0]);
  writeStormUniform(shader.uniforms.uStorm1, fronts[1]);
  writeStormUniform(shader.uniforms.uStorm2, fronts[2]);
}

function writeVec2(target: Float32Array | number[], x: number, y: number) {
  target[0] = x;
  target[1] = y;
}

function writeStormUniform(target: Float32Array | number[], front?: OceanFieldFrame["stormFronts"][number]) {
  target[0] = front?.x ?? 0;
  target[1] = front?.y ?? 0;
  target[2] = front?.radius ?? 0;
  target[3] = front?.intensity ?? 0;
}

function updateRenderMeasurementContext(host: HTMLDivElement) {
  host.dataset.renderVisibility = document.hidden ? "hidden" : "visible";
  if (!Number.isFinite(Number(host.dataset.renderFps))) {
    host.dataset.renderFpsContext = "waiting-for-foreground-ticker";
    return;
  }
  host.dataset.renderFpsContext = document.hidden ? "background-throttled" : "foreground";
}

function recordRenderFpsSample(host: HTMLDivElement, cache: MapRenderCache, fps: number) {
  if (document.hidden || !Number.isFinite(fps) || fps <= 0) return;
  cache.fps.count += 1;
  cache.fps.total += fps;
  cache.fps.min = Math.min(cache.fps.min, fps);
  cache.fps.max = Math.max(cache.fps.max, fps);
  cache.fps.recent.push(fps);
  if (cache.fps.recent.length > 8) cache.fps.recent.shift();

  const average = cache.fps.total / cache.fps.count;
  const recentAverage = cache.fps.recent.reduce((sum, value) => sum + value, 0) / Math.max(1, cache.fps.recent.length);
  const target = cache.quality.targetFps;
  const stableFloor = target >= 60 ? 45 : Math.max(20, target * 0.78);
  const stability =
    cache.fps.count < 4
      ? "warming"
      : recentAverage >= stableFloor
        ? "stable"
        : recentAverage >= stableFloor * 0.72
          ? "strained"
          : "unstable";

  host.dataset.renderFps = String(fps);
  host.dataset.renderFpsAvg = average.toFixed(1);
  host.dataset.renderFpsMin = String(Number.isFinite(cache.fps.min) ? cache.fps.min : fps);
  host.dataset.renderFpsMax = String(cache.fps.max);
  host.dataset.renderFpsRecentAvg = recentAverage.toFixed(1);
  host.dataset.renderFpsSamples = String(cache.fps.count);
  host.dataset.renderFpsStability = stability;
  host.dataset.renderFpsTarget = String(target);
}

function initialMapRenderQuality(graphicsMode: MapRenderQuality["mode"]) {
  if (reducedMotionPreference()) {
    return { ...renderQualities.low, targetFps: 12, waterRate: 1, routeRate: 1, portRate: 1, wakeLines: 1 };
  }
  return renderQualities[graphicsMode];
}

function reducedMotionPreference() {
  const stored = window.localStorage.getItem("harborline.reducedMotion");
  if (stored === "true") return true;
  if (stored === "false") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
}

function updateAdaptiveRenderQuality(app: PIXI.Application, host: HTMLDivElement, cache: MapRenderCache, fps: number) {
  if (document.hidden || cache.quality.mode === "low") return;
  cache.lowFpsSamples = fps > 0 && fps < 28 ? cache.lowFpsSamples + 1 : 0;
  if (cache.lowFpsSamples < 3) return;

  const previousMode = cache.quality.mode;
  cache.quality = renderQualities.low;
  cache.lowFpsSamples = 0;
  cache.waterKey = "";
  cache.routeKey = "";
  cache.portKey = "";
  host.dataset.renderAdaptiveFallback = `${previousMode}->low`;
  host.dataset.renderAdaptiveReason = "fps-below-28-for-3-samples";
  app.renderer.resolution = cache.quality.scale;
  const rect = host.getBoundingClientRect();
  app.renderer.resize(Math.max(1, rect.width), Math.max(1, rect.height));
  applyRenderQuality(app, host, cache.quality);
}

function applyRenderQuality(app: PIXI.Application, host: HTMLDivElement, quality: MapRenderQuality) {
  app.ticker.maxFPS = quality.targetFps;
  updateRenderQualityAttributes(host, quality);
}

function updateRenderQualityAttributes(host: HTMLDivElement, quality: MapRenderQuality) {
  host.dataset.renderQuality = quality.mode;
  host.dataset.renderScale = String(quality.scale);
  host.dataset.waterRenderer = quality.waterRenderer === "shader" ? "shader-mesh-v2" : "low-power-graphics-v2";
}

function scheduleCanvasPixelProbe(
  app: PIXI.Application,
  host: HTMLDivElement,
  cache: MapRenderCache,
  now: number,
  isDestroyed: () => boolean,
  currentTimeout: number | undefined,
  onProbeError: (error: unknown) => void
) {
  if (isDestroyed() || cache.pixelProbePending || now < cache.pixelProbeNextAt) return currentTimeout;

  cache.pixelProbePending = true;
  cache.pixelProbeNextAt = now + 2000;
  return window.setTimeout(() => {
    try {
      if (isDestroyed()) return;
      const pixels = app.renderer.extract.pixels(app.stage);
      const summary = summarizeCanvasPixels(pixels, app.renderer.width, app.renderer.height);
      updateCanvasPixelProbeAttributes(host, summary);
    } catch (error) {
      host.dataset.canvasPixelStatus = "error";
      host.dataset.canvasPixelVariety = "error";
      onProbeError(error);
    } finally {
      cache.pixelProbePending = false;
    }
  }, 0);
}

function updateCanvasPixelProbeAttributes(host: HTMLDivElement, summary: ReturnType<typeof summarizeCanvasPixels>) {
  host.dataset.canvasPixelStatus = summary.status;
  host.dataset.canvasPixelVariety = summary.variety;
  host.dataset.canvasPixelSamples = String(summary.samples);
  host.dataset.canvasPixelOpaque = String(summary.opaqueSamples);
  host.dataset.canvasPixelColors = String(summary.colorBuckets);
  host.dataset.canvasPixelAlpha = String(Math.round(summary.averageAlpha));
  host.dataset.canvasPixelLuma = String(Math.round(summary.averageLuma));
}

function reportMapRuntimeError(
  runtimeErrorRef: MutableRefObject<MapSceneProps["onRuntimeError"]>,
  reportedErrorsRef: MutableRefObject<Set<string>>,
  source: string,
  error: unknown
) {
  const message = runtimeErrorMessage(error, "Pixi renderer failed");
  const key = `${source}:${message}`;
  if (reportedErrorsRef.current.has(key)) return;
  reportedErrorsRef.current.add(key);
  runtimeErrorRef.current?.({
    message,
    source,
    stack: runtimeErrorStack(error),
  });
}

function runtimeErrorMessage(value: unknown, fallback: string) {
  if (value instanceof Error) return value.message || fallback;
  if (typeof value === "string") return value || fallback;
  if (value == null) return fallback;
  return String(value);
}

function runtimeErrorStack(value: unknown) {
  if (value instanceof Error) return value.stack;
  return undefined;
}

function drawScene(
  app: PIXI.Application,
  ocean: PIXI.Mesh<PIXI.Shader>,
  water: PIXI.Graphics,
  routeLayer: PIXI.Graphics,
  portSprites: Map<string, PortSpriteItem>,
  shipWake: PIXI.Graphics,
  ship: PIXI.Sprite,
  state: GameState,
  time: number,
  cache: MapRenderCache,
  hoveredPortId: string | null
) {
  const width = app.screen.width;
  const height = app.screen.height;
  const frame = defaultOceanField.frame({ day: state.day, time, width, height });
  const host = (app.view as HTMLCanvasElement).parentElement as HTMLDivElement | null;
  if (host) updateOceanSurfaceAttributes(host, frame, state);
  const shaderWater = cache.quality.waterRenderer === "shader";
  ocean.visible = shaderWater;
  if (shaderWater) {
    ocean.width = width;
    ocean.height = height;
    updateWaterShader(ocean.shader, frame);
  }

  const waterKey = waterLayerKey(frame, cache.quality, state);
  if (cache.waterKey !== waterKey) {
    drawWater(water, frame, cache.quality, state);
    cache.waterKey = waterKey;
  }

  const routeKey = routeLayerKey(width, height, state, frame, cache.quality);
  if (cache.routeKey !== routeKey) {
    drawRoutes(routeLayer, width, height, state, frame, cache.quality);
    cache.routeKey = routeKey;
  }

  const portKey = portLayerKey(width, height, state, frame, cache.quality, hoveredPortId);
  if (cache.portKey !== portKey) {
    drawPorts(portSprites, width, height, state, time, hoveredPortId);
    cache.portKey = portKey;
  }

  drawShip(host, shipWake, ship, width, height, state, frame, cache.quality);
}

function waterLayerKey(frame: OceanFieldFrame, quality: MapRenderQuality, state: GameState) {
  const route = state.currentPort === state.selectedPort ? "docked" : `${state.currentPort}>${state.selectedPort}:${state.sailPlan}`;
  return `${quality.mode}:${quality.waterRenderer}:${frame.width}:${frame.height}:${frame.day}:${route}:${Math.floor(frame.time * quality.waterRate)}`;
}

function routeLayerKey(width: number, height: number, state: GameState, frame: OceanFieldFrame, quality: MapRenderQuality) {
  const voyage = state.voyage
    ? `${state.voyage.fromId}>${state.voyage.toId}:${state.voyage.progress.toFixed(3)}:${state.voyage.watchIndex ?? 0}`
    : "docked";
  return [
    width,
    height,
    frame.day,
    Math.floor(frame.time * 10),
    state.currentPort,
    state.selectedPort,
    state.sailPlan,
    state.currentShip,
    quality.mode,
    quality.routeSegments,
    voyage,
    Math.floor(frame.time * quality.routeRate),
    contractRouteSignature(state),
  ].join(":");
}

function portLayerKey(width: number, height: number, state: GameState, frame: OceanFieldFrame, quality: MapRenderQuality, hoveredPortId: string | null) {
  return [
    width,
    height,
    state.currentPort,
    state.selectedPort,
    hoveredPortId ?? "",
    quality.mode,
    Math.floor(frame.time * quality.portRate),
    contractRouteSignature(state),
  ].join(":");
}

function contractRouteSignature(state: GameState) {
  return getActiveContracts(state)
    .map((contract) => `${contract.id}:${contract.status}:${contract.destinationPortId}:${contractUrgency(state, contract)}`)
    .join("|");
}

function updateOceanSurfaceAttributes(host: HTMLDivElement, frame: OceanFieldFrame, state: GameState) {
  const summary = oceanSurfaceRenderSummary(frame.day, frame.time, 7);
  const selectedRisk = state.currentPort === state.selectedPort ? 0 : routeRisk(state, state.currentPort, state.selectedPort);
  host.dataset.waterSurface = summary.rendererVersion;
  host.dataset.waterSignals = oceanSurfaceSignalKeys.join(",");
  host.dataset.waterSignalCurrent = summary.averageCurrentStrength.toFixed(3);
  host.dataset.waterSignalFoam = summary.averageFoam.toFixed(3);
  host.dataset.waterSignalRoughness = summary.averageRoughness.toFixed(3);
  host.dataset.waterSignalStorm = summary.maxStormIntensity.toFixed(3);
  host.dataset.waterSignalRouteRisk = selectedRisk.toFixed(3);
  host.dataset.oceanDepthContrast = summary.depthContrast.toFixed(3);
  host.dataset.waterSurfaceCurrentRibbons = summary.currentRibbonStrength.toFixed(3);
  host.dataset.waterSurfaceFoamCoverage = summary.foamCoverage.toFixed(3);
  host.dataset.waterSurfaceNormalVariance = summary.normalVariance.toFixed(3);
  host.dataset.waterSurfaceStormCoverage = summary.stormCoverage.toFixed(3);
  host.dataset.waterSurfaceTiles = String(summary.surfaceTileSamples);
}

function drawWater(graphics: PIXI.Graphics, frame: OceanFieldFrame, quality: MapRenderQuality, state: GameState) {
  const { width, height } = frame;
  graphics.clear();

  if (quality.waterRenderer === "low-power") {
    drawLowPowerOcean(graphics, frame);
    drawProductionOceanSignals(graphics, frame, quality, state);
    drawStormFronts(graphics, frame);
    return;
  }

  graphics.beginFill(0x0d3b4b, 0.035);
  graphics.drawRect(0, 0, width, height);
  graphics.endFill();

  drawSampledWaterSurface(graphics, frame, quality);
  drawProductionOceanSignals(graphics, frame, quality, state);
  drawStormFronts(graphics, frame);
}

function drawSampledWaterSurface(graphics: PIXI.Graphics, frame: OceanFieldFrame, quality: MapRenderQuality) {
  const { width, height, day, time } = frame;
  const cols = quality.mode === "high" ? 18 : 14;
  const rows = quality.mode === "high" ? 11 : 9;
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const normX = (col + 0.5) / cols;
      const normY = (row + 0.5) / rows;
      const sample = defaultOceanField.samplePoint({ normX, normY, day, time: time + (col - row) * 0.018, width, height });
      const depth = oceanDepthToneAt(normX, normY);
      const normalLight = clamp(0.5 + sample.wave.slopeX * 4.2 - sample.wave.slopeY * 2.4 + sample.wave.height * 0.004, 0, 1);
      const tint = sampledWaterColor(depth, sample.waveEnergy, sample.stormIntensity, sample.current.strength, normalLight);
      const alpha = clamp(0.07 + sample.waveEnergy * 0.075 + sample.current.strength * 0.025 + sample.stormIntensity * 0.08, 0.07, 0.24);
      const driftX = sample.surfaceDrift.x * cellWidth * 0.1;
      const driftY = sample.surfaceDrift.y * cellHeight * 0.1;
      const x = col * cellWidth;
      const y = row * cellHeight;

      graphics.beginFill(tint, alpha);
      graphics.drawPolygon([
        x - 1 + driftX,
        y - 1 + driftY,
        x + cellWidth + 1 + driftX * 0.34,
        y - 1 - driftY * 0.18,
        x + cellWidth + 1 - driftX,
        y + cellHeight + 1 - driftY,
        x - 1 - driftX * 0.28,
        y + cellHeight + 1 + driftY * 0.24,
      ]);
      graphics.endFill();

      if (sample.foam > 0.2 || sample.roughness > 0.46 || sample.current.strength > 0.42) {
        const direction = normalizeScreenVector(sample.wind.x + sample.current.x * 0.45, sample.wind.y + sample.current.y * 0.45);
        const centerX = x + cellWidth * (0.46 + Math.sin(time * 0.4 + col) * 0.05);
        const centerY = y + cellHeight * (0.52 + Math.cos(time * 0.37 + row) * 0.05);
        const length = clamp(cellWidth * (0.24 + sample.waveEnergy * 0.28 + sample.current.strength * 0.12), 10, 42);
        const foamAlpha = clamp(0.025 + sample.foam * 0.11 + sample.stormIntensity * 0.045, 0.025, 0.2);
        graphics.lineStyle(0.8 + sample.foam * 0.65, sample.foam > 0.42 ? 0xf3fffa : 0xaedfdc, foamAlpha);
        graphics.moveTo(centerX - direction.x * length, centerY - direction.y * length * 0.42);
        graphics.lineTo(centerX + direction.x * length, centerY + direction.y * length * 0.42);
      }
    }
  }
}

function sampledWaterColor(depth: number, waveEnergy: number, stormIntensity: number, currentStrength: number, normalLight: number) {
  const base = depth < 0.28 ? 0x2f908d : depth > 0.72 ? 0x06263b : 0x0b5365;
  const light = normalLight > 0.58 ? 0x2b7f89 : 0x061f33;
  const current = currentStrength > 0.34 ? 0x0a4752 : base;
  const storm = stormIntensity > 0.24 ? 0x182f3a : current;
  if (waveEnergy > 0.48 && normalLight > 0.64) return 0x5eb4ac;
  return normalLight > 0.5 ? mixHex(base, current, 0.42) : mixHex(storm, light, 0.35);
}

function mixHex(left: number, right: number, amount: number) {
  const t = clamp(amount, 0, 1);
  const lr = (left >> 16) & 255;
  const lg = (left >> 8) & 255;
  const lb = left & 255;
  const rr = (right >> 16) & 255;
  const rg = (right >> 8) & 255;
  const rb = right & 255;
  const r = Math.round(lr + (rr - lr) * t);
  const g = Math.round(lg + (rg - lg) * t);
  const b = Math.round(lb + (rb - lb) * t);
  return (r << 16) | (g << 8) | b;
}

function drawProductionOceanSignals(graphics: PIXI.Graphics, frame: OceanFieldFrame, quality: MapRenderQuality, state: GameState) {
  drawDepthShelves(graphics, frame, quality);
  drawSwellCrests(graphics, frame, quality);
  drawCurrentRibbons(graphics, frame, quality);
  drawRoughWaterFoam(graphics, frame, quality);
  drawSelectedRouteRiskHeat(graphics, frame, quality, state);
}

function drawDepthShelves(graphics: PIXI.Graphics, frame: OceanFieldFrame, quality: MapRenderQuality) {
  const cols = quality.mode === "high" ? 12 : 9;
  const rows = quality.mode === "high" ? 8 : 6;
  const cellWidth = frame.width / cols;
  const cellHeight = frame.height / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const normX = (col + 0.5) / cols;
      const normY = (row + 0.5) / rows;
      const depth = oceanDepthToneAt(normX, normY);
      const color = depth < 0.28 ? 0x58c7b7 : depth > 0.68 ? 0x061a2a : 0x0e5b67;
      const alpha = depth < 0.28 ? 0.05 : depth > 0.68 ? 0.06 : 0.025;
      graphics.beginFill(color, alpha);
      graphics.drawRect(col * cellWidth - 1, row * cellHeight - 1, cellWidth + 2, cellHeight + 2);
      graphics.endFill();
    }
  }
}

function drawSwellCrests(graphics: PIXI.Graphics, frame: OceanFieldFrame, quality: MapRenderQuality) {
  const { width, height, day, time, wind } = frame;
  const windLean = normalizeScreenVector(wind.x, wind.y);
  const bands = quality.mode === "high" ? 12 : 8;
  for (let band = 0; band < bands; band += 1) {
    const normY = (band + 0.55) / (bands + 0.7);
    const sample = defaultOceanField.samplePoint({ normX: 0.45 + Math.sin(band * 1.7) * 0.08, normY, day, time, width, height });
    const y = normY * height + Math.sin(time * 0.58 + band * 1.9) * (5 + sample.waveEnergy * 9);
    const alpha = clamp(0.026 + sample.waveEnergy * 0.042 + sample.foam * 0.04, 0.026, 0.13);
    graphics.lineStyle(1 + sample.waveEnergy * 1.15, sample.roughness > 0.62 ? 0xe9fff8 : 0x93d4dc, alpha);
    graphics.moveTo(-36, y);
    graphics.bezierCurveTo(
      width * 0.28,
      y + windLean.y * 28 + sample.wave.height * 0.04,
      width * 0.68,
      y - windLean.y * 18 + sample.surfaceDrift.y * 22,
      width + 36,
      y + windLean.x * 12
    );
  }
}

function drawCurrentRibbons(graphics: PIXI.Graphics, frame: OceanFieldFrame, quality: MapRenderQuality) {
  const { width, height, day, time } = frame;
  const columns = quality.mode === "high" ? 5 : 4;
  const rows = quality.mode === "high" ? 4 : 3;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const normX = (col + 0.5 + Math.sin(time * 0.12 + row) * 0.08) / columns;
      const normY = (row + 0.5 + Math.cos(time * 0.1 + col) * 0.08) / rows;
      const sample = defaultOceanField.samplePoint({ normX, normY, day, time, width, height });
      if (sample.current.strength < 0.18) continue;
      const direction = normalizeScreenVector(sample.current.x, sample.current.y);
      const length = clamp(28 + sample.current.strength * 46, 28, 88);
      const bend = sample.surfaceDrift.strength * 18;
      const x = normX * width;
      const y = normY * height;
      graphics.lineStyle(1.2 + sample.current.strength * 0.7, 0x77d9d1, clamp(0.035 + sample.current.strength * 0.055, 0.035, 0.14));
      graphics.moveTo(x - direction.x * length * 0.5, y - direction.y * length * 0.5);
      graphics.bezierCurveTo(
        x - direction.x * length * 0.12 - direction.y * bend,
        y - direction.y * length * 0.12 + direction.x * bend,
        x + direction.x * length * 0.12 + direction.y * bend,
        y + direction.y * length * 0.12 - direction.x * bend,
        x + direction.x * length * 0.5,
        y + direction.y * length * 0.5
      );
    }
  }
}

function drawRoughWaterFoam(graphics: PIXI.Graphics, frame: OceanFieldFrame, quality: MapRenderQuality) {
  const { width, height, day, time } = frame;
  const samples = quality.mode === "high" ? 34 : 22;
  for (let index = 0; index < samples; index += 1) {
    const normX = ((index * 0.618 + Math.sin(day * 0.07 + index) * 0.04) % 1 + 1) % 1;
    const normY = ((index * 0.373 + Math.cos(day * 0.05 + index) * 0.05) % 1 + 1) % 1;
    const sample = defaultOceanField.samplePoint({ normX, normY, day, time: time + index * 0.07, width, height });
    if (sample.foam < 0.28 && sample.roughness < 0.52) continue;
    const x = normX * width;
    const y = normY * height;
    const widthScale = 8 + sample.foam * 22 + sample.waveEnergy * 12;
    const heightScale = 1.4 + sample.foam * 5;
    const angle = Math.atan2(sample.wind.y + sample.current.y * 0.35, sample.wind.x + sample.current.x * 0.35);
    graphics.lineStyle(1 + sample.foam * 0.7, 0xf2fff9, clamp(0.05 + sample.foam * 0.12 + sample.stormIntensity * 0.08, 0.05, 0.28));
    graphics.moveTo(x - Math.cos(angle) * widthScale, y - Math.sin(angle) * heightScale);
    graphics.lineTo(x + Math.cos(angle) * widthScale, y + Math.sin(angle) * heightScale);
  }
}

function drawSelectedRouteRiskHeat(graphics: PIXI.Graphics, frame: OceanFieldFrame, quality: MapRenderQuality, state: GameState) {
  if (state.currentPort === state.selectedPort || state.voyage || state.encounter || state.gameOver) return;
  const risk = routeRisk(state, state.currentPort, state.selectedPort);
  const routeSample = defaultOceanField.sampleRoute({ day: frame.day, fromId: state.currentPort, toId: state.selectedPort, samples: 8 });
  const color = risk >= 0.32 || routeSample.stormIntensity >= 0.38 ? 0xc8503e : risk >= 0.22 || routeSample.roughness >= 0.48 ? 0xd6a43a : 0x4fa36c;
  const alpha = clamp(0.08 + risk * 0.18 + routeSample.stormIntensity * 0.1, 0.08, 0.24);
  drawOceanRoutePath(graphics, frame.width, frame.height, frame.day, frame.time, state.currentPort, state.selectedPort, color, quality.mode === "high" ? 9 : 7, alpha, 0, Math.max(8, quality.routeSegments));
}

function drawLowPowerOcean(graphics: PIXI.Graphics, frame: OceanFieldFrame) {
  const { width, height, day, time, wind } = frame;
  graphics.beginFill(0x0a2f3d, 1);
  graphics.drawRect(0, 0, width, height);
  graphics.endFill();

  const depthBands = [
    { y: 0, color: 0x0c4050, alpha: 0.84 },
    { y: 0.18, color: 0x0d4a58, alpha: 0.68 },
    { y: 0.42, color: 0x0a3446, alpha: 0.64 },
    { y: 0.7, color: 0x07293a, alpha: 0.72 },
  ];
  for (let index = 0; index < depthBands.length; index += 1) {
    const band = depthBands[index];
    const next = depthBands[index + 1]?.y ?? 1;
    graphics.beginFill(band.color, band.alpha);
    graphics.drawRect(0, band.y * height, width, (next - band.y) * height + 2);
    graphics.endFill();
  }

  for (const port of ports) {
    const shelf = Math.min(width, height) * 0.13;
    graphics.beginFill(0x58c7b7, 0.035);
    graphics.drawEllipse(port.x * width, port.y * height + shelf * 0.12, shelf * 1.18, shelf * 0.36);
    graphics.endFill();
  }

  const windLean = normalizeScreenVector(wind.x, wind.y);
  for (let band = 0; band < 9; band += 1) {
    const normY = (band + 0.58) / 9.8;
    const sample = defaultOceanField.samplePoint({ normX: 0.5, normY, day, time, width, height });
    const currentLean = normalizeScreenVector(sample.current.x, sample.current.y);
    const xDrift = (windLean.x * 18 + currentLean.x * 28) * sample.waveEnergy;
    const y = normY * height + Math.sin(time * 0.52 + band * 1.7) * (4 + sample.roughness * 8);
    const alpha = clamp(0.035 + sample.current.strength * 0.02 + sample.foam * 0.035, 0.035, 0.12);
    const color = sample.roughness > 0.58 ? 0xd9faf1 : 0x8bd8cf;
    graphics.lineStyle(1 + sample.waveEnergy * 0.8, color, alpha);
    graphics.moveTo(-32, y);
    graphics.bezierCurveTo(
      width * 0.28,
      y + windLean.y * 24 - xDrift * 0.18,
      width * 0.68,
      y + currentLean.y * 34 + xDrift * 0.12,
      width + 32,
      y + xDrift * 0.24
    );
  }

  for (let streak = 0; streak < 12; streak += 1) {
    const normX = ((streak * 0.37 + time * 0.018) % 1 + 1) % 1;
    const normY = 0.12 + ((streak * 0.19 + Math.sin(day * 0.13 + streak) * 0.05) % 0.78);
    const sample = defaultOceanField.samplePoint({ normX, normY, day, time: time * 0.8, width, height });
    const length = 28 + sample.current.strength * 28 + sample.wind.strength * 10;
    const angle = Math.atan2(wind.y + sample.current.y * 0.4, wind.x + sample.current.x * 0.4);
    const x = normX * width;
    const y = normY * height;
    graphics.lineStyle(1, 0xeafff8, 0.035 + sample.foam * 0.055);
    graphics.moveTo(x - Math.cos(angle) * length * 0.5, y - Math.sin(angle) * length * 0.5);
    graphics.lineTo(x + Math.cos(angle) * length * 0.5, y + Math.sin(angle) * length * 0.5);
  }
}

function normalizeScreenVector(x: number, y: number) {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function drawStormFronts(graphics: PIXI.Graphics, frame: OceanFieldFrame) {
  const { width, height, time } = frame;
  for (const front of frame.stormFronts) {
    const x = front.x * width;
    const y = front.y * height;
    const radius = Math.max(width, height) * front.radius;
    const pulse = (Math.sin(time * 1.8 + front.intensity * 4) + 1) * 0.5;
    const alpha = 0.05 + front.intensity * 0.08 + pulse * 0.025;

    graphics.beginFill(0x213a43, alpha);
    graphics.drawEllipse(x, y, radius * 1.15, radius * 0.62);
    graphics.endFill();

    for (let ring = 0; ring < 3; ring += 1) {
      const ringScale = 0.52 + ring * 0.24 + pulse * 0.04;
      graphics.lineStyle(1 + front.intensity * 1.2, ring === 0 ? 0xe9faf7 : 0x8fb9bd, 0.08 + front.intensity * 0.08);
      graphics.drawEllipse(x, y, radius * ringScale, radius * ringScale * 0.52);
    }

    graphics.lineStyle(1, 0xf3fffa, 0.07 + front.intensity * 0.08);
    for (let band = -3; band <= 3; band += 1) {
      const offset = band * radius * 0.18 + Math.sin(time * 1.1 + band) * 4;
      graphics.moveTo(x - radius * 0.7, y + offset);
      graphics.lineTo(x + radius * 0.7, y + offset + radius * 0.18);
    }
  }
}

function drawRoutes(graphics: PIXI.Graphics, width: number, height: number, state: GameState, frame: OceanFieldFrame, quality: MapRenderQuality) {
  graphics.clear();
  drawActiveContractRoutes(graphics, width, height, state, frame.time);

  const current = portById(state.currentPort);
  const selected = portById(state.selectedPort);
  const from = state.voyage ? portById(state.voyage.fromId) : current;
  const to = state.voyage ? portById(state.voyage.toId) : selected;
  if (from.id === to.id) return;

  const conditions = routeConditions(state, from.id, to.id);
  const color = state.voyage ? 0xffe08b : conditions.speedDelta >= 0 ? 0xe5ffed : 0xffdac8;
  graphics.lineStyle(state.voyage ? 3 : 2, color, 0.9);
  drawOceanRoutePath(graphics, width, height, frame.day, frame.time, from.id, to.id, color, state.voyage ? 3 : 2, 0.9, 0, quality.routeSegments);
  graphics.lineStyle(1, conditions.seaLabel === "heavy swell" ? 0xc8503e : 0x1c5364, 0.36);
  drawOceanRoutePath(
    graphics,
    width,
    height,
    frame.day,
    frame.time,
    from.id,
    to.id,
    conditions.seaLabel === "heavy swell" ? 0xc8503e : 0x1c5364,
    1,
    0.36,
    2,
    Math.max(8, Math.floor(quality.routeSegments * 0.72))
  );
}

function drawOceanRoutePath(
  graphics: PIXI.Graphics,
  width: number,
  height: number,
  day: number,
  time: number,
  fromId: string,
  toId: string,
  color: number,
  lineWidth: number,
  alpha: number,
  normalOffset = 0,
  segments = 26
) {
  graphics.lineStyle(lineWidth, color, alpha);
  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments;
    const point = oceanRouteDisplayPoint(width, height, day, time, fromId, toId, progress, normalOffset);
    if (index === 0) graphics.moveTo(point.x, point.y);
    else graphics.lineTo(point.x, point.y);
  }
}

function drawActiveContractRoutes(graphics: PIXI.Graphics, width: number, height: number, state: GameState, time: number) {
  const contracts = getActiveContracts(state);
  for (let index = 0; index < contracts.length; index += 1) {
    const contract = contracts[index];
    const from = portById(contract.originPortId);
    const to = portById(contract.destinationPortId);
    const startX = from.x * width;
    const startY = from.y * height;
    const endX = to.x * width;
    const endY = to.y * height;
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);
    if (length <= 1) continue;

    const laneOffset = (index - (contracts.length - 1) / 2) * 7;
    const normalX = -dy / length;
    const normalY = dx / length;
    const x1 = startX + normalX * laneOffset;
    const y1 = startY + normalY * laneOffset;
    const x2 = endX + normalX * laneOffset;
    const y2 = endY + normalY * laneOffset;
    const urgency = contractUrgency(state, contract);
    const color = contractColor(urgency);
    const pulse = (Math.sin(time * 4 + index) + 1) * 0.5;

    graphics.lineStyle(4, 0x102421, 0.24);
    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);
    graphics.lineStyle(urgency === "urgent" ? 2.6 : 2.1, color, 0.54 + pulse * 0.22);
    drawDashedLine(graphics, x1, y1, x2, y2, 10, 8, time * 22 + index * 5);
    drawArrowHead(graphics, x1, y1, x2, y2, color, 0.55 + pulse * 0.24);

    graphics.beginFill(color, 0.12 + pulse * 0.1);
    graphics.drawCircle(x2, y2, urgency === "ready" ? 16 : 11 + pulse * 4);
    graphics.endFill();
  }
}

function drawDashedLine(
  graphics: PIXI.Graphics,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  dash: number,
  gap: number,
  phase: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const unitX = dx / length;
  const unitY = dy / length;
  const stride = dash + gap;
  let distance = -(((phase % stride) + stride) % stride);
  while (distance < length) {
    const start = Math.max(0, distance);
    const end = Math.min(length, distance + dash);
    if (end > 0) {
      graphics.moveTo(x1 + unitX * start, y1 + unitY * start);
      graphics.lineTo(x1 + unitX * end, y1 + unitY * end);
    }
    distance += stride;
  }
}

function drawArrowHead(graphics: PIXI.Graphics, x1: number, y1: number, x2: number, y2: number, color: number, alpha: number) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const tipX = x2;
  const tipY = y2;
  const size = 10;
  graphics.beginFill(color, alpha);
  graphics.moveTo(tipX, tipY);
  graphics.lineTo(tipX - Math.cos(angle - 0.42) * size, tipY - Math.sin(angle - 0.42) * size);
  graphics.lineTo(tipX - Math.cos(angle + 0.42) * size, tipY - Math.sin(angle + 0.42) * size);
  graphics.closePath();
  graphics.endFill();
}

function drawPorts(
  portSprites: Map<string, PortSpriteItem>,
  width: number,
  height: number,
  state: GameState,
  time: number,
  hoveredPortId: string | null
) {
  const contracts = getActiveContracts(state);
  for (const port of ports) {
    const item = portSprites.get(port.id);
    if (!item) continue;
    const current = port.id === state.currentPort;
    const selected = port.id === state.selectedPort;
    const hovered = port.id === hoveredPortId;
    const pressure = contracts.find((contract) => contract.destinationPortId === port.id);
    const spec = portSpriteSpecFor(port.id);
    const x = port.x * width;
    const y = port.y * height;
    const base = Math.min(width, height);
    const visual = portSpriteVisualFor(base, port.id, { current, hovered, selected });
    const spriteWidth = visual.width;
    item.container.position.set(x, y);
    item.marker.clear();
    item.marker.lineStyle(visual.outlineWidth, visual.markerColor, visual.markerAlpha);
    item.marker.drawEllipse(0, spriteWidth * spec.markerOffset, spriteWidth * 0.58, spriteWidth * 0.18);
    if (pressure) {
      const urgency = contractUrgency(state, pressure);
      const pulse = 2 + (Math.sin(time * 4.6) + 1) * 2;
      item.marker.lineStyle(urgency === "urgent" ? 3 : 2, contractColor(urgency), 0.72);
      item.marker.drawEllipse(0, spriteWidth * spec.markerOffset, spriteWidth * 0.7 + pulse, spriteWidth * 0.23 + pulse * 0.24);
    }
    if (item.sprite) {
      item.sprite.anchor.set(spec.anchorX, spec.anchorY);
      item.sprite.width = spriteWidth;
      item.sprite.scale.y = item.sprite.scale.x;
      item.sprite.tint = visual.tint;
      item.sprite.alpha = visual.alpha;
    } else {
      item.marker.beginFill(selected ? 0xd6a43a : current ? 0x4fa36c : 0xfffaf0, 1);
      item.marker.drawCircle(0, 0, selected ? 12 : 10);
      item.marker.endFill();
    }
    item.label.position.set(0, spriteWidth * spec.labelOffset);
    item.label.alpha = selected || current || hovered ? 1 : 0.86;
    item.container.cursor = hovered ? "pointer" : "default";
  }
}

function contractColor(urgency: ReturnType<typeof contractUrgency>) {
  if (urgency === "ready") return 0x4fa36c;
  if (urgency === "urgent") return 0xc8503e;
  if (urgency === "due-soon") return 0xd6a43a;
  return 0xe9faf7;
}

function drawShip(
  host: HTMLDivElement | null,
  shipWake: PIXI.Graphics,
  ship: PIXI.Sprite,
  width: number,
  height: number,
  state: GameState,
  frame: OceanFieldFrame,
  quality: MapRenderQuality
) {
  let x: number;
  let y: number;
  let angle = -Math.PI / 2;
  const underway = Boolean(state.voyage);
  const time = frame.time;
  if (state.voyage) {
    const progress = clamp(state.voyage.progress, 0, 1);
    const current = oceanRouteDisplayPoint(width, height, frame.day, time, state.voyage.fromId, state.voyage.toId, progress);
    const next = oceanRouteDisplayPoint(width, height, frame.day, time, state.voyage.fromId, state.voyage.toId, clamp(progress + 0.018, 0, 1));
    const previous = oceanRouteDisplayPoint(width, height, frame.day, time, state.voyage.fromId, state.voyage.toId, clamp(progress - 0.018, 0, 1));
    x = current.x;
    y = current.y;
    angle = Math.atan2(next.y - previous.y, next.x - previous.x);
  } else {
    const port = portById(state.currentPort);
    x = port.x * width;
    y = port.y * height - shipDockOffset(Math.min(width, height), state.currentShip);
  }

  const base = Math.min(width, height);
  const activeShip = shipById(state.currentShip);
  const cargoLoad = clamp(cargoUnits(state) / Math.max(1, activeShip.cargoCap), 0, 1);
  const activeAsset = activeShip.asset ?? assetUrls.ship;
  const shipSpec = shipSpriteSpecFor(activeShip.id);
  if (ship.name !== state.currentShip) {
    ship.texture = PIXI.Texture.from(activeAsset);
    ship.anchor.set(shipSpec.anchorX, shipSpec.anchorY);
    ship.name = state.currentShip;
  }
  const shipWidth = shipSpriteWidth(base, activeShip.id);
  const normal = { x: -Math.sin(angle), y: Math.cos(angle) };
  const sampleNormX = clamp(x / width, 0, 1);
  const sampleNormY = clamp(y / height, 0, 1);
  const motion = defaultOceanField.sampleShipMotion({
    normX: sampleNormX,
    normY: sampleNormY,
    day: frame.day,
    time: frame.time,
    heading: angle,
    shipId: activeShip.id,
    cargoLoad,
  });
  const waterAtShip = defaultOceanField.samplePoint({ normX: sampleNormX, normY: sampleNormY, day: frame.day, time: frame.time, width, height });
  const response = rendererShipResponse(motion, waterAtShip, angle);
  const routeMotion =
    underway && state.voyage
      ? rendererRouteMotion(width, height, frame.day, frame.time, state.voyage.fromId, state.voyage.toId)
      : state.currentPort !== state.selectedPort
        ? rendererRouteMotion(width, height, frame.day, frame.time, state.currentPort, state.selectedPort)
        : null;
  updateShipResponseAttributes(host, response, routeMotion);

  const seaLift = 1 + response.waveEnergy * 0.5 + response.stormIntensity * 0.34;
  const currentPush = clamp(Math.abs(routeMotion?.currentAssist ?? 0), 0, 0.8);
  const swayAmplitude = underway ? 2.4 + response.waveEnergy * 3.8 + response.stormIntensity * 2.8 + currentPush * 2 : 0.6 + response.waveEnergy * 0.9;
  const sway = Math.sin(time * (underway ? 2.15 : 1.15) + (state.voyage?.progress ?? 0) * tau * 2) * swayAmplitude;
  const driftScale = underway ? 3.4 + response.waveEnergy * 1.3 + response.stormIntensity * 1.2 : 1.2;
  x += normal.x * sway + motion.driftX * driftScale;
  y += normal.y * sway + motion.bob * (underway ? seaLift : 0.45 + response.waveEnergy * 0.2) + motion.driftY * driftScale;
  const roll = clamp(motion.roll * (underway ? 1.15 + response.stormIntensity * 0.42 : 0.5), -0.26, 0.26);
  const yaw = clamp(motion.yaw * (underway ? 1.2 + response.waveEnergy * 0.45 + currentPush * 0.2 : 0.38), -0.21, 0.21);

  shipWake.clear();
  if (underway) {
    const wakeAngle = motion.wakeAngle;
    const wakeForward = { x: Math.cos(wakeAngle), y: Math.sin(wakeAngle) };
    const wakeNormal = { x: -Math.sin(wakeAngle), y: Math.cos(wakeAngle) };
    const wakeFoam = clamp(0.15 + response.foam * 0.18 + response.stormIntensity * 0.1 + currentPush * 0.04 + response.wakeTurbulence * 0.04, 0.16, 0.48);
    shipWake.lineStyle(1.1 + response.foam * 0.55 + response.wakeTurbulence * 0.26, 0xf3fffa, wakeFoam);
    for (const side of [-1, 1]) {
      for (let line = 0; line < quality.wakeLines; line += 1) {
        const spread =
          shipWidth *
          shipSpec.wakeScale *
          response.wakeSpread *
          (0.15 + line * 0.1) *
          (1 + response.foam * 0.26 + response.stormIntensity * 0.18);
        const reach =
          shipWidth *
          shipSpec.wakeScale *
          response.wakeLength *
          (0.72 + line * 0.3) *
          (1 + response.driftStrength * 0.08 + response.waveEnergy * 0.12);
        const pulse = Math.sin(time * (4.2 + response.waveEnergy + response.wakeTurbulence * 0.4) + line * 1.7 + side) * (2 + response.foam * 2.8) * response.wakePersistence;
        shipWake.moveTo(
          x - wakeForward.x * shipWidth * 0.24 + wakeNormal.x * side * 2,
          y - wakeForward.y * shipWidth * 0.24 + wakeNormal.y * side * 2
        );
        shipWake.bezierCurveTo(
          x - wakeForward.x * reach * 0.42 + wakeNormal.x * side * (spread + pulse),
          y - wakeForward.y * reach * 0.42 + wakeNormal.y * side * (spread + pulse),
          x - wakeForward.x * reach * 0.78 + wakeNormal.x * side * spread * 0.82,
          y - wakeForward.y * reach * 0.78 + wakeNormal.y * side * spread * 0.82,
          x - wakeForward.x * reach + wakeNormal.x * side * spread * 0.52,
          y - wakeForward.y * reach + wakeNormal.y * side * spread * 0.52
        );
      }
    }
  }

  ship.position.set(x, y);
  ship.anchor.set(shipSpec.anchorX, shipSpec.anchorY);
  ship.width = shipWidth;
  ship.scale.y = ship.scale.x * (1 + clamp((motion.bob * seaLift) / 190, -0.048, 0.052));
  ship.skew.set(roll * 0.42, 0);
  ship.rotation = underway ? angle + Math.PI / 2 + yaw : yaw * 0.3;
}

function updateShipResponseAttributes(
  host: HTMLDivElement | null,
  response: RendererShipResponse,
  routeMotion: RendererRouteMotion | null
) {
  if (!host) return;
  host.dataset.shipMotion = "ocean-response-v3";
  host.dataset.shipResponse = [
    Math.abs(response.bob).toFixed(2),
    response.roll.toFixed(3),
    response.yaw.toFixed(3),
    response.driftStrength.toFixed(3),
    response.wakeDeflection.toFixed(3),
    response.waveEnergy.toFixed(3),
    response.foam.toFixed(3),
    response.stormIntensity.toFixed(3),
    (routeMotion?.curvature ?? 0).toFixed(3),
    (routeMotion?.currentAssist ?? 0).toFixed(3),
    response.wakeLength.toFixed(3),
    response.wakeSpread.toFixed(3),
    response.wakeTurbulence.toFixed(3),
    response.hullResponse.toFixed(3),
  ].join(",");
}

function rendererShipResponse(
  motion: {
    bob: number;
    driftX: number;
    driftY: number;
    foam: number;
    hullResponse: number;
    roll: number;
    wakeAngle: number;
    wakeLength: number;
    wakePersistence: number;
    wakeSpread: number;
    wakeTurbulence: number;
    yaw: number;
  },
  water: { foam: number; stormIntensity: number; waveEnergy: number },
  heading: number
): RendererShipResponse {
  return {
    bob: motion.bob,
    driftStrength: Math.hypot(motion.driftX, motion.driftY),
    foam: Math.max(motion.foam, water.foam),
    hullResponse: motion.hullResponse,
    roll: motion.roll,
    stormIntensity: water.stormIntensity,
    wakeDeflection: Math.abs(Math.atan2(Math.sin(motion.wakeAngle - heading), Math.cos(motion.wakeAngle - heading))),
    wakeLength: motion.wakeLength,
    wakePersistence: motion.wakePersistence,
    wakeSpread: motion.wakeSpread,
    wakeTurbulence: motion.wakeTurbulence,
    waveEnergy: water.waveEnergy,
    yaw: motion.yaw,
  };
}

function rendererRouteMotion(width: number, height: number, day: number, time: number, fromId: string, toId: string): RendererRouteMotion {
  const point = oceanRouteDisplayPoint(width, height, day, time, fromId, toId, 0.5);
  const route = defaultOceanField.sampleRoute({ day, fromId, toId, samples: 6 });
  return {
    curvature: clamp(Math.abs(point.bend) / Math.max(1, Math.min(width, height)), 0, 1),
    currentAssist: route.currentScore,
  };
}
