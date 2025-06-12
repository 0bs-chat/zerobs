import React from "react";
import { coerceMessageLikeToMessage } from "@langchain/core/messages";
import { GraphState } from "../../../../../convex/langchain/state";

interface UseCheckpointParserProps {
  checkpoint?: { page?: string } | null;
}

type GraphStateType = typeof GraphState.State;

export const useCheckpointParser = ({ checkpoint }: UseCheckpointParserProps) => {
  return React.useMemo(() => {
    if (!checkpoint?.page) return null;
    
    const parsedState = JSON.parse(checkpoint.page) as GraphStateType;

    return {
      ...parsedState,
      messages: parsedState.messages.map((msg) => coerceMessageLikeToMessage(msg)),
    };
  }, [checkpoint?.page]);
}; 