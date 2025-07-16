import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Folder, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { useDebouncedCallback } from "use-debounce";
import { AddDocumentControls } from "./add-document-controls";
import { ProjectDocumentList } from "./document-list";
import type { ProjectDetailsProps } from "./types";
import { selectedProjectIdAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { useParams } from "@tanstack/react-router";
import type { Id } from "node_modules/convex/dist/esm-types/values/value";

export const ProjectDetails = ({ projectId }: ProjectDetailsProps) => {
  const project = useQuery(
    api.projects.queries.get,
    projectId ? { projectId } : "skip"
  );
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;
  const updateProject = useMutation(api.projects.mutations.update);
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const setSelectedProjectId = useSetAtom(selectedProjectIdAtom);
  const debouncedUpdateSystemPrompt = useDebouncedCallback((value: string) => {
    updateProject({
      projectId: projectId!,
      updates: {
        systemPrompt: value,
      },
    });
  }, 1000);

  const handlecloseProject = () => {
    if (chatId === undefined || chatId === null || chatId === "") {
      setSelectedProjectId(null);
    } else {
      setSelectedProjectId(null);
      updateChatMutation({
        chatId,
        updates: {
          projectId: null,
        },
      });
    }
  };

  if (!project) return null;

  return (
    <div className="flex flex-col gap-5 h-full ">
      <div className="flex flex-col gap-1 ">
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center justify-start w-full">
            <Folder className="w-6 h-6 fill-accent text-accent-foreground/70" />
            <h3 className="font-medium text-lg">{project.name}</h3>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="cursor-pointer"
            onClick={() => handlecloseProject()}
          >
            <XIcon className="size-5" />
          </Button>
        </div>
        <div>
          {project.description && (
            <p className="text-muted-foreground">{project.description}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">System Prompt</h3>
        <AutosizeTextarea
          defaultValue={project.systemPrompt}
          onChange={(e) => debouncedUpdateSystemPrompt(e.target.value)}
          className="resize-none border shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 bg-card p-2 opacity-90"
          minHeight={80}
          maxHeight={200}
        />
      </div>

      <div className="flex flex-col gap-2 ">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Documents</h3>
          </div>
          <AddDocumentControls projectId={project._id} />
        </div>
        <ScrollArea className="h-[calc(100vh-19rem)] ">
          <ProjectDocumentList projectId={project._id} />
        </ScrollArea>
      </div>
    </div>
  );
};
