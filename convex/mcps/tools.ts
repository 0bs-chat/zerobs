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
    mcpId: v.id("mcps"),
  },
  handler: async (ctx: ActionCtx, { mcpId }: { mcpId: Id<"mcps"> }) => {
    try {
      // Get the MCP document
      const mcp = await ctx.runQuery(api.mcps.queries.get, { mcpId });
      if (!mcp || !mcp.url) {
        throw new Error("MCP not found or has no URL");
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
        useNodeEventSource: false, // Don't use Node EventSource
        reconnect: {
          enabled: false, // Disable reconnect for preview
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
      for (let attempt = 0; attempt <= 10; attempt++) {
        try {
          if (attempt === 5) {
            const machines = await fly.listMachines(mcp._id);
            try {
              await fly.startMachine(mcp._id, machines![0].id!);
            } catch (error) {}
            await fly.waitTillHealthy(mcp._id, {
              timeout: 120000,
              interval: 1000,
            });
            try {
              await fetch(mcp.url!, {
                headers,
              });
            } catch (error) {}
          }
          tools = await client.getTools();
          break;
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

      return serializedTools;
    } catch (error) {
      console.error("Error fetching MCP tools:", error);
      throw new Error(`Failed to fetch MCP tools: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});
