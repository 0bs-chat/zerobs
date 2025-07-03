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
import { Badge } from "@/components/ui/badge";
import { useChatState, useHandleSubmit } from "@/hooks/chats/use-chats";
import { ClientOnly } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { getTagInfo } from "@/lib/helpers";
import { useAuth } from "@clerk/clerk-react";
import { ConductorToggle } from "./conductorToggle";
import { DeepSearchToggle } from "./deepSearchToggle";
import { useAtom } from "jotai";
import { streamStatusAtom } from "@/store/chatStore";
import GitHubDialog from "../github";
import { toast } from "sonner";
import { useChatId } from "@/hooks/chats/use-chats";
import { WebSearchToggle } from "./webSearchToggle";

export const ToolBar = () => {
  const chatId = useChatId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [streamStatus] = useAtom(streamStatusAtom);
  const cancelStreamMutation = useMutation(api.streams.mutations.cancel);

  const models = useQuery(api.models.getModels);
  const { data, save } = useChatState();

  const getModelFromChat = useQuery(
    api.chats.queries.get,
    !chatId || chatId === null ? "skip" : { chatId }
  );

  const selectedModel = getModelFromChat?.model ?? data?.model;

  const handleFileUpload = useUploadDocuments();
  const handleSubmit = useHandleSubmit();

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
      <ClientOnly fallback={<div>Loading....</div>}>
        {isSignedIn && (
          <GitHubDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
        )}
      </ClientOnly>

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
        <ConductorToggle />
        <DeepSearchToggle />
        <WebSearchToggle />
      </div>

      <div className="flex flex-row items-center gap-1">
        <Select
          value={selectedModel}
          onValueChange={(value) => {
            save({ model: value });
          }}
        >
          <SelectTrigger>{selectedModel}</SelectTrigger>
          <SelectContent>
            {models?.map((model, index) => (
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
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={async () => {
            if (!["pending", "streaming"].includes(streamStatus ?? "")) {
              await handleSubmit();
            } else {
              if (chatId && chatId !== "" && chatId !== undefined) {
                await cancelStreamMutation({ chatId });
              }
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
