import { httpRouter } from "convex/server";
import { auth } from "./auth";
import {
  handleOAuthRedirectOptions,
  handleOAuthRedirect,
  handleOAuthCallback,
  handleApiKeysCreate,
} from "./utils/oauth";

const http = httpRouter();
auth.addHttpRoutes(http);

http.route({
  path: "/integrations/redirect",
  method: "OPTIONS",
  handler: handleOAuthRedirectOptions,
});

http.route({
  path: "/integrations/redirect",
  method: "POST",
  handler: handleOAuthRedirect,
});

http.route({
  path: "/integrations/callback",
  method: "GET",
  handler: handleOAuthCallback,
});

http.route({
  path: "/apiKeys/create",
  method: "POST",
  handler: handleApiKeysCreate,
});

export default http;
