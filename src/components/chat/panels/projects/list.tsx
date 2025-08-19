import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlusIcon, TrashIcon, MoreHorizontal } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import { useAtomValue } from "jotai";
import { chatIdAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { createProjectDialogOpenAtom, newChatAtom } from "@/store/chatStore";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { formatDate } from "@/lib/utils";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

export const ProjectsList = () => {
  const chatId = useAtomValue(chatIdAtom);
  const navigate = useNavigate();

  const { data: allProjects } = useQuery({
    ...convexQuery(api.projects.queries.getAll, {
      paginationOpts: { numItems: 20, cursor: null },
    }),
  });

  const { mutate: updateChatMutation } = useMutation({
    mutationFn: useConvexMutation(api.chats.mutations.update),
  });
  const { mutate: removeProjectMutation } = useMutation({
    mutationFn: useConvexMutation(api.projects.mutations.remove),
  });
  const setProjectDialogOpen = useSetAtom(createProjectDialogOpenAtom);

  const setNewChat = useSetAtom(newChatAtom);

  const isOnProjectsRoute = useLocation().pathname === "/projects";

  return (
    <>
      <div
        className={` ${isOnProjectsRoute ? "container mx-auto flex max-w-6xl flex-1 flex-col p-3 pb-6 lg:max-h-dvh lg:overflow-y-hidden lg:p-6" : "flex flex-col gap-3 h-full"}`}
      >
        <div
          className={`flex items-center text-center justify-between ${isOnProjectsRoute ? "mb-8" : "mb-0"}`}
        >
          <h2
            className={`${isOnProjectsRoute ? "text-3xl font-bold " : "text-xl font-bold"}`}
          >
            {isOnProjectsRoute ? "Projects" : "Select a Project"}
          </h2>
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
        <ScrollArea className="h-[calc(100vh-10rem)]">
          <div
            className={`${isOnProjectsRoute ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "flex flex-col gap-2"} overflow-y-auto`}
          >
            {allProjects?.page.map((project) => (
              <Card
                key={project._id}
                className={`${isOnProjectsRoute ? "relative group/card p-5 rounded-lg border bg-card shadow-sm hover:shadow-md flex flex-col h-full" : "group flex-row relative group/card px-4 py-4 flex items-center justify-between"} cursor-pointer hover:bg-accent dark:hover:bg-accent/50 duration-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50`}
                onClick={() => {
                  // Only navigate to project page if we're on the /projects route
                  if (isOnProjectsRoute) {
                    navigate({
                      to: "/project/$projectId",
                      params: { projectId: project._id },
                    });
                  }

                  // Always update the chat if not a new chat
                  if (chatId !== "new") {
                    updateChatMutation({
                      chatId,
                      updates: {
                        projectId: project._id,
                      },
                    });
                  } else {
                    setNewChat((prev) => ({
                      ...prev,
                      projectId: project._id,
                    }));
                  }
                }}
              >
                <div
                  className={`${isOnProjectsRoute ? "flex min-h-0 flex-1 flex-col gap-2 pr-10  justify-between" : "flex flex-col flex-1 gap-2 pr-14"}`}
                >
                  <div className="flex flex-col gap-1.5">
                    <h3
                      className={`${isOnProjectsRoute ? "text-lg font-semibold leading-tight break-words line-clamp-2 md:line-clamp-3" : "font-medium leading-tight break-words line-clamp-2"}`}
                    >
                      {project.name}
                    </h3>
                    {project.description && (
                      <p
                        className={`${isOnProjectsRoute ? "text-sm text-muted-foreground leading-snug break-words line-clamp-2 md:line-clamp-3" : "text-sm text-muted-foreground leading-snug break-words line-clamp-2 md:line-clamp-3"}`}
                      >
                        {project.description}
                      </p>
                    )}
                  </div>
                  {isOnProjectsRoute && (
                    <div className="mt-2 text-xs text-muted-foreground/80">
                      Updated: {formatDate(project.updatedAt) ?? "-"}
                    </div>
                  )}
                </div>
                {isOnProjectsRoute ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer hidden items-center justify-center absolute right-3 top-3 data-[state=open]:flex data-[state=open]:opacity-100 group-hover/card:flex opacity-0 group-hover/card:opacity-100 transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        aria-label="Project options"
                      >
                        <MoreHorizontal className="size-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="end"
                      side="bottom"
                      className="p-2 w-44"
                      sideOffset={8}
                    >
                      <button
                        className="w-full flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeProjectMutation({ projectId: project._id });
                        }}
                      >
                        <TrashIcon className="size-4" /> Delete project
                      </button>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Button
                    variant="default"
                    size="icon"
                    className={`cursor-pointer hidden items-center justify-center z-10 absolute right-2 top-1/2 -translate-y-1/2 group-hover/card:flex opacity-0 group-hover/card:opacity-100 transition-all duration-300 hover:text-red-500/80`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      removeProjectMutation({
                        projectId: project._id,
                      });
                    }}
                  >
                    <TrashIcon className="size-5" />
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
      <CreateProjectDialog />
    </>
  );
};
