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
} from "lucide-react";
import { ProjectsDropdown } from "./projects-dropdown";
import { useUploadDocuments } from "@/hooks/use-documents";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useHandleSubmit } from "@/hooks/chats/use-chats";
import { useParams } from "@tanstack/react-router";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useRef, useState } from "react";
import GitHubDialog from "../github";
import { useSetAtom, useAtomValue } from "jotai";
import { streamStatusAtom, newChatAtom, chatAtom } from "@/store/chatStore";
import { models } from "../../../../../convex/langchain/models";
import { StopButtonIcon } from "./stop-button-icon";
import { motion } from "motion/react";
import { buttonHover, smoothTransition, scaleIn, iconSpinVariants } from "@/lib/motion";
import { ModelPopover } from "./model-popover";

// Toggle registry for DRY logic
const TOGGLES = [
  {
    key: "artifacts" as const,
    label: "Artifacts",
    icon: <FileIcon className="h-4 w-4" />,
    tooltip: undefined,
    animation: "scale",
  },
  {
    key: "webSearch" as const,
    label: "Web Search",
    icon: <Globe2Icon className="h-4 w-4" />,
    tooltip: "Search the web",
    animation: "rotate",
  },
  {
    key: "conductorMode" as const,
    label: "Conductor",
    icon: <Network className="h-4 w-4" />,
    tooltip: undefined,
    animation: "scale",
  },
  {
    key: "orchestratorMode" as const,
    label: "Orchestrator",
    icon: <Binoculars className="h-4 w-4" />,
    tooltip: undefined,
    animation: "scale",
  },
] as const;

type ToggleKey = typeof TOGGLES[number]["key"];

export const ToolBar = () => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const streamStatus = useAtomValue(streamStatusAtom);
  const cancelStreamMutation = useMutation(api.streams.mutations.cancel);
  const setNewChat = useSetAtom(newChatAtom);
  const chat = (useAtomValue(chatAtom))!;
  const selectedModel = chat.model;
  const reasoningEffort = chat.reasoningEffort;
  const selectedModelConfig = models.find(
    (m) => m.model_name === selectedModel,
  );
  const showReasoningEffort = selectedModelConfig?.isThinking ?? false;

  const handleFileUpload = useUploadDocuments({ type: "file", chat });
  const handleSubmit = useHandleSubmit();

  // Generic toggle handler
  const handleToggle = (key: ToggleKey, value: boolean) => {
    if (chatId === "new") {
      setNewChat((prev) => ({ ...prev, [key]: value }));
    } else {
      updateChatMutation({
        chatId,
        updates: { [key]: value },
      });
    }
  };

  // Render selected toggles as buttons
  const selectedToggles = TOGGLES.filter((t) => chat[t.key as keyof typeof chat]);

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
              <ProjectsDropdown
                onCloseDropdown={() => setIsDropdownOpen(false)}
              />
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
            <div className="px-2 pt-2 pb-1 text-xs text-muted-foreground">Toggles</div>
            {TOGGLES.map((toggle) => (
              <DropdownMenuItem
                key={toggle.key}
                onClick={() => handleToggle(toggle.key, !chat[toggle.key as keyof typeof chat])}
                className="flex items-center justify-between pr-2"
              >
                <span className="flex items-center gap-2">
                  {/* Add motion to icon */}
                  <motion.span
                    variants={toggle.animation === "scale" ? scaleIn : iconSpinVariants}
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
                    <svg className="size-4 text-primary" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" /></svg>
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
              variants={toggle.animation === "scale" ? scaleIn : iconSpinVariants}
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
            <SelectTrigger>
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
