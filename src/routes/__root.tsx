import {
  Navigate,
  Outlet,
  createRootRoute,
  useLocation,
  HeadContent,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { motion } from "motion/react";
import { sidebarOpenAtom, resizePanelOpenAtom } from "@/store/chatStore";
import { useAtomValue, useSetAtom } from "jotai";
import { useConvexAuth } from "convex/react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopNav } from "@/components/topnav";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1.0",
      },
      {
        name: "theme-color",
        content: "#000000",
      },
      {
        name: "description",
        content: "the everything ai app",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "favicon.ico",
      },
      {
        rel: "apple-touch-icon",
        href: "favicon.ico",
      },
      {
        rel: "manifest",
        href: "manifest.json",
      },
    ],
    scripts: [
      {
        src: "https://cdn.databuddy.cc/databuddy.js",
        "data-client-id": "NSQmSNKXIn2VGySald6BR",
        "data-enable-batching": "true",
        crossOrigin: "anonymous",
        async: true,
      },
    ],
    title: "0bs",
  }),
  component: () => {
    const location = useLocation();
    const { isLoading, isAuthenticated } = useConvexAuth();

    const publicRoutes = ["/auth"];
    const sidebarOpen = useAtomValue(sidebarOpenAtom);
    const setSidebarOpen = useSetAtom(sidebarOpenAtom);
    const setResizePanelOpen = useSetAtom(resizePanelOpenAtom);

    const isSettingsRoute = location.pathname.startsWith("/settings");

    // Ensure sidebar and right resizable panel are closed on settings pages
    // and keep them hidden there.
    if (isSettingsRoute && sidebarOpen) {
      setSidebarOpen(false);
    }
    if (isSettingsRoute) {
      setResizePanelOpen(false);
    }

    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-screen font-sans bg-background">
          <LoadingSpinner sizeClassName="w-10 h-10" />
        </div>
      );
    }

    if (!isAuthenticated && !publicRoutes.includes(location.pathname)) {
      return <Navigate to="/auth" />;
    }

    return (
      <>
        <HeadContent />
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
            {/* AppSidebar and TopNav (sidebar hidden on settings) */}
            {isAuthenticated && (
              <>
                {!isSettingsRoute && <AppSidebar />}
                <TopNav />
              </>
            )}

            {/* Redirect authenticated users away from public routes */}
            {isAuthenticated && publicRoutes.includes(location.pathname) && (
              <Navigate to="/chat/$chatId" params={{ chatId: "new" }} />
            )}

            {/* Redirect authenticated users from root to chat */}
            {isAuthenticated && location.pathname === "/" && (
              <Navigate to="/chat/$chatId" params={{ chatId: "new" }} />
            )}
            {/* Render the appropriate outlet */}
            <Outlet />
          </SidebarProvider>
        </motion.div>
        <Toaster />
      </>
    );
  },
});
