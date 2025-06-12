import React from "react";
import { AIMessage } from "@langchain/core/messages";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontalIcon,
  TrashIcon,
  GitBranchIcon,
  CopyIcon,
  BrainIcon,
  RefreshCcwIcon,
  PencilIcon,
  CheckIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Markdown } from "@/components/ui/markdown/index";

interface AIMessageProps {
  message: AIMessage;
  isStreaming?: boolean;
}

export const AIMessageComponent = React.memo(({
  message,
  isStreaming = false,
}: AIMessageProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  
  const content = React.useMemo(() => {
    return typeof message.content === "string"
      ? message.content
      : Array.isArray(message.content)
      ? message.content
          .map((item: any) => (item.type === "text" ? item.text : ""))
          .join("")
      : String(message.content);
  }, [message.content]);
  
  const reasoning = message.additional_kwargs?.reasoning_content as
    | string
    | undefined;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className="flex flex-col w-full gap-1 group">
      {reasoning && (
        <Accordion
          type="single"
          collapsible
          className="mt-4"
        >
          <AccordionItem value="reasoning" className="border-none">
            <AccordionTrigger className="py-2 text-sm text-muted-foreground hover:text-foreground">
              <div className="flex items-center gap-2">
                <BrainIcon className="w-4 h-4" />
                View reasoning
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="bg-background/50 rounded-md p-3 border">
                <Markdown
                  content={reasoning}
                  className="text-sm text-muted-foreground"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
      <Markdown content={content} />
      {!isStreaming && (
        <div
          className={`flex flex-row items-center justify-start ${
            isDropdownOpen
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          } transition-opacity duration-100 gap-1`}
        >
          <Button variant="ghost" size="icon">
            <RefreshCcwIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyText}
            className={copied ? "text-green-500" : ""}
          >
            {copied ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              <CopyIcon className="w-4 h-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon">
            <GitBranchIcon className="w-4 h-4" />
          </Button>
          <DropdownMenu onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontalIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem>
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit message
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
});

AIMessageComponent.displayName = "AIMessageComponent"; 