import { ScrollArea } from "@/components/ui/scroll-area";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { useChat } from "@/store/use-chat";
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

interface ProjectDocumentProps {
  projectDocument: Doc<"projectDocuments"> & { document: Doc<"documents"> };
}

const ProjectDocument = ({ projectDocument }: ProjectDocumentProps) => {
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
};

export const ProjectsPanel = () => {
  const { selectedProjectId, setSelectedProjectId, setProjectDialogOpen } =
    useChat();
  const generateUploadUrl = useMutation(
    api.documents.mutations.generateUploadUrl
  );
  const updateProject = useMutation(api.projects.mutations.update);
  const addDocumentToProject = useAction(api.projectDocuments.actions.add);
  const toggleSelectAll = useMutation(
    api.projectDocuments.mutations.toggleSelect
  );
  const createDocument = useMutation(api.documents.mutations.create);
  const removeProject = useMutation(api.projects.mutations.remove);

  const allProjects = useQuery(api.projects.queries.getAll, {
    paginationOpts: { numItems: 20, cursor: null },
  });

  const project = useQuery(
    api.projects.queries.get,
    selectedProjectId
      ? {
          projectId: selectedProjectId as Id<"projects">,
        }
      : "skip"
  );

  const projectDocuments = useQuery(
    api.projectDocuments.queries.getAll,
    selectedProjectId
      ? {
          projectId: selectedProjectId as Id<"projects">,
          paginationOpts: { numItems: 50, cursor: null },
        }
      : "skip"
  );

  const debouncedUpdateSystemPrompt = useDebouncedCallback((value: string) => {
    if (!selectedProjectId) return;
    updateProject({
      projectId: selectedProjectId,
      updates: {
        systemPrompt: value,
      },
    });
  }, 1000);

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

    const projectId = selectedProjectId as Id<"projects">;

    const documentIds = await Promise.all(
      Array.from(fileIdMap.entries()).map(async ([storageId]) => {
        const documentId = await createDocument({
          name: fileIdMap.get(storageId)?.name || "Untitled Document",
          type: "file",
          size: fileIdMap.get(storageId)?.size || 0,
          key: storageId as Id<"_storage">,
        });
        return documentId;
      })
    );

    await Promise.all(
      documentIds.map(async (documentId) => {
        await addDocumentToProject({
          projectId,
          documentIds: [documentId as Id<"documents">],
        });
      })
    );
  };

  const handleUrlUpload = async () => {
    const url = prompt("Enter URL:");
    if (!url) return;

    try {
      const encodedUrl = encodeURIComponent(url);
      const documentId = await createDocument({
        name: url,
        type: "url",
        size: 0,
        key: `http://localhost:5002/crawl/?url=${encodedUrl}&max_depth=0`,
      });

      await addDocumentToProject({
        projectId: selectedProjectId as Id<"projects">,
        documentIds: [documentId as Id<"documents">],
      });
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
      const documentId = await createDocument({
        name: url,
        type: "site",
        size: 0,
        key: `http://localhost:5002/crawl/?url=${encodedUrl}&max_depth=2`,
      });

      await addDocumentToProject({
        projectId: selectedProjectId as Id<"projects">,
        documentIds: [documentId as Id<"documents">],
      });
    } catch (error) {
      console.error("Failed to crawl site:", error);
      alert("Failed to crawl site. Please try again.");
    }
  };

  const handleYoutubeUpload = async () => {
    const url = prompt("Enter YouTube URL:");
    if (!url) return;

    const documentId = await createDocument({
      name: url,
      type: "youtube",
      size: 0,
      key: url,
    });

    await addDocumentToProject({
      projectId: selectedProjectId as Id<"projects">,
      documentIds: [documentId as Id<"documents">],
    });
  };

  const handleSelectAll = async (checked: boolean) => {
    if (!selectedProjectId) return;

    await toggleSelectAll({
      projectId: selectedProjectId,
      selected: checked,
    });
  };

  if (!project) {
    return (
      <div className="flex flex-col gap-3 h-full ">
        <div className="flex items-center text-center justify-between">
          <h2 className="text-xl font-bold">Select a Project</h2>
          <Button
            variant="default"
            size="sm"
            className="bg-primary text-primary-foreground"
            onClick={() => setProjectDialogOpen(true)}
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>
        <ScrollArea className="h-[400px] gap-2">
          {allProjects?.page.map((project) => (
            <Card
              key={project._id}
              className="group relative group/card mb-2 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-accent/30 duration-300 transition-colors"
              onClick={() => setSelectedProjectId(project._id)}
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
                variant="ghost"
                size="icon"
                className="absolute bg-background hover:text-destructive-foreground hover:transition-all hover:duration-300 right-2 opacity-0 group-hover/card:opacity-100 hover:bg-destructive  transition-opacity duration-300"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeProject({ projectId: project._id });
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

  return (
    <div className="flex flex-col gap-4 h-full ">
      <div className="flex flex-col gap-0 ">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{project.name}</h2>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setSelectedProjectId(undefined as unknown as Id<"projects">);
            }}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
        {project.description && (
          <p className="text-muted-foreground/80">{project.description}</p>
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
            {projectDocuments &&
              projectDocuments.projectDocuments.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={projectDocuments.projectDocuments.every(
                      (projectDocument) => projectDocument.selected
                    )}
                    onCheckedChange={(checked) =>
                      handleSelectAll(checked.valueOf() as boolean)
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    Select All
                  </span>
                </div>
              )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="bg-primary text-primary-foreground"
              >
                <PlusIcon className="size-4" />
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
        </div>
        <ScrollArea className="h-[400px]">
          {!projectDocuments ||
          projectDocuments.projectDocuments.length === 0 ? (
            <Card className="p-4">
              <p className="text-muted-foreground text-center">
                No documents added yet
              </p>
            </Card>
          ) : (
            <Card className="divide-y">
              {projectDocuments.projectDocuments.map((projectDocument) => (
                <ProjectDocument
                  key={projectDocument._id}
                  projectDocument={projectDocument}
                />
              ))}
            </Card>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};
