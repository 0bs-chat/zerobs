// Helper functions for Fly.io

import type { components } from "./types";

const FLY_API_TOKEN = process.env.FLY_API_TOKEN;
const FLY_API_BASE_URL = "https://api.machines.dev/v1";

type FlyApp = components["schemas"]["App"];
type CreateAppRequest = components["schemas"]["CreateAppRequest"];
type FlyMachine = components["schemas"]["Machine"];
type CreateMachineRequest = components["schemas"]["CreateMachineRequest"];

// Export types needed by other modules
export type { FlyApp, CreateAppRequest, FlyMachine, CreateMachineRequest };

const flyRequest = async (
  path: string,
  method: "GET" | "POST" | "DELETE" | "PUT",
  body?: any,
) => {
  const headers: HeadersInit = {
    Authorization: `Bearer ${FLY_API_TOKEN}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(`${FLY_API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `Fly API Error: ${response.status} ${response.statusText}`,
      errorText,
    );
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Fly API request failed: ${response.status} ${errorText}`);
  }

  if (
    response.status === 204 ||
    response.status === 202 ||
    (response.status === 201 && method === "DELETE")
  ) {
    return null;
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const textContent = await response.text();
    if (textContent) {
      return JSON.parse(textContent);
    } else {
      return null;
    }
  }
  return null;
};

const flyGraphqlRequest = async (
  query: string,
  variables?: Record<string, any>,
) => {
  const headers: HeadersInit = {
    Authorization: `Bearer ${FLY_API_TOKEN}`,
    "Content-Type": "application/json",
  };

  const response = await fetch("https://api.fly.io/graphql", {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `Fly GraphQL API Error: ${response.status} ${response.statusText}`,
      errorText,
    );
    throw new Error(
      `Fly GraphQL API request failed: ${response.status} ${errorText}`,
    );
  }

  const responseData = await response.json();
  if (responseData.errors) {
    console.error("Fly GraphQL API Errors:", responseData.errors);
    throw new Error(
      `GraphQL query failed: ${JSON.stringify(responseData.errors)}`,
    );
  }
  return responseData.data;
};

export const fly = {
  getApp: async (appName: string) => {
    return await flyRequest(`/apps/${appName}`, "GET");
  },

  createApp: async (params: CreateAppRequest): Promise<FlyApp | null> => {
    await flyRequest(`/apps`, "POST", params);
    if (params.app_name) {
      return await fly.getApp(params.app_name);
    }
    return null;
  },

  deleteApp: async (appName: string) => {
    return await flyRequest(`/apps/${appName}`, "DELETE");
  },

  listMachines: async (appName: string) => {
    return (await flyRequest(`/apps/${appName}/machines`, "GET")) as
      | FlyMachine[]
      | null;
  },

  createMachine: async (
    appName: string,
    params: CreateMachineRequest,
  ): Promise<FlyMachine | null> => {
    return await flyRequest(`/apps/${appName}/machines`, "POST", params);
  },

  getMachine: async (
    appName: string,
    machineId: string,
  ): Promise<FlyMachine | null> => {
    return await flyRequest(`/apps/${appName}/machines/${machineId}`, "GET");
  },

  getMachineByName: async (
    appName: string,
    machineName: string,
  ): Promise<FlyMachine | null> => {
    const machines = await fly.listMachines(appName);
    if (!machines) {
      return null;
    }
    return machines.find((m) => m.name === machineName) || null;
  },

  deleteMachine: async (appName: string, machineId: string) => {
    return await flyRequest(`/apps/${appName}/machines/${machineId}`, "DELETE");
  },

  stopMachine: async (appName: string, machineId: string) => {
    return await flyRequest(
      `/apps/${appName}/machines/${machineId}/stop`,
      "POST",
      {},
    );
  },

  startMachine: async (appName: string, machineId: string) => {
    return await flyRequest(
      `/apps/${appName}/machines/${machineId}/start`,
      "POST",
      {},
    );
  },

  allocateIpAddress: async (
    appId: string,
    type: "v4" | "v6" | "shared_v4" = "shared_v4",
  ) => {
    const mutation = `
      mutation AllocateIpAddress($appId: ID!, $type: IPAddressType!) {
        allocateIpAddress(input: {appId: $appId, type: $type, region: "global"}) {
          ipAddress {
            id
            address
            type
            region
            createdAt
          }
        }
      }
    `;
    return await flyGraphqlRequest(mutation, { appId, type });
  },

  scaleMachine: async (appName: string, region: string, count: number) => {
    const mutation = `
      mutation ScaleApp($input: ScaleAppInput!) {
        scaleApp(input: $input) {
          app {
            id
            name
            taskGroupCounts {
              name
              count
            }
          }
          delta {
            region
            fromCount
            toCount
          }
          placement {
            region
            count
          }
        }
      }
    `;

    // Construct the input object according to the GraphQL schema
    const input = {
      appId: appName,
      regions: [
        {
          region: region,
          count: count,
        },
      ],
    };
    return await flyGraphqlRequest(mutation, { input });
  },

  waitTillHealthy: async (
    appName: string,
    machineId: string,
    options: {
      timeout?: number;
      interval?: number;
    } = {},
  ) => {
    const {
      timeout = 300000, // 5 minutes default
      interval = 5000, // 5 seconds default
    } = options;

    const startTime = Date.now();
    const endTime = startTime + timeout;

    // Helper function to determine if a machine is healthy
    const isMachineHealthy = (machine: FlyMachine): boolean => {
      // Machine must be in started state
      if (machine.state !== "started") {
        return false;
      }

      // Host status should be ok
      if (machine.host_status !== "ok") {
        return false;
      }

      // If there are health checks, they must all pass
      if (machine.checks && machine.checks.length > 0) {
        return machine.checks.every(
          (check) => check.status === "passing" || check.status === "success",
        );
      }

      // If no health checks defined, consider machine healthy if it's started and host is ok
      return true;
    };

    while (Date.now() < endTime) {
      try {
        // Get app info to verify it exists
        const app = await fly.getApp(appName);
        if (!app) {
          await new Promise((resolve) => setTimeout(resolve, interval));
          continue;
        }

        // Get the specific machine
        const machine = await fly.getMachine(appName, machineId);
        if (!machine) {
          await new Promise((resolve) => setTimeout(resolve, interval));
          continue;
        }

        // Check if the machine is healthy
        const isHealthy = isMachineHealthy(machine);
        if (isHealthy) {
          return {
            healthy: true,
            machine,
            app,
          };
        }

        // Check if the machine is in a failed state
        if (machine.state === "destroyed" || machine.state === "failed") {
          return {
            healthy: false,
            machine,
            app,
            error: "Machine failed",
          };
        }

        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, interval));
      } catch (error) {
        console.error(`Error checking health for machine ${machineId} in app ${appName}:`, error);
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    }

    // Timeout reached - get final state
    try {
      const app = await fly.getApp(appName);
      const machine = await fly.getMachine(appName, machineId);

      if (machine) {
        const isHealthy = isMachineHealthy(machine);
        return {
          healthy: isHealthy,
          machine,
          app,
          error: "Health check timeout",
        };
      } else {
        return {
          healthy: false,
          machine: null,
          app,
          error: "Machine not found and health check timeout",
        };
      }
    } catch (error) {
      console.error(`Error getting final state for machine ${machineId} in app ${appName}:`, error);
      return {
        healthy: false,
        machine: null,
        app: null,
        error: "Health check timeout and unable to get final state",
      };
    }
  },

  uploadFileToMachine: async (
    appName: string,
    machineId: string,
    files: { name: string; url: string }[],
  ) => {
    // Verify the machine exists
    const machine = await fly.getMachine(appName, machineId);
    if (!machine) {
      throw new Error(`Machine ${machineId} not found in app ${appName}`);
    }

    const machineResults = [];

    for (const file of files) {
      try {
        // Create the /mnt/data directory if it doesn't exist and download the file
        const command = [
          "sh",
          "-c",
          `mkdir -p /mnt/data && curl -L "${file.url}" -o "/mnt/data/${file.name}" && echo "File uploaded successfully to /mnt/data/${file.name}"`,
        ];

        const execResult = await flyRequest(
          `/apps/${appName}/machines/${machineId}/exec`,
          "POST",
          {
            command: command,
            timeout: 60,
          },
        );

        machineResults.push({
          fileName: file.name,
          success: true,
          result: execResult,
        });
      } catch (error) {
        machineResults.push({
          fileName: file.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      machineId,
      files: machineResults,
    };
  },
};
