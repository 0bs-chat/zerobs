import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ProjectDocumentListItem } from "./document-list-item";

export function ProjectDocumentList({
  projectId,
}: {
  projectId: Id<"projects">;
}) {
  const projectDocuments = useQuery(
    api.projectDocuments.queries.getAll,
    projectId
      ? {
          projectId,
          paginationOpts: { numItems: 50, cursor: null },
        }
      : "skip",
  );
  const toggleSelectAll = useMutation(
    api.projectDocuments.mutations.toggleSelect,
  );

  const handleSelectAll = async (checked: boolean) => {
    await toggleSelectAll({
      projectId,
      selected: checked,
    });
  };

  if (!projectDocuments || projectDocuments.projectDocuments.length === 0) {
    return (
      <Card className="p-4 rounded-md">
        <p className="text-muted-foreground text-center">
          No documents added yet
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2 bg-card rounded-md shadow-sm border p-4">
      <div className="flex items-center px-3 gap-3">
        <Checkbox
          checked={projectDocuments.projectDocuments.every(
            (projectDocument) => projectDocument.selected,
          )}
          onCheckedChange={(checked) =>
            handleSelectAll(checked.valueOf() as boolean)
          }
        />
        <label htmlFor="select-all" className="text-sm text-muted-foreground">
          Select All (
          {
            projectDocuments.projectDocuments.filter(
              (projectDocument) => projectDocument.selected,
            ).length
          }
          /{projectDocuments.projectDocuments.length})
        </label>
      </div>
      <div className="flex flex-col gap-2">
        {projectDocuments.projectDocuments.map((projectDocument) => (
          <ProjectDocumentListItem
            key={projectDocument._id}
            projectDocument={projectDocument}
          />
        ))}
      </div>
    </div>
  );
}
