import { httpRouter } from "convex/server";
import { corsRouter } from "convex-helpers/server/cors";
import { auth } from "./auth";
import { stream } from "./chats/actions";
import { httpAction } from "./_generated/server";

const http = httpRouter();
const cors = corsRouter(http, {
  allowedHeaders: ["*"],
  allowedOrigins: ["*"],
});

auth.addHttpRoutes(http);

cors.route({
  method: "POST",
  path: "/stream",
  handler: stream,
})

export default http;
