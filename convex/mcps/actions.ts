"use node";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { fly } from "../utils/flyio";
import {
  resolveConfigurableEnvs,
  createMachineConfig,
  validateMcpForDeployment,
  getOrCreateFlyApp,
} from "./utils";
import { executeWithBilling } from "../autumn";
import { McpApps } from "../schema";

export const create = internalAction({
  args: {
    mcpId: v.id("mcps"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const mcp = await ctx.runQuery(internal.mcps.queries.getInternal, {
      mcpId: args.mcpId,
      includeApps: true,
      userId: args.userId,
    });
    if (!mcp) {
      throw new Error("MCP not found");
    }

    await validateMcpForDeployment(mcp);

    const pendingApps =
      mcp.apps?.filter((app) => app.status === "pending") || [];

    const configurableEnvValues = await resolveConfigurableEnvs(ctx, mcp);

    // Use bill-first logic for each app
    await Promise.all(
      pendingApps.map(async (app) => {
        await executeWithBilling(
          args.userId,
          "mcps",
          1, // Bill for 1 MCP
          async () => {
            await ctx.runMutation(internal.mcps.crud.updateMcpApp, {
              id: app._id,
              patch: {
                status: "creating",
              },
            });
            const machineConfig = await createMachineConfig(
              mcp,
              String(app._id),
              configurableEnvValues,
              `machine`,
            );
            const appName = String(app._id);
            await getOrCreateFlyApp(appName);
            const machine = await fly.createMachine(appName, machineConfig);
            try {
              await fly.startMachine(appName, machine?.id || "");
            } catch (error) {}
            await fly.waitTillHealthy(appName, machine?.id || "", {
              timeout: 120000,
              interval: 1000,
            });
            await ctx.runMutation(internal.mcps.crud.updateMcpApp, {
              id: app._id,
              patch: {
                status: "created",
                url: `https://${appName}.fly.dev/mcp`,
              },
            });
          },
        );
      }) || [],
    );
  },
});

export const remove = internalAction({
  args: {
    mcpApps: v.array(McpApps.doc),
    userId: v.string(),
  },
  handler: async (_ctx, args) => {
    await Promise.all(
      args.mcpApps.map(async (mcpApp) => {
        await executeWithBilling(
          args.userId,
          "mcps",
          -1, // Deduct for 1 MCP removal
          async () => {
            await fly.deleteApp(String(mcpApp._id));
          },
        );
      }) || [],
    );
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
