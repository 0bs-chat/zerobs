import { Globe, Terminal, Container } from "lucide-react";

interface TypeSelectorProps {
  type: "http" | "stdio" | "docker";
  onTypeChange: (type: "http" | "stdio" | "docker") => void;
}

export const TypeSelector = ({ type, onTypeChange }: TypeSelectorProps) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      <button
        type="button"
        className={`flex flex-col items-center justify-center space-y-2 rounded-lg border p-4 transition-colors ${
          type === "http"
            ? "border-primary bg-primary/10 text-primary"
            : "border-input hover:bg-accent"
        }`}
        onClick={() => onTypeChange("http")}
      >
        <Globe className="h-5 w-5" />
        <span className="text-sm font-medium">HTTP</span>
        <span className="text-xs text-muted-foreground text-center">
          Server-Sent Events
        </span>
      </button>
      <button
        type="button"
        className={`flex flex-col items-center justify-center space-y-2 rounded-lg border p-4 transition-colors ${
          type === "stdio"
            ? "border-primary bg-primary/10 text-primary"
            : "border-input hover:bg-accent"
        }`}
        onClick={() => onTypeChange("stdio")}
      >
        <Terminal className="h-5 w-5" />
        <span className="text-sm font-medium">STDIO</span>
        <span className="text-xs text-muted-foreground text-center">
          Standard I/O
        </span>
      </button>
      <button
        type="button"
        className={`flex flex-col items-center justify-center space-y-2 rounded-lg border p-4 transition-colors ${
          type === "docker"
            ? "border-primary bg-primary/10 text-primary"
            : "border-input hover:bg-accent"
        }`}
        onClick={() => onTypeChange("docker")}
      >
        <Container className="h-5 w-5" />
        <span className="text-sm font-medium">Docker</span>
        <span className="text-xs text-muted-foreground text-center">
          Container
        </span>
      </button>
    </div>
  );
};
