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
import { PlusIcon, ServerIcon, Globe, Activity, BadgeCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { toast } from "sonner";
import {
  initialMCPState,
  type McpType,
} from "@/store/chatStore";
import { MCP_TEMPLATES } from "@/constants/mcp-templates";
import type { McpTemplate } from "@/constants/mcp-templates";
import { Badge } from "@/components/ui/badge";

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
    }));
  };

  const handleTemplateSelect = (template: McpTemplate) => {
    const { description, image, official, status, ...rest } = template;
    setMcp({ ...initialMCPState, ...rest });
    setView("form");
  };

  const handleImport = () => {
    if (selectedTemplate !== undefined) {
      handleTemplateSelect(MCP_TEMPLATES[selectedTemplate]);
    }
  };

  const MCPTypeBadge = ({ type }: { type: McpTemplate["type"] }) => {
    const badgeConfig = {
      http: {
        icon: Globe,
        className: "bg-blue-500/10 text-blue-500/80",
        label: "HTTP",
      },
      stdio: {
        icon: Activity,
        className: "bg-green-500/10 text-green-500/80",
        label: "STDIO",
      },
      docker: {
        icon: ServerIcon,
        className: "bg-orange-500/10 text-orange-500/80",
        label: "Docker",
      },
    } as const;

    const config = badgeConfig[type];
    const Icon = config.icon;

    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) {
          setMcp(initialMCPState);
		  setView("browse");
        }
        setIsOpen(open);
      }}
      modal
    >
      <DialogTrigger asChild>
	    <div className="flex items-center gap-2">
		  <Button variant="default" size="sm" className="cursor-pointer" onClick={() => setView("form")}>
			<PlusIcon className="size-4" />
			<span>Create MCP</span>
		  </Button>
		  <Button size="icon" className="size-8" aria-label="Browse MCP templates" onClick={() => setView("browse")}>
		    <ServerIcon />
		  </Button>
		</div>
      </DialogTrigger>
      <DialogContent className="gap-4 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">
		    {view === "browse" ? "Browse MCP Templates" : "Create MCP"}
		  </DialogTitle>
        </DialogHeader>
		{view === "browse" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 overflow-auto w-full">
            {MCP_TEMPLATES.map((tpl, idx) => (
              <div
                key={idx}
                role="listitem"
                className={`group bg-card rounded-lg border-transparent p-4 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 h-full flex flex-col relative z-10 overflow-hidden cursor-pointer border-2 ${
                  selectedTemplate === idx
                    ? "border-primary dark:border-primary/50 shadow-md shadow-primary/5"
                    : ""
                }`}
                onClick={() => setSelectedTemplate(idx)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedTemplate(idx);
                  }
                }}
              >
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      alt={`${tpl.name} icon`}
                      loading="lazy"
                      width={28}
                      height={28}
                      decoding="async"
                      className="w-7 h-7 flex-shrink-0 rounded-lg shadow-sm ring-1 ring-black/5 bg-background/50 backdrop-blur-sm p-[1px]"
                      src={tpl.image}
                      style={{
                        color: "transparent",
                        filter: "contrast(1.1) brightness(1.1)",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {tpl.name}
                        </h3>
                        {tpl.official && (
                          <BadgeCheck
                            className="w-4 h-4 text-primary"
                            aria-label="Official MCP"
                          />
                        )}
                      </div>
                      <div className="-mt-0.5">
                        <div className="text-muted-foreground text-sm flex items-center max-w-[80%] sm:max-w-xs">
                          <span className="truncate">
                            {tpl.command || tpl.dockerImage || tpl.url}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                    {tpl.description}
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                  <MCPTypeBadge type={tpl.type} />
                </div>
              </div>
            ))}
          </div>
		) : (
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