import { Outlet, createRootRoute } from "@tanstack/react-router";
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { useConvexAuth } from "convex/react";
import { Loader } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DocumentDialog } from "@/components/document-dialog";
import { ProjectDialog } from "@/components/project-dialog";
import { TopNav } from "@/components/topnav";
import { ResizablePanelGroup } from "@/components/ui/resizable";
import { ResizablePanel } from "@/components/ui/resizable";
import { ResizableHandle } from "@/components/ui/resizable";
import { Panel } from "@/components/chat/panel";
import { useChat } from "@/store/use-chat";

export const Route = createRootRoute({
  component: () => {
    const { isLoading } = useConvexAuth();
    const { resizablePanelsOpen } = useChat();

    if (isLoading) {
      return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <div className="flex justify-center items-center h-screen bg-background">
            <Loader className="w-10 h-10 animate-spin" />
          </div>
        </ThemeProvider>
      );
    }

    return (
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <SidebarProvider className="flex h-svh">
          <AppSidebar />
          <TopNav />
          <DocumentDialog />
          <ProjectDialog />
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
        </SidebarProvider>
        <Toaster />
        {/* <TanStackRouterDevtools /> */}
      </ThemeProvider>
    );
  },
});
