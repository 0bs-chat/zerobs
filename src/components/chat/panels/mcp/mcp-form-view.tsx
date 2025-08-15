import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnvVarInput } from "./env-var-input";
import { TypeSelector } from "./type-selector";
import type { McpType, initialMCPState } from "@/store/chatStore";

interface MCPFormViewProps {
  mcp: typeof initialMCPState;
  setMcp: (mcp: typeof initialMCPState) => void;
  handleTypeChange: (type: McpType) => void;
}

export const MCPFormView = ({ mcp, setMcp, handleTypeChange }: MCPFormViewProps) => {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="mcp-name">Name *</Label>
        <Input
          id="mcp-name"
          placeholder="MCP name (e.g., my-mcp)"
          value={mcp.name}
          onChange={(e) =>
            setMcp({ ...mcp, name: e.target.value })
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
              setMcp({ ...mcp, command: e.target.value })
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
              setMcp({ ...mcp, url: e.target.value })
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
                setMcp({ ...mcp, dockerImage: e.target.value })
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
                setMcp({ ...mcp, dockerPort: parseInt(e.target.value) || 8000 })
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
                setMcp({ ...mcp, dockerCommand: e.target.value })
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
          onUpdate={(env) => setMcp({ ...mcp, env })}
        />
      </div>


    </div>
  );
};