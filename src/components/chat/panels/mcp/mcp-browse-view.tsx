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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 overflow-auto w-full">
      {MCP_TEMPLATES.map((tpl, idx) => (
        <div
          key={idx}
          role="listitem"
          className={`group bg-card rounded-lg border-transparent p-4 hover:border-primary/50 hover:shadow-md hover:shadow-primary/1 transition-all duration-200 h-full flex flex-col relative z-10 overflow-hidden cursor-pointer border-2 ${
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
  );
};
