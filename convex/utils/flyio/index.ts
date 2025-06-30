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
    const existingMachines = await fly.listMachines(appName);
    if (existingMachines && existingMachines.length > 0) {
      console.warn(
        `App ${appName} already has ${existingMachines.length} machine(s). Returning the first one.`,
      );
      return existingMachines[0];
    }
    return await flyRequest(`/apps/${appName}/machines`, "POST", params);
  },

  getMachine: async (
    appName: string,
    machineId: string,
  ): Promise<FlyMachine | null> => {
    return await flyRequest(`/apps/${appName}/machines/${machineId}`, "GET");
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

  uploadFileToAllMachines: async (
    appName: string,
    files: { name: string; url: string }[],
  ) => {
    const machines = await fly.listMachines(appName);
    if (!machines || machines.length === 0) {
      throw new Error(`No machines found for app ${appName}`);
    }

    const results = [];

    for (const machine of machines) {
      if (!machine.id) {
        console.warn(`Skipping machine without ID`);
        continue;
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
            `/apps/${appName}/machines/${machine.id}/exec`,
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
          console.error(
            `Failed to upload ${file.name} to machine ${machine.id}:`,
            error,
          );
          machineResults.push({
            fileName: file.name,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      results.push({
        machineId: machine.id,
        files: machineResults,
      });
    }

    return results;
  },
};
