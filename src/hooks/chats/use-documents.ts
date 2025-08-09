import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { newChatAtom, chatIdAtom } from "@/store/chatStore";
import { useSetAtom, useAtomValue } from "jotai";

export const useRemoveDocument = () => {
  const chatId = useAtomValue(chatIdAtom);

  const { data: chatInputQuery } = useQuery({
    ...convexQuery(
      api.chats.queries.get,
      chatId !== "new" ? { chatId } : "skip"
    ),
  });

  const { mutate: updateChatInputMutation } = useMutation({
    mutationFn: useConvexMutation(api.chats.mutations.update),
  });

  const setNewChat = useSetAtom(newChatAtom);

  return (documentId: Id<"documents">) => {
    if (chatId !== "new") {
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
      setNewChat((prev) => {
        const filteredDocuments = prev.documents.filter(
          (id) => id !== documentId
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
  } = { type: "file" }
) => {
  const chatId = useAtomValue(chatIdAtom);
  const { mutateAsync: updateChatMutation } = useMutation({
    mutationFn: useConvexMutation(api.chats.mutations.update),
  });
  const { mutateAsync: generateUploadUrlMutation } = useMutation({
    mutationFn: useConvexMutation(api.documents.mutations.generateUploadUrl),
  });
  const { mutateAsync: createMutation } = useMutation({
    mutationFn: useConvexMutation(api.documents.mutations.create),
  });
  const setNewChat = useSetAtom(newChatAtom);

  return async (files: FileList) => {
    try {
      const uploadedStorageIds: Id<"_storage">[] = [];

      for (const file of Array.from(files)) {
        // Get upload URL
        const uploadUrlResult = await generateUploadUrlMutation({});

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
