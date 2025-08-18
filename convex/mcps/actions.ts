"use node";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { fly } from "../utils/flyio";
import type { FlyApp } from "../utils/flyio";
import { resolveConfigurableEnvs, createMachineConfig } from "./utils";

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

      // Process configurableEnvs if template is specified
      const configurableEnvValues = await resolveConfigurableEnvs(ctx, mcp);
      const machineConfig = await createMachineConfig(
        mcp,
        appName,
        configurableEnvValues,
        "machine",
      );

      const app = await fly.createApp({
        app_name: appName,
        org_slug: "personal",
      });

      await fly.allocateIpAddress(app?.name!, "shared_v4");
      await fly.createMachine(appName, machineConfig);
      await fly.waitTillHealthy(appName, {
        timeout: 120000,
        interval: 500,
      });

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
