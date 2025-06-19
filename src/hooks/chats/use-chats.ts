import { useMutation, useQuery, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAction } from "convex/react";
import type { Id } from "convex/_generated/dataModel";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useState, useMemo } from "react";
import { useConvex } from "convex/react";
import React from "react";
import { coerceMessageLikeToMessage } from "@langchain/core/messages";
import { GraphState } from "../../../convex/langchain/state";
import { chatInputTextAtom } from "@/store/chatStore";
import { useAtom } from "jotai";

export const useHandleSubmit = () => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const navigate = useNavigate();
  const chatId = params.chatId as Id<"chats"> | "new";
  const createChatMutation = useMutation(api.chats.mutations.create);
  const createChatInputMutation = useMutation(api.chatInputs.mutations.create);
  const sendAction = useAction(api.chats.actions.send);
  const convex = useConvex();
  const [chatInputText, setChatInputText] = useAtom(chatInputTextAtom);

  const handleSubmit = useCallback(async () => {
    if (chatId === "new") {
      const newChatId = await createChatMutation({ name: "New Chat" });

      const newChatInputDoc = await convex.query(api.chatInputs.queries.get, {
        chatId: "new",
      });

      await createChatInputMutation({
        model: newChatInputDoc?.model,
        agentMode: newChatInputDoc?.agentMode,
        plannerMode: newChatInputDoc?.plannerMode,
        webSearch: newChatInputDoc?.webSearch,
        documents: newChatInputDoc?.documents,
        projectId: newChatInputDoc?.projectId,
        artifacts: newChatInputDoc?.artifacts,
        chatId: newChatId,
        text: chatInputText,
      });
      navigate({ to: "/chat/$chatId", params: { chatId: newChatId } });
      sendAction({ text: chatInputText, chatId: newChatId });
    } else {
      sendAction({ text: chatInputText, chatId: chatId });
    }

    setChatInputText("");
  }, [
    chatId,
    createChatMutation,
    createChatInputMutation,
    sendAction,
    navigate,
    chatInputText,
    setChatInputText,
    convex,
  ]);

  return handleSubmit;
};

export const useCheckpointParser = ({
  checkpoint,
}: {
  checkpoint?: { page?: string } | null;
}) => {
  return React.useMemo(() => {
    if (!checkpoint?.page) return null;

    const parsedState = JSON.parse(checkpoint.page) as typeof GraphState.State;

    return {
      ...parsedState,
      messages: parsedState.messages.map((msg) =>
        coerceMessageLikeToMessage(msg),
      ),
    };
  }, [checkpoint?.page]);
};

export const useInfiniteChats = () => {
  const {
    results: chats,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.chats.queries.getAll,
    {},
    { initialNumItems: 20 },
  );

  const groupedChats = useMemo(() => {
    const allChats = chats || [];
    const pinned = allChats.filter((chat) => chat.pinned);
    const history = allChats.filter((chat) => !chat.pinned);
    return { pinned, history };
  }, [chats]);

  return {
    groupedChats,
    hasMore: status !== "Exhausted",
    isLoading: status === "LoadingFirstPage" || status === "LoadingMore",
    loadMore,
    allChats: chats || [],
  };
};

export const useSearchChats = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const searchResults = useQuery(
    api.chats.queries.search,
    debouncedQuery.trim() ? { query: debouncedQuery } : "skip",
  );

  // Debounce search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults: searchResults || [],
    isSearching: debouncedQuery !== searchQuery,
  };
};
