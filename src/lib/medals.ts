export type MedalTier = "bronze" | "silver" | "gold" | "diamond" | "obsidian";

export const TIER_ORDER: MedalTier[] = ["bronze", "silver", "gold", "diamond", "obsidian"];

export const TIER_LABEL: Record<MedalTier, string> = {
  bronze: "Brąz",
  silver: "Srebro",
  gold: "Złoto",
  diamond: "Diament",
  obsidian: "Obsydian",
};

export const TIER_COLOR: Record<MedalTier, string> = {
  bronze: "linear-gradient(135deg, #b87333, #f0c98a)",
  silver: "linear-gradient(135deg, #9aa0a6, #e6e9ee)",
  gold: "linear-gradient(135deg, #c9a227, #fde68a)",
  diamond: "linear-gradient(135deg, #7bd3f7, #d6f3ff)",
  obsidian: "linear-gradient(135deg, #1a1a1f, #4a3a6b)",
};

/** Zwraca listę zdobytych medali na podstawie liczby ukończonych poziomów (po 100 = kolejny medal). */
export function medalsEarned(levelsCompleted: number) {
  const count = Math.min(Math.floor(levelsCompleted / 100), TIER_ORDER.length);
  return TIER_ORDER.slice(0, count).map((tier, i) => ({
    tier,
    label: TIER_LABEL[tier],
    earnedAtLevels: (i + 1) * 100,
  }));
}
