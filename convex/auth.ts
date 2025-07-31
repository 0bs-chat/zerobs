import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { query } from "./_generated/server";
import { requireAuth } from "./utils/helpers";
import type { Id } from "./_generated/dataModel";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
});

export const getUser = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);
    const user = await ctx.db.get(userId as Id<"users">);
    return user;
  },
});
