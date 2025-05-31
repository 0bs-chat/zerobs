import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme-switcher";
import { useChat } from "@/store/use-chat";
import { PanelRightCloseIcon } from "lucide-react";
import { PanelRightOpenIcon } from "lucide-react";
import { Button } from "./ui/button";

export function TopNav() {
  const { resizablePanelsOpen, setResizablePanelsOpen } = useChat();

  return (
    <div className=" fixed right-0 z-50 py-2 px-4 flex items-center gap-4 w-full bg-transparent justify-between pointer-events-none">
      <div className="flex items-center gap-2 justify-center top-0 left-0 pointer-events-auto">
        <SidebarTrigger className="h-8 w-8  border bg-background " />
      </div>
      <div className="flex items-center gap-2 justify-center top-0 right-0 pointer-events-auto">
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
