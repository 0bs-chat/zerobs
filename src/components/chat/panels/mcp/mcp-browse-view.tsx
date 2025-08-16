import { MCP_TEMPLATES, type McpTemplate } from "./templates";
import { Badge } from "@/components/ui/badge";
import { ServerIcon, Globe, Activity, BadgeCheck } from "lucide-react";

interface MCPBrowseViewProps {
  selectedTemplate: number | undefined;
  setSelectedTemplate: (index: number) => void;
  handleImport: () => void;
}

export const MCPBrowseView = ({
  selectedTemplate,
  setSelectedTemplate,
  handleImport,
}: MCPBrowseViewProps) => {
  const MCPTypeBadge = ({ type }: { type: McpTemplate["type"] }) => {
    // Token-based, minimal styling using theme colors from styles.css
    const badgeConfig = {
      http: {
        icon: Globe,
        className: "bg-accent/40 text-accent-foreground/80 border-border",
        label: "HTTP",
      },
      stdio: {
        icon: Activity,
        className: "bg-secondary/40 text-secondary-foreground/80 border-border",
        label: "STDIO",
      },
      docker: {
        icon: ServerIcon,
        className: "bg-primary/10 text-foreground/80 border-primary/30",
        label: "Docker",
      },
    } as const;

    const config = badgeConfig[type];
    const Icon = config.icon;

    return (
      <Badge
        variant="outline"
        className={`${config.className} text-xs font-medium px-2 py-1`}
      >
        <Icon className="w-3 h-3 mr-1.5" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
        {MCP_TEMPLATES.map((tpl, idx) => {
          const isSelected = selectedTemplate === idx;
          return (
            <div
              key={idx}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              className={`group bg-card rounded-lg border p-4 transition-all duration-200 h-full flex flex-col cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                  ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                  : "border-border/60 hover:bg-accent/25 dark:hover:bg-accent/60 hover:border-primary/30"
              }`}
              onClick={() => setSelectedTemplate(idx)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedTemplate(idx);
                }
              }}
              onDoubleClick={() => {
                if (isSelected) handleImport();
              }}
            >
              <div className="flex-1 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 p-1.5 bg-background/80 rounded-md ring-1 ring-border/60">
                    <img
                      alt={`${tpl.name} icon`}
                      loading="lazy"
                      width={24}
                      height={24}
                      decoding="async"
                      className="w-6 h-6 rounded object-contain"
                      src={tpl.image}
                      style={{ color: "transparent" }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {tpl.name}
                      </h3>
                      {tpl.official && (
                        <BadgeCheck
                          className="w-3.5 h-3.5 text-primary flex-shrink-0"
                          aria-label="Official MCP"
                        />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground/70 font-mono">
                      <span className="truncate block">
                        {tpl.command || tpl.dockerImage || tpl.url}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">
                  {tpl.description}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
                <MCPTypeBadge type={tpl.type} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
