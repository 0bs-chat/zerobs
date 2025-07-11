import * as React from "react";
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
import { ChatItem } from "@/components/app-sidebar/chat-item";
import { useInfiniteChats, useSearchChats } from "@/hooks/chats/use-chats";
import type { Doc } from "../../../convex/_generated/dataModel";

export function AppSidebar() {
  const navigate = useNavigate();
  const { pinnedChats, historyChats, status, loadMore } = useInfiniteChats();
  const { searchQuery, setSearchQuery, searchResults } = useSearchChats();
  const loadMoreRef = React.useRef<HTMLButtonElement>(null);

  const handleNewChat = () => {
    navigate({
      to: "/chat/$chatId",
      params: {
        chatId: "new",
      },
      replace: true,
    });
  };

  const renderChatItem = (chat: Doc<"chats">) => {
    return <ChatItem key={chat._id} chat={chat} isPinned={chat.pinned} />;
  };

  // Auto-load more when the load more button comes into view
  React.useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    if (!loadMoreElement || status !== "CanLoadMore") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          loadMore(15);
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      }
    );

    observer.observe(loadMoreElement);

    return () => {
      observer.disconnect();
    };
  }, [loadMore, status]);

  // Determine whether to show search results or regular chat lists
  const isSearching = searchQuery.trim().length > 0;
  const searchPinnedChats = isSearching
    ? searchResults.filter((chat) => chat.pinned)
    : [];
  const searchHistoryChats = isSearching
    ? searchResults.filter((chat) => !chat.pinned)
    : [];

  const displayPinnedChats = isSearching ? searchPinnedChats : pinnedChats;
  const displayHistoryChats = isSearching ? searchHistoryChats : historyChats;

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="flex items-center w-full font-bold text-xl py-3.5 px-2">
        0bs
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="flex flex-col gap-2">
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
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {displayPinnedChats.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarGroupLabel>Pinned</SidebarGroupLabel>
              <div className="flex flex-col gap-1">
                {displayPinnedChats.map((chat) => renderChatItem(chat))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup className="flex-1 min-h-0">
          <SidebarGroupContent className="h-full flex flex-col">
            <SidebarGroupLabel>
              {isSearching ? "Search Results" : "History"}
            </SidebarGroupLabel>
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <div className="flex flex-col gap-1">
                {displayHistoryChats.map((chat) => renderChatItem(chat))}
                {!isSearching && status === "CanLoadMore" && (
                  <Button
                    ref={loadMoreRef}
                    variant="ghost"
                    className="w-full mt-2"
                    onClick={() => loadMore(15)}
                  >
                    Load More
                  </Button>
                )}
                {displayHistoryChats.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    {isSearching
                      ? "No matching chats found"
                      : "No chat history"}
                  </div>
                )}
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
}
