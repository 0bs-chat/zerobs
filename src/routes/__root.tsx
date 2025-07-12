import {
  Navigate,
  Outlet,
  createRootRoute,
  useLocation,
} from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarProvider } from "@/components/ui/sidebar";
import { motion } from "motion/react";
import { sidebarOpenAtom } from "@/store/chatStore";
import { useAtomValue, useSetAtom } from "jotai";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";

export const Route = createRootRoute({
  component: () => {
    const location = useLocation();
    const { signIn } = useAuthActions();
    const { isLoading, isAuthenticated } = useConvexAuth();

    const publicRoutes = ["/"];
    const sidebarOpen = useAtomValue(sidebarOpenAtom);
    const setSidebarOpen = useSetAtom(sidebarOpenAtom);

    // Show loading spinner while Clerk is initializing
    if (isLoading) {
      return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <div className="flex justify-center items-center h-screen font-sans bg-background">
            <Loader2 className="w-10 h-10 animate-spin [animation-duration:0.3s]" />
          </div>
        </ThemeProvider>
      );
    }

    // Show sign-in page for unauthenticated users on private routes
    if (!isAuthenticated && !publicRoutes.includes(location.pathname)) {
      return (
        <div className="flex justify-center items-center h-screen">
          <Button onClick={() => signIn("google")}>Sign in</Button>
        </div>
      );
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
      </ThemeProvider>
    );
  },
});
