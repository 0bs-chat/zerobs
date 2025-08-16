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
}: MCPBrowseViewProps) => {
  const MCPTypeBadge = ({ type }: { type: McpTemplate["type"] }) => {
    const badgeConfig = {
      http: {
        icon: Globe,
        className:
          "bg-blue-500/10 text-blue-600 border-blue-200/50 dark:text-blue-400 dark:border-blue-500/30",
        label: "HTTP",
      },
      stdio: {
        icon: Activity,
        className:
          "bg-green-500/10 text-green-600 border-green-200/50 dark:text-green-400 dark:border-green-500/30",
        label: "STDIO",
      },
      docker: {
        icon: ServerIcon,
        className:
          "bg-orange-500/10 text-orange-600 border-orange-200/50 dark:text-orange-400 dark:border-orange-500/30",
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
      {MCP_TEMPLATES.map((tpl, idx) => (
        <div
          key={idx}
          role="button"
          tabIndex={0}
          className={`group bg-card rounded-xl border-2 p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 h-full flex flex-col cursor-pointer ${
            selectedTemplate === idx
              ? "border-primary shadow-lg shadow-primary/20 ring-1 ring-primary/20"
              : "border-border/50 hover:border-primary/30"
          }`}
          onClick={() => setSelectedTemplate(idx)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSelectedTemplate(idx);
            }
          }}
        >
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-1.5 bg-background/80 rounded-lg ring-1 ring-border/50">
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
            <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3 text-justify">
              {tpl.description}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
            <MCPTypeBadge type={tpl.type} />
          </div>
        </div>
      ))}
    </div>
  );
};
