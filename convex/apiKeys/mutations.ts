import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import * as jose from "jose";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";

const JWT_PRIVATE_KEY_PEM = process.env.JWT_PRIVATE_KEY;

async function createJwt(userId: Id<"users"> | null, name: string) {
  if (!JWT_PRIVATE_KEY_PEM) {
    throw new Error("JWT_PRIVATE_KEY environment variable is not set.");
  }

  const privateKey = await jose.importPKCS8(JWT_PRIVATE_KEY_PEM, "RS256");

  const jwt = await new jose.SignJWT({ name: name, iat: Date.now() })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(userId ?? "public")
    .setIssuedAt()
    .sign(privateKey);

  return jwt;
}

export const create = internalMutation({
  args: {
    name: v.string(),
    key: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const existingApiKeyDoc = await ctx.db
      .query("apiKeys")
      .withIndex("by_user_name", (q) =>
        q.eq("userId", userId).eq("name", args.name),
      )
      .first();
    if (existingApiKeyDoc) {
      await ctx.db.delete(existingApiKeyDoc._id);
    }

    const jwt = await createJwt(userId, args.name);

    await ctx.db.insert("apiKeys", {
      userId: userId,
      name: args.name,
      key: jwt,
    });

    return jwt;
  },
});

export const createPublic = internalMutation({
  args: {
    name: v.string(),
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const existingApiKeyDoc = await ctx.runQuery(api.apiKeys.queries.getPublicFromName, {
      name: args.name,
    });
    if (existingApiKeyDoc) {
      await ctx.db.delete(existingApiKeyDoc._id);
    }

    const jwt = await createJwt(null, args.name);

    return await ctx.db.insert("apiKeys", {
      name: args.name,
      key: jwt,
    });
  },
});

export const remove = mutation({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const apiKey = await ctx.runQuery(internal.apiKeys.queries.getFromKey, {
      key: args.key,
    });

    await ctx.db.delete(apiKey._id);
  },
});
