import { ModeToggle } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createLazyFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, KeyIcon, Plug, Wallet2 } from "lucide-react";
import { useEffect } from "react";

const settingsNavItems = [
  {
    title: "API Keys",
    href: "/settings/apiKeys",
    icon: KeyIcon,
  },
  {
    title: "Integrations",
    href: "/settings/integrations",
    icon: Plug,
  },
  {
    title: "Billing",
    href: "/settings/billing",
    icon: Wallet2,
  },
];

export const Route = createLazyFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (
      location.pathname === "/settings" ||
      location.pathname === "/settings/"
    ) {
      navigate({
        to: "/settings/apiKeys",
        replace: true,
      });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="flex h-screen flex-col overflow-y-auto bg-background w-full">
      <div className="container mx-auto flex max-w-6xl flex-1 flex-col p-3 pb-6 lg:max-h-dvh lg:overflow-y-hidden lg:p-6">
        {/* Header */}
        <div className="mb-8 max-md:px-2">
          <div className="mb-6 flex items-center justify-between">
            <Link to="/chat/$chatId" params={{ chatId: "new" }}>
              <Button variant="ghost" className=" cursor-pointer">
                <ArrowLeft className="h-6 w-6" />
                Back to chat
              </Button>
            </Link>
            <ModeToggle />
          </div>

          <div className="space-y-1">
            <h1 className="font-semibold text-3xl tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings, preferences and integrations.
            </p>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Navigation */}
          <div className="w-full flex-shrink-0 lg:w-64 lg:pr-2">
            <nav className="w-full space-y-1">
              {settingsNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors",
                      isActive
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="col-span-3 flex-1">
            <div className="space-y-6 p-0.5 lg:max-h-[calc(100dvh-12rem)] lg:overflow-y-auto">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
