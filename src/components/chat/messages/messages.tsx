import React, { Suspense, useState, useMemo } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  HumanMessage,
  AIMessage,
  ToolMessage,
  BaseMessage,
  type StoredMessage,
} from "@langchain/core/messages";
import {
  UserMessageComponent,
  AIMessageComponent,
  ToolMessageComponent,
  PlanningSteps,
} from ".";
import { useStream } from "@/hooks/chats/use-stream";
import { AIToolUtilsBar, UserUtilsBar } from "./UtilsBar";
import {
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
import { ExternalLinkIcon, FileIcon } from "lucide-react";
import { Favicon } from "@/components/ui/favicon";
import { Markdown } from "@/components/ui/markdown";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getTagInfo } from "@/lib/helpers";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MessageNode } from "../../../../convex/chatMessages/helpers";
import { useParams } from "@tanstack/react-router";
import { mapStoredMessageToChatMessage } from "@langchain/core/messages";

// Type for MessageNode with converted LangChain messages
type ConvertedMessageNode = Omit<MessageNode, 'message' | 'children'> & {
  message: BaseMessage;
  children: ConvertedMessageNode[];
};

// Utility function to extract URL from Tavily content
const extractUrlFromTavilyContent = (content: string): string | null => {
  try {
    const lines = content.split('\n');
    const urlLine = lines.find(line => line.startsWith('URL: '));
    return urlLine ? urlLine.replace('URL: ', '').trim() : null;
  } catch {
    return null;
  }
};

// Mock implementation of useMessageHandlers
const useMessageHandlers = (chatId: Id<"chats">, messages: BaseMessage[]) => {
  return {
    handleCopyText: () => {},
    handleDeleteMessage: () => {},
    handleDeleteCascading: () => {},
    handleRegenerate: () => {},
    handleUserRegenerate: () => {},
    handleEditMessage: (_index: number) => {},
    handleCancelEdit: () => {},
    handleSaveEdit: (_content: string, _regenerate?: boolean) => {},
  };
};

const MessageSources = ({ documents }: { documents: Document[] }) => {
  if (!documents || documents.length === 0) return null;

  const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);
  const setDocumentDialogDocumentId = useSetAtom(documentDialogDocumentIdAtom);

  const MemoizedConvexDocument = React.memo(({ doc }: { doc: Document }) => {
    const docId = doc.metadata.source as Id<"documents">;
    const documentData = useQuery(api.documents.queries.get, {
      documentId: docId,
    });

    const tagInfo = getTagInfo(
      documentData?.type || "file",
      documentData?.status
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
      documentData?.status
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
  }
);
ConvexDocumentChip.displayName = "ConvexDocumentChip";

const DocumentDisplay = ({ documents }: { documents: DocumentInterface[] }) => {
  if (!documents || documents.length === 0) return null;

  const setDocumentDialogOpen = useSetAtom(documentDialogOpenAtom);
  const setDocumentDialogDocumentId = useSetAtom(documentDialogDocumentIdAtom);

  const MemoizedConvexDocument = React.memo(
    ({ doc }: { doc: DocumentInterface }) => {
      const docId = doc.metadata.source as Id<"documents">;
      const documentData = useQuery(api.documents.queries.get, {
        documentId: docId,
      });

      const tagInfo = getTagInfo(
        documentData?.type || "file",
        documentData?.status
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
    }
  );
  MemoizedConvexDocument.displayName = "MemoizedConvexDocument";

  const webDocuments = documents.filter(
    (doc) => doc.metadata?.source === "tavily"
  );
  const convexDocuments = documents.filter(
    (doc) => doc.metadata?.source !== "tavily"
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

const MessageGroup = ({
  messages,
  firstMessageIndex,
  chatId,
  nodeInfo,
  onBranchNavigate,
  branchSelections,
}: {
  messages: BaseMessage[];
  firstMessageIndex: number;
  chatId: Id<"chats">;
  nodeInfo?: Array<{ node: ConvertedMessageNode, groupIndex: number, messageIndex: number }>;
  onBranchNavigate?: (messageId: string, direction: 'prev' | 'next', totalBranches: number) => void;
  branchSelections?: Map<string, number>;
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, _setCopied] = useState(false);
  const [editingMessageIndex, _setEditingMessageIndex] = useState<
    number | null
  >(null);
  if (messages.length === 0) return null;

  const {
    handleCopyText,
    handleDeleteMessage,
    handleDeleteCascading,
    handleRegenerate,
    handleUserRegenerate,
    handleEditMessage,
    handleCancelEdit,
    handleSaveEdit,
  } = useMessageHandlers(chatId, messages)!;

  const firstMessage = messages[0];
  const isUserGroup = firstMessage instanceof HumanMessage;

  const allDocuments = messages.reduce((acc: Document[], msg) => {
    if (msg instanceof AIMessage && msg.additional_kwargs?.documents) {
      const docs = msg.additional_kwargs.documents as Document[];
      return acc.concat(docs);
    }
    return acc;
  }, []);

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
            branchInfo={(() => {
              // Find the node info for the last message in this group
              const lastMessageIndexInGroup = firstMessageIndex + messages.length - 1;
              const relevantNodeInfo = nodeInfo?.find(info => 
                info.groupIndex === Math.floor(lastMessageIndexInGroup / messages.length) && 
                info.messageIndex === messages.length - 1
              );
              
              if (relevantNodeInfo?.node.children && relevantNodeInfo.node.children.length > 0 && branchSelections) {
                const currentBranch = branchSelections.get(relevantNodeInfo.node._id) || 0;
                return {
                  currentBranch: currentBranch + 1, // 1-indexed for display
                  totalBranches: relevantNodeInfo.node.children.length
                };
              }
              return undefined;
            })()}
            onBranchNavigate={(direction) => {
              const lastMessageIndexInGroup = firstMessageIndex + messages.length - 1;
              const relevantNodeInfo = nodeInfo?.find(info => 
                info.groupIndex === Math.floor(lastMessageIndexInGroup / messages.length) && 
                info.messageIndex === messages.length - 1
              );
              
              if (relevantNodeInfo?.node.children && relevantNodeInfo.node.children.length > 0) {
                onBranchNavigate?.(relevantNodeInfo.node._id, direction, relevantNodeInfo.node.children.length);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

MessageGroup.displayName = "MessageGroup";

export const ChatMessages = React.memo(
  () => {
    const params = useParams({
      from: "/chat_/$chatId/",
    });
    const chatId = params.chatId as Id<"chats">;
    const { chunkGroups, streamState } = useStream(chatId);

    const messages = useQuery(
      api.chatMessages.queries.get,
      { chatId, getCurrentThread: false }
    ) as MessageNode[];



    // State to track current branch selections for each message with children
    const [branchSelections, setBranchSelections] = useState<Map<string, number>>(new Map());

    // Recursive function to convert MessageNode tree while preserving structure
    const convertMessageNode = (node: MessageNode): ConvertedMessageNode => {
      return {
        ...node,
        message: mapStoredMessageToChatMessage(
          JSON.parse(node.message) as StoredMessage
        ),
        children: node.children.map(convertMessageNode),
      };
    };

    const langchainMessages = messages?.map(convertMessageNode);

    // Function to get the current path through the message tree based on branch selections
    const getCurrentMessagePath = (nodes: ConvertedMessageNode[]): ConvertedMessageNode[] => {
      const path: ConvertedMessageNode[] = [];
      
      const traverseNode = (node: ConvertedMessageNode) => {
        path.push(node);
        
        if (node.children.length > 0) {
          // Get the selected branch for this node (default to 0)
          const selectedBranch = branchSelections.get(node._id) || 0;
          const validBranchIndex = Math.min(selectedBranch, node.children.length - 1);
          
          if (node.children[validBranchIndex]) {
            traverseNode(node.children[validBranchIndex]);
          }
        }
      };
      
      // Process each root node
      for (const rootNode of nodes) {
        traverseNode(rootNode);
      }
      
      return path;
    };

    // Function to handle branch navigation
    const handleBranchNavigate = (messageId: string, direction: 'prev' | 'next', totalBranches: number) => {
      setBranchSelections(prev => {
        const newSelections = new Map(prev);
        const currentBranch = newSelections.get(messageId) || 0;
        
        if (direction === 'prev' && currentBranch > 0) {
          newSelections.set(messageId, currentBranch - 1);
        } else if (direction === 'next' && currentBranch < totalBranches - 1) {
          newSelections.set(messageId, currentBranch + 1);
        }
        
        return newSelections;
      });
    };

    // Get the current message path (based on branch selections)
    const currentMessagePath = useMemo(() => {
      return getCurrentMessagePath(langchainMessages || []);
    }, [langchainMessages, branchSelections]);

    // Group consecutive messages by type (user vs AI/tool) from the current path
    const groupMessagesFromPath = (pathNodes: ConvertedMessageNode[]): { 
      groups: BaseMessage[][], 
      nodeInfo: Array<{ node: ConvertedMessageNode, groupIndex: number, messageIndex: number }> 
    } => {
      if (!pathNodes || pathNodes.length === 0) return { groups: [], nodeInfo: [] };
      
      const groups: BaseMessage[][] = [];
      const nodeInfo: Array<{ node: ConvertedMessageNode, groupIndex: number, messageIndex: number }> = [];
      let currentGroup: BaseMessage[] = [];
      let currentIsUserGroup = pathNodes[0].message instanceof HumanMessage;
      
      for (const node of pathNodes) {
        const isUserMessage = node.message instanceof HumanMessage;
        
        if (isUserMessage === currentIsUserGroup) {
          currentGroup.push(node.message);
          nodeInfo.push({ 
            node, 
            groupIndex: groups.length, 
            messageIndex: currentGroup.length - 1 
          });
        } else {
          if (currentGroup.length > 0) {
            groups.push(currentGroup);
          }
          currentGroup = [node.message];
          nodeInfo.push({ 
            node, 
            groupIndex: groups.length, 
            messageIndex: 0 
          });
          currentIsUserGroup = isUserMessage;
        }
      }
      
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      
      return { groups, nodeInfo };
    };

    const { groups: messageGroups, nodeInfo } = useMemo(() => {
      return groupMessagesFromPath(currentMessagePath);
    }, [currentMessagePath]);

    // Create groups with indices for rendering
    const messageGroupsWithIndices = useMemo(() => {
      const groups: {
        group: BaseMessage[];
        firstMessageIndex: number;
      }[] = [];

      let currentIndex = 0;
      for (const group of messageGroups) {
        groups.push({
          group,
          firstMessageIndex: currentIndex,
        });
        currentIndex += group.length;
      }

      return groups;
    }, [messageGroups]);

    // Memoize streaming messages to prevent unnecessary re-renders
    const streamingMessages = useMemo(() => {
      return chunkGroups.map((cg, idx) => {
        const key = `stream-${cg.type}-${idx}`;

        if (cg.type === "ai") {
          return {
            key,
            component: (
              <AIMessageComponent
                key={key}
                message={
                  new AIMessage({
                    content: cg.content,
                    additional_kwargs: cg.reasoning
                      ? { reasoning_content: cg.reasoning }
                      : {},
                  })
                }
                messageIndex={langchainMessages.length}
              />
            ),
          };
        } else {
          return {
            key,
            component: (
              <ToolMessageComponent
                key={key}
                message={
                  new ToolMessage({
                    content: cg.output ? JSON.stringify(cg.output) : "",
                    tool_call_id: `stream-tool-${idx}`,
                    name: cg.toolName,
                  })
                }
                isStreaming
              />
            ),
          };
        }
      });
    }, [chunkGroups, langchainMessages.length]);

    return (
      <ScrollArea>
        <div className="flex flex-col max-w-4xl mx-auto p-1 gap-1 ">
          {/* render existing message groups */}
          {messageGroupsWithIndices.map(({ group, firstMessageIndex }, i) => (
            <MessageGroup
              key={i}
              messages={group}
              firstMessageIndex={firstMessageIndex}
              chatId={chatId}
              nodeInfo={nodeInfo}
              onBranchNavigate={handleBranchNavigate}
              branchSelections={branchSelections}
            />
          ))}

          {/* render planning steps */}
          <Suspense
            fallback={<div className="animate-pulse h-4 bg-muted rounded" />}
          >
            {streamState?.pastSteps && (
              <PlanningSteps pastSteps={streamState.pastSteps} />
            )}
          </Suspense>

          {/* render live stream */}
          {chunkGroups?.length > 0 && (
            <div className="flex flex-col w-full gap-1">
              {streamingMessages.map(({ key, component }) => component)}
            </div>
          )}
        </div>
      </ScrollArea>
    );
  }
);

export default ChatMessages;
