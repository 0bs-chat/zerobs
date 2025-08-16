import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import {
  type QueryCtx,
  type MutationCtx,
  type ActionCtx,
} from "../_generated/server.js";
import { getAuthUserId } from "@convex-dev/auth/server";

export async function getDocumentUrl(
  ctx: ActionCtx | MutationCtx,
  key: Doc<"documents">["key"],
) {
  try {
    return await ctx.storage.getUrl(key);
  } catch (error) {
    return key;
  }
}

export async function requireAuth(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError("Unauthorized");
  }
  return { userId };
}
