import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import type { NewMCPData } from "./types";
import { EnvVarInput } from "./env-var-input";
import { TypeSelector } from "./type-selector";
import { PlusIcon } from "lucide-react";

interface CreateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: NewMCPData) => Promise<void>;
}

export const CreateDialog = ({
  isOpen,
  onOpenChange,
  onCreate,
}: CreateDialogProps) => {
  const [newMCP, setNewMCP] = useState<NewMCPData>({
    name: "",
    type: "sse",
    command: "",
    url: "",
    envVars: [{ key: "", value: "" }],
  });

  const handleCreate = async () => {
    await onCreate(newMCP);
    setNewMCP({
      name: "",
      type: "sse",
      command: "",
      url: "",
      envVars: [{ key: "", value: "" }],
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="size-4" />
          Create MCP
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create an MCP</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="Enter MCP name"
              value={newMCP.name}
              onChange={(e) =>
                setNewMCP((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <TypeSelector
              type={newMCP.type}
              onTypeChange={(type) => setNewMCP((prev) => ({ ...prev, type }))}
            />
          </div>

          <div className="space-y-2">
            <Label>
              {newMCP.type === "stdio" ? "Command For Stdio" : "Url for SSE"}
            </Label>
            <Input
              placeholder={
                newMCP.type === "stdio" ? "Enter command" : "Enter URL"
              }
              value={newMCP.type === "stdio" ? newMCP.command : newMCP.url}
              onChange={(e) =>
                setNewMCP((prev) => ({
                  ...prev,
                  [newMCP.type === "stdio" ? "command" : "url"]: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>
              {newMCP.type === "stdio" ? "Environment Variables" : "Headers"}
            </Label>
            <EnvVarInput
              envVars={newMCP.envVars}
              onUpdate={(envVars) =>
                setNewMCP((prev) => ({ ...prev, envVars }))
              }
            />
          </div>

          <Button className="w-full" onClick={handleCreate}>
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
