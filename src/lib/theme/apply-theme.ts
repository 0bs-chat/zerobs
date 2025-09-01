type ThemeMode = "dark" | "light";

type ThemeState = {
  currentMode: ThemeMode;
  cssVars: {
    theme: Record<string, string>;
    light: Record<string, string>;
    dark: Record<string, string>;
  };
};

export function applyThemeToElement(
  themeState: ThemeState,
  element: HTMLElement,
) {
  if (!element || !themeState || !themeState.cssVars) return;

  // Apply base theme variables
  if (themeState.cssVars.theme) {
    Object.entries(themeState.cssVars.theme).forEach(([key, value]) => {
      element.style.setProperty(`--${key}`, value);
    });
  }

  // Apply mode-specific variables
  const modeVars = themeState.cssVars[themeState.currentMode];
  if (modeVars && themeState.cssVars.theme) {
    Object.entries(modeVars).forEach(([key, value]) => {
      if (key in themeState.cssVars.theme) {
        return;
      }

      element.style.setProperty(`--${key}`, value);
    });
  }

  // Update data attribute for CSS selectors
  element.setAttribute("data-theme", themeState.currentMode);

  // Update class for compatibility with existing theme systems
  if (themeState.currentMode === "dark") {
    element.classList.add("dark");
    element.classList.remove("light");
  } else {
    element.classList.add("light");
    element.classList.remove("dark");
  }
}
