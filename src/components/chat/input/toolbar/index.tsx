import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlusIcon,
  ArrowUp,
  PaperclipIcon,
  GithubIcon,
  BrainIcon,
  Hammer,
  FileIcon,
  Globe2Icon,
  Network,
  Binoculars,
  XIcon, // <-- Add this
  FoldersIcon,
} from "lucide-react";
import { ProjectsDropdown } from "./projects-dropdown";
import { useUploadDocuments } from "@/hooks/chats/use-documents";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useHandleSubmit } from "@/hooks/chats/use-chats";
import { useAtomValue, useSetAtom } from "jotai";
import { chatIdAtom } from "@/store/chatStore";
import { useRef, useState } from "react";
import GitHubDialog from "../github";
import {
  streamStatusAtom,
  newChatAtom,
  chatAtom,
  resizePanelOpenAtom,
  selectedPanelTabAtom,
} from "@/store/chatStore";
import { models } from "../../../../../convex/langchain/models";
import { StopButtonIcon } from "./stop-button-icon";
import { motion } from "motion/react";
import {
  buttonHover,
  smoothTransition,
  scaleIn,
  iconSpinVariants,
} from "@/lib/motion";
import { ModelPopover } from "./model-popover";
import { useRouter } from "@tanstack/react-router";

type AnimationType = "scale" | "rotate";

// Toggle registry for DRY logic
const TOGGLES = [
  {
    key: "artifacts" as const,
    label: "Artifacts",
    icon: <FileIcon className="h-4 w-4" />,
    tooltip: undefined,
    animation: "scale" as AnimationType,
  },
  {
    key: "webSearch" as const,
    label: "Web Search",
    icon: <Globe2Icon className="h-4 w-4" />,
    tooltip: "Search the web",
    animation: "rotate" as AnimationType,
  },
  {
    key: "conductorMode" as const,
    label: "Conductor",
    icon: <Network className="h-4 w-4" />,
    tooltip: undefined,
    animation: "scale" as AnimationType,
  },
  {
    key: "orchestratorMode" as const,
    label: "Orchestrator",
    icon: <Binoculars className="h-4 w-4" />,
    tooltip: undefined,
    animation: "scale" as AnimationType,
  },
] as const;

type ToggleKey = (typeof TOGGLES)[number]["key"];

export const ToolBar = () => {
  const chatId = useAtomValue(chatIdAtom);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const streamStatus = useAtomValue(streamStatusAtom);
  const cancelStreamMutation = useMutation(api.streams.mutations.cancel);
  const setNewChat = useSetAtom(newChatAtom);
  const chat = useAtomValue(chatAtom)!;
  const selectedModel = chat.model;
  const reasoningEffort = chat.reasoningEffort;
  const selectedModelConfig = models.find(
    (m) => m.model_name === selectedModel
  );
  const showReasoningEffort = selectedModelConfig?.isThinking ?? false;
  const router = useRouter();
  const isProjectRoute = router.state.location.pathname.startsWith("/project/");
  const setResizePanelOpen = useSetAtom(resizePanelOpenAtom);
  const setSelectedPanelTab = useSetAtom(selectedPanelTabAtom);

  // Get project details if chat has a project
  const project = useQuery(
    api.projects.queries.get,
    chat.projectId ? { projectId: chat.projectId } : "skip"
  );

  const handleFileUpload = useUploadDocuments({ type: "file", chat });
  const handleSubmit = useHandleSubmit();

  // Generic toggle handler
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

  // Handle removing project from chat
  const handleRemoveProject = () => {
    if (chatId === "new") {
      setNewChat((prev) => ({
        ...prev,
        projectId: null,
      }));
    } else {
      updateChatMutation({
        chatId,
        updates: {
          projectId: null,
        },
      });
    }
  };

  // Render selected toggles as buttons
  const selectedToggles = TOGGLES.filter(
    (t) => chat[t.key as keyof typeof chat]
  );

  return (
    <div className="flex flex-row justify-between items-center w-full p-1">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
      />
      <GitHubDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        chat={chat}
      />

      <div className="flex flex-row items-center gap-1">
        <div className="flex flex-row items-center gap-1">
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <PlusIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <PaperclipIcon className="w-4 h-4" />
                Attach Documents
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setIsDropdownOpen(false); // unmounting dropdown
                  setIsDialogOpen(true); // dialog mount
                }}
              >
                <GithubIcon className="w-4 h-4" />
                Add GitHub Repo
              </DropdownMenuItem>
              {!isProjectRoute && (
                <ProjectsDropdown
                  onCloseDropdown={() => setIsDropdownOpen(false)}
                />
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Separate toggles dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" title="Toggles">
              <Hammer className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <div className="px-2 pt-2 pb-1 text-xs text-muted-foreground">
              Agent Settings
            </div>
            {TOGGLES.map((toggle) => (
              <DropdownMenuItem
                key={toggle.key}
                onClick={() =>
                  handleToggle(
                    toggle.key,
                    !chat[toggle.key as keyof typeof chat]
                  )
                }
                className={[
                  "flex items-center justify-between pr-2",
                  toggle.key === "orchestratorMode"
                    ? "bg-gradient-to-r from-input to-card"
                    : "",
                ].join(" ")}
              >
                <span className="flex items-center gap-2">
                  {/* Add motion to icon */}
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
                {/* Move the checkmark to the right */}
                <span className="ml-auto flex items-center">
                  {/* The checkmark is rendered by DropdownMenuCheckboxItem, but we want it on the right, so we hide the default and add our own if checked */}
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
        {/* Render selected toggles as buttons */}
        {selectedToggles.map((toggle) => (
          <Button
            key={toggle.key}
            variant="outline"
            size="icon"
            className="transition-all duration-300 relative group"
            onClick={() => handleToggle(toggle.key, false)}
            title={toggle.tooltip || toggle.label}
          >
            {/* Toggle icon: visible only when not hovered */}
            <motion.span
              variants={
                toggle.animation === "scale" ? scaleIn : iconSpinVariants
              }
              initial="initial"
              animate="animate"
              transition={smoothTransition}
              className="group-hover:hidden"
            >
              {toggle.icon}
            </motion.span>
            {/* X icon: visible only on hover, fully replaces toggle icon */}
            <span className="absolute inset-0 flex items-center justify-center hidden group-hover:flex">
              <XIcon className="w-4 h-4 text-destructive" />
            </span>
          </Button>
        ))}
        {/* Render project name with X button on hover */}
        {project && (
          <Button
            variant="outline"
            className="group justify-between px-2"
            onClick={() => {
              setResizePanelOpen(true);
              setSelectedPanelTab("projects");
            }}
          >
            <span className="flex items-center gap-1">
              <FoldersIcon className="w-4 h-4" />
              <span className="max-w-32 truncate">{project.name}</span>
            </span>
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveProject();
              }}
              className="hidden group-hover:block cursor-pointer"
            >
              <XIcon className="w-4 h-4 text-destructive" />
            </div>
          </Button>
        )}
      </div>
      <div className="flex flex-row items-center gap-1">
        {showReasoningEffort && (
          <Select
            value={reasoningEffort}
            onValueChange={(value: "low" | "medium" | "high") => {
              if (chatId === "new") {
                setNewChat((prev) => ({ ...prev, reasoningEffort: value }));
              } else {
                updateChatMutation({
                  chatId,
                  updates: { reasoningEffort: value },
                });
              }
            }}
          >
            <SelectTrigger className="bg-background border border-border">
              <BrainIcon className="h-4 w-4" />
              {reasoningEffort}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        )}
        <ModelPopover selectedModel={selectedModel} chatId={chatId} />

        <motion.div
          variants={buttonHover}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
          transition={smoothTransition}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={async () => {
              if (!["pending", "streaming"].includes(streamStatus ?? "")) {
                await handleSubmit(chat);
              } else {
                await cancelStreamMutation({ chatId });
              }
            }}
          >
            {["pending", "streaming"].includes(streamStatus ?? "") ? (
              <StopButtonIcon className="h-6 w-6 -translate-y-0.5 -translate-x-0.5" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
