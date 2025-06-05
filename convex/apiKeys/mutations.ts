import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import * as jose from 'jose';
import { api } from "../_generated/api";

const JWT_PRIVATE_KEY_PEM = process.env.JWT_PRIVATE_KEY;

export const addApiKey = mutation({
  args: {
    name: v.string(),
    key: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    if (!JWT_PRIVATE_KEY_PEM) {
      throw new Error("JWT_PRIVATE_KEY environment variable is not set.");
    }

    let privateKey: jose.KeyLike;
    try {
      privateKey = await jose.importPKCS8(JWT_PRIVATE_KEY_PEM, "RS256");
    } catch (error) {
      console.error("Failed to import JWT private key:", error);
      throw new Error("Invalid JWT_PRIVATE_KEY format or algorithm mismatch.");
    }

    const jwt = await new jose.SignJWT({ name: args.key, iat: Date.now() })
      .setProtectedHeader({ alg: "RS256" })
      .setSubject(userId)
      .setIssuedAt()
      .sign(privateKey);

    const existingApiKey = await ctx.runQuery(api.apiKeys.queries.getFromName, { name: args.name });
    if (existingApiKey) {
      await ctx.db.delete(existingApiKey._id);
    }

    await ctx.db.insert("apiKeys", {
      userId: userId,
      name: args.name,
      key: jwt,
      createdAt: Date.now(),
    });

    return jwt;
  },
});

export const deleteApiKey = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const apiKey = await ctx.runQuery(api.apiKeys.queries.getFromKey, { key: args.key });

    await ctx.db.delete(apiKey._id);
  },
});