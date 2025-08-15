import { createLazyFileRoute } from "@tanstack/react-router";
import { ProjectDetails } from "@/components/chat/panels/projects/details";
import { ProjectChatList } from "@/components/chat/panels/projects/chat-list";
import type { Id } from "../../convex/_generated/dataModel";
import { ChatInput } from "@/components/chat/input";
import { useAtomValue, useSetAtom } from "jotai";
import { chatAtom, newChatAtom } from "@/store/chatStore";
import { useEffect } from "react";

export const Route = createLazyFileRoute("/project/$projectId")({
  component: RouteComponent,
});

function RouteComponent() {
  const { projectId } = Route.useParams();
  const setChat = useSetAtom(chatAtom);
  const newChat = useAtomValue(newChatAtom);

  useEffect(() => {
    setChat(newChat);
  }, [newChat, setChat]);

  return (
    <div className="flex flex-row min-w-7xl h-[calc(100vh-8rem)] m-auto overflow-hidden gap-4">
      <div className="flex flex-col gap-4 w-[50%] min-h-0">
        <ChatInput />
        <ProjectChatList projectId={projectId as Id<"projects">} />
      </div>
      <div className="w-px bg-border" />
      <div className="flex-1 min-h-0">
        <ProjectDetails projectId={projectId as Id<"projects">} />
      </div>
    </div>
  );
}
