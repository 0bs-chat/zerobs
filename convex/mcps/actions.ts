"use node";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import * as fly from "./fly";

export const start = internalAction({
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

    // Check if the machine already exists
    const machineName = String(mcp._id);
    const machine = await fly.getMachine(machineName);
    let sseUrl = mcp.url;

    if (machine && machine.state === "started") {
      // Machine exists and is running, get the URL
      const host = process.env.MCP_RUNNER_HOST || `${process.env.FLY_APP_NAME}.fly.dev`;
      sseUrl = `https://${host}/sse`;
    } else if (machine && machine.state !== "started") {
      // Machine exists but is not running, start it
      sseUrl = await fly.startMachine(machineName);
    } else {
      // Machine doesn't exist, create it
      const env = mcp.env ? mcp.env : {};
      const command = mcp.command || "echo 'No command specified'";
      await fly.createMachine(mcp._id, command, env);
      sseUrl = await fly.startMachine(machineName);
    }

    await ctx.runMutation(internal.mcps.crud.update, {
      id: args.mcpId,
      patch: { url: sseUrl },
    });
  },
});

export const stop = internalAction({
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

    // Stop and delete the machine if it exists
    const machineName = String(mcp._id);
    const machine = await fly.getMachine(machineName);
    if (machine) {
      if (machine.state === "started") {
        await fly.stopMachine(machineName);
      }
      await fly.deleteMachine(machineName);
    }

    await ctx.runMutation(internal.mcps.crud.update, {
      id: args.mcpId,
      patch: { url: undefined, enabled: false },
    });
  },
});

export const stopIdle = internalAction({
  args: {},
  handler: async (ctx, _args) => {
    try {
      // Get all machines from Fly.io
      const machines = await fly.listMachines();
      
      // Extract MCP IDs from machine metadata
      const mcpIds = machines
        .filter((machine: any) => machine.metadata?.mcpId)
        .map((machine: any) => machine.metadata.mcpId as Id<"mcps">);
      
      if (mcpIds.length === 0) {
        return;
      }
      
      // Get MCP records from the database
      const mcps = await ctx.runQuery(internal.mcps.queries.getMultiple, {
        mcpIds: mcpIds,
        filters: {
          enabled: true,
        },
      });
      
      // Stop each enabled MCP
      for (const mcp of mcps) {
        await ctx.runAction(internal.mcps.actions.stop, {
          mcpId: mcp._id,
        });
      }
    } catch (error) {
      console.error("Error stopping idle machines:", error);
    }
  },
});