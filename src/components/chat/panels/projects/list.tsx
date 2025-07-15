import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ExternalLinkIcon, Folder, PlusIcon, TrashIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useAtom, useSetAtom } from "jotai";
import {
  createProjectDialogOpenAtom,
  selectedProjectIdAtom,
  resizePanelOpenAtom,
} from "@/store/chatStore";
import { CreateProjectDialog } from "@/components/chat/panels/projects/create-project-dialog";
import { useProjects } from "@/hooks/use-projects";

export const ProjectsList = () => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;
  const navigate = useNavigate();
  const { projects: allProjects } = useProjects(20);

  const removeProjectMutation = useMutation(api.projects.mutations.remove);
  const setProjectDialogOpen = useSetAtom(createProjectDialogOpenAtom);
  const setResizePanelOpen = useSetAtom(resizePanelOpenAtom);

  const [selectedProjectId, setSelectedProjectId] = useAtom(
    selectedProjectIdAtom
  );

  return (
    <div className="flex flex-col gap-3 h-full ">
      <div className="flex items-center text-center justify-between">
        <h2 className="text-xl font-bold">Select a Project</h2>
        <CreateProjectDialog>
          <Button
            variant="outline"
            size="sm"
            className=""
            onClick={() => {
              setProjectDialogOpen(true);
            }}
          >
            <PlusIcon className="size-4" />
            New Project
          </Button>
        </CreateProjectDialog>
      </div>
      <ScrollArea className="h-[calc(100vh-10rem)] ">
        <div className="flex flex-col gap-2 overflow-y-auto">
          {allProjects?.page.map((project) => (
            <Card
              key={project._id}
              className={`group flex-col relative group/card px-4 py-4 flex items-center justify-between hover:bg-accent duration-300 transition-colors gap-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
                selectedProjectId === project._id
                  ? "bg-primary/20 dark:bg-primary/30"
                  : ""
              }`}
              onClick={() => {
                if (chatId === undefined || chatId === null || chatId === "") {
                  setSelectedProjectId(
                    selectedProjectId === project._id ? null : project._id
                  );
                }
              }}
            >
              <div className="flex items-center justify-between flex-1 gap-1 w-full">
                <div className="flex gap-2 items-center justify-start w-full">
                  <Folder className="w-6 h-6 fill-accent text-accent-foreground" />
                  <h3 className="font-medium text-lg">{project.name}</h3>
                </div>
                <div className=" hidden gap-2 items-center justify-center z-10 absolute right-2 group-hover/card:flex">
                  <Button
                    variant="destructive"
                    size="icon"
                    className="cursor-pointer group-hover/card:flex opacity-0 group-hover/card:opacity-100 transition-all duration-300 "
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
                    variant="secondary"
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
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground text-justify line-clamp-2 text-ellipsis w-full">
                  {project.description}
                </p>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
