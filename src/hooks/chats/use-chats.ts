import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import type { Id } from "convex/_generated/dataModel";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import React from "react";
import { coerceMessageLikeToMessage } from "@langchain/core/messages";
import { GraphState } from "convex/langchain/state";
import {
  chatInputAtom,
  resetChatInputAtom,
  selectedChatIdAtom,
} from "@/store/chatStore";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { useAuth } from "@clerk/tanstack-react-start";

export const useHandleSubmit = (
  isNewChat: boolean,
  chatId: Id<"chats"> | null
) => {
  const { userId } = useAuth();
  const navigate = useNavigate();
  const createChatWithInputMutation = useMutation(
    api.chats.mutations.createWithInput
  );
  const sendAction = useAction(api.chats.actions.send);
  const [chatInput] = useAtom(chatInputAtom);
  const resetChatInput = useSetAtom(resetChatInputAtom);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);

  const handleSubmit = useCallback(
    async (currentText: string) => {
      // this is for the time being, we'll remove this so user can also send anonymous messsages. will add the limits and stuff later, ones it becomes usable.
      if (!userId) {
        toast.error("Please sign in to send a message");
        return;
      }

      if (isNewChat || !chatId || chatId === null) {
        const newChatId = await createChatWithInputMutation({
          name: "new chat",
          chatInput: {
            model: chatInput.model,
            agentMode: chatInput.agentMode,
            plannerMode: chatInput.plannerMode,
            webSearch: chatInput.webSearch,
            documents: chatInput.documents,
            projectId: chatInput.projectId,
            artifacts: chatInput.artifacts,
            text: currentText,
          },
        });
        setSelectedChatId(newChatId);
        await navigate({ to: "/chat/$chatId", params: { chatId: newChatId } });
        await sendAction({ text: currentText, chatId: newChatId });
      } else {
        await sendAction({ text: currentText, chatId: chatId });
        setSelectedChatId(chatId);
      }
      resetChatInput();
    },
    [
      chatId,
      createChatWithInputMutation,
      sendAction,
      navigate,
      chatInput,
      resetChatInput,
      updateChatInputMutation,
      setSelectedChatId,
    ]
  );

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
        coerceMessageLikeToMessage(msg)
      ),
    };
  }, [checkpoint?.page]);
};

export const useInfiniteChats = () => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.chats.queries.getAll,
    {},
    {
      initialNumItems: 20,
    }
  );

  return {
    chats: results ?? [],
    error: null,
    isFetching: status === "LoadingFirstPage",
    isFetchingNextPage: status === "LoadingMore",
    fetchNextPage: () => loadMore(10),
    hasNextPage: status === "CanLoadMore",
  };
};

export const useSearchChats = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const searchResults = useQuery({
    queryKey: ["chats", debouncedQuery],
    queryFn: () =>
      convexQuery(api.chats.queries.search, {
        query: debouncedQuery.trim(),
      }),
  });

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

export const chatHandlers = () => {
  const navigate = useNavigate();
  const updateChat = useMutation(api.chats.mutations.update);
  const removeChat = useMutation(api.chats.mutations.remove);
  const setSelectedChatId = useSetAtom(selectedChatIdAtom);
  const selectedChatId = useAtomValue(selectedChatIdAtom);

  const handleNavigate = (chatId: string) => {
    navigate({
      to: "/chat/$chatId",
      params: { chatId },
    });
  };

  const handlePin = (chatId: string) => {
    updateChat({
      chatId: chatId as Id<"chats">,
      updates: { pinned: true },
    });
    toast.success("Chat pinned");
  };

  const handleUnpin = (chatId: string) => {
    updateChat({
      chatId: chatId as Id<"chats">,
      updates: { pinned: false },
    });
    toast.success("Chat unpinned");
  };

  const handleSelect = (chatId: string) => {
    setSelectedChatId(chatId as Id<"chats">);
  };

  const handleDelete = async (chatId: string) => {
    await removeChat({ chatId: chatId as Id<"chats"> });
    if (selectedChatId === chatId) {
      setSelectedChatId(null);
      navigate({ to: "/" });
    }

    toast.success("Chat deleted");
  };

  return {
    handleNavigate,
    handlePin,
    handleUnpin,
    handleSelect,
    handleDelete,
  };
};
