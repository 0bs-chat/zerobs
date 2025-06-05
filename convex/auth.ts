import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import Slack from "@auth/core/providers/slack";
import { query } from "./_generated/server";
import { v } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Anonymous,
    ...(process.env.AUTH_GITHUB_SECRET && process.env.AUTH_GITHUB_ID
      ? [GitHub]
      : []),
    ...(process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_GOOGLE_ID
      ? [Google]
      : []),
    ...(process.env.AUTH_SLACK_SECRET && process.env.AUTH_SLACK_ID
      ? [Slack]
      : []),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, args) {
      // Create a new chat for the user
      await ctx.db.insert("chatInput", {
        chatId: "new",
        userId: args.userId,
        agentMode: false,
        plannerMode: false,
        webSearch: false,
        updatedAt: Date.now(),
      });
    },
  },
});

export const isProviderEnabled = query({
  args: {
    provider: v.union(
      v.literal("github"),
      v.literal("google"),
      v.literal("slack"),
    ),
  },
  handler: async (_, args) => {
    if (args.provider === "github") {
      return process.env.AUTH_GITHUB_SECRET && process.env.AUTH_GITHUB_ID;
    }
    if (args.provider === "google") {
      return process.env.AUTH_GOOGLE_SECRET && process.env.AUTH_GOOGLE_ID;
    }
    if (args.provider === "slack") {
      return process.env.AUTH_SLACK_SECRET && process.env.AUTH_SLACK_ID;
    }
    return false;
  },
});
