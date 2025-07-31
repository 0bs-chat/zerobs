import { createFileRoute } from "@tanstack/react-router";
import { ChatInput } from "@/components/chat/input/index";
import { useAtomValue, useSetAtom } from "jotai";
import {
  chatAtom,
  newChatAtom,
  selectedArtifactAtom,
  userLoadableAtom,
} from "@/store/chatStore";
import { motion } from "motion/react";
import { layoutTransition } from "@/lib/motion";
import { useEffect } from "react";
import { ChatInterface } from "@/components/chat-interface";

export const Route = createFileRoute("/chat/new")({
  component: RouteComponent,
  preload: true,
  preloadStaleTime: 1000 * 60 * 60, // 1 hour , coz there is no data to fetch on this route
});

function RouteComponent() {
  const userLoadable = useAtomValue(userLoadableAtom);
  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);
  const newChat = useAtomValue(newChatAtom);
  const setChat = useSetAtom(chatAtom);

  useEffect(() => {
    setSelectedArtifact(undefined);
  }, [setSelectedArtifact]);

  useEffect(() => {
    setChat(newChat);
  }, [newChat, setChat]);

  const userName =
    userLoadable.state === "hasData" ? userLoadable.data?.name : "";

  return (
    <ChatInterface>
      <motion.div
        className="flex-1 min-h-0"
        layout
        transition={layoutTransition}
      >
        <div className="flex items-center justify-center h-full flex-col gap-4">
          <div
            className="flex items-center gap-2 text-4xl font-medium text-primary/30 -translate-y-8"
            style={{
              fontFamily: "Rubik",
            }}
          >
            how can i help you,
            <span className="text-primary/30">{userName} ?</span>
          </div>
        </div>
      </motion.div>
      <ChatInput />
    </ChatInterface>
  );
}
