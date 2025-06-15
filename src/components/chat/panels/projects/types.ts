import type { Doc, Id } from "../../../../../convex/_generated/dataModel";

export type ProjectWithDocuments = Doc<"projects"> & {
  documents?: Array<Doc<"projectDocuments"> & { document: Doc<"documents"> }>;
};

export type ProjectDocument = Doc<"projectDocuments"> & {
  document: Doc<"documents">;
};

export interface ProjectDetailsProps {
  openedProjectId: Id<"projects">;
  onBack: () => void;
}

export interface ProjectsListProps {
  onSelect: (id: Id<"projects">) => void;
  onOpen: (id: Id<"projects">) => void;
  onNewProject: () => void;
  onRemove: (id: Id<"projects">) => void;
}
