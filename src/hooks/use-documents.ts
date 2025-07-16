import type { Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { newChatDocumentsAtom } from "@/store/chatStore";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo, type RefObject } from "react";
import type { AutosizeTextAreaRef } from "@/components/ui/autosize-textarea";

export const useRemoveDocument = () => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;

  const chat = useQuery(
    api.chats.queries.get,
    chatId !== undefined && chatId !== null && chatId !== ""
      ? { chatId }
      : "skip"
  );
  const updateChatInputMutation = useMutation(api.chats.mutations.update);
  const setNewChatDocuments = useSetAtom(newChatDocumentsAtom);

  return (documentId: Id<"documents">) => {
    if (chatId !== undefined && chatId !== null && chatId !== "") {
      if (!chat?.documents) {
        return;
      }
      const filteredDocuments = chat.documents.filter(
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

      if (chatId !== undefined && chatId !== null && chatId !== "") {
        await updateChatMutation({
          chatId,
          updates: {
            documents: [...(chat?.documents || []), ...documentIds],
          },
        });
      } else {
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
      ? chat?.documents || []
      : newChatDocuments;
  }, [chatId, chat?.documents, newChatDocuments]);

  const documents = useQuery(
    api.documents.queries.getMultiple,
    documentIds.length > 0 ? { documentIds } : "skip"
  );

  return { documents, documentIds };
};

export function documentUploadHandlers(projectId: Id<"projects">) {
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

export function useFileUploadHandlers(
  textareaRef: RefObject<AutosizeTextAreaRef>
) {
  const uploadDocuments = useUploadDocuments({ type: "file" });
  // most common file types supported, no vids, max 5mb
  useEffect(() => {
    // Helper to filter and validate files
    const filterFiles = (files: FileList | File[]) => {
      const allowedExtensions = [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "bmp",
        "webp", // images
        "pdf", // pdf
        "txt",
        "md",
        "csv", // text
        "doc",
        "docx", // word
        "xls",
        "xlsx", // excel
        "ppt",
        "pptx", // powerpoint
        "zip",
        "rar",
        "7z", // archives
        "json",
      ];
      const allowedFiles: File[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isVideo = file.type.startsWith("video/");
        const isTooLarge = file.size > 5 * 1024 * 1024; // 5MB
        const ext = file.name.split(".").pop()?.toLowerCase();

        if (isVideo) {
          toast("Video files are not supported.");
          continue;
        }
        if (isTooLarge) {
          toast(`"${file.name}" is too large (max 5MB).`);
          continue;
        }
        if (!ext || !allowedExtensions.includes(ext)) {
          toast(`File type not supported for "${file.name}".`);
          continue;
        }
        allowedFiles.push(file);
      }
      return allowedFiles;
    };

    const textarea = textareaRef.current?.textArea;
    if (!textarea) return;

    // Handle paste event
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        const allowedFiles = filterFiles(files);
        if (allowedFiles.length > 0) {
          const dataTransfer = new DataTransfer();
          allowedFiles.forEach((file) => dataTransfer.items.add(file));
          uploadDocuments(dataTransfer.files);
        }
        e.preventDefault();
      }
    };

    // Handle drop event
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const allowedFiles = filterFiles(e.dataTransfer.files);
        if (allowedFiles.length > 0) {
          const dataTransfer = new DataTransfer();
          allowedFiles.forEach((file) => dataTransfer.items.add(file));
          uploadDocuments(dataTransfer.files);
        }
      }
    };

    // Prevent default dragover to allow drop
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    // Attach listeners to the chat input container for drag-and-drop
    const chatInputDiv = textarea.parentElement?.parentElement; // .AutosizeTextarea > div > chat input container
    if (chatInputDiv) {
      chatInputDiv.addEventListener("drop", handleDrop);
      chatInputDiv.addEventListener("dragover", handleDragOver);
    }
    textarea.addEventListener("paste", handlePaste);

    return () => {
      textarea.removeEventListener("paste", handlePaste);
      if (chatInputDiv) {
        chatInputDiv.removeEventListener("drop", handleDrop);
        chatInputDiv.removeEventListener("dragover", handleDragOver);
      }
    };
  }, [uploadDocuments]);
}
