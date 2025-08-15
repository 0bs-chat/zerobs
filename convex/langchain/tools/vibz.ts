"use node";

import { MultiServerMCPClient, type Connection } from "@langchain/mcp-adapters";
import { fly } from "../../utils/flyio";
import type { FlyApp, CreateMachineRequest } from "../../utils/flyio";
import { type ExtendedRunnableConfig } from "../helpers";
import type { FlyMachine } from "../../utils/flyio";
import { internal } from "../../_generated/api";
import { createJwt } from "../../utils/encryption";

export const getVibzTools = async (
  config: ExtendedRunnableConfig
) => {
  const mcpName = `${config.chat._id}-vibz`;

  // Get CONVEX_ACCESS_TOKEN from environment variables
  const CONVEX_ACCESS_TOKEN = (await config.ctx.runQuery(internal.apiKeys.queries.getFromKey, {
    key: "CONVEX_ACCESS_TOKEN",
  }))?.value ?? process.env.CONVEX_ACCESS_TOKEN;
  if (!CONVEX_ACCESS_TOKEN) {
    throw new Error("CONVEX_ACCESS_TOKEN is not set");
  }

  // Get or Create fly.io machine
  let app: FlyApp | null = null;
  let machine: FlyMachine | null = null;
  
  try {
    app = await fly.getApp(mcpName);
    
    if (app) {
      const machines = await fly.listMachines(mcpName);
      if (machines && machines.length > 0) {
        machine = machines[0];
      }
    }
    
    // If no app or no machines, create them
    if (!app) {
      app = await fly.createApp({
        app_name: mcpName,
        org_slug: "personal",
      });
      
      if (!app) {
        throw new Error(`Failed to create app ${mcpName}`);
      }
      
      // Allocate IP address
      await fly.allocateIpAddress(app.name!, "shared_v4");
    }
    
    // If no machine exists, create one
    if (!machine) {
      const tokenDetails = await (await fetch(
        "https://api.convex.dev/v1/token_details",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${CONVEX_ACCESS_TOKEN}`
          },
        }
      )).json();
      const teamId = tokenDetails.teamId;
      
      const projectRes = await (await fetch(
        `https://api.convex.dev/v1/teams/${teamId}/create_project`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${CONVEX_ACCESS_TOKEN}`
          },
          body: JSON.stringify({
            "deploymentType": "dev",
            "projectName": "vibz-mcp-server"
          })
        }
      )).json();
      const devDeploymentName = projectRes.deploymentName;

      const deployKeyRes = await (await fetch(
        `https://api.convex.dev/v1/deployments/${devDeploymentName}/create_deploy_key`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${CONVEX_ACCESS_TOKEN}`
          },
          body: JSON.stringify({
            "name": "vibz-mcp-server"
          })
        }
      )).json();
      const machineConfig: CreateMachineRequest = {
        name: `${mcpName}-machine`,
        region: "sea",
        config: {
          image: "mantrakp04/vibz@sha256:89bd9acfc226f5254aa2d5117baf18f511117334342752119867c7cc0bbec7ad",
          env: {
            HOST: `https://${mcpName}.fly.dev`,
            CONVEX_DEPLOY_KEY: deployKeyRes.deployKey,
            OAUTH_TOKEN: await createJwt("OAUTH_TOKEN", mcpName, config.chat._id),
          },
          guest: { cpus: 2, memory_mb: 2048, cpu_kind: "shared" },
          services: [
            {
              ports: [{ port: 443, handlers: ["tls", "http"] }],
              protocol: "tcp",
              internal_port: 80,
              autostart: true,
              autostop: "suspend",
              min_machines_running: 0,
              checks: [
                {
                  type: "tcp"
                }
              ]
            },
          ],
        },
      };
      
      machine = await fly.createMachine(mcpName, machineConfig);
      await fly.startMachine(mcpName, machine?.id!);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (!machine) {
        throw new Error(`Failed to create machine for ${mcpName}`);
      }
    }
    
    // Create MCP client connection
    const sseUrl = `https://${mcpName}.fly.dev/8000/mcp`;
    const mcpServers: Record<string, Connection> = Object.fromEntries([
      [
        mcpName,
        {
          transport: "http",
          url: sseUrl,
          headers: {
            Authorization: `Bearer ${await createJwt("OAUTH_TOKEN", mcpName, config.chat._id)}`,
          },
          useNodeEventSource: true,
          reconnect: {
            enabled: true,
            maxAttempts: 30,
            delayMs: 200,
          },
        },
      ],
    ]);
    
    // Initialize the MultiServerMCPClient
    const client = new MultiServerMCPClient({
      throwOnLoadError: true,
      prefixToolNameWithServerName: true,
      additionalToolNamePrefix: "vibz",
      mcpServers,
    });
    
    const tools = await client.getTools();
    const vibzClient = await client.getClient(mcpName);
    const diffPrompt = await vibzClient?.getPrompt({ name: "diff_prompt" });

    const vibzTools = tools.map(tool => {
      if (tool.name.includes("code_project")) {
        tool.description = diffPrompt?.messages[0].content.text + tool.description;
      }
      return tool;
    });

    return vibzTools;
  } catch (error) {
    throw error;
  }
};
