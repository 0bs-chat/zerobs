"use node";

import { MultiServerMCPClient, type Connection } from "@langchain/mcp-adapters";
import type {
  StructuredToolInterface,
  ToolSchemaBase,
} from "@langchain/core/tools";
import { tool } from "@langchain/core/tools";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
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
import { makeFunctionReference } from "convex/server";

export const getMCPTools = async (
  ctx: ActionCtx,
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig
): Promise<{
  tools: StructuredToolInterface<ToolSchemaBase>[];
  groupedTools: Record<string, StructuredToolInterface<ToolSchemaBase>[]>;
}> => {
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
    return { tools: [], groupedTools: {} };
  }

  let configurableEnvValues: Record<string, string> = {};
  await Promise.all(
    mcps.page.map(async (mcp) => {
      if (mcp.template) {
        const matchingTemplate = MCP_TEMPLATES.find(
          (t) => t.template === mcp.template
        );
        if (matchingTemplate && matchingTemplate.configurableEnv) {
          for (const [key, value] of Object.entries(
            matchingTemplate.configurableEnv
          )) {
            try {
              const functionParts = value.func.split(".");
              if (
                functionParts.length >= 4 &&
                functionParts[0] === "internal"
              ) {
                const moduleName = functionParts[1];
                const actionName = functionParts[2];
                const functionName = functionParts[3];

                const functionRefString = `${moduleName}/${actionName}:${functionName}`;
                if (value.type === "action") {
                  const functionRef =
                    makeFunctionReference<"action">(functionRefString);
                  const resolvedValue = await ctx.runAction(
                    functionRef,
                    value.args
                  );
                  configurableEnvValues[key] = resolvedValue;
                } else if (value.type === "mutation") {
                  const functionRef =
                    makeFunctionReference<"mutation">(functionRefString);
                  const resolvedValue = await ctx.runMutation(
                    functionRef,
                    value.args
                  );
                  configurableEnvValues[key] = resolvedValue;
                } else if (value.type === "query") {
                  const functionRef =
                    makeFunctionReference<"query">(functionRefString);
                  const resolvedValue = await ctx.runQuery(
                    functionRef,
                    value.args
                  );
                  configurableEnvValues[key] = resolvedValue;
                }
              }
            } catch (error) {
              console.error(
                `Failed to resolve configurable env ${key}:`,
                error
              );
            }
          }
        }
      }
    })
  );

  // Handle per-chat MCPs - create infrastructure on demand
  const updatedMcps = await Promise.all(
    mcps.page.map(async (mcp) => {
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
                image: mcp.dockerImage || "mantrakp04/mcprunner:v1",
                env: {
                  ...mcp.env,
                  ...configurableEnvValues,
                  MCP_COMMAND: mcp.command || "",
                  HOST: `https://${mcpName}.fly.dev`,
                  OAUTH_TOKEN: await createJwt(
                    "OAUTH_TOKEN",
                    mcp._id,
                    mcp.userId
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
            await new Promise((resolve) => setTimeout(resolve, 10000));
          }
          const sseUrl = `https://${mcpName}.fly.dev/sse`;

          // Update MCP with the URL
          await ctx.runMutation(internal.mcps.crud.update, {
            id: mcp._id,
            patch: { url: sseUrl, status: "created" },
          });

          return { ...mcp, url: sseUrl, status: "created" as const };
        } catch (error) {
          console.error(`Failed to create per-chat MCP ${mcpName}:`, error);
          return mcp;
        }
      }
      return mcp;
    })
  );

  // Wait for all MCPs to transition from 'creating' status to 'running'
  let currentMcps = updatedMcps;
  let maxAttempts = 10;
  while (
    currentMcps.some((mcp) => mcp.status === "creating") &&
    maxAttempts > 0
  ) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
    const result = await ctx.runQuery(api.mcps.queries.getAll, {
      paginationOpts: {
        numItems: 100,
        cursor: null,
      },
      filters: {
        enabled: true,
      },
    });
    currentMcps = result.page;
    maxAttempts--;
  }

  // Filter for MCPs that are successfully running and have a URL
  const readyMcps = currentMcps.filter(
    (mcp) => mcp.status === "created" && mcp.url
  );

  // Construct connection objects for MultiServerMCPClient
  const mcpServers: Record<string, Connection> = Object.fromEntries(
    await Promise.all(
      readyMcps.map(async (mcp) => {
        let authToken = null;
        if (mcp.template) {
          const matchingTemplate = MCP_TEMPLATES.find(
            (t) => t.template === mcp.template
          );
          if (matchingTemplate && matchingTemplate.customAuthTokenFromEnv) {
            authToken = mcp.env[matchingTemplate.customAuthTokenFromEnv];
          }
        }
        return [
          mcp.name,
          {
            transport: "http",
            url: mcp.url!,
            headers: {
              ...mcp.env,
              ...configurableEnvValues,
              Authorization: `Bearer ${authToken || (await createJwt("OAUTH_TOKEN", mcp._id, mcp.userId))}`,
            },
            useNodeEventSource: true,
            reconnect: {
              enabled: true,
              maxAttempts: 5,
              delayMs: 200,
            },
          },
        ];
      })
    )
  );

  // Initialize the MultiServerMCPClient with output mapping tuned to model capabilities
  const client = new MultiServerMCPClient({
    prefixToolNameWithServerName: true,
    additionalToolNamePrefix: "mcp",
    throwOnLoadError: false,
    mcpServers,
  });

  const tools = await client.getTools();

  const groupedTools: Map<string, StructuredToolInterface<ToolSchemaBase>[]> =
    new Map();

  // if promptTool, fetch the client from the client.getClient(mcpName) and update the first tool's description with the promptTool + description
  await Promise.all(
    readyMcps.map(async (mcp) => {
      if (mcp.template) {
        const matchingTemplate = MCP_TEMPLATES.find(
          (t) => t.template === mcp.template
        );
        if (matchingTemplate && matchingTemplate.promptTool) {
          const mcpClient = await client.getClient(mcp.name);
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
    })
  );

  // Wrap MCP tools to emit descriptive streaming events
  const wrappedTools: StructuredToolInterface<ToolSchemaBase>[] = tools.map(
    (baseTool) => {
      const parts = baseTool.name.split("__");
      const serverName = parts.length >= 2 ? parts[1] : "MCP";
      const prettyName =
        parts.length >= 3 ? parts.slice(2).join(": ") : baseTool.name;

      // Preserve original schema/description/name
      const wrapped = tool(
        async (args: any, toolConfig: any) => {
          await dispatchCustomEvent(
            "tool_stream",
            {
              chunk: `Connecting to ${serverName} and invoking ${prettyName}…`,
            },
            toolConfig
          );
          try {
            await dispatchCustomEvent(
              "tool_stream",
              { chunk: `Executing ${prettyName} with provided parameters…` },
              toolConfig
            );
            const result = await (baseTool as any).invoke(args, toolConfig);
            await dispatchCustomEvent(
              "tool_stream",
              {
                chunk: `${prettyName} finished. Preparing results for display…`,
              },
              toolConfig
            );
            return result as any;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Unknown error";
            await dispatchCustomEvent(
              "tool_stream",
              { chunk: `${prettyName} failed: ${message}`, complete: true },
              toolConfig
            );
            throw error;
          }
        },
        {
          name: baseTool.name,
          description:
            (baseTool as any).description ?? `MCP tool from ${serverName}`,
          schema: (baseTool as any).schema as any,
        }
      );
      return wrapped as unknown as StructuredToolInterface<ToolSchemaBase>;
    }
  );

  for (const tool of wrappedTools) {
    const parts = tool.name.split("__");
    if (parts.length >= 2) {
      const serverName = parts[1];
      if (!groupedTools.has(serverName)) {
        groupedTools.set(serverName, []);
      }
      groupedTools.get(serverName)?.push(tool);
    }
  }
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
              }
            );
            if (!documentDoc) return null;
            // Include various document types for upload (file, image, github, text)
            const url = await getDocumentUrl(ctx, documentDoc.key);
            return {
              name: `${index}_${documentDoc.name}`,
              url,
            };
          })
        )
      )
        // Filter out any null results from documents without URLs
        .filter((file): file is { name: string; url: string } => file !== null);

      await Promise.all(
        mcps.page.map(async (mcp) => {
          if (["stdio", "docker"].includes(mcp.type) && files.length > 0) {
            await fly.uploadFileToAllMachines(mcp._id, files);
          }
        })
      );
    }
  }

  return {
    tools: wrappedTools,
    groupedTools: Object.fromEntries(groupedTools),
  };
};
