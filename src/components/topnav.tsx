import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme-switcher";
import { rightPanelVisibilityAtom } from "@/store/chatStore";
import { LogOutIcon, PanelRightCloseIcon } from "lucide-react";
import { PanelRightOpenIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import { useAtom } from "jotai";

export function TopNav() {
  const [rightPanelVisible, setRightPanelVisible] = useAtom(
    rightPanelVisibilityAtom
  );

  const { signOut } = useAuthActions();

  return (
    <div className="fixed right-0 py-2 px-4 flex items-center gap-4 w-full bg-transparent justify-between pointer-events-none z-50">
      <div className="flex items-center gap-2 justify-center top-0 left-0 pointer-events-auto">
        <SidebarTrigger className="h-8 w-8" />
      </div>
      <div className="flex items-center gap-2 justify-center top-0 right-0 pointer-events-auto">
        {!rightPanelVisible ? (
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer transition-all duration-300 hover:text-destructive hover:bg-destructive/20 pointer-events-auto dark:hover:text-foreground dark:hover:bg-destructive/60"
            onClick={() => {
              signOut();
              toast.success("Signed out");
            }}
          >
            <LogOutIcon className="h-4 w-4" />
          </Button>
        ) : null}
        {!rightPanelVisible ? <ModeToggle /> : null}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setRightPanelVisible(!rightPanelVisible);
          }}
        >
          {rightPanelVisible ? (
            <PanelRightCloseIcon className="h-4 w-4" />
          ) : (
            <PanelRightOpenIcon className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
