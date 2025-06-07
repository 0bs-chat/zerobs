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
import { useAction, useMutation } from "convex/react";
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
import { useHandleSubmit } from "@/hooks/use-chats";
import { useParams } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import { getTagInfo } from "@/lib/react-utils";
import { useQuery } from "convex/react";
import { GitHubDialog } from "../github";
import { useGitHubStore, useIsDialogOpen } from "@/store/githubStore";

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
  const getModelAction = useAction(api.chatInputs.actions.getModels);
  const handleFileUpload = useUploadDocuments();
  const handleSubmit = useHandleSubmit();
  const [getModelResult, setGetModelResult] = useState<Awaited<
    ReturnType<typeof getModelAction>
  > | null>(null);

  const isDialogOpen = useIsDialogOpen();
  const setIsDialogOpen = useGitHubStore((state) => state.setDialogOpen);

  useEffect(() => {
    const fetchModel = async () => {
      const result = await getModelAction({
        chatId: chatId,
      });
      setGetModelResult(result);
    };
    fetchModel();
  }, [chatId, getModelAction]);

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

        <Toggle
          variant="outline"
          className="hover:transition hover:duration-500"
          pressed={chatInput?.agentMode ?? false}
          onPressedChange={() => {
            if (!chatInput?.chatId) return;
            updateChatInputMutation({
              chatId: chatInput.chatId,
              updates: {
                agentMode: !chatInput?.agentMode,
              },
            });
          }}
        >
          <BotIcon className="h-4 w-4" />
          Agent
        </Toggle>

        <Toggle
          variant="outline"
          className="hover:transition hover:duration-500"
          pressed={chatInput?.plannerMode ?? false}
          onPressedChange={() => {
            if (!chatInput?.chatId) return;
            updateChatInputMutation({
              chatId: chatInput.chatId,
              updates: {
                plannerMode: !chatInput?.plannerMode,
              },
            });
          }}
        >
          <BrainIcon className="h-4 w-4" />
          Smort
        </Toggle>

        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <Toggle
              variant="outline"
              className={`hover:transition hover:duration-500 ${chatInput?.webSearch ? "bg-accent text-accent-foreground" : ""}`}
              aria-pressed={chatInput?.webSearch ?? false}
              pressed={chatInput?.webSearch ?? false}
              onPressedChange={() => {
                if (!chatInput?.chatId) return;
                updateChatInputMutation({
                  chatId: chatInput.chatId,
                  updates: {
                    webSearch: !chatInput?.webSearch,
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
      </div>

      <div className="flex flex-row items-center gap-1">
        <Select
          onValueChange={(value) =>
            updateChatInputMutation({
              chatId: chatInput?.chatId!,
              updates: {
                model: value,
              },
            })
          }
        >
          <SelectTrigger>{getModelResult?.selectedModel.label}</SelectTrigger>
          <SelectContent>
            {getModelResult?.models.map((model) => (
              <SelectItem
                key={model.model}
                value={model.model}
                className={`${
                  model.model === getModelResult?.selectedModel.model
                    ? "bg-accent"
                    : ""
                }`}
              >
                <div className="flex flex-col w-full gap-2">
                  <span className={`text-foreground`}>{model.label}</span>
                  {model.tags && (
                    <div className="flex flex-row gap-1 ">
                      {model.tags?.map((tag) => {
                        const { icon: Icon, className: IconClassName } =
                          getTagInfo(tag);
                        return (
                          <Badge
                            key={tag}
                            className={`flex items-center gap-1 text-foreground bg-input/80`}
                          >
                            <Icon className={`h-3 w-3 ${IconClassName}`} />
                            {tag}
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
