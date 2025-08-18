import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { useNavigate } from "@tanstack/react-router";
import {
  SearchIcon,
  XIcon,
  PlusIcon,
  FolderIcon,
  PinIcon,
  HistoryIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatItem } from "@/components/app-sidebar/chat-item";
import { useInfiniteChats, useSearchChats } from "@/hooks/chats/use-chats";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorState } from "@/components/ui/error-state";
import type { Doc } from "../../../convex/_generated/dataModel";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { pinnedChatsAccordionOpenAtom } from "@/store/chatStore";
import { useAtom } from "jotai";

export function AppSidebar() {
  const navigate = useNavigate();
  const { pinnedChats, historyChats, status, loadMore } = useInfiniteChats();
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    isLoadingSearch,
    isSearchError,
  } = useSearchChats();
  const loadMoreRef = React.useRef<HTMLButtonElement>(null);
  const [pinnedChatsAccordionOpen, setPinnedChatsAccordionOpen] = useAtom(
    pinnedChatsAccordionOpenAtom,
  );

  const handleNewChat = () => {
    navigate({
      to: "/chat/$chatId",
      params: {
        chatId: "new",
      },
      replace: true,
    });
  };

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
      },
    );

    observer.observe(loadMoreElement);

    return () => {
      observer.disconnect();
    };
  }, [loadMore, status]);

  // Determine whether to show search results or regular chat lists
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
      <SidebarContent className="overflow-hidden px-1.5 gap-0">
        <SidebarGroup className="gap-2">
          <Button className="w-full cursor-pointer" onClick={handleNewChat}>
            <div className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              New chat
            </div>
          </Button>

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

          <div className="flex items-center gap-2 py-1.5 border-b border-border">
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
          <SidebarGroup className="p-0">
            <Accordion
              type="single"
              collapsible
              defaultValue="pinned"
              className="w-full"
              value={pinnedChatsAccordionOpen ? "pinned" : ""}
              onValueChange={(value) => {
                setPinnedChatsAccordionOpen(value === "pinned");
              }}
            >
              <AccordionItem value="pinned" className="border-none py-1">
                <div className="flex justify-between items-center w-full">
                  <SidebarGroupLabel>
                    <PinIcon className="w-4 h-4 mr-2" />
                    Pinned
                  </SidebarGroupLabel>
                  <AccordionTrigger className="cursor-pointer p-0 mr-2" />
                </div>
                <AccordionContent className="px-2">
                  <SidebarGroupContent>
                    <div className="flex flex-col">
                      {displayPinnedChats.map((chat) => renderChatItem(chat))}
                    </div>
                  </SidebarGroupContent>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </SidebarGroup>
        )}

        <SidebarGroup className="flex-1 min-h-0 p-0">
          <SidebarGroupContent className="h-full flex flex-col">
            <SidebarGroupLabel className="flex items-center">
              {!isSearching && <HistoryIcon className="w-4 h-4 mr-2" />}
              {isSearching ? "Search Results" : "Previous Chats"}
            </SidebarGroupLabel>
            <div className="flex-1 overflow-y-auto scrollbar-none">
              <div className="flex flex-col px-2">
                {isSearching && isLoadingSearch && (
                  <div className="flex items-center justify-center py-2">
                    <LoadingSpinner
                      sizeClassName="h-4 w-4"
                      label="Searching chats..."
                    />
                  </div>
                )}
                {isSearching && isSearchError && (
                  <div className="py-2">
                    <ErrorState title="Unable to search chats" />
                  </div>
                )}
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
                {displayHistoryChats.length === 0 && !isSearching && (
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
    </Sidebar>
  );
}
