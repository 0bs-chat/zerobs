import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useNavigate } from "@tanstack/react-router";
import { ClockIcon, MessageSquareOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ProjectChatListProps {
  projectId: Id<"projects">;
}

export const ProjectChatList = ({ projectId }: ProjectChatListProps) => {
  const navigate = useNavigate();
  const { data: chats } = useQuery({
    ...convexQuery(api.chats.queries.getByProjectId, { projectId }),
  });

  if (!chats || chats.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <MessageSquareOff className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            No chats found for this project
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a new chat to see it here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-[calc(100vh-3rem)] overflow-y-auto">
      <div className="text-sm text-muted-foreground py-2 font-medium">
        Project related chats
      </div>
      <div className="flex flex-col gap-2">
        {chats.map((chat) => (
          <Card
            key={chat._id}
            className="p-4 cursor-pointer hover:bg-accent dark:hover:bg-accent/50 transition-colors border dark:border-border/60"
            onClick={() => {
              navigate({ to: "/chat/$chatId", params: { chatId: chat._id } });
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-sm">{chat.name}</h3>
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <ClockIcon className="w-3 h-3" />
                  <span>
                    {formatDistanceToNow(chat._creationTime, {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
              {chat.pinned && (
                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  Pinned
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
