import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  GlobeIcon,
  LinkIcon,
  PaperclipIcon,
  PlusIcon,
  YoutubeIcon,
} from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useUploadDocuments } from "@/hooks/use-documents";

export const AddDocumentControls = ({ projectId }: { projectId: Id<"projects"> }) => {
  const uploadDocuments = useUploadDocuments({ type: "file", addToChatInput: false });
  const createDocuments = useMutation(api.documents.mutations.createMultiple);
  const createProjectDocuments = useMutation(api.projectDocuments.mutations.createMultiple);

  const handleFileUpload = async (files: FileList) => {
    const documentIds = await uploadDocuments(files);

    await createProjectDocuments({
      projectId,
      documentIds: documentIds || [],
    });
  };

  const handleUrlUpload = async () => {
    const url = prompt("Enter URL:");
    if (!url) return;

    const documentIds = await createDocuments({
      documents: [{
        name: url,
        type: "url",
        size: 0,
        key: url,
      }],
    });

    await createProjectDocuments({
      projectId,
      documentIds: documentIds || [],
    });
  };

  const handleSiteUpload = async () => {
    const url = prompt("Enter website URL to crawl:");
    if (!url) return;

    const documentIds = await createDocuments({
      documents: [{
        name: url,
        type: "site",
        size: 0,
        key: url,
      }],
    });

    await createProjectDocuments({
      projectId,
      documentIds: documentIds || [],
    });
  };

  const handleYoutubeUpload = async () => {
    const url = prompt("Enter YouTube URL:");
    if (!url) return;

    const documentIds = await createDocuments({
      documents: [{
        name: url,
        type: "youtube",
        size: 0,
        key: url,
      }],
    });

    await createProjectDocuments({
      projectId,
      documentIds: documentIds || [],
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="bg-primary text-primary-foreground"
        >
          <PlusIcon className="size-4" />
          Add Document
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.multiple = true;
            input.accept = "*";
            input.onchange = (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (!files) return;
              handleFileUpload(files);
            };
            input.click();
          }}
        >
          <PaperclipIcon className="size-4 mr-2" />
          Attach Documents
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleUrlUpload}>
          <LinkIcon className="size-4 mr-2" />
          Attach URL
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSiteUpload}>
          <GlobeIcon className="size-4 mr-2" />
          Crawl Site
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleYoutubeUpload}>
          <YoutubeIcon className="size-4 mr-2" />
          Attach YouTube
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 