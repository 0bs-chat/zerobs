"use node";

import { MultiServerMCPClient, type Connection } from "@langchain/mcp-adapters";
import { fly } from "../../utils/flyio";
import type { FlyApp, CreateMachineRequest } from "../../utils/flyio";
import { type ExtendedRunnableConfig } from "../helpers";
import type { GraphState } from "../state";
import type { FlyMachine } from "../../utils/flyio";

export const getVibzTools = async (
  _state: typeof GraphState.State,
  config: ExtendedRunnableConfig
) => {
  const mcpName = `${config.chat._id.slice(0, 58)}`;
  const image = "mantrakp04/vibz:latest";
  const ports = ["8000", "8080", "3000", "6791", "3210", "3211"];

  // Get or Create fly.io machine
  let app: FlyApp | null = null;
  let machine: FlyMachine | null = null;
  
  try {
    app = await fly.getApp(mcpName);
    
    if (app) {
      const machines = await fly.listMachines(mcpName);
      if (machines && machines.length > 0) {
        machine = machines[0];
        console.log(`Using existing machine ${machine.id} for ${mcpName}`);
      }
    }
    
    // If no app or no machines, create them
    if (!app) {
      console.log(`Creating new app ${mcpName}`);
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
      console.log(`Creating new machine for ${mcpName}`);
      
      const machineConfig: CreateMachineRequest = {
        name: `${mcpName}-machine`,
        region: "sea",
        config: {
          image: image,
          env: {
            HOST: `https://${mcpName}.fly.dev`,
            PORTS: ports.join(","),
          },
          guest: { cpus: 4, memory_mb: 4096, cpu_kind: "shared" },
          services: [
            ...ports.map((port) => ({
              ports: [{ port: parseInt(port), handlers: ["http", "tls"] }],
              internal_port: parseInt(port),
              autostart: true,
              autostop: "suspend" as const,
              min_machines_running: 0,
            })),
          ],
        },
      };
      
      machine = await fly.createMachine(mcpName, machineConfig);
      
      if (!machine) {
        throw new Error(`Failed to create machine for ${mcpName}`);
      }
    }
    
    // Create MCP client connection
    const sseUrl = `https://${mcpName}.fly.dev:8000/sse`;
    const mcpServers: Record<string, Connection> = Object.fromEntries([
      [
        mcpName,
        {
          transport: "http",
          url: sseUrl,
          headers: {},
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
    
    return tools;
  } catch (error) {
    throw error;
  }
};
