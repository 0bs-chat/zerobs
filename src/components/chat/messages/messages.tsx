import { type MessageWithBranchInfo } from "../../../hooks/chats/use-messages";
import { memo, useState, useEffect } from "react";
import { UserMessage } from "./user-message";
import type { BranchNavigationProps } from "./utils-bar/branch-navigation";
import { AiMessage } from "./ai-message";
import { UtilsBar } from "./utils-bar";

export const MessagesList = memo(({ 
  groupedMessages, 
  navigateBranch 
}: {
  groupedMessages: Array<{
    input: MessageWithBranchInfo;
    response: MessageWithBranchInfo[];
  }>;
  navigateBranch: BranchNavigationProps["navigateBranch"];
}) => {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');

  useEffect(() => {
    if (editingMessageId) {
      const messageToEdit = groupedMessages.find(g => g.input.message._id === editingMessageId);
      if (messageToEdit) {
        const content = messageToEdit.input.message.message.content;
        const textContent = Array.isArray(content)
          ? (content.find(c => c.type === 'text') as { type: 'text', text: string } | undefined)?.text ?? ''
          : '';
        setEditedText(textContent);
      }
    }
  }, [editingMessageId, groupedMessages]);

  const onDone = () => {
    setEditingMessageId(null);
    setEditedText('');
  }

  return (
  <>
    {groupedMessages.map((group) => (
      <div key={group.input.message._id} className="flex flex-col gap-1">
        <div className="group flex flex-col gap-1 max-w-[80%] self-end">
          <UserMessage 
            item={group.input} 
            isEditing={editingMessageId === group.input.message._id}
            editedText={editedText}
            setEditedText={setEditedText}
          />
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <UtilsBar 
              item={group.input} 
              navigateBranch={navigateBranch} 
              isEditing={editingMessageId === group.input.message._id}
              setEditing={setEditingMessageId}
              editedText={editedText}
              onDone={onDone}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 group">
          {group.response.map((response) => (
            <div key={response.message._id} className="flex flex-col gap-1">
              <AiMessage
                item={response}
              />
            </div>
          ))}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <UtilsBar 
              item={group.response[group.response.length - 1]} 
              navigateBranch={navigateBranch} 
              setEditing={setEditingMessageId} 
              isEditing={false}
              editedText={''}
              onDone={onDone}
            />
          </div>
        </div>
      </div>
    ))}
  </>
)});

MessagesList.displayName = "MessagesList";
