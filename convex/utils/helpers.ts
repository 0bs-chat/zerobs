import type { Doc, Id } from "../_generated/dataModel";
import {
  type QueryCtx,
  type MutationCtx,
  type ActionCtx,
} from "../_generated/server.js";

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

export const requireAuth = async (ctx: ActionCtx | MutationCtx | QueryCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error('Unauthenticated call to function requiring authentication');
  }
  return { userId: identity.subject };
};