import { httpRouter } from "convex/server";
import { corsRouter } from "convex-helpers/server/cors";
import { auth } from "./auth";
import { handleCallback } from "./utils/oauth/github_repo";
import { addApiKey } from "./apiKeys/actions";
import { httpAction } from "./_generated/server";

const handleOptions = httpAction(async () => {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": process.env.SITE_URL || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    },
  });
});

const http = httpRouter();

const cors = corsRouter(http, {
  allowedHeaders: ["*"],
  allowedOrigins: ["*"],
  allowCredentials: true,
});

auth.addHttpRoutes(http);

// GitHub OAuth routes for repository access
http.route({
  path: "/github_repo/callback",
  method: "GET",
  handler: handleCallback,
});

http.route({
  path: "/github_repo/callback",
  method: "OPTIONS",
  handler: handleOptions,
});

http.route({
  path: "/apiKeys/add",
  method: "POST",
  handler: addApiKey,
});

http.route({
  path: "/apiKeys/add",
  method: "OPTIONS",
  handler: handleOptions,
});

export default http;
