export type ThemeMode = "dark" | "light"

export type ThemeState = {
    currentMode: ThemeMode
    cssVars: {
        theme: Record<string, string>
        light: Record<string, string>
        dark: Record<string, string>
    }
}

export type FetchedTheme = {
    name: string
    url: string
    type: "built-in" | "custom"
} & (
    | { error: string }
    | { preset: ThemePreset }
)

export type ThemePreset = {
    cssVars: {
        theme: Record<string, string>
        light: Record<string, string>
        dark: Record<string, string>
    }
}
