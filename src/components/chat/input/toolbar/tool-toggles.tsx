import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  WrenchIcon,
} from "lucide-react";
import { useMCPsData, useMCPMutations } from "@/hooks/chats/use-mcp";
import { MCP_TEMPLATES } from "@/components/chat/panels/mcp/templates";
import { motion } from "motion/react";
import { smoothTransition, scaleIn } from "@/lib/motion";

export function ToolToggles() {
  const { mcps } = useMCPsData();
  const { handleToggleMCP, handleBatchToggleMCP } = useMCPMutations();

  const handleToggle = (mcpId: string, enabled: boolean, ctrlKey: boolean = false) => {
    if (ctrlKey) {
      const shouldEnableAll = mcps?.some(mcp => !mcp.enabled) ?? false;
      handleBatchToggleMCP(shouldEnableAll);
    } else {
      handleToggleMCP(mcpId as any, enabled);
    }
  };

  const getIconUrl = (mcp: any) => {
    if (mcp.template) {
      const template = MCP_TEMPLATES.find(t => t.template === mcp.template);
      if (template?.image) {
        return template.image;
      }
    }
    // Fallback to default GitHub avatar
    return "https://avatars.githubusercontent.com/u/182288589?s=200&v=4";
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          title="Tool Toggles"
          className="cursor-pointer shadow-none border-none text-foreground/80 hover:text-foreground"
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              e.stopPropagation();
              const shouldEnableAll = mcps?.some(mcp => !mcp.enabled) ?? false;
              handleBatchToggleMCP(shouldEnableAll);
            }
          }}
        >
          <WrenchIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="border-border/70 min-w-48">
        <div className="px-2 pt-2 pb-1 text-xs text-muted-foreground flex items-center justify-between">
          MCP Tools
          {mcps && mcps.length > 0 && (
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-muted/60 text-muted-foreground rounded border">
              {typeof navigator !== "undefined" && navigator.userAgent.toUpperCase().indexOf("MAC") >= 0 ? "⌘+Click" : "Ctrl+Click"}
            </kbd>
          )}
        </div>
        {mcps && mcps.length > 0 ? (
          mcps.map((mcp) => (
            <DropdownMenuItem
              key={mcp._id}
              onClick={(e) => {
                e.preventDefault();
                handleToggle(mcp._id, mcp.enabled, e.ctrlKey || e.metaKey);
              }}
              onSelect={(e) => e.preventDefault()}
              className="flex items-center justify-between pr-2 cursor-pointer border-none"
            >
              <span className="flex items-center gap-2">
                <motion.img
                  variants={scaleIn}
                  initial="initial"
                  animate="animate"
                  transition={smoothTransition}
                  src={getIconUrl(mcp)}
                  alt={`${mcp.name} icon`}
                  className="w-4 h-4 rounded-sm object-cover"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.src = "https://avatars.githubusercontent.com/u/182288589?s=200&v=4";
                  }}
                />
                {mcp.name}
              </span>
              <span className="ml-auto flex items-center">
                {mcp.enabled && (
                  <svg
                    className="size-4 text-primary"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-label="Checkmark"
                    role="img"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled className="text-muted-foreground">
            No MCP tools available
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}