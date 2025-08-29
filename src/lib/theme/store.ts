import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { ThemeMode, ThemeState } from "./types"

// Updated Theme with new color palette
const DEFAULT_THEME: ThemeState = {
    currentMode: "dark",
    cssVars: {
        theme: {
            "font-sans": "Oxanium, sans-serif",
            "font-mono": "Fira Code, monospace",
            "font-serif": "Merriweather, serif",
            radius: "0.3rem",
            "tracking-tighter": "calc(var(--tracking-normal) - 0.05em)",
            "tracking-tight": "calc(var(--tracking-normal) - 0.025em)",
            "tracking-wide": "calc(var(--tracking-normal) + 0.025em)",
            "tracking-wider": "calc(var(--tracking-normal) + 0.05em)",
            "tracking-widest": "calc(var(--tracking-normal) + 0.1em)"
        },
        light: {
            background: "oklch(0.9885 0.0057 84.5659)",
            foreground: "oklch(0.3660 0.0251 49.6085)",
            card: "oklch(0.9686 0.0091 78.2818)",
            "card-foreground": "oklch(0.3660 0.0251 49.6085)",
            popover: "oklch(0.9686 0.0091 78.2818)",
            "popover-foreground": "oklch(0.3660 0.0251 49.6085)",
            primary: "oklch(0.5553 0.1455 48.9975)",
            "primary-foreground": "oklch(1.0000 0 0)",
            secondary: "oklch(0.8276 0.0752 74.4400)",
            "secondary-foreground": "oklch(0.4444 0.0096 73.6390)",
            muted: "oklch(0.9363 0.0218 83.2637)",
            "muted-foreground": "oklch(0.5534 0.0116 58.0708)",
            accent: "oklch(0.9000 0.0500 74.9889)",
            "accent-foreground": "oklch(0.4444 0.0096 73.6390)",
            destructive: "oklch(0.4437 0.1613 26.8994)",
            "destructive-foreground": "oklch(1.0000 0 0)",
            border: "oklch(0.8866 0.0404 89.6994)",
            input: "oklch(0.8866 0.0404 89.6994)",
            ring: "oklch(0.5553 0.1455 48.9975)",
            "chart-1": "oklch(0.5553 0.1455 48.9975)",
            "chart-2": "oklch(0.5534 0.0116 58.0708)",
            "chart-3": "oklch(0.5538 0.1207 66.4416)",
            "chart-4": "oklch(0.5534 0.0116 58.0708)",
            "chart-5": "oklch(0.6806 0.1423 75.8340)",
            radius: "0.3rem",
            sidebar: "oklch(0.9363 0.0218 83.2637)",
            "sidebar-foreground": "oklch(0.3660 0.0251 49.6085)",
            "sidebar-primary": "oklch(0.5553 0.1455 48.9975)",
            "sidebar-primary-foreground": "oklch(1.0000 0 0)",
            "sidebar-accent": "oklch(0.5538 0.1207 66.4416)",
            "sidebar-accent-foreground": "oklch(1.0000 0 0)",
            "sidebar-border": "oklch(0.8866 0.0404 89.6994)",
            "sidebar-ring": "oklch(0.5553 0.1455 48.9975)",
            "font-sans": "Oxanium, sans-serif",
            "font-serif": "Merriweather, serif",
            "font-mono": "Fira Code, monospace",
            "shadow-color": "hsl(28 18% 25%)",
            "shadow-opacity": "0.09",
            "shadow-blur": "3px",
            "shadow-spread": "0px",
            "shadow-offset-x": "0",
            "shadow-offset-y": "2px",
            "letter-spacing": "0em",
            spacing: "0.25rem",
            "shadow-2xs": "0px 2px 3px 0px hsl(28 18% 25% / 0.09)",
            "shadow-xs": "0px 2px 3px 0px hsl(28 18% 25% / 0.09)",
            "shadow-sm": "0px 2px 3px 0px hsl(28 18% 25% / 0.18), 0px 1px 2px -1px hsl(28 18% 25% / 0.18)",
            shadow: "0px 2px 3px 0px hsl(28 18% 25% / 0.18), 0px 1px 2px -1px hsl(28 18% 25% / 0.18)",
            "shadow-md": "0px 2px 3px 0px hsl(28 18% 25% / 0.18), 0px 2px 4px -1px hsl(28 18% 25% / 0.18)",
            "shadow-lg": "0px 2px 3px 0px hsl(28 18% 25% / 0.18), 0px 4px 6px -1px hsl(28 18% 25% / 0.18)",
            "shadow-xl": "0px 2px 3px 0px hsl(28 18% 25% / 0.18), 0px 8px 10px -1px hsl(28 18% 25% / 0.18)",
            "shadow-2xl": "0px 2px 3px 0px hsl(28 18% 25% / 0.45)",
            "tracking-normal": "0em"
        },
        dark: {
            background: "oklch(0.2161 0.0061 56.0434)",
            foreground: "oklch(0.9699 0.0013 106.4238)",
            card: "oklch(0.2685 0.0063 34.2976)",
            "card-foreground": "oklch(0.9699 0.0013 106.4238)",
            popover: "oklch(0.2685 0.0063 34.2976)",
            "popover-foreground": "oklch(0.9699 0.0013 106.4238)",
            primary: "oklch(0.7049 0.1867 47.6044)",
            "primary-foreground": "oklch(1.0000 0 0)",
            secondary: "oklch(0.4444 0.0096 73.6390)",
            "secondary-foreground": "oklch(0.9232 0.0026 48.7171)",
            muted: "oklch(0.2685 0.0063 34.2976)",
            "muted-foreground": "oklch(0.7161 0.0091 56.2590)",
            accent: "oklch(0.3598 0.0497 229.3202)",
            "accent-foreground": "oklch(0.9232 0.0026 48.7171)",
            destructive: "oklch(0.5771 0.2152 27.3250)",
            "destructive-foreground": "oklch(1.0000 0 0)",
            border: "oklch(0.3741 0.0087 67.5582)",
            input: "oklch(0.3741 0.0087 67.5582)",
            ring: "oklch(0.7049 0.1867 47.6044)",
            "chart-1": "oklch(0.7049 0.1867 47.6044)",
            "chart-2": "oklch(0.6847 0.1479 237.3225)",
            "chart-3": "oklch(0.7952 0.1617 86.0468)",
            "chart-4": "oklch(0.7161 0.0091 56.2590)",
            "chart-5": "oklch(0.5534 0.0116 58.0708)",
            radius: "0.3rem",
            sidebar: "oklch(0.2685 0.0063 34.2976)",
            "sidebar-foreground": "oklch(0.9699 0.0013 106.4238)",
            "sidebar-primary": "oklch(0.7049 0.1867 47.6044)",
            "sidebar-primary-foreground": "oklch(1.0000 0 0)",
            "sidebar-accent": "oklch(0.6847 0.1479 237.3225)",
            "sidebar-accent-foreground": "oklch(0.2839 0.0734 254.5378)",
            "sidebar-border": "oklch(0.3741 0.0087 67.5582)",
            "sidebar-ring": "oklch(0.7049 0.1867 47.6044)",
            "font-sans": "Oxanium, sans-serif",
            "font-serif": "Merriweather, serif",
            "font-mono": "Fira Code, monospace",
            "shadow-color": "hsl(0 0% 5%)",
            "shadow-opacity": "0.09",
            "shadow-blur": "3px",
            "shadow-spread": "0px",
            "shadow-offset-x": "0",
            "shadow-offset-y": "2px",
            "letter-spacing": "0em",
            spacing: "0.25rem",
            "shadow-2xs": "0px 2px 3px 0px hsl(0 0% 5% / 0.09)",
            "shadow-xs": "0px 2px 3px 0px hsl(0 0% 5% / 0.09)",
            "shadow-sm": "0px 2px 3px 0px hsl(0 0% 5% / 0.18), 0px 1px 2px -1px hsl(0 0% 5% / 0.18)",
            shadow: "0px 2px 3px 0px hsl(0 0% 5% / 0.18), 0px 1px 2px -1px hsl(0 0% 5% / 0.18)",
            "shadow-md": "0px 2px 3px 0px hsl(0 0% 5% / 0.18), 0px 2px 4px -1px hsl(0 0% 5% / 0.18)",
            "shadow-lg": "0px 2px 3px 0px hsl(0 0% 5% / 0.18), 0px 4px 6px -1px hsl(0 0% 5% / 0.18)",
            "shadow-xl": "0px 2px 3px 0px hsl(0 0% 5% / 0.18), 0px 8px 10px -1px hsl(0 0% 5% / 0.18)",
            "shadow-2xl": "0px 2px 3px 0px hsl(0 0% 5% / 0.45)"
        }
    }
}

// Main theme state atom with persistence
export const themeStateAtom = atomWithStorage<ThemeState>(
    "theme-store",
    DEFAULT_THEME,
    {
        getItem: (key) => {
            try {
                const stored = localStorage.getItem(key)
                if (!stored) return DEFAULT_THEME

                const parsed = JSON.parse(stored)
                // Validate that the stored theme has the correct structure
                if (!parsed || typeof parsed !== 'object') return DEFAULT_THEME
                if (!parsed.currentMode || !parsed.cssVars) return DEFAULT_THEME
                if (!parsed.cssVars.theme || !parsed.cssVars.light || !parsed.cssVars.dark) return DEFAULT_THEME

                return parsed as ThemeState
            } catch (error) {
                console.warn('Error reading theme from localStorage, using default:', error)
                return DEFAULT_THEME
            }
        },
        setItem: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value))
            } catch (error) {
                console.warn('Error saving theme to localStorage:', error)
            }
        },
        removeItem: (key) => {
            try {
                localStorage.removeItem(key)
            } catch (error) {
                console.warn('Error removing theme from localStorage:', error)
            }
        }
    }
)

// Derived atom for current mode
export const currentThemeModeAtom = atom(
    (get) => {
        const themeState = get(themeStateAtom)
        return themeState?.currentMode || "dark"
    },
    (get, set, newMode: ThemeMode) => {
        const currentState = get(themeStateAtom)
        if (!currentState) return

        set(themeStateAtom, {
            ...currentState,
            currentMode: newMode
        })
    }
)

// Action atom for setting theme state
export const setThemeStateAtom = atom(
    null,
    (_get, set, newThemeState: ThemeState) => {
        if (!newThemeState || !newThemeState.cssVars) return
        set(themeStateAtom, newThemeState)
    }
)

// Action atom for toggling theme mode with view transitions
export const toggleThemeModeAtom = atom(
    null,
    (get, set) => {
        const themeState = get(themeStateAtom)
        if (!themeState) return

        const newMode = themeState.currentMode === "light" ? "dark" : "light"

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

        if (!('startViewTransition' in document) || prefersReducedMotion) {
            set(currentThemeModeAtom, newMode)
            return
        }

        (document as any).startViewTransition(() => {
            set(currentThemeModeAtom, newMode)
        })
    }
)

// UI state atoms for theme components
export const themeSwitcherOpenAtom = atom(false)
export const importDialogOpenAtom = atom(false)
export const themeSearchQueryAtom = atom("")
