import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusIcon, TrashIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

import type { ProjectsListProps } from "./types";

export const ProjectsList = ({ onSelect, onNewProject, onRemove }: ProjectsListProps) => {
  const allProjects = useQuery(api.projects.queries.getAll, {
    paginationOpts: { numItems: 20, cursor: null },
  });

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
      <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
        <div className="flex flex-col gap-2 overflow-y-auto">
          {allProjects?.page.map((project) => (
            <Card
              key={project._id}
              className="group rounded-md flex-row relative group/card px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-accent/30 duration-300 transition-colors"
              onClick={() => onSelect(project._id)}
            >
              <div className="flex items-center justify-between flex-1">
                <h3 className="font-medium">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}
              </div>
              <Button
                variant="default"
                size="icon"
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
