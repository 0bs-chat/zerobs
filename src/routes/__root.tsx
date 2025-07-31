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
import { motion } from "motion/react";
import { sidebarOpenAtom } from "@/store/chatStore";
import { useAtomValue, useSetAtom } from "jotai";
import { useConvexAuth } from "convex/react";
import { AppSidebar } from "@/components/app-sidebar";
import { TopNav } from "@/components/topnav";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
  component: () => {
    const location = useLocation();
    const { isLoading, isAuthenticated } = useConvexAuth();

    const publicRoutes = ["/auth"];
    const sidebarOpen = useAtomValue(sidebarOpenAtom);
    const setSidebarOpen = useSetAtom(sidebarOpenAtom);

    if (isLoading) {
      return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <div className="flex justify-center items-center h-screen font-sans bg-background">
            <Loader2 className="w-10 h-10 animate-spin [animation-duration:0.3s]" />
          </div>
        </ThemeProvider>
      );
    }

    if (!isAuthenticated && !publicRoutes.includes(location.pathname)) {
      return <Navigate to="/auth" />;
    }

    return (
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
            {/* AppSidebar and TopNav are now available on all routes */}
            {isAuthenticated && (
              <>
                <AppSidebar />
                <TopNav />
              </>
            )}

            {/* Redirect authenticated users away from public routes */}
            {isAuthenticated && publicRoutes.includes(location.pathname) && (
              <Navigate to="/chat/new" />
            )}

            {/* Redirect authenticated users from root to chat */}
            {isAuthenticated && location.pathname === "/" && (
              <Navigate to="/chat/new" />
            )}
            {/* Render the appropriate outlet */}
            <Outlet />
          </SidebarProvider>
        </motion.div>
        <Toaster />
        <TanStackRouterDevtools position="bottom-right" />
      </ThemeProvider>
    );
  },
});
