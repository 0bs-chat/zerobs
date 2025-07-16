import type { Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { newChatDocumentsAtom } from "@/store/chatStore";
import { useAtomValue, useSetAtom } from "jotai";
import { useMemo } from "react";

export const useRemoveDocument = () => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;

  const chatInputQuery = useQuery(
    api.chats.queries.get,
    chatId !== undefined && chatId !== null && chatId !== ""
      ? { chatId }
      : "skip"
  );
  const updateChatInputMutation = useMutation(api.chats.mutations.update);
  const setNewChatDocuments = useSetAtom(newChatDocumentsAtom);

  return (documentId: Id<"documents">) => {
    if (chatId !== undefined && chatId !== null && chatId !== "") {
      if (!chatInputQuery?.documents) {
        return;
      }

      const filteredDocuments = chatInputQuery.documents.filter(
        (id) => id !== documentId
      );

      updateChatInputMutation({
        chatId: chatId,
        updates: {
          documents: filteredDocuments,
        },
      });
    } else {
      setNewChatDocuments((prev) => prev.filter((id) => id !== documentId));
    }
  };
};

export const useUploadDocuments = (
  {
    type,
  }: {
    type: "file" | "url" | "site" | "youtube" | "text" | "github";
  } = { type: "file" }
) => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;

  const chat = useQuery(
    api.chats.queries.get,
    chatId !== undefined ? { chatId } : "skip"
  );
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const generateUploadUrlMutation = useMutation(
    api.documents.mutations.generateUploadUrl
  );
  const createMutation = useMutation(api.documents.mutations.create);
  const setNewChatDocuments = useSetAtom(newChatDocumentsAtom);

  return async (files: FileList) => {
    try {
      const uploadedStorageIds: Id<"_storage">[] = [];

      for (const file of Array.from(files)) {
        // Get upload URL
        const uploadUrlResult = await generateUploadUrlMutation();

        // Upload file
        const result = await fetch(uploadUrlResult, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Upload failed: ${result.statusText}`);
        }

        // Create document
        const { storageId } = await result.json();

        uploadedStorageIds.push(storageId);
      }

      const documentIds = await Promise.all(
        uploadedStorageIds.map((storageId, index) => {
          const file = files[index];
          return createMutation({
            name: file.name,
            type,
            size: file.size,
            key: storageId,
          });
        })
      );

      // Update chat input with new documents
      if (chatId !== undefined && chatId !== null && chatId !== "") {
        // Existing chat - update chat documents
        await updateChatMutation({
          chatId,
          updates: {
            documents: [...(chat?.documents || []), ...documentIds],
          },
        });
      } else {
        // New chat - update atom
        setNewChatDocuments((prev) => [...prev, ...documentIds]);
      }

      toast(
        `${files.length} file${files.length > 1 ? "s" : ""} uploaded successfully`
      );

      return documentIds;
    } catch (error) {
      console.error("Upload error:", error);
      toast("Error uploading files", {
        description: "There was an error uploading your files",
      });
    }
  };
};

export const useDocumentList = () => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;

  const chat = useQuery(
    api.chats.queries.get,
    chatId !== undefined ? { chatId } : "skip"
  );

  const newChatDocuments = useAtomValue(newChatDocumentsAtom);

  const documentIds = useMemo(() => {
    return chatId !== undefined && chatId !== null && chatId !== ""
      ? chat?.documents || [] // Existing chat: use chat.documents
      : newChatDocuments; // New chat: use atom
  }, [chatId, chat?.documents, newChatDocuments]);

  const documents = useQuery(
    api.documents.queries.getMultiple,
    documentIds.length > 0 ? { documentIds } : "skip"
  );

  return { documents, documentIds };
};

export function useDocumentUpload(projectId: Id<"projects">) {
  const uploadDocuments = useUploadDocuments({
    type: "file",
  });
  const createDocuments = useMutation(api.documents.mutations.create);
  const createProjectDocuments = useMutation(
    api.projectDocuments.mutations.create
  );
  const updateChatInput = useMutation(api.chats.mutations.update);
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;

  const handleFileUpload = async (files: FileList) => {
    const documentIds = await uploadDocuments(files);

    if (documentIds) {
      await Promise.all(
        documentIds
          .filter((documentId) => documentId !== undefined)
          .map((documentId) =>
            createProjectDocuments({
              projectId,
              documentId,
            })
          )
      );
    }
    if (chatId !== undefined && chatId !== null && chatId !== "") {
      await updateChatInput({
        chatId,
        updates: {
          projectId,
        },
      });
    }
  };

  const handleUrlUpload = async (url: string) => {
    if (!url) return;

    const documentId = await createDocuments({
      name: url,
      type: "url",
      size: 0,
      key: url,
    });

    await createProjectDocuments({
      projectId,
      documentId,
    });
  };

  const handleSiteUpload = async (url: string) => {
    if (!url) return;
    const documentId = await createDocuments({
      name: url,
      type: "site",
      size: 0,
      key: url,
    });

    await createProjectDocuments({
      projectId,
      documentId,
    });
  };

  const handleYoutubeUpload = async (url: string) => {
    if (!url) return;

    const documentId = await createDocuments({
      name: url,
      type: "youtube",
      size: 0,
      key: url,
    });

    await createProjectDocuments({
      projectId,
      documentId,
    });
  };

  return {
    handleFileUpload,
    handleUrlUpload,
    handleSiteUpload,
    handleYoutubeUpload,
  };
}
