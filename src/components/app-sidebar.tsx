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
import { useLocation } from "@tanstack/react-router";
import { api } from "../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";

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
  const chats = useQuery(api.chats.queries.getAll, {
    paginationOpts: { numItems: 10, cursor: null },
  });

  const restrictedRoutes = ["/auth"];
  const { pathname } = useLocation();

  if (restrictedRoutes.includes(pathname)) {
    return null;
  }

  const updateChat = useMutation(api.chats.mutations.update);
  const removeChat = useMutation(api.chats.mutations.remove);
  const createChat = useMutation(api.chats.mutations.create);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="text-center w-full items-center justify-center text-lg font-bold">
        zerobs
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="flex flex-col px-4 gap-2">
          <div className="flex flex-col">
            <Button
              variant="outline"
              className="w-full cursor-pointer"
              onClick={() => {
                createChat({ name: "New chat" });
              }}
            >
              <div className="flex items-center gap-2">
                <PlusIcon className="w-4 h-4" />
                New chat
              </div>
            </Button>
          </div>
          <div className="flex items-center border-b border-border">
            <SearchIcon className="w-4 h-4 text-muted-foreground" />
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
            {/* Pinned Chats Group */}
            {chats.page.some((chat) => chat.pinned) && (
              <SidebarGroup className=" w-full flex ">
                <SidebarGroupLabel className="flex gap-2">
                  <PinIcon className="w-4 h-4 text-muted-foreground" />
                  <div className="">Pinned</div>
                </SidebarGroupLabel>
                <SidebarGroupContent className="gap-1 px-2">
                  {chats.page
                    .filter((chat) => chat.pinned)
                    .map((chat) => (
                      <SidebarMenuButton
                        key={chat._id}
                        className="group flex group/item items-center justify-between py-5"
                      >
                        <a
                          href={`/chat/${chat._id}`}
                          className="truncate text-sm"
                        >
                          {chat.name}
                        </a>
                        <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity  duration-300">
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
                          <TrashIcon
                            className="w-4 h-4 text-muted-foreground hover:cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              removeChat({ chatId: chat._id });
                              toast.success("Chat deleted");
                            }}
                          />
                        </div>
                      </SidebarMenuButton>
                    ))}
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* History Chats Group */}
            <SidebarGroup>
              <SidebarGroupLabel className="flex gap-2">
                <div>History</div>
              </SidebarGroupLabel>
              <SidebarGroupContent className="gap-1 px-2">
                {chats.page
                  .filter((chat) => !chat.pinned)
                  .sort((a, b) => b._creationTime - a._creationTime)
                  .map((chat) => (
                    <SidebarMenuButton
                      key={chat._id}
                      className="py-5 flex items-center justify-between group/item text-foreground hover:cursor-pointer"
                      asChild
                    >
                      <a
                        href={`/chat/${chat._id}`}
                        className="flex-1 flex items-center justify-between"
                      >
                        <span className="hover:cursor-pointer truncate">
                          {chat.name}
                        </span>
                        <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200 ml-2">
                          <PinIcon
                            onClick={(e) => {
                              e.preventDefault();
                              updateChat({
                                chatId: chat._id,
                                updates: { pinned: true },
                              });
                              toast.success("Chat pinned");
                            }}
                            className="w-4 h-4 text-muted-foreground hover:cursor-pointer"
                          />
                          <TrashIcon
                            className="w-4 h-4 text-muted-foreground hover:cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              removeChat({ chatId: chat._id });
                              toast.success("Chat deleted");
                            }}
                          />
                        </div>
                      </a>
                    </SidebarMenuButton>
                  ))}
              </SidebarGroupContent>
            </SidebarGroup>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
