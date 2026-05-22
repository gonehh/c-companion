import { createContext, useContext, useMemo } from "react";
import { useWindowDimensions } from "react-native";

export type Breakpoint = "sm" | "md" | "lg";

export type ResponsiveInfo = {
  width: number;
  height: number;
  breakpoint: Breakpoint;
  isSmall: boolean;
  isTabletUp: boolean;
};

const ResponsiveContext = createContext<ResponsiveInfo | null>(null);

export function ResponsiveProvider({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();

  const value = useMemo<ResponsiveInfo>(() => {
    const breakpoint: Breakpoint = width < 640 ? "sm" : width < 1024 ? "md" : "lg";
    return {
      width,
      height,
      breakpoint,
      isSmall: breakpoint === "sm",
      isTabletUp: breakpoint !== "sm",
    };
  }, [width, height]);

  return <ResponsiveContext.Provider value={value}>{children}</ResponsiveContext.Provider>;
}

export function useResponsive() {
  const v = useContext(ResponsiveContext);
  if (!v) throw new Error("useResponsive must be used within ResponsiveProvider");
  return v;
}

export function useScreenLayout() {
  const { breakpoint } = useResponsive();
  const padding = breakpoint === "sm" ? 20 : breakpoint === "md" ? 28 : 36;
  const maxWidth = breakpoint === "sm" ? undefined : breakpoint === "md" ? 760 : 980;
  return { padding, maxWidth };
}
