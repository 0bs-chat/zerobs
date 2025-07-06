import { memo, useState, useEffect } from "react";
import { UserMessage } from "./user-message";
import { AiMessage } from "./ai-message";
import { UtilsBar } from "./utils-bar";
import { useAtomValue } from "jotai";
import { groupedMessagesAtom } from "@/store/chatStore";
import type { NavigateBranch } from "@/hooks/chats/use-messages";

export const MessagesList = memo(
  ({ navigateBranch }: { navigateBranch: NavigateBranch }) => {
    const groupedMessages = useAtomValue(groupedMessagesAtom);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
      null,
    );
    const [editedText, setEditedText] = useState("");

    useEffect(() => {
      if (editingMessageId) {
        const messageToEdit = groupedMessages?.find(
          (g) => g.input.message._id === editingMessageId,
        );
        if (messageToEdit) {
          const content = messageToEdit.input.message.message.content;
          const textContent = Array.isArray(content)
            ? ((
                content.find((c) => c.type === "text") as
                  | { type: "text"; text: string }
                  | undefined
              )?.text ?? "")
            : "";
          setEditedText(textContent);
        }
      }
    }, [editingMessageId, groupedMessages]);

    const onDone = () => {
      setEditingMessageId(null);
      setEditedText("");
    };

    return (
      <>
        {groupedMessages?.map((group) => (
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
                  isEditing={editingMessageId === group.input.message._id}
                  setEditing={setEditingMessageId}
                  editedText={editedText}
                  onDone={onDone}
                  navigateBranch={navigateBranch!}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1 group">
              {group.response.map((response) => {
                return <AiMessage item={response} />;
              })}
              {group.response.length > 0 && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <UtilsBar
                    item={group.input}
                    isAI={true}
                    navigateBranch={navigateBranch!}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </>
    );
  },
);

MessagesList.displayName = "MessagesList";
