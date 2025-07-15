import {
  Navigate,
  Outlet,
  createRootRoute,
  useLocation,
} from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AnimatePresence, motion } from "motion/react";
import { resizePanelOpenAtom, sidebarOpenAtom } from "@/store/chatStore";
import { useAtomValue, useSetAtom } from "jotai";
import { useConvexAuth } from "convex/react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { slideInFromLeft, slideInFromRight } from "@/lib/motion";
import { layoutTransition } from "@/lib/motion";
import { AppSidebar } from "@/components/app-sidebar";
import { TopNav } from "@/components/topnav";
import { Panel } from "@/components/chat/panels";

export const Route = createRootRoute({
  component: RootRouteComponent,
});

function RootRouteComponent() {
  const location = useLocation();
  const { isLoading, isAuthenticated } = useConvexAuth();

  const publicRoutes = ["/auth"];

  {
    isLoading && (
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <div className="flex justify-center items-center h-screen font-sans bg-background">
          <Loader2 className="w-10 h-10 animate-spin [animation-duration:0.3s]" />
        </div>
      </ThemeProvider>
    );
  }

  {
    !isAuthenticated && !publicRoutes.includes(location.pathname) && (
      <Navigate to="/auth" />
    );
  }

  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const setSidebarOpen = useSetAtom(sidebarOpenAtom);
  const resizePanelOpen = useAtomValue(resizePanelOpenAtom);

  return (
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <SidebarProvider
            className="font-sans h-svh relative before:content-[''] before:fixed before:inset-0 before:bg-[url('/images/noise.png')] before:opacity-50 before:pointer-events-none before:z-[-1]"
            open={sidebarOpen}
            onOpenChange={() => {
              setSidebarOpen(!sidebarOpen);
            }}
          >
            {isAuthenticated && <TopNav />}
            <motion.div
              variants={slideInFromLeft}
              initial="initial"
              animate="animate"
              transition={layoutTransition}
            >
              {isAuthenticated && <AppSidebar />}
            </motion.div>
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel className="flex flex-col gap-1 p-2 pt-4">
                <Outlet />
              </ResizablePanel>
              <AnimatePresence mode="wait">
                {resizePanelOpen && (
                  <>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
                      <motion.div
                        variants={slideInFromRight}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={layoutTransition}
                        className="h-full"
                      >
                        <Panel />
                      </motion.div>
                    </ResizablePanel>
                  </>
                )}
              </AnimatePresence>
            </ResizablePanelGroup>
          </SidebarProvider>
        </motion.div>
        <Toaster />
      </ThemeProvider>
    </>
  );
}
