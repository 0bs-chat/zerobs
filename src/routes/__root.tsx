import {
  Navigate,
  Outlet,
  createRootRoute,
  useLocation,
  HeadContent,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { motion } from "motion/react";
import { sidebarOpenAtom } from "@/store/chatStore";
import { useAtomValue, useSetAtom } from "jotai";
import { useConvexAuth } from "convex/react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopNav } from "@/components/topnav";
import { DocumentDialog } from "@/components/document-dialog";
import { CreateProjectDialog } from "@/components/create-project-dialog";

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
        href: "/manifest.json",
      },
      {
        rel: "preload",
        as: "image",
        href: "/images/noise.png",
      },
      {
        rel: "preconnect",
        href: "https://cdn.databuddy.cc",
        crossOrigin: "anonymous",
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

    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-screen font-sans bg-background">
          <Loader2 className="w-10 h-10 animate-spin [animation-duration:0.3s]" />
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
            {/* AppSidebar and TopNav are now available on all routes */}
            {isAuthenticated && (
              <>
                <AppSidebar />
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
            <DocumentDialog />
            <CreateProjectDialog />
          </SidebarProvider>
        </motion.div>
        <Toaster />
      </>
    );
  },
});
