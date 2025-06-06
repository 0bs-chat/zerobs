import { create } from "zustand";

export const useChatInputToolbar = create<{
  chatInput: string;
  agentMode: boolean;
  plannerMode: boolean;
  webSearch: boolean;
  model: string;
  setChatInput: (chatInput: string) => void;
  setAgentMode: (agentMode: boolean) => void;
  setPlannerMode: (plannerMode: boolean) => void;
  setWebSearch: (webSearch: boolean) => void;
  setModel: (model: string) => void;
}>((set) => ({
  chatInput: "",
  agentMode: true,
  plannerMode: true,
  webSearch: true,
  model: "gemini-2.5-flash-preview-05-20",
  setChatInput: (chatInput) => set({ chatInput }),
  setAgentMode: (agentMode) => set({ agentMode }),
  setPlannerMode: (plannerMode) => set({ plannerMode }),
  setWebSearch: (webSearch) => set({ webSearch }),
  setModel: (model) => set({ model }),
}));
