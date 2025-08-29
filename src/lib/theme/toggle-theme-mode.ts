import { currentThemeModeAtom, themeStateAtom } from "./store"
import { getDefaultStore } from "jotai"
import type { ThemeState } from "./types"

// Type declarations for View Transitions API
declare global {
    interface Document {
        startViewTransition?: (updateCallback: () => void) => ViewTransition
    }
}

interface ViewTransition {
    finished: Promise<void>
    ready: Promise<void>
}

const store = getDefaultStore()

export const toggleThemeMode = () => {
    try {
        const themeState = store.get(themeStateAtom) as ThemeState
        if (!themeState) {
            console.warn('Theme state is undefined, cannot toggle mode')
            return
        }

        const newMode = themeState.currentMode === "light" ? "dark" : "light"

        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

        console.log("prefersReducedMotion", prefersReducedMotion)

        if (!document.startViewTransition || prefersReducedMotion) {
            store.set(currentThemeModeAtom, newMode)
            return
        }

        document.startViewTransition(() => {
            store.set(currentThemeModeAtom, newMode)
        })
    } catch (error) {
        console.error('Error toggling theme mode:', error)
    }
}
