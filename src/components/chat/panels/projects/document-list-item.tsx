import { Trash2Icon, EyeIcon, CheckIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { ProjectDocument } from "./types";
import { getTagInfo } from "@/lib/helpers";
import { Button } from "@/components/ui/button";
import { useSetAtom } from "jotai";
import { documentDialogOpenAtom } from "@/store/chatStore";
import { Card } from "@/components/ui/card";

export function ProjectDocumentListItem({
  projectDocument,
}: {
  projectDocument: ProjectDocument;
}) {
  const updateProjectDocument = useMutation(
    api.projectDocuments.mutations.update
  );
  const removeDocument = useMutation(api.projectDocuments.mutations.remove);
  const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);

  return (
    <Card
      key={projectDocument._id}
      className={`flex items-center justify-between p-1 transition-colors hover:bg-accent/50 dark:hover:bg-accent cursor-pointer ${projectDocument.selected ? "bg-secondary/80" : ""}`}
      onClick={() =>
        updateProjectDocument({
          projectDocumentId: projectDocument._id,
          update: { selected: !projectDocument.selected },
        })
      }
    >
      <div className="flex flex-row items-center gap-3 w-full p-2">
        {!projectDocument.selected ? (
          <div>
            {(() => {
              const { icon: Icon, className } = getTagInfo(
                projectDocument.document.type,
                projectDocument.document.status
              );
              return <Icon className={className} />;
            })()}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CheckIcon className="size-5 text-green-500" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium" style={{ wordBreak: "break-word" }}>
            {projectDocument.document.name}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            Size: {(projectDocument.document.size / 1024).toFixed(2)} KB
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer hover:text-primary"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setDocumentDialogOpen(projectDocument.document._id);
            }}
          >
            <EyeIcon className=" size-5" />
          </Button>
          <Button
            variant="ghost"
            className="cursor-pointer hover:text-destructive"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              removeDocument({ projectDocumentId: projectDocument._id });
            }}
          >
            <Trash2Icon className="size-5 " />
          </Button>
        </div>
      </div>
    </Card>
  );
}
