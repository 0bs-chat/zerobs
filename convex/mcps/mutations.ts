import { api, internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    command: v.optional(v.string()),
    env: v.optional(v.record(v.string(), v.string())),
    url: v.optional(v.string()),
    enabled: v.boolean(),
    resetOnNewChat: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    if (!args.command && !args.url) {
      throw new Error("Command or URL is required");
    }

    const newMCPId = await ctx.db.insert("mcps", {
      name: args.name,
      type: args.command ? "stdio" : "sse",
      command: args.command,
      env: args.env,
      url: args.url,
      enabled: args.enabled,
      status: "creating",
      resetOnNewChat: args.resetOnNewChat ?? false,
      userId: userId,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.mcps.actions.create, {
      mcpId: newMCPId,
    });

    return newMCPId;
  },
});

export const update = mutation({
  args: {
    mcpId: v.id("mcps"),
    updates: v.object({
      name: v.optional(v.string()),
      command: v.optional(v.string()),
      env: v.optional(v.record(v.string(), v.string())),
      url: v.optional(v.string()),
      enabled: v.optional(v.boolean()),
      resetOnNewChat: v.optional(v.boolean()),
      status: v.optional(v.union(v.literal("creating"), v.literal("created"), v.literal("error"))),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    await ctx.runQuery(api.mcps.queries.get, {
      mcpId: args.mcpId,
    });

    await ctx.db.patch(args.mcpId, {
      ...args.updates,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const remove = mutation({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.mcps.queries.get, {
      mcpId: args.mcpId,
    });

    await ctx.scheduler.runAfter(0, internal.mcps.actions.remove, {
      mcpId: args.mcpId,
    });

    await ctx.db.delete(args.mcpId);

    return null;
  },
});

export const recreate = mutation({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    await ctx.runQuery(api.mcps.queries.get, {
      mcpId: args.mcpId,
    });

    await ctx.scheduler.runAfter(0, internal.mcps.actions.reset, {
      mcpId: args.mcpId,
    });

    return null;
  },
});
