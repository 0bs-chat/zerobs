import type { Doc } from "../_generated/dataModel";
import {
  type QueryCtx,
  type MutationCtx,
  type ActionCtx,
  query,
  mutation,
  action,
  internalAction,
} from "../_generated/server.js";
import { ConvexError } from "convex/values";
import {
  zCustomAction,
  zCustomMutation,
  zCustomQuery,
} from "convex-helpers/server/zod";
import { NoOp } from "convex-helpers/server/customFunctions";
import type { Id } from "../_generated/dataModel";

export async function requireAuth(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const user = await ctx.auth.getUserIdentity();
  if (!user) {
    throw new ConvexError("Unauthorized");
  }
  const userId = user.subject as Id<"users">;
  return { userId, user };
}

export const zodQuery = zCustomQuery(query, NoOp);
export const zodMutation = zCustomMutation(mutation, NoOp);
export const zodAction = zCustomAction(action, NoOp);
export const zodInternalAction = zCustomAction(internalAction, NoOp);

export async function getUrl(
  ctx: ActionCtx | MutationCtx,
  key: Doc<"documents">["key"],
) {
  try {
    return await ctx.storage.getUrl(key);
  } catch (error) {
    return key;
  }
}
