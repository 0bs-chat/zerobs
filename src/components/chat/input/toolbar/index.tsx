import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  PlusIcon,
  ArrowUp,
  PaperclipIcon,
  GithubIcon,
  BrainIcon,
  Hammer,
  ChevronDownIcon,
} from "lucide-react";
import { ProjectsDropdown } from "./projects-dropdown";
import { useUploadDocuments } from "@/hooks/use-documents";
import { useMutation, useQuery } from "convex/react";
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
import React, { useRef, useState, type RefObject } from "react";
import { getModalityIcon } from "@/lib/helpers";
import GitHubDialog from "../github";
import { ConductorToggle } from "./conductorToggle";
import { OrchestratorToggle } from "./orchestratorToggle";
import { useAtomValue, useSetAtom } from "jotai";
import {
  newChatReasoningEffortAtom,
  newChatModelAtom,
  modelPopoverOpenAtom,
  streamStatusAtom,
} from "@/store/chatStore";
import { useAtom } from "jotai";
import { models } from "../../../../../convex/langchain/models";
import { ArtifactsToggle } from "./artifatsToggle";
import { WebSearchToggle } from "./webSearchToggle";
import { StopButtonIcon } from "./stop-button-icon";
import { motion } from "motion/react";
import { buttonHover, smoothTransition } from "@/lib/motion";
import type { AutosizeTextAreaRef } from "@/components/ui/autosize-textarea";

export const ToolBar = React.memo(
  ({ textareaRef }: { textareaRef: RefObject<AutosizeTextAreaRef> }) => {
    const params = useParams({ strict: false });
    const chatId = params.chatId as Id<"chats">;
    // chat atoms
    const setNewChatReasoningEffort = useSetAtom(newChatReasoningEffortAtom);
    const setNewChatModel = useSetAtom(newChatModelAtom);
    const newChatModel = useAtomValue(newChatModelAtom);
    const newChatReasoningEffort = useAtomValue(newChatReasoningEffortAtom);

    // chat query
    const chat = useQuery(
      api.chats.queries.get,
      chatId !== undefined ? { chatId } : "skip"
    );

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const updateChatMutation = useMutation(api.chats.mutations.update);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const streamStatus = useAtomValue(streamStatusAtom);
    const cancelStreamMutation = useMutation(api.streams.mutations.cancel);
    const [modelPopoverOpen, setModelPopoverOpen] =
      useAtom(modelPopoverOpenAtom);

    const selectedModel = chat?.model ?? newChatModel;
    const reasoningEffort = chat?.reasoningEffort ?? newChatReasoningEffort;
    const selectedModelConfig = models.find(
      (m) => m.model_name === selectedModel
    );
    const showReasoningEffort = selectedModelConfig?.isThinking ?? false;

    const handleFileUpload = useUploadDocuments({ type: "file" });
    const handleSubmit = useHandleSubmit();

    const handleModelSelect = (modelName: string) => {
      if (chatId === undefined || chatId === null || chatId === "") {
        setNewChatModel(modelName);
      } else {
        updateChatMutation({
          chatId,
          updates: { model: modelName },
        });
      }
      setModelPopoverOpen(false);
    };

    return (
      <div className="flex flex-row justify-between items-center w-full p-1">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        />

        <GitHubDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

        <div className="flex flex-row items-center gap-1">
          <div className="flex flex-row items-center gap-1">
            <DropdownMenu
              open={isDropdownOpen}
              onOpenChange={setIsDropdownOpen}
            >
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
                    setIsDropdownOpen(false);
                    setIsDialogOpen(true);
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

          <ConductorToggle chatId={chatId} />
          <OrchestratorToggle chatId={chatId} />
          <ArtifactsToggle chatId={chatId} />
          <WebSearchToggle chatId={chatId} />
        </div>
        <div className="flex flex-row items-center gap-1">
          {/* selectreasoing div */}
          {showReasoningEffort && (
            <Select
              value={reasoningEffort}
              onValueChange={(value: "low" | "medium" | "high") => {
                if (chatId === undefined || chatId === null || chatId === "") {
                  setNewChatReasoningEffort(value);
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
          {/* model select div */}
          <Popover open={modelPopoverOpen} onOpenChange={setModelPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="justify-between gap-2 cursor-pointer bg-muted"
                onClick={() => setModelPopoverOpen(!modelPopoverOpen)}
              >
                {selectedModelConfig?.label || selectedModel}
                <ChevronDownIcon className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-96 max-h-96 overflow-y-auto p-0"
              align="end"
            >
              <div className="space-y-1 p-1 dark:bg-black bg-white">
                {models
                  .filter((model) => !model.hidden)
                  .map((model, index) => (
                    <div
                      key={model.model}
                      className={`flex items-center gap-2 px-3 py-3 cursor-pointer rounded-sm transition-colors justify-between hover:bg-accent/25 dark:hover:bg-accent/60   ${
                        model.model_name === selectedModel
                          ? "bg-accent/40 dark:bg-accent/70"
                          : ""
                      }`}
                      onClick={() => handleModelSelect(model.model_name)}
                    >
                      <div className="text-foreground flex gap-2 items-center justify-center ">
                        <img
                          src={model.logo}
                          alt={model.label}
                          className={`h-4 w-4 ${
                            ["openai", "x-ai", "openrouter"].includes(
                              model.provider
                            )
                              ? "dark:invert"
                              : ""
                          }`}
                        />
                        {model.label}
                      </div>
                      <div className="flex flex-row gap-2 items-center opacity-75">
                        {model.modalities?.map((modality) => {
                          const { icon: Icon, className: IconClassName } =
                            getModalityIcon(modality);
                          return (
                            <Icon
                              key={modality}
                              className={`h-4 w-4 ${IconClassName}`}
                            />
                          );
                        })}
                        {model.toolSupport && (
                          <Hammer key={model.model} className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </PopoverContent>
          </Popover>
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
                  await handleSubmit(chatId, textareaRef);
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
  }
);
