"use node";

import { api, internal } from "../_generated/api";
import { internalAction, action } from "../_generated/server";
import { v } from "convex/values";
import { fly } from "../utils/flyio";
import type { FlyApp } from "../utils/flyio";
import { randomUUID } from "crypto";
import {
  resolveConfigurableEnvs,
  createMachineConfig,
  validateMcpForDeployment,
  validateMcpForRestart,
  getOrCreateFlyApp,
  ensureMachineHealthy,
  restartAllMachines,
  handleMcpActionError
} from "./utils";

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

      await validateMcpForDeployment(mcp);

      const appName = String(mcp._id);
      const sseUrl = `https://${appName}.fly.dev/sse`;

      // Process configurableEnvs if template is specified
      const configurableEnvValues = await resolveConfigurableEnvs(ctx, mcp);

      const machineConfig = await createMachineConfig(
        mcp,
        appName,
        configurableEnvValues,
        "machine",
      );

      await getOrCreateFlyApp(appName);

      if (mcp.perChat) {
        // Query existing unassigned machines
        const unassignedCount = await ctx.runQuery(internal.mcps.crud.countUnassignedPerChatMcps, {
          mcpId: args.mcpId,
        });

        // Only create machines if we have less than 2 unassigned
        const machinesToCreate = Math.max(0, 2 - unassignedCount);

        if (machinesToCreate > 0) {
          await Promise.all(
            Array.from({ length: machinesToCreate }, async () => {
              const machineConfig = await createMachineConfig(mcp, appName, configurableEnvValues, randomUUID());
              const machine = await fly.createMachine(appName, machineConfig);

              // Create entry in perChatMcps table with chatId set to undefined (unassigned)
              await ctx.runMutation(internal.mcps.crud.createPerChatMcp, {
                mcpId: args.mcpId,
                chatId: undefined,
                machineId: machine?.id!
              });

              // Ensure machine is healthy
              await ensureMachineHealthy(appName, machine?.id || "");
            })
          );
        }
      } else {
        // Create single machine for regular MCPs
        await fly.createMachine(appName, machineConfig);
        await ensureMachineHealthy(appName, "machine");
      }

      await ctx.runMutation(internal.mcps.crud.update, {
        id: args.mcpId,
        patch: { url: sseUrl, status: "created" },
      });
    } catch (error) {
      await handleMcpActionError(ctx, args.mcpId);
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

      await validateMcpForRestart(mcp);

      await ctx.runMutation(internal.mcps.crud.update, {
        id: args.mcpId,
        patch: { status: "creating" },
      });

      const appName = String(mcp._id);
      const app: FlyApp | null = await fly.getApp(appName);

      if (app && app.name) {
        await restartAllMachines(app.name);
      }

      await ctx.runMutation(internal.mcps.crud.update, {
        id: args.mcpId,
        patch: { status: "created" },
      });
    } catch (error) {
      await handleMcpActionError(ctx, args.mcpId);
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

export const getConvexDeployKey = internalAction({
  args: {
    name: v.string(),
    userId: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    CONVEX_DEPLOY_KEY: string;
    CONVEX_DEPLOYMENT_NAME: string;
    CONVEX_DEPLOYMENT_URL: string;
  }> => {
    const CONVEX_ACCESS_TOKEN =
      (
        await ctx.runQuery(internal.apiKeys.queries.getFromKey, {
          key: "CONVEX_ACCESS_TOKEN",
          userId: args.userId,
        })
      )?.value ?? process.env.CONVEX_ACCESS_TOKEN;
    const tokenDetails = await (
      await fetch("https://api.convex.dev/v1/token_details", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CONVEX_ACCESS_TOKEN}`,
        },
      })
    ).json();
    const teamId = tokenDetails.teamId;

    const projectRes = await (
      await fetch(`https://api.convex.dev/v1/teams/${teamId}/create_project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CONVEX_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          deploymentType: "dev",
          projectName: args.name,
        }),
      })
    ).json();
    const devDeploymentName = projectRes.deploymentName;

    const deployKeyRes = await (
      await fetch(
        `https://api.convex.dev/v1/deployments/${devDeploymentName}/create_deploy_key`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${CONVEX_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            name: "vibz-mcp-server",
          }),
        },
      )
    ).json();
    return {
      CONVEX_DEPLOY_KEY: deployKeyRes.deployKey,
      CONVEX_DEPLOYMENT_NAME: devDeploymentName,
      CONVEX_DEPLOYMENT_URL: projectRes.deploymentUrl,
    };
  },
});

const getMachineNameHandler = action({
  args: {
    mcpId: v.id("mcps"),
    chatId: v.string(),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args): Promise<string | null> => {
    const mcp = await ctx.runQuery(api.mcps.queries.get, {
      mcpId: args.mcpId,
    });

    if (mcp.perChat) {
      // First try to assign/get an assigned machine for this chat
      const assignedMachineName: string | null = await ctx.runMutation(api.mcps.mutations.assignMachineToChat, {
        mcpId: args.mcpId,
        chatId: args.chatId as any, // Type assertion for chatId conversion
      });

      if (assignedMachineName) {
        return assignedMachineName;
      }

      // If no assigned machine, try to get machine by name as fallback
      const machine = await fly.getMachineByName(args.mcpId, args.chatId);
      return machine?.name || null;
    } else {
      // For non-per-chat MCPs, return the default machine name
      return "machine";
    }
  },
});

export const getMachineName = getMachineNameHandler;
