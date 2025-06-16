import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ProjectsList } from "./list";
import { ProjectDetails } from "./details";
import { useParams } from "@tanstack/react-router";

export const ProjectsPanel = () => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats"> | "new";
  const chatInput = useQuery(api.chatInputs.queries.get, { chatId });

  const showProjectList = !chatInput?.projectId;

  if (showProjectList) {
    return (
      <ProjectsList />
    );
  }

  return (
    <ProjectDetails
      projectId={chatInput?.projectId!}
    />
  );
};
