import * as React from "react";
import { PinIcon, PinOffIcon, TrashIcon } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import type { Doc } from "../../../convex/_generated/dataModel";
import { chatHandlers } from "@/hooks/chats/use-chats";
import { cn } from "@/lib/utils";
import { useAtomValue } from "jotai";
import { chatIdAtom } from "@/store/chatStore";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface ChatItemProps {
  chat: Doc<"chats">;
  isPinned: boolean;
}

export const ChatItem = React.forwardRef<HTMLDivElement, ChatItemProps>(
  function ChatItem({ chat, isPinned }, ref) {
    const {
      handleNavigate,
      handlePin,
      handleUnpin,
      handleDelete,
      handleSelect,
    } = chatHandlers();
    const currentChatId = useAtomValue(chatIdAtom);
    const isSelected = currentChatId === chat._id;

    // Rename dialog state
    const [renameOpen, setRenameOpen] = React.useState(false);
    const [newName, setNewName] = React.useState(chat.name);
    const [loading, setLoading] = React.useState(false);
    const updateChatMutation = useMutation(api.chats.mutations.update);

    const handleRename = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      setLoading(true);
      try {
        await updateChatMutation({
          chatId: chat._id,
          updates: { name: newName },
        });
        setRenameOpen(false);
      } finally {
        setLoading(false);
      }
    };

    React.useEffect(() => {
      setNewName(chat.name);
    }, [chat.name]);

    return (
      <>
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <SidebarMenuButton
              key={chat._id}
              className="py-2 group/item cursor-pointer w-full h-full"
              asChild
              onClick={() => {
                handleNavigate(chat._id);
                handleSelect(chat._id);
              }}
            >
              <div
                ref={ref}
                className={cn(
                  "relative flex w-full items-center isolate justify-between overflow-hidden rounded-md",
                  isSelected && "bg-secondary/50",
                )}
              >
                <span className="truncate">{chat.name}</span>
                <div className="absolute inset-y-0 right-0 z-10 flex items-center justify-end gap-2 bg-gradient-to-l from-background via-background/80 to-transparent pl-8 pr-1 text-muted-foreground transition-transform duration-200 group-hover/item:translate-x-0 translate-x-full">
                  {isPinned ? (
                    <PinOffIcon
                      className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnpin(chat._id);
                      }}
                    />
                  ) : (
                    <PinIcon
                      className="h-4 hover:text-secondary-foreground w-4 text-muted-foreground hover:cursor-pointer z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePin(chat._id);
                      }}
                    />
                  )}
                  <TrashIcon
                    className="h-4 hover:text-destructive w-4 text-muted-foreground hover:cursor-pointer z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(chat._id);
                    }}
                  />
                </div>
              </div>
            </SidebarMenuButton>
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onClick={() => setRenameOpen(true)}>
              Rename
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent>
            <form onSubmit={handleRename} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Rename Chat</DialogTitle>
                <DialogDescription>
                  Enter a new name for this chat.
                </DialogDescription>
              </DialogHeader>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                disabled={loading}
                maxLength={100}
                placeholder="Chat name"
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRenameOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !newName.trim()}>
                  {loading ? "Renaming..." : "Rename"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  },
);
