import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMCPs } from "@/hooks/chats/use-mcp";
import { PlusIcon, ServerIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { initialMCPState, type McpType } from "@/store/chatStore";
import { MCP_TEMPLATES, type McpTemplate } from "./templates";
import { MCPBrowseView } from "./mcp-browse-view";
import { MCPFormView } from "./mcp-form-view";

export const MCPDialog = () => {
  const [mcp, setMcp] = useState(initialMCPState);
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState("browse"); // 'browse' or 'form'
  const { handleCreate, validateMCP } = useMCPs();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<number | undefined>(
    undefined,
  );

  const handleSubmit = async () => {
    if (!validateMCP(mcp)) return;

    setIsLoading(true);
    try {
      await handleCreate(mcp, (open) => {
        if (!open) {
          // Reset form state when dialog closes after successful creation
          setMcp(initialMCPState);
          setView("browse");
        }
        setIsOpen(open);
      });
    } catch (error) {
      console.error("Failed to create MCP:", error);
      toast.error("Failed to create MCP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeChange = (type: McpType) => {
    setMcp((prev) => ({
      ...prev,
      type,
      command: type === "stdio" ? prev.command || "" : "",
      url: type === "http" ? prev.url || "" : "",
      dockerImage: type === "docker" ? prev.dockerImage || "" : "",
      dockerPort: type === "docker" ? prev.dockerPort || 0 : 0,
      dockerCommand: type === "docker" ? prev.dockerCommand || "" : "",
      perChat: type === "http" ? false : prev.perChat,
    }));
  };

  const handleTemplateSelect = (template: McpTemplate) => {
    setMcp({
      ...initialMCPState,
      name: template.name,
      type: template.type,
      command: template.command || "",
      url: template.url || "",
      dockerImage: template.dockerImage || "",
      dockerPort: template.dockerPort || 8000,
      dockerCommand: template.dockerCommand || "",
      env: template.env || {},
      perChat: template.perChat || false,
      template: template.template,
    });
    setView("form");
  };

  const handleImport = () => {
    if (selectedTemplate !== undefined) {
      handleTemplateSelect(MCP_TEMPLATES[selectedTemplate]);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) {
          // Reset form state, but not the view. The view is set when the dialog
          // is triggered, preventing a flash of content on close.
          setMcp(initialMCPState);
          setSelectedTemplate(undefined);
        }
        setIsOpen(open);
      }}
      modal
    >
      <DialogTrigger asChild>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="cursor-pointer"
            onClick={() => setView("form")}
          >
            <PlusIcon className="size-4" />
            <span>Create MCP</span>
          </Button>
          <Button
            size="icon"
            className="size-8"
            aria-label="Browse MCP templates"
            onClick={() => setView("browse")}
          >
            <ServerIcon />
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent
        className={`gap-4 ${view === "browse" ? "max-w-[90vw] sm:max-w-[80vw]" : "max-w-2xl"}`}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">
            {view === "browse" ? "Browse MCP Templates" : "Create MCP"}
          </DialogTitle>
        </DialogHeader>
        {view === "browse" ? (
          <MCPBrowseView
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            handleImport={handleImport}
          />
        ) : (
          <MCPFormView
            mcp={mcp}
            setMcp={setMcp}
            handleTypeChange={handleTypeChange}
          />
        )}
        <DialogFooter>
          {view === "browse" ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setMcp(initialMCPState);
                  setIsOpen(false);
                  setView("browse");
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                disabled={selectedTemplate === undefined}
                onClick={handleImport}
              >
                Import MCP
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setMcp(initialMCPState);
                  setView("browse");
                }}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                className="cursor-pointer"
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create MCP"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
