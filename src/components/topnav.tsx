import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme-provider";
import {
  resizePanelOpenAtom,
  selectedArtifactAtom,
  sidebarOpenAtom,
  userAtom,
} from "@/store/chatStore";
import { PanelRightCloseIcon, PlusIcon, Settings2Icon } from "lucide-react";
import { PanelRightOpenIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";

export function TopNav() {
  const [resizePanelOpen, setResizePanelOpen] = useAtom(resizePanelOpenAtom);
  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);
  const navigate = useNavigate();
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const selectedArtifact = useAtomValue(selectedArtifactAtom);
  const setUser = useSetAtom(userAtom);
  const location = useLocation();

  const { data: user } = useQuery({
    ...convexQuery(api.auth.getUser, {}),
  });

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user]);

  // Check if we're on a chat route by looking for chatId parameter
  const params = useParams({ strict: false });
  const isOnChatRoute = !!params.chatId;
  const isSettingsRoute = location.pathname.startsWith("/settings");

  // Minimal global shortcut for toggling resizable panel (Ctrl/Cmd+I)
  useEffect(() => {
    if (!isOnChatRoute) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement)?.tagName;
      const isEditable =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        (event.target as HTMLElement)?.isContentEditable;
      if (isEditable) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "i") {
        event.preventDefault();
        setResizePanelOpen((open) => {
          if (!open) setSelectedArtifact(undefined);
          return !open;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOnChatRoute, setResizePanelOpen, setSelectedArtifact]);

  return (
    <div
      className={`fixed right-0 py-2 flex items-center w-full bg-transparent justify-between pointer-events-none z-50 px-1.5 ${isSettingsRoute ? "hidden" : ""}`}
    >
      <div
        className={`flex items-center gap-1 justify-center top-0 p-0.5 rounded-lg left-0 pointer-events-auto ${sidebarOpen ? "border border-transparent" : "border-border/80 dark:border-border/40 border bg-accent/25 dark:bg-accent/35"}`}
      >
        <SidebarTrigger />
        <Button
          variant="ghost"
          className={`${sidebarOpen ? "hidden" : ""} size-8`}
          size="icon"
          onClick={() => {
            navigate({ to: "/chat/$chatId", params: { chatId: "new" } });
          }}
        >
          <PlusIcon />
        </Button>
      </div>
      <div
        className={`flex items-center gap-1 justify-center top-0 right-0 p-0.5 pointer-events-auto  rounded-lg ${resizePanelOpen ? "border border-transparent translate-y-[.05rem]" : "border-border/80 dark:border-border/40 border bg-accent/25 dark:bg-accent/35"} `}
      >
        {!resizePanelOpen ? (
          <Button
            variant="ghost"
            size="icon"
            className="cursor-pointer"
            onClick={() => {
              navigate({ to: "/settings/profile" });
            }}
          >
            <Settings2Icon className="h-6 w-6" />
          </Button>
        ) : null}
        {!resizePanelOpen ? <ModeToggle /> : null}
        {isOnChatRoute && (
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
        )}
      </div>
    </div>
  );
}
