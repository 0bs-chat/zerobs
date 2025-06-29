// src/server.ts
// Whether we are statically generating our app or serving it dynamically, the server.ts file is the entry point for doing all SSR-related work.

import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { createRouter } from "./router";
import { createClerkHandler } from "@clerk/tanstack-react-start/server";

export default createClerkHandler(
  createStartHandler({
    createRouter,
  })
)(defaultStreamHandler);
