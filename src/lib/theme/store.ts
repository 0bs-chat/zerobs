import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"
import type { ThemeMode, ThemeState } from "./types"

// Solar Dusk Theme - Warm sunset colors with excellent dark mode contrast
const DEFAULT_THEME: ThemeState = {
    currentMode: "dark",
    cssVars: {
        theme: {
            "font-sans": "Inter, sans-serif",
            "font-mono": "JetBrains Mono, monospace",
            "font-serif": "Georgia, serif",
            radius: "0.5rem",
            "tracking-tighter": "calc(var(--tracking-normal) - 0.05em)",
            "tracking-tight": "calc(var(--tracking-normal) - 0.025em)",
            "tracking-wide": "calc(var(--tracking-normal) + 0.025em)",
            "tracking-wider": "calc(var(--tracking-normal) + 0.05em)",
            "tracking-widest": "calc(var(--tracking-normal) + 0.1em)"
        },
        light: {
            background: "oklch(0.98 0.008 45)",
            foreground: "oklch(0.15 0.02 25)",
            card: "oklch(0.98 0.008 45)",
            "card-foreground": "oklch(0.15 0.02 25)",
            popover: "oklch(0.98 0.008 45)",
            "popover-foreground": "oklch(0.15 0.02 25)",
            primary: "oklch(0.65 0.18 35)",
            "primary-foreground": "oklch(1 0 0)",
            secondary: "oklch(0.94 0.02 40)",
            "secondary-foreground": "oklch(0.2 0.05 30)",
            muted: "oklch(0.91 0.01 45)",
            "muted-foreground": "oklch(0.5 0.02 35)",
            accent: "oklch(0.87 0.05 42)",
            "accent-foreground": "oklch(0.15 0.02 25)",
            destructive: "oklch(0.58 0.25 15)",
            "destructive-foreground": "oklch(1 0 0)",
            border: "oklch(0.84 0.02 40)",
            input: "oklch(0.84 0.02 40)",
            ring: "oklch(0.65 0.18 35)",
            "chart-1": "oklch(0.65 0.18 35)",
            "chart-2": "oklch(0.55 0.15 45)",
            "chart-3": "oklch(0.45 0.12 55)",
            "chart-4": "oklch(0.35 0.1 65)",
            "chart-5": "oklch(0.25 0.08 75)",
            radius: "0.5rem",
            sidebar: "oklch(0.94 0.01 42)",
            "sidebar-foreground": "oklch(0.15 0.02 25)",
            "sidebar-primary": "oklch(0.65 0.18 35)",
            "sidebar-primary-foreground": "oklch(1 0 0)",
            "sidebar-accent": "oklch(0.87 0.05 42)",
            "sidebar-accent-foreground": "oklch(0.15 0.02 25)",
            "sidebar-border": "oklch(0.84 0.02 40)",
            "sidebar-ring": "oklch(0.65 0.18 35)",
            "font-sans": "Inter, sans-serif",
            "font-serif": "Georgia, serif",
            "font-mono": "JetBrains Mono, monospace",
            "shadow-color": "oklch(0 0 0)",
            "shadow-opacity": "0.1",
            "shadow-blur": "3px",
            "shadow-spread": "0px",
            "shadow-offset-x": "0",
            "shadow-offset-y": "1px",
            "letter-spacing": "0em",
            spacing: "0.25rem",
            "shadow-2xs": "0 1px 3px 0px oklch(0 0 0 / 0.05)",
            "shadow-xs": "0 1px 3px 0px oklch(0 0 0 / 0.05)",
            "shadow-sm": "0 1px 3px 0px oklch(0 0 0 / 0.10), 0 1px 2px -1px oklch(0 0 0 / 0.10)",
            shadow: "0 1px 3px 0px oklch(0 0 0 / 0.10), 0 1px 2px -1px oklch(0 0 0 / 0.10)",
            "shadow-md": "0 1px 3px 0px oklch(0 0 0 / 0.10), 0 2px 4px -1px oklch(0 0 0 / 0.10)",
            "shadow-lg": "0 1px 3px 0px oklch(0 0 0 / 0.10), 0 4px 6px -1px oklch(0 0 0 / 0.10)",
            "shadow-xl": "0 1px 3px 0px oklch(0 0 0 / 0.10), 0 8px 10px -1px oklch(0 0 0 / 0.10)",
            "shadow-2xl": "0 1px 3px 0px oklch(0 0 0 / 0.25)",
            "tracking-normal": "0em"
        },
        dark: {
            background: "oklch(0.06 0.008 25)",
            foreground: "oklch(0.92 0.005 35)",
            card: "oklch(0.08 0.012 28)",
            "card-foreground": "oklch(0.92 0.005 35)",
            popover: "oklch(0.10 0.015 30)",
            "popover-foreground": "oklch(0.87 0.008 35)",
            primary: "oklch(0.72 0.22 35)",
            "primary-foreground": "oklch(0.06 0.008 25)",
            secondary: "oklch(0.14 0.02 32)",
            "secondary-foreground": "oklch(0.82 0.01 40)",
            muted: "oklch(0.12 0.015 28)",
            "muted-foreground": "oklch(0.62 0.012 35)",
            accent: "oklch(0.16 0.025 38)",
            "accent-foreground": "oklch(0.92 0.005 35)",
            destructive: "oklch(0.58 0.25 15)",
            "destructive-foreground": "oklch(0.95 0.005 35)",
            border: "oklch(0.15 0.02 32)",
            input: "oklch(0.14 0.02 32)",
            ring: "oklch(0.72 0.22 35)",
            "chart-1": "oklch(0.72 0.22 35)",
            "chart-2": "oklch(0.62 0.18 45)",
            "chart-3": "oklch(0.52 0.15 55)",
            "chart-4": "oklch(0.42 0.12 65)",
            "chart-5": "oklch(0.32 0.1 75)",
            radius: "0.5rem",
            sidebar: "oklch(0.07 0.01 26)",
            "sidebar-foreground": "oklch(0.75 0.008 38)",
            "sidebar-primary": "oklch(0.72 0.22 35)",
            "sidebar-primary-foreground": "oklch(0.06 0.008 25)",
            "sidebar-accent": "oklch(0.16 0.025 38)",
            "sidebar-accent-foreground": "oklch(0.92 0.005 35)",
            "sidebar-border": "oklch(0.14 0.02 32)",
            "sidebar-ring": "oklch(0.72 0.22 35)",
            "font-sans": "Inter, sans-serif",
            "font-serif": "Georgia, serif",
            "font-mono": "JetBrains Mono, monospace",
            "shadow-color": "oklch(0 0 0)",
            "shadow-opacity": "0.18",
            "shadow-blur": "5px",
            "shadow-spread": "0px",
            "shadow-offset-x": "0",
            "shadow-offset-y": "2px",
            "letter-spacing": "0em",
            spacing: "0.25rem",
            "shadow-2xs": "0 1px 3px 0px oklch(0 0 0 / 0.12)",
            "shadow-xs": "0 1px 3px 0px oklch(0 0 0 / 0.12)",
            "shadow-sm": "0 1px 3px 0px oklch(0 0 0 / 0.18), 0 1px 2px -1px oklch(0 0 0 / 0.18)",
            shadow: "0 1px 3px 0px oklch(0 0 0 / 0.18), 0 1px 2px -1px oklch(0 0 0 / 0.18)",
            "shadow-md": "0 1px 3px 0px oklch(0 0 0 / 0.18), 0 2px 4px -1px oklch(0 0 0 / 0.18)",
            "shadow-lg": "0 1px 3px 0px oklch(0 0 0 / 0.18), 0 4px 6px -1px oklch(0 0 0 / 0.18)",
            "shadow-xl": "0 1px 3px 0px oklch(0 0 0 / 0.18), 0 8px 10px -1px oklch(0 0 0 / 0.18)",
            "shadow-2xl": "0 1px 3px 0px oklch(0 0 0 / 0.45)"
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

        if (!document.startViewTransition || prefersReducedMotion) {
            set(currentThemeModeAtom, newMode)
            return
        }

        document.startViewTransition(() => {
            set(currentThemeModeAtom, newMode)
        })
    }
)

// UI state atoms for theme components
export const themeSwitcherOpenAtom = atom(false)
export const importDialogOpenAtom = atom(false)
export const themeSearchQueryAtom = atom("")
