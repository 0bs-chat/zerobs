"use node";

import { v } from "convex/values";
import { action, type ActionCtx } from "../_generated/server";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { api } from "../_generated/api";
import { createMcpAuthToken, resolveConfigurableEnvs } from "./utils";
import type { Id } from "../_generated/dataModel";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { fly } from "../utils/flyio";

export const getMCPToolsPreview = action({
  args: {
    mcpIds: v.array(v.id("mcps")),
  },
  handler: async (ctx: ActionCtx, { mcpIds }: { mcpIds: Id<"mcps">[] }) => {
    if (mcpIds.length === 0) {
      return {};
    }

    // Process all MCPs in parallel
    const mcpResults = await Promise.all(
      mcpIds.map(async (mcpId) => {
        try {
          // Get the MCP document
          const mcp = await ctx.runQuery(api.mcps.queries.get, { mcpId });
          if (!mcp || !mcp.url) {
            return { mcpId, error: "MCP not found or has no URL", tools: [] };
          }

          // Get configurable envs (important for per-chat and other MCPs)
          const mcpConfigurableEnvs = await resolveConfigurableEnvs(ctx, mcp);

          // Create auth token
          const authToken = await createMcpAuthToken(mcp);
          
          // Build connection object - Fly.io will auto-select available instance
          const headers: Record<string, string> = {
            ...mcp.env,
            ...mcpConfigurableEnvs,
            Authorization: `Bearer ${authToken}`,
          };

          const connection = {
            transport: "http" as const,
            url: mcp.url,
            headers,
            useNodeEventSource: true,
            reconnect: {
              enabled: true,
              maxAttempts: 10,
              delayMs: 1000,
            },
          };

          // Create client for this MCP server
          const client: MultiServerMCPClient = new MultiServerMCPClient({
            prefixToolNameWithServerName: false,
            additionalToolNamePrefix: "",
            throwOnLoadError: true,
            mcpServers: {
              [mcp.name]: connection,
            },
          });

          // Fetch tools with retry logic
          let tools: DynamicStructuredTool[] = [];
          for (let attempt = 0; attempt <= 10 && tools.length === 0; attempt++) {
            try {
              if (attempt >= 5) {
                const machines = await fly.listMachines(mcp._id);
                try {
                  await fly.startMachine(mcp._id, machines![0].id!);
                } catch (error) {}
                await fly.waitTillHealthy(mcp._id, machines![0].id!, {
                  timeout: 120000,
                  interval: 1000,
                });
              }
              tools = await client.getTools();
              if (tools.length === 0) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
            } catch (error) {
              if (attempt === 10) {
                throw new Error(`Failed to fetch tools after 10 attempts: ${error}`);
              }
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          }

          await client.close();

          // Convert tools to serializable format
          const serializedTools = tools.map((tool) => ({
            name: tool.name,
            description: tool.description || "No description available",
            inputSchema: tool.schema ? JSON.parse(JSON.stringify(tool.schema)) : null,
          }));

          return { mcpId, tools: serializedTools };
        } catch (error) {
          console.error(`Error fetching MCP tools for ${mcpId}:`, error);
          return { 
            mcpId, 
            error: error instanceof Error ? error.message : "Unknown error",
            tools: [] 
          };
        }
      })
    );

    // Convert to object keyed by mcpId
    return mcpResults.reduce((acc, result) => {
      acc[result.mcpId] = {
        tools: result.tools,
        error: result.error || null,
      };
      return acc;
    }, {} as Record<string, { tools: any[]; error: string | null }>);
  },
});
