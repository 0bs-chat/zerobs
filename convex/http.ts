import { corsRouter } from "convex-helpers/server/cors";
import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

const cors = corsRouter(http, {
  allowedOrigins: ["http://localhost:3000", "https://0bs.chat"],
  enforceAllowOrigins: true,
});

export default http;
