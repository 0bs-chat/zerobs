import {
  Outlet,
  HeadContent,
  Scripts,
  useRouteContext,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext } from "@tanstack/react-router";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { ThemeProvider } from "@/components/theme-provider";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  useAuth,
} from "@clerk/tanstack-react-start";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { DefaultCatchBoundary } from "../components/defaultCatchBoundry";
import { NotFound } from "../components/notFound";
import AuthPage from "./auth";
import { createServerFn } from "@tanstack/react-start";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import "@/styles.css";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

const fetchClerkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const auth = await getAuth(getWebRequest());
  const token = await auth.getToken({ template: "convex" });

  return {
    userId: auth.userId,
    token,
  };
});

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
  convexQueryClient: ConvexQueryClient;
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "0bs",
      },
    ],
  }),
  beforeLoad: async (ctx) => {
    const auth = await fetchClerkAuth();
    const { userId, token } = auth;

    if (token) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(token);
    }

    return {
      userId,
      token,
    };
  },

  component: RootComponent,
  notFoundComponent: () => <NotFound />,
  errorComponent: () => {
    return (
      <RootDocument>
        <DefaultCatchBoundary />
      </RootDocument>
    );
  },
});

function RootComponent() {
  return (
    <RootDocument>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <SignedIn>
          <Outlet />
        </SignedIn>
        <SignedOut>
          <AuthPage />
        </SignedOut>
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-right" />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const context = useRouteContext({ from: Route.id });
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={context.convexClient} useAuth={useAuth}>
        <html className="h-screen w-screen bg-background">
          <head>
            <HeadContent />
          </head>
          <body>
            {children}
            <Scripts />
          </body>
        </html>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
