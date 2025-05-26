import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { paginationOptsValidator } from "convex/server";

export const get = query({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const mcp = await ctx.db
      .query("mcps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.mcpId))
      .first();

    if (!mcp) {
      throw new Error("MCP not found");
    }

    return mcp;
  },
});

export const getAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const mcps = await ctx.db
      .query("mcps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .paginate(args.paginationOpts);

    return mcps;
  },
});

export const getMultiple = query({
  args: {
    mcpIds: v.array(v.id("mcps")),
  },
  handler: async (ctx, args): Promise<Doc<"mcps">[]> => {
    await requireAuth(ctx);

    const mcps = await Promise.all(
      args.mcpIds.map(async (mcpId) => {
        const mcp = await ctx.runQuery(api.mcps.queries.get, {
          mcpId: mcpId,
        });
        if (!mcp) {
          throw new Error("MCP not found");
        }
        return mcp;
      })
    );

    return mcps;
  },
});

export const getRunning = query({
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);

    const mcps = await ctx.db
      .query("mcps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("status"), "running"))
      .collect();

    return mcps;
  },
});
