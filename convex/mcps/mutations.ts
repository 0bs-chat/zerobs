import { api, internal } from "../_generated/api";
import { internalMutation, mutation } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import { v } from "convex/values";
import { createJwt } from "../utils/encryption";
import * as schema from "../schema";
import { partial } from "convex-helpers/validators";
import { type Doc } from "../_generated/dataModel";

export const create = mutation({
  args: {
    ...schema.Mcps.table.validator.fields,
    ...partial(schema.Mcps.withoutSystemFields),
    url: v.string(),
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
      enabled: args.enabled ?? true,
      userId: userId,
      updatedAt: Date.now(),
      perChat: args.perChat ?? false,
      template: args.template,
    });

    const numInserts = args.perChat ? 2 : 1;
    await Promise.all(
      Array.from(
        { length: numInserts },
        async () =>
          await ctx.db.insert("mcpApps", {
            mcpId: newMCPId,
            chatId: undefined,
            url: args.url,
            status: args.type === "http" ? "created" : "pending",
          }),
      ),
    );

    if (args.type !== "http") {
      await ctx.scheduler.runAfter(0, internal.mcps.actions.create, {
        mcpId: newMCPId,
        userId: userId,
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
    const mcp = await ctx.runQuery(api.mcps.queries.get, {
      mcpId: args.mcpId,
      includeApps: true,
    });
    if (mcp.type !== "http") {
      await ctx.scheduler.runAfter(0, internal.mcps.actions.remove, {
        mcpApps: mcp.apps!,
        userId: mcp.userId!,
      });
    }

    await Promise.all(mcp.apps!.map((mcpApp) => ctx.db.delete(mcpApp._id)));

    await ctx.db.delete(args.mcpId);

    return null;
  },
});

export const batchToggle = mutation({
  args: {
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    // Get all MCPs for the user
    const mcps = await ctx.db
      .query("mcps")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Update all MCPs to the specified enabled state
    await Promise.all(
      mcps.map((mcp) =>
        ctx.db.patch(mcp._id, {
          enabled: args.enabled,
          updatedAt: Date.now(),
        }),
      ),
    );

    return mcps.length; // Return number of MCPs updated
  },
});

export const assignAppToChat = internalMutation({
  args: {
    mcpId: v.id("mcps"),
    chatId: v.id("chats"),
  },
  handler: async (ctx, args): Promise<Doc<"mcpApps"> | null> => {
    const mcp = await ctx.runQuery(api.mcps.queries.get, {
      mcpId: args.mcpId,
      includeApps: true,
    });

    // First check if there's already an assigned app for this chat
    const existingAssignment = mcp.apps?.find(
      (app) => app.chatId === args.chatId,
    );

    if (existingAssignment) {
      return existingAssignment;
    }

    // Find an unassigned app for this MCP
    const unassignedApps = mcp.apps?.filter((app) => app.chatId === undefined);

    if (!unassignedApps?.length) {
      return null; // No unassigned app available
    }

    // Assign the app to the chat
    await ctx.db.patch(unassignedApps[0]._id, {
      chatId: args.chatId,
    });

    if (unassignedApps.length < 2) {
      const numCreate = Math.min(2 - unassignedApps.length, 1);
      await Promise.all(
        Array.from({ length: numCreate }, async () => {
          await ctx.runMutation(internal.mcps.crud.createMcpApp, {
            mcpId: args.mcpId,
            chatId: args.chatId,
            url: "",
            status: "pending",
          });
        }),
      );
      await ctx.scheduler.runAfter(0, internal.mcps.actions.create, {
        mcpId: args.mcpId,
        userId: mcp.userId!,
      });
    }

    return unassignedApps[0];
  },
});
