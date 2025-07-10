import {
  BetterAuth,
  convexAdapter,
  type AuthFunctions,
} from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import { components, internal } from "./_generated/api";
import { query, type GenericCtx } from "./_generated/server";
import type { Id, DataModel } from "./_generated/dataModel";
import { v } from "convex/values";
import { parseArgs } from "util";

// Typesafe way to pass Convex functions defined in this file
const authFunctions: AuthFunctions = internal.auth;

// Initialize the component
export const betterAuthComponent = new BetterAuth(
  components.betterAuth,
  {
    authFunctions,
  }
);

export const createAuth = (ctx: GenericCtx) =>
  // Configure your Better Auth instance here
  betterAuth({
    // All auth requests will be proxied through your TanStack Start server
    baseURL: "http://localhost:5432",
    database: convexAdapter(ctx, betterAuthComponent),

    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectURI: `${process.env.CONVEX_SITE_URL!}/api/auth/callback/google`,
        scope: ["profile", "email"],
        enabled: true,
        accessType: "offline",
      },
    },

    plugins: [
      // The Convex plugin is required
      convex(),
      crossDomain({
        siteUrl: "http://localhost:3000",
      }),
    ],
  });

// These are required named exports
export const {
  createUser,
  updateUser,
  deleteUser,
  createSession,
} =
  betterAuthComponent.createAuthFunctions<DataModel>({
    onCreateUser: async (ctx, _user) => {
      return ctx.db.insert("users", {});
    },

    onDeleteUser: async (ctx, userId) => {
      await ctx.db.delete(userId as Id<"users">);
    },
  });

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userMetadata = await betterAuthComponent.getAuthUser(ctx);
    if (!userMetadata) {
      return null;
    }
    return {
      ...userMetadata,
    };
  },
});

export const getToken = query({
  args: {
    providerId: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await createAuth(ctx);
    const headers = await betterAuthComponent.getHeaders(ctx);
    const token = await auth.api.getAccessToken({
      body: {
        providerId: args.providerId,
      },
      headers,
    });
    return { token: token.accessToken, scopes: token.scopes };
  },
});