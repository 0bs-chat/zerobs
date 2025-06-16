import { z } from "zod";
import { Annotation, messagesStateReducer } from "@langchain/langgraph/web";
import { BaseMessage, StoredMessage } from "@langchain/core/messages";
import { DocumentInterface } from "@langchain/core/documents";

export const planStep = z.object({
  step: z.string().describe("The step to be executed"),
  additional_context: z
    .string()
    .describe("Additional context that may be needed to execute the step"),
});

export const planItem = z.union([
  planStep,
  z
    .array(planStep)
    .describe("Steps that can be executed in parallel")
    .min(2)
    .max(5),
]);

export const planArray = z
  .array(planItem)
  .describe(
    "A step by step plan to achieve the objective. Use parallel_steps for steps that can run simultaneously.",
  )
  .min(1)
  .max(9);

export const planSchema = z.object({
  plan: planArray,
});

export type CompletedStep = [z.infer<typeof planStep>, StoredMessage];

export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  documents: Annotation<DocumentInterface[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  plan: Annotation<z.infer<typeof planArray>>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  pastSteps: Annotation<(CompletedStep | CompletedStep[])[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
});
