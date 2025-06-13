import { Globe, Terminal } from "lucide-react";
import type { MCPType } from "./types";

interface TypeSelectorProps {
  type: MCPType;
  onTypeChange: (type: MCPType) => void;
}

export const TypeSelector = ({ type, onTypeChange }: TypeSelectorProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        type="button"
        className={`flex items-center justify-center space-x-2 rounded-lg border p-4 ${type === "sse" ? "border-primary bg-primary/10" : "border-input"}`}
        onClick={() => onTypeChange("sse")}
      >
        <Globe className="h-5 w-5" />
        <span>SSE</span>
      </button>
      <button
        type="button"
        className={`flex items-center justify-center space-x-2 rounded-lg border p-4 ${type === "stdio" ? "border-primary bg-primary/10" : "border-input"}`}
        onClick={() => onTypeChange("stdio")}
      >
        <Terminal className="h-5 w-5" />
        <span>STD I/O</span>
      </button>
    </div>
  );
};
