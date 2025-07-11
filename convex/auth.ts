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
import { polar, checkout, portal, usage, webhooks } from "@polar-sh/better-auth";
import { Polar } from "@polar-sh/sdk";

const polarClient = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN
});
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
    baseURL: "http://localhost:3001",
    database: convexAdapter(ctx, betterAuthComponent),

    // Simple non-verified email/password to get started
    socialProviders: {
      google: {
        enabled: true,
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectURI: `${process.env.CONVEX_SITE_URL}/api/auth/callback/google`,
        accessType: "offline",
      },
    },
    plugins: [
      crossDomain({ siteUrl: "http://localhost:3000" }),
      convex(),
      polar({
        client: polarClient,
        createCustomerOnSignUp: true,
        use: [
          checkout({
            products: [
              {
                productId: "36f31c4e-fcf4-46be-9565-017f1bf872b0",
                slug: "zerobs"
              }
            ],
            successUrl: `${process.env.CONVEX_SITE_URL}/checkout/success`,
            authenticatedUsersOnly: true
          })
      ],
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
    // Must create a user and return the user id
    onCreateUser: async (ctx, user) => {
      return ctx.db.insert("users", {});
    },

    // Delete the user when they are deleted from Better Auth
    onDeleteUser: async (ctx, userId) => {
      await ctx.db.delete(userId as Id<"users">);
    },
  });

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    // Get user data from Better Auth - email, name, image, etc.
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
    const auth = createAuth(ctx);
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