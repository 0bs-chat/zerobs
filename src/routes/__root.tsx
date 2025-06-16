import { Navigate, Outlet, createRootRoute } from "@tanstack/react-router";
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { useConvexAuth } from "convex/react";
import { Loader2 } from "lucide-react";
export const Route = createRootRoute({
  component: () => {
    const { isLoading, isAuthenticated } = useConvexAuth();
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

        {/* authenticated route */}
        {isAuthenticated && <Outlet />}
        <Toaster />
      </ThemeProvider>
    );
  },
});
