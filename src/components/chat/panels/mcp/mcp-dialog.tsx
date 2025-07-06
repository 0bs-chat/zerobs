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
import { useMCPs } from "@/hooks/use-mcp";
import { PlusIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import type { Doc } from "../../../../../convex/_generated/dataModel";

interface CreateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MCPDialog = ({ isOpen, onOpenChange }: CreateDialogProps) => {
  const [mcp, setMcp] = useState<
    Omit<
      Doc<"mcps">,
      "_id" | "_creationTime" | "userId" | "updatedAt" | "enabled"
    >
  >({
    name: "",
    type: "sse",
    command: "",
    url: "",
    dockerImage: "",
    dockerPort: 0,
    restartOnNewChat: false,
    env: {},
    status: "creating",
  });
  const { handleCreate } = useMCPs();
  const [isLoading, setIsLoading] = useState(false);

  const validateMCP = () => {
    if (!mcp.name.trim()) {
      toast.error("MCP name is required");
      return false;
    }

    if (mcp.type === "stdio" && !mcp.command?.trim()) {
      toast.error("Command is required for STDIO type");
      return false;
    }

    if (mcp.type === "sse" && !mcp.url?.trim()) {
      toast.error("URL is required for SSE type");
      return false;
    }

    if (mcp.type === "docker") {
      if (!mcp.dockerImage?.trim()) {
        toast.error("Docker image is required for Docker type");
        return false;
      }
      if (!mcp.dockerPort || mcp.dockerPort <= 0) {
        toast.error("Valid Docker port is required for Docker type");
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateMCP()) return;

    setIsLoading(true);
    try {
      await handleCreate(mcp, onOpenChange);
    } catch (error) {
      console.error("Failed to create MCP:", error);
      toast.error("Failed to create MCP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal>
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
            <TypeSelector
              type={mcp.type}
              onTypeChange={(type) => setMcp((prev) => ({ ...prev, type }))}
            />
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

          {mcp.type === "sse" && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="mcp-url">URL *</Label>
              <Input
                id="mcp-url"
                placeholder="SSE URL (e.g., http://localhost:3000/sse)"
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
            </>
          )}

          <div className="flex flex-col gap-2">
            <Label>
              {mcp.type === "sse" ? "Headers" : "Environment Variables"}
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
            onClick={() => onOpenChange(false)}
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
