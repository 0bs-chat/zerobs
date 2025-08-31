"use node";

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { api, internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
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
  createMcpAuthToken
} from "../../mcps/utils";

export const getMCPTools = async (
  ctx: ActionCtx,
  state: typeof GraphState.State,
  config?: ExtendedRunnableConfig,
) => {
  const mcps = await ctx.runQuery(api.mcps.queries.getAll, {
    paginationOpts: {
      numItems: 100,
      cursor: null,
    },
    filters: {
      enabled: true,
    },
  });

  if (mcps.page.length === 0) {
    return [];
  }

  // Process all MCPs in one comprehensive loop - setup, connection, client creation, and tool fetching
  const clientsAndTools = await Promise.all(
    mcps.page.map(async (mcp) => {
      try {
        // Get configurable envs once per MCP
        const mcpConfigurableEnvs = await resolveConfigurableEnvs(ctx, mcp);

        let machineId: string | undefined;

        // Handle per-chat MCPs - assign from pool or create on demand
        if (mcp.perChat && ["stdio", "docker"].includes(mcp.type) && config) {
          try {
            let assignedMachineId = await ctx.runMutation(api.mcps.mutations.assignMachineToChat, {
              mcpId: mcp._id,
              chatId: config.chat._id,
            });

            if (!assignedMachineId) {
              await ctx.runAction(internal.mcps.actions.create, {
                mcpId: mcp._id,
              });
              assignedMachineId = await ctx.runMutation(api.mcps.mutations.assignMachineToChat, {
                mcpId: mcp._id,
                chatId: config.chat._id,
              });
            } else {
              await ctx.scheduler.runAfter(0, internal.mcps.actions.create, {
                mcpId: mcp._id,
              });
            }

            if (assignedMachineId) {
              machineId = assignedMachineId;
            }
          } catch (error) {
            console.error(`Failed to assign per-chat MCP machine for ${mcp.name}:`, error);
            return null;
          }
        } else {
          machineId = (await fly.getMachineByName(mcp._id, "machine"))?.id!;
        }

        try {
          await fly.startMachine(mcp._id, machineId!);
        } catch (error) {}
        await fly.waitTillHealthy(mcp._id, {
          timeout: 120000,
          interval: 1000,
        });

        // Filter out MCPs that don't have a URL or aren't ready
        if (!mcp.url || mcp.status === "creating") {
          console.error(`MCP ${mcp._id} is not ready`);
          return null;
        }

        // Build connection object
        const authToken = await createMcpAuthToken(mcp);
        const headers: Record<string, string> = {
          ...mcp.env,
          ...mcpConfigurableEnvs,
          fly_force_instance_id: machineId!,
          Authorization: `Bearer ${authToken}`,
        };

        const connection = {
          transport: "http" as const,
          url: mcp.url!,
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
        let tools: Awaited<ReturnType<typeof client.getTools>> = [];
        let success = false;
        for (let attempt = 0; attempt <= 180 && !success; attempt++) {
          try {
            if (attempt === 5) {
              try {
                await fly.startMachine(mcp._id, machineId!);
              } catch (error) {}
              // send a get request to the machine with the same headers as the connection
              try {
                await fetch(mcp.url!, {
                  headers,
                });
              } catch (error) {}
            }
            tools = await client.getTools();
            success = true;
          } catch (error) {
            if (attempt === 180) {
              console.error(`Failed to create MCP client for ${mcp.name} after 180 attempts`, error);
              return null;
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

        return { client, tools, mcp, machineId };
      } catch (error) {
        console.error(`Failed to process MCP ${mcp.name}:`, error);
      }
    })
  );

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
        // Filter out any null results from documents without URLs
        .filter((file): file is { name: string; url: string } => file !== null);

      // Upload files to each MCP's specific machine
      await Promise.all(
        validClientsAndTools.map(async ({ mcp, machineId }) => {
          if (["stdio", "docker"].includes(mcp.type) && files.length > 0 && machineId) {
            await fly.uploadFileToMachine(mcp._id, machineId, files);
          }
        }),
      );
    }
  }

  return tools;
};
