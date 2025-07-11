import { Navigate, Outlet, createRootRoute } from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button";

export const Route = createRootRoute({
  component: () => {
    const urlPath = location.pathname;
    const { data: session, isPending } = authClient.useSession();

    const publicRoutes = ["/landing", "/"];

    // Show loading spinner while Clerk is initializing
    if (isPending) {
      return (
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <div className="flex justify-center items-center h-screen font-sans bg-background">
            <Loader2 className="w-10 h-10 animate-spin [animation-duration:0.3s]" />
          </div>
        </ThemeProvider>
      );
    }

    if (urlPath === "/" && !session) {
      return <Navigate to="/landing" />;
    }

    // Show sign-in page for unauthenticated users on private routes
    if (!session && !publicRoutes.includes(urlPath)) {
      return (
        <div className="flex justify-center items-center h-screen">
          <Button onClick={() => authClient.signIn.social({
            provider: "google",
          })}>Sign in</Button>
        </div>
      );
    }

    return (
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        {/* Redirect authenticated users away from public routes */}
        {session && publicRoutes.includes(urlPath) && (
          <Navigate to="/chat/$chatId" params={{ chatId: "new" }} />
        )}

        {/* Redirect authenticated users from root to chat */}
        {session && urlPath === "/" && (
          <Navigate to="/chat/$chatId" params={{ chatId: "new" }} />
        )}

        {/* Render the appropriate outlet */}
        <Outlet />
        <Toaster />
      </ThemeProvider>
    );
  },
});
