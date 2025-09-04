import { z } from "zod";
import { Annotation } from "@langchain/langgraph/web";
import { BaseMessage } from "@langchain/core/messages";

export const planStep = z.object({
  step: z
    .string()
    .describe(
      "A short, specific instruction (ideally < 6 words) describing the subtask to be performed " +
        "by an agent. Should be actionable, unambiguous, and clearly distinct from other steps to ensure effective division " +
        "of labor and prevent overlap."
    ),
  context: z
    .string()
    .describe(
      "A concise explanation of the background, objective, and constraints for this step," +
        "written to help a subagent understand exactly what is needed, what tools or sources to use, and any boundaries or" +
        " heuristics to follow. Should clarify the subtask's purpose, avoid ambiguity, and prevent duplication or" +
        " misinterpretation by other agents."
    ),
});

const singlePlanStep = z.object({
  type: z.literal("single"),
  data: planStep,
});

const parallelPlanSteps = z.object({
  type: z.literal("parallel"),
  data: z.array(planStep),
});

export const planArray = z
  .array(z.discriminatedUnion("type", [singlePlanStep, parallelPlanSteps]))
  .describe(
    "A step-by-step plan for decomposing a complex research objective into clear, non-overlapping subtasks. " +
      "Each step should be concise, actionable, and include enough context for a subagent to execute independently. " +
      "The plan should scale in complexity with the query, allocate effort efficiently, and ensure that all necessary aspects of the research are covered without redundancy. " +
      "If multiple tasks should be executed in parallel, group them together in a nested list (i.e., use an array of plan steps within the main array) to indicate parallel execution."
  )
  .min(1)
  .max(9);

export const planSchema = z.object({
  plan: planArray,
});

export type CompletedStep = [string, BaseMessage[]];

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

export interface AIChunkGroup {
  type: "ai";
  content: string;
  reasoning?: string;
}

export interface ToolChunkGroup {
  type: "tool";
  toolName: string;
  input?: unknown;
  output?: unknown;
  isComplete: boolean;
  toolCallId: string;
}
export type ChunkGroup = AIChunkGroup | ToolChunkGroup;
