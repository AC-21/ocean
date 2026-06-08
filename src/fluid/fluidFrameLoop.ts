export type FluidFrameLoopConfig = {
  fixedStepS: number;
  maxAccumulatedS: number;
  maxSubstepsPerFrame: number;
  maxWallDeltaS: number;
  snapshotIntervalMs: number;
};

export type FluidFrameLoopState = {
  accumulatedSimS: number;
  droppedDebtS: number;
  frameCount: number;
  lastFrameMs: number;
  maxSubstepsObserved: number;
  totalSubsteps: number;
};

export type FluidFrameStepPlan = {
  accumulatedSimS: number;
  droppedDebtS: number;
  interpolationAlpha: number;
  limitedWallDeltaS: number;
  rawWallDeltaS: number;
  shouldStep: boolean;
  stepDtS: number;
  substeps: number;
  simulatedS: number;
};

export type FluidFrameLoopStats = {
  accumulatedSimS: number;
  droppedDebtS: number;
  fixedStepS: number;
  frameCount: number;
  interpolationAlpha: number;
  lastSubsteps: number;
  maxAccumulatedS: number;
  maxSubstepsObserved: number;
  maxSubstepsPerFrame: number;
  simulatedS: number;
  snapshotIntervalMs: number;
  totalSubsteps: number;
};

export const defaultFluidFrameLoopConfig: FluidFrameLoopConfig = {
  fixedStepS: 1 / 120,
  maxAccumulatedS: 0.25,
  maxSubstepsPerFrame: 24,
  maxWallDeltaS: 0.1,
  snapshotIntervalMs: 80,
};

export function createFluidFrameLoopState(nowMs = 0): FluidFrameLoopState {
  return {
    accumulatedSimS: 0,
    droppedDebtS: 0,
    frameCount: 0,
    lastFrameMs: nowMs,
    maxSubstepsObserved: 0,
    totalSubsteps: 0,
  };
}

export function planFluidFrameStep(
  state: FluidFrameLoopState,
  nowMs: number,
  options: {
    active: boolean;
    config?: FluidFrameLoopConfig;
    timeScale: number;
  }
): FluidFrameStepPlan {
  const config = options.config ?? defaultFluidFrameLoopConfig;
  const rawWallDeltaS = Math.max(0, (nowMs - state.lastFrameMs) / 1000);
  const limitedWallDeltaS = Math.min(rawWallDeltaS, config.maxWallDeltaS);
  state.lastFrameMs = nowMs;
  state.frameCount += 1;

  if (!options.active) {
    state.accumulatedSimS = 0;
    return statsPlan(config, rawWallDeltaS, limitedWallDeltaS, 0, 0, state.accumulatedSimS, state.droppedDebtS);
  }

  const scaledDeltaS = limitedWallDeltaS * Math.max(0, options.timeScale);
  const requestedAccumulatedS = state.accumulatedSimS + scaledDeltaS;
  const clampedAccumulatedS = Math.min(requestedAccumulatedS, config.maxAccumulatedS);
  const droppedForClampS = Math.max(0, requestedAccumulatedS - clampedAccumulatedS);
  const possibleSubsteps = Math.floor(clampedAccumulatedS / config.fixedStepS);
  const substeps = Math.min(config.maxSubstepsPerFrame, possibleSubsteps);
  const simulatedS = substeps * config.fixedStepS;
  state.accumulatedSimS = clampedAccumulatedS - simulatedS;
  state.droppedDebtS += droppedForClampS;
  state.totalSubsteps += substeps;
  state.maxSubstepsObserved = Math.max(state.maxSubstepsObserved, substeps);

  return statsPlan(config, rawWallDeltaS, limitedWallDeltaS, substeps, simulatedS, state.accumulatedSimS, state.droppedDebtS);
}

export function frameLoopStats(state: FluidFrameLoopState, plan: FluidFrameStepPlan, config: FluidFrameLoopConfig = defaultFluidFrameLoopConfig): FluidFrameLoopStats {
  return {
    accumulatedSimS: plan.accumulatedSimS,
    droppedDebtS: plan.droppedDebtS,
    fixedStepS: config.fixedStepS,
    frameCount: state.frameCount,
    interpolationAlpha: plan.interpolationAlpha,
    lastSubsteps: plan.substeps,
    maxAccumulatedS: config.maxAccumulatedS,
    maxSubstepsObserved: state.maxSubstepsObserved,
    maxSubstepsPerFrame: config.maxSubstepsPerFrame,
    simulatedS: plan.simulatedS,
    snapshotIntervalMs: config.snapshotIntervalMs,
    totalSubsteps: state.totalSubsteps,
  };
}

function statsPlan(
  config: FluidFrameLoopConfig,
  rawWallDeltaS: number,
  limitedWallDeltaS: number,
  substeps: number,
  simulatedS: number,
  accumulatedSimS: number,
  droppedDebtS: number
): FluidFrameStepPlan {
  return {
    accumulatedSimS,
    droppedDebtS,
    interpolationAlpha: config.fixedStepS > 0 ? Math.min(1, Math.max(0, accumulatedSimS / config.fixedStepS)) : 0,
    limitedWallDeltaS,
    rawWallDeltaS,
    shouldStep: substeps > 0,
    stepDtS: config.fixedStepS,
    substeps,
    simulatedS,
  };
}
