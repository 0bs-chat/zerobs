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
import { createJwt } from "../../utils/encryption";
import { MCP_TEMPLATES } from "../../../src/components/chat/panels/mcp/templates";
import { resolveConfigurableEnvs } from "../../mcps/utils";

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

      let updatedMcp = mcp;

      // Handle per-chat MCPs - create infrastructure on demand
      if (mcp.perChat && ["stdio", "docker"].includes(mcp.type) && config) {
        const mcpName = `${config.chat._id}-${mcp._id}`.slice(0, 62);

        try {
          // Get or create fly.io app and machine similar to vibz logic
          let app = await fly.getApp(mcpName);
          let machine = null;

          if (app) {
            const machines = await fly.listMachines(mcpName);
            if (machines && machines.length > 0) {
              machine = machines[0];
            }
          }

          // If no app, create it
          if (!app) {
            app = await fly.createApp({
              app_name: mcpName,
              org_slug: "personal",
            });

            if (app) {
              await fly.allocateIpAddress(app.name!, "shared_v4");
            }
          }

          if (!machine) {
            const machineConfig = {
              name: `${mcpName}-machine`,
              region: "sea",
              config: {
                image: mcp.dockerImage || "mantrakp04/mcprunner:v2",
                env: {
                  ...mcp.env,
                  ...mcpConfigurableEnvs,
                  MCP_COMMAND: mcp.command || "",
                  HOST: `https://${mcpName}.fly.dev`,
                  OAUTH_TOKEN: await createJwt(
                    "OAUTH_TOKEN",
                    mcp._id,
                    mcp.userId,
                    true,
                  ),
                },
                guest: { cpus: 2, memory_mb: 2048, cpu_kind: "shared" },
                services: [
                  {
                    ports: [{ port: 443, handlers: ["tls", "http"] }],
                    protocol: "tcp",
                    internal_port: mcp.dockerPort || 8000,
                    autostart: true,
                    autostop: "suspend" as const,
                    min_machines_running: 0,
                    checks: [
                      {
                        type: "tcp",
                      },
                    ],
                  },
                ],
              },
            };
            machine = await fly.createMachine(mcpName, machineConfig);
            await fly.waitTillHealthy(mcpName, {
              timeout: 120000,
              interval: 1000,
            });
          }
          const sseUrl = `https://${mcpName}.fly.dev/sse`;

          // Update MCP with the URL
          await ctx.runMutation(internal.mcps.crud.update, {
            id: mcp._id,
            patch: { url: sseUrl, status: "created" },
          });

          updatedMcp = { ...mcp, url: sseUrl, status: "created" as const };
        } catch (error) {
          console.error(`Failed to create per-chat MCP ${mcpName}:`, error);
          // Don't return null - continue to check if this MCP has existing URL
        }
      }

      // Filter out MCPs that don't have a URL or aren't ready
      if (!updatedMcp.url || updatedMcp.status === "creating") {
        return null;
      }

      // Build connection object
      let authToken = null;
      if (updatedMcp.template) {
        const matchingTemplate = MCP_TEMPLATES.find(
          (t) => t.template === updatedMcp.template,
        );
        if (matchingTemplate && matchingTemplate.customAuthTokenFromEnv) {
          authToken = updatedMcp.env[matchingTemplate.customAuthTokenFromEnv];
        }
      }

      return {
        name: updatedMcp.name,
        connection: {
          transport: "http" as const,
          url: updatedMcp.url!,
          headers: {
            ...updatedMcp.env,
            ...mcpConfigurableEnvs,
            Authorization: `Bearer ${authToken || (await createJwt("OAUTH_TOKEN", updatedMcp._id, updatedMcp.userId, true))}`,
          },
          useNodeEventSource: true,
          reconnect: {
            enabled: true,
            maxAttempts: 60,
            delayMs: 1000,
          },
        },
        mcp: updatedMcp,
      };
    }),
  );

  // Filter out null results and create servers object
  const validResults = mcpResults.filter(
    (result): result is NonNullable<typeof result> => result !== null,
  );
  const mcpServers: Record<string, Connection> = Object.fromEntries(
    validResults.map((result) => [result.name, result.connection]),
  );
  const readyMcps = validResults.map((result) => result.mcp);

  // Retry logic for client creation
  let client: MultiServerMCPClient;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= 60; attempt++) {
    try {
      client = new MultiServerMCPClient({
        prefixToolNameWithServerName: true,
        additionalToolNamePrefix: "mcp",
        throwOnLoadError: false,
        mcpServers,
      });

      // If we get here, client creation succeeded
      break;
    } catch (error) {
      lastError = error as Error;
      console.warn(`MCP client creation attempt ${attempt + 1} failed:`, error);

      // If this is the last attempt, throw the error
      if (attempt === 60) {
        throw new Error(
          `Failed to create MCP client after 60 attempts: ${lastError.message}`,
        );
      }

      // Wait 1 second before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const tools = await client!.getTools();

  // if promptTool, fetch the client from the client.getClient(mcpName) and update the first tool's description with the promptTool + description
  await Promise.all(
    readyMcps.map(async (mcp) => {
      if (mcp.template) {
        const matchingTemplate = MCP_TEMPLATES.find(
          (t) => t.template === mcp.template,
        );
        if (matchingTemplate && matchingTemplate.promptTool) {
          const mcpClient = await client!.getClient(mcp.name);
          if (mcpClient) {
            const prompt = await mcpClient.getPrompt({
              name: matchingTemplate.promptTool,
            });
            if (prompt) {
              const mcpTools = tools.filter((t) => t.name.includes(mcp.name));
              if (mcpTools.length > 0) {
                mcpTools[0].description = `${prompt.messages[0].content.text}\n\n${mcpTools[0].description}`;
              }
            }
          }
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
            const documentDoc = await ctx.runQuery(
              internal.documents.crud.read,
              {
                id: documentId as Id<"documents">,
              },
            );
            if (!documentDoc) return null;
            // Include various document types for upload (file, image, github, text)
            const url = await getDocumentUrl(ctx, documentDoc.key);
            return {
              name: `${index}_${documentDoc.name}`,
              url,
            };
          }),
        )
      )
        // Filter out any null results from documents without URLs
        .filter((file): file is { name: string; url: string } => file !== null);

      await Promise.all(
        readyMcps.map(async (mcp) => {
          if (["stdio", "docker"].includes(mcp.type) && files.length > 0) {
            await fly.uploadFileToAllMachines(mcp._id, files);
          }
        }),
      );
    }
  }

  return tools;
};
