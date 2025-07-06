"use node";

import { z } from "zod";
import { action, internalAction } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { agentGraph } from "./agent";
import { api, internal } from "../_generated/api";
import { HumanMessage, mapChatMessagesToStoredMessages, mapStoredMessageToChatMessage, StoredMessage, SystemMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { GraphState } from "./state";
import { v } from "convex/values";
import { getThreadFromMessage } from "../chatMessages/helpers";
import { formatMessages, getModel } from "./models";
import { ChatMessages, Chats } from "../schema";

export interface AIChunkGroup {
  type: "ai";
  content: string;
  reasoning?: string;
}

export interface ToolChunkGroup {
  type: "tool";
  toolName: string;
  input?: unknown;
  output?: unknown;
  isComplete: boolean;
}

export const generateTitle = internalAction({
  args: v.object({
    chat: Chats.doc,
    message: ChatMessages.doc,
  }),
  handler: async (ctx, args) => {
    const firstMessage = await formatMessages(ctx, [mapStoredMessageToChatMessage(JSON.parse(args.message.message) as StoredMessage)], args.chat.model);
    const model = await getModel(ctx, args.chat.model, args.chat.reasoningEffort);
    const titleSchema = z.object({
      title: z.string().describe("A short title for the chat. Keep it under 6 words."),
    });
    const structuredModel = model.withStructuredOutput(titleSchema);
    const title = await structuredModel.invoke([
      new SystemMessage("You are a title generator that generates a short title for the following user message."),
      ...firstMessage,
    ]) as z.infer<typeof titleSchema>;
    await ctx.runMutation(api.chats.mutations.update, {
      chatId: args.chat._id,
      updates: {
        name: title.title,
      },
    });
  }
});

export const chat = action({
  args: v.object({
    chatId: v.id("chats"),
  }),
  handler: async (ctx, args) => {    
    let chat = await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });
    
    const abortController = new AbortController();
    const project = chat.projectId 
      ? await ctx.runQuery(api.projects.queries.get, { 
          projectId: chat.projectId 
        })
      : null;
    
    const customPrompt = project?.systemPrompt && project.systemPrompt.trim() !== "" 
      ? project.systemPrompt 
      : undefined;
    
    const messages = await ctx.runQuery(api.chatMessages.queries.get, {
      chatId: args.chatId,
    })

    if (messages?.length === 1) {
      ctx.runAction(internal.langchain.index.generateTitle, {
        chat: chat,
        message: messages[0],
      });
    }
    
    const message = messages.slice(-1)[0];
    if (!message) {
      throw new Error("Message not found");
    }
    const currentThread = getThreadFromMessage(messages, message);
    
    const checkpointer = new MemorySaver();
    const agent = agentGraph.compile({ checkpointer });
    
    const stream = agent.streamEvents(
      { messages: currentThread.map((message) => message.message) },
      { 
        version: "v2",
        configurable: { 
          ctx, 
          chat: chat,
          customPrompt,
          thread_id: args.chatId,
        },
        recursionLimit: 100,
        signal: abortController.signal,
      }
    );

    const BUFFER = 300; // ms
    let buffer: string[] = [];
    let wasCancelled = false;
    let streamCompleted = false;
    let streamDoc = await ctx.runQuery(api.streams.queries.get, {
      chatId: args.chatId,
    });
    let checkpoint: typeof GraphState.State | null = null;
    
    if (!streamDoc) {
      streamDoc = await ctx.runMutation(internal.streams.crud.create, {
        userId: chat.userId,
        status: "pending",
        chatId: args.chatId,
        completedSteps: [],
      });
    }

    await ctx.runMutation(internal.streams.mutations.update, {
      chatId: args.chatId,
      updates: {
        status: "pending",
      },
    });

    // Create a function to handle flushing chunks
    async function flushChunks() {
      while (!wasCancelled && !streamCompleted) {
        await new Promise(resolve => setTimeout(resolve, BUFFER));
        
        if (buffer.length > 0) {
          const chunksToFlush = buffer;
          buffer = [];
          streamDoc = await ctx.runMutation(
            internal.streams.mutations.appendChunks,
            {
              chatId: args.chatId,
              chunks: chunksToFlush,
            },
          );
          
          // Check if the stream was cancelled during appendChunks
          if (streamDoc.status === "cancelled") {
            wasCancelled = true;
            abortController.abort();
            break;
          }
        }
      }
      
      if (buffer.length > 0) {
        const chunksToFlush = buffer;
        buffer = [];
        
        await ctx.runMutation(
          internal.streams.mutations.appendChunks,
          {
            chatId: args.chatId,
            chunks: chunksToFlush,
          },
        );
      }
    }

    // Start the flush loop in parallel
    const flushPromise = flushChunks();

    try {
      for await (const event of stream) {
        if (streamDoc?.status === "cancelled") {
          wasCancelled = true;
          abortController.abort();
          break;
        }

        const currentCheckpoint = (await agent.getState({ configurable: { thread_id: args.chatId } })).values as typeof GraphState.State
        if (checkpoint === null
            || (currentCheckpoint.messages?.length !== checkpoint.messages?.length)
            || (currentCheckpoint.plan?.length !== checkpoint.plan?.length)
            || (currentCheckpoint.pastSteps?.length !== checkpoint.pastSteps?.length)
          ) {
          checkpoint = currentCheckpoint;
          await ctx.runMutation(internal.streams.mutations.update, {
            chatId: args.chatId,
            updates: {
              completedSteps: currentCheckpoint?.pastSteps?.length > 0 ? currentCheckpoint.pastSteps.map((pastStep) => {
                const [step, _messages] = pastStep;
                return step as string;
              }) : currentCheckpoint?.plan?.length > 0 ? [currentCheckpoint.plan.flat()[0]] : undefined,
            },
          });
        }

        if (
          ["on_chat_model_stream", "on_tool_start", "on_tool_end"].includes(
            event.event,
          )
        ) {
          const allowedNodes = ["baseAgent", "simple", "plannerAgent"];
          if (
            allowedNodes.some((node) =>
              event.metadata.checkpoint_ns.startsWith(node),
            )
          ) {
            // Minify the data before sending it to the frontend to reduce bandwidth.
            if (event.event === "on_chat_model_stream") {
              const content = event.data?.chunk?.content ?? "";
              const reasoning =
                event.data?.chunk?.additional_kwargs?.reasoning_content ?? "";

              const aiChunk: AIChunkGroup = {
                type: "ai",
                content,
                ...(reasoning ? { reasoning } : {}),
              };

              buffer.push(JSON.stringify(aiChunk));
            } else if (event.event === "on_tool_start") {
              const toolChunk: ToolChunkGroup = {
                type: "tool",
                toolName: event.name ?? "Tool",
                input: JSON.stringify(event.data?.input),
                isComplete: false,
              } as ToolChunkGroup;

              buffer.push(JSON.stringify(toolChunk));
            } else if (event.event === "on_tool_end") {
              const toolChunk: ToolChunkGroup = {
                type: "tool",
                toolName: event.name ?? "Tool",
                output: event.data?.output.content,
                isComplete: true,
              } as ToolChunkGroup;

              buffer.push(JSON.stringify(toolChunk));
            }
          }
        }
      }
      streamCompleted = true;
    } catch (error) {
      wasCancelled = true;
      if (abortController.signal.aborted) {
        return;
      }
      if (streamDoc && streamDoc.status !== "cancelled") {
        await ctx.runMutation(internal.streams.mutations.update, {
          chatId: args.chatId,
          updates: {
            completedSteps: [],
            status: "error",
          },
        });
      }
      throw error;
    } finally {
      // Wait for any remaining chunks to be flushed
      await flushPromise;
    }

    const newMessages = checkpoint?.messages?.slice(currentThread.length, checkpoint.messages.length);
    if (newMessages) {
      let parentId: Id<"chatMessages"> | null = currentThread.length > 0 ? currentThread[currentThread.length - 1]._id : null;
      for (const message of newMessages) {
        const newMessageDoc: Doc<"chatMessages"> = await ctx.runMutation(internal.chatMessages.crud.create, {
          chatId: args.chatId,
          parentId: parentId,
          message: JSON.stringify(mapChatMessagesToStoredMessages([message])[0]),
        });
        parentId = newMessageDoc._id;
      }
    }

    await ctx.runMutation(internal.streams.mutations.update, {
      chatId: args.chatId,
      updates: {
        completedSteps: [],
        status: wasCancelled ? "cancelled" : "done",
      },
    });
  }
});

export const regenerate = action({
  args: v.object({
    messageId: v.id("chatMessages"),
  }),
  handler: async (ctx, args) => {
    const message = await ctx.runQuery(internal.chatMessages.crud.read, {
      id: args.messageId,
    });
    if (!message) {
      throw new Error("Message not found");
    }
    const newMessageId = await ctx.runMutation(internal.chatMessages.mutations.regenerate, {
      messageId: args.messageId,
    });
    await ctx.runAction(api.langchain.index.chat, {
      chatId: message.chatId,
    });
  }
});
