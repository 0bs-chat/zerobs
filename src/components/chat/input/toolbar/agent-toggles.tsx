import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileIcon,
  Globe2Icon,
  Network,
  Binoculars,
  XIcon,
  BotIcon,
} from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import { chatAtom, chatIdAtom, newChatAtom } from "@/store/chatStore";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import { motion } from "motion/react";
import { smoothTransition, scaleIn, iconSpinVariants } from "@/lib/motion";

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
    tooltip: "Search the web",
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
    icon: <Binoculars className="h-4 w-4" />,
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

  const selectedToggles = TOGGLES.filter(
    (t) => chat[t.key as keyof typeof chat]
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            title="Toggles"
            className="cursor-pointer text-foreground/70 dark:border-none"
          >
            <BotIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="border-border/60 bg-background/70 backdrop-blur-sm"
        >
          <div className="px-2 pt-2 pb-1 text-xs text-muted-foreground">
            Agent Settings
          </div>
          {TOGGLES.map((toggle) => (
            <DropdownMenuItem
              key={toggle.key}
              onClick={() =>
                handleToggle(toggle.key, !chat[toggle.key as keyof typeof chat])
              }
              className={[
                "flex items-center justify-between pr-2 cursor-pointer",
                toggle.key === "orchestratorMode"
                  ? "bg-gradient-to-r from-input to-card hover:bg-gradient-to-r hover:from-input/80 hover:to-card/80"
                  : "",
              ].join(" ")}
            >
              <span className="flex items-center gap-2">
                <motion.span
                  variants={
                    toggle.animation === "scale" ? scaleIn : iconSpinVariants
                  }
                  initial="initial"
                  animate="animate"
                  transition={smoothTransition}
                >
                  {toggle.icon}
                </motion.span>
                {toggle.label}
              </span>
              <span className="ml-auto flex items-center">
                {chat[toggle.key as keyof typeof chat] && (
                  <svg
                    className="size-4 text-primary"
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
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selectedToggles.map((toggle) => (
        <Button
          key={toggle.key}
          variant="outline"
          size="icon"
          className="transition-all duration-300 relative group"
          onClick={() => handleToggle(toggle.key, false)}
          title={toggle.tooltip || toggle.label}
        >
          <motion.span
            variants={toggle.animation === "scale" ? scaleIn : iconSpinVariants}
            initial="initial"
            animate="animate"
            transition={smoothTransition}
            className="group-hover:hidden"
          >
            {toggle.icon}
          </motion.span>
          <span className="absolute inset-0 flex items-center justify-center hidden group-hover:flex">
            <XIcon className="w-4 h-4 text-destructive" />
          </span>
        </Button>
      ))}
    </>
  );
}
