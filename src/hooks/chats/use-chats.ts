import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCallback, useEffect, useState } from "react";
import { useMatchRoute, useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAtomValue } from "jotai";
import { lastChatMessageAtom } from "@/store/chatStore";

export const useHandleSubmit = () => {
  const createMessageMutation = useMutation(api.chatMessages.mutations.create);
  const createChatMutation = useMutation(api.chats.mutations.create);
  const sendAction = useAction(api.langchain.index.chat);
  const navigate = useNavigate();
  const lastChatMessage = useAtomValue(lastChatMessageAtom);

  const { data, isNew, chatId, save } = useChatState();

  const handleSubmit = async () => {
    if (!data) {
      toast.error("No preferences found");
      return;
    }
    if (isNew) {
      const newChatId = await createChatMutation({
        name: data.text,
        model: data.model,
        reasoningEffort: data.reasoningEffort,
        conductorMode: data.conductorMode,
        deepSearchMode: data.deepSearchMode,
        webSearch: data.webSearch,
        artifacts: data.artifacts,
        projectId: null,
      });
      await createMessageMutation({
        chatId: newChatId,
        documents: data.documents,
        text: data.text,
        parentId: null,
      });
      navigate({
        to: "/chat/$chatId",
        params: { chatId: newChatId },
      });
    } else {
      if (!chatId) {
        toast.error("No chat id found");
        return;
      }
      save({ text: data.text, documents: data.documents });
      await createMessageMutation({
        chatId,
        documents: data.documents,
        text: data.text,
        parentId: lastChatMessage?._id ?? null,
      });
    }
    if (chatId) {
      await sendAction({ chatId });
    }
  };
  return handleSubmit;
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

  const searchResults = useQuery(
    api.chats.queries.search,
    debouncedQuery.trim() ? { query: debouncedQuery } : "skip"
  );

  // Debounce search query
  useEffect(() => {
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

  const handleNavigate = (chatId: Id<"chats">) => {
    navigate({
      to: "/chat/$chatId",
      params: { chatId },
    });
  };

  const handlePin = (chatId: Id<"chats">) => {
    updateChat({
      chatId: chatId as Id<"chats">,
      updates: { pinned: true },
    });
    toast.success("Chat pinned");
  };

  const handleUnpin = (chatId: Id<"chats">) => {
    updateChat({
      chatId: chatId as Id<"chats">,
      updates: { pinned: false },
    });
    toast.success("Chat unpinned");
  };

  const handleSelect = (chatId: Id<"chats">) => {
    navigate({
      to: "/chat/$chatId",
      params: { chatId },
    });
  };

  const handleDelete = async (chatId: Id<"chats">) => {
    await removeChat({ chatId: chatId as Id<"chats"> });
    navigate({ to: "/" });
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

export function useChatId(): Id<"chats"> | undefined {
  const matchRoute = useMatchRoute();
  const isChat = matchRoute({ to: "/chat/$chatId", fuzzy: false });
  if (!isChat) return undefined; // ← safe fallback
  const { chatId } = useParams({ from: "/chat/$chatId" });
  return chatId as Id<"chats">;
}

export const useChatState = () => {
  const chatId = useChatId();
  const isNew = chatId === undefined;

  const prefs = useQuery(api.newChatPrefs.queries.get, isNew ? {} : "skip");
  const chat = useQuery(api.chats.queries.get, !isNew ? { chatId } : "skip");

  const data = isNew ? prefs : chat;

  const updatePrefs = useMutation(api.newChatPrefs.mutations.update);
  const updateChat = useMutation(api.chats.mutations.update);

  const updateProject = isNew
    ? "skip"
    : useMutation(api.projects.mutations.update);

  const createProject = useMutation(api.projects.mutations.create);

  const save = useCallback(
    (updates: Partial<Doc<"chats">>) => {
      isNew ? updatePrefs({ updates }) : updateChat({ chatId, updates });
    },
    [isNew, chatId]
  );

  return {
    chatId,
    isNew,
    data,
    save,
    createProject,
    updateProject,
    prefs,
    updateChat,
  };
};
