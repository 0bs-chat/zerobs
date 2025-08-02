import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface FileDisplayProps {
  fileId: Id<"documents">;
}

export const FileDisplay = ({ fileId }: FileDisplayProps) => {
  const generateDownloadUrl = useMutation(
    api.documents.mutations.generateDownloadUrl,
  );
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getUrl = async () => {
      if (!fileId) return;
      try {
        const url = await generateDownloadUrl({ documentId: fileId });
        setImageUrl(url);
      } catch (e: any) {
        setError(e.message || "Failed to load file");
      }
    };
    getUrl();
  }, [fileId, generateDownloadUrl]);

  if (error) {
    return (
      <div className="text-red-500 text-xs">Error loading image: {error}</div>
    );
  }

  if (!imageUrl) {
    return <Skeleton className="h-32 rounded-md" />;
  }

  return (
    <div className="rounded-md max-h-[400px] w-auto">
      <img
        src={imageUrl}
        alt="Tool output"
        className="rounded-md max-h-[400px] w-auto object-contain"
      />
    </div>
  );
};
