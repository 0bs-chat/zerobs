import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme-provider";
import {
  resizePanelOpenAtom,
  selectedArtifactAtom,
  selectedVibzMcpAtom,
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
import { GearIcon } from "@radix-ui/react-icons";

export function TopNav() {
  const [resizePanelOpen, setResizePanelOpen] = useAtom(resizePanelOpenAtom);
  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);
  const navigate = useNavigate();
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const selectedArtifact = useAtomValue(selectedArtifactAtom);
  const selectedVibzMcp = useAtomValue(selectedVibzMcpAtom);
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

  // Global shortcut for toggling resizable panel (Ctrl/Cmd+I)
  useEffect(() => {
    if (!isOnChatRoute) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !event.repeat &&
        event.key === "i" &&
        (event.metaKey || event.ctrlKey)
      ) {
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
      className={`fixed right-0 py-2 flex items-center w-full bg-transparent justify-between pointer-events-none text-foreground/70 z-50 px-1.5 ${isSettingsRoute ? "hidden" : ""}`}
    >
      <div
        className={`flex items-center gap-1 justify-center top-0 p-0.5 rounded-lg left-0 pointer-events-auto ${sidebarOpen ? "border border-transparent" : "border-border/40 border bg-accent dark:bg-primary/10 backdrop-blur-sm"}`}
      >
        <SidebarTrigger />
        <Button
          variant="ghost"
          className={`${sidebarOpen ? "hidden" : ""} size-8 cursor-pointer`}
          size="icon"
          onClick={() => {
            navigate({ to: "/chat/$chatId", params: { chatId: "new" } });
          }}
        >
          <PlusIcon />
        </Button>
      </div>
      <div
        className={`flex items-center gap-1 justify-center top-0 right-0 p-0.5 pointer-events-auto  rounded-lg ${resizePanelOpen ? "border border-transparent translate-y-[.05rem]" : "bg-accent dark:bg-primary/10 backdrop-blur-sm border-border/40 border"} `}
      >
        {!resizePanelOpen && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="cursor-pointer"
              onClick={() => {
                navigate({ to: "/settings/profile" });
              }}
            >
              <GearIcon className="h-6 w-6" />
            </Button>
            <ModeToggle />
          </>
        )}
        {isOnChatRoute && (
          <Button
            variant="ghost"
            size="icon"
            className={`${selectedArtifact || selectedVibzMcp ? "hidden" : ""}`}
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
