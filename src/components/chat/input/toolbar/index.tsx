import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  BotIcon,
  GithubIcon,
  PaperclipIcon,
  PlusIcon,
  ImageIcon,
  VideoIcon,
  FileTextIcon,
  FileIcon,
  AudioLinesIcon,
  BrainIcon,
  Globe2Icon,
  ArrowUp,
} from "lucide-react";
import { ProjectsDropdown } from "./projects-dropdown";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useNavigate, useParams } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { useEffect, useRef, useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GitHubDialog } from "../github/github-dialog";
import { DocumentList } from "../document-list";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { useChatPreferencesStore } from "@/store/useChatPreferencesStore";
import { useIsDialogOpen, useGitHubStore } from "@/store/githubStore";

const getTagInfo = (tag: string) => {
  switch (tag) {
    case "text":
      return {
        icon: FileTextIcon,
        className: "bg-blue-500/20 backdrop-blur-sm",
      };
    case "image":
      return { icon: ImageIcon, className: "bg-green-500/20 backdrop-blur-sm" };
    case "audio":
      return {
        icon: AudioLinesIcon,
        className: "bg-purple-500/20 backdrop-blur-sm",
      };
    case "video":
      return { icon: VideoIcon, className: "bg-red-500/20 backdrop-blur-sm" };
    case "pdf":
      return { icon: FileIcon, className: "bg-orange-500/20 backdrop-blur-sm" };
    default:
      return { icon: FileIcon, className: "bg-gray-500/20 backdrop-blur-sm" };
  }
};

export const ChatInputToolbar = () => {
  const params = useParams({ strict: false });
  const chatId: Id<"chats"> = params.chatId as Id<"chats">;
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isGitHubDialogOpen = useIsDialogOpen();
  const setDialogOpen = useGitHubStore((state) => state.setDialogOpen);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { preferences, updatePreferences } = useChatPreferencesStore();
  const { chatInputText, setChatInputText } = useChatPreferencesStore();

  const chatInputQuery = useQuery(api.chatInputs.queries.get, { chatId });

  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);
  const generateUploadUrlMutation = useMutation(
    api.documents.mutations.generateUploadUrl
  );
  const createMultipleMutation = useMutation(
    api.documents.mutations.createMultiple
  );
  const getModelAction = useAction(api.chatInputs.actions.getModels);
  const createChatMutation = useMutation(api.chats.mutations.create);
  const createChatInputMutation = useMutation(api.chatInputs.mutations.create);
  const sendAction = useAction(api.chats.actions.send);
  const [getModelResult, setGetModelResult] = useState<Awaited<
    ReturnType<typeof getModelAction>
  > | null>(null);

  useEffect(() => {
    const fetchModel = async () => {
      const result = await getModelAction({
        chatId,
      });
      setGetModelResult(result);
    };
    fetchModel();
  }, [chatId, getModelAction]);

  const handleRemoveDocument = (documentId: Id<"documents">) => {
    if (!chatInputQuery?.documents) return;
    if (chatId === "new") return;
    updateChatInputMutation({
      chatId: chatId,
      updates: {
        documents: chatInputQuery?.documents.filter((id) => id !== documentId),
      },
    });
  };
  const handleFileUpload = async (files: FileList) => {
    try {
      const uploadedStorageIds: Id<"_storage">[] = [];

      for (const file of Array.from(files)) {
        // Get upload URL
        const uploadUrlResult = await generateUploadUrlMutation();

        // Upload file
        const result = await fetch(uploadUrlResult, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Upload failed: ${result.statusText}`);
        }

        // Create document
        const { storageId } = await result.json();

        uploadedStorageIds.push(storageId);
      }

      const documentIds = await createMultipleMutation({
        documents: uploadedStorageIds.map((storageId, index) => {
          const file = files[index];
          return {
            name: file.name,
            type: "file",
            size: file.size,
            key: storageId,
          };
        }),
      });

      // Update chat input with new documents
      const existingDocuments = chatInputQuery?.documents || [];
      await updateChatInputMutation({
        chatId,
        updates: {
          documents: [...existingDocuments, ...documentIds],
        },
      });

      toast(
        `${files.length} file${files.length > 1 ? "s" : ""} uploaded successfully`
      );
    } catch (error) {
      console.error("Upload error:", error);
      toast("Error uploading files", {
        description: "There was an error uploading your files",
      });
    }
  };

  const handleSubmit = async () => {
    if (chatId === "new") {
      const newChatId = await createChatMutation({ name: "New Chat" });
      await createChatInputMutation({
        chatId: newChatId,
        text: chatInputText,
        model: preferences?.model,
        agentMode: preferences?.agentMode,
        plannerMode: preferences?.plannerMode,
        webSearch: preferences?.webSearch,
        documents: chatInputQuery?.documents,
        projectId: chatInputQuery?.projectId,
      });
      navigate({ to: "/chat/$chatId", params: { chatId: newChatId } });
      setChatInputText("");
      await sendAction({ chatId: newChatId });
    } else {
      await updateChatInputMutation({
        chatId: chatId,
        updates: {
          text: chatInputText,
          documents: chatInputQuery?.documents,
          projectId: chatInputQuery?.projectId,
          plannerMode: preferences?.plannerMode,
          agentMode: preferences?.agentMode,
          webSearch: preferences?.webSearch,
          model: preferences?.model,
        },
      });
      setChatInputText("");
      await sendAction({ chatId: chatId });
    }
  };

  return (
    <div className="flex flex-col max-w-4xl w-full mx-auto items-center bg-muted rounded-lg">
      {/* Document List (Shadcn Scroll Area) */}
      <DocumentList
        documentIds={chatInputQuery?.documents}
        onRemove={handleRemoveDocument}
      />

      {/* Input */}
      <AutosizeTextarea
        minHeight={56}
        maxHeight={192}
        className="resize-none bg-transparent ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 border-none p-3"
        value={chatInputText}
        defaultValue={chatInputQuery?.text}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          setChatInputText(e.target.value);
          updateChatInputMutation({
            chatId: chatId,
            updates: {
              text: e.target.value,
            },
          });
        }}
        onKeyDown={useCallback(
          async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              await handleSubmit();
            }
          },
          [handleSubmit]
        )}
        placeholder="Type a message..."
      />

      <div className="flex flex-row justify-between items-center w-full p-1">
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
        />
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
                onSelect={() => {
                  setIsDropdownOpen(false);
                  setDialogOpen(true);
                }}
              >
                <GithubIcon className="w-4 h-4" />
                Add GitHub Repo
              </DropdownMenuItem>
              <ProjectsDropdown />
            </DropdownMenuContent>
          </DropdownMenu>

          <GitHubDialog
            open={isGitHubDialogOpen}
            onOpenChange={setDialogOpen}
          />

          <Toggle
            variant="outline"
            className="hover:transition hover:duration-500"
            pressed={preferences?.agentMode}
            onPressedChange={() => {
              updatePreferences({
                agentMode: !preferences?.agentMode,
              });
            }}
          >
            <BotIcon className="h-4 w-4" />
            Agent
          </Toggle>

          <Toggle
            variant="outline"
            className="hover:transition hover:duration-500"
            pressed={preferences?.plannerMode}
            onPressedChange={() => {
              updatePreferences({
                plannerMode: !preferences?.plannerMode,
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
                className={`hover:transition hover:duration-500 ${preferences?.webSearch ? "bg-accent text-accent-foreground" : ""}`}
                aria-pressed={preferences?.webSearch}
                pressed={preferences?.webSearch}
                onPressedChange={() => {
                  updatePreferences({
                    webSearch: !preferences?.webSearch,
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
              updatePreferences({
                model: value,
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
                          const { icon: Icon, className } = getTagInfo(tag);
                          return (
                            <Badge
                              key={tag}
                              className={`flex items-center gap-1 text-foreground ${className}`}
                            >
                              <Icon className="h-3 w-3 " />
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
    </div>
  );
};
