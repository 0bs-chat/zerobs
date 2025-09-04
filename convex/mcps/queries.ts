import { query, internalQuery } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { verifyEnv } from "./utils";
import type { Doc } from "../_generated/dataModel";
import { internal } from "../_generated/api";

export const getInternal = internalQuery({
  args: {
    mcpId: v.id("mcps"),
    includeApps: v.optional(v.boolean()),
    userId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Doc<"mcps"> & { apps?: Doc<"mcpApps">[] }> => {
    const mcp = await ctx.db.get(args.mcpId);

    if (!mcp || mcp.userId !== args.userId) {
      throw new Error("MCP not found");
    }

    let apps: Doc<"mcpApps">[] = [];
    if (args.includeApps) {
      apps = await ctx.db
        .query("mcpApps")
        .withIndex("by_mcp", (q) => q.eq("mcpId", args.mcpId))
        .collect();
    }

    return {
      ...mcp,
      env: await verifyEnv(mcp.env!),
      ...(args.includeApps ? { apps } : {}),
    };
  },
});

export const get = query({
  args: {
    mcpId: v.id("mcps"),
    includeApps: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<Doc<"mcps"> & { apps?: Doc<"mcpApps">[] }> => {
    const { userId } = await requireAuth(ctx);
    return await ctx.runQuery(internal.mcps.queries.getInternal, {
      mcpId: args.mcpId,
      includeApps: args.includeApps,
      userId: userId,
    });
  },
});

export const getAll = query({
  args: {
    filters: v.optional(
      v.object({
        enabled: v.optional(v.boolean()),
      }),
    ),
    includeApps: v.optional(v.boolean()),
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
      .collect();

    const page = await Promise.all(
      mcps.map(async (mcp) => {
        const apps = await ctx.db
          .query("mcpApps")
          .withIndex("by_mcp", (q) => q.eq("mcpId", mcp._id))
          .collect();
        return {
          ...mcp,
          env: await verifyEnv(mcp.env!),
          ...(args.includeApps ? { apps } : {}),
        };
      }),
    );

    return page;
  },
});

export const getAssignedMcpAppForChat = query({
  args: {
    mcpId: v.id("mcps"),
    chatId: v.id("chats"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<(Doc<"mcps"> & { apps?: Doc<"mcpApps">[] }) | null> => {
    const { userId } = await requireAuth(ctx);

    // Get the MCP to verify ownership
    const mcp = await ctx.runQuery(internal.mcps.queries.getInternal, {
      mcpId: args.mcpId,
      includeApps: true,
      userId: userId,
    });

    if (!mcp) {
      return null;
    }

    // Find the app assigned to this chat
    const assignedApp = mcp.apps?.find((app) => app.chatId === args.chatId);

    if (!assignedApp) {
      return null;
    }

    return {
      ...mcp,
      apps: [assignedApp],
    };
  },
});
