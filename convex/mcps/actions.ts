"use node";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { fly, FlyApp, CreateMachineRequest } from "../utils/flyio";

export const create = internalAction({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    try {
      const mcp = await ctx.runQuery(internal.mcps.crud.read, {
        id: args.mcpId,
      });
      if (!mcp) {
        throw new Error("MCP not found");
      }
      if (!mcp.enabled) {
        throw new Error("MCP is not enabled");
      }
      if (mcp.type !== "stdio") {
        throw new Error("MCP is not a stdio type");
      }
      if (!mcp.command) {
        throw new Error("MCP command is not defined");
      }

      const appName = String(mcp._id);
      const sseUrl = `https://${appName}.fly.dev/sse`;

      const machineConfig: CreateMachineRequest = {
        name: `${appName}-machine`,
        region: "sea",
        config: {
          image: "mantrakp04/mcprunner:latest",
          env: {
            ...(mcp.env || {}),
            MCP_COMMAND: mcp.command,
          },
          guest: { cpus: 1, memory_mb: 1024, cpu_kind: "shared" },
          services: [
            {
              ports: [{ port: 443, handlers: ["tls", "http"] }],
              protocol: "tcp",
              internal_port: 8000,
              autostart: true,
              autostop: "suspend",
              min_machines_running: 0,
            },
          ],
        },
      };

      const app = await fly.createApp({
        app_name: appName,
        org_slug: "personal",
      });

      await fly.allocateIpAddress(app?.name!, "shared_v4");
      await fly.createMachine(appName, machineConfig);

      await ctx.runMutation(internal.mcps.crud.update, {
        id: args.mcpId,
        patch: { url: sseUrl, status: "created" },
      });
    } catch (error) {
      console.error(error);
      await ctx.runMutation(internal.mcps.crud.update, {
        id: args.mcpId,
        patch: { status: "error" },
      });
    }
  },
});

export const reset = internalAction({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    try {
      const mcp = await ctx.runQuery(internal.mcps.crud.read, {
        id: args.mcpId,
      });
      if (!mcp) {
        throw new Error("MCP not found");
      }
      if (mcp.type !== "sse") {
        throw new Error("MCP is not an sse type");
      }
      if (!mcp.url) {
        throw new Error("MCP URL is not defined");
      }

      const appName = String(mcp._id);
      const app: FlyApp | null = await fly.getApp(appName);
      if (app && app.name) {
        await fly.deleteApp(app.name);
      } else {
        console.log(
          `App ${appName} not found or name missing, nothing to remove.`,
        );
      }

      await ctx.runMutation(internal.mcps.crud.update, {
        id: args.mcpId,
        patch: { status: "creating" },
      });
      await ctx.runAction(internal.mcps.actions.create, {
        mcpId: args.mcpId,
      });
    } catch (error) {
      console.error(error);
      await ctx.runMutation(internal.mcps.crud.update, {
        id: args.mcpId,
        patch: { status: "error" },
      });
    }
  },
});

export const remove = internalAction({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (_ctx, args) => {
    const appName = String(args.mcpId);
    const app: FlyApp | null = await fly.getApp(appName);
    if (app && app.name) {
      await fly.deleteApp(app.name);
    } else {
      console.log(
        `App ${appName} not found or name missing, nothing to remove.`,
      );
    }
  },
});
