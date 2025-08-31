import { MCP_TEMPLATES } from "../../src/components/chat/panels/mcp/templates";
import type { McpTemplate } from "../../src/components/chat/panels/mcp/templates";

export function findMcpTemplate(templateKey: string): McpTemplate | undefined {
  return MCP_TEMPLATES.find(t => t.template === templateKey);
}

export function getTemplateConfigurableEnvs(templateKey: string): McpTemplate['configurableEnvs'] {
  const template = findMcpTemplate(templateKey);
  return template?.configurableEnvs;
}

export function getTemplateAuthTokenKey(templateKey: string): string | undefined {
  const template = findMcpTemplate(templateKey);
  return template?.customAuthTokenFromEnv;
}

export function getTemplatePromptTool(templateKey: string): string | undefined {
  const template = findMcpTemplate(templateKey);
  return template?.promptTool;
}

export function hasConfigurableEnvs(templateKey: string): boolean {
  const template = findMcpTemplate(templateKey);
  return !!(template?.configurableEnvs && template.configurableEnvs.length > 0);
}

export function hasCustomAuthToken(templateKey: string): boolean {
  const template = findMcpTemplate(templateKey);
  return !!template?.customAuthTokenFromEnv;
}

export function hasPromptTool(templateKey: string): boolean {
  const template = findMcpTemplate(templateKey);
  return !!template?.promptTool;
}

export function getTemplateDisplayInfo(templateKey: string): { name: string; image?: string } {
  const template = findMcpTemplate(templateKey);
  return {
    name: template?.name || templateKey,
    image: template?.image,
  };
}