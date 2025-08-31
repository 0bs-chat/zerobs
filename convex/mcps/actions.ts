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
  getOrCreateFlyApp,
  handleMcpActionError
} from "./utils";
import { trackInternal, checkInternal } from "../autumn";

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

      // Check usage limits before creating MCPs
      const usageCheck = await checkInternal(mcp.userId!, "mcps", 1);
      if (!usageCheck.allowed) {
        throw new Error(`Usage limit exceeded for MCPs. ${usageCheck.message || 'Please upgrade your plan to create more MCPs.'}`);
      }

      const appName = String(mcp._id);
      const sseUrl = `https://${appName}.fly.dev/mcp`;

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
        const unassignedCount = await ctx.runQuery(internal.mcps.queries.countUnassignedPerChatMcps, {
          mcpId: args.mcpId,
        });

        // Only create machines if we have less than 2 unassigned
        const machinesToCreate = Math.max(0, 2 - unassignedCount);

        if (machinesToCreate > 0) {
          if (machinesToCreate > 1) {
            const additionalUsageCheck = await checkInternal(mcp.userId!, "mcps", machinesToCreate);
            if (!additionalUsageCheck.allowed) {
              throw new Error(`Usage limit exceeded for MCPs. Cannot create ${machinesToCreate} machines. ${additionalUsageCheck.message || 'Please upgrade your plan.'}`);
            }
          }
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

              // Wait for machine to be healthy
              await fly.waitTillHealthy(appName, machine?.id || "", {
                timeout: 120000,
                interval: 1000,
              });
            })
          );

          // Track MCP usage for per-chat MCPs based on machines created
          await trackInternal(mcp.userId!, "mcps", machinesToCreate);
        }
      } else {
        // Create single machine for regular MCPs
        await fly.createMachine(appName, machineConfig);

        // Wait for machine to be healthy
        await fly.waitTillHealthy(appName, "machine", {
          timeout: 120000,
          interval: 1000,
        });

        // Track MCP usage for regular MCPs (1 machine)
        await trackInternal(mcp.userId!, "mcps", 1);
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

export const remove = internalAction({
  args: {
    mcpId: v.id("mcps"),
    userId: v.string(),
  },
  handler: async (_ctx, args) => {
    const appName = String(args.mcpId);
    const app: FlyApp | null = await fly.getApp(appName);
    
    if (app && app.name) {
      // Get all machines for this app to count them
      const machines = await fly.listMachines(app.name);
      const machineCount = machines?.length || 0;
      if (machineCount > 0) {
        await trackInternal(args.userId, "mcps", -machineCount);
      }
      
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

export const getMachineId = action({
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
      const assignedMachineId: string | null = await ctx.runMutation(api.mcps.mutations.assignMachineToChat, {
        mcpId: args.mcpId,
        chatId: args.chatId as any, // Type assertion for chatId conversion
      });

      if (assignedMachineId) {
        return assignedMachineId;
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
