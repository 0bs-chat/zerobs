import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAction } from "convex/react";
import type { Id } from "convex/_generated/dataModel";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useCallback } from "react";
import { useConvex } from "convex/react";

export const useHandleSubmit = () => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const navigate = useNavigate();
  const chatId = params.chatId as Id<"chats"> | "new";
  const createChatMutation = useMutation(api.chats.mutations.create);
  const createChatInputMutation = useMutation(api.chatInputs.mutations.create);
  const sendAction = useAction(api.chats.actions.send);
  const convex = useConvex();

  const handleSubmit = useCallback(async () => {
    if (chatId === "new") {
      const newChatId = await createChatMutation({ name: "New Chat" });

      const newChatInputDoc = await convex.query(api.chatInputs.queries.get, { chatId: "new" });

      await createChatInputMutation({
        chatId: newChatId,
        text: newChatInputDoc?.text,
        model: newChatInputDoc?.model,
        agentMode: newChatInputDoc?.agentMode,
        plannerMode: newChatInputDoc?.plannerMode,
        webSearch: newChatInputDoc?.webSearch,
        documents: newChatInputDoc?.documents,
        projectId: newChatInputDoc?.projectId,
      });
      navigate({ to: "/chat/$chatId", params: { chatId: newChatId } });
      sendAction({ chatId: newChatId });
    } else {
      sendAction({ chatId: chatId });
    }

    // Clear values where chatInputText, chatInputDocumentList
    (document.getElementById("chatInputText") as HTMLTextAreaElement).value = "";
    (document.getElementById("chatInputDocumentList") as HTMLDivElement).innerHTML = "";
  }, [chatId, createChatMutation, createChatInputMutation, sendAction, navigate]);

  return handleSubmit;
};