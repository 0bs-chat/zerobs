import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { newChatAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";

export const useRemoveDocument = () => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;
  const chatInputQuery = useQuery(
    api.chats.queries.get,
    chatId !== "new" ? { chatId } : "skip",
  );
  const updateChatInputMutation = useMutation(api.chats.mutations.update);
  const setNewChat = useSetAtom(newChatAtom);

  return (documentId: Id<"documents">) => {
    if (chatId !== "new") {
      if (!chatInputQuery?.documents) {
        return;
      }

      const filteredDocuments = chatInputQuery.documents.filter(
        (id) => id !== documentId,
      );

      updateChatInputMutation({
        chatId: chatId,
        updates: {
          documents: filteredDocuments,
        },
      });
    } else {
      setNewChat((prev) => {
        const filteredDocuments = prev.documents.filter(
          (id) => id !== documentId,
        );
        return { ...prev, documents: filteredDocuments };
      });
    }
  };
};

export const useUploadDocuments = (
  {
    type,
    chat,
  }: {
    type: "file" | "url" | "site" | "youtube" | "text" | "github";
    chat?: Doc<"chats">;
  } = { type: "file" },
) => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const generateUploadUrlMutation = useMutation(
    api.documents.mutations.generateUploadUrl,
  );
  const createMutation = useMutation(api.documents.mutations.create);
  const setNewChat = useSetAtom(newChatAtom);

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
        }),
      );

      // Update chat input with new documents
      if (chat) {
        if (chatId !== "new") {
          await updateChatMutation({
            chatId,
            updates: {
              documents: [...chat.documents, ...documentIds],
            },
          });
        } else {
          setNewChat((prev) => ({
            ...prev,
            documents: [...prev.documents, ...documentIds],
          }));
        }
      }

      toast(
        `${files.length} file${files.length > 1 ? "s" : ""} uploaded successfully`,
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
