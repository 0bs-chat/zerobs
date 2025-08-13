"use node";

import { MultiServerMCPClient, type Connection } from "@langchain/mcp-adapters";
import { api, internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import type { Id } from "../../_generated/dataModel";
import { fly } from "../../utils/flyio";
import { getDocumentUrl } from "../../utils/helpers";
import { extractFileIdsFromMessage, type ExtendedRunnableConfig } from "../helpers";
import type { GraphState } from "../state";
import { models } from "../models";

export const getMCPTools = async (
  ctx: ActionCtx,
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
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

  // Reset all MCPs that have `restartOnNewChat` set to true
  await Promise.all(
    mcps.page.map((mcp) => {
      if (mcp.restartOnNewChat) {
        return ctx.runAction(internal.mcps.actions.restart, {
          mcpId: mcp._id,
        });
      }
    }),
  );

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
    (mcp) => mcp.status === "created" && mcp.url,
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
    ]),
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
        mcps.page.map(async (mcp) => {
          if (["stdio", "docker"].includes(mcp.type) && files.length > 0) {
            await fly.uploadFileToAllMachines(mcp._id, files);
          }
        }),
      );
    }
  }

  return tools;
};
