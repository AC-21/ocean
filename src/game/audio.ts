import type { FeedbackAudioCue, FeedbackPriority } from "./feedback";

export type AudioPreferenceStorage = Pick<Storage, "getItem" | "setItem">;
export type AudioPreferences = {
  muted: boolean;
  volume: number;
};
export type AudioScene = "harbor" | "open-water" | "encounter" | "silent";
export type AudioCueFamily = "coins" | "bell" | "crew" | "authority" | "damage" | "water" | "market" | "threat" | "progress";
export type AudioCueStep = {
  at: number;
  duration: number;
  endFrequency?: number;
  frequency: number;
  gain?: number;
  wave?: OscillatorType;
};
export type AudioNoiseStep = {
  at: number;
  duration: number;
  filter: BiquadFilterType;
  frequency: number;
  gain: number;
};
export type AudioCueSpec = {
  attack: number;
  family: AudioCueFamily;
  gain: number;
  label: string;
  noise?: AudioNoiseStep;
  release: number;
  steps: AudioCueStep[];
  wave: OscillatorType;
};

export const audioPreferenceKey = "harborline.audio.v1";
export const defaultAudioPreferences: AudioPreferences = {
  muted: false,
  volume: 0.42,
};

export const audioCueSpecs: Record<FeedbackAudioCue, AudioCueSpec> = {
  "coin-profit": {
    attack: 0.008,
    family: "coins",
    gain: 0.34,
    label: "Profit chime",
    release: 0.05,
    steps: [
      { at: 0, duration: 0.07, frequency: 740, wave: "triangle" },
      { at: 0.06, duration: 0.08, frequency: 990, gain: 0.82, wave: "triangle" },
      { at: 0.13, duration: 0.12, frequency: 1320, gain: 0.58, wave: "sine" },
    ],
    wave: "triangle",
  },
  "coin-loss": {
    attack: 0.012,
    family: "coins",
    gain: 0.28,
    label: "Loss drop",
    release: 0.08,
    steps: [
      { at: 0, duration: 0.11, endFrequency: 330, frequency: 470, wave: "triangle" },
      { at: 0.1, duration: 0.14, endFrequency: 220, frequency: 330, gain: 0.74, wave: "sine" },
    ],
    wave: "triangle",
  },
  "contract-paid": {
    attack: 0.008,
    family: "bell",
    gain: 0.32,
    label: "Contract bell",
    release: 0.06,
    steps: [
      { at: 0, duration: 0.09, frequency: 523, wave: "sine" },
      { at: 0.07, duration: 0.09, frequency: 659, gain: 0.9, wave: "sine" },
      { at: 0.15, duration: 0.16, frequency: 784, gain: 0.65, wave: "triangle" },
    ],
    wave: "sine",
  },
  "crew-change": {
    attack: 0.012,
    family: "crew",
    gain: 0.27,
    label: "Crew call",
    release: 0.07,
    steps: [
      { at: 0, duration: 0.1, frequency: 392, wave: "triangle" },
      { at: 0.09, duration: 0.13, frequency: 494, gain: 0.78, wave: "sine" },
    ],
    wave: "triangle",
  },
  "customs-hail": {
    attack: 0.006,
    family: "authority",
    gain: 0.25,
    label: "Customs hail",
    release: 0.05,
    steps: [
      { at: 0, duration: 0.12, frequency: 196, wave: "square" },
      { at: 0.15, duration: 0.12, frequency: 262, gain: 0.82, wave: "square" },
    ],
    wave: "square",
  },
  "game-over": {
    attack: 0.018,
    family: "progress",
    gain: 0.26,
    label: "Ledger close",
    noise: { at: 0, duration: 0.45, filter: "lowpass", frequency: 520, gain: 0.1 },
    release: 0.16,
    steps: [
      { at: 0, duration: 0.22, endFrequency: 294, frequency: 440, wave: "sine" },
      { at: 0.18, duration: 0.28, endFrequency: 196, frequency: 294, gain: 0.78, wave: "triangle" },
      { at: 0.42, duration: 0.34, frequency: 247, gain: 0.46, wave: "sine" },
    ],
    wave: "sine",
  },
  "hull-hit": {
    attack: 0.003,
    family: "damage",
    gain: 0.34,
    label: "Hull hit",
    noise: { at: 0, duration: 0.22, filter: "bandpass", frequency: 180, gain: 0.34 },
    release: 0.08,
    steps: [{ at: 0, duration: 0.18, endFrequency: 68, frequency: 118, gain: 0.9, wave: "sawtooth" }],
    wave: "sawtooth",
  },
  "insurance-claim": {
    attack: 0.01,
    family: "bell",
    gain: 0.26,
    label: "Policy stamp",
    release: 0.05,
    steps: [
      { at: 0, duration: 0.08, frequency: 587, wave: "triangle" },
      { at: 0.09, duration: 0.12, frequency: 740, gain: 0.72, wave: "sine" },
    ],
    wave: "triangle",
  },
  "market-shift": {
    attack: 0.018,
    family: "market",
    gain: 0.18,
    label: "Market tick",
    release: 0.07,
    steps: [
      { at: 0, duration: 0.1, frequency: 330, wave: "triangle" },
      { at: 0.08, duration: 0.12, endFrequency: 370, frequency: 350, gain: 0.58, wave: "sine" },
    ],
    wave: "triangle",
  },
  "pirate-contact": {
    attack: 0.005,
    family: "threat",
    gain: 0.3,
    label: "Pirate drum",
    noise: { at: 0.04, duration: 0.26, filter: "bandpass", frequency: 260, gain: 0.18 },
    release: 0.06,
    steps: [
      { at: 0, duration: 0.08, frequency: 147, wave: "square" },
      { at: 0.11, duration: 0.1, frequency: 185, gain: 0.74, wave: "square" },
      { at: 0.24, duration: 0.12, frequency: 220, gain: 0.58, wave: "sawtooth" },
    ],
    wave: "square",
  },
  "rank-up": {
    attack: 0.01,
    family: "progress",
    gain: 0.3,
    label: "Rank rise",
    release: 0.06,
    steps: [
      { at: 0, duration: 0.08, frequency: 523, wave: "triangle" },
      { at: 0.07, duration: 0.08, frequency: 659, gain: 0.86, wave: "triangle" },
      { at: 0.14, duration: 0.16, frequency: 880, gain: 0.66, wave: "sine" },
    ],
    wave: "triangle",
  },
  "route-commit": {
    attack: 0.016,
    family: "water",
    gain: 0.16,
    label: "Route set",
    release: 0.08,
    steps: [
      { at: 0, duration: 0.13, frequency: 294, wave: "sine" },
      { at: 0.1, duration: 0.16, frequency: 392, gain: 0.64, wave: "triangle" },
    ],
    wave: "sine",
  },
  "save-confirm": {
    attack: 0.008,
    family: "bell",
    gain: 0.2,
    label: "Save tick",
    release: 0.05,
    steps: [
      { at: 0, duration: 0.06, frequency: 659, wave: "sine" },
      { at: 0.06, duration: 0.09, frequency: 784, gain: 0.62, wave: "sine" },
    ],
    wave: "sine",
  },
  "storm-warning": {
    attack: 0.02,
    family: "water",
    gain: 0.28,
    label: "Storm warning",
    noise: { at: 0, duration: 0.55, filter: "lowpass", frequency: 680, gain: 0.28 },
    release: 0.12,
    steps: [
      { at: 0, duration: 0.28, endFrequency: 110, frequency: 146, gain: 0.72, wave: "sawtooth" },
      { at: 0.24, duration: 0.24, endFrequency: 92, frequency: 130, gain: 0.48, wave: "sine" },
    ],
    wave: "sawtooth",
  },
  "upgrade-installed": {
    attack: 0.008,
    family: "progress",
    gain: 0.31,
    label: "Refit lock",
    release: 0.06,
    steps: [
      { at: 0, duration: 0.07, frequency: 440, wave: "triangle" },
      { at: 0.06, duration: 0.08, frequency: 660, gain: 0.86, wave: "triangle" },
      { at: 0.14, duration: 0.13, frequency: 990, gain: 0.56, wave: "sine" },
    ],
    wave: "triangle",
  },
};

export const audioSceneSpecs: Record<AudioScene, { filterFrequency: number; gain: number; label: string }> = {
  harbor: { filterFrequency: 760, gain: 0.035, label: "Harbor" },
  "open-water": { filterFrequency: 1180, gain: 0.052, label: "Open Water" },
  encounter: { filterFrequency: 920, gain: 0.044, label: "Pressure" },
  silent: { filterFrequency: 440, gain: 0, label: "Silent" },
};

export function normalizeAudioPreferences(value: Partial<AudioPreferences> | null | undefined): AudioPreferences {
  const volume = Number(value?.volume);
  return {
    muted: Boolean(value?.muted),
    volume: Number.isFinite(volume) ? clamp(volume, 0, 1) : defaultAudioPreferences.volume,
  };
}

export function readAudioPreferences(storage = activeAudioPreferenceStorage()): AudioPreferences {
  if (!storage) return defaultAudioPreferences;
  try {
    const raw = storage.getItem(audioPreferenceKey);
    if (!raw) return defaultAudioPreferences;
    return normalizeAudioPreferences(JSON.parse(raw));
  } catch {
    return defaultAudioPreferences;
  }
}

export function writeAudioPreferences(preferences: AudioPreferences, storage = activeAudioPreferenceStorage()) {
  if (!storage) return;
  storage.setItem(audioPreferenceKey, JSON.stringify(normalizeAudioPreferences(preferences)));
}

export function audioVolumePercent(preferences: AudioPreferences) {
  return Math.round(normalizeAudioPreferences(preferences).volume * 100);
}

export function audioCueLabel(cue: FeedbackAudioCue) {
  return audioCueSpecs[cue]?.label ?? cue;
}

export function audioStatusLabel(preferences: AudioPreferences, scene: AudioScene, cue: FeedbackAudioCue) {
  const normalized = normalizeAudioPreferences(preferences);
  const level = normalized.muted ? "Muted" : `${audioVolumePercent(normalized)}%`;
  return `${level} | ${audioSceneSpecs[scene].label} | ${audioCueLabel(cue)}`;
}

export type HarborlineAudioEngine = {
  currentScene: () => AudioScene;
  playCue: (cue: FeedbackAudioCue, priority?: FeedbackPriority) => void;
  prime: () => Promise<boolean>;
  setPreferences: (preferences: AudioPreferences) => void;
  setScene: (scene: AudioScene) => void;
  stop: () => void;
  supported: () => boolean;
};

export function createHarborlineAudioEngine(initialPreferences: AudioPreferences = defaultAudioPreferences): HarborlineAudioEngine {
  let context: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let ambienceGain: GainNode | null = null;
  let ambienceFilter: BiquadFilterNode | null = null;
  let ambienceSource: AudioBufferSourceNode | null = null;
  let preferences = normalizeAudioPreferences(initialPreferences);
  let scene: AudioScene = "harbor";

  const ensureContext = () => {
    if (typeof window === "undefined") return null;
    if (context?.state === "closed") return null;
    if (context && masterGain) return context;
    const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) return null;
    try {
      context = new AudioContextConstructor();
      masterGain = context.createGain();
      masterGain.connect(context.destination);
    } catch {
      context = null;
      masterGain = null;
      return null;
    }
    applyMasterVolume();
    return context;
  };

  const applyMasterVolume = () => {
    if (!context || !masterGain) return;
    const level = preferences.muted ? 0.0001 : Math.max(0.0001, preferences.volume);
    masterGain.gain.setTargetAtTime(level, context.currentTime, 0.025);
  };

  const updateAmbience = () => {
    if (!context || !masterGain) return;
    if (preferences.muted || scene === "silent" || preferences.volume <= 0) {
      stopAmbience();
      return;
    }
    if (!ambienceSource || !ambienceGain || !ambienceFilter) {
      ambienceSource = context.createBufferSource();
      ambienceSource.buffer = ambienceBuffer(context);
      ambienceSource.loop = true;
      ambienceFilter = context.createBiquadFilter();
      ambienceFilter.type = "lowpass";
      ambienceGain = context.createGain();
      ambienceGain.gain.value = 0.0001;
      ambienceSource.connect(ambienceFilter).connect(ambienceGain).connect(masterGain);
      ambienceSource.start();
    }
    const spec = audioSceneSpecs[scene];
    ambienceFilter.frequency.setTargetAtTime(spec.filterFrequency, context.currentTime, 0.08);
    ambienceGain.gain.setTargetAtTime(Math.max(0.0001, spec.gain), context.currentTime, 0.18);
  };

  const stopAmbience = () => {
    if (!ambienceSource) return;
    try {
      ambienceSource.stop();
    } catch {
      // The node may already be stopped; either way the next update rebuilds it.
    }
    ambienceSource.disconnect();
    ambienceGain?.disconnect();
    ambienceFilter?.disconnect();
    ambienceSource = null;
    ambienceGain = null;
    ambienceFilter = null;
  };

  return {
    currentScene: () => scene,
    playCue: (cue, priority = "normal") => {
      if (preferences.muted || preferences.volume <= 0) return;
      const activeContext = ensureContext();
      if (!activeContext || !masterGain) return;
      void activeContext.resume().catch(() => undefined);
      applyMasterVolume();
      const spec = audioCueSpecs[cue];
      const priorityGain = priority === "critical" ? 1.12 : priority === "high" ? 1.04 : priority === "ambient" ? 0.72 : 1;
      for (const step of spec.steps) scheduleTone(activeContext, masterGain, spec, step, priorityGain);
      if (spec.noise) scheduleNoise(activeContext, masterGain, spec.noise, priorityGain);
      updateAmbience();
    },
    prime: async () => {
      const activeContext = ensureContext();
      if (!activeContext) return false;
      try {
        if (activeContext.state === "suspended") await activeContext.resume();
      } catch {
        return false;
      }
      applyMasterVolume();
      updateAmbience();
      return activeContext.state !== "closed";
    },
    setPreferences: (nextPreferences) => {
      preferences = normalizeAudioPreferences(nextPreferences);
      applyMasterVolume();
      updateAmbience();
    },
    setScene: (nextScene) => {
      scene = nextScene;
      updateAmbience();
    },
    stop: () => {
      stopAmbience();
      if (context && context.state !== "closed") void context.close().catch(() => undefined);
      context = null;
      masterGain = null;
    },
    supported: () => {
      if (typeof window === "undefined") return false;
      const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
      return Boolean(window.AudioContext ?? audioWindow.webkitAudioContext);
    },
  };
}

function scheduleTone(context: AudioContext, output: GainNode, spec: AudioCueSpec, step: AudioCueStep, priorityGain: number) {
  const start = context.currentTime + Math.max(0, step.at);
  const duration = Math.max(0.02, step.duration);
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = step.wave ?? spec.wave;
  oscillator.frequency.setValueAtTime(step.frequency, start);
  if (step.endFrequency) {
    oscillator.frequency.linearRampToValueAtTime(step.endFrequency, start + duration);
  }
  const peak = Math.max(0.0001, spec.gain * (step.gain ?? 1) * priorityGain);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peak, start + spec.attack);
  gain.gain.setTargetAtTime(0.0001, start + duration, spec.release);
  oscillator.connect(gain).connect(output);
  oscillator.start(start);
  oscillator.stop(start + duration + spec.release * 3 + 0.04);
}

function scheduleNoise(context: AudioContext, output: GainNode, noise: AudioNoiseStep, priorityGain: number) {
  const start = context.currentTime + Math.max(0, noise.at);
  const duration = Math.max(0.03, noise.duration);
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  source.buffer = oneShotNoiseBuffer(context, duration);
  filter.type = noise.filter;
  filter.frequency.setValueAtTime(noise.frequency, start);
  filter.Q.setValueAtTime(noise.filter === "bandpass" ? 1.8 : 0.7, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(Math.max(0.0001, noise.gain * priorityGain), start + 0.018);
  gain.gain.setTargetAtTime(0.0001, start + duration * 0.72, 0.08);
  source.connect(filter).connect(gain).connect(output);
  source.start(start);
  source.stop(start + duration + 0.08);
}

function oneShotNoiseBuffer(context: AudioContext, seconds: number) {
  const length = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    const decay = 1 - index / data.length;
    data[index] = (Math.random() * 2 - 1) * decay;
  }
  return buffer;
}

function ambienceBuffer(context: AudioContext) {
  const seconds = 2.4;
  const length = Math.floor(context.sampleRate * seconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    const roll = Math.sin((index / data.length) * Math.PI * 2);
    const wash = 0.55 + roll * 0.16;
    data[index] = (Math.random() * 2 - 1) * wash;
  }
  return buffer;
}

function activeAudioPreferenceStorage(): AudioPreferenceStorage | null {
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
    return (globalThis as { localStorage?: AudioPreferenceStorage }).localStorage ?? null;
  }
  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
