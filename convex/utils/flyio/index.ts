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
      return null; // For GET requests where not found is a valid case
    }
    throw new Error(
      `Fly API request failed: ${response.status} ${errorText}`,
    );
  }

  if (response.status === 204 || response.status === 202 || response.status === 201 && method === "DELETE") { // No content for DELETE or some POST/PUT
    return null;
  }
  
  // Handle cases where 201 might return content (like app creation, though API spec says no content)
  // or where 200 might return empty if that's valid for a specific endpoint.
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    // Check if there's content to parse
    const textContent = await response.text();
    if (textContent) {
        try {
            return JSON.parse(textContent);
        } catch (e) {
            console.error("Failed to parse JSON response:", textContent);
            throw new Error("Failed to parse JSON response from Fly API.");
        }
    } else {
        return null; // No content but application/json header
    }
  }
  return null; // Default for non-JSON or truly empty responses
};

export const fly = {
  getApp: async (appName: string): Promise<FlyApp | null> => {
    return flyRequest(`/apps/${appName}`, "GET") as Promise<FlyApp | null>;
  },

  createApp: async (
    params: CreateAppRequest,
  ): Promise<FlyApp | null> => { // Fly API for app creation might return 201 with no body
    // The openapi spec indicates 201 with no content.
    // However, let's assume we want to GET the app after creation to confirm.
    await flyRequest(`/apps`, "POST", params);
    // Attempt to get the app after creation to return its details.
    // This assumes app_name is present and correct in params.
    if (params.app_name) {
        return fly.getApp(params.app_name);
    }
    return null;
  },

  deleteApp: async (appName: string): Promise<void> => {
    await flyRequest(`/apps/${appName}`, "DELETE");
  },

  listMachines: async (appName: string): Promise<FlyMachine[]> => {
    return (await flyRequest(
      `/apps/${appName}/machines`,
      "GET",
    )) as Promise<FlyMachine[]>;
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
  
  getMachine: async (appName: string, machineId: string): Promise<FlyMachine | null> => {
    return flyRequest(
        `/apps/${appName}/machines/${machineId}`,
        "GET"
    ) as Promise<FlyMachine | null>;
  },

  deleteMachine: async (
    appName: string,
    machineId: string,
  ): Promise<void> => {
    await flyRequest(`/apps/${appName}/machines/${machineId}`, "DELETE");
  },

  stopMachine: async ( appName: string, machineId: string): Promise<void> => {
    await flyRequest(`/apps/${appName}/machines/${machineId}/stop`, "POST", {});
  },

  startMachine: async ( appName: string, machineId: string): Promise<void> => {
    await flyRequest(`/apps/${appName}/machines/${machineId}/start`, "POST", {});
  }
};

// async function main() {
//   try {
//     // const newApp = await fly.createApp({ app_name: "my-test-app-123", org_slug: "personal" });
//     // console.log("Created app:", newApp);

//     const app = await fly.getApp("my-test-app-123");
//     console.log("Got app:", app);

//     if (app && app.name) {
//         // const newMachine = await fly.createMachine(app.name, {
//         //   name: "my-test-machine",
//         //   region: "iad",
//         //   config: {
//         //     image: "nginx",
//         //     guest: { cpus: 1, memory_mb: 256, cpu_kind: "shared" },
//         //     services: [
//         //         {
//         //             ports: [{ port: 80, handlers: ["http"] }],
//         //             protocol: "tcp",
//         //             internal_port: 80,
//         //         }
//         //     ]
//         //   },
//         // });
//         // console.log("Created machine:", newMachine);
        
//         const machines = await fly.listMachines(app.name);
//         console.log("Machines:", machines);

//         if (machines && machines.length > 0 && machines[0].id) {
//             // await fly.stopMachine(app.name, machines[0].id);
//             // console.log("Stopped machine");
//             // await new Promise(resolve => setTimeout(resolve, 5000)); // wait for stop
//             // await fly.startMachine(app.name, machines[0].id);
//             // console.log("Started machine");

//             // await fly.deleteMachine(app.name, machines[0].id);
//             // console.log("Deleted machine");
//         }
//         // await fly.deleteApp(app.name);
//         // console.log("Deleted app");
//     }
//   } catch (error) {
//     console.error("Error in example usage:", error);
//   }
// }

// main();