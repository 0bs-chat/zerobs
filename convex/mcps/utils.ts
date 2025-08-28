import { verifyJwt, createJwt } from "../utils/encryption";
import { MCP_TEMPLATES } from "../../src/components/chat/panels/mcp/templates";
import { makeFunctionReference } from "convex/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { CreateMachineRequest } from "../utils/flyio";
import { fly } from "../utils/flyio";
import { internal } from "../_generated/api";

export async function verifyEnv(
  env: Record<string, string>,
): Promise<Record<string, string>> {
  const envJwts: Record<string, string> = {};

  await Promise.all(
    Object.entries(env).map(async ([key, value]) => {
      try {
        if (
          value &&
          typeof value === "string" &&
          value.split(".").length === 3
        ) {
          const { value: decryptedValue } = await verifyJwt(value);
          envJwts[key] = decryptedValue;
        } else {
          envJwts[key] = value;
        }
      } catch (error) {
        console.warn(`Failed to verify JWT for env var ${key}:`, error);
        envJwts[key] = value;
      }
    }),
  );

  return envJwts;
}

export async function executeFunctionByReference(
  ctx: ActionCtx | MutationCtx | QueryCtx,
  funcString: string,
  args: any,
  type: "action" | "mutation" | "query",
): Promise<Record<string, string>> {
  const functionParts = funcString.split(".");
  if (functionParts.length >= 4 && functionParts[0] === "internal") {
    const moduleName = functionParts[1];
    const actionName = functionParts[2];
    const functionName = functionParts[3];

    const functionRefString = `${moduleName}/${actionName}:${functionName}`;

    if (type === "action") {
      const functionRef = makeFunctionReference<"action">(functionRefString);
      return await (ctx as ActionCtx).runAction(functionRef, args);
    } else if (type === "mutation") {
      const functionRef = makeFunctionReference<"mutation">(functionRefString);
      return await (ctx as ActionCtx | MutationCtx).runMutation(
        functionRef,
        args,
      );
    } else if (type === "query") {
      const functionRef = makeFunctionReference<"query">(functionRefString);
      return await (ctx as ActionCtx | MutationCtx | QueryCtx).runQuery(
        functionRef,
        args,
      );
    }
  }
  return {};
}

export async function resolveConfigurableEnvs(
  ctx: ActionCtx | MutationCtx | QueryCtx,
  mcp: Doc<"mcps">,
): Promise<Record<string, string>> {
  let configurableEnvValues: Record<string, string> = {};

  if (mcp.template) {
    const matchingTemplate = MCP_TEMPLATES.find(
      (t) => t.template === mcp.template,
    );
    if (matchingTemplate && matchingTemplate.configurableEnvs) {
      for (const envConfig of matchingTemplate.configurableEnvs) {
        try {
          const result = await executeFunctionByReference(
            ctx,
            envConfig.func,
            envConfig.args,
            envConfig.type,
          );
          configurableEnvValues = { ...configurableEnvValues, ...result };
        } catch (error) {
          console.error(
            `Failed to resolve configurable env ${envConfig.func}:`,
            error,
          );
        }
      }
    }
  }

  return configurableEnvValues;
}

export async function validateMcpForDeployment(mcp: Doc<"mcps">): Promise<void> {
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
}

export async function validateMcpForRestart(mcp: Doc<"mcps">): Promise<void> {
  if (!["docker", "stdio"].includes(mcp.type)) {
    throw new Error("MCP is not a docker or stdio type");
  }
  if (!mcp.url) {
    throw new Error("MCP URL is not defined");
  }
  if (mcp.status === "creating") {
    throw new Error("MCP is still creating");
  }
}

export async function getOrCreateFlyApp(appName: string): Promise<any> {
  let app = await fly.getApp(appName);
  if (!app) {
    app = await fly.createApp({
      app_name: appName,
      org_slug: "personal",
    });
    if (app) {
      await fly.allocateIpAddress(app.name!, "shared_v4");
    }
  }
  return app;
}

export async function ensureMachineHealthy(
  appName: string,
  machineId: string,
  timeout: number = 120000,
): Promise<void> {
  const result = await fly.waitTillHealthy(appName, {
    timeout,
    interval: 1000,
  });

  if (!result.healthy) {
    throw new Error(`Machine ${machineId} failed to become healthy: ${result.error || 'Unknown error'}`);
  }
}

export async function restartAllMachines(appName: string): Promise<void> {
  const machines = await fly.listMachines(appName);

  if (machines && machines.length > 0) {
    const machinesWithId = machines.filter((machine) => machine.id);

    // Stop machines
    await Promise.all(
      machinesWithId.map((machine) =>
        fly.stopMachine(appName, machine.id!),
      ),
    );

    // Wait for machines to stop
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const updatedMachines = await fly.listMachines(appName);
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
        fly.startMachine(appName, machine.id!),
      ),
    );
  }
}

export async function createMcpAuthToken(
  mcp: Doc<"mcps">,
  machineId: string,
): Promise<string> {
  let authToken = null;
  if (mcp.template) {
    const matchingTemplate = MCP_TEMPLATES.find(
      (t) => t.template === mcp.template,
    );
    if (matchingTemplate && matchingTemplate.customAuthTokenFromEnv) {
      authToken = mcp.env[matchingTemplate.customAuthTokenFromEnv];
    }
  }

  return authToken ||
    (await createJwt(
      "OAUTH_TOKEN",
      mcp._id,
      mcp.userId,
      true,
    ));
}

export async function handleMcpActionError(
  ctx: ActionCtx | MutationCtx,
  mcpId: Id<"mcps">,
  error: any,
  action: string,
): Promise<void> {
  console.error(`Error in MCP ${action}:`, error);
  await ctx.runMutation(internal.mcps.crud.update, {
    id: mcpId,
    patch: { status: "error" },
  });
}

export async function createMachineConfig(
  mcp: Doc<"mcps">,
  appName: string,
  configurableEnvValues: Record<string, string> = {},
  machineName: string,
): Promise<CreateMachineRequest> {
  const verifiedEnv = await verifyEnv(mcp.env);

  return {
    name: machineName,
    region: "sea",
    config: {
      image: mcp.dockerImage || "registry.fly.io/floral-brook-444:v1",
      env: {
        ...verifiedEnv,
        ...configurableEnvValues,
        MCP_COMMAND: mcp.command || "",
        HOST: "https://" + appName + ".fly.dev",
        OAUTH_TOKEN: await createJwt("OAUTH_TOKEN", mcp._id, mcp.userId, true),
      },
      guest: { cpus: 2, memory_mb: 2048, cpu_kind: "shared" },
      services: [
        {
          ports: [{ port: 443, handlers: ["tls", "http"] }],
          protocol: "tcp",
          internal_port: mcp.dockerPort || 8000,
          autostart: true,
          autostop: "suspend" as const,
          min_machines_running: 0,
          checks: [
            {
              type: "tcp",
            },
          ],
        },
      ],
    },
  };
}
