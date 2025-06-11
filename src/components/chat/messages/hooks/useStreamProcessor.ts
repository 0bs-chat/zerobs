import React from "react";
import { type BaseMessage, ToolMessage } from "@langchain/core/messages";
import type { ToolStreamEvent } from "../ToolMessage";

interface StreamElement {
  type: "text" | "tool";
  content?: string;
  reasoning?: string;
  toolCall?: { name: string; content: string };
}

interface UseStreamProcessorProps {
  streamChunks?: any[];
  parsedCheckpoint?: { messages: BaseMessage[] } | null;
}

export const useStreamProcessor = ({ streamChunks, parsedCheckpoint }: UseStreamProcessorProps) => {
  return React.useMemo(() => {
    if (!streamChunks) {
      return { streamingElements: [], toolStreamEvents: [] };
    }

    const checkpointToolKeys = new Set(
      parsedCheckpoint?.messages
        ?.filter((msg): msg is ToolMessage => msg instanceof ToolMessage)
        .map((msg) => (msg.name || "Tool") + msg.content) ?? []
    );

    const seenStreamToolKeys = new Set<string>();
    const elements: StreamElement[] = [];
    const toolEvents: ToolStreamEvent[] = [];
    let textBuffer = "";
    let reasoningBuffer = "";
    let lastTextContent = "";
    let lastReasoningContent = "";

    streamChunks.forEach((chunk, index) => {
      if (chunk.event === "on_chat_model_stream") {
        const kwargs = chunk.data.chunk.kwargs;
        
        if (kwargs.content) {
          textBuffer += kwargs.content;
        }
        
        if (kwargs.additional_kwargs?.reasoning_content) {
          const reasoningChunk = kwargs.additional_kwargs.reasoning_content;
          reasoningBuffer += reasoningChunk;
        }
        
        if (kwargs.tool_call_chunks) {
          for (const toolChunk of kwargs.tool_call_chunks) {
            if (toolChunk.args) {
              reasoningBuffer += toolChunk.args;
            }
          }
        }
        
        if (textBuffer !== lastTextContent || reasoningBuffer !== lastReasoningContent) {
          if (elements.length > 0 && elements[elements.length - 1].type === "text") {
            elements.pop();
          }
          elements.push({
            type: "text",
            content: textBuffer,
            reasoning: reasoningBuffer,
          });
          lastTextContent = textBuffer;
          lastReasoningContent = reasoningBuffer;
        }
      } else if (chunk.event === "on_tool_start") {
        toolEvents.push({
          type: "tool_start",
          toolName: chunk.name || "Tool",
          input: chunk.data?.input,
          id: `stream-${index}`,
        });
        
        if (textBuffer) {
          elements.push({
            type: "text",
            content: textBuffer,
            reasoning: reasoningBuffer,
          });
          textBuffer = "";
          reasoningBuffer = "";
        }
        
        const toolName = chunk.name || "Tool";
        const content = JSON.stringify(chunk.data?.input);
        const key = toolName + content;
        
        if (!checkpointToolKeys.has(key) && !seenStreamToolKeys.has(key)) {
          seenStreamToolKeys.add(key);
          elements.push({
            type: "tool",
            toolCall: {
              name: toolName,
              content: content,
            },
          });
        }
      } else if (chunk.event === "on_tool_end") {
        toolEvents.push({
          type: "tool_end",
          toolName: chunk.name || "Tool",
          output: chunk.data?.output,
          id: `stream-${index}`,
        });
      }
    });

    return {
      streamingElements: elements,
      toolStreamEvents: toolEvents,
    };
  }, [streamChunks, parsedCheckpoint?.messages]);
}; 