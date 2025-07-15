import { ProjectsList } from "./list";
import { ProjectDetails } from "./details";
import { useAtomValue } from "jotai";
import { selectedProjectIdAtom } from "@/store/chatStore";
import { useParams } from "@tanstack/react-router";
import type { Id } from "node_modules/convex/dist/esm-types/values/value";

export const ProjectsPanel = () => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;
  const chatProjectId = useAtomValue(selectedProjectIdAtom);

  if (!chatProjectId || !chatId || chatId === "" || chatId === undefined) {
    return <ProjectsList />;
  }

  return <ProjectDetails projectId={chatProjectId!} />;
};
