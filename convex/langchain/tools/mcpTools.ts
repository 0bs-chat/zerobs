"use node";

import { MultiServerMCPClient, type Connection } from "@langchain/mcp-adapters";
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
import { MCP_TEMPLATES } from "../../../src/components/chat/panels/mcp/templates";
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

  // Process all MCPs in one async loop - handle per-chat creation and build connections
  const mcpResults = await Promise.all(
    mcps.page.map(async (mcp) => {
      // Get configurable envs once per MCP
      const mcpConfigurableEnvs = await resolveConfigurableEnvs(ctx, mcp);

      let machineName: string = "machine";

      // Handle per-chat MCPs - assign from pool or create on demand
      if (mcp.perChat && ["stdio", "docker"].includes(mcp.type) && config) {
        try {
          let assignedMachineName = await ctx.runMutation(api.mcps.mutations.assignMachineToChat, {
            mcpId: mcp._id,
            chatId: config.chat._id,
          });

          if (!assignedMachineName) {
            await ctx.runAction(internal.mcps.actions.create, {
              mcpId: mcp._id,
            });
            assignedMachineName = await ctx.runMutation(api.mcps.mutations.assignMachineToChat, {
              mcpId: mcp._id,
              chatId: config.chat._id,
            });
          }

          if (assignedMachineName) {
            machineName = assignedMachineName;
          }
        } catch (error) {
          throw new Error("Failed to assign per-chat MCP machine");
        }
      }

      try {
        await fly.startMachine(mcp._id, machineName);
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
        fly_force_instance_id: machineName,
        Authorization: `Bearer ${authToken}`,
      };

      return {
        name: mcp.name,
        connection: {
          transport: "http" as const,
          url: mcp.url!,
          headers,
          useNodeEventSource: true,
          reconnect: {
            enabled: true,
            maxAttempts: 60,
            delayMs: 1000,
          },
        },
        mcp: mcp,
      };
    }),
  );

  // Filter out null results and create servers object
  const validResults = mcpResults.filter(
    (result): result is NonNullable<typeof result> => result !== null,
  );

  // Early return if no valid MCPs are available
  if (validResults.length === 0) {
    return [];
  }

  const mcpServers: Record<string, Connection> = Object.fromEntries(
    validResults.map((result) => [result.name, result.connection]),
  );
  const readyMcps = validResults.map((result) => result.mcp);

  const client = new MultiServerMCPClient({
    prefixToolNameWithServerName: true,
    additionalToolNamePrefix: "mcp",
    throwOnLoadError: false,
    mcpServers,
  });

  let tools: Awaited<ReturnType<typeof client.getTools>> = [];
  for (let attempt = 0; attempt <= 180; attempt++) {
    try {
      tools = await client.getTools();
      break;
    } catch (error) {
      if (attempt === 180) {
        throw new Error("Failed to create MCP client after 180 attempts");
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // if promptTool, fetch the client from the client.getClient(mcpName) and update the first tool's description with the promptTool + description
  await Promise.all(
    readyMcps.map(async (mcp) => {
      if (mcp.template) {
        const matchingTemplate = MCP_TEMPLATES.find(
          (t) => t.template === mcp.template,
        );
        if (matchingTemplate && matchingTemplate.promptTool) {
          try {
            const mcpClient = await client!.getClient(mcp.name);
            if (mcpClient) {
              const prompt = await mcpClient.getPrompt({
                name: matchingTemplate.promptTool,
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
    }),
  );

        // Extract file IDs from the last message content instead of chat document
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
        validResults.map(async (result) => {
          const { mcp } = result;
          if (["stdio", "docker"].includes(mcp.type) && files.length > 0) {
            // Extract machineName from the connection headers (fly_force_instance_id)
            const machineName = result.connection.headers.fly_force_instance_id || "machine";
            await fly.uploadFileToMachine(mcp._id, machineName, files);
          }
        }),
      );
    }
  }

  return tools;
};
