import { v } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { query, QueryCtx, internalQuery } from "../_generated/server";
import { requireAuth } from "../utils/helpers";
import * as jose from "jose";

const JWKS_URI = process.env.JWKS;

async function verifyApiKey(ctx: QueryCtx, apiKeyDoc: Doc<"apiKeys">) {
  const { userId } = await requireAuth(ctx);

  if (apiKeyDoc.userId !== userId) {
    throw new Error("Unauthorized");
  }

  if (!JWKS_URI) {
    throw new Error("JWKS_URI environment variable is not set.");
  }

  const jwksJson = JSON.parse(JWKS_URI);
  const jwks = jose.createLocalJWKSet(jwksJson);

  const { payload } = await jose.jwtVerify(apiKeyDoc.key, jwks, {
    algorithms: ["RS256"],
  });

  if (typeof payload.sub !== "string" || typeof payload.name !== "string") {
    throw new Error("Invalid API key");
  }

  return {
    ...apiKeyDoc,
    key: payload.name,
  };
}

export const getFromName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const apiKeyDoc = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_name", (q) =>
        q.eq("userId", userId).eq("name", args.name),
      )
      .first();

    if (!apiKeyDoc) {
      return null;
    }

    return await verifyApiKey(ctx, apiKeyDoc);
  },
});

export const getPublicFromName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKeyDoc = await ctx.db
      .query("apiKeys")
      .withIndex("by_name", (q) =>
        q.eq("name", args.name),
      )
      .first();

    if (!apiKeyDoc || apiKeyDoc.userId) {
      return null;
    }

    return await verifyApiKey(ctx, apiKeyDoc);
  },
});

export const getFromKey = internalQuery({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const apiKeyDoc = await ctx.db
      .query("apiKeys")
      .withIndex("by_key_user", (q) =>
        q.eq("key", args.key).eq("userId", userId),
      )
      .first();

    if (!apiKeyDoc) {
      throw new Error("API key not found");
    }

    return await verifyApiKey(ctx, apiKeyDoc);
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx, _args) => {
    const { userId } = await requireAuth(ctx);

    if (!JWKS_URI) {
      throw new Error("JWKS environment variable is not set.");
    }

    const userApiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_name", (q) => q.eq("userId", userId))
      .collect();

    return await Promise.all(
      userApiKeys.map((apiKeyDoc) => verifyApiKey(ctx, apiKeyDoc)),
    );
  },
});
