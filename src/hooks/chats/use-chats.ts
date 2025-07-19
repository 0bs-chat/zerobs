import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
} from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState, type RefObject } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  lastChatMessageAtom,
  newChatModelAtom,
  newChatDocumentsAtom,
  newChatWebSearchAtom,
  newChatConductorModeAtom,
  newChatOrchestratorModeAtom,
  newChatArtifactsAtom,
  newChatReasoningEffortAtom,
  selectedProjectIdAtom,
  newChatTextAtom,
} from "@/store/chatStore";
import type { AutosizeTextAreaRef } from "@/components/ui/autosize-textarea";

export const useHandleSubmit = () => {
  const createMessageMutation = useMutation(api.chatMessages.mutations.create);
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const createChatMutation = useMutation(api.chats.mutations.create);

  // new chat atoms
  const [newChatDocuments, setNewChatDocuments] = useAtom(newChatDocumentsAtom);
  const newChatModel = useAtomValue(newChatModelAtom);
  const newChatReasoningEffort = useAtomValue(newChatReasoningEffortAtom);
  const newChatConductorMode = useAtomValue(newChatConductorModeAtom);
  const newChatOrchestratorMode = useAtomValue(newChatOrchestratorModeAtom);
  const newChatWebSearch = useAtomValue(newChatWebSearchAtom);
  const newChatArtifacts = useAtomValue(newChatArtifactsAtom);
  const selectedProjectId = useAtomValue(selectedProjectIdAtom);
  const sendAction = useAction(api.langchain.index.chat);
  const navigate = useNavigate();
  const lastChatMessage = useAtomValue(lastChatMessageAtom);
  const setNewChatText = useSetAtom(newChatTextAtom);

  const handleSubmit = async (
    chatId: Id<"chats">,
    textareaRef: RefObject<AutosizeTextAreaRef>
  ) => {
    const inputText = textareaRef.current?.textArea.value;

    if (inputText === "" || inputText === undefined || inputText === null) {
      toast.error("Please enter a message before sending");
      return;
    }

    if (chatId === "" || chatId === undefined || chatId === null) {
      const newChatId = await createChatMutation({
        name: "New Chat",
        model: newChatModel,
        reasoningEffort: newChatReasoningEffort,
        projectId: selectedProjectId,
        conductorMode: newChatConductorMode,
        orchestratorMode: newChatOrchestratorMode,
        webSearch: newChatWebSearch,
        artifacts: newChatArtifacts,
      });
      await createMessageMutation({
        chatId: newChatId,
        documents: newChatDocuments,
        text: inputText,
        parentId: null,
      });
      textareaRef.current.textArea.value = "";
      setNewChatText("");
      setNewChatDocuments([]);
      navigate({
        to: "/chat/$chatId",
        params: { chatId: newChatId },
      });
      await sendAction({ chatId: newChatId });
    } else {
      await updateChatMutation({
        chatId: chatId,
        updates: { text: inputText, documents: newChatDocuments },
      });
      await createMessageMutation({
        chatId: chatId,
        documents: newChatDocuments,
        text: inputText,
        parentId: lastChatMessage ?? null,
      });
      textareaRef.current.textArea.value = "";
      setNewChatText("");
      setNewChatDocuments([]);
      await sendAction({ chatId: chatId });
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
