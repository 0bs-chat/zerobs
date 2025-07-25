"use node";

import type { RunnableConfig } from "@langchain/core/runnables";
import type { ActionCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
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
import { getModel } from "./models";
import { createAgentSystemMessage } from "./prompts";
import { GraphState } from "./state";

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
  const tools = await getMCPTools(config.ctx, chat._id);
  const retrievalTools = await getRetrievalTools(state, config, true);
  const googleTools = await getGoogleTools(config, true);

  const allTools = [
    ...(tools.tools.length > 0 ? tools.tools : []),
    ...(chat.projectId ? [retrievalTools.vectorSearch] : []),
    ...(chat.webSearch ? [retrievalTools.webSearch] : []),
    ...(googleTools.length > 0 ? googleTools : []),
  ];

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
    if (Object.keys(tools.groupedTools).length === 0) {
      throw new Error("Need atleast 1 mcp enabled to use conductor mode");
    }
    const llm = await getModel(config.ctx, "worker", undefined);
    const supervisorLlm = await getModel(
      config.ctx,
      chat.model!,
      chat.reasoningEffort,
    );
    const agents = Object.entries(tools.groupedTools).map(
      ([groupName, tools]) =>
        createReactAgent({
          llm: llm,
          tools: tools,
          name: groupName,
          prompt: `You are a ${groupName} assistant`,
        }),
    );
    return createSupervisor({
      agents: [
        ...agents,
        ...(chat.webSearch
          ? [
              createReactAgent({
                llm: llm,
                tools: [retrievalTools.webSearch],
                name: "WebSearch",
                prompt:
                  "You are a WebSearch assistant specialized in searching the internet for current information. Use web search to find up-to-date information from various online sources.",
              }),
            ]
          : []),
        ...(chat.projectId
          ? [
              createReactAgent({
                llm: llm,
                tools: [retrievalTools.vectorSearch],
                name: "VectorSearch",
                prompt:
                  "You are a VectorSearch assistant specialized in searching through project documents and uploaded files. Use vector similarity search to find relevant information from the user's project documents.",
              }),
            ]
          : []),
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

export async function getAvailableTools(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
): Promise<Array<{ name: string; description: string }>> {
  const chat = config.chat;
  const tools = await getMCPTools(config.ctx, chat._id);
  const retrievalTools = await getRetrievalTools(state, config, true);
  const googleTools = await getGoogleTools(config, true);

  const toolsInfo: Array<{ name: string; description: string }> = [];

  // Add MCP tools
  tools.tools.forEach((tool) => {
    toolsInfo.push({
      name: tool.name,
      description: tool.description || "No description available",
    });
  });

  // Add retrieval tools
  if (chat.projectId) {
    toolsInfo.push({
      name: retrievalTools.vectorSearch.name,
      description: retrievalTools.vectorSearch.description,
    });
  }

  if (chat.webSearch) {
    toolsInfo.push({
      name: retrievalTools.webSearch.name,
      description: retrievalTools.webSearch.description,
    });
  }

  // Add Google tools
  googleTools.forEach((tool) => {
    toolsInfo.push({
      name: tool.name,
      description: tool.description || "No description available",
    });
  });

  return toolsInfo;
}

export async function getAvailableToolsDescription(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
): Promise<string> {
  const toolsInfo = await getAvailableTools(state, config);

  if (toolsInfo.length === 0) {
    return "No tools are currently available.";
  }

  return toolsInfo
    .map((tool) => `- ${tool.name}: ${tool.description}`)
    .join("\n");
}
