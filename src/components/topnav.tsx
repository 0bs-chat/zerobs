import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme-provider";
import {
  resizePanelOpenAtom,
  selectedArtifactAtom,
  sidebarOpenAtom,
  userAtom,
} from "@/store/chatStore";
import {
  LogOutIcon,
  PanelRightCloseIcon,
  SettingsIcon,
  PlusIcon,
  GithubIcon,
} from "lucide-react";
import { PanelRightOpenIcon } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Link,
  useNavigate,
  useParams,
  useLocation,
} from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect } from "react";

export function TopNav() {
  const [resizePanelOpen, setResizePanelOpen] = useAtom(resizePanelOpenAtom);
  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);
  const navigate = useNavigate();
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const selectedArtifact = useAtomValue(selectedArtifactAtom);
  const setUser = useSetAtom(userAtom);

  const { signOut } = useAuthActions();
  const user = useQuery(api.auth.getUser);

  useEffect(() => {
    if (user) {
      setUser(user);
    }
  }, [user]);

  // Check if we're on a chat route by looking for chatId parameter
  const params = useParams({ strict: false });
  const isOnChatRoute = !!params.chatId;
  const isOnNewChatRoute = useLocation().pathname === "/chat/new";

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
      className={`fixed right-0 py-2 flex items-center w-full bg-transparent justify-between pointer-events-none z-50 px-1.5`}
    >
      <div
        className={`flex items-center gap-1 justify-center top-0 p-0.5 rounded-lg left-0 pointer-events-auto ${sidebarOpen ? "border border-transparent" : "border-border/20 border bg-accent/25 dark:bg-accent/35"}`}
      >
        <SidebarTrigger />
        <Link
          to="/chat/new"
          preload="intent"
          className={`${sidebarOpen ? "hidden" : ""} size-8`}
        >
          <Button variant="ghost" size="icon" className="size-8">
            <PlusIcon />
          </Button>
        </Link>
      </div>
      <div
        className={`flex items-center gap-1 justify-center top-0 right-0 p-0.5 pointer-events-auto  rounded-lg ${resizePanelOpen ? "border border-transparent translate-y-[.05rem]" : "border-border/20 border bg-accent/25 dark:bg-accent/35"} `}
      >
        {!resizePanelOpen ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full"
              >
                <Avatar className="h-6 w-6 rounded-full cursor-pointer">
                  <AvatarImage src={user?.image} alt={user?.name ?? ""} />
                  <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  window.open("https://github.com/0bs-chat/zerobs", "_blank");
                }}
              >
                <GithubIcon />
                <span>Github</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigate({ to: "/settings" });
                }}
              >
                <SettingsIcon />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  signOut();
                  navigate({ to: "/auth" });
                  toast.success("Signed out");
                }}
              >
                <LogOutIcon />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {!resizePanelOpen ? <ModeToggle /> : null}
        {(isOnChatRoute || isOnNewChatRoute) && (
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
