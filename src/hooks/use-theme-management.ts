import { setThemeStateAtom, themeStateAtom } from "@/lib/theme/store"
import {
    type FetchedTheme,
    THEME_URLS,
    type ThemePreset,
    fetchThemeFromUrl
} from "@/lib/theme/utils"
import { toggleThemeModeAtom, themeSearchQueryAtom } from "@/lib/theme/store"
import { useQuery } from "@tanstack/react-query"
import { useAtom } from "jotai"
import { useSetAtom } from "jotai"
import { useMemo } from "react"
import { toast } from "sonner"

export function useThemeManagement() {
    const [themeState] = useAtom(themeStateAtom)
    const [, setThemeState] = useAtom(setThemeStateAtom)
    const [searchQuery] = useAtom(themeSearchQueryAtom)
    const toggleMode = useSetAtom(toggleThemeModeAtom)

    // Combine built-in theme URLs
    const allThemeUrls = useMemo(() => {
        return Array.from(new Set(THEME_URLS))
    }, [])

    const { data: fetchedThemes = [], isLoading: isLoadingThemes } = useQuery({
        queryKey: ["themes", allThemeUrls],
        queryFn: () => Promise.all(allThemeUrls.map(fetchThemeFromUrl)),
        enabled: allThemeUrls.length > 0,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000 // 10 minutes
    })

    const applyThemePreset = (preset: ThemePreset) => {
        setThemeState({
            currentMode: themeState.currentMode,
            cssVars: preset.cssVars
        })
    }

    const handleThemeImported = (preset: ThemePreset, _url: string) => {
        applyThemePreset(preset)
        toast.success("Theme imported successfully")
    }

    const handleThemeSelect = (theme: FetchedTheme) => {
        if ("error" in theme && theme.error) {
            return
        }

        if ("preset" in theme) {
            applyThemePreset(theme.preset)
        }
    }

    const randomizeTheme = () => {
        const availableThemes = fetchedThemes.filter((theme) => !("error" in theme && theme.error))
        if (availableThemes.length > 0) {
            const randomTheme = availableThemes[Math.floor(Math.random() * availableThemes.length)]
            handleThemeSelect(randomTheme)
        }
    }

    const filteredThemes = fetchedThemes.filter((theme) =>
        theme.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const customThemes = filteredThemes.filter((theme) => theme.type === "custom")
    const builtInThemes = filteredThemes.filter((theme) => theme.type === "built-in")

    return {
        // State
        themeState,
        searchQuery,
        isLoadingThemes,
        fetchedThemes,
        filteredThemes,
        customThemes,
        builtInThemes,

        // Actions
        handleThemeImported,
        handleThemeSelect,
        toggleMode,
        randomizeTheme,
        applyThemePreset,
    }
}
