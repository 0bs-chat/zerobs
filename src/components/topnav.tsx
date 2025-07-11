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
import { useAtom, useSetAtom } from "jotai";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { useNavigate } from "@tanstack/react-router";

export function TopNav() {
  const [resizePanelOpen, setResizePanelOpen] = useAtom(resizePanelOpenAtom);
  const { data: session } = authClient.useSession();
  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);
  const navigate = useNavigate();
  const [sidebarOpen] = useAtom(sidebarOpenAtom);
  return (
    <div className="fixed right-0 py-2 px-4 flex items-center gap-4 w-full bg-transparent justify-between pointer-events-none z-50">
      <div
        className={`flex items-center gap-1 justify-center top-0 p-0.5 rounded-lg left-0 pointer-events-auto ${sidebarOpen ? "border border-transparent" : "border-border/20 border bg-accent/20 dark:bg-accent/35"}`}
      >
        <SidebarTrigger className="h-9 w-9" />
        <Button
          variant="ghost"
          className={`${sidebarOpen ? "hidden" : ""}`}
          size="icon"
          onClick={() => {
            navigate({ to: "/chat/$chatId", params: { chatId: "new" } });
          }}
        >
          <PlusIcon className="h-6 w-6" />
        </Button>
      </div>
      <div
        className={`flex items-center gap-1 justify-center top-0 right-0 p-0.5 pointer-events-auto  rounded-lg ${resizePanelOpen ? "border border-transparent" : "border-border/20 border bg-accent/20 dark:bg-accent/35"} `}
      >
        {!resizePanelOpen ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={session?.user?.image ?? ""}
                    alt={session?.user?.name ?? ""}
                  />
                  <AvatarFallback>{session?.user?.name?.[0]}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 font-mono"
              align="end"
              forceMount
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.user?.email}
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
                  authClient.signOut();
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
        <Button
          variant="ghost"
          size="icon"
          className={`${resizePanelOpen ? "bg-muted-foreground/30 dark:bg-accent" : "bg-transparent"} `}
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
