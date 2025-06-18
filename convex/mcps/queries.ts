import { query } from "../_generated/server";
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
