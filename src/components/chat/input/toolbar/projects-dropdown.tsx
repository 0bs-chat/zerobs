import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import { FoldersIcon, PlusIcon } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorState } from "@/components/ui/error-state";
import {
  createProjectDialogOpenAtom,
  newChatAtom,
  resizePanelOpenAtom,
  selectedPanelTabAtom,
} from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { useAtomValue } from "jotai";
import { chatIdAtom } from "@/store/chatStore";

interface ProjectsDropdownProps {
  onCloseDropdown: () => void;
}

export const ProjectsDropdown = ({
  onCloseDropdown,
}: ProjectsDropdownProps) => {
  const chatId = useAtomValue(chatIdAtom);
  const {
    data: projects,
    isLoading: isLoadingProjects,
    isError: isProjectsError,
    error: projectsError,
  } = useQuery({
    ...convexQuery(api.projects.queries.getAll, {
      paginationOpts: { numItems: 3, cursor: null },
    }),
  });
  const { mutate: updateChatMutation } = useMutation({
    mutationFn: useConvexMutation(api.chats.mutations.update),
  });
  const setProjectDialogOpen = useSetAtom(createProjectDialogOpenAtom);
  const setResizePanelOpen = useSetAtom(resizePanelOpenAtom);
  const setSelectedPanelTab = useSetAtom(selectedPanelTabAtom);
  const setNewChat = useSetAtom(newChatAtom);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <div className="flex items-center gap-2">
          <FoldersIcon className="w-4 h-4" />
          <span>Projects</span>
        </div>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="ml-2">
        {isProjectsError ? (
          <ErrorState error={projectsError} />
        ) : (
          <>
            {isLoadingProjects ? (
              <DropdownMenuItem>
                <LoadingSpinner
                  className="h-4 w-4"
                  label="Loading projects..."
                />
              </DropdownMenuItem>
            ) : (
              projects?.page?.slice(0, 3).map((project: any) => (
                <DropdownMenuItem
                  key={project._id}
                  onSelect={() => {
                    if (chatId === "new") {
                      setNewChat((prev) => ({
                        ...prev,
                        projectId: project._id,
                      }));
                    } else {
                      updateChatMutation({
                        chatId,
                        updates: {
                          projectId: project._id,
                        },
                      });
                    }
                    onCloseDropdown();
                    setResizePanelOpen(true);
                    setSelectedPanelTab("projects");
                  }}
                >
                  {project.name}
                </DropdownMenuItem>
              ))
            )}
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
          </>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
};
