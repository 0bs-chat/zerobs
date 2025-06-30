import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlusIcon,
  BotIcon,
  BrainIcon,
  Globe2Icon,
  ArrowUp,
  PaperclipIcon,
  GithubIcon,
  FileIcon,
  CircleStopIcon,
} from "lucide-react";
import { ProjectsDropdown } from "./projects-dropdown";
import { Toggle } from "@/components/ui/toggle";
import { useUploadDocuments } from "@/hooks/use-documents";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useHandleSubmit } from "@/hooks/chats/use-chats";
import { useParams } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { lazy, useRef, useState } from "react";
import { useAtom } from "jotai";
import { chatInputAtom } from "@/store/chatStore";
import { getTagInfo } from "@/lib/helpers";
import GitHubDialog from "../github";
import type { ChatInputState } from "@/store/chatStore";
import { useAuth } from "@clerk/clerk-react";

const AgentToggle = ({
  chatId,
  agentMode,
  isNewChat,
}: {
  chatId: Id<"chats">;
  agentMode: boolean;
  isNewChat: boolean;
}) => {
  const [chatInput, setChatInput] = useAtom(chatInputAtom);
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);

  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={agentMode}
      onPressedChange={() => {
        if (isNewChat) {
          setChatInput({ ...chatInput, agentMode: !chatInput.agentMode });
        } else {
          updateChatInputMutation({
            chatId,
            updates: { agentMode: !agentMode },
          });
        }
      }}
    >
      <BotIcon className="h-4 w-4" />
      Agent
    </Toggle>
  );
};

const PlannerToggle = ({
  chatId,
  plannerMode,
  isNewChat,
}: {
  chatId: Id<"chats">;
  plannerMode?: boolean;
  isNewChat: boolean;
}) => {
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);
  const [chatInput, setChatInput] = useAtom(chatInputAtom);
  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={plannerMode}
      onPressedChange={() => {
        if (isNewChat) {
          setChatInput({ ...chatInput, plannerMode: !chatInput.plannerMode });
        } else {
          updateChatInputMutation({
            chatId,
            updates: {
              plannerMode: !plannerMode,
            },
          });
        }
      }}
    >
      <BrainIcon className="h-4 w-4" />
      Smort
    </Toggle>
  );
};

const WebSearchToggle = ({
  chatId,
  webSearch,
  isNewChat,
}: {
  chatId: Id<"chats">;
  webSearch?: boolean;
  isNewChat: boolean;
}) => {
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);
  const [chatInput, setChatInput] = useAtom(chatInputAtom);
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Toggle
          variant="outline"
          className={`hover:transition hover:duration-500 ${webSearch ? "bg-accent text-accent-foreground" : ""}`}
          aria-pressed={webSearch ?? false}
          pressed={webSearch ?? false}
          onPressedChange={() => {
            if (isNewChat) {
              setChatInput({ ...chatInput, webSearch: !chatInput.webSearch });
            } else {
              updateChatInputMutation({
                chatId,
                updates: {
                  webSearch: !webSearch,
                },
              });
            }
          }}
        >
          <Globe2Icon className="h-4 w-4" />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>
        <p>Search the web</p>
      </TooltipContent>
    </Tooltip>
  );
};

const ArtifactsToggle = ({
  chatId,
  artifacts,
}: {
  chatId: Id<"chats">;
  artifacts?: boolean;
}) => {
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);

  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={artifacts ?? false}
      onPressedChange={() => {
        updateChatInputMutation({
          chatId,
          updates: {
            artifacts: !artifacts,
          },
        });
      }}
    >
      <FileIcon className="h-4 w-4" />
      Artifacts
    </Toggle>
  );
};

export const ToolBar = ({
  isNewChat,
  chatInputData,
}: {
  isNewChat: boolean;
  chatInputData: ChatInputState;
}) => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const models = useQuery(api.chatInputs.queries.getModels, {
    chatId,
  });
  const handleFileUpload = useUploadDocuments();
  const handleSubmit = useHandleSubmit(isNewChat, chatId);

  const { isSignedIn } = useAuth();

  return (
    <div className="flex flex-row justify-between items-center w-full p-1">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
      />
      {isSignedIn && (
        <GitHubDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      )}

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

      <AgentToggle
        chatId={chatId}
        agentMode={chatInputData?.agentMode}
        isNewChat={isNewChat}
      />
      <PlannerToggle
        chatId={chatId}
        plannerMode={chatInputData?.plannerMode}
        isNewChat={isNewChat}
      />
      <div className="flex flex-row items-center gap-1">
        <Select
          value={models?.selectedModel.model_name}
          onValueChange={(value) => {
            if (isNewChat) {
              setChatInput({ ...chatInputData, model: value });
            } else {
              updateChatInputMutation({
                chatId,
                updates: { model: value },
              });
            }
          }}
        >
          <SelectTrigger>{models?.selectedModel.label}</SelectTrigger>
          <SelectContent>
            {models?.models.map((model, index) => (
              <SelectItem
                key={model.model}
                value={model.model_name}
                className={`${
                  model.model_name === models?.selectedModel.model_name
                    ? "bg-accent"
                    : ""
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
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={async () => {
            if (!["pending", "streaming"].includes(streamStatus ?? "")) {
              await handleSubmit(chatId);
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
