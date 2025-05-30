import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme-switcher";

export function TopNav() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-transparent"
      style={{ pointerEvents: "auto" }}
    >
      <div className="w-full p-2 flex items-center justify-between">
        {/* Left: Sidebar trigger */}
        <div className="flex-shrink-0">
          <SidebarTrigger />
        </div>
        {/* Right: Theme switcher */}
        <div className="flex-shrink-0">
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
}
