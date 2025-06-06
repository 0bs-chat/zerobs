import { create } from "zustand";

export interface ChatPreferences {
  agentMode: boolean;
  plannerMode: boolean;
  webSearch: boolean;
  model: string;
}

const defaultPreferences: ChatPreferences = {
  agentMode: false,
  plannerMode: false,
  webSearch: false,
  model: "gemini-2.5-flash-preview-05-20",
};

export const useChatPreferencesStore = create<{
  chatInputText: string;
  preferences: ChatPreferences;
  setChatInputText: (chatInputText: string) => void;
  updatePreferences: (updates: Partial<ChatPreferences>) => void;
}>((set) => ({
  chatInputText: "",
  preferences: defaultPreferences,
  setChatInputText: (chatInputText) => set({ chatInputText }),
  updatePreferences: (updates) =>
    set((state) => ({
      preferences: { ...state.preferences, ...updates },
    })),
}));
