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
  CircleStopIcon,
  BrainIcon,
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
import { Badge } from "@/components/ui/badge";
import { useHandleSubmit } from "@/hooks/chats/use-chats";
import { useParams } from "@tanstack/react-router";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useRef, useState } from "react";
import { getTagInfo } from "@/lib/helpers";
import GitHubDialog from "../github";
import { ConductorToggle } from "./conductorToggle";
import { OrchestratorToggle } from "./orchestratorToggle";
import { useSetAtom, useAtomValue } from "jotai";
import { streamStatusAtom, newChatAtom } from "@/store/chatStore";
import { models } from "../../../../../convex/langchain/models";
import { ArtifactsToggle } from "./artifatsToggle";
import { WebSearchToggle } from "./webSearchToggle";

export const ToolBar = ({ chat }: { chat: Doc<"chats"> }) => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const streamStatus = useAtomValue(streamStatusAtom);
  const cancelStreamMutation = useMutation(api.streams.mutations.cancel);
  const setNewChat = useSetAtom(newChatAtom);
  const selectedModel = chat.model;
  const reasoningEffort = chat.reasoningEffort;
  const selectedModelConfig = models.find(
    (m) => m.model_name === selectedModel,
  );
  const showReasoningEffort = selectedModelConfig?.isThinking ?? false;

  const handleFileUpload = useUploadDocuments({ type: "file", chat });
  const handleSubmit = useHandleSubmit();

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

        <ConductorToggle chatId={chatId} conductorMode={chat.conductorMode} />
        <OrchestratorToggle
          chatId={chatId}
          orchestratorMode={chat.orchestratorMode}
        />
        <ArtifactsToggle chatId={chatId} artifacts={chat.artifacts} />
        <WebSearchToggle chatId={chatId} webSearch={chat.webSearch} />
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
        <Select
          value={selectedModel}
          onValueChange={(value) => {
            if (chatId === "new") {
              setNewChat((prev) => ({ ...prev, model: value }));
            } else {
              updateChatMutation({
                chatId,
                updates: { model: value },
              });
            }
          }}
        >
          <SelectTrigger>{selectedModel}</SelectTrigger>
          <SelectContent>
            {models?.map((model, index) => {
              if (model.hidden) return null;
              return (
                <SelectItem
                  key={model.model}
                  value={model.model_name}
                  className={`${
                    model.model_name === selectedModel ? "bg-accent" : ""
                  } ${index > 0 ? "mt-1" : ""}`}
                >
                  <div className="flex flex-col w-full gap-2">
                    <span className={`text-foreground`}>{model.label}</span>
                    {model.modalities && (
                      <div className="flex flex-row gap-1 ">
                        {model.modalities?.map((modality) => {
                          const { icon: Icon, className: IconClassName } =
                            getTagInfo(modality);
                          return (
                            <Badge
                              key={modality}
                              className={`flex items-center gap-1 text-foreground bg-input/80`}
                            >
                              <Icon className={`h-3 w-3 ${IconClassName}`} />
                              {modality}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

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
            <CircleStopIcon className="h-4 w-4" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
};
