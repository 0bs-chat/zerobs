import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { useNavigate } from "@tanstack/react-router";
import { SearchIcon, XIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfiniteScrollArea } from "@/components/ui/infinite-scroll-area";
import { ChatItem } from "@/components/app-sidebar/chat-item";
import { useInfiniteChats, useSearchChats } from "@/hooks/chats/use-chats";
import type { Doc } from "../../../convex/_generated/dataModel";

export function AppSidebar() {
  const navigate = useNavigate();

  const {
    chats,
    isFetching,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    error,
  } = useInfiniteChats();
  const { searchQuery, setSearchQuery } = useSearchChats();

  const handleNewChat = () => {
    navigate({
      to: "/chat/$chatId",
      params: {
        chatId: "new",
      },
      replace: true,
    });
  };

  const pinnedChats = chats?.filter((chat) => chat.pinned);
  const historyChats = chats?.filter((chat) => !chat.pinned);

  const renderChatItem = (chat: Doc<"chats">) => {
    return <ChatItem key={chat._id} chat={chat} isPinned={chat.pinned} />;
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="flex items-center w-full font-bold text-xl py-3">
        0bs
      </SidebarHeader>
      <SidebarContent className="gap-2 h-full flex flex-col">
        <SidebarGroup className="flex flex-col gap-2">
          <div className="flex flex-col px-2">
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

        {pinnedChats && pinnedChats.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent className="flex flex-col gap-1">
              <div className="flex flex-col gap-1">
                <SidebarGroupLabel>Pinned</SidebarGroupLabel>
                {pinnedChats && (
                  <InfiniteScrollArea
                    className="px-1.5"
                    data={pinnedChats}
                    error={error}
                    isFetching={isFetching}
                    isFetchingNextPage={isFetchingNextPage}
                    fetchNextPage={fetchNextPage}
                    hasNextPage={hasNextPage}
                    renderItem={renderChatItem}
                    emptyMessage="No pinned chats"
                    errorMessage="Error loading pinned chats"
                  />
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-1">
            <SidebarGroupLabel>History</SidebarGroupLabel>
            <div className="flex flex-col gap-1">
              {historyChats && (
                <InfiniteScrollArea
                  className="px-1.5"
                  data={historyChats}
                  error={error}
                  isFetching={isFetching}
                  isFetchingNextPage={isFetchingNextPage}
                  fetchNextPage={fetchNextPage}
                  hasNextPage={hasNextPage}
                  renderItem={renderChatItem}
                  emptyMessage="No chat history"
                  errorMessage="Error loading chat history"
                />
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
