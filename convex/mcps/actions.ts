"use node";

import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { docker } from "./utils";

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

    const containers = await docker.listContainers({ all: true });
    const container = containers.find((c) =>
      c.Names.some((name) => name === `/${mcp._id}` || name === mcp._id)
    );

    const host = process.env.MCP_RUNNER_HOST || "host.docker.internal";
    let sseUrl = mcp.url;
    if (container && container.State === "running") {
      sseUrl = `http://${host}:${container.Ports.find((p) => p.PublicPort === 8000)?.PublicPort}/sse`;
    }

    if (!sseUrl) {
      const newContainer = await docker.createContainer({
        name: mcp._id,
        Image: "mantrakp04/mcprunner:latest",
        Env: [
          `MCP_COMMAND=${mcp.command}`,
          ...(mcp.env
            ? Object.entries(mcp.env).map(([key, value]) => `${key}=${value}`)
            : []),
        ],
        HostConfig: {
          PortBindings: {
            "8000/tcp": [{}],
          },
          PublishAllPorts: true,
        },
      });
      await newContainer.start();
      const ci = await newContainer.inspect();
      sseUrl = `http://${host}:${ci.HostConfig.PortBindings["8000/tcp"][0].HostPort}/sse`;
    }

    await ctx.runMutation(internal.mcps.crud.update, {
      id: args.mcpId,
      patch: { url: sseUrl, status: "running" },
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

    const containers = await docker.listContainers({ all: true });
    const container = containers.find((c) =>
      c.Names.some((name) => name === `/${mcp._id}` || name === mcp._id)
    );
    if (container) {
      await docker.getContainer(container.Id).stop();
      await docker.getContainer(container.Id).remove();
    }

    await ctx.runMutation(internal.mcps.crud.update, {
      id: args.mcpId,
      patch: { status: "stopped" },
    });
  },
});
