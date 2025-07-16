import type { Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { newChatDocumentsAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";

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
      if (chat) {
        if (chatId !== undefined && chatId !== null && chatId !== "") {
          await updateChatMutation({
            chatId,
            updates: {
              documents: [...chat.documents, ...documentIds],
            },
          });
        } else {
          setNewChatDocuments((prev) => [...prev, ...documentIds]);
        }
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
