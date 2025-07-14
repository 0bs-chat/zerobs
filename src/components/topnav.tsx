import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme-switcher";
import {
  resizePanelOpenAtom,
  selectedArtifactAtom,
  sidebarOpenAtom,
} from "@/store/chatStore";
import { PanelRightCloseIcon, PlusIcon, Settings2Icon } from "lucide-react";
import { PanelRightOpenIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useNavigate } from "@tanstack/react-router";
import { useLocation } from "@tanstack/react-router";

export function TopNav() {
  const location = useLocation();

  const isSettingsPage = location.pathname.startsWith("/settings");

  const [resizePanelOpen, setResizePanelOpen] = useAtom(resizePanelOpenAtom);

  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);
  const navigate = useNavigate();
  const [sidebarOpen] = useAtom(sidebarOpenAtom);
  const selectedArtifact = useAtomValue(selectedArtifactAtom);

  return (
    <div
      className={`fixed right-0 py-2  flex items-center w-full bg-transparent justify-between pointer-events-none z-50 px-2 ${isSettingsPage ? "hidden" : ""}`}
    >
      <div
        className={`flex items-center gap-1 justify-center top-0 p-0.5 rounded-lg left-0 pointer-events-auto ${sidebarOpen ? "border border-transparent" : "border-border/20 border bg-accent/25 dark:bg-accent/35"}`}
      >
        <SidebarTrigger />
        <Button
          variant="ghost"
          className={`${sidebarOpen ? "hidden" : ""} size-8`}
          size="icon"
          onClick={() => {
            navigate({ to: "/" });
          }}
        >
          <PlusIcon />
        </Button>
      </div>
      <div
        className={`flex items-center gap-1 justify-center top-0 right-0 p-0.5 pointer-events-auto  rounded-lg ${resizePanelOpen ? "border border-transparent" : "border-border/20 border bg-accent/25 dark:bg-accent/35"} `}
      >
        {!resizePanelOpen ? (
          <Button
            variant="ghost"
            size="icon"
            className=""
            onClick={() => {
              navigate({ to: "/settings/profile" });
            }}
          >
            <Settings2Icon className="h-6 w-6" />
          </Button>
        ) : null}
        {!resizePanelOpen ? <ModeToggle /> : null}
        <Button
          variant="ghost"
          size="icon"
          className={`${resizePanelOpen ? "bg-muted-foreground/30 dark:bg-accent" : "bg-transparent"} ${selectedArtifact ? "hidden" : ""}`}
          onClick={() => {
            setResizePanelOpen(!resizePanelOpen);
            setSelectedArtifact(undefined);
          }}
        >
          {resizePanelOpen ? (
            <PanelRightCloseIcon className="h-8 w-8" />
          ) : (
            <PanelRightOpenIcon className="h-8 w-8" />
          )}
        </Button>
      </div>
    </div>
  );
}
