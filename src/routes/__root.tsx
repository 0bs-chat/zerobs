import { Navigate, Outlet, createRootRoute } from "@tanstack/react-router";
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { useConvexAuth } from "convex/react";
import { Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DocumentDialog } from "@/components/document-dialog";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { TopNav } from "@/components/topnav";
import { ResizablePanelGroup } from "@/components/ui/resizable";
import { ResizablePanel } from "@/components/ui/resizable";
import { ResizableHandle } from "@/components/ui/resizable";
import { Panel } from "@/components/chat/panel";
import { resizablePanelsOpenAtom } from "@/store/chatStore";
import { useAtomValue } from "jotai";

export const Route = createRootRoute({
  component: () => {
    const { isLoading, isAuthenticated } = useConvexAuth();
    const resizablePanelsOpen = useAtomValue(resizablePanelsOpenAtom);

    const urlPath = location.pathname;

    const privateRoutes = ["/chat", "/"];

    const publicRoutes = ["/landing", "/auth"];

    if (isLoading && !isAuthenticated) {
      return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <div className="flex justify-center items-center h-screen font-sans bg-background">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
        </ThemeProvider>
      );
    }

    return (
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        {/* landing route */}
        {!isAuthenticated && !publicRoutes.includes(urlPath) && (
          <Navigate
            to="/landing"
            viewTransition={true}
            reloadDocument={true}
            replace
          />
        )}

        {isAuthenticated && publicRoutes.includes(urlPath) && (
          <Navigate to="/chat/$chatId" params={{ chatId: "new" }} />
        )}

        {/* auth routes */}
        {!isAuthenticated && publicRoutes.includes(urlPath) && <Outlet />}

        {isAuthenticated && privateRoutes.includes(urlPath) && (
          <Navigate to="/chat/$chatId" params={{ chatId: "new" }} />
        )}

        {/* chat route */}
        {isAuthenticated && (
          <SidebarProvider className="flex h-svh font-sans">
            <AppSidebar />
            <TopNav />
            <div className="flex-1">
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel className="flex flex-col h-full p-2 items-center justify-end gap-2">
                  <Outlet />
                </ResizablePanel>
                {resizablePanelsOpen && (
                  <>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={40} minSize={25} maxSize={50}>
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
        )}
        <Toaster />
        {/* <TanStackRouterDevtools /> */}
      </ThemeProvider>
    );
  },
});
