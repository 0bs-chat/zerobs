import { chatMessageVariants, layoutTransition } from "@/lib/motion";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { Id } from "../../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, FolderOpen, PlusIcon, TimerReset } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import {
  AutosizeTextarea,
  type AutosizeTextAreaRef,
} from "@/components/ui/autosize-textarea";
import { useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import { selectedProjectIdAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { ModeToggle } from "@/components/theme-switcher";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProjectDocumentList } from "@/components/chat/panels/projects/document-list";
import { AddDocumentControls } from "@/components/chat/panels/projects/add-document-controls";

export const Route = createFileRoute("/projects/$projectId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ProjectDetails />;
}

function ProjectDetails() {
  const params = useParams({ strict: false });
  const projectId = params.projectId as Id<"projects">;
  const navigate = useNavigate();
  const projectDetails = useQuery(api.projects.queries.get, {
    projectId,
  });
  const setSelectedProjectId = useSetAtom(selectedProjectIdAtom);
  const updateProject = useMutation(api.projects.mutations.update);
  const projectChats = useQuery(api.chats.queries.getByProjectId, {
    projectId,
  });
  const systemPromptRef = useRef<AutosizeTextAreaRef>(null);

  const debouncedUpdateProject = useDebouncedCallback((text: string) => {
    updateProject({
      projectId,
      updates: { systemPrompt: text },
    });
  }, 500);

  return (
    <motion.div
      variants={chatMessageVariants}
      initial="initial"
      animate="animate"
      transition={layoutTransition}
    >
      <div className="flex h-screen flex-col overflow-y-auto bg-background w-full">
        <div className="container mx-auto flex max-w-8xl flex-1 flex-col p-3 pb-6 lg:max-h-dvh lg:overflow-y-hidden lg:p-6">
          <div className="mb-8 max-md:px-2">
            {/* header */}
            <div className="mb-6 flex items-center justify-between">
              <Button
                variant="ghost"
                className=" cursor-pointer"
                onClick={() => {
                  navigate({ to: "/projects" });
                }}
              >
                <ArrowLeft className="h-6 w-6" />
                Back to projects
              </Button>
              <ModeToggle />
            </div>

            {/* project details */}
            <div className="flex gap-3 py-6">
              <div className="flex items-center justify-center ">
                <FolderOpen className="w-10 h-10 text-accent-foreground fill-accent" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-3xl font-bold">{projectDetails?.name}</h1>
                <div className="text-sm text-muted-foreground">
                  {projectDetails?.description}
                </div>
              </div>
            </div>

            <div className="flex gap-6 w-full h-full justify-center items-start py-4">
              {/* project details */}
              <div className="flex-1 flex flex-col gap-4 w-4/6">
                <div className="flex gap-3.5 flex-col">
                  <div className="text-xl font-semibold">System Prompt</div>
                  <div className="flex items-center gap-2 w-full rounded-md ">
                    <AutosizeTextarea
                      minHeight={40}
                      maxHeight={120}
                      ref={systemPromptRef}
                      onChange={() => {
                        if (systemPromptRef?.current) {
                          debouncedUpdateProject(
                            systemPromptRef.current.textArea.value
                          );
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          systemPromptRef.current?.textArea.blur();

                          e.preventDefault();
                          if (systemPromptRef?.current) {
                            debouncedUpdateProject(
                              systemPromptRef.current.textArea.value
                            );
                          }
                          toast.success("System prompt updated");
                        }
                      }}
                      className="text text-muted-foreground w-full bg-background border rounded px-3 py-2 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-2 focus-visible:ring-accent"
                      defaultValue={projectDetails?.systemPrompt}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center w-full pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <TimerReset className="h-4 w-4" />
                    Recent Chats
                  </div>
                  <Button
                    variant="outline"
                    className=" cursor-pointer"
                    onClick={() => {
                      setSelectedProjectId(projectId);
                      navigate({ to: "/" });
                    }}
                  >
                    <PlusIcon className="h-6 w-6" />
                    New chat
                  </Button>
                </div>

                <div className="flex flex-col gap-4 h-full overflow-y-auto pb-8 scrollbar-hide">
                  {projectChats?.map((chat) => (
                    <Card
                      key={chat._id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors duration-300 "
                      onClick={() => {
                        navigate({
                          to: "/chat/$chatId",
                          params: { chatId: chat._id },
                        });
                      }}
                    >
                      <CardHeader className="flex flex-row justify-between items-center">
                        <div className="flex flex-col gap-2">
                          <CardTitle>{chat.name}</CardTitle>
                          <CardDescription>{chat.text}</CardDescription>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNowStrict(
                            new Date(chat.updatedAt ?? chat._creationTime),
                            { addSuffix: true }
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>

              {/* add document controls */}
              <div className="w-2/6 h-full flex flex-col gap-4">
                <div className="flex flex-col gap-2 ">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h3 className="text-lg font-semibold">Documents</h3>
                    </div>
                    <AddDocumentControls projectId={projectId} />
                  </div>
                  <ScrollArea className="h-[calc(100vh-19rem)] ">
                    <ProjectDocumentList projectId={projectId} />
                  </ScrollArea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
