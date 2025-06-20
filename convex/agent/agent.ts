"use node";

import { CoreMessage, CoreAssistantMessage, generateText, generateObject, streamText, FinishReason } from "ai";
import { z } from "zod";
import { ActionCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { getChatModel } from "./models";
import { createAgentSystemMessage, createPlannerSystemMessage, createReplannerSystemMessage } from "./prompts";
import { api, internal } from "../_generated/api";

// Structured output schemas for different agent types
export const planSchema = z.object({
  plan: z.array(z.string()).describe("Array of plan steps as descriptive strings including all necessary context and instructions"),
});

export const replannerOutputSchema = z.union([
  z.object({
    action: z.literal("continue_planning"),
    plan: z.array(z.string()).describe("Updated plan with remaining steps to execute"),
  }),
  z.object({
    action: z.literal("respond_to_user"),
    response: z.string().describe("Final comprehensive response to the user synthesizing all completed work"),
  }),
]);

export const queryGenerationSchema = z.object({
  queries: z.array(z.string())
    .min(1)
    .max(3)
    .describe("Search queries to find relevant information"),
});

export const documentGradingSchema = z.object({
  relevant: z.boolean().describe("Whether the document is relevant to the user question"),
});

export async function saveMessageToDb(
  ctx: ActionCtx, 
  chatId: Id<"chats">, 
  message: CoreMessage, 
  index: number
): Promise<Id<"chatMessages">> {
  const result = await ctx.runMutation(internal.chats.crud.createMessage, {
    chatId,
    index,
    message: JSON.stringify(message),
  });
  return result._id;
}

export async function getAgentState(ctx: ActionCtx, streamId: Id<"streams">) {
  const streamState = await ctx.runQuery(api.streams.queries.getState, { streamId });
  if (!streamState) throw new Error("Stream state not found");
  return streamState;
}

export async function runSimpleAgent(ctx: ActionCtx, chat: Doc<"chats">, customPrompt: string, messages: CoreMessage[]): Promise<CoreAssistantMessage> {
  const model = await getChatModel(ctx, chat.model);
  
  const systemMessage = createAgentSystemMessage({
    model: chat.model,
    customPrompt,
    baseAgentType: false,
    artifacts: chat.artifacts,
  });

  const result = await generateText({
    model,
    messages: [systemMessage, ...messages],
  });

  return {
    role: "assistant",
    content: result.messages,
  } as CoreAssistantMessage;
}

export async function runBaseAgent(
  config: AgentConfig, 
  messages: CoreMessage[], 
  tools: any[] = [],
  documents?: Array<{ pageContent: string; metadata: Record<string, any> }>
): Promise<CoreMessage> {
  const model = await getChatModel(config.ctx, config.model);
  
  const systemMessage = createAgentSystemMessage({
    model: config.model,
    customPrompt: config.customPrompt,
    baseAgentType: true,
    artifacts: config.artifacts,
  });

  const allMessages = [systemMessage];
  
  // Add document context if available
  if (documents && documents.length > 0) {
    const documentContext = documents.map(doc => doc.pageContent).join("\n\n");
    allMessages.push({
      role: "system",
      content: `## Available Context\n` +
        `You have been provided with the following documents relevant to the user's request. Use them to inform your response.\n` +
        `<documents>\n${documentContext}\n</documents>\n\n`,
    } as CoreMessage);
  }
  
  allMessages.push(...messages);

  const result = await generateText({
    model,
    messages: allMessages,
    tools: tools.length > 0 ? tools : undefined,
  });

  return {
    role: "assistant",
    content: result.text,
    additional_kwargs: documents && documents.length > 0 ? { documents } : undefined,
  } as CoreMessage;
}

export async function runPlannerAgent(
  config: AgentConfig, 
  messages: CoreMessage[],
  documents?: Array<{ pageContent: string; metadata: Record<string, any> }>
): Promise<{ plan: string[] }> {
  const model = await getChatModel(config.ctx, config.model);
  
  const systemPrompt = createPlannerSystemMessage(config.model, documents && documents.length > 0);
  
  let prompt = systemPrompt.content;
  
  // Add document context if available
  if (documents && documents.length > 0) {
    const documentContext = documents.map(doc => doc.pageContent).join("\n\n");
    prompt += `\n\nHere are the documents that are relevant to the question: ${documentContext}`;
  }
  
  // Add the conversation messages
  const userMessages = messages.filter(m => m.role === "user");
  if (userMessages.length > 0) {
    prompt += `\n\nUser messages:\n${userMessages.map(m => m.content).join("\n")}`;
  }

  const result = await generateObject({
    model,
    schema: planSchema,
    prompt,
  });

  return result.object as { plan: string[] };
}

export async function runPlannerTaskAgent(
  config: AgentConfig,
  messages: CoreMessage[],
  taskDescription: string,
  tools: any[] = []
): Promise<CoreMessage> {
  const model = await getChatModel(config.ctx, config.model);
  
  const systemMessage = createAgentSystemMessage({
    model: config.model,
    taskDescription,
    baseAgentType: true,
    artifacts: false,
  });

  const result = await generateText({
    model,
    messages: [systemMessage, ...messages],
    tools: tools.length > 0 ? tools : undefined,
  });

  return {
    role: "assistant",
    content: result.text,
  };
}

export async function runReplannerAgent(
  config: AgentConfig,
  originalMessages: CoreMessage[],
  originalPlan: string[],
  pastSteps: Array<{ step: string; message: string }>
): Promise<{ action: "continue_planning" | "respond_to_user"; plan?: string[]; response?: string }> {
  const model = await getChatModel(config.ctx, config.model);
  
  const systemMessage = createReplannerSystemMessage();
  
  // Find the original user input
  const userMessage = originalMessages.find(msg => msg.role === "user") || originalMessages[originalMessages.length - 1];
  
  // Format past steps for the prompt
  const pastStepsText = pastSteps.map((step, idx) => 
    `${idx + 1}. ${step.step}\nResult: ${step.message}`
  ).join("\n\n");

  const replannerMessages: CoreMessage[] = [
    {
      role: "system",
      content: systemMessage.content
        .replace("{INPUT_PLACEHOLDER}", typeof userMessage.content === "string" ? userMessage.content : "User request")
        .replace("{PLAN_PLACEHOLDER}", JSON.stringify(originalPlan))
        .replace("{PAST_STEPS_PLACEHOLDER}", pastStepsText),
    },
  ];

  const result = await generateText({
    model,
    messages: replannerMessages,
    schema: replannerOutputSchema,
  });

  return result.object as { action: "continue_planning" | "respond_to_user"; plan?: string[]; response?: string };
}

// Query generation for search/retrieval
export async function generateQueries(
  config: AgentConfig,
  messages: CoreMessage[],
  type: "vectorStore" | "webSearch"
): Promise<string[]> {
  const model = await getChatModel(config.ctx, config.model);
  
  const systemMessage = {
    role: "system" as const,
    content: `Based on the messages and the user's query, generate queries for the ${type}. ` +
      `If the input contains multiple questions, identify which one fits the purpose of the query and only generate a query for those user queries.`,
  };

  const result = await generateText({
    model,
    messages: [systemMessage, ...messages.slice(-5)],
    schema: queryGenerationSchema,
  });

  return result.object.queries;
}

// Document grading
export async function gradeDocument(
  config: AgentConfig,
  document: { pageContent: string; metadata: Record<string, any> },
  userMessage: CoreMessage
): Promise<boolean> {
  const model = await getChatModel(config.ctx, config.model);
  
  const systemMessage = {
    role: "system" as const,
    content: `You are a grader assessing relevance of a retrieved document to the user question (focus on the last message as the question).\n` +
      `If the document contains keyword(s) or semantic meaning related to the user question, grade it as relevant.`,
  };

  const messages: CoreMessage[] = [
    systemMessage,
    {
      role: "user",
      content: `Document: ${document.pageContent}\n\nUser Question: ${typeof userMessage.content === "string" ? userMessage.content : "User request"}`,
    },
  ];

  const result = await generateText({
    model,
    messages,
    schema: documentGradingSchema,
  });

  return result.object.relevant;
}
