import { httpRouter } from "convex/server";
import { corsRouter } from "convex-helpers/server/cors";
import { auth } from "./auth";
import { stream } from "./chats/actions";

const http = httpRouter();
const cors = corsRouter(http, {
  allowedHeaders: ["*"],
  allowedOrigins: ["*"],
});

auth.addHttpRoutes(http);

cors.route({
  method: "POST",
  pathPrefix: "/stream/",
  handler: stream,
})

export default http;
