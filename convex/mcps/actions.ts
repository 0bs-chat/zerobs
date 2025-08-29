"use node";

import { api, internal } from "../_generated/api";
import { internalAction, action } from "../_generated/server";
import { v } from "convex/values";
import { fly } from "../utils/flyio";
import type { FlyApp } from "../utils/flyio";
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
      await fly.createMachine(appName, machineConfig);
      await ensureMachineHealthy(appName, "machine");

      await ctx.runMutation(internal.mcps.crud.update, {
        id: args.mcpId,
        patch: { url: sseUrl, status: "created" },
      });
    } catch (error) {
      await handleMcpActionError(ctx, args.mcpId, error, "create");
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
      await handleMcpActionError(ctx, args.mcpId, error, "restart");
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
  handler: async (ctx, args) => {
    const mcp = await ctx.runQuery(api.mcps.queries.get, {
      mcpId: args.mcpId,
    });
    if (mcp.perChat) {
      const machine = await fly.getMachineByName(args.mcpId, args.chatId);
      return machine?.id;
    } else {
      throw new Error("MCP is not per chat");
    }
  },
});
