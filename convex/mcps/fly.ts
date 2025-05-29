"use node";

import axios from "axios";
import type { Id } from "../_generated/dataModel";

// Get Fly.io API token from environment variable
const FLY_API_TOKEN = process.env.FLY_API_TOKEN;
const FLY_APP_NAME = process.env.FLY_APP_NAME || "zerobs-mcp-runner";
const FLY_REGION = process.env.FLY_REGION || "iad";

// Create an axios instance with the Fly.io API base URL and auth
const flyApi = axios.create({
  baseURL: "https://api.fly.io/v1",
  headers: {
    Authorization: `Bearer ${FLY_API_TOKEN}`,
    "Content-Type": "application/json",
  },
});

// Create a new Fly.io machine for an MCP
export async function createMachine(mcpId: Id<"mcps">, command: string, env: Record<string, string> = {}) {
  try {
    const response = await flyApi.post(`/apps/${FLY_APP_NAME}/machines`, {
      config: {
        image: "mantrakp04/mcprunner:latest",
        env: {
          MCP_COMMAND: command,
          ...env,
        },
        services: [
          {
            ports: [
              {
                port: 8000,
                handlers: ["http"],
              }
            ],
            protocol: "tcp",
            internal_port: 8000,
          }
        ],
        metadata: {
          mcpId: mcpId,
        }
      },
      name: mcpId,
      region: FLY_REGION,
    });

    return response.data;
  } catch (error) {
    console.error("Error creating Fly.io machine:", error);
    throw error;
  }
}

// Get a specific machine by ID
export async function getMachine(machineName: string) {
  try {
    const response = await flyApi.get(`/apps/${FLY_APP_NAME}/machines/${machineName}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    console.error("Error getting Fly.io machine:", error);
    throw error;
  }
}

// Start a machine and return its SSE URL
export async function startMachine(machineName: string): Promise<string> {
  try {
    await flyApi.post(`/apps/${FLY_APP_NAME}/machines/${machineName}/start`);
    
    // Wait for the machine to be started
    await flyApi.get(`/apps/${FLY_APP_NAME}/machines/${machineName}/wait`, {
      params: { state: 'started', timeout: 60 }
    });
    
    // Fly.io assigns a public hostname to each machine
    const host = process.env.MCP_RUNNER_HOST || `${FLY_APP_NAME}.fly.dev`;
    return `https://${host}/sse`;
  } catch (error) {
    console.error("Error starting Fly.io machine:", error);
    throw error;
  }
}

// Stop a machine
export async function stopMachine(machineName: string) {
  try {
    await flyApi.post(`/apps/${FLY_APP_NAME}/machines/${machineName}/stop`);
    
    // Wait for the machine to be stopped
    await flyApi.get(`/apps/${FLY_APP_NAME}/machines/${machineName}/wait`, {
      params: { state: 'stopped', timeout: 60 }
    });
  } catch (error) {
    console.error("Error stopping Fly.io machine:", error);
    throw error;
  }
}

// Delete a machine
export async function deleteMachine(machineName: string) {
  try {
    await flyApi.delete(`/apps/${FLY_APP_NAME}/machines/${machineName}`);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return; // Machine already deleted or doesn't exist
    }
    console.error("Error deleting Fly.io machine:", error);
    throw error;
  }
}

// List all machines
export async function listMachines() {
  try {
    const response = await flyApi.get(`/apps/${FLY_APP_NAME}/machines`);
    return response.data;
  } catch (error) {
    console.error("Error listing Fly.io machines:", error);
    throw error;
  }
}

// Stop idle machines
export async function stopIdleMachines() {
  try {
    const machines = await listMachines();
    const idleMachines = machines.filter(
      (machine: any) => machine.state === "started" && machine.metadata?.mcpId
    );
    
    for (const machine of idleMachines) {
      await stopMachine(machine.id);
    }
  } catch (error) {
    console.error("Error stopping idle Fly.io machines:", error);
    throw error;
  }
}