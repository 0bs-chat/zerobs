import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme-switcher";
import {
  resizePanelOpenAtom,
  selectedArtifactAtom,
  sidebarOpenAtom,
} from "@/store/chatStore";
import {
  LogOutIcon,
  PanelRightCloseIcon,
  SettingsIcon,
  PlusIcon,
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
import { useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";

export function TopNav() {
  const [resizePanelOpen, setResizePanelOpen] = useAtom(resizePanelOpenAtom);

  const user = useQuery(api.auth.getUser);
  const { signOut } = useAuthActions();

  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);
  const navigate = useNavigate();
  const [sidebarOpen] = useAtom(sidebarOpenAtom);
  const selectedArtifact = useAtomValue(selectedArtifactAtom);
  
  // Check if we're on a chat route by looking for chatId parameter
  const params = useParams({ strict: false });
  const isOnChatRoute = !!params.chatId;

  return (
    <div
      className={`fixed right-0 py-2  flex items-center w-full bg-transparent justify-between pointer-events-none z-50 px-4`}
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
            navigate({ to: "/chat/$chatId", params: { chatId: "new" } });
          }}
        >
          <PlusIcon />
        </Button>
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
                className="cursor-pointer gap-3 font-medium"
                onClick={() => {
                  navigate({ to: "/settings" });
                }}
              >
                <SettingsIcon className="h-5 w-5" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-3 font-medium"
                onClick={() => {
                  signOut();
                  navigate({ to: "/auth" });
                  toast.success("Signed out");
                }}
              >
                <LogOutIcon className="h-5 w-5" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
