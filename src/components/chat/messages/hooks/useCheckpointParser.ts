import React from "react";
import { coerceMessageLikeToMessage, type BaseMessage } from "@langchain/core/messages";

interface UseCheckpointParserProps {
  checkpoint?: { page?: string } | null;
}

export const useCheckpointParser = ({ checkpoint }: UseCheckpointParserProps) => {
  return React.useMemo(() => {
    if (!checkpoint?.page) return null;
    
    const parsed = JSON.parse(checkpoint.page) as Record<string, any> & {
      messages: BaseMessage[];
    };
    
    return {
      ...parsed,
      messages: parsed.messages.map((msg) => coerceMessageLikeToMessage(msg)),
    };
  }, [checkpoint?.page]);
}; 