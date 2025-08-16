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
  XIcon,
  FoldersIcon,
} from "lucide-react";
import { ProjectsDropdown } from "./projects-dropdown";
import { useUploadDocuments } from "@/hooks/chats/use-documents";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
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
import { buttonHover, smoothTransition } from "@/lib/motion";
import { ModelPopover } from "./model-popover";
import { useRouter } from "@tanstack/react-router";
import { AgentToggles } from "./agent-toggles";
import { useApiKeys } from "@/hooks/use-apikeys";

export const ToolBar = () => {
  const chatId = useAtomValue(chatIdAtom);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { mutate: updateChatMutation } = useMutation({
    mutationFn: useConvexMutation(api.chats.mutations.update),
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const streamStatus = useAtomValue(streamStatusAtom);
  const { mutate: cancelStreamMutation } = useMutation({
    mutationFn: useConvexMutation(api.streams.mutations.cancel),
  });
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
  useApiKeys();

  // Get project details if chat has a project
  const { data: project } = useQuery({
    ...convexQuery(
      api.projects.queries.get,
      chat.projectId ? { projectId: chat.projectId } : "skip"
    ),
  });

  const handleFileUpload = useUploadDocuments({ type: "file", chat });
  const handleSubmit = useHandleSubmit();

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

  // selected toggles handled in AgentToggles

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
        <AgentToggles />
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
