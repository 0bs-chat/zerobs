"use node";

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { api, internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import type { Doc, Id } from "../../_generated/dataModel";
import { fly } from "../../utils/flyio";
import { getDocumentUrl } from "../../utils/helpers";
import {
  extractFileIdsFromMessage,
  type ExtendedRunnableConfig,
} from "../helpers";
import type { GraphState } from "../state";
import { getTemplatePromptTool } from "../../mcps/templateHelpers";
import {
  resolveConfigurableEnvs,
  buildMcpConnectionHeaders,
} from "../../mcps/utils";
import { DynamicStructuredTool } from "@langchain/core/tools";

export const getMCPTools = async (
  ctx: ActionCtx,
  state: typeof GraphState.State,
  config?: ExtendedRunnableConfig,
) => {
  const mcps = await ctx.runQuery(api.mcps.queries.getAll, {
    filters: {
      enabled: true,
    },
    includeApps: true,
  });

  if (mcps.length === 0) {
    return [];
  }

  // Process all MCPs in one comprehensive loop - setup, connection, client creation, and tool fetching
  const clientsAndTools = await Promise.all(
    mcps.map(async (mcp) => {
    try {
      const mcpConfigurableEnvs = await resolveConfigurableEnvs(ctx, mcp);

      let appDoc: Doc<"mcpApps"> | null;

      // Handle per-chat MCPs - assign from pool or create on demand
      if (mcp.perChat && ["stdio", "docker"].includes(mcp.type) && config) {
        try {
          appDoc = await ctx.runMutation(internal.mcps.mutations.assignAppToChat, {
            mcpId: mcp._id,
            chatId: config.chat._id,
          });
        } catch (error) {
          console.error(`Failed to assign per-chat MCP machine for ${mcp.name}:`, error);
          return null;
        }
      } else {
        appDoc = mcp.apps?.[0]!;
      }

      const machine = await fly.getMachineByName(appDoc?._id!, 'machine');

      try {
        await fly.startMachine(appDoc?._id!, machine?.id!);
      } catch (error) {}
      await fly.waitTillHealthy(appDoc?._id!, machine?.id!, {
        timeout: 120000,
        interval: 1000,
      });

      // Filter out MCPs that don't have a URL or aren't ready
      if (!appDoc?.url || appDoc.status === "creating") {
        console.error(`MCP ${mcp._id} is not ready`);
        return null;
      }

      // Build connection headers using shared utility
      const headers = await buildMcpConnectionHeaders(mcp, mcpConfigurableEnvs);

      const connection = {
        transport: "http" as const,
        url: appDoc.url,
        headers,
        useNodeEventSource: true,
        reconnect: {
          enabled: true,
          maxAttempts: 60,
          delayMs: 1000,
        },
      };

      // Create client for this MCP server
      const client = new MultiServerMCPClient({
        prefixToolNameWithServerName: true,
        additionalToolNamePrefix: "mcp",
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
            try {
              await fly.startMachine(appDoc._id, machine?.id!);
            } catch (error) {}
            await fly.waitTillHealthy(appDoc._id, machine?.id!, {
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

      // Handle prompt tool if template exists
      if (mcp.template) {
        const promptTool = getTemplatePromptTool(mcp.template);
        if (promptTool) {
          try {
            const mcpClient = await client.getClient(mcp.name);
            if (mcpClient) {
              const prompt = await mcpClient.getPrompt({
                name: promptTool,
              });
              if (prompt && prompt.messages && prompt.messages.length > 0) {
                const mcpTools = tools.filter((t) => t.name.includes(mcp.name));
                if (mcpTools.length > 0) {
                  mcpTools[0].description = `${prompt.messages[0].content.text}\n\n${mcpTools[0].description}`;
                }
              }

            }
          } catch (error) {}
        }
      }

      return { client, tools, mcp, appDoc, machine };
    } catch (error) {
      console.error(`Failed to process MCP ${mcp.name}:`, error);
      return null;
    }
  }));

  // Filter out failed MCPs and concatenate all tools
  const validClientsAndTools = clientsAndTools.filter((result): result is NonNullable<typeof result> => result !== null);
  if (validClientsAndTools.length === 0) {
    return [];
  }
  
  const tools = validClientsAndTools.flatMap(({ tools }) => tools);

  if (state) {
    if (state.messages && state.messages.length > 0) {
      const lastMessage = state.messages[state.messages.length - 1];
      const messageContent = lastMessage.content;

      // Extract file IDs from the message content using helper function
      const fileIds = extractFileIdsFromMessage(messageContent);

      const files: { name: string; url: string }[] = (
        await Promise.all(
          fileIds.map(async (documentId, index) => {
            try {
              const documentDoc = await ctx.runQuery(
                internal.documents.crud.read,
                {
                  id: documentId as Id<"documents">,
                },
              );
              if (!documentDoc) {
                return null;
              }
              // Include various document types for upload (file, image, github, text)
              const url = await getDocumentUrl(ctx, documentDoc.key);
              return {
                name: `${index}_${documentDoc.name}`,
                url,
              };
            } catch (error) {
              return null;
            }
          }),
        )
      )
        .filter((file): file is { name: string; url: string } => file !== null);

      // Upload files to each MCP's specific machine
      await Promise.all(
        validClientsAndTools.map(async ({ mcp, appDoc, machine }) => {
          if (["stdio", "docker"].includes(mcp.type) && files.length > 0 && machine?.id) {
            await fly.uploadFileToMachine(appDoc._id, machine.id, files);
          }
        }),
      );
    }
  }

  return tools;
};

