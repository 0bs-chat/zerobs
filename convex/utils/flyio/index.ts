// Helper functions for Fly.io

import { components } from "./types";

const FLY_API_TOKEN = process.env.FLY_API_TOKEN;
const FLY_API_BASE_URL = "https://api.machines.dev/v1";

if (!FLY_API_TOKEN) {
  throw new Error("FLY_API_TOKEN environment variable is not set.");
}

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
  getApp: async (appName: string): Promise<FlyApp | null> => {
    return flyRequest(`/apps/${appName}`, "GET") as Promise<FlyApp | null>;
  },

  createApp: async (params: CreateAppRequest): Promise<FlyApp | null> => {
    await flyRequest(`/apps`, "POST", params);
    if (params.app_name) {
      return fly.getApp(params.app_name);
    }
    return null;
  },

  deleteApp: async (appName: string): Promise<void> => {
    await flyRequest(`/apps/${appName}`, "DELETE");
  },

  listMachines: async (appName: string): Promise<FlyMachine[]> => {
    return (await flyRequest(`/apps/${appName}/machines`, "GET")) as Promise<
      FlyMachine[]
    >;
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
    return flyRequest(
      `/apps/${appName}/machines`,
      "POST",
      params,
    ) as Promise<FlyMachine | null>;
  },

  getMachine: async (
    appName: string,
    machineId: string,
  ): Promise<FlyMachine | null> => {
    return flyRequest(
      `/apps/${appName}/machines/${machineId}`,
      "GET",
    ) as Promise<FlyMachine | null>;
  },

  deleteMachine: async (appName: string, machineId: string) => {
    await flyRequest(`/apps/${appName}/machines/${machineId}`, "DELETE");
  },

  stopMachine: async (appName: string, machineId: string) => {
    await flyRequest(`/apps/${appName}/machines/${machineId}/stop`, "POST", {});
  },

  startMachine: async (appName: string, machineId: string) => {
    await flyRequest(
      `/apps/${appName}/machines/${machineId}/start`,
      "POST",
      {},
    );
  },

  allocateIpAddress: async (appId: string, type: "v4" | "v6" = "v4") => {
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
    return flyGraphqlRequest(mutation, { appId, type });
  },
};
