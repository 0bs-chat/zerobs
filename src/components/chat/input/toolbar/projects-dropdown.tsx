import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { FoldersIcon, PlusIcon } from "lucide-react";
import {
  projectDialogOpenAtom,
  rightPanelVisibilityAtom,
  rightPanelActiveTabAtom,
} from "@/store/chatStore";
import { useSetAtom } from "jotai";

interface ProjectsDropdownProps {
  onCloseDropdown: () => void;
}

export const ProjectsDropdown = ({
  onCloseDropdown,
}: ProjectsDropdownProps) => {
  const projects = useQuery(api.projects.queries.getAll, {
    paginationOpts: { numItems: 6, cursor: null },
  });
  const setProjectDialogOpen = useSetAtom(projectDialogOpenAtom);
  const setRightPanelVisible = useSetAtom(rightPanelVisibilityAtom);
  const setRightPanelActiveTab = useSetAtom(rightPanelActiveTabAtom);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <div className="flex items-center gap-2">
          <FoldersIcon className="w-4 h-4" />
          <span>Projects</span>
        </div>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="ml-2">
        {projects?.page.slice(0, 6).map((project) => (
          <DropdownMenuItem
            key={project._id}
            onSelect={() => {
              onCloseDropdown();
              setRightPanelVisible(true);
              setRightPanelActiveTab("projects");
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
