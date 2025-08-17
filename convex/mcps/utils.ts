import { verifyJwt, createJwt } from "../utils/encryption";
import { MCP_TEMPLATES } from "../../src/components/chat/panels/mcp/templates";
import { makeFunctionReference } from "convex/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import type { CreateMachineRequest } from "../utils/flyio";

export async function verifyEnv(
  env: Record<string, string>,
): Promise<Record<string, string>> {
  const envJwts: Record<string, string> = {};
  await Promise.all(
    Object.entries(env).map(async ([key, value]) => {
      const { value: decryptedValue } = await verifyJwt(value);
      envJwts[key] = decryptedValue;
    }),
  );
  return envJwts;
}

export async function executeFunctionByReference(
  ctx: ActionCtx | MutationCtx | QueryCtx,
  funcString: string,
  args: any,
  type: "action" | "mutation" | "query"
): Promise<Record<string, string>> {
  const functionParts = funcString.split('.');
  if (functionParts.length >= 4 && functionParts[0] === 'internal') {
    const moduleName = functionParts[1];
    const actionName = functionParts[2];  
    const functionName = functionParts[3];
    
    const functionRefString = `${moduleName}/${actionName}:${functionName}`;
    
    if (type === "action") {
      const functionRef = makeFunctionReference<"action">(functionRefString);
      return await (ctx as ActionCtx).runAction(functionRef, args);
    } else if (type === "mutation") {
      const functionRef = makeFunctionReference<"mutation">(functionRefString);
      return await (ctx as ActionCtx | MutationCtx).runMutation(functionRef, args);
    } else if (type === "query") {
      const functionRef = makeFunctionReference<"query">(functionRefString);
      return await (ctx as ActionCtx | MutationCtx | QueryCtx).runQuery(functionRef, args);
    }
  }
  return {};
}

export async function resolveConfigurableEnvs(
  ctx: ActionCtx | MutationCtx | QueryCtx,
  mcp: Doc<"mcps">
): Promise<Record<string, string>> {
  let configurableEnvValues: Record<string, string> = {};
  
  if (mcp.template) {
    const matchingTemplate = MCP_TEMPLATES.find(t => t.template === mcp.template);
    if (matchingTemplate && matchingTemplate.configurableEnvs) {
      for (const envConfig of matchingTemplate.configurableEnvs) {
        try {
          const result = await executeFunctionByReference(
            ctx,
            envConfig.func,
            envConfig.args,
            envConfig.type
          );
          configurableEnvValues = { ...configurableEnvValues, ...result };
        } catch (error) {
          console.error(`Failed to resolve configurable env ${envConfig.func}:`, error);
        }
      }
    }
  }
  
  return configurableEnvValues;
}

export async function createMachineConfig(
  mcp: Doc<"mcps">,
  appName: string,
  configurableEnvValues: Record<string, string> = {}
): Promise<CreateMachineRequest> {
  return {
    name: `${appName}-machine`,
    region: "sea",
    config: {
      image: mcp.dockerImage || "mantrakp04/mcprunner:v2",
      env: {
        ...(await verifyEnv(mcp.env!)),
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
}
