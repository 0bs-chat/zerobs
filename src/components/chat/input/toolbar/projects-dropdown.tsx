import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { FoldersIcon, PlusIcon } from "lucide-react";
import {
  createProjectDialogOpenAtom,
  resizePanelOpenAtom,
  selectedPanelTabAtom,
} from "@/store/chatStore";
import { useSetAtom } from "jotai";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";
import { useProjects } from "@/hooks/chats/use-projects";

interface ProjectsDropdownProps {
  onCloseDropdown: () => void;
}

export const ProjectsDropdown = ({
  onCloseDropdown,
}: ProjectsDropdownProps) => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;

  const projects = useProjects(3);
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const setProjectDialogOpen = useSetAtom(createProjectDialogOpenAtom);
  const setResizePanelOpen = useSetAtom(resizePanelOpenAtom);
  const setSelectedPanelTab = useSetAtom(selectedPanelTabAtom);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <div className="flex items-center gap-2">
          <FoldersIcon className="w-4 h-4" />
          <span>Projects</span>
        </div>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="ml-2">
        {projects?.page.slice(0, 3).map((project) => (
          <DropdownMenuItem
            key={project._id}
            onSelect={() => {
              updateChatMutation({
                chatId,
                updates: {
                  projectId: project._id,
                },
              });
              onCloseDropdown();
              setResizePanelOpen(true);
              setSelectedPanelTab("projects");
            }}
          >
            {project.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onCloseDropdown();
            setProjectDialogOpen(true);
          }}
        >
          <PlusIcon className="w-4 h-4" />
          Add New Project
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
