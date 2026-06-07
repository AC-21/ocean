import type { CaptainSkillId, GameState } from "./types";

export const captainSkillMasteryLevel = 3;

export type CaptainSkillMastery = {
  id: `${CaptainSkillId}_mastery`;
  skillId: CaptainSkillId;
  label: string;
  detail: string;
  liveEffect: string;
};

export const captainSkillMasteries: Record<CaptainSkillId, CaptainSkillMastery> = {
  navigation: {
    id: "navigation_mastery",
    skillId: "navigation",
    label: "Tradewind Plotter",
    detail: "Reads current sets before they become delay risk.",
    liveEffect: "Better current assist, lower route delay, and cleaner route-risk reads.",
  },
  seamanship: {
    id: "seamanship_mastery",
    skillId: "seamanship",
    label: "Storm Hand",
    detail: "Turns hard-water judgment into steadier recoveries.",
    liveEffect: "Sea encounters hit hull and crew morale less hard; skilled water reads are safer.",
  },
  brokerage: {
    id: "brokerage_mastery",
    skillId: "brokerage",
    label: "Market Maker",
    detail: "Turns paid intelligence into stronger, longer market edges.",
    liveEffect: "Broker packets cost less, last longer, and move stock harder.",
  },
  gunnery: {
    id: "gunnery_mastery",
    skillId: "gunnery",
    label: "Gun Drill Captain",
    detail: "Makes warning shots and battle stations feel practiced.",
    liveEffect: "Pirate fight and warn-off reads improve; battle damage is softened.",
  },
};

export function captainSkillMasteryFor(skillId: CaptainSkillId) {
  return captainSkillMasteries[skillId];
}

export function hasCaptainSkillMastery(state: Pick<GameState, "captainSkills">, skillId: CaptainSkillId) {
  return (state.captainSkills?.[skillId] ?? 0) >= captainSkillMasteryLevel;
}

export function captainSkillProgressLabel(state: Pick<GameState, "captainSkills">, skillId: CaptainSkillId) {
  const mastery = captainSkillMasteryFor(skillId);
  const level = state.captainSkills?.[skillId] ?? 0;
  if (level >= captainSkillMasteryLevel) return `${mastery.label} active`;
  return `${captainSkillMasteryLevel - level} level${captainSkillMasteryLevel - level === 1 ? "" : "s"} to ${mastery.label}`;
}
