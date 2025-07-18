import { Card } from "@/components/ui/card";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ProjectDocumentListItem } from "./document-list-item";
import { Toggle } from "@/components/ui/toggle";

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
      : "skip"
  );
  const toggleSelectAll = useMutation(
    api.projectDocuments.mutations.toggleSelect
  );

  const handleSelectAll = async (checked: boolean) => {
    await toggleSelectAll({
      projectId,
      selected: checked,
    });
  };

  if (!projectDocuments || projectDocuments.projectDocuments.length === 0) {
    return (
      <Card className="p-4 rounded-lg">
        <p className="text-muted-foreground text-center">
          No documents added yet
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-2 bg-card shadow-sm border p-4 rounded-lg">
      <div className="flex items-center  gap-3">
        <Toggle
          variant="outline"
          className="text-sm text-muted-foreground cursor-pointer"
          onClick={() => {
            handleSelectAll(
              !projectDocuments.projectDocuments.every(
                (projectDocument) => projectDocument.selected
              )
            );
          }}
        >
          {projectDocuments.projectDocuments.every(
            (projectDocument) => projectDocument.selected
          )
            ? "Deselect All"
            : "Select All"}{" "}
          (
          {
            projectDocuments.projectDocuments.filter(
              (projectDocument) => projectDocument.selected
            ).length
          }
          /{projectDocuments.projectDocuments.length})
        </Toggle>
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
