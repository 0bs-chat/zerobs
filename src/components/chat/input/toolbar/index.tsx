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
import { useRef, useState } from "react";
import { getTagInfo } from "@/lib/helpers";
import { GitHubDialog } from "../github";

const AgentToggle = ({
  chatId,
  agentMode,
}: {
  chatId: Id<"chats">;
  agentMode?: boolean;
}) => {
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);

  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={agentMode ?? false}
      onPressedChange={() => {
        updateChatInputMutation({
          chatId,
          updates: {
            agentMode: !agentMode,
          },
        });
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
}: {
  chatId: Id<"chats">;
  plannerMode?: boolean;
}) => {
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);

  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={plannerMode ?? false}
      onPressedChange={() => {
        updateChatInputMutation({
          chatId,
          updates: {
            plannerMode: !plannerMode,
          },
        });
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
}: {
  chatId: Id<"chats">;
  webSearch?: boolean;
}) => {
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Toggle
          variant="outline"
          className={`hover:transition hover:duration-500 ${webSearch ? "bg-accent text-accent-foreground" : ""}`}
          aria-pressed={webSearch ?? false}
          pressed={webSearch ?? false}
          onPressedChange={() => {
            updateChatInputMutation({
              chatId,
              updates: {
                webSearch: !webSearch,
              },
            });
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

export const ToolBar = ({
  chatInput,
}: {
  chatInput: ReturnType<typeof useQuery<typeof api.chatInputs.queries.get>>;
}) => {
  const params = useParams({ strict: false });
  const chatId: Id<"chats"> = params.chatId as Id<"chats">;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);
  const models = useQuery(api.chatInputs.queries.getModels, {
    chatId,
  });
  const handleFileUpload = useUploadDocuments();
  const handleSubmit = useHandleSubmit();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

        <AgentToggle chatId={chatId} agentMode={chatInput?.agentMode} />
        <PlannerToggle chatId={chatId} plannerMode={chatInput?.plannerMode} />
        <WebSearchToggle chatId={chatId} webSearch={chatInput?.webSearch} />
      </div>

      <div className="flex flex-row items-center gap-1">
        <Select
          value={models?.selectedModel.model_name}
          onValueChange={(value) =>
            updateChatInputMutation({
              chatId: chatId,
              updates: {
                model: value,
              },
            })
          }
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
          onClick={async () => await handleSubmit()}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
