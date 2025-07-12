import { z } from "zod";
import { Annotation } from "@langchain/langgraph/web";
import { BaseMessage } from "@langchain/core/messages";

export const planStep = z.string();

export const planArray = z
  .array(planStep)
  .describe(
    "A step by step plan to achieve the objective. Keep the step description < 6 words.",
  )
  .min(1)
  .max(9);

export const planSchema = z.object({
  plan: planArray,
});

export type CompletedStep = [z.infer<typeof planStep>, BaseMessage[]];

export const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
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
