import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { useDebouncedCallback } from "use-debounce";
import { AddDocumentControls } from "./add-document-controls";
import { ProjectDocumentList } from "./document-list";
import type { ProjectDetailsProps } from "./types";
import { useAtomValue } from "jotai";
import { chatIdAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { newChatAtom } from "@/store/chatStore";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const ProjectDetails = ({ projectId }: ProjectDetailsProps) => {
  const chatId = useAtomValue(chatIdAtom);
  const navigate = useNavigate();
  const router = useRouter();
  const { data: project } = useQuery({
    ...convexQuery(
      api.projects.queries.get,
      projectId ? { projectId } : "skip"
    ),
  });
  const { mutate: updateProject } = useMutation({
    mutationFn: useConvexMutation(api.projects.mutations.update),
  });
  const { mutate: updateChatInput } = useMutation({
    mutationFn: useConvexMutation(api.chats.mutations.update),
  });
  const setNewChat = useSetAtom(newChatAtom);

  const debouncedUpdateSystemPrompt = useDebouncedCallback((value: string) => {
    updateProject({
      projectId: projectId!,
      updates: {
        systemPrompt: value,
      },
    });
  }, 1000);

  const [systemPrompt, setSystemPrompt] = useState<string>("");

  useEffect(() => {
    if (project) {
      setSystemPrompt(project.systemPrompt ?? "");
    }
  }, [project]);

  if (!project) return null;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative overflow-hidden rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight">{project.name}</h2>
            {project.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
          <Button
            aria-label="Clear project selection"
            variant="outline"
            size="icon"
            className="cursor-pointer hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              if (router.state.location.pathname.startsWith("/project/")) {
                navigate({ to: "/projects" });
              }

              if (chatId !== "new") {
                updateChatInput({
                  chatId,
                  updates: {
                    projectId: null,
                  },
                });
              } else {
                setNewChat((prev) => ({
                  ...prev,
                  projectId: null,
                }));
              }
            }}
          >
            <XIcon className="size-5" />
          </Button>
        </div>

        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute right-[-40%] top-[-40%] h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute bottom-[-30%] left-[-30%] h-48 w-48 rounded-full bg-secondary/20 blur-2xl" />
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold">System Prompt</h3>
          <span className="text-xs text-secondary-foreground">
            {systemPrompt.length} chars
          </span>
        </div>
        <AutosizeTextarea
          value={systemPrompt}
          onChange={(e) => {
            const value = e.target.value;
            setSystemPrompt(value);
            debouncedUpdateSystemPrompt(value);
          }}
          placeholder={
            project.systemPrompt ??
            "Guide the assistant with context, tone, and constraints..."
          }
          className="min-h-[80px] max-h-[200px] border w-full resize-none rounded-md bg-background/70 p-3 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-secondary/40 focus-visible:ring-offset-0"
          minHeight={80}
          maxHeight={160}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Documents</h3>
          <AddDocumentControls projectId={project._id} />
        </div>
        <ProjectDocumentList projectId={project._id} />
      </div>
    </div>
  );
};
