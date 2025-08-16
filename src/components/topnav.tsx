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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { GithubIcon, InfoIcon, MailIcon } from "lucide-react";
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

  // Global shortcut for toggling resizable panel (Ctrl/Cmd+I)
  useEffect(() => {
    if (!isOnChatRoute) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "i" && (event.metaKey || event.ctrlKey)) {
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="cursor-pointer">
                  <InfoIcon className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={10}>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    window.open(
                      "https://github.com/0bs-chat/zerobs",
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }}
                >
                  <GithubIcon className="h-4 w-4" />
                  <span>Github</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    window.open(
                      "https://discord.gg/7bhP6cybvx",
                      "_blank",
                      "noopener,noreferrer"
                    );
                  }}
                >
                  <img
                    src="https://www.google.com/s2/favicons?sz=256&domain_url=https%3A%2F%2Fdiscord.gg%2F"
                    alt="Discord"
                    className="h-4 w-4 rounded"
                  />
                  <span>Discord</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    const currentHref = window.location.href;
                    const subject = encodeURIComponent("Feedback / Issue");
                    const body = encodeURIComponent(
                      `URL: ${currentHref}\n\nDescription:\n`
                    );
                    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=barrel@0bs.chat&su=${subject}&body=${body}`;
                    window.open(gmailUrl, "_blank", "noopener,noreferrer");
                  }}
                >
                  <MailIcon className="h-4 w-4" />
                  <span>Feedback / Issue</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            <ModeToggle />
          </>
        )}
        {isOnChatRoute && (
          <Button
            variant="ghost"
            size="icon"
            className={`${selectedArtifact ? "hidden" : ""}`}
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
