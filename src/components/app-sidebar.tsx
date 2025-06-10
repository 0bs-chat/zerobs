import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarGroupContent,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Navigate, useNavigate, useParams } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  PinIcon,
  PinOffIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import React, { useMemo, useCallback } from "react";
import type { Id } from "convex/_generated/dataModel";

function ChatItem({
  chat,
  isPinned,
  selected,
  onNavigate,
  onPin,
  onUnpin,
  onDelete,
}: {
  chat: any;
  isPinned: boolean;
  selected: boolean;
  onNavigate: (chatId: string) => void;
  onPin: (chatId: string) => void;
  onUnpin: (chatId: string) => void;
  onDelete: (chatId: string) => void;
}) {
  const handleNavigate = useCallback(() => {
    onNavigate(chat._id);
  }, [onNavigate, chat._id]);

  const handlePin = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onPin(chat._id);
    },
    [onPin, chat._id]
  );

  const handleUnpin = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onUnpin(chat._id);
    },
    [onUnpin, chat._id]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(chat._id);
    },
    [onDelete, chat._id]
  );

  return (
    <SidebarMenuButton
      key={chat._id}
      className={`py-2.5 flex items-center justify-between group/item text-foreground cursor-pointer hover:transition-all hover:duration-300 hover:bg-muted ${
        selected ? "bg-muted" : ""
      }`}
      asChild
    >
      <div
        onClick={handleNavigate}
        className={`flex-1 flex items-center justify-between truncate text-sm`}
      >
        <span className="truncate">{chat.name}</span>
        <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity-[0s,0.3s] duration-0 group-hover/item:duration-300 ml-2">
          {isPinned ? (
            <PinOffIcon
              className="w-4 h-4 text-muted-foreground hover:cursor-pointer"
              onClick={handleUnpin}
            />
          ) : (
            <PinIcon
              className="w-4 h-4 text-muted-foreground hover:cursor-pointer"
              onClick={handlePin}
            />
          )}
          <TrashIcon
            className="w-4 h-4 text-muted-foreground hover:cursor-pointer"
            onClick={handleDelete}
          />
        </div>
      </div>
    </SidebarMenuButton>
  );
}

export function AppSidebar() {
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }

  const chats = useQuery(api.chats.queries.getAll, {
    paginationOpts: { numItems: 10, cursor: null },
  });

  const selectedChatId = useParams({ strict: false }).chatId;

  const updateChat = useMutation(api.chats.mutations.update);
  const removeChat = useMutation(api.chats.mutations.remove);

  // Memoize grouped chats
  const groupedChats = useMemo(() => {
    if (!chats) return { pinned: [], history: [] };
    const pinned = chats.page.filter((chat) => chat.pinned);
    const history = chats.page.filter((chat) => !chat.pinned);
    return { pinned, history };
  }, [chats]);

  // Memoize handlers
  const handleNavigate = useCallback(
    (chatId: string) => {
      navigate({
        to: "/chat/$chatId",
        params: { chatId },
      });
    },
    [navigate]
  );

  const handlePin = useCallback(
    (chatId: string) => {
      updateChat({
        chatId: chatId as Id<"chats">,
        updates: { pinned: true },
      });
      toast.success("Chat pinned");
    },
    [updateChat]
  );

  const handleUnpin = useCallback(
    (chatId: string) => {
      updateChat({
        chatId: chatId as Id<"chats">,
        updates: { pinned: false },
      });
      toast.success("Chat unpinned");
    },
    [updateChat]
  );

  const handleDelete = useCallback(
    (chatId: string) => {
      navigate({
        to: "/chat/$chatId",
        params: { chatId: "new" },
        replace: true,
      });
      removeChat({ chatId: chatId as Id<"chats"> });
      toast.success("Chat deleted");
    },
    [navigate, removeChat]
  );

  const handleNewChat = useCallback(() => {
    navigate({
      to: "/chat/$chatId",
      params: { chatId: "new" },
      replace: true,
    });
  }, [navigate]);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="flex items-center justify-end w-full  font-bold text-xl py-3">
        0bs
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="flex flex-col px-4 gap-2">
          <div className="flex flex-col">
            <Button
              variant="default"
              className="w-full cursor-pointer"
              onClick={handleNewChat}
            >
              <div className="flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                New chat
              </div>
            </Button>
          </div>
          <div className="flex items-center border-b border-border">
            <SearchIcon className="w-4 h-4 text-foreground" />
            <Input
              placeholder="Search chats"
              className="border-none focus-visible:border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              type="text"
              style={{ backgroundColor: "transparent" }}
            />
          </div>
        </SidebarGroup>

        {chats && (
          <div className="flex flex-col">
            {(["pinned", "history"] as const).map((group) => {
              const groupChats = groupedChats[group];
              const isPinned = group === "pinned";
              if (isPinned && groupChats.length === 0) return null;

              return (
                <SidebarGroup
                  key={group}
                  className={isPinned ? "w-full flex" : undefined}
                >
                  <SidebarGroupLabel className="flex items-center gap-2">
                    {isPinned ? (
                      <>
                        <PinIcon className="w-4 h-4 text-muted-foreground" />
                        <div>Pinned</div>
                      </>
                    ) : (
                      <div>History</div>
                    )}
                  </SidebarGroupLabel>
                  <SidebarGroupContent className="flex flex-col gap-1 px-2">
                    {groupChats.map((chat) => (
                      <ChatItem
                        key={chat._id}
                        chat={chat}
                        isPinned={isPinned}
                        selected={chat._id === selectedChatId}
                        onNavigate={handleNavigate}
                        onPin={handlePin}
                        onUnpin={handleUnpin}
                        onDelete={handleDelete}
                      />
                    ))}
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })}
          </div>
        )}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
