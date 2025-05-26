import type { Id } from "../_generated/dataModel";
import {
  type QueryCtx,
  type MutationCtx,
  type ActionCtx,
} from "../_generated/server.js";
import { ConvexError } from "convex/values";

export async function requireAuth(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const user = await ctx.auth.getUserIdentity();
  if (!user) {
    throw new ConvexError("Unauthorized");
  }
  const userId = user.subject.split("|")[0] as Id<"users">;
  return { user, userId };
}
