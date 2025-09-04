import { api, internal } from "../_generated/api";
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";

export const prepareChat = internalMutation({
  args: v.object({
    chatId: v.id("chats"),
    model: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<
    | {
        chat: Doc<"chats">;
        message: Doc<"chatMessages">;
        messages: Doc<"chatMessages">[];
        customPrompt: string | undefined;
        streamDoc: Doc<"streams">;
      }
    | undefined
  > => {
    const chat = await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    if (args.model && args.model !== chat.model) {
      await ctx.runMutation(internal.chats.crud.update, {
        id: args.chatId,
        patch: { model: args.model, updatedAt: Date.now() },
      });
      chat.model = args.model;
    }

    let streamDoc = await ctx.runQuery(internal.streams.queries.getInternal, {
      chatId: args.chatId,
      userId: chat.userId,
    });
    if (["pending", "streaming"].includes(streamDoc?.status ?? "")) {
      return;
    }

    if (streamDoc) {
      await ctx.db.patch(streamDoc._id, {
        status: "pending",
        completedSteps: [],
      });
      streamDoc.status = "pending";
      streamDoc.completedSteps = [];
    } else {
      const newStreamId = await ctx.db.insert("streams", {
        userId: chat.userId,
        status: "pending",
        chatId: args.chatId,
        completedSteps: [],
      });
      streamDoc = {
        _id: newStreamId,
        userId: chat.userId,
        status: "pending",
        chatId: args.chatId,
        completedSteps: [],
        _creationTime: Date.now(),
      };
    }
    
    const project = chat.projectId
      ? await ctx.runQuery(internal.projects.queries.getInternal, {
          projectId: chat.projectId,
          userId: chat.userId,
        })
      : null;

    const customPrompt =
      project?.systemPrompt && project.systemPrompt.trim() !== ""
        ? project.systemPrompt
        : undefined;

    const messages = await ctx.db.query("chatMessages").withIndex("by_chat", (q) => q.eq("chatId", args.chatId)).order("asc").collect();

    if (messages?.length === 1) {
      await ctx.scheduler.runAfter(0, internal.langchain.index.generateTitle, {
        chat: chat,
        message: messages[0],
      });
    }

    const message = messages.slice(-1)[0];
    if (!message) {
      throw new Error("Message not found");
    }

    return {
      chat,
      message,
      messages,
      customPrompt,
      streamDoc,
    };
  },
});
