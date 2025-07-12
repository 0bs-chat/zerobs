import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useAtom, useAtomValue } from "jotai";
import { lastChatMessageAtom, newChatAtom } from "@/store/chatStore";

export const useHandleSubmit = () => {
  const createMessageMutation = useMutation(api.chatMessages.mutations.create);
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const createChatMutation = useMutation(api.chats.mutations.create);
  const [newChat, setNewChat] = useAtom(newChatAtom);
  const sendAction = useAction(api.langchain.index.chat);
  const navigate = useNavigate();
  const lastChatMessage = useAtomValue(lastChatMessageAtom);

  const handleSubmit = async (chat: Doc<"chats">) => {
    if (chat._id === "new") {
      setNewChat((prev) => ({
        ...prev,
        text: "",
        documents: [],
        projectId: null,
        orchestratorMode: false,
        webSearch: false,
        artifacts: false,
        conductorMode: false,
      }));
      chat._id = await createChatMutation({
        name: chat.name,
        model: chat.model,
        reasoningEffort: chat.reasoningEffort,
        projectId: chat.projectId,
        conductorMode: chat.conductorMode,
        orchestratorMode: chat.orchestratorMode,
        webSearch: chat.webSearch,
        artifacts: chat.artifacts,
      });
      await createMessageMutation({
        chatId: chat._id,
        documents: chat.documents,
        text: chat.text,
        parentId: null,
      });
      navigate({
        to: "/chat/$chatId",
        params: { chatId: chat._id },
      });
      await sendAction({ chatId: chat._id });
    } else {
      await updateChatMutation({
        chatId: chat._id,
        updates: { text: "", documents: [] },
      });
      await createMessageMutation({
        chatId: chat._id,
        documents: chat.documents,
        text: newChat.text !== "" ? newChat.text : chat.text,
        parentId: lastChatMessage ?? null,
      });
      setNewChat((prev) => ({
        ...prev,
        text: "",
        documents: [],
        projectId: null,
      }));
      await sendAction({ chatId: chat._id });
    }
  };

  return handleSubmit;
};

export const useInfiniteChats = () => {
  const { results, status, loadMore } = usePaginatedQuery(
    api.chats.queries.getAll,
    {},
    {
      initialNumItems: 15,
    }
  );

  const pinnedChats = results?.filter((chat) => chat.pinned) ?? [];
  const historyChats = results?.filter((chat) => !chat.pinned) ?? [];

  return {
    pinnedChats,
    historyChats,
    status,
    loadMore,
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
  const params = useParams({ strict: false });

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
    navigate({
      to: "/chat/$chatId",
      params: { chatId },
    });
  };

  const handleDelete = async (chatId: string) => {
    if (params.chatId === chatId) {
      navigate({
        to: "/",
        replace: true,
      });
    }
    await removeChat({ chatId: chatId as Id<"chats"> });
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
