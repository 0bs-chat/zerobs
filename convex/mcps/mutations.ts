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
    } else if (
      args.type === "docker" &&
      !args.dockerImage &&
      !args.dockerPort
    ) {
      throw new Error("Docker image and port are required for docker type");
    }

    const userApiKeys = await ctx.runQuery(api.apiKeys.queries.getAll, {});
    const envWithApiKeys: Record<string, string> = {};
    for (const apiKey of userApiKeys) {
      envWithApiKeys[apiKey.key] = apiKey.value;
    }
    if (args.env) {
      Object.assign(envWithApiKeys, args.env);
    }

    const envJwts: Record<string, string> = {};
    await Promise.all(
      Object.entries(envWithApiKeys).map(async ([key, value]) => {
        envJwts[key] = await createJwt(key, value, userId);
      }),
    );

    const newMCPId = await ctx.db.insert("mcps", {
      name: (args.name ?? "").replace(/ /g, "_"),
      type: args.type,
      dockerImage: args.dockerImage,
      dockerPort: args.dockerPort,
      dockerCommand: args.dockerCommand,
      command: args.command,
      env: envJwts,
      url: args.url,
      enabled: args.enabled ?? true,
      status: args.type === "http" ? "created" : "creating",
      userId: userId,
      updatedAt: Date.now(),
      perChat: args.perChat ?? false,
      template: args.template,
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
        envJwts[key] = await createJwt(key, value, userId);
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

    // Remove all per-chat MCP entries for this MCP
    const perChatMcps = await ctx.db
      .query("perChatMcps")
      .withIndex("by_mcp", (q) => q.eq("mcpId", args.mcpId))
      .collect();

    // Delete each per-chat MCP entry
    await Promise.all(
      perChatMcps.map((perChatMcp) => ctx.db.delete(perChatMcp._id))
    );

    if (mcp.type !== "http") {
      await ctx.scheduler.runAfter(0, internal.mcps.actions.remove, {
        mcpId: args.mcpId,
      });
    }

    await ctx.db.delete(args.mcpId);

    return null;
  },
});


export const assignMachineToChat = mutation({
  args: {
    mcpId: v.id("mcps"),
    chatId: v.id("chats"),
  },
  returns: v.union(v.string(), v.null()), // Returns machineId or null if no unassigned machine available
  handler: async (ctx, args) => {
    // First check if there's already an assigned machine for this chat
    const existingAssignment = await ctx.db
      .query("perChatMcps")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .filter((q) => q.eq(q.field("mcpId"), args.mcpId))
      .first();

    if (existingAssignment) {
      return existingAssignment.machineId;
    }

    // Find an unassigned machine for this MCP
    const unassignedMachine = await ctx.db
      .query("perChatMcps")
      .withIndex("by_mcp", (q) => q.eq("mcpId", args.mcpId))
      .filter((q) => q.eq(q.field("chatId"), undefined))
      .first();

    if (!unassignedMachine) {
      return null; // No unassigned machine available
    }

    // Assign the machine to the chat
    await ctx.db.patch(unassignedMachine._id, {
      chatId: args.chatId,
    });

    return unassignedMachine.machineId;
  },
});
