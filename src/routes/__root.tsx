import {
  Outlet,
  HeadContent,
  Scripts,
  useRouteContext,
} from "@tanstack/react-router";
import { type ReactNode } from "react";
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
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Panel } from "@/components/chat/panels";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { rightPanelVisibilityAtom, sidebarOpenAtom } from "@/store/chatStore";
import { useAtomValue, useSetAtom } from "jotai";
import { TopNav } from "@/components/topnav";
import { ResizableHandle } from "@/components/ui/resizable";
import { useHydrateAtoms } from "jotai/utils";
import { Toaster } from "sonner";
import { DocumentDialog } from "@/components/document-dialog";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { api } from "convex/_generated/api";

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

    // can replace it with webhooks but right now it just creates the prefs if they don't exist or if they do it just returns them
    if (userId) {
      await ctx.context.convexQueryClient.serverHttpClient?.mutation(
        api.newChatPrefs.mutations.create,
        {}
      );
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
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const setSidebarOpen = useSetAtom(sidebarOpenAtom);
  const rightPanelVisible = useAtomValue(rightPanelVisibilityAtom);

  useHydrateAtoms([
    [sidebarOpenAtom, false],
    [rightPanelVisibilityAtom, false],
  ] as const);

  return (
    <RootDocument>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <SignedIn>
          <SidebarProvider
            className="flex h-svh font-sans"
            open={sidebarOpen}
            onOpenChange={() => {
              setSidebarOpen(!sidebarOpen);
            }}
          >
            <TopNav />
            {sidebarOpen && <AppSidebar />}
            <div className="flex-1">
              <ResizablePanelGroup
                direction="horizontal"
                id="resizable-panel-group"
              >
                <ResizablePanel
                  className="flex flex-col gap-1 p-2 pt-4 overflow-hidden justify-between"
                  id="chat-panel"
                >
                  <div className="flex flex-col items-center justify-center overflow-hidden">
                    <Outlet />
                  </div>
                </ResizablePanel>
                {rightPanelVisible && (
                  <>
                    <ResizableHandle />
                    <ResizablePanel
                      defaultSize={40}
                      minSize={25}
                      maxSize={50}
                      id="right-panel"
                    >
                      <Panel />
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </div>
            {/* Dialogs */}
            <DocumentDialog />
            <CreateProjectDialog />
          </SidebarProvider>
        </SignedIn>
        <SignedOut>
          <AuthPage />
        </SignedOut>
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-right" />
      <Toaster />
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
