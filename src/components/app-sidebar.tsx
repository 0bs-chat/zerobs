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
import { useConvexAuth, useMutation } from "convex/react";
import {
  PinIcon,
  PinOffIcon,
  PlusIcon,
  SearchIcon,
  TrashIcon,
  LoaderIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import React, { useCallback } from "react";
import type { Id, Doc } from "convex/_generated/dataModel";
import InfiniteScroll from "./ui/infinite-scroll-area";
import { useInfiniteChats, useSearchChats } from "@/hooks/use-chats";

const ChatItem = React.forwardRef<
  HTMLDivElement,
  {
    chat: Doc<"chats">;
    isPinned: boolean;
    selected: boolean;
    onNavigate: (chatId: string) => void;
    onPin: (chatId: string) => void;
    onUnpin: (chatId: string) => void;
    onDelete: (chatId: string) => void;
  }
>(function ChatItem(
  {
    chat,
    isPinned,
    selected,
    onNavigate,
    onPin,
    onUnpin,
    onDelete,
  },
  ref
) {
  const handleNavigate = useCallback(() => {
    onNavigate(chat._id);
  }, [onNavigate, chat._id]);

  const handlePin = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onPin(chat._id);
    },
    [onPin, chat._id],
  );

  const handleUnpin = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onUnpin(chat._id);
    },
    [onUnpin, chat._id],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete(chat._id);
    },
    [onDelete, chat._id],
  );

  return (
    <div ref={ref}>
      <SidebarMenuButton
        key={chat._id}
        className={`py-5 group/item cursor-pointer ${
          selected ? "bg-muted" : ""
        }`}
        asChild
        onClick={handleNavigate}
      >
        <div className="relative flex w-full items-center justify-between overflow-hidden">
          <span className="truncate">{chat.name}</span>
          <div className="absolute inset-y-0 right-0 z-10 flex items-center justify-end gap-2 bg-gradient-to-l from-background via-background/80 to-transparent pl-8 pr-1 text-muted-foreground transition-transform duration-200 group-hover/item:translate-x-0 translate-x-full">
            {isPinned ? (
              <PinOffIcon
                className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
                onClick={handleUnpin}
              />
            ) : (
              <PinIcon
                className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
                onClick={handlePin}
              />
            )}
            <TrashIcon
              className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
              onClick={handleDelete}
            />
          </div>
        </div>
      </SidebarMenuButton>
    </div>
  );
});

export function AppSidebar() {
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }

  const { groupedChats, hasMore, isLoading, loadMore } = useInfiniteChats();
  const { searchQuery, setSearchQuery, searchResults, isSearching } = useSearchChats();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const selectedChatId = useParams({ strict: false }).chatId;

  const updateChat = useMutation(api.chats.mutations.update);
  const removeChat = useMutation(api.chats.mutations.remove);

  const handleNavigate = (chatId: string) => {
    navigate({
      to: "/chat/$chatId",
      params: { chatId },
    });
  };

  const handlePin = (chatId: string) => {
    updateChat({
      chatId: chatId as Id<"chats">,
      updates: { pinned: true },
    });
    toast.success("Chat pinned");
  };

  const handleUnpin = (chatId: string) => {
    updateChat({
      chatId: chatId as Id<"chats">,
      updates: { pinned: false },
    });
    toast.success("Chat unpinned");
  };

  const handleDelete = (chatId: string) => {
    navigate({
      to: "/chat/$chatId",
      params: { chatId: "new" },
      replace: true,
    });
    removeChat({ chatId: chatId as Id<"chats"> });
    toast.success("Chat deleted");
  };

  const handleNewChat = () => {
    navigate({
      to: "/chat/$chatId",
      params: { chatId: "new" },
      replace: true,
    });
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="flex items-center w-full font-bold text-xl py-3">
        0bs
      </SidebarHeader>
      <SidebarContent className="gap-0">
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
          <div className="flex items-center border-b border-border relative">
            <SearchIcon className="w-4 h-4 text-foreground ml-2" />
            <Input
              placeholder="Search chats"
              className="border-none focus-visible:border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pl-2 pr-8"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchQuery("");
                  e.currentTarget.blur();
                }
              }}
              style={{ backgroundColor: "transparent" }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </SidebarGroup>

        <div className="flex flex-col flex-1 overflow-hidden">
          {searchQuery.trim() ? (
            // Show search results
            <SidebarGroup className="flex-1 overflow-hidden">
              <SidebarGroupContent className="flex flex-col gap-1 px-2">
                <div 
                  ref={scrollContainerRef}
                  className="flex-1 overflow-y-auto min-h-0 max-h-[calc(100vh-1rem)]"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {searchResults.length > 0 ? (
                    searchResults.map((chat) => (
                      <ChatItem
                        key={chat._id}
                        chat={chat}
                        isPinned={chat.pinned || false}
                        selected={chat._id === selectedChatId}
                        onNavigate={handleNavigate}
                        onPin={handlePin}
                        onUnpin={handleUnpin}
                        onDelete={handleDelete}
                      />
                    ))
                  ) : !isSearching ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                      No chats found for "{searchQuery}"
                    </div>
                  ) : null}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : (
            // Show regular grouped chats
            (["pinned", "history"] as const).map((group) => {
              const groupChats = groupedChats[group];
              const isPinned = group === "pinned";
              if (isPinned && groupChats.length === 0) return null;

              return (
                <SidebarGroup
                  key={group}
                  className={isPinned ? "w-full flex" : "flex-1 overflow-hidden"}
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
                    {group === "history" ? (
                      <div 
                        ref={scrollContainerRef}
                        className="flex-1 overflow-y-auto min-h-0 max-h-[calc(100vh-1rem)]"
                        style={{ scrollbarWidth: 'none' }}
                      >
                        <InfiniteScroll
                          isLoading={isLoading}
                          hasMore={hasMore}
                          next={loadMore}
                          threshold={0.8}
                          root={scrollContainerRef.current}
                        >
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
                        </InfiniteScroll>
                        {isLoading && hasMore && (
                          <div className="flex items-center justify-center py-4">
                            <LoaderIcon className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    ) : (
                      groupChats.map((chat) => (
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
                      ))
                    )}
                  </SidebarGroupContent>
                </SidebarGroup>
              );
            })
          )}
        </div>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
