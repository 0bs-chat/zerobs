import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ServerIcon } from "lucide-react";
import { BadgeCheck, Globe, Activity } from "lucide-react";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { useMCPs } from "@/hooks/use-mcp";

// Example MCP templates (static for now)
type McpTemplate = Omit<
  Doc<"mcps">,
  "_id" | "_creationTime" | "userId" | "updatedAt" | "enabled"
> & {
  description: string;
  image: string;
  official: boolean;
};

const MCP_TEMPLATES: McpTemplate[] = [
  {
    name: "Github Repo",
    type: "stdio",
    status: "created",
    restartOnNewChat: false,
    command: "bunx github-repo-mcp",
    description:
      "Integrates with GitHub APIs to enable AI assistants to access up-to-date documentation, code, and repository data directly from any public GitHub project. This helps in automating workflows, analyzing data, and building AI tools with reduced hallucinations.",
    image:
      "https://github.githubassets.com/assets/GitHub-Mark-ea2971cee799.png",
    official: false,
  },
  {
    name: "Python Exec",
    type: "docker",
    dockerImage: "mantrakp04/py_exec:latest",
    dockerPort: 8000,
    status: "created",
    restartOnNewChat: false,
    description:
      "Executes Python code in a sandboxed Docker environment, providing a secure and isolated space for running Python scripts and applications.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg",
    official: false,
  },
  {
    name: "Memory",
    type: "stdio",
    command: "bunx @modelcontextprotocol/server-memory",
    status: "created",
    restartOnNewChat: false,
    description:
      "Manages a knowledge graph to provide persistent memory for AI models. It allows for the creation, modification, and retrieval of entities, their relationships, and observations, enabling AI to retain and recall information across conversations.",
    image:
      "https://res.cloudinary.com/teepublic/image/private/s--3_l7DcWs--/c_crop,x_10,y_10/c_fit,w_1109/c_crop,g_north_west,h_1260,w_1260,x_-76,y_-151/co_rgb:000000,e_colorize,u_Misc:One%20Pixel%20Gray/c_scale,g_north_west,h_1260,w_1260/fl_layer_apply,g_north_west,x_-76,y_-151/bo_0px_solid_white/e_overlay,fl_layer_apply,h_1260,l_Misc:Poster%20Bumpmap,w_1260/e_shadow,x_6,y_6/c_limit,h_1254,w_1254/c_lpad,g_center,h_1260,w_1260/b_rgb:eeeeee/c_limit,f_auto,h_630,q_auto:good:420,w_630/v1566300068/production/designs/5669783_0.jpg",
    official: true,
  },
  {
    name: "Context7 Docs",
    type: "http",
    url: "https://mcp.context7.com/mcp",
    status: "created",
    restartOnNewChat: false,
    description:
      "Provides up-to-date, version-specific documentation and code examples for various libraries and frameworks. It helps AI models avoid hallucinations and generate accurate code by supplying relevant, real-time context directly from official sources.",
    image:
      "https://context7.com/favicon.ico",
    official: true,
  },
];

export const BrowseMCPDialog = () => {
  const [selected, setSelected] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { handleCreate } = useMCPs();

  // Helper to transform template to MCPFormState
  function templateToMCPFormState(tpl: McpTemplate) {
    // Remove description, image, official
    const { description, image, official, ...rest } = tpl;
    return rest;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="icon" className="size-8">
          <ServerIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] sm:max-w-[80vw]">
        {/* Added max-w classes to the DialogContent for better responsiveness */}
        <DialogHeader>
          <DialogTitle>Browse MCP Templates</DialogTitle>
        </DialogHeader>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 overflow-auto w-full"
        >
          {MCP_TEMPLATES.map((tpl, idx) => (
            <div
              key={idx}
              role="listitem"
              className={`group bg-card rounded-lg border border-border p-4 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 h-full flex flex-col relative z-10 overflow-hidden cursor-pointer ${
                selected === idx
                  ? "border-primary/50 shadow-md shadow-primary/5"
                  : ""
              }`}
              onClick={() => setSelected(idx)}
            >
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    alt={tpl.name}
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
                        <BadgeCheck className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="-mt-0.5">
                      <div className="text-muted-foreground text-sm flex items-center max-w-[80%] sm:max-w-xs">
                        <button
                          className="hover:text-foreground transition-colors cursor-pointer flex items-center gap-1 max-w-full"
                          type="button"
                        >
                          <span className="truncate">
                            {tpl.command || tpl.dockerImage || tpl.url}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                  {tpl.description}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                {/* Type indicator */}
                {tpl.type === "http" && (
                  <Badge
                    variant="outline"
                    className="bg-blue-500/10 text-blue-500/80"
                  >
                    <Globe />
                    HTTP
                  </Badge>
                )}
                {tpl.type === "stdio" && (
                  <Badge
                    variant="outline"
                    className="bg-green-500/10 text-green-500/80"
                  >
                    <Activity />
                    STDIO
                  </Badge>
                )}
                {tpl.type === "docker" && (
                  <Badge
                    variant="outline"
                    className="bg-orange-500/10 text-orange-500/80"
                  >
                    <ServerIcon />
                    Docker
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={selected === null || loading}
            onClick={async () => {
              if (selected !== null) {
                setLoading(true);
                try {
                  await handleCreate(
                    templateToMCPFormState(MCP_TEMPLATES[selected]),
                    setIsOpen
                  );
                } finally {
                  setLoading(false);
                }
              }
            }}
          >
            {loading ? "Importing..." : "Import MCP"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};