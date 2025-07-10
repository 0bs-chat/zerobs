// Polyfill Buffer for isomorphic-git in browser environment
import { Buffer } from "buffer";
if (typeof globalThis.Buffer === "undefined") {
  globalThis.Buffer = Buffer;
}

import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { ConvexReactClient } from "convex/react";
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { routeTree } from "./routeTree.gen";
import reportWebVitals from "./reportWebVitals.ts";
import { authClient } from "./lib/auth-client.ts";
import "./styles.css";

// Create a new router instance
const router = createRouter({
  routeTree,
  context: {},
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Create a new Convex client instance
const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string,
  { verbose: true },
);

// Render the app
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <ConvexQueryCacheProvider>
          <RouterProvider router={router} />
        </ConvexQueryCacheProvider>
      </ConvexBetterAuthProvider>
    </StrictMode>,
  );
}

reportWebVitals();
