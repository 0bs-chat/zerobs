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
import { useAction, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useUploadDocuments } from "@/hooks/use-documents";
import { useParams } from "@tanstack/react-router";

export const AddDocumentControls = ({
  projectId,
}: {
  projectId: Id<"projects">;
}) => {
  const uploadDocuments = useUploadDocuments({
    type: "file"
  });
  const createDocuments = useAction(api.documents.mutations.create);
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

    await updateChatInput({
      chatId,
      updates: {
        projectId,
      },
    });
  };

  const handleUrlUpload = async () => {
    const url = prompt("Enter URL:");
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

  const handleSiteUpload = async () => {
    const url = prompt("Enter website URL to crawl:");
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

  const handleYoutubeUpload = async () => {
    const url = prompt("Enter YouTube URL:");
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
