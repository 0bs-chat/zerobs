import { Navigate, Outlet, createRootRoute } from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { useAuth, RedirectToSignIn } from "@clerk/clerk-react";

export const Route = createRootRoute({
  component: () => {
    const urlPath = location.pathname;
    const { isLoaded, isSignedIn } = useAuth();

    const publicRoutes = ["/landing", "/"];

    // Show loading spinner while Clerk is initializing
    if (!isLoaded) {
      return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <div className="flex justify-center items-center h-screen font-sans bg-background">
            <Loader2 className="w-10 h-10 animate-spin [animation-duration:0.3s]" />
          </div>
        </ThemeProvider>
      );
    }

    if (urlPath === "/" && !isSignedIn) {
      return <Navigate to="/landing" />;
    }

    // Show sign-in page for unauthenticated users on private routes
    if (!isSignedIn && !publicRoutes.includes(urlPath)) {
      return <RedirectToSignIn />;
    }

    return (
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        {/* Redirect authenticated users away from public routes */}
        {isSignedIn && publicRoutes.includes(urlPath) && (
          <Navigate to="/chat/$chatId" params={{ chatId: "new" }} />
        )}

        {/* Redirect authenticated users from root to chat */}
        {isSignedIn && urlPath === "/" && (
          <Navigate to="/chat/$chatId" params={{ chatId: "new" }} />
        )}

        {/* Render the appropriate outlet */}
        <Outlet />
        <Toaster />
      </ThemeProvider>
    );
  },
});
