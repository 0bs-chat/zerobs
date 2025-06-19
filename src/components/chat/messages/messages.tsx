import React, { useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery, useAction } from "convex/react";
import {
  HumanMessage,
  AIMessage,
  ToolMessage,
  BaseMessage,
} from "@langchain/core/messages";
import {
  UserMessageComponent,
  AIMessageComponent,
  ToolMessageComponent,
  PlanningSteps,
} from ".";
import { useCheckpointParser } from "@/hooks/chats/use-chats";
import { useStream } from "@/hooks/chats/use-stream";
import { AIToolUtilsBar, UserUtilsBar } from "./UtilsBar";
import {
  useStreamAtom,
  useCheckpointParserAtom,
  documentDialogOpenAtom,
  documentDialogDocumentIdAtom,
} from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { Document, type DocumentInterface } from "@langchain/core/documents";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BanIcon, CircleXIcon, ExternalLinkIcon, FileIcon } from "lucide-react";
import { Favicon } from "@/components/ui/favicon";
import { Markdown } from "@/components/ui/markdown";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getTagInfo } from "@/lib/helpers";

const MessageSources = ({ documents }: { documents: Document[] }) => {
  if (!documents || documents.length === 0) return null;

  const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);
  const setDocumentDialogDocumentId = useSetAtom(documentDialogDocumentIdAtom);

  const extractUrlFromTavilyContent = (content: string): string | null => {
    const urlMatch = content.match(/https?:\/\/[^\s\n]+/);
    return urlMatch ? urlMatch[0] : null;
  };

  const MemoizedConvexDocument = React.memo(({ doc }: { doc: Document }) => {
    const docId = doc.metadata.source as Id<"documents">;
    const documentData = useQuery(api.documents.queries.get, {
      documentId: docId,
    });

    const tagInfo = getTagInfo(
      documentData?.type || "file",
      documentData?.status,
    );
    const IconComponent = tagInfo.icon;

    return (
      <div
        className="space-y-2 p-3 border rounded-md bg-background cursor-pointer"
        onClick={() => {
          setDocumentDialogDocumentId(docId);
          setDocumentDialogOpen(true);
        }}
      >
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <IconComponent className={`w-4 h-4 ${tagInfo.className}`} />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{documentData?.name || "Document"}</p>
            </TooltipContent>
          </Tooltip>
          <div className="font-medium text-sm">{documentData?.name}</div>
        </div>
        <div className="text-sm text-muted-foreground">
          <Markdown
            content={
              doc.pageContent.length > 500
                ? doc.pageContent.substring(0, 500) + "..."
                : doc.pageContent
            }
            className="text-sm"
          />
        </div>
      </div>
    );
  });
  MemoizedConvexDocument.displayName = "MemoizedConvexDocument";

  return (
    <div>
      <Accordion type="single" collapsible>
        <AccordionItem value="documents" className="border-none">
          <AccordionTrigger className="text-sm justify-start items-center py-2 text-muted-foreground hover:text-foreground">
            <FileIcon className="w-4 h-4 mr-1" />
            View sources ({documents.length})
          </AccordionTrigger>
          <AccordionContent>
            <div className="bg-background/50 rounded-md p-3 border space-y-3">
              {documents.map((doc, idx) => {
                if (doc.metadata.source === "tavily") {
                  const url = extractUrlFromTavilyContent(doc.pageContent);
                  return (
                    <div
                      key={idx}
                      className="space-y-2 p-3 border rounded-md bg-background"
                    >
                      <div className="flex items-center gap-2">
                        {url ? (
                          <Favicon
                            url={url}
                            className="w-4 h-4 flex-shrink-0"
                            fallbackIcon={ExternalLinkIcon}
                          />
                        ) : (
                          <ExternalLinkIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        )}
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline truncate"
                          >
                            {url}
                          </a>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-3">
                        {doc.pageContent.split("\n").slice(2).join("\n").trim()}
                      </div>
                    </div>
                  );
                } else {
                  return <MemoizedConvexDocument key={idx} doc={doc} />;
                }
              })}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

const ConvexDocumentChip = React.memo(
  ({ docId, onOpen }: { docId: Id<"documents">; onOpen: () => void }) => {
    const documentData = useQuery(api.documents.queries.get, {
      documentId: docId,
    });

    const tagInfo = getTagInfo(
      documentData?.type || "file",
      documentData?.status,
    );
    const IconComponent = tagInfo.icon;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-1 px-2 py-1 border rounded-md bg-background cursor-pointer hover:bg-muted transition-colors text-sm"
            onClick={onOpen}
          >
            <IconComponent className={`w-3 h-3 ${tagInfo.className}`} />
            <span className="truncate max-w-[120px]">
              {documentData?.name || "Document"}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{documentData?.name || "Document"}</p>
        </TooltipContent>
      </Tooltip>
    );
  },
);
ConvexDocumentChip.displayName = "ConvexDocumentChip";

const DocumentDisplay = ({ documents }: { documents: DocumentInterface[] }) => {
  if (!documents || documents.length === 0) return null;

  const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);
  const setDocumentDialogDocumentId = useSetAtom(documentDialogDocumentIdAtom);

  const extractUrlFromTavilyContent = (content: string): string | null => {
    const urlMatch = content.match(/https?:\/\/[^\s\n]+/);
    return urlMatch ? urlMatch[0] : null;
  };

  const MemoizedConvexDocument = React.memo(
    ({ doc }: { doc: DocumentInterface }) => {
      const docId = doc.metadata.source as Id<"documents">;
      const documentData = useQuery(api.documents.queries.get, {
        documentId: docId,
      });

      const tagInfo = getTagInfo(
        documentData?.type || "file",
        documentData?.status,
      );
      const IconComponent = tagInfo.icon;

      return (
        <div
          className="space-y-2 p-3 border rounded-md bg-background cursor-pointer"
          onClick={() => {
            setDocumentDialogDocumentId(docId);
            setDocumentDialogOpen(true);
          }}
        >
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <IconComponent className={`w-4 h-4 ${tagInfo.className}`} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{documentData?.name || "Document"}</p>
              </TooltipContent>
            </Tooltip>
            <div className="font-medium text-sm">{documentData?.name}</div>
          </div>
          <div className="text-sm text-muted-foreground">
            <Markdown
              content={
                doc.pageContent.length > 500
                  ? doc.pageContent.substring(0, 500) + "..."
                  : doc.pageContent
              }
              className="text-sm"
            />
          </div>
        </div>
      );
    },
  );
  MemoizedConvexDocument.displayName = "MemoizedConvexDocument";

  const webDocuments = documents.filter(
    (doc) => doc.metadata?.source === "tavily",
  );
  const convexDocuments = documents.filter(
    (doc) => doc.metadata?.source !== "tavily",
  );

  return (
    <div className="flex flex-col w-full gap-1 mb-4">
      {/* Web documents with overlapping favicons */}
      {webDocuments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {webDocuments.slice(0, 5).map((doc, idx) => {
            const url = extractUrlFromTavilyContent(doc.pageContent);
            if (!url) return null;

            return (
              <div
                key={idx}
                className="relative cursor-pointer hover:scale-110 transition-transform"
                style={{ marginLeft: idx > 0 ? "-8px" : "0" }}
                onClick={() => window.open(url, "_blank")}
                title={url}
              >
                <Favicon
                  url={url}
                  className="w-6 h-6 border-2 border-background rounded-full bg-background"
                  fallbackIcon={ExternalLinkIcon}
                />
              </div>
            );
          })}
          {webDocuments.length > 5 && (
            <div className="flex items-center justify-center w-6 h-6 border-2 border-background rounded-full bg-muted text-xs font-medium text-muted-foreground ml-1">
              +{webDocuments.length - 5}
            </div>
          )}
        </div>
      )}

      {/* Convex documents as simple list */}
      {convexDocuments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {convexDocuments.map((doc, idx) => {
            const docId = doc.metadata?.source as Id<"documents">;
            return (
              <ConvexDocumentChip
                key={idx}
                docId={docId}
                onOpen={() => {
                  setDocumentDialogDocumentId(docId);
                  setDocumentDialogOpen(true);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

const groupMessages = (messages: BaseMessage[]): BaseMessage[][] => {
  if (messages.length === 0) return [];

  const grouped: BaseMessage[][] = [];
  let currentGroup: BaseMessage[] = [];

  const getGroupType = (message: BaseMessage) => {
    if (message instanceof HumanMessage) return "user";
    if (message instanceof AIMessage || message instanceof ToolMessage)
      return "ai/tool";
    return "other";
  };

  const validMessages = messages.filter(
    (message) => getGroupType(message) !== "other",
  );

  for (const message of validMessages) {
    const messageType = getGroupType(message);

    if (currentGroup.length === 0) {
      currentGroup.push(message);
    } else {
      const currentGroupType = getGroupType(currentGroup[0]);
      if (messageType === currentGroupType) {
        currentGroup.push(message);
      } else {
        grouped.push(currentGroup);
        currentGroup = [message];
      }
    }
  }

  if (currentGroup.length > 0) {
    grouped.push(currentGroup);
  }

  return grouped;
};

const MessageGroup = ({
  messages,
  firstMessageIndex,
  chatId,
}: {
  messages: BaseMessage[];
  firstMessageIndex: number;
  chatId: Id<"chats"> | "new";
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(
    null,
  );
  const removeMessageGroup = useAction(api.chats.actions.removeMessageGroup);
  const regenerate = useAction(api.chats.actions.regenerate);
  const regenerateFromUser = useAction(api.chats.actions.regenerateFromUser);
  const branchChatAction = useAction(api.chats.actions.branchChat);
  const navigate = useNavigate();

  if (messages.length === 0) return null;

  const firstMessage = messages[0];
  const isUserGroup = firstMessage instanceof HumanMessage;

  const allDocuments = messages.reduce((acc: Document[], msg) => {
    if (msg instanceof AIMessage && msg.additional_kwargs?.documents) {
      const docs = msg.additional_kwargs.documents as Document[];
      return acc.concat(docs);
    }
    return acc;
  }, []);

  const handleBranch = async () => {
    if (chatId === "new") return;
    const newChatId = await branchChatAction({
      chatId: chatId as Id<"chats">,
      messageIndex: firstMessageIndex + messages.length,
    });
    await navigate({ to: "/chat/$chatId", params: { chatId: newChatId } });
  };

  // Helper function to extract text content from message
  const extractTextFromContent = (content: any): string => {
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map((item) => (item.type === "text" ? item.text : ""))
        .filter(Boolean)
        .join("");
    }
    return String(content);
  };

  const handleCopyText = () => {
    const textToCopy = messages
      .map((m) => extractTextFromContent(m.content))
      .filter(Boolean)
      .join("\n\n");
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteMessage = async () => {
    if (chatId === "new") return;

    try {
      await removeMessageGroup({
        chatId: chatId as Id<"chats">,
        startIndex: firstMessageIndex,
        count: messages.length,
        cascade: false,
      });
    } catch (error) {
      console.error("Failed to delete message group:", error);
    }
  };

  const handleDeleteCascading = async () => {
    if (chatId === "new") return;

    try {
      await removeMessageGroup({
        chatId: chatId as Id<"chats">,
        startIndex: firstMessageIndex,
        count: messages.length,
        cascade: true,
      });
    } catch (error) {
      console.error("Failed to delete cascading messages:", error);
    }
  };

  const handleRegenerate = async () => {
    if (chatId === "new" || isUserGroup) return;

    try {
      await regenerate({
        chatId: chatId as Id<"chats">,
        startIndex: firstMessageIndex,
        count: messages.length,
      });
    } catch (error) {
      console.error("Failed to regenerate message:", error);
    }
  };

  const handleUserRegenerate = async () => {
    if (chatId === "new" || !isUserGroup) return;

    try {
      await regenerateFromUser({
        chatId: chatId as Id<"chats">,
        startIndex: firstMessageIndex,
        count: messages.length,
      });
    } catch (error) {
      console.error("Failed to regenerate from user message:", error);
    }
  };

  const handleEditMessage = (messageIndex: number) => {
    setEditingMessageIndex(messageIndex);
  };

  const handleCancelEdit = () => {
    setEditingMessageIndex(null);
  };

  const handleSaveEdit = () => {
    setEditingMessageIndex(null);
  };

  const renderMessage = (message: BaseMessage, index: number) => {
    const messageId = message.id ?? `msg-${index}`;
    const absoluteMessageIndex = firstMessageIndex + index;
    const isEditing = editingMessageIndex === absoluteMessageIndex;

    if (message instanceof HumanMessage) {
      return (
        <UserMessageComponent
          key={messageId}
          message={message}
          isEditing={isEditing}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
          messageIndex={absoluteMessageIndex}
          chatId={chatId}
        />
      );
    } else if (message instanceof AIMessage) {
      return (
        <AIMessageComponent
          key={messageId}
          message={message}
          messageIndex={absoluteMessageIndex}
        />
      );
    } else if (message instanceof ToolMessage) {
      return <ToolMessageComponent key={messageId} message={message} />;
    }
    return null;
  };

  return (
    <div
      className={`flex flex-col w-full gap-1 group ${isUserGroup ? "items-end" : ""}`}
    >
      {messages.map(renderMessage)}
      {!isUserGroup && allDocuments.length > 0 && (
        <MessageSources documents={allDocuments} />
      )}
      <div className="flex flex-row items-center justify-start">
        {isUserGroup ? (
          <UserUtilsBar
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
            handleCopyText={handleCopyText}
            copied={copied}
            onDeleteMessage={handleDeleteMessage}
            onDeleteCascading={handleDeleteCascading}
            onRegenerate={handleUserRegenerate}
            onEditMessage={() => handleEditMessage(firstMessageIndex)}
          />
        ) : (
          <AIToolUtilsBar
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
            handleCopyText={handleCopyText}
            copied={copied}
            onDeleteMessage={handleDeleteMessage}
            onDeleteCascading={handleDeleteCascading}
            onRegenerate={handleRegenerate}
            onBranch={handleBranch}
          />
        )}
      </div>
    </div>
  );
};

MessageGroup.displayName = "MessageGroup";

export const ChatMessages = React.memo(() => {
  const params = useParams({
    from: "/chat_/$chatId/",
  });
  const chatId = params.chatId as Id<"chats"> | "new";

  // now returns chunkGroups directly
  const stream = useStream(chatId);

  const checkpoint = useQuery(api.chats.queries.getCheckpoint, {
    chatId,
    paginationOpts: { numItems: 20, cursor: null },
  });
  const parsedCheckpoint = useCheckpointParser({ checkpoint });

  const setStream = useSetAtom(useStreamAtom);
  const setCheckpointParser = useSetAtom(useCheckpointParserAtom);

  setStream(stream);
  setCheckpointParser(parsedCheckpoint);

  const messageGroups = parsedCheckpoint?.messages
    ? groupMessages(parsedCheckpoint.messages)
    : [];

  const lastMessage =
    parsedCheckpoint?.messages?.[parsedCheckpoint.messages.length - 1];

  const lastMessageHasPastSteps =
    lastMessage instanceof AIMessage &&
    !!lastMessage.additional_kwargs?.past_steps;

  const lastMessageHasDocuments =
    lastMessage instanceof AIMessage &&
    !!lastMessage.additional_kwargs?.documents;

  const messageGroupsWithIndices: {
    group: BaseMessage[];
    firstMessageIndex: number;
  }[] = [];
  let currentIndex = 0;
  for (const group of messageGroups) {
    messageGroupsWithIndices.push({ group, firstMessageIndex: currentIndex });
    currentIndex += group.length;
  }

  return (
    <ScrollArea className="overflow-hidden w-full h-full">
      <div className="flex flex-col max-w-4xl mx-auto p-1 gap-1">
        {/* render existing message groups */}
        {messageGroupsWithIndices.map(({ group, firstMessageIndex }, i) => (
          <MessageGroup
            key={i}
            messages={group}
            firstMessageIndex={firstMessageIndex}
            chatId={chatId}
          />
        ))}

        {/* render planning steps */}
        {parsedCheckpoint?.pastSteps && !lastMessageHasPastSteps && (
          <PlanningSteps pastSteps={parsedCheckpoint.pastSteps} />
        )}

        {/* render documents during streaming */}
        {parsedCheckpoint?.documents &&
          parsedCheckpoint.documents.length > 0 &&
          !lastMessageHasDocuments && (
            <DocumentDisplay documents={parsedCheckpoint.documents} />
          )}

        {/* render live stream */}
        {stream?.chunkGroups.length > 0 && (
          <div className="flex flex-col w-full gap-1">
            {stream?.chunkGroups.map((cg, idx) => {
              if (cg.type === "ai") {
                const msg = new AIMessage({
                  content: cg.content,
                  additional_kwargs: cg.reasoning
                    ? { reasoning_content: cg.reasoning }
                    : {},
                });
                return (
                  <AIMessageComponent
                    key={`stream-ai-${idx}`}
                    message={msg}
                    messageIndex={parsedCheckpoint?.messages.length ?? -1}
                  />
                );
              } else {
                const msg = new ToolMessage({
                  content: cg.output ? JSON.stringify(cg.output) : "",
                  tool_call_id: `stream-tool-${idx}`,
                  name: cg.toolName,
                });
                return (
                  <ToolMessageComponent
                    key={`stream-tool-${idx}`}
                    message={msg}
                    isStreaming
                  />
                );
              }
            })}
          </div>
        )}

        {stream?.status === "pending" && (
          <div className="flex flex-row items-center justify-start w-full">
            <div className="w-2 h-2 mx-0.5 rounded-full bg-gray-400 opacity-100 animate-bounce-loader"></div>
            <div className="w-2 h-2 mx-0.5 rounded-full bg-gray-400 opacity-100 animate-bounce-loader animation-delay-200"></div>
            <div className="w-2 h-2 mx-0.5 rounded-full bg-gray-400 opacity-100 animate-bounce-loader animation-delay-400"></div>
          </div>
        )}
        {stream?.status === "error" && (
          <div className="flex flex-col w-full gap-1">
            <div className="flex items-center gap-2 p-3 rounded-md bg-red-400/20">
              <CircleXIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                An error occurred while processing your request
              </span>
            </div>
          </div>
        )}
        {/* cancelled stream bar */}
        {stream?.status === "cancelled" && (
          <div className="flex flex-col w-full gap-1">
            <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-400/20">
              <BanIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                The stream was cancelled
              </span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
});
