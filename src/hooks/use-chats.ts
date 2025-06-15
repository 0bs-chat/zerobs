import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAction } from "convex/react";
import type { Id } from "convex/_generated/dataModel";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useCallback } from "react";
import { useConvex } from "convex/react";
import React from "react";
import { coerceMessageLikeToMessage } from "@langchain/core/messages";
import { GraphState } from "../../convex/langchain/state";
import { chatInputTextAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";

export const useHandleSubmit = () => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const navigate = useNavigate();
  const chatId = params.chatId as Id<"chats"> | "new";
  const createChatMutation = useMutation(api.chats.mutations.create);
  const createChatInputMutation = useMutation(api.chatInputs.mutations.create);
  const sendAction = useAction(api.chats.actions.send);
  const convex = useConvex();
  const setChatInputText = useSetAtom(chatInputTextAtom);

  const handleSubmit = useCallback(async () => {
    if (chatId === "new") {
      const newChatId = await createChatMutation({ name: "New Chat" });

      const newChatInputDoc = await convex.query(api.chatInputs.queries.get, {
        chatId: "new",
      });

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
      setChatInputText("");
    } else {
      sendAction({ chatId: chatId });
      setChatInputText("");
    }
  }, [
    chatId,
    createChatMutation,
    createChatInputMutation,
    sendAction,
    navigate,
    setChatInputText,
  ]);

  return handleSubmit;
};

interface UseCheckpointParserProps {
  checkpoint?: { page?: string } | null;
}

type GraphStateType = typeof GraphState.State;

export const useCheckpointParser = ({
  checkpoint,
}: UseCheckpointParserProps) => {
  return React.useMemo(() => {
    if (!checkpoint?.page) return null;

    const parsedState = JSON.parse(checkpoint.page) as GraphStateType;

    return {
      ...parsedState,
      messages: parsedState.messages.map((msg) =>
        coerceMessageLikeToMessage(msg)
      ),
    };
  }, [checkpoint?.page]);
};
