import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BotIcon,
  FileIcon,
  Globe2Icon,
  Network,
  Binoculars,
} from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { smoothTransition, scaleIn } from "@/lib/motion";
import { useAgentSettings } from "@/hooks/chats/use-agent-settings";

export const AGENT_SETTINGS = [
  {
    key: "artifacts" as const,
    label: "Artifacts",
    icon: FileIcon,
    iconElement: <FileIcon className="h-4 w-4" />,
    description: "Create rich, interactive content blocks",
    detail: "Generate code, documents, visualizations, and interactive apps as standalone artifacts that can be edited and updated.",
    category: "Content Creation",
    dependencies: [],
    tooltip: undefined,
    animation: "scale" as const,
  },
  {
    key: "webSearch" as const,
    label: "Web Search",
    icon: Globe2Icon,
    iconElement: <Globe2Icon className="h-4 w-4" />,
    description: "Search the web for real-time information",
    detail: "Access current information, news, research papers, and technical documentation beyond the AI's knowledge cutoff.",
    category: "Information Retrieval",
    dependencies: [],
    tooltip: "Search the web",
    animation: "rotate" as const,
  },
  {
    key: "conductorMode" as const,
    label: "Conductor",
    icon: Network,
    iconElement: <Network className="h-4 w-4" />,
    description: "Multi-agent orchestration with specialized tools",
    detail: "Coordinates multiple AI agents, each equipped with specific MCP tool sets, using a supervisor pattern for complex workflows.",
    category: "Agent Orchestration",
    dependencies: ["Requires active MCPs"],
    tooltip: undefined,
    animation: "scale" as const,
  },
  {
    key: "orchestratorMode" as const,
    label: "Orchestrator",
    icon: Binoculars,
    iconElement: <Binoculars className="h-4 w-4" />,
    description: "Advanced task planning and execution",
    detail: "Breaks down complex requests into structured step-by-step plans, executes them systematically, and adapts based on results.",
    category: "Advanced Planning",
    dependencies: ["Auto-enables Web Search"],
    tooltip: undefined,
    animation: "scale" as const,
  },
] as const;

export type AgentSettingKey = (typeof AGENT_SETTINGS)[number]["key"];


interface AgentSettingItemProps {
  setting: typeof AGENT_SETTINGS[number];
  isEnabled: boolean;
  onToggle: (key: AgentSettingKey) => void;
}

const AgentSettingItem = ({ setting, isEnabled, onToggle }: AgentSettingItemProps) => {
  const IconComponent = setting.icon;
  
  return (
    <div
      className={`flex flex-col gap-3 px-4 py-4 cursor-pointer rounded-lg transition-all duration-200 hover:bg-accent/25 dark:hover:bg-accent/60 border-2 ${
        isEnabled 
          ? "border-primary/30 bg-primary/5" 
          : "border-border/50 hover:border-border"
      }`}
      onClick={() => onToggle(setting.key)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            variants={scaleIn}
            initial="initial"
            animate="animate"
            transition={smoothTransition}
            className={`p-2 rounded-md ${
              isEnabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            <IconComponent className="h-4 w-4" />
          </motion.div>
          <div className="flex flex-col">
            <span className={`text-sm font-medium ${
              isEnabled ? "text-foreground" : "text-foreground/80"
            }`}>
              {setting.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {setting.category}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Dependencies indicator */}
          {setting.dependencies.length > 0 && (
            <div className="text-xs text-muted-foreground hidden sm:block">
              {setting.dependencies[0]}
            </div>
          )}
          
          {/* Toggle indicator */}
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            isEnabled 
              ? "border-primary bg-primary" 
              : "border-muted-foreground/30"
          }`}>
            {isEnabled && (
              <svg
                className="size-2.5 text-primary-foreground"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
        </div>
      </div>
      
      <div className="space-y-1">
        <p className="text-xs text-foreground/70 leading-relaxed">
          {setting.description}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {setting.detail}
        </p>
      </div>
    </div>
  );
};

export function AgentPopover() {
  const { handleToggle, getEnabledSettings, chat } = useAgentSettings();
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  const enabledSettings = getEnabledSettings();


  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="shadow-none cursor-pointer text-foreground/70 hover:text-foreground border-none"
          onClick={() => setPopoverOpen(!popoverOpen)}
        >
          <BotIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-96 max-h-[80vh] overflow-hidden p-0 relative bg-background border-border/70 flex flex-col"
        align="start"
      >
        <div className="py-3 px-4 sticky top-0 z-10 bg-background/70 backdrop-blur-lg border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-foreground">Agent Settings</h3>
              <p className="text-xs text-muted-foreground">Configure AI capabilities and behaviors</p>
            </div>
          </div>
        </div>

        <div 
          className="flex-1 overflow-y-auto p-3 space-y-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {AGENT_SETTINGS.map((setting) => (
            <AgentSettingItem
              key={setting.key}
              setting={setting}
              isEnabled={chat?.[setting.key] || false}
              onToggle={handleToggle}
            />
          ))}
        </div>

        {/* Footer with summary */}
        <div className="p-3 border-t border-border bg-muted/20">
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">{enabledSettings.length} active:</span>{" "}
            {enabledSettings.length > 0 
              ? enabledSettings.map(s => s.label).join(", ")
              : "None selected"
            }
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}