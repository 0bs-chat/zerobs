"use node";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { fly } from "../utils/flyio";
import type { FlyApp, CreateMachineRequest } from "../utils/flyio";
import { verifyEnv } from "./utils";

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
      if (!["stdio", "docker"].includes(mcp.type)) {
        throw new Error("MCP is not a stdio or docker type");
      }
      if (mcp.type === "stdio" && !mcp.command) {
        throw new Error("MCP command is not defined");
      }
      if (mcp.type === "docker" && !mcp.dockerImage) {
        throw new Error("MCP docker image is not defined");
      }

      const appName = String(mcp._id);
      const sseUrl = `https://${appName}.fly.dev/sse`;

      const machineConfig: CreateMachineRequest = {
        name: `${appName}-machine`,
        region: "sea",
        config: {
          image: mcp.dockerImage || "mantrakp04/mcprunner:latest",
          env: {
            ...(await verifyEnv(mcp.env!)),
            MCP_COMMAND: mcp.command || "",
            HOST: "https://" + appName + ".fly.dev",
          },
          guest: { cpus: 2, memory_mb: 2048, cpu_kind: "shared" },
          services: [
            {
              ports: [{ port: 443, handlers: ["tls", "http"] }],
              protocol: "tcp",
              internal_port: mcp.dockerPort || 8000,
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

export const restart = internalAction({
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
      if (!["docker", "stdio"].includes(mcp.type)) {
        throw new Error("MCP is not a docker or stdio type");
      }
      if (!mcp.url) {
        throw new Error("MCP URL is not defined");
      }
      if (mcp.status === "creating") {
        throw new Error("MCP is still creating");
      }

      await ctx.runMutation(internal.mcps.crud.update, {
        id: args.mcpId,
        patch: { status: "creating" },
      });

      const appName = String(mcp._id);
      const app: FlyApp | null = await fly.getApp(appName);

      if (app && app.name) {
        const machines = await fly.listMachines(app.name);

        if (machines && machines.length > 0) {
          const machinesWithId = machines.filter((machine) => machine.id);

          // Stop machines
          await Promise.all(
            machinesWithId.map((machine) =>
              fly.stopMachine(app.name!, machine.id!),
            ),
          );

          // Wait for machines to stop
          for (let i = 0; i < 30; i++) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const updatedMachines = await fly.listMachines(app.name!);
            if (
              updatedMachines?.every(
                (m) =>
                  !machinesWithId.some((original) => original.id === m.id) ||
                  m.state === "stopped",
              )
            ) {
              break;
            }
          }

          // Start machines
          await Promise.all(
            machinesWithId.map((machine) =>
              fly.startMachine(app.name!, machine.id!),
            ),
          );
        }
      }

      await ctx.runMutation(internal.mcps.crud.update, {
        id: args.mcpId,
        patch: { status: "created" },
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
    }
  },
});
