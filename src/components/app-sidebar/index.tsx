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
import { Link, useNavigate } from "@tanstack/react-router";
import { SearchIcon, XIcon, PlusIcon, FolderIcon } from "lucide-react";
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

  const handleNavigateToProjects = () => {
    navigate({
      to: "/projects",
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
      <SidebarHeader className="flex items-center w-full font-bold font-mono text-xl py-3.5 px-2">
        0bs
      </SidebarHeader>
      <SidebarContent className="overflow-hidden gap-0 px-1">
        <SidebarGroup className="gap-2">
          <Link to="/chat/new" preload="intent">
            <Button className="w-full cursor-pointer">
              <div className="flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                New chat
              </div>
            </Button>
          </Link>

          <Button
            variant="outline"
            className="w-full cursor-pointer"
            onClick={handleNavigateToProjects}
          >
            <div className="flex items-center gap-2">
              <FolderIcon className="w-4 h-4" />
              Projects
            </div>
          </Button>

          <div className="flex items-center border-b border-border gap-2">
            <span className="flex items-center justify-center">
              <SearchIcon className="w-4 h-4 text-muted-foreground" />
            </span>
            <Input
              placeholder="Search chats"
              className="flex-1 bg-transparent border-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none text-base px-0"
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
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSearchQuery("")}
                className="flex items-center justify-center size-5"
                tabIndex={-1}
              >
                <XIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </SidebarGroup>

        {displayPinnedChats.length > 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarGroupLabel>Pinned</SidebarGroupLabel>
              <div className="flex flex-col">
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
              <div className="flex flex-col">
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
