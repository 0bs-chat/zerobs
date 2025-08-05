/**
 * Utility functions for tool display and formatting
 */
const TOOL_NAME_MAPPINGS = {
  searchWeb: "Web Search",
  searchProjectDocuments: "Project Search",
  vectorSearch: "Document Search",
} as const;

export function cleanToolName(
  rawName: string | null | undefined,
  isComplete?: boolean
): string {
  if (!rawName) {
    if (isComplete === false) return "Tool Executing...";
    return "Unknown Tool";
  }

  // Handle MCP tool names like "mcp__browser__read_file"
  if (rawName.startsWith("mcp__")) {
    const parts = rawName.split("__");
    if (parts.length >= 3) {
      const serverName = parts[1];
      const toolName = parts.slice(2).join("_");
      // Capitalize server name and format tool name
      const formattedServerName =
        serverName.charAt(0).toUpperCase() + serverName.slice(1);
      const formattedToolName = toolName
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      return `${formattedServerName}: ${formattedToolName}`;
    }
  }

  if (rawName in TOOL_NAME_MAPPINGS) {
    return TOOL_NAME_MAPPINGS[rawName as keyof typeof TOOL_NAME_MAPPINGS];
  }

  return rawName
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/\b\w/g, (l) => l.toUpperCase())
    .trim();
}

export function formatToolInput(input: any): string {
  if (!input) return "No input provided";

  try {
    if (typeof input === "string") {
      try {
        const parsed = JSON.parse(input);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return input.length > 1 ? input : "No input provided";
      }
    }

    return JSON.stringify(input, null, 2);
  } catch {
    return "Invalid input format";
  }
}

export function formatToolOutput(output: any, isStreaming?: boolean): string {
  if (!output) {
    if (isStreaming) return "Waiting for output...";
    return "";
  }

  try {
    if (typeof output === "string") {
      // Handle malformed JSON inputs like '{"'
      if (
        output.length <= 3 &&
        (output === '{"' || output === "{" || output === '"')
      ) {
        return isStreaming ? "Receiving data..." : "Invalid output";
      }

      // Try to parse as JSON first
      try {
        const parsed = JSON.parse(output);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // If not JSON, return as plain text
        return output;
      }
    }

    return JSON.stringify(output, null, 2);
  } catch {
    return String(output);
  }
}

export function getToolStatusText(isComplete?: boolean): string {
  if (isComplete === true) return "Completed";
  if (isComplete === false) return "Running";
  return "";
}

export function getToolStatusColor(isComplete?: boolean): string {
  if (isComplete === true) return "text-green";
  if (isComplete === false) return "text-yellow-500";
  return "text-muted-foreground";
}
