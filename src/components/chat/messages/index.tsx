import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";

export const ChatMessages = () => {
  const params = useParams({ from: "/chat_/$chatId/" });

  return (
    <ScrollArea className="flex-1 overflow-hidden">
      <div className="flex flex-col max-w-4xl mx-auto">
      </div>
    </ScrollArea>
  );
};
