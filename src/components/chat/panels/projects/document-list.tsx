import { Card } from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ProjectDocumentListItem } from "./document-list-item";
import { Toggle } from "@/components/ui/toggle";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorState } from "@/components/ui/error-state";

export function ProjectDocumentList({
  projectId,
}: {
  projectId: Id<"projects">;
}) {
  const {
    data: projectDocuments,
    isLoading: isLoadingProjectDocs,
    isError: isProjectDocumentsError,
    error: projectDocumentsError,
  } = useQuery({
    ...convexQuery(
      api.projectDocuments.queries.getAll,
      projectId
        ? {
            projectId,
            paginationOpts: { numItems: 25, cursor: null },
          }
        : "skip"
    ),
  });

  const { mutate: toggleSelectAll, isPending: isTogglingSelectAll } =
    useMutation({
      mutationFn: useConvexMutation(
        api.projectDocuments.mutations.toggleSelect
      ),
    });

  const handleSelectAll = async (checked: boolean) => {
    toggleSelectAll({
      projectId,
      selected: checked,
    });
  };

  if (!projectDocuments || projectDocuments.projectDocuments.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-muted-foreground text-center">
          No documents added yet
        </p>
      </Card>
    );
  }

  const allSelected = projectDocuments.projectDocuments.every(
    (projectDocument) => projectDocument.selected
  );

  return (
    <div className="flex flex-col gap-2 bg-card rounded-xl shadow-sm border p-4">
      <div className="flex items-center justify-start">
        <div className="flex items-center gap-2">
          <Toggle
            pressed={allSelected}
            onPressedChange={(pressed) => handleSelectAll(pressed)}
            disabled={isTogglingSelectAll || isLoadingProjectDocs}
            className="w-36 gap-2 cursor-pointer rounded-lg flex items-center justify-center"
            variant={allSelected ? "default" : "outline"}
          >
            <span className="transition-all duration-200 ease-in-out">
              {isTogglingSelectAll
                ? allSelected
                  ? "Deselecting..."
                  : "Selecting..."
                : allSelected
                  ? "Deselect All"
                  : "Select All"}
            </span>

            <span className="transition-all duration-200 ease-in-out">
              (
              {
                projectDocuments.projectDocuments.filter(
                  (projectDocument) => projectDocument.selected
                ).length
              }
              /{projectDocuments.projectDocuments.length})
            </span>
          </Toggle>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {isLoadingProjectDocs ? (
          <div className="flex items-center justify-center gap-2 py-4 ">
            <LoadingSpinner className="h-6 w-6" />
            <p className="text-sm text-muted-foreground">
              Loading project documents...
            </p>
          </div>
        ) : isProjectDocumentsError || projectDocumentsError ? (
          <div className="flex items-center justify-center gap-2  ">
            <ErrorState
              className="h-12 w-full p-2 gap-2 flex items-center justify-center"
              title="Error loading project documents"
              error={projectDocumentsError}
              showDescription={false}
            />
          </div>
        ) : (
          projectDocuments.projectDocuments.map((projectDocument) => (
            <ProjectDocumentListItem
              key={projectDocument._id}
              projectDocument={projectDocument}
            />
          ))
        )}
      </div>
    </div>
  );
}
