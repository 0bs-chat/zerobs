import { type MessageWithBranchInfo } from "../../../hooks/chats/use-messages";
import { memo } from "react";
import { UserMessage, type MessageBranchNavigation } from "./user-message";
import { AiMessage } from "./ai-message";

export const MessagesList = memo(({ 
  groupedMessages, 
  navigateBranch 
}: {
  groupedMessages: Array<{
    human: MessageWithBranchInfo;
    responses: MessageWithBranchInfo[];
  }>;
  navigateBranch: MessageBranchNavigation;
}) => (
  <>
    {groupedMessages.map((group) => (
      <div key={group.human.message._id} className="flex flex-col gap-1">
        <UserMessage item={group.human} navigateBranch={navigateBranch} />
        {group.responses.map((response) => (
          <AiMessage
            key={response.message._id}
            item={response}
            navigateBranch={navigateBranch}
          />
        ))}
      </div>
    ))}
  </>
));

MessagesList.displayName = "MessagesList";
