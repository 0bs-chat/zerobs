import { internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    command: v.optional(v.string()),
    env: v.optional(v.record(v.string(), v.string())),
    url: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("running"), v.literal("stopped"), v.literal("error"))
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    if (!args.command && !args.url) {
      throw new Error("Command or URL is required");
    }

    const newMCPId = await ctx.db.insert("mcps", {
      name: args.name,
      command: args.command,
      env: args.env,
      url: args.url,
      status: args.status,
      userId: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.mcps.actions.start, {
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
      status: v.optional(
        v.union(v.literal("running"), v.literal("stopped"), v.literal("error"))
      ),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const existingMCP = await ctx.db
      .query("mcps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.mcpId))
      .first();

    if (!existingMCP) {
      throw new Error("MCP not found");
    }

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
    const { userId } = await requireAuth(ctx);

    const existingMCP = await ctx.db
      .query("mcps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.mcpId))
      .first();

    if (!existingMCP) {
      throw new Error("MCP not found");
    }

    await ctx.scheduler.runAfter(0, internal.mcps.actions.stop, {
      mcpId: args.mcpId,
    });

    await ctx.db.delete(args.mcpId);

    return null;
  },
});

export const toggle = mutation({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const existingMCP = await ctx.db
      .query("mcps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.mcpId))
      .first();

    if (!existingMCP) {
      throw new Error("MCP not found");
    }

    if (existingMCP.status === "running") {
      await ctx.scheduler.runAfter(0, internal.mcps.actions.stop, {
        mcpId: args.mcpId,
      });
    } else {
      await ctx.scheduler.runAfter(0, internal.mcps.actions.start, {
        mcpId: args.mcpId,
      });
    }

    return null;
  },
});

export const stopIdle = internalMutation({
  handler: async (ctx) => {
    const idleContainers = await ctx.db
      .query("mcps")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "running"),
          q.lt(q.field("updatedAt"), Date.now() - 15 * 60 * 1000)
        )
      )
      .collect();

    await Promise.all(
      idleContainers.map((c) =>
        ctx.scheduler.runAfter(0, internal.mcps.actions.stop, {
          mcpId: c._id,
        })
      )
    );

    return null;
  },
});

export const ensureRunning = internalMutation({
  args: {
    mcpIds: v.array(v.id("mcps")),
  },
  handler: async (ctx, args) => {
    const mcps = await Promise.all(
      args.mcpIds.map((id) => ctx.runQuery(internal.mcps.crud.read, { id }))
    );

    await Promise.all(
      mcps.map(
        (mcp) =>
          mcp &&
          ctx.scheduler.runAfter(0, internal.mcps.actions.start, {
            mcpId: mcp._id,
          })
      )
    );

    return null;
  },
});
