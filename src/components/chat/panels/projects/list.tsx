import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusIcon, TrashIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

import type { ProjectsListProps } from "./types";
import { Checkbox } from "@/components/ui/checkbox";
import { selectedProjectIdAtom } from "@/store/chatStore";
import { useAtomValue } from "jotai";

export const ProjectsList = ({
  onNewProject,
  onRemove,
  onOpen,
  onSelect,
}: ProjectsListProps) => {
  const allProjects = useQuery(api.projects.queries.getAll, {
    paginationOpts: { numItems: 20, cursor: null },
  });

  const selectedProjectId = useAtomValue(selectedProjectIdAtom);

  return (
    <div className="flex flex-col gap-3 h-full ">
      <div className="flex items-center text-center justify-between">
        <h2 className="text-xl font-bold">Select a Project</h2>
        <Button
          variant="default"
          size="sm"
          className="bg-primary text-primary-foreground"
          onClick={onNewProject}
        >
          <PlusIcon className="size-4" />
          New Project
        </Button>
      </div>
      <ScrollArea className="h-[calc(100vh-10rem)] ">
        <div className="flex flex-col gap-2 overflow-y-auto">
          {allProjects?.page.map((project) => (
            <Card
              key={project._id}
              className="group rounded-md flex-row relative group/card px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-accent/30 duration-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => onOpen(project._id)}
            >
              <div className="flex items-center justify-between flex-1 ">
                <div className="flex items-center gap-2">
                  <Checkbox
                    className="size-4 border-muted-foreground"
                    checked={selectedProjectId === project._id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelect(project._id);
                    }}
                  />
                  <h3 className="font-medium">{project.name}</h3>
                </div>

                {project.description && (
                  <p className="text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}
              </div>
              <Button
                variant="default"
                size="icon"
                className="absolute top-2 right-2 z-20 opacity-0 group-hover/card:opacity-100 transition-[opacity] duration-0 group-hover/card:duration-300"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRemove(project._id);
                }}
              >
                <TrashIcon className="size-5" />
              </Button>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
