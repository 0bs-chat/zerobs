import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { api } from "../_generated/api";
import { partial } from "convex-helpers/validators";
import * as schema from "../schema";
import { internal } from "../_generated/api";

export const create = mutation({
  args: {
    name: v.string(),
    model: v.string(),
    reasoningEffort: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    projectId: v.union(v.id("projects"), v.null()),
    agentMode: v.boolean(),
    plannerMode: v.boolean(),
    webSearch: v.boolean(),
    artifacts: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const chatId = ctx.db.insert("chats", {
      ...args,
      userId,
      pinned: false,
      documents: [],
      text: "",
      reasoningEffort: args.reasoningEffort ?? "medium",
      updatedAt: Date.now(),
      public: false,
    });
    return chatId;
  },
});

export const update = mutation({
  args: {
    chatId: v.id("chats"),
    updates: v.object(partial(schema.Chats.withoutSystemFields)),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    await ctx.db.patch(args.chatId, { ...args.updates, updatedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    if (!userId) {
      throw new Error("User not found, userId is null.");
    }

    await ctx.runQuery(api.chats.queries.get, {
      chatId: args.chatId,
    });

    // Delete associated chat stream
    const chatStream = await ctx.db
      .query("streams")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (chatStream) {
      await ctx.runMutation(internal.streams.mutations.remove, {
        chatId: args.chatId,
      });
    }

    // delete the chat itself
    await ctx.db.delete(args.chatId);

    return null;
  },
});

// // for atomic chat and input creation for new new chats.
// export const createWithInput = mutation({
//   args: {
//     name: v.string(),
//     chatInput: v.object({
//       model: v.string(),
//       agentMode: v.optional(v.boolean()),
//       plannerMode: v.optional(v.boolean()),
//       webSearch: v.optional(v.boolean()),
//       documents: v.optional(v.array(v.id("documents"))),
//       projectId: v.optional(v.union(v.id("projects"), v.null())),
//       artifacts: v.optional(v.boolean()),
//       text: v.string(),
//     }),
//   },
//   handler: async (ctx, args) => {
//     const { userId } = await requireAuth(ctx);

//     const chatId = await ctx.db.insert("chats", {
//       name: args.name,
//       userId,
//       pinned: false,
//       updatedAt: Date.now(),
//     });

//     await ctx.db.insert("chatInputs", {
//       ...args.chatInput,
//       chatId,
//       agentMode: args.chatInput.agentMode ?? false,
//       plannerMode: args.chatInput.plannerMode ?? false,
//       webSearch: args.chatInput.webSearch ?? false,
//       artifacts: args.chatInput.artifacts ?? false,
//       model: args.chatInput.model ?? "gemini-2.5-flash",
//       userId,
//       updatedAt: Date.now(),
//     });

//     return chatId;
//   },
// });
