import { applyThemeToElement } from "@/lib/theme/apply-theme";
import { themeStateAtom } from "@/lib/theme/store";
import { useAtom } from "jotai";
import { useEffect } from "react";

type ThemeProviderProps = {
  children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeState] = useAtom(themeStateAtom);

  useEffect(() => {
    if (!themeState || !themeState.cssVars || !themeState.cssVars.theme) {
      return;
    }

    const root = document.documentElement;
    if (!root) return;

    try {
      applyThemeToElement(themeState, root);
    } catch (error) {
      console.error("Error applying theme:", error);
    }
  }, [themeState]);

  return <>{children}</>;
}
