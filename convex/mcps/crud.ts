import { crud } from "convex-helpers/server/crud";
import schema from "../schema";

export const { create, read, update, destroy } = crud(schema, "mcps");

export const { create: createPerChatMcp, read: readPerChatMcp, update: updatePerChatMcp, destroy: destroyPerChatMcp } = crud(schema, "perChatMcps");
