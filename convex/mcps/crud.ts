import { crud } from "convex-helpers/server/crud";
import schema from "../schema";

export const { create, read, update, destroy } = crud(schema, "mcps");

export const {
  create: createMcpApp,
  read: readMcpApp,
  update: updateMcpApp,
  destroy: destroyMcpApp,
} = crud(schema, "mcpApps");
