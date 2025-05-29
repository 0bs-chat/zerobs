import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useChat } from "@/store/use-chat";
import { api } from "../../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import type { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { FileIcon, GlobeIcon, YoutubeIcon, LinkIcon } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { useState, useEffect } from "react";

export const DocumentDialog = () => {
  const {
    documentDialogOpen,
    documentDialogDocumentId,
    setDocumentDialogOpen,
  } = useChat();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const document = useQuery(
    api.documents.queries.get,
    documentDialogDocumentId
      ? { documentId: documentDialogDocumentId }
      : "skip",
  );

  const generateDownloadUrl = useMutation(
    api.documents.mutations.generateDownloadUrl,
  );

  useEffect(() => {
    const loadPreviewUrl = async () => {
      if (!document) return;

      if (document.type === "file") {
        const url = await generateDownloadUrl({
          storageId: document.key as Id<"_storage">,
        });
        setPreviewUrl(url);
      } else if (document.type === "url" || document.type === "site") {
        setPreviewUrl(document.key as string);
      } else if (document.type === "youtube") {
        setPreviewUrl(`https://www.youtube.com/embed/${document.key}`);
      }
    };

    loadPreviewUrl();
  }, [document, generateDownloadUrl]);

  const handleDownload = async () => {
    if (!document || document.type !== "file") return;

    const url = await generateDownloadUrl({
      storageId: document.key as Id<"_storage">,
    });

    if (url) {
      window.open(url, "_blank");
    }
  };

  const handleOpen = () => {
    if (!document) return;

    if (document.type === "url" || document.type === "site") {
      window.open(document.key as string, "_blank");
    } else if (document.type === "youtube") {
      window.open(`https://youtube.com/watch?v=${document.key}`, "_blank");
    }
  };

  if (!documentDialogDocumentId) {
    return null;
  }

  const getIcon = () => {
    switch (document?.type) {
      case "file":
        return <FileIcon className="w-8 h-8 text-blue-500" />;
      case "url":
      case "site":
        return <GlobeIcon className="w-8 h-8 text-green-500" />;
      case "youtube":
        return <YoutubeIcon className="w-8 h-8 text-red-500" />;
      default:
        return <LinkIcon className="w-8 h-8 text-gray-500" />;
    }
  };

  const getFileType = () => {
    if (!document?.name) return null;
    const extension = document.name.toLowerCase().split(".").pop();
    if (!extension) return null;

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension)) {
      return "image";
    } else if (extension === "pdf") {
      return "pdf";
    }
    return null;
  };

  const fileType = document?.type === "file" ? getFileType() : null;
  const documentName = document?.name ?? "";

  return (
    <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            <span>{documentName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-grow overflow-hidden">
          <div className="flex flex-col gap-2">
            <div className="text-sm text-muted-foreground">
              Type:{" "}
              {document?.type &&
                document.type.charAt(0).toUpperCase() + document.type.slice(1)}
            </div>
            {document?.size && (
              <div className="text-sm text-muted-foreground">
                Size: {formatBytes(document.size)}
              </div>
            )}
          </div>

          {previewUrl &&
            (document?.type === "youtube" ||
              document?.type === "url" ||
              document?.type === "site" ||
              fileType) && (
              <div className="flex-grow relative min-h-0 bg-muted rounded-md border overflow-hidden">
                {fileType === "image" ? (
                  <img
                    src={previewUrl}
                    alt={documentName}
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                ) : fileType === "pdf" ? (
                  <object
                    data={previewUrl}
                    className="absolute inset-0 w-full h-full"
                    type="application/pdf"
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      PDF preview not supported in your browser. Please download
                      the file to view it.
                    </div>
                  </object>
                ) : document?.type === "youtube" ? (
                  <iframe
                    src={previewUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <iframe
                    src={previewUrl}
                    className="absolute inset-0 w-full h-full"
                    sandbox="allow-same-origin allow-scripts"
                    style={{
                      transform: "scale(0.95)",
                      transformOrigin: "top left",
                      width: "105.3%", // 100/0.95 to compensate for scale
                      height: "105.3%",
                    }}
                  />
                )}
              </div>
            )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          {document?.type === "file" ? (
            <Button onClick={handleDownload}>Download</Button>
          ) : document?.type === "url" ||
            document?.type === "site" ||
            document?.type === "youtube" ? (
            <Button onClick={handleOpen}>
              Open {document.type === "youtube" ? "in YouTube" : "in Browser"}
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => setDocumentDialogOpen(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
