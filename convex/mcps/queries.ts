import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import type { Doc } from "../_generated/dataModel";
import { paginationOptsValidator } from "convex/server";
import { api } from "../_generated/api";

export const get = query({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const mcp = await ctx.db.get(args.mcpId);

    if (!mcp || mcp.userId !== userId) {
      throw new Error("MCP not found");
    }

    return mcp;
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

    return mcps;
  },
});

export const getMultiple = internalQuery({
  args: {
    mcpIds: v.array(v.id("mcps")),
    filters: v.optional(
      v.object({
        enabled: v.optional(v.boolean()),
      }),
    ),
  },
  handler: async (ctx, args): Promise<Doc<"mcps">[]> => {
    const mcps = await Promise.all(
      args.mcpIds.map(async (mcpId) => {
        const mcp = await ctx.runQuery(api.mcps.queries.get, {
          mcpId,
        });

        if (!args.filters) {
          return mcp;
        }

        if (args.filters.enabled && mcp?.enabled) {
          return mcp;
        }

        if (!args.filters.enabled && !mcp?.enabled) {
          return mcp;
        }

        return null;
      }),
    );

    return mcps.filter((mcp) => mcp !== null);
  },
});
