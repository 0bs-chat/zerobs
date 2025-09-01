import { MCP_TEMPLATES } from "@/components/chat/panels/mcp/templates";
import type { McpTemplate } from "@/components/chat/panels/mcp/templates";

export function findMcpTemplate(templateKey: string): McpTemplate | undefined {
  return MCP_TEMPLATES.find((t) => t.template === templateKey);
}

export function findMcpTemplateByName(name: string): McpTemplate | undefined {
  const lowerName = name.toLowerCase();
  const normalizedName = lowerName.replace(/_/g, "-");

  return MCP_TEMPLATES.find(
    (t) =>
      t.template?.toLowerCase() === lowerName ||
      t.template?.toLowerCase() === normalizedName ||
      t.name.toLowerCase() === lowerName ||
      t.name.toLowerCase() === normalizedName,
  );
}

export function getMcpLogoUrl(templateKey?: string): string {
  if (!templateKey) {
    return "https://avatars.githubusercontent.com/u/182288589?s=200&v=4";
  }

  const template = findMcpTemplate(templateKey);
  return (
    template?.image ??
    "https://avatars.githubusercontent.com/u/182288589?s=200&v=4"
  );
}

export interface ParsedMcpTool {
  displayName: string;
  toolName: string;
  icon?: string;
}

export function parseMcpToolName(messageName: string): ParsedMcpTool | null {
  if (!messageName.startsWith("mcp__")) {
    return null;
  }

  const parts = messageName.split("__");
  if (parts.length < 3) {
    return null;
  }

  const mcpName = parts[1].toLowerCase();
  const toolName = parts.slice(2).join("__");

  const template = findMcpTemplateByName(mcpName);

  return {
    displayName: template?.name || mcpName,
    toolName,
    icon: template?.image,
  };
}

export interface McpDisplayInfo {
  name: string;
  icon: string;
  description?: string;
}

export function getMcpDisplayInfo(templateKey: string): McpDisplayInfo {
  const template = findMcpTemplate(templateKey);

  return {
    name: template?.name || templateKey,
    icon:
      template?.image ||
      "https://avatars.githubusercontent.com/u/182288589?s=200&v=4",
    description: template?.description,
  };
}
