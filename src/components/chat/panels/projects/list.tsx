import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLinkIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useSetAtom } from "jotai";
import {
  createProjectDialogOpenAtom,
  newChatProjectIdAtom,
  resizePanelOpenAtom,
} from "@/store/chatStore";

export const ProjectsList = () => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;
  const navigate = useNavigate();
  const allProjects = useQuery(api.projects.queries.getAll, {
    paginationOpts: { numItems: 20, cursor: null },
  });

  const updateChatMutation = useMutation(api.chats.mutations.update);
  const removeProjectMutation = useMutation(api.projects.mutations.remove);
  const setProjectDialogOpen = useSetAtom(createProjectDialogOpenAtom);
  const setResizePanelOpen = useSetAtom(resizePanelOpenAtom);

  const setNewChatProjectId = useSetAtom(newChatProjectIdAtom);

  return (
    <div className="flex flex-col gap-3 h-full ">
      <div className="flex items-center text-center justify-between">
        <h2 className="text-xl font-bold">Select a Project</h2>
        <Button
          variant="default"
          size="sm"
          className="bg-primary text-primary-foreground"
          onClick={() => {
            setProjectDialogOpen(true);
          }}
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
              className="group flex-row relative group/card px-4 py-4 flex items-center justify-between cursor-pointer hover:bg-accent/30 duration-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                if (chatId !== undefined && chatId !== null && chatId !== "") {
                  updateChatMutation({
                    chatId,
                    updates: {
                      projectId: project._id,
                    },
                  });
                } else {
                  setNewChatProjectId(project._id);
                }
              }}
            >
              <div className="flex items-center justify-between flex-1">
                <h3 className="font-medium">{project.name}</h3>
                {project.description && (
                  <p className="text-sm text-muted-foreground">
                    {project.description}
                  </p>
                )}
              </div>
              <div className=" hidden gap-2 items-center justify-center z-10 absolute right-2 group-hover/card:flex">
                <Button
                  variant="outline"
                  size="icon"
                  className="cursor-pointer group-hover/card:flex opacity-0 group-hover/card:opacity-100 transition-all duration-300 hover:text-red-500/80"
                >
                  <TrashIcon
                    className="size-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      removeProjectMutation({
                        projectId: project._id,
                      });
                    }}
                  />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigate({
                      to: "/projects/$projectId",
                      params: { projectId: project._id },
                    });
                    setResizePanelOpen(false);
                  }}
                  className="cursor-pointer group-hover/card:flex opacity-0 group-hover/card:opacity-100 transition-all duration-300 hover:text-accent-foreground"
                >
                  <ExternalLinkIcon className="size-5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
