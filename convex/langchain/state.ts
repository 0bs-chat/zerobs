"use node";

import { z } from "zod";
import { Annotation } from "@langchain/langgraph/web";
import { BaseMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";

export const planStep = z.union([z.string(), z.array(z.string())]);

export const planArray = z
  .array(planStep)
  .describe(
    "A step by step plan to achieve the objective. Group parallel steps in an array.",
  )
  .min(1)
  .max(9);

export const planSchema = z.object({
  plan: planArray,
});

export type CompletedStep = [z.infer<typeof planStep>, BaseMessage];

export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  documents: Annotation<Document[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  plan: Annotation<z.infer<typeof planArray>>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  pastSteps: Annotation<CompletedStep[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
});