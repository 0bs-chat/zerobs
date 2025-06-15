import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { useDebouncedCallback } from "use-debounce";
import { AddDocumentControls } from "./add-document-controls";
import { ProjectDocumentList } from "./document-list";
import type { ProjectDetailsProps } from "./types";

export const ProjectDetails = ({
  openedProjectId,
  onBack,
}: ProjectDetailsProps) => {
  const project = useQuery(
    api.projects.queries.get,
    openedProjectId
      ? {
          projectId: openedProjectId as Id<"projects">,
        }
      : "skip"
  );
  const updateProject = useMutation(api.projects.mutations.update);

  const debouncedUpdateSystemPrompt = useDebouncedCallback((value: string) => {
    updateProject({
      projectId: openedProjectId,
      updates: {
        systemPrompt: value,
      },
    });
  }, 1000);

  if (!project) return null;

  return (
    <div className="flex flex-col gap-4 h-full ">
      <div className="flex flex-col gap-0 ">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{project.name}</h2>
          <Button
            variant="outline"
            size="icon"
            className="cursor-pointer"
            onClick={onBack}
          >
            <XIcon className="size-5" />
          </Button>
        </div>
        {project.description && (
          <p className="text-muted-foreground">{project.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">System Prompt</h3>
        <AutosizeTextarea
          defaultValue={project.systemPrompt}
          onChange={(e) => debouncedUpdateSystemPrompt(e.target.value)}
          className="resize-none border shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 bg-card p-2"
          minHeight={80}
          maxHeight={200}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between ">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Documents</h3>
          </div>
          <AddDocumentControls projectId={openedProjectId} />
        </div>
        <ScrollArea className="h-[400px]">
          <ProjectDocumentList projectId={openedProjectId} />
        </ScrollArea>
      </div>
    </div>
  );
};
