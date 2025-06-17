import { api, internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { v } from "convex/values";
import { createJwt } from "../utils/encryption";

export const create = mutation({
  args: {
    name: v.string(),
    command: v.optional(v.string()),
    dockerImage: v.optional(v.string()),
    dockerPort: v.optional(v.number()),
    env: v.optional(v.record(v.string(), v.string())),
    url: v.optional(v.string()),
    enabled: v.boolean(),
    restartOnNewChat: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    if (!args.command && !args.url) {
      throw new Error("Command or URL is required");
    }

    const envJwts: Record<string, string> = {};
    await Promise.all(
      Object.entries(args.env ?? {}).map(async ([key, value]) => {
        envJwts[key] = await createJwt(userId, key, value);
      }),
    );

    const newMCPId = await ctx.db.insert("mcps", {
      name: args.name,
      type: args.command ? "stdio" : args.dockerImage ? "docker" : "sse",
      dockerImage: args.dockerImage,
      dockerPort: args.dockerImage ? args.dockerPort : undefined,
      command: args.command,
      env: envJwts,
      url: args.url,
      enabled: args.enabled,
      status: "creating",
      restartOnNewChat: args.restartOnNewChat ?? false,
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
      type: v.optional(v.union(v.literal("stdio"), v.literal("docker"), v.literal("sse"))),
      dockerImage: v.optional(v.string()),
      dockerPort: v.optional(v.number()),
      command: v.optional(v.string()),
      env: v.optional(v.record(v.string(), v.string())),
      url: v.optional(v.string()),
      enabled: v.optional(v.boolean()),
      restartOnNewChat: v.optional(v.boolean()),
      status: v.optional(
        v.union(
          v.literal("creating"),
          v.literal("created"),
          v.literal("error"),
        ),
      ),
    }),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    await ctx.runQuery(api.mcps.queries.get, {
      mcpId: args.mcpId,
    });

    const envJwts: Record<string, string> = {};
    await Promise.all(
      Object.entries(args.updates.env ?? {}).map(async ([key, value]) => {
        envJwts[key] = await createJwt(userId, key, value);
      }),
    );

    await ctx.db.patch(args.mcpId, {
      ...args.updates,
      env: envJwts,
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

export const restart = mutation({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    await ctx.runQuery(api.mcps.queries.get, {
      mcpId: args.mcpId,
    });

    await ctx.scheduler.runAfter(0, internal.mcps.actions.restart, {
      mcpId: args.mcpId,
    });

    return null;
  },
});
