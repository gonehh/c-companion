import { useMemo } from "react";
import { useAuth, type ThemeId } from "@/lib/auth";

export type ThemePalette = {
  id: ThemeId;
  label: string;
  colors: {
    background: string;
    foreground: string;
    card: string;
    muted: string;
    mutedForeground: string;
    primary: string;
    primaryForeground: string;
    border: string;
    accent: string;
    destructive: string;
  };
};

const THEMES: Record<ThemeId, ThemePalette> = {
  midnight: {
    id: "midnight",
    label: "Midnight",
    colors: {
      background: "#1a1422",
      foreground: "#f0ecf2",
      card: "#241b2f",
      muted: "#2a2138",
      mutedForeground: "#a89fb5",
      primary: "#a173e8",
      primaryForeground: "#fafafa",
      border: "#3a2f4a",
      accent: "#7a4ad0",
      destructive: "#e0524a",
    },
  },
  black: {
    id: "black",
    label: "Black",
    colors: {
      background: "#0b0b10",
      foreground: "#f0ecf2",
      card: "#14141c",
      muted: "#1b1b26",
      mutedForeground: "#a0a0ad",
      primary: "#a173e8",
      primaryForeground: "#fafafa",
      border: "#2a2a3a",
      accent: "#7a4ad0",
      destructive: "#e0524a",
    },
  },
  charcoal: {
    id: "charcoal",
    label: "Charcoal",
    colors: {
      background: "#14151c",
      foreground: "#f0ecf2",
      card: "#1e202b",
      muted: "#232636",
      mutedForeground: "#a6a8b5",
      primary: "#a173e8",
      primaryForeground: "#fafafa",
      border: "#34384e",
      accent: "#7a4ad0",
      destructive: "#e0524a",
    },
  },
};

export function useTheme() {
  const { stats, setTheme } = useAuth();
  const themeId: ThemeId = stats?.theme ?? "midnight";
  const theme = useMemo(() => THEMES[themeId], [themeId]);
  return { theme, themeId, setTheme };
}

