import type { Id } from "../_generated/dataModel";
import {
  type QueryCtx,
  type MutationCtx,
  type ActionCtx,
  query,
} from "../_generated/server.js";
import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export async function requireAuth(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const user = await ctx.auth.getUserIdentity();
  if (!user) {
    throw new ConvexError("Unauthorized");
  }
  const userId = user.subject.split("|")[0] as Id<"users">;
  return { user, userId };
}

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});