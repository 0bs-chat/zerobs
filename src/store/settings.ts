import { atomWithStorage } from "jotai/utils";

export const themeAtom = atomWithStorage<"light" | "dark" | "system">(
  "theme",
  "system"
);
