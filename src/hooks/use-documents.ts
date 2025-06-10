import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";

export const useRemoveDocument = () => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const chatId = params.chatId as Id<"chats"> | "new";
  const chatInputQuery = useQuery(api.chatInputs.queries.get, { chatId });
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);

  return (documentId: Id<"documents">) => {
    if (!chatInputQuery?.documents) return;
    updateChatInputMutation({
      chatId: chatId,
      updates: {
        documents: chatInputQuery?.documents.filter((id) => id !== documentId),
      },
    });
  };
};

export const useUploadDocuments = ({ type }: { type: "file" | "url" | "site" | "youtube" | "json" } = { type: "file" }) => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const chatId = params.chatId as Id<"chats"> | "new";
  const chatInputQuery = useQuery(api.chatInputs.queries.get, { chatId });
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);
  const generateUploadUrlMutation = useMutation(
    api.documents.mutations.generateUploadUrl
  );
  const createMultipleMutation = useMutation(
    api.documents.mutations.createMultiple
  );

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

      const documentIds = await createMultipleMutation({
        documents: uploadedStorageIds.map((storageId, index) => {
          const file = files[index];
          return {
            name: file.name,
            type,
            size: file.size,
            key: storageId,
          };
        }),
      });

      // Update chat input with new documents
      const existingDocuments = chatInputQuery?.documents || [];
      await updateChatInputMutation({
        chatId,
        updates: {
          documents: [...existingDocuments, ...documentIds],
        },
      });

      toast(
        `${files.length} file${files.length > 1 ? "s" : ""} uploaded successfully`
      );
    } catch (error) {
      console.error("Upload error:", error);
      toast("Error uploading files", {
        description: "There was an error uploading your files",
      });
    }
  };
};

// #########################################################
//                gotta write this again.
// #########################################################

// export function useAddDocumentToProject() {
//   const addDocuments = useMutation(
//     api.projectDocuments.mutations.createMultiple
//   );

//   return async (
//     projectId: Id<"projects">,
//     documentId: Id<"documents"> | Id<"documents">[]
//   ) => {
//     if (!projectId || !documentId) return;
//     const documentIds = Array.isArray(documentId) ? documentId : [documentId];
//     await addDocuments({
//       projectId,
//       documentIds,
//     });
//   };
// }

// type CreateDocumentArgs = {
//   name: string;
//   type: "file" | "text" | "url" | "site" | "youtube";
//   size: number;
//   key: string | Id<"_storage">;
// };

// export const useCreateDocument = () => {
//   const createDocument = useMutation(api.documents.mutations.createMultiple);

//   return async (documents: CreateDocumentArgs[] | CreateDocumentArgs) => {
//     const docsArray = Array.isArray(documents) ? documents : [documents];
//     return await createDocument({
//       documents: docsArray.map((document) => ({
//         name: document.name,
//         type: document.type,
//         size: document.size,
//         key: document.key,
//       })),
//     });
//   };
// };

export const mergeAndCreateDocument = () => {
  async (filePaths: string[]) => {
    const fileContents = await Promise.all(
      filePaths.map(async (path) => {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to fetch ${path}`);
        return await response.text();
      })
    );

    const mergedContent = fileContents.join("\n\n");

    const mergedFile = new File([mergedContent], "merged-document.txt", {
      type: "text/plain",
    });

    const uploadDocuments = useUploadDocuments();

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(mergedFile);
    const mergedFileList = dataTransfer.files;

    await uploadDocuments(mergedFileList);
  };
};
