"use client";
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
  const createChat = useMutation(api.chats.mutations.create);
  const createChatInput = useMutation(api.chatInput.mutations.create);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="text-center w-full items-center justify-center text-lg font-bold">
        zerobs
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="flex flex-col px-4 gap-2">
          <div className="flex flex-col">
            <Button
              variant="default"
              className="w-full cursor-pointer"
              onClick={() => {
                createChat({ name: "New chat" }).then((newChatId) => {
                  createChatInput({
                    chatId: newChatId,
                    agentMode: false,
                    plannerMode: false,
                    webSearch: false,
                  });
                });
              }}
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
            {["pinned", "history"].map((group) => {
              // Filter chats based on group
              const isPinned = group === "pinned";
              const groupChats = chats.page
                .filter((chat) => (isPinned ? chat.pinned : !chat.pinned))
                .sort((a, b) =>
                  isPinned ? 0 : b._creationTime - a._creationTime
                );

              // Don't render pinned group if no pinned chats
              if (isPinned && groupChats.length === 0) return null;

              return (
                <SidebarGroup
                  key={group}
                  className={isPinned ? "w-full flex" : undefined}
                >
                  <SidebarGroupLabel className="flex items-center gap-2">
                    {isPinned && (
                      <>
                        <PinIcon className="w-4 h-4 text-muted-foreground" />
                        <div>Pinned</div>
                      </>
                    )}
                    {!isPinned && <div>History</div>}
                  </SidebarGroupLabel>
                  <SidebarGroupContent className="flex flex-col gap-1 px-2">
                    {groupChats.map((chat) => (
                      <SidebarMenuButton
                        key={chat._id}
                        className={`py-2.5 flex items-center justify-between group/item text-foreground cursor-pointer hover:transition-all hover:duration-300 hover:bg-muted ${
                          chat._id === selectedChatId ? "bg-muted" : ""
                        }`}
                        asChild
                      >
                        <div
                          onClick={() => {
                            navigate({
                              to: "/chat/$chatId",
                              params: { chatId: chat._id },
                            });
                          }}
                          className={`flex-1 flex items-center justify-between truncate text-sm`}
                        >
                          <span className="truncate">{chat.name}</span>
                          <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 ml-2">
                            {isPinned ? (
                              <PinOffIcon
                                className="w-4 h-4 text-muted-foreground hover:cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  updateChat({
                                    chatId: chat._id,
                                    updates: { pinned: false },
                                  });
                                  toast.success("Chat unpinned");
                                }}
                              />
                            ) : (
                              <PinIcon
                                className="w-4 h-4 text-muted-foreground hover:cursor-pointer"
                                onClick={(e) => {
                                  e.preventDefault();
                                  updateChat({
                                    chatId: chat._id,
                                    updates: { pinned: true },
                                  });
                                  toast.success("Chat pinned");
                                }}
                              />
                            )}
                            <TrashIcon
                              className="w-4 h-4 text-muted-foreground hover:cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate({ to: "/" });
                                removeChat({ chatId: chat._id });
                                toast.success("Chat deleted");
                              }}
                            />
                          </div>
                        </div>
                      </SidebarMenuButton>
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
