import { Checkbox } from "@/components/ui/checkbox";
import { Trash2Icon, EyeIcon } from "lucide-react";
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
      className={`flex flex-row items-center justify-between p-3 transition-colors ${projectDocument.selected ? "bg-muted/50" : ""}`}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={projectDocument.selected}
          onCheckedChange={(checked) =>
            updateProjectDocument({
              projectDocumentId: projectDocument._id,
              update: { selected: checked.valueOf() as boolean },
            })
          }
        />
        {(() => {
          const { icon: Icon, className } = getTagInfo(
            projectDocument.document.type,
            projectDocument.document.status
          );
          return <Icon className={className} />;
        })()}
        <div className="flex-1 min-w-0">
          <p className="font-medium" style={{ wordBreak: "break-word" }}>
            {projectDocument.document.name}
          </p>
          <p
            className="text-sm text-muted-foreground"
            style={{ wordBreak: "break-word" }}
          >
            Size: {(projectDocument.document.size / 1024).toFixed(2)} KB
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setDocumentDialogOpen(projectDocument.document._id);
          }}
        >
          <EyeIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            removeDocument({ projectDocumentId: projectDocument._id })
          }
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
