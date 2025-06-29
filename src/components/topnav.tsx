import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme-switcher";
import {
  rightPanelVisibilityAtom,
  selectedArtifactAtom,
  selectedArtifactIdAtom,
  sidebarOpenAtom,
} from "@/store/chatStore";
import { LogOutIcon, PanelRightCloseIcon } from "lucide-react";
import { PanelRightOpenIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useClerk } from "@clerk/tanstack-react-start";

export function TopNav() {
  const [rightPanelVisible, setRightPanelVisible] = useAtom(
    rightPanelVisibilityAtom
  );
  const setSelectedArtifactId = useSetAtom(selectedArtifactIdAtom);
  const selectedArtifact = useAtomValue(selectedArtifactAtom);
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const { signOut } = useClerk();

  return (
    <div className="fixed right-0 py-2.5 px-4 flex items-center gap-4 w-full bg-transparent justify-between pointer-events-none z-50">
      <div className="flex items-center gap-2 justify-center top-0 left-0 pointer-events-auto">
        <SidebarTrigger
          className={`h-8 w-8 ${sidebarOpen ? "bg-muted-foreground/30 dark:bg-accent" : ""}`}
        />
      </div>
      <div className="flex items-center gap-2 justify-center top-0 right-0 pointer-events-auto">
        {!rightPanelVisible ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            className="hover:bg-destructive hover:text-destructive-foreground"
          >
            <LogOutIcon className="h-4 w-4" />
          </Button>
        ) : null}

        {!rightPanelVisible ? (
          <div className="bg-background text-foreground flex items-center gap-2 justify-center">
            <ModeToggle />
          </div>
        ) : null}

        <Button
          variant="ghost"
          size="icon"
          className={`${rightPanelVisible ? "bg-muted-foreground/30 dark:bg-accent" : "bg-background"} ${selectedArtifact ? "hidden" : ""}`}
          onClick={() => {
            setRightPanelVisible(!rightPanelVisible);
            setSelectedArtifactId(null);
          }}
        >
          {rightPanelVisible ? (
            <PanelRightCloseIcon className="h-5 w-5" />
          ) : (
            <PanelRightOpenIcon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
