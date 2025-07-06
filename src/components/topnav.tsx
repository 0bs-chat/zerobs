import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/theme-switcher";
import { resizePanelOpenAtom, selectedArtifactAtom } from "@/store/chatStore";
import { LogOutIcon, PanelRightCloseIcon } from "lucide-react";
import { PanelRightOpenIcon } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth, useUser } from "@clerk/clerk-react";
import { toast } from "sonner";
import { useAtom } from "jotai";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function TopNav() {
  const [resizePanelOpen, setResizePanelOpen] = useAtom(resizePanelOpenAtom);
  const { signOut } = useAuth();
  const { user } = useUser();
  const [selectedArtifact, setSelectedArtifact] = useAtom(selectedArtifactAtom);

  return (
    <div className="fixed right-0 py-2.5 px-4 flex items-center gap-4 w-full bg-transparent justify-between pointer-events-none z-50">
      <div className="flex items-center gap-2 justify-center top-0 left-0 pointer-events-auto">
        <SidebarTrigger className="h-8 w-8" />
      </div>
      <div className="flex items-center gap-2 justify-center top-0 right-0 pointer-events-auto">
        {!resizePanelOpen ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user?.imageUrl}
                    alt={user?.fullName ?? ""}
                  />
                  <AvatarFallback>{user?.fullName?.[0]}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.fullName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  signOut();
                  toast.success("Signed out");
                }}
              >
                <LogOutIcon className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        {!resizePanelOpen ? <ModeToggle /> : null}
        <Button
          variant="ghost"
          size="icon"
          className={`${resizePanelOpen ? "bg-muted-foreground/30 dark:bg-accent" : "bg-background"} ${selectedArtifact ? "hidden" : ""}`}
          onClick={() => {
            setResizePanelOpen(!resizePanelOpen);
            setSelectedArtifact(null);
          }}
        >
          {resizePanelOpen ? (
            <PanelRightCloseIcon className="h-5 w-5" />
          ) : (
            <PanelRightOpenIcon className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
