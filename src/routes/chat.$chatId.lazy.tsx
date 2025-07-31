import { createLazyFileRoute } from "@tanstack/react-router";
import { ChatMessages } from "@/components/chat/messages";
import { ChatInput } from "@/components/chat/input/index";

import { useAtomValue, useSetAtom } from "jotai";
import { chatAtom, selectedArtifactAtom } from "@/store/chatStore";
import { useEffect } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import { layoutTransition } from "@/lib/motion";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import { newChatAtom } from "@/store/chatStore";
import { ChatInterface } from "@/components/chat-interface";

export const Route = createLazyFileRoute("/chat/$chatId")({
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({
    from: "/chat/$chatId",
  });
  const chatId = params.chatId as Id<"chats">;
  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);
  const newChat = useAtomValue(newChatAtom);
  const setChat = useSetAtom(chatAtom);

  useEffect(() => {
    setSelectedArtifact(undefined);
  }, [chatId, setSelectedArtifact]);

  const queryChat =
    useQuery(api.chats.queries.get, chatId !== "new" ? { chatId } : "skip") ??
    newChat;
  useEffect(() => {
    setChat(queryChat);
  }, [queryChat, setChat]);

  return (
    <ChatInterface>
      <motion.div
        className="flex-1 min-h-0"
        layout
        transition={layoutTransition}
      >
        <ChatMessages chatId={chatId} />
      </motion.div>
      <ChatInput />
    </ChatInterface>
  );
}
