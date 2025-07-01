import { atom } from "jotai";

export const themeAtom = atom<"light" | "dark" | "system">("system");