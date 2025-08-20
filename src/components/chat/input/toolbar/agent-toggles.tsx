import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { FileIcon, Globe2Icon, Network } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { chatAtom, chatIdAtom, newChatAtom } from "@/store/chatStore";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import { motion } from "motion/react";
import { smoothTransition, scaleIn, iconSpinVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ActivityLogIcon, MixerHorizontalIcon } from "@radix-ui/react-icons";

const TOGGLES = [
  {
    key: "artifacts" as const,
    label: "Artifacts",
    icon: <FileIcon className="h-4 w-4" />,
    tooltip: undefined,
    animation: "scale" as const,
  },
  {
    key: "webSearch" as const,
    label: "Web Search",
    icon: <Globe2Icon className="h-4 w-4" />,
    tooltip: undefined,
    animation: "rotate" as const,
  },
  {
    key: "conductorMode" as const,
    label: "Conductor",
    icon: <Network className="h-4 w-4" />,
    tooltip: undefined,
    animation: "scale" as const,
  },
  {
    key: "orchestratorMode" as const,
    label: "Orchestrator",
    icon: <ActivityLogIcon className="h-4 w-4" />,
    tooltip: undefined,
    animation: "scale" as const,
  },
] as const;

type ToggleKey = (typeof TOGGLES)[number]["key"];

export function AgentToggles() {
  const chatId = useAtomValue(chatIdAtom);
  const chat = useAtomValue(chatAtom)!;
  const setNewChat = useSetAtom(newChatAtom);
  const { mutate: updateChatMutation } = useMutation({
    mutationFn: useConvexMutation(api.chats.mutations.update),
  });

  const handleToggle = (key: ToggleKey, value: boolean) => {
    if (chatId === "new") {
      setNewChat((prev) => ({
        ...prev,
        [key]: value,
        ...(key === "orchestratorMode" && value && { webSearch: true }),
      }));
    } else {
      updateChatMutation({
        chatId,
        updates: {
          [key]: value,
          ...(key === "orchestratorMode" && value && { webSearch: true }),
        },
      });
    }
  };

  // Check if any toggle is active
  const hasActiveToggles = TOGGLES.some(
    (toggle) => chat[toggle.key as keyof typeof chat]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title="Agent Settings"
          className={cn(
            "cursor-pointer",
            hasActiveToggles
              ? "bg-accent border border-border text-foreground/70 dark:bg-primary/20"
              : "border-none bg-transparent text-foreground/70 dark:text-foreground/70"
          )}
        >
          <MixerHorizontalIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className=" w-56 border-border/80 p-2.5 bg-background backdrop-blur-sm"
      >
        <div className="px-1 pb-2.5 text-sm font-medium text-foreground/80">
          Agent Settings
        </div>
        <div className="space-y-2">
          {TOGGLES.map((toggle) => (
            <div
              key={toggle.key}
              className={[
                "flex items-center justify-between p-2 hover:bg-accent/50 rounded-md cursor-pointer",
                toggle.key === "orchestratorMode"
                  ? "bg-gradient-to-r from-input to-card"
                  : "",
              ].join(" ")}
              onClick={() =>
                handleToggle(toggle.key, !chat[toggle.key as keyof typeof chat])
              }
            >
              <div className="flex items-center gap-2 cursor-pointer">
                <motion.span
                  variants={
                    toggle.animation === "scale" ? scaleIn : iconSpinVariants
                  }
                  initial="initial"
                  animate="animate"
                  transition={smoothTransition}
                  className="text-foreground/70 dark:text-foreground/70"
                >
                  {toggle.icon}
                </motion.span>
                <div className="flex flex-col cursor-pointer">
                  <span className="text-sm text-foreground/70 cursor-pointer">
                    {toggle.label}
                  </span>
                  {toggle.tooltip && (
                    <span className="text-xs text-muted-foreground cursor-pointer">
                      {toggle.tooltip}
                    </span>
                  )}
                </div>
              </div>
              <Switch
                className="cursor-pointer opacity-90"
                checked={chat[toggle.key as keyof typeof chat] as boolean}
                onCheckedChange={(checked) => handleToggle(toggle.key, checked)}
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
