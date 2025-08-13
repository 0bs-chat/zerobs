import { httpAction, internalAction } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { providers } from "./providers";

function buildCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? request.headers.get("origin") ?? "";
  const allowedOrigins = [
    process.env.FRONTEND_ORIGIN,
    process.env.VITE_APP_URL,
    process.env.APP_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean) as string[];
  const allowOrigin = allowedOrigins.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

export const handleOAuthRedirectOptions = httpAction(async (_ctx, request) => {
  return new Response(null, { status: 204, headers: buildCorsHeaders(request) });
});

export const handleOAuthRedirect = httpAction(async (_ctx, request) => {
  const requestBody = await request.json();
  const stateString: string = requestBody.state;
  const state = JSON.parse(stateString);
  const providerConfig = providers[state.provider];
  const clientId = process.env[providerConfig.clientIdKey!];
  const { scope } = providerConfig;

  // Avoid mutating the shared provider URL; clone it per request
  const url = new URL(providerConfig.authUrl);
  url.searchParams.set("client_id", clientId!);
  url.searchParams.set(
    "redirect_uri",
    `${process.env.CONVEX_SITE_URL}/integrations/callback`,
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scope);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", stateString);

  return new Response(
    JSON.stringify({ redirect: url.toString() }),
    {
      status: 200,
      headers: { "content-type": "application/json", ...buildCorsHeaders(request) },
    },
  );
});

export const handleOAuthCallback = httpAction(async (_ctx, request) => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = JSON.parse(url.searchParams.get("state")!);
  const providerConfig = providers[state.provider];
  const clientId = process.env[providerConfig.clientIdKey!];
  const clientSecret = process.env[providerConfig.clientSecretKey!];

  if (!clientId || !clientSecret) {
    throw new Error(`Missing environment variables for ${state.provider}`);
  }

  // Exchange code for tokens
  const response = await fetch(providerConfig.tokenUrl, {
    method: "POST",
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${process.env.CONVEX_SITE_URL}/integrations/callback`,
      grant_type: "authorization_code",
    }),
  });
  const data = await response.json();

  const accessToken = data.access_token;
  const refreshToken = data.refresh_token;

  // call /apiKeys/create
  const res = await fetch(`${process.env.CONVEX_SITE_URL}/apiKeys/create`, {
    method: "POST",
    body: JSON.stringify({ provider: state.provider, accessToken, refreshToken }),
    headers: {
      "content-type": "application/json",
      "Authorization": `Bearer ${state.token}`,
    },
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: "Failed to create API keys" }), { status: 500, headers: { "content-type": "application/json" } });
  }

  return Response.redirect(`${process.env.SITE_URL}/settings/integrations`, 302);
});

export const handleApiKeysCreate = httpAction(async (ctx, request) => {
  const requestBody = await request.json();
  const { provider, accessToken, refreshToken } = requestBody;

  await Promise.all([
    ctx.runMutation(api.apiKeys.mutations.create, {
      key: `${provider.toUpperCase()}_ACCESS_TOKEN`,
      value: accessToken,
      enabled: true,
    }),
    ctx.runMutation(api.apiKeys.mutations.create, {
      key: `${provider.toUpperCase()}_REFRESH_TOKEN`,
      value: refreshToken,
      enabled: true,
    }),
  ]);

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "content-type": "application/json", ...buildCorsHeaders(request) } });
});

export const getRefreshedAccessToken = internalAction({
  args: {
    provider: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const providerConfig = providers[args.provider];
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${args.provider}`);
    }

    const clientId = process.env[providerConfig.clientIdKey];
    const clientSecret = process.env[providerConfig.clientSecretKey];
    if (!clientId || !clientSecret) {
      throw new Error(`Missing OAuth client credentials for ${args.provider}`);
    }

    const refreshKeyKey = providerConfig.refreshKeyKey;

    const refreshKeyDoc = await ctx.runQuery(internal.apiKeys.queries.getFromKey, {
      key: refreshKeyKey,
    });

    const refreshToken = refreshKeyDoc?.value as string | undefined;
    if (!refreshToken) {
      throw new Error(`No refresh token found for ${args.provider}`);
    }

    

    const useForm = args.provider === "google";
    const headers: Record<string, string> = useForm
      ? { "content-type": "application/x-www-form-urlencoded", accept: "application/json" }
      : { "content-type": "application/json", accept: "application/json" };
    const body = useForm
      ? new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        })
      : JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        });
    const tokenResponse = await fetch(providerConfig.tokenUrl, {
      method: "POST",
      headers,
      body,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(
        `Failed to refresh token for ${args.provider}: ${tokenResponse.status} ${errorText}`,
      );
    }

    const tokenData = await tokenResponse.json();
    const newAccessToken = tokenData.access_token as string | undefined;
    const maybeNewRefreshToken = (tokenData.refresh_token as string | undefined) ?? refreshToken;

    if (!newAccessToken) {
      throw new Error(`Token endpoint did not return an access_token for ${args.provider}`);
    }

    // Persist the new access token (and rotated refresh token if provided)
    await ctx.runMutation(api.apiKeys.mutations.create, {
      key: providerConfig.accessKeyKey,
      value: newAccessToken,
      enabled: true,
    });

    if (maybeNewRefreshToken && maybeNewRefreshToken !== refreshToken) {
      await ctx.runMutation(api.apiKeys.mutations.create, {
        key: providerConfig.refreshKeyKey,
        value: maybeNewRefreshToken,
        enabled: true,
      });
    }

    return newAccessToken;
  },
});
