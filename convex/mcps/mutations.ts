import { api, internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { v } from "convex/values";
import { createJwt } from "../utils/encryption";
import * as schema from "../schema";
import { partial } from "convex-helpers/validators";

export const create = mutation({
  args: {
    ...schema.Mcps.table.validator.fields,
    ...partial(schema.Mcps.withoutSystemFields),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    if (!args.type) {
      throw new Error("MCP type is required");
    }

    if (args.type === "stdio" && !args.command) {
      throw new Error("Command is required for stdio type");
    } else if (args.type === "http" && !args.url) {
      throw new Error("URL is required for http type");
    } else if (args.type === "docker" && !args.dockerImage && !args.dockerPort) {
      throw new Error("Docker image and port are required for docker type");
    }

    const envJwts: Record<string, string> = {};
    await Promise.all(
      Object.entries(args.env ?? {}).map(async ([key, value]) => {
        envJwts[key] = await createJwt(userId, key, value);
      }),
    );

    const newMCPId = await ctx.db.insert("mcps", {
      name: args.name ?? "",
      type: args.type,
      dockerImage: args.dockerImage,
      dockerPort: args.dockerPort,
      command: args.command,
      env: envJwts,
      url: args.url,
      enabled: args.enabled ?? false,
      status: args.type === "http" ? "created" : "creating",
      restartOnNewChat: args.restartOnNewChat ?? false,
      userId: userId,
      updatedAt: Date.now(),
    });

    if (args.type !== "http") {
      await ctx.scheduler.runAfter(0, internal.mcps.actions.create, {
        mcpId: newMCPId,
      });
    }

    return newMCPId;
  },
});

export const update = mutation({
  args: {
    mcpId: v.id("mcps"),
    updates: v.object(partial(schema.Mcps.withoutSystemFields)),
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

    const mcp = await ctx.runQuery(api.mcps.queries.get, {
      mcpId: args.mcpId,
    });

    if (mcp.type !== "http") {
      await ctx.scheduler.runAfter(0, internal.mcps.actions.remove, {
        mcpId: args.mcpId,
      });
    }

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
