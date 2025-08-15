"use node";

import type { RunnableConfig } from "@langchain/core/runnables";
import type { ActionCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  BaseMessage,
  AIMessage,
  HumanMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
} from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { getMCPTools, getRetrievalTools } from "./tools";
import { getGoogleTools } from "./tools/googleTools";
import { getGithubTools } from "./tools/github";
import { getModel } from "./models";
import { createAgentSystemMessage } from "./prompts";
import { GraphState } from "./state";
import type {
  StructuredToolInterface,
  ToolSchemaBase,
} from "@langchain/core/tools";

export type ExtendedRunnableConfig = RunnableConfig & {
  ctx: ActionCtx;
  chat: Doc<"chats">;
  customPrompt?: string;
};

export async function createSimpleAgent(
  _state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
) {
  const chat = config.chat;
  const model = await getModel(config.ctx, chat.model, chat.reasoningEffort);
  const promptTemplate = ChatPromptTemplate.fromMessages([
    createAgentSystemMessage(
      chat.model,
      undefined,
      config.customPrompt,
      false,
      chat.artifacts,
    ),
    new MessagesPlaceholder("messages"),
  ]);
  return promptTemplate.pipe(model);
}

export async function createAgentWithTools(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
  plannerMode: boolean = false,
) {
  const chat = config.chat;
  const allTools = await getAvailableTools(state, config);

  if (!chat.conductorMode) {
    const model = await getModel(config.ctx, chat.model, chat.reasoningEffort);
    const promptTemplate = ChatPromptTemplate.fromMessages([
      createAgentSystemMessage(
        chat.model,
        plannerMode,
        plannerMode ? undefined : config.customPrompt,
        true,
        plannerMode ? false : chat.artifacts,
      ),
      new MessagesPlaceholder("messages"),
    ]);

    return createReactAgent({
      llm: model,
      tools: allTools,
      prompt: promptTemplate,
    });
  } else {
    const toolkits: Toolkit[] = await getAvailableTools(state, config, true);
    if (!toolkits || toolkits.length === 0) {
      throw new Error("Need atleast 1 mcp enabled to use conductor mode");
    }
    const llm = await getModel(config.ctx, "worker", undefined);
    const supervisorLlm = await getModel(
      config.ctx,
      chat.model!,
      chat.reasoningEffort,
    );
    const agents = toolkits.map((toolkit: Toolkit) =>
      createReactAgent({
        llm: llm,
        tools: toolkit.tools,
        name: toolkit.name,
        prompt: `You are a ${toolkit.name} assistant`,
      }),
    );
    return createSupervisor({
      agents: [
        ...agents,
      ],
      llm: supervisorLlm,
      prompt: createAgentSystemMessage(
        chat.model,
        plannerMode,
        plannerMode ? undefined : config.customPrompt,
        true,
        plannerMode ? false : chat.artifacts,
      ),
    }).compile();
  }
}

export function getPlannerAgentResponse(messages: BaseMessage[]): BaseMessage {
  // filter and concat all ai messages
  const aiResponses = messages.filter(
    (message) => typeof message === typeof AIMessage,
  );
  const storedAIResponses = mapChatMessagesToStoredMessages(aiResponses);
  return mapStoredMessagesToChatMessages([
    {
      ...storedAIResponses[storedAIResponses.length - 1],
      data: {
        ...storedAIResponses[storedAIResponses.length - 1].data,
        content: storedAIResponses
          .map((response) => response.data.content)
          .join("\n\n"),
      },
    },
  ])[0];
}

export function getLastMessage(
  messages: BaseMessage[],
  type: "ai" | "human",
): { message: BaseMessage; index: number } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message instanceof AIMessage && type === "ai") {
      return { message, index: i };
    }
    if (message instanceof HumanMessage && type === "human") {
      return { message, index: i };
    }
  }
  return null;
}

export type Toolkit = {
  name: string;
  tools: StructuredToolInterface<ToolSchemaBase>[];
};

// Overloads to provide precise return types based on `groupTools`
export async function getAvailableTools(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
): Promise<StructuredToolInterface<ToolSchemaBase>[]>;
export async function getAvailableTools(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
  groupTools: false,
): Promise<StructuredToolInterface<ToolSchemaBase>[]>;
export async function getAvailableTools(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
  groupTools: true,
): Promise<Toolkit[]>;
export async function getAvailableTools(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
  groupTools: boolean = false,
): Promise<Toolkit[] | StructuredToolInterface<ToolSchemaBase>[]> {
  const chat = config.chat;

  const [
    mcpTools,
    retrievalTools,
    googleTools,
    githubTools,
  ] = await Promise.all([
    getMCPTools(config.ctx, state),
    getRetrievalTools(state, config, true),
    chat.enabledToolkits.includes("google") ? getGoogleTools(config) : Promise.resolve([]),
    chat.enabledToolkits.includes("github") ? getGithubTools(config) : Promise.resolve([]),
  ]);

  if (!groupTools) {
    return [
      ...mcpTools,
      ...(chat.projectId ? [retrievalTools.vectorSearch] : []),
      ...(chat.webSearch ? [retrievalTools.webSearch] : []),
      ...(googleTools.length > 0 ? googleTools : []),
      ...(githubTools.length > 0 ? githubTools : []),
    ];
  }

  // Group MCP tools by server name (tool name format: "mcp__<server>__<tool>")
  const mcpGrouped = new Map<string, StructuredToolInterface<ToolSchemaBase>[]>();
  for (const tool of mcpTools) {
    const parts = tool.name.split("__");
    const groupName = parts.length >= 2 ? parts[1] : "MCP";
    if (!mcpGrouped.has(groupName)) mcpGrouped.set(groupName, []);
    mcpGrouped.get(groupName)!.push(tool);
  }

  const toolkits: Toolkit[] = [
    ...Array.from(mcpGrouped.entries()).map(([name, tools]) => ({ name, tools })),
    ...(chat.webSearch ? [{ name: "WebSearch", tools: [retrievalTools.webSearch] }] : []),
    ...(chat.projectId ? [{ name: "VectorSearch", tools: [retrievalTools.vectorSearch] }] : []),
    ...(googleTools.length > 0 ? [{ name: "Google", tools: googleTools }] : []),
    ...(githubTools.length > 0 ? [{ name: "GitHub", tools: githubTools }] : []),
  ];

  return toolkits;
}

export async function getAvailableToolsDescription(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
): Promise<string> {
  const toolsInfo: StructuredToolInterface<ToolSchemaBase>[] = await getAvailableTools(state, config);

  if (toolsInfo.length === 0) {
    return "No tools are currently available.";
  }

  return toolsInfo
    .map((tool) => `- ${tool.name}: ${tool.description}`)
    .join("\n");
}

export function extractFileIdsFromMessage(
  messageContent: any,
): Id<"documents">[] {
  const fileIds: Id<"documents">[] = [];

  try {
    // Handle different message content structures
    let content;
    if (messageContent.data && messageContent.data.content) {
      if (typeof messageContent.data.content === "string") {
        content = JSON.parse(messageContent.data.content);
      } else {
        content = messageContent.data.content;
      }
    } else if (messageContent.content) {
      if (typeof messageContent.content === "string") {
        content = JSON.parse(messageContent.content);
      } else {
        content = messageContent.content;
      }
    } else {
      // If messageContent is already an array, use it directly
      if (Array.isArray(messageContent)) {
        content = messageContent;
      } else {
        return fileIds;
      }
    }

    if (Array.isArray(content)) {
      content.forEach((item) => {
        if (item.type === "file" && item.file && item.file.file_id) {
          fileIds.push(item.file.file_id);
        }
      });
    }
  } catch (error) {
    console.log("Failed to parse message content for file IDs:", error);
  }

  return fileIds;
}
