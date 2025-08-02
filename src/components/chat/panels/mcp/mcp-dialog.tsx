import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnvVarInput } from "./env-var-input";
import { TypeSelector } from "./type-selector";
import { useMCPs } from "@/hooks/chats/use-mcp";
import { PlusIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import {
  initialMCPState,
  selectedMCPTemplateAtom,
  mcpDialogOpenAtom,
  type McpType,
} from "@/store/chatStore";
import { useAtom } from "jotai";

export const MCPDialog = () => {
  const [mcp, setMcp] = useAtom(selectedMCPTemplateAtom);
  const [isOpen, setIsOpen] = useAtom(mcpDialogOpenAtom);
  const { handleCreate, validateMCP } = useMCPs();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!validateMCP(mcp)) return;

    setIsLoading(true);
    try {
      await handleCreate(mcp, (open) => {
        if (!open) {
          // Reset form state when dialog closes after successful creation
          setMcp(initialMCPState);
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
    setMcp((prev) => {
      // Create a new object with proper type handling
      const updated = {
        ...prev,
        type,
        // Clear type-specific fields when switching types
        command: type === "stdio" ? prev.command || "" : "",
        url: type === "http" ? prev.url || "" : "",
        dockerImage: type === "docker" ? prev.dockerImage || "" : "",
        dockerPort: type === "docker" ? prev.dockerPort || 0 : 0,
        dockerCommand: type === "docker" ? prev.dockerCommand || "" : "",
      };

      // Preserve template-specific fields if they exist
      if ("description" in prev) {
        return {
          ...updated,
          description: prev.description,
          image: prev.image,
          official: prev.official,
        };
      }

      return updated;
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) {
          // Reset form state when dialog closes
          setMcp(initialMCPState);
        }
        setIsOpen(open);
      }}
      modal
    >
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="cursor-pointer">
          <PlusIcon className="size-4" />
          <span>Create MCP</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-4 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Create MCP</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="mcp-name">Name *</Label>
            <Input
              id="mcp-name"
              placeholder="MCP name (e.g., my-mcp)"
              value={mcp.name}
              onChange={(e) =>
                setMcp((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Type *</Label>
            <TypeSelector type={mcp.type} onTypeChange={handleTypeChange} />
          </div>

          {mcp.type === "stdio" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="mcp-command">Command *</Label>
              <Input
                id="mcp-command"
                placeholder="STDIO command (e.g., python -m my_mcp)"
                value={mcp.command}
                onChange={(e) =>
                  setMcp((prev) => ({ ...prev, command: e.target.value }))
                }
              />
            </div>
          )}

          {mcp.type === "http" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="mcp-url">URL *</Label>
              <Input
                id="mcp-url"
                placeholder="HTTP URL (e.g., http://localhost:3000/sse)"
                value={mcp.url}
                onChange={(e) =>
                  setMcp((prev) => ({ ...prev, url: e.target.value }))
                }
              />
            </div>
          )}

          {mcp.type === "docker" && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mcp-docker-image">Docker Image *</Label>
                <Input
                  id="mcp-docker-image"
                  placeholder="Docker image (e.g., my-mcp:latest)"
                  value={mcp.dockerImage}
                  onChange={(e) =>
                    setMcp((prev) => ({ ...prev, dockerImage: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mcp-docker-port">Docker Port *</Label>
                <Input
                  id="mcp-docker-port"
                  type="number"
                  placeholder="Port (e.g., 8000)"
                  value={mcp.dockerPort}
                  onChange={(e) =>
                    setMcp((prev) => ({
                      ...prev,
                      dockerPort: parseInt(e.target.value) || 8000,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mcp-docker-command">Docker Command</Label>
                <Input
                  id="mcp-docker-command"
                  placeholder="Command to run in container (optional)"
                  value={mcp.dockerCommand}
                  onChange={(e) =>
                    setMcp((prev) => ({
                      ...prev,
                      dockerCommand: e.target.value,
                    }))
                  }
                />
              </div>
            </>
          )}

          <div className="flex flex-col gap-2">
            <Label>
              {mcp.type === "http" ? "Headers" : "Environment Variables"}
            </Label>
            <EnvVarInput
              envVars={mcp.env || {}}
              onUpdate={(env) => setMcp((prev) => ({ ...prev, env }))}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="restart-on-new-chat"
              checked={mcp.restartOnNewChat}
              onCheckedChange={(checked) =>
                setMcp((prev) => ({ ...prev, restartOnNewChat: checked }))
              }
            />
            <Label htmlFor="restart-on-new-chat">Restart on new chat</Label>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setMcp(initialMCPState);
              setIsOpen(false);
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            className="cursor-pointer"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create MCP"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
