import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
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
import { useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

export const ProjectDetails = ({ projectId }: ProjectDetailsProps) => {
  const chatId = useAtomValue(chatIdAtom);
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const isProjectRoute = pathname.startsWith("/project/");

  const { data: project } = useQuery({
    ...convexQuery(
      api.projects.queries.get,
      projectId ? { projectId } : "skip"
    ),
  });
  const { mutateAsync: updateProject } = useMutation({
    mutationFn: useConvexMutation(api.projects.mutations.update),
  });
  const { mutateAsync: updateChatInput } = useMutation({
    mutationFn: useConvexMutation(api.chats.mutations.update),
  });
  const setNewChat = useSetAtom(newChatAtom);

  const debouncedUpdateSystemPrompt = useDebouncedCallback(
    (value: string, id: Id<"projects">) => {
      updateProject({
        projectId: id,
        updates: { systemPrompt: value },
      });
    },
    1000
  );

  useEffect(() => {
    return () => {
      debouncedUpdateSystemPrompt.cancel?.();
    };
  }, [debouncedUpdateSystemPrompt]);

  const [systemPrompt, setSystemPrompt] = useState<string>("");

  useEffect(() => {
    if (project) {
      setSystemPrompt(project.systemPrompt ?? "");
    }
  }, [project]);

  if (!project) return null;

  return (
    <div className="flex h-full flex-col gap-4 mx-auto">
      <div
        className={`${isProjectRoute ? "relative overflow-hidden rounded-lg border dark:border-border/60  bg-card p-4 shadow-sm " : "bg-transparent relative overflow-hidden rounded-lg"}`}
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0 w-full gap-1 flex flex-col">
            <div
              className={`${isProjectRoute ? "text-xl md:text-3xl font-bold tracking-tight flex items-center min-w-0 w-full justify-between" : "text-lg font-semibold tracking-tight flex items-center min-w-0 w-full justify-between"}`}
            >
              <span className="truncate pr-2 text-foreground/80">
                {project.name}
              </span>
              <Button
                aria-label="Clear project selection"
                variant="ghost"
                size="icon"
                className="cursor-pointer border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/10 bg-primary/10 ml-2 flex-shrink-0"
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
            {project.description && (
              <p
                className={`${isProjectRoute ? "py-2 text-muted-foreground max-h-24 overflow-y-auto text-justify" : "py-1 max-h-20 text-justify text-sm text-muted-foreground overflow-y-auto"}`}
              >
                {project.description}
              </p>
            )}
          </div>
        </div>

        {isProjectRoute && (
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute right-[-40%] top-[-40%] h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute bottom-[-30%] left-[-30%] h-48 w-48 rounded-full bg-secondary/20 blur-2xl" />
          </div>
        )}
      </div>

      {!isProjectRoute && <Separator />}

      <div
        className={`rounded-lg ${isProjectRoute ? "bg-card border dark:border-border/60 p-4" : "bg-muted/50"} shadow-sm gap-2 flex flex-col `}
      >
        <div
          className={`${isProjectRoute ? "text-xl font-semibold" : "text-lg font-semibold "} flex items-center justify-between text-foreground/80`}
        >
          System Prompt
          <span className="text-xs text-secondary-foreground/50">
            {systemPrompt.length} chars
          </span>
        </div>
        <AutosizeTextarea
          aria-label="System Prompt"
          defaultValue={project.systemPrompt}
          onChange={(e) =>
            debouncedUpdateSystemPrompt(e.target.value, project._id)
          }
          className="resize-none border shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 bg-card p-2 rounded-xl"
          minHeight={80}
          maxHeight={200}
        />
      </div>

      <div
        className={`flex flex-1 flex-col gap-3 rounded-lg ${isProjectRoute ? "bg-card border dark:border-border/60 p-4" : ""}`}
      >
        <div className="flex items-center justify-between">
          <h3
            className={`${isProjectRoute ? "text-xl font-semibold" : "text-lg font-semibold"} text-foreground/80  `}
          >
            Documents
          </h3>
          <AddDocumentControls projectId={project._id} />
        </div>
        <ProjectDocumentList projectId={project._id} />
      </div>
    </div>
  );
};
