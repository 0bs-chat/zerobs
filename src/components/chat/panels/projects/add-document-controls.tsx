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
import type { Id } from "../../../../../convex/_generated/dataModel";
import { documentUploadHandlers } from "@/hooks/use-documents";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export const AddDocumentControls = ({
  projectId,
}: {
  projectId: Id<"projects">;
}) => {
  const {
    handleFileUpload,
    handleUrlUpload,
    handleSiteUpload,
    handleYoutubeUpload,
  } = documentUploadHandlers(projectId);

  // Local state for dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<
    "url" | "site" | "youtube" | null
  >(null);
  const [inputValue, setInputValue] = useState("");

  const openDialog = (type: "url" | "site" | "youtube") => {
    setDialogType(type);
    setDialogOpen(true);
    setInputValue("");
  };

  const handleDialogAdd = async () => {
    if (!inputValue || !dialogType) return;
    if (dialogType === "url") {
      await handleUrlUpload(inputValue);
    } else if (dialogType === "site") {
      await handleSiteUpload(inputValue);
    } else if (dialogType === "youtube") {
      await handleYoutubeUpload(inputValue);
    }
    setDialogOpen(false);
    setInputValue("");
    setDialogType(null);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="bg-primary text-primary-foreground cursor-pointer"
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
          <DropdownMenuItem onClick={() => openDialog("url")}>
            <LinkIcon className="size-4 mr-2" />
            Attach URL
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openDialog("site")}>
            <GlobeIcon className="size-4 mr-2" />
            Crawl Site
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openDialog("youtube")}>
            <YoutubeIcon className="size-4 mr-2" />
            Attach YouTube
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === "url" && "Add URL"}
              {dialogType === "site" && "Crawl Site"}
              {dialogType === "youtube" && "Add YouTube vid"}
            </DialogTitle>
            <DialogDescription>
              {dialogType === "url" &&
                "for eg: https://www.shivam.ing or https://github.com/mantrakp04"}
              {dialogType === "site" &&
                " enter urls whose content you want to crawl and add"}
              {dialogType === "youtube" &&
                "for eg: https://youtu.be/dQw4w9WgXcQ (don't go to this url)"}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Enter ${dialogType ?? "value"}`}
          />
          <DialogFooter>
            <Button onClick={handleDialogAdd}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
