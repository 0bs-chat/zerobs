"use node";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { fly, FlyApp, FlyMachine, CreateMachineRequest } from "../utils/flyio";

export const create = internalAction({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
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
    let machine: FlyMachine | null = null;

    const machineConfig: CreateMachineRequest = {
        name: `${appName}-machine`,
        region: "iad",
        config: {
            image: "mantrakp04/mcprunner:latest",
            env: {
                ...(mcp.env || {}),
                MCP_COMMAND: mcp.command,
                IDLE_TIMEOUT_MINS: "15",
            },
            guest: { cpus: 1, memory_mb: 1024, cpu_kind: "shared" },
            services: [
                {
                    ports: [{ port: 443, handlers: ["tls", "http"] }],
                    protocol: "tcp",
                    internal_port: 8000,
                }
            ]
        }
    };
    
    const app = await fly.createApp({
      app_name: appName,
      org_slug: "personal",
    });
    if (!app || !app.id) {
      throw new Error(`Failed to create app ${appName} or app ID is missing`);
    }

    try {
      await fly.allocateIpAddress(appName, "v4");
    } catch (error: any) {
        console.error(`Error allocating IP for ${appName}:`, error.message ? error.message : error);
    }

    machine = await fly.createMachine(appName, machineConfig);
    if (!machine) {
      throw new Error(`Failed to create machine for app ${appName}`);
    }

    await ctx.runMutation(internal.mcps.crud.update, {
      id: args.mcpId,
      patch: { url: sseUrl },
    });
  },
});

export const remove = internalAction({
  args: {
    mcpId: v.id("mcps"),
  },
  handler: async (ctx, args) => {
    const appName = String(args.mcpId);
    const app: FlyApp | null = await fly.getApp(appName);
    if (app && app.name) {
        await fly.deleteApp(app.name);
    } else {
      console.log(`App ${appName} not found or name missing, nothing to remove.`);
    }
  },
});