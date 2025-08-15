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
import { models } from "../models";

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

  // Wait for all MCPs to transition from 'creating' status to 'running'
  let currentMcps = mcps.page;
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
    readyMcps.map((mcp) => [
      mcp.name,
      {
        transport: "http",
        url: mcp.url!,
        headers: mcp.env!,
        useNodeEventSource: true,
        reconnect: {
          enabled: true,
          maxAttempts: 5,
          delayMs: 200,
        },
      },
    ])
  );

  // Determine output handling based on model modality support
  const modelName = config.chat.model;
  const modelConfig = modelName
    ? models.find((m) => m.model_name === modelName)
    : undefined;
  const supportsImages = !!modelConfig?.modalities.includes("image");
  const supportsAudio = !!(modelConfig as any)?.modalities?.includes?.("audio");

  // Initialize the MultiServerMCPClient with output mapping tuned to model capabilities
  const client = new MultiServerMCPClient({
    prefixToolNameWithServerName: true,
    additionalToolNamePrefix: "mcp",
    throwOnLoadError: false,
    useStandardContentBlocks: supportsImages || supportsAudio,
    outputHandling: {
      text: "content",
      image: supportsImages ? "content" : "artifact",
      audio: supportsAudio ? "content" : "artifact",
      resource: "artifact",
    },
    mcpServers,
  });

  const tools = await client.getTools();

  const groupedTools: Map<string, StructuredToolInterface<ToolSchemaBase>[]> =
    new Map();

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
