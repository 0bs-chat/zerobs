import { ProjectsList } from "./project-list";
import { ProjectDetails } from "./project-details";
import { useAtomValue } from "jotai";
import { selectedProjectIdAtom } from "@/store/chatStore";
import { useParams } from "@tanstack/react-router";
import type { Id } from "node_modules/convex/dist/esm-types/values/value";
import { api } from "../../../../../convex/_generated/api";
import { useQuery } from "convex/react";

export const ProjectsPanel = () => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;
  const selectedChatProjectId = useAtomValue(selectedProjectIdAtom);

  const chat = useQuery(
    api.chats.queries.get,
    chatId !== undefined ? { chatId } : "skip"
  );

  const chatProjectId = chat?.projectId;

  const isNewChatRoute = !!chatId;

  if (!isNewChatRoute) {
    // At / route, show details if a project is selected
    if (selectedChatProjectId) {
      return <ProjectDetails projectId={selectedChatProjectId} />;
    }
    return <ProjectsList />;
  }

  // In chat context, use the existing logic
  if (
    !selectedChatProjectId ||
    selectedChatProjectId === null ||
    chatProjectId !== selectedChatProjectId ||
    chatProjectId === "" ||
    chatProjectId === undefined
  ) {
    return <ProjectsList />;
  }

  return <ProjectDetails projectId={selectedChatProjectId!} />;
};
