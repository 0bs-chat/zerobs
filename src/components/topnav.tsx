import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme-switcher";
import { useChat } from "@/store/use-chat";
import { LogOutIcon, PanelRightCloseIcon } from "lucide-react";
import { PanelRightOpenIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";

export function TopNav() {
  const { resizablePanelsOpen, setResizablePanelsOpen } = useChat();
  const { signOut } = useAuthActions();

  return (
    <div className="fixed right-0 py-2 px-4 flex items-center gap-4 w-full bg-transparent justify-between pointer-events-none z-50">
      <div className="flex items-center gap-2 justify-center top-0 left-0 pointer-events-auto">
        <SidebarTrigger className="h-8 w-8  border bg-background " />
      </div>
      <div className="flex items-center gap-2 justify-center top-0 right-0 pointer-events-auto">
        {!resizablePanelsOpen ? (
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer hover:scale-105 transition-all duration-300 hover:text-destructive hover:bg-destructive/90"
            onClick={() => {
              localStorage.clear();
              signOut();
              toast.success("Signed out");
            }}
          >
            <LogOutIcon className="h-4 w-4" />
          </Button>
        ) : null}
        {!resizablePanelsOpen ? <ModeToggle /> : null}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setResizablePanelsOpen(!resizablePanelsOpen)}
        >
          {resizablePanelsOpen ? (
            <PanelRightCloseIcon className="h-4 w-4" />
          ) : (
            <PanelRightOpenIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
