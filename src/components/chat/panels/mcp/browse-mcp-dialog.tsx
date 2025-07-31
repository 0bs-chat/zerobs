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
import { Badge } from "@/components/ui/badge";
import { selectedMCPTemplateAtom, mcpDialogOpenAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { MCP_TEMPLATES } from "@/constants/mcp-templates";

export const BrowseMCPDialog = () => {
  const [selected, setSelected] = useState<number | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const setMcp = useSetAtom(selectedMCPTemplateAtom);
  const setMcpDialogOpen = useSetAtom(mcpDialogOpenAtom);

  const handleImport = () => {
    if (selected !== undefined) {
      const selectedTemplate = MCP_TEMPLATES[selected];
      // Set the selected template data in the atom
      setMcp(selectedTemplate);
      // Close browse dialog
      setIsOpen(false);
      // Open MCP creation dialog
      setMcpDialogOpen(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="icon" className="size-8">
          <ServerIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] sm:max-w-[80vw]">
        <DialogHeader>
          <DialogTitle>Browse MCP Templates</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 overflow-auto w-full">
          {MCP_TEMPLATES.map((tpl, idx) => (
            <div
              key={idx}
              role="listitem"
              className={`group bg-card rounded-lg  border-transparent p-4 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 h-full flex flex-col relative z-10 overflow-hidden cursor-pointer border-2 ${
                selected === idx
                  ? "border-primary dark:border-primary/50 shadow-md shadow-primary/5"
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
            disabled={selected === undefined}
            onClick={() => {
              setSelected(undefined);
              handleImport();
            }}
          >
            Import MCP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
