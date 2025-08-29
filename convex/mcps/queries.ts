import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { paginationOptsValidator } from "convex/server";
import { verifyEnv } from "./utils";
import type { Doc } from "../_generated/dataModel";

export const get = query({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args): Promise<Doc<"mcps">> => {
    const { userId } = await requireAuth(ctx);

    const mcp = await ctx.db.get(args.mcpId);

    if (!mcp || mcp.userId !== userId) {
      throw new Error("MCP not found");
    }

    return {
      ...mcp,
      env: await verifyEnv(mcp.env!),
    };
  },
});

export const getAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filters: v.optional(
      v.object({
        enabled: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const mcps = await ctx.db
      .query("mcps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        args.filters?.enabled === undefined
          ? true
          : q.eq(q.field("enabled"), args.filters.enabled),
      )
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      mcps.page.map(async (mcp) => {
        return {
          ...mcp,
          env: await verifyEnv(mcp.env!),
        };
      }),
    );

    return {
      ...mcps,
      page,
    };
  },
});

export const getAssignedMachineId = internalQuery({
  args: {
    mcpId: v.id("mcps"),
    chatId: v.id("chats"),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("perChatMcps")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .filter((q) => q.eq(q.field("mcpId"), args.mcpId))
      .first();

    return assignment?.machineId || null;
  },
});

export const getUnassignedMachineIds = internalQuery({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    const unassigned = await ctx.db
      .query("perChatMcps")
      .withIndex("by_mcp", (q) => q.eq("mcpId", args.mcpId))
      .filter((q) => q.eq(q.field("chatId"), undefined))
      .collect();

    return unassigned.map((assignment) => assignment.machineId);
  },
});

export const countUnassignedPerChatMcps = internalQuery({
  args: {
    mcpId: v.id("mcps"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const unassignedMachines = await ctx.db
      .query("perChatMcps")
      .withIndex("by_mcp", (q) => q.eq("mcpId", args.mcpId))
      .filter((q) => q.eq(q.field("chatId"), undefined))
      .collect();

    return unassignedMachines.length;
  },
});