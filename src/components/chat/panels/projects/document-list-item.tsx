import { Checkbox } from "@/components/ui/checkbox";
import { Trash2Icon, EyeIcon, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import type { ProjectDocument } from "./types";
import { getDocTagInfo } from "@/lib/helper";
import { Button } from "@/components/ui/button";
import { useSetAtom } from "jotai";
import { documentDialogOpenAtom } from "@/store/chatStore";
import { Card } from "@/components/ui/card";

export function ProjectDocumentListItem({
  projectDocument,
}: {
  projectDocument: ProjectDocument;
}) {
  const {
    mutate: updateProjectDocument,
    isPending: isUpdatingProjectDocument,
  } = useMutation({
    mutationFn: useConvexMutation(api.projectDocuments.mutations.update),
  });
  const { mutate: removeDocument, isPending: isRemovingDocument } = useMutation(
    {
      mutationFn: useConvexMutation(api.projectDocuments.mutations.remove),
    },
  );
  const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);

  return (
    <Card
      key={projectDocument._id}
      className={`flex flex-row items-center justify-between rounded-xl p-3 transition-colors ${projectDocument.selected ? "bg-muted/50" : ""}`}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          className="size-5 cursor-pointer"
          checked={projectDocument.selected}
          onCheckedChange={(checked) =>
            updateProjectDocument({
              projectDocumentId: projectDocument._id,
              update: { selected: checked.valueOf() as boolean },
            })
          }
        />
        {(() => {
          const { icon: Icon, className } = getDocTagInfo(
            projectDocument.document,
          );
          return (
            <>
              {isRemovingDocument ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <Icon className={className} />
              )}
            </>
          );
        })()}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-1">
            {isRemovingDocument ? (
              <p className="font-medium text-muted-foreground items-center flex gap-2">
                Removing...
              </p>
            ) : (
              <>
                <p className="font-medium" style={{ wordBreak: "break-word" }}>
                  {projectDocument.document.name}
                </p>
                <p
                  className="text-sm text-muted-foreground"
                  style={{ wordBreak: "break-word" }}
                >
                  Size: {(projectDocument.document.size / 1024).toFixed(2)} KB
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setDocumentDialogOpen(projectDocument.document._id);
          }}
          disabled={isUpdatingProjectDocument}
        >
          <EyeIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            removeDocument({ projectDocumentId: projectDocument._id })
          }
          disabled={isRemovingDocument}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
