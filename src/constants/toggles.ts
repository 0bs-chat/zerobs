import {
  FileIcon,
  Globe2Icon,
  Network,
  Binoculars,
  type LucideIcon,
} from "lucide-react";

type AnimationType = "scale" | "rotate";

type Toggle = {
  key: string;
  label: string;
  icon: LucideIcon;
  tooltip: string | undefined;
  animation: AnimationType;
};

// Toggle registry for DRY logic
export const TOGGLES: Toggle[] = [
  {
    key: "artifacts",
    label: "Artifacts",
    icon: FileIcon,
    tooltip: undefined,
    animation: "scale" as AnimationType,
  },
  {
    key: "webSearch",
    label: "Web Search",
    icon: Globe2Icon,
    tooltip: "Search the web",
    animation: "rotate" as AnimationType,
  },
  {
    key: "conductorMode",
    label: "Conductor",
    icon: Network,
    tooltip: undefined,
    animation: "scale" as AnimationType,
  },
  {
    key: "orchestratorMode",
    label: "Orchestrator",
    icon: Binoculars,
    tooltip: undefined,
    animation: "scale" as AnimationType,
  },
] as const;
