import { crud } from "convex-helpers/server/crud";
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import schema from "../schema";

export const { create, read, update, destroy } = crud(schema, "chatMessages");

// Internal create function needed for langchain actions
export const createInternal = internalMutation({
  args: {
    chatId: v.id("chats"),
    message: v.string(),
    parentId: v.union(v.id("chatMessages"), v.null()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("chatMessages", {
      chatId: args.chatId,
      message: args.message,
      parentId: args.parentId,
    });
    const doc = await ctx.db.get(id);
    if (!doc) {
      throw new Error("Failed to create chat message");
    }
    return doc;
  },
});
