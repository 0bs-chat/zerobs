import { useMutation, useQuery } from "convex/react";
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
      await navigate({ to: "/chat/$chatId", params: { chatId: newChatId } });
      await sendAction({ text: chatInputText, chatId: newChatId });
    } else {
      await sendAction({ text: chatInputText, chatId: chatId });
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

    const parsedState = JSON.parse(checkpoint.page) as typeof GraphState.State;;

    return {
      ...parsedState,
      messages: parsedState.messages.map((msg) =>
        coerceMessageLikeToMessage(msg),
      ),
    };
  }, [checkpoint?.page]);
};

export const useInfiniteChats = () => {
  const [numItems, setNumItems] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Single query that gets all items up to numItems
  const chats = useQuery(api.chats.queries.getAll, {
    paginationOpts: { numItems, cursor: null },
  });

  const loadMore = useCallback(() => {
    if (chats && !chats.isDone && !isLoadingMore) {
      console.log('Loading more chats, increasing numItems from', numItems);
      setIsLoadingMore(true);
      setNumItems(prev => prev + 20);
      // Reset loading state after a brief delay to allow query to update
      setTimeout(() => setIsLoadingMore(false), 100);
    }
  }, [chats, isLoadingMore, numItems]);

  const groupedChats = useMemo(() => {
    const allChats = chats?.page || [];
    const pinned = allChats.filter((chat) => chat.pinned);
    const history = allChats.filter((chat) => !chat.pinned);
    console.log('Grouped chats:', { 
      totalChats: allChats.length,
      pinnedCount: pinned.length, 
      historyCount: history.length 
    });
    return { pinned, history };
  }, [chats?.page]);

  return {
    groupedChats,
    hasMore: chats ? !chats.isDone : false,
    isLoading: !chats || isLoadingMore,
    loadMore,
    allChats: chats?.page || [],
  };
};

export const useSearchChats = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const searchResults = useQuery(
    api.chats.queries.search,
    debouncedQuery.trim() ? { query: debouncedQuery } : "skip"
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
