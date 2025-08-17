import * as jose from "jose";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./helpers";

const JWT_PRIVATE_KEY_PEM = process.env.JWT_PRIVATE_KEY;
const JWKS_URI = process.env.JWKS;

export async function createJwt(
  key: string,
  value: string,
  userId?: string,
  skipTimestamp?: boolean,
): Promise<string> {
  if (!JWT_PRIVATE_KEY_PEM) {
    throw new Error("JWT_PRIVATE_KEY environment variable is not set.");
  }

  const privateKey = await jose.importPKCS8(JWT_PRIVATE_KEY_PEM, "RS256");

  const jwtBuilder = new jose.SignJWT({
    key: key,
    value: value,
  })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(userId ?? "public");

  if (!skipTimestamp) {
    jwtBuilder.setIssuedAt();
  }

  const jwt = await jwtBuilder.sign(privateKey);

  return jwt;
}

export async function verifyJwt(
  token: string,
): Promise<{ sub: string; key: string; value: string }> {
  if (!JWKS_URI) {
    throw new Error("JWKS_URI environment variable is not set.");
  }

  const jwksJson = JSON.parse(JWKS_URI);
  const jwks = jose.createLocalJWKSet(jwksJson);

  const { payload } = await jose.jwtVerify(token, jwks, {
    algorithms: ["RS256"],
  });

  if (
    typeof payload.sub !== "string" ||
    typeof payload.key !== "string" ||
    typeof payload.value !== "string"
  ) {
    throw new Error("Invalid JWT payload");
  }

  return {
    sub: payload.sub,
    key: payload.key,
    value: payload.value,
  };
}

export const createJwtAction = action({
  args: {
    key: v.string(),
    value: v.string(),
    skipTimestamp: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    return await createJwt(args.key, args.value, userId, args.skipTimestamp);
  },
});