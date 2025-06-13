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
import { mcpAtom } from "@/store/chatStore";
import { useAtomValue, useSetAtom } from "jotai";
import { useMCPs } from "@/hooks/use-mcp";
import { PlusIcon } from "lucide-react";

interface CreateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MCPDialog = ({ isOpen, onOpenChange }: CreateDialogProps) => {
  const mcp = useAtomValue(mcpAtom);
  const setMcp = useSetAtom(mcpAtom);
  const { handleCreate } = useMCPs();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" className="cursor-pointer">
          <PlusIcon className="size-4" />
          <span>Create MCP</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-4">
        <DialogHeader>
          <DialogTitle className=" text-lg ">Create MCP</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Input
              placeholder="MCP name here (eg. my-mcp)"
              value={mcp.name}
              onChange={(e) =>
                setMcp((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Type</Label>
            <TypeSelector
              type={mcp.type}
              onTypeChange={(type) => setMcp((prev) => ({ ...prev, type }))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Input
              placeholder={
                mcp.type === "stdio" ? "STDIO command here" : "SSE URL here"
              }
              value={mcp.type === "stdio" ? mcp.command : mcp.url}
              onChange={(e) =>
                setMcp((prev) => ({
                  ...prev,
                  [mcp.type === "stdio" ? "command" : "url"]: e.target.value,
                }))
              }
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{mcp.type === "stdio" ? "Env Vars" : "Headers"}</Label>
            <EnvVarInput
              envVars={mcp.envVars}
              onUpdate={(envVars) => setMcp((prev) => ({ ...prev, envVars }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            className="w-full cursor-pointer px-4 py-2"
            onClick={() => {
              handleCreate(mcp, onOpenChange);
            }}
          >
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
