import { ProjectsList } from "./list";
import { ProjectDetails } from "./details";
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

  if (
    !selectedChatProjectId ||
    !chatId ||
    chatId === "" ||
    chatId === undefined ||
    chatProjectId !== selectedChatProjectId
  ) {
    return <ProjectsList />;
  }

  return <ProjectDetails projectId={selectedChatProjectId!} />;
};
