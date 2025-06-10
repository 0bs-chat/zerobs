import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import {
  projectDialogOpenAtom,
  selectedProjectIdAtom,
} from "@/store/chatStore";
import { Card } from "@/components/ui/card";
import {
  FileIcon,
  GlobeIcon,
  LinkIcon,
  PaperclipIcon,
  PlusIcon,
  Trash2Icon,
  TrashIcon,
  XIcon,
  YoutubeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { useDebouncedCallback } from "use-debounce";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import {
//   useAddDocumentToProject,
//   useCreateDocument,
// } from "@/hooks/use-documents";
import { useAtomValue, useSetAtom } from "jotai";

// --- Project List ---

function ProjectList({
  onSelect,
  onNewProject,
  onRemove,
}: {
  onSelect: (id: Id<"projects">) => void;
  onNewProject: () => void;
  onRemove: (id: Id<"projects">) => void;
}) {
  const allProjects = useQuery(api.projects.queries.getAll, {
    paginationOpts: { numItems: 20, cursor: null },
  });

  return (
    <div className="flex flex-col gap-3 h-full ">
      <div className="flex items-center text-center justify-between">
        <h2 className="text-xl font-bold">Select a Project</h2>
        <Button
          variant="default"
          size="sm"
          className="bg-primary text-primary-foreground"
          onClick={onNewProject}
        >
          <PlusIcon className="size-4" />
          New Project
        </Button>
      </div>
      <ScrollArea className="h-[400px] gap-2">
        {allProjects?.page.map((project) => (
          <Card
            key={project._id}
            className="group relative group/card mb-2 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-accent/30 duration-300 transition-colors"
            onClick={() => onSelect(project._id)}
          >
            <div className="flex items-center justify-between flex-1">
              <h3 className="font-medium">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-muted-foreground">
                  {project.description}
                </p>
              )}
            </div>
            <Button
              variant="default"
              size="icon"
              className="h-9 w-9  absolute right-2 hover:bg-destructive hover:text-destructive-foreground  border border-border opacity-0 group-hover/card:opacity-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove(project._id);
              }}
            >
              <TrashIcon className="size-5" />
            </Button>
          </Card>
        ))}
      </ScrollArea>
    </div>
  );
}

// --- Add Document Controls ---

function AddDocumentControls({
  projectId,
  onDocumentAdded,
}: {
  projectId: Id<"projects">;
  onDocumentAdded?: () => void;
}) {
  const generateUploadUrl = useMutation(
    api.documents.mutations.generateUploadUrl
  );

  // const createDocument = useCreateDocument();
  // const addDocumentToProject = useAddDocumentToProject();

  const handleFileUpload = async (files: FileList) => {
    const fileIdMap = new Map<Id<"_storage">, File>();

    await Promise.all(
      Array.from(files).map(async (file) => {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        const { storageId } = await result.json();
        fileIdMap.set(storageId as Id<"_storage">, file);
      })
    );

    // const documentIds = await Promise.all(
    //   Array.from(fileIdMap.entries()).map(async ([storageId]) => {
    //       const [documentId] = await createDocument({
    //       name: fileIdMap.get(storageId)?.name || "Untitled Document",
    //       type: "file",
    //       size: fileIdMap.get(storageId)?.size || 0,
    //       key: storageId as Id<"_storage">,
    //     });
    //     return documentId;
    //   })
    // );

    // await Promise.all(
    //   documentIds.map(async (documentId) => {
    //     await addDocumentToProject(projectId, documentId as Id<"documents">);
    //   })
    // );
  };

  const handleUrlUpload = async () => {
    const url = prompt("Enter URL:");
    if (!url) return;

    try {
      const encodedUrl = encodeURIComponent(url);
      // const documentId = await createDocument({
      //   name: url,
      //   type: "url",
      //   size: 0,
      //   key: `http://localhost:5002/crawl/?url=${encodedUrl}&max_depth=0`,
      // });

      // await addDocumentToProject(projectId, documentId);
      onDocumentAdded?.();
    } catch (error) {
      console.error("Failed to add URL:", error);
      alert("Failed to add URL. Please try again.");
    }
  };

  const handleSiteUpload = async () => {
    const url = prompt("Enter website URL to crawl:");
    if (!url) return;

    try {
      const encodedUrl = encodeURIComponent(url);
      // const documentId = await createDocument({
      //   name: url,
      //   type: "site",
      //   size: 0,
      //   key: `http://localhost:5002/crawl/?url=${encodedUrl}&max_depth=2`,
      // });

      // await addDocumentToProject(projectId, documentId as Id<"documents">[]);
      onDocumentAdded?.();
    } catch (error) {
      console.error("Failed to crawl site:", error);
      alert("Failed to crawl site. Please try again.");
    }
  };

  const handleYoutubeUpload = async () => {
    const url = prompt("Enter YouTube URL:");
    if (!url) return;

    // const documentId = await createDocument({
    //   name: url,
    //   type: "youtube",
    //   size: 0,
    //   key: url,
    // });

    // await addDocumentToProject(projectId, documentId as Id<"documents">[]);
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
}

// --- Project Document List Item ---

function ProjectDocumentListItem({
  projectDocument,
}: {
  projectDocument: Doc<"projectDocuments"> & { document: Doc<"documents"> };
}) {
  const updateProjectDocument = useMutation(
    api.projectDocuments.mutations.update
  );
  const removeDocument = useMutation(api.projectDocuments.mutations.remove);

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case "url":
      case "site":
        return <LinkIcon className="size-4" />;
      case "youtube":
        return <YoutubeIcon className="size-4" />;
      default:
        return <FileIcon className="size-4" />;
    }
  };

  return (
    <div className="py-2 px-4 flex items-center justify-between group rounded-md hover:bg-accent/30 transition-colors">
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
        {getDocumentIcon(projectDocument.document.type)}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {projectDocument.document.name}
          </p>
          <p className="text-sm text-muted-foreground">
            Size: {(projectDocument.document.size / 1024).toFixed(2)} KB
          </p>
        </div>
      </div>
      <Trash2Icon
        className="size-6 hover:text-destructive opacity-0 group-hover:opacity-100 hover:duration-300 hover:transition-all transition-opacity  text-muted-foreground group/btn"
        onClick={() =>
          removeDocument({ projectDocumentId: projectDocument._id })
        }
      />
    </div>
  );
}

// --- Project Document List ---

function ProjectDocumentList({ projectId }: { projectId: Id<"projects"> }) {
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
      <Card className="p-4">
        <p className="text-muted-foreground text-center">
          No documents added yet
        </p>
      </Card>
    );
  }

  return (
    <Card className="divide-y">
      <div className="flex items-center gap-2 px-4 py-2">
        <Checkbox
          checked={projectDocuments.projectDocuments.every(
            (projectDocument) => projectDocument.selected
          )}
          onCheckedChange={(checked) =>
            handleSelectAll(checked.valueOf() as boolean)
          }
        />
        <span className="text-sm text-muted-foreground">Select All</span>
      </div>
      {projectDocuments.projectDocuments.map((projectDocument) => (
        <ProjectDocumentListItem
          key={projectDocument._id}
          projectDocument={projectDocument}
        />
      ))}
    </Card>
  );
}

// --- Project Details ---

function ProjectDetails({
  projectId,
  onBack,
}: {
  projectId: Id<"projects">;
  onBack: () => void;
}) {
  const project = useQuery(
    api.projects.queries.get,
    projectId
      ? {
          projectId: projectId as Id<"projects">,
        }
      : "skip"
  );
  const updateProject = useMutation(api.projects.mutations.update);

  const debouncedUpdateSystemPrompt = useDebouncedCallback((value: string) => {
    updateProject({
      projectId,
      updates: {
        systemPrompt: value,
      },
    });
  }, 1000);

  if (!project) return null;

  return (
    <div className="flex flex-col gap-4 h-full ">
      <div className="flex flex-col gap-0 ">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{project.name}</h2>
          <Button
            variant="outline"
            size="icon"
            className="cursor-pointer"
            onClick={onBack}
          >
            <XIcon className="size-5" />
          </Button>
        </div>
        {project.description && (
          <p className="text-muted-foreground">{project.description}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">System Prompt</h3>
        <AutosizeTextarea
          defaultValue={project.systemPrompt}
          onChange={(e) => debouncedUpdateSystemPrompt(e.target.value)}
          className="resize-none border shadow-sm focus-visible:ring-0 focus-visible:ring-offset-0 bg-card p-2"
          minHeight={80}
          maxHeight={200}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between ">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold">Documents</h3>
          </div>
          <AddDocumentControls projectId={projectId} />
        </div>
        <ScrollArea className="h-[400px]">
          <ProjectDocumentList projectId={projectId} />
        </ScrollArea>
      </div>
    </div>
  );
}

// --- Main ProjectsPanel ---

export const ProjectsPanel = () => {
  const selectedProjectId = useAtomValue(selectedProjectIdAtom);
  const setSelectedProjectId = useSetAtom(selectedProjectIdAtom);
  const setProjectDialogOpen = useSetAtom(projectDialogOpenAtom);

  const removeProject = useMutation(api.projects.mutations.remove);

  // Only fetch allProjects if no project is selected
  const showProjectList = !selectedProjectId;

  if (showProjectList) {
    return (
      <ProjectList
        onSelect={(id) => setSelectedProjectId(id)}
        onNewProject={() => setProjectDialogOpen(true)}
        onRemove={(id) => removeProject({ projectId: id })}
      />
    );
  }

  return (
    <ProjectDetails
      projectId={selectedProjectId as Id<"projects">}
      onBack={() =>
        setSelectedProjectId(undefined as unknown as Id<"projects">)
      }
    />
  );
};
