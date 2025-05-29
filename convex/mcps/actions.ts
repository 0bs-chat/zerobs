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
                    ports: [{ port: 8000, handlers: ["http"] }],
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
    if (!app) {
      throw new Error(`Failed to create app ${appName}`);
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
    const mcp = await ctx.runQuery(internal.mcps.crud.read, {
      id: args.mcpId,
    });
    if (!mcp) {
      throw new Error("MCP not found");
    }

    const appName = String(mcp._id);
    console.log(`Attempting to remove app ${appName} and its machines...`);
    const app: FlyApp | null = await fly.getApp(appName);
    if (app && app.name) {
        const machines = await fly.listMachines(app.name);
        if (machines) {
            for (const machineToDelete of machines) {
                if (machineToDelete.id) {
                    console.log(`Deleting machine ${machineToDelete.id} for app ${app.name}...`);
                    try {
                        await fly.stopMachine(app.name, machineToDelete.id);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        await fly.deleteMachine(app.name, machineToDelete.id);
                        console.log(`Machine ${machineToDelete.id} deleted.`);
                    } catch (error: any) {
                        console.error(`Error deleting machine ${machineToDelete.id}:`, error.message ? error.message : error);
                    }
                }
            }
        }
        console.log(`Deleting app ${app.name}...`);
        await fly.deleteApp(app.name);
        console.log(`App ${app.name} deleted.`);
    } else {
      console.log(`App ${appName} not found or name missing, nothing to remove.`);
    }
    await ctx.runMutation(internal.mcps.crud.update, {
        id: args.mcpId,
        patch: { url: undefined },
    });
  },
});