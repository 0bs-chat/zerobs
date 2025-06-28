"use node";

import type { RunnableConfig } from "@langchain/core/runnables";
import type { ActionCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  BaseMessage,
  AIMessage,
  HumanMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages
} from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { getMCPTools, getRetrievalTools } from "./tools";
import type { Tool } from "@langchain/core/tools";
import { getModel } from "./models";
import { createAgentSystemMessage, createGenerateQueriesPrompt, createGradeDocumentPrompt, generateQueriesSchema, gradeDocumentSchema } from "./prompts";
import { Document } from "@langchain/core/documents";
import { GraphState } from "./state";
import { z } from "zod";

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
  const model = await getModel(config.ctx, chat.model);
  const promptTemplate = ChatPromptTemplate.fromMessages([
    createAgentSystemMessage(
      chat.model,
      undefined,
      config.customPrompt,
      false,
      chat.artifacts
    ),
    new MessagesPlaceholder("documents"),
    new MessagesPlaceholder("messages"),
  ]);
  return promptTemplate.pipe(model);
}

export async function createAgentWithTools(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
  taskDescription?: string,
) {
  const chat = config.chat;
  const tools = await getMCPTools(config.ctx);
  const retrievalTools = await getRetrievalTools(state, config);
  const allTools = [
    ...(tools.tools.length > 0 ? tools.tools : []),
    ...(chat.projectId ? [retrievalTools.vectorSearch] : []),
    ...(chat.webSearch ? [retrievalTools.webSearch] : []),
  ];

  if (!chat.agentMode) {
    const model = await getModel(config.ctx, chat.model);
    const promptTemplate = ChatPromptTemplate.fromMessages([
      createAgentSystemMessage(
        chat.model,
        undefined,
        config.customPrompt,
        true,
        chat.artifacts
      ),
      new MessagesPlaceholder("documents"),
      new MessagesPlaceholder("messages"),
    ]);

    return createReactAgent({
      llm: model,
      tools: allTools,
      prompt: promptTemplate,
    });
  } else {
    if (Object.keys(tools.groupedTools).length === 0) {
      throw new Error("Need atleast 1 mcp enabled to use planner mode");
    }
    const llm = await getModel(config.ctx, "worker");
    const supervisorLlm = await getModel(config.ctx, chat.model!);
    const agents = Object.entries(tools.groupedTools).map(
      ([groupName, tools]: [string, Tool[]]) =>
        createReactAgent({
          llm,
          tools,
          prompt: `You are a ${groupName} assistant`,
        })
    );

    return createSupervisor({
      agents,
      llm: supervisorLlm,
      prompt: createAgentSystemMessage(
        chat.model,
        undefined,
        config.customPrompt,
        true,
        chat.artifacts
      ),
    }).compile();
  }
}

export function getPlannerAgentResponse(
  messages: BaseMessage[],
): BaseMessage {
  // filter and concat all ai messages
  const aiResponses = messages.filter(
    (message) => typeof message === typeof AIMessage,
  );
  const storedAIResponses = mapChatMessagesToStoredMessages(aiResponses);
  return mapStoredMessagesToChatMessages([{
    ...storedAIResponses[storedAIResponses.length - 1],
    data: {
      ...storedAIResponses[storedAIResponses.length - 1].data,
      content: storedAIResponses.map((response) => response.data.content).join("\n\n"),
    }
  }])[0];
}

export async function generateQueries(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
  type: "vectorStore" | "webSearch" = "vectorStore"
) {
  const ctx = config.ctx;
  const model = config.chat.model;
  
  if (!model) {
    throw new Error("Model is required");
  }
  
  const queryModel = (createGenerateQueriesPrompt(type)).pipe(
    (await getModel(ctx, model))
    .withStructuredOutput(generateQueriesSchema)
  );
  
  return await queryModel.invoke({
    messages: state.messages.slice(-5)
  }) as z.infer<typeof generateQueriesSchema>;
}

export async function gradeDocument(
  state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
  document: Document,
): Promise<boolean> {
  const promptTemplate = createGradeDocumentPrompt();
  const modelWithOutputParser = promptTemplate.pipe(
    (await getModel(config.ctx, config.chat.model!)).withStructuredOutput(gradeDocumentSchema)
  );

  const result = await modelWithOutputParser.invoke({
    document: document.pageContent,
    input: state.messages.slice(-1),
  }) as z.infer<typeof gradeDocumentSchema>;

  return result.relevant;
}

export async function formatDocumentsToString(documents: Document[]) {
  return documents.map(doc =>
    `<document metadata="${JSON.stringify(doc.metadata)}">${doc.pageContent}</document>`
  ).join("\n\n");
}

export function getLastMessage(messages: BaseMessage[], type: "ai" | "human"): { message: BaseMessage; index: number } | null {
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

export function addDocumentsToMessage(message: BaseMessage, documents: Document[]): BaseMessage {
  return mapStoredMessagesToChatMessages(
    mapChatMessagesToStoredMessages([message]).map(msg => ({
      ...msg,
      data: {
        ...msg.data,
        additional_kwargs: {
          ...msg.data.additional_kwargs,
          documents: documents.map(doc => ({
            pageContent: doc.pageContent,
            metadata: doc.metadata,
          })),
        }
      }
    }))
  )[0];
}

export async function addDocumentsToMessageHistory(documents: Document[]): Promise<HumanMessage | null> {
  if (!documents || documents.length === 0) {
    return null;
  }
  
  const documentsContent = await formatDocumentsToString(documents);
  
  return new HumanMessage(
    "## Available Context\n" +
    "You have been provided with the following documents relevant to the user's request. Use them to inform your response.\n" +
    "<documents>\n" +
    documentsContent +
    "</documents>\n\n"
  );
}

export function parseStateToStreamStatesDoc(
  state: typeof GraphState.State,
): Omit<Doc<"streamStates">, "_id" | "_creationTime" | "streamId"> {
  // Convert documents to sources - these come from vector search or web search
  const sources = state.documents.map(doc => {
    return {
      type: doc.metadata.type,
      searchResult: {
        title: doc.metadata.title,
        source: doc.metadata.source,
        publishedDate: doc.metadata.publishedDate,
        author: doc.metadata.author,
        image: doc.metadata.image,
        favicon: doc.metadata.favicon,
      },
      document: {
        document: doc.metadata.document,
        text: doc.pageContent,
      }
    }
  });

  const pastSteps = (state.pastSteps || []).map(([step, message]) => {
    const stepString = Array.isArray(step) ? step.join(", ") : step;
    const storedMessage = mapChatMessagesToStoredMessages([message])[0];
    return {
      step: stepString,
      message: storedMessage.data.content,
    };
  });

  return {
    sources,
    plan: state.plan || [],
    pastSteps,
  };
}