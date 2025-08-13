// import { corsRouter } from "convex-helpers/server/cors";
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

// const cors = corsRouter(http, {
//   allowedOrigins: ["http://localhost:3000", "https://0bs.chat"],
//   enforceAllowOrigins: true,
// });

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
