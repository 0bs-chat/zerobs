import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GripVertical, X, Edit2, Check, ArrowUp, ArrowDown } from "lucide-react";
import { useMessageQueue, type QueueMessage } from "@/hooks/chats/use-message-queue";
import type { Doc } from "../../../../convex/_generated/dataModel";

interface MessageQueueProps {
  chatId: string;
  chat: Doc<"chats">;
  onSendMessage: (chat: Doc<"chats">, text: string, documents: Array<Doc<"documents">["_id"]>) => Promise<void>;
}

export const MessageQueue = ({ chatId, chat, onSendMessage }: MessageQueueProps) => {
  const { getQueue, updateMessage, reorderMessage, removeMessage } = useMessageQueue();
  const queue = getQueue(chatId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  if (queue.length === 0) return null;

  const handleEdit = (message: QueueMessage) => {
    setEditingId(message.id);
    setEditingText(message.text);
  };

  const handleSaveEdit = (messageId: string) => {
    updateMessage(chatId, messageId, { text: editingText });
    setEditingId(null);
    setEditingText("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingText("");
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderMessage(chatId, index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < queue.length - 1) {
      reorderMessage(chatId, index, index + 1);
    }
  };

  const handleSendNow = async (message: QueueMessage) => {
    await onSendMessage(chat, message.text, message.documents);
    removeMessage(chatId, message.id);
  };

  return (
    <div className="px-2 pt-2">
      <div className="flex flex-col gap-2">
        {queue.map((message, index) => (
          <div
            key={message.id}
            className="group flex items-start gap-2 rounded-md border p-2 bg-muted/30"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground mt-1" />
            
            <div className="flex-1">
              {editingId === message.id ? (
                <textarea
                  className="w-full resize-none bg-transparent outline-none text-sm"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveEdit(message.id);
                    } else if (e.key === "Escape") {
                      handleCancelEdit();
                    }
                  }}
                  rows={1}
                  autoFocus
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm">{message.text}</div>
              )}
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingId === message.id ? (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleSaveEdit(message.id)}
                    title="Save"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(message)}
                    title="Edit"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={index === 0}
                    onClick={() => handleMoveUp(index)}
                    title="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={index === queue.length - 1}
                    onClick={() => handleMoveDown(index)}
                    title="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeMessage(chatId, message.id)}
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSendNow(message)}
                  >
                    Send now
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
