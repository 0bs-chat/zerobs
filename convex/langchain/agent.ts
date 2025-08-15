"use node";

import type { RunnableConfig } from "@langchain/core/runnables";
import {
  type ExtendedRunnableConfig,
  createSimpleAgent,
  createAgentWithTools,
  getAvailableToolsDescription,
} from "./helpers";
import { type CompletedStep, GraphState, planSchema, planArray } from "./state";
import { modelSupportsTools, formatMessages, getModel, models } from "./models";
import {
  BaseMessage,
  AIMessage,
  HumanMessage,
  mapChatMessagesToStoredMessages,
} from "@langchain/core/messages";
import {
  createPlannerPrompt,
  createReplannerPrompt,
  replannerOutputSchema,
} from "./prompts";
import { z } from "zod";
import { END, START, StateGraph } from "@langchain/langgraph/web";

async function shouldPlanOrAgentOrSimple(
  _state: typeof GraphState.State,
  config: RunnableConfig
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;
  if (!modelSupportsTools(formattedConfig.chat.model!)) {
    return "simple";
  }

  if (formattedConfig.chat.orchestratorMode) {
    return "planner";
  }

  return "baseAgent";
}

async function simple(state: typeof GraphState.State, config: RunnableConfig) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;

  const chain = await createSimpleAgent(state, formattedConfig);
  const formattedMessages = await formatMessages(
    formattedConfig.ctx,
    state.messages,
    formattedConfig.chat.model!
  );

  const response = await chain.invoke(
    {
      messages: formattedMessages,
    },
    config
  );

  return {
    messages: [response],
  };
}

async function baseAgent(
  state: typeof GraphState.State,
  config: RunnableConfig
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;

  const chain = await createAgentWithTools(state, formattedConfig);
  const formattedMessages = await formatMessages(
    formattedConfig.ctx,
    state.messages,
    formattedConfig.chat.model!
  );

  const response = await chain.invoke(
    {
      messages: formattedMessages,
    },
    config
  );

  let newMessages = response.messages.slice(
    formattedMessages.length
  ) as BaseMessage[];

  return {
    messages: newMessages,
  };
}

async function planner(state: typeof GraphState.State, config: RunnableConfig) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;
  const availableToolsDescription = await getAvailableToolsDescription(
    state,
    formattedConfig
  );
  const promptTemplate = createPlannerPrompt(availableToolsDescription);

  const model = await getModel(
    formattedConfig.ctx,
    formattedConfig.chat.model!,
    formattedConfig.chat.reasoningEffort
  );

  // Get model config to check if it's anthropic
  const modelConfig = models.find(
    (m) => m.model_name === formattedConfig.chat.model!
  );
  const isFunctionCallingParser = modelConfig?.parser === "functionCalling";

  const modelWithOutputParser = promptTemplate.pipe(
    isFunctionCallingParser
      ? model.withStructuredOutput(planSchema, { method: "functionCalling" })
      : model.withStructuredOutput(planSchema)
  );

  const formattedMessages = await formatMessages(
    formattedConfig.ctx,
    state.messages,
    formattedConfig.chat.model!
  );

  const response = (await modelWithOutputParser.invoke(
    {
      messages: formattedMessages,
    },
    config
  )) as z.infer<typeof planSchema>;

  return {
    plan: response.plan,
  };
}

async function plannerAgent(
  state: typeof GraphState.State,
  config: RunnableConfig
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;

  if (!state.plan || state.plan.length === 0) {
    return {};
  }

  const currentPlanItem = state.plan[0];
  const remainingPlan = state.plan.slice(1);
  const pastSteps = state.pastSteps || [];

  const plannerAgentChain = await createAgentWithTools(
    state,
    formattedConfig,
    true
  );

  const invoke = async ({ planItem }: { planItem: typeof currentPlanItem }) => {
    if (planItem.type === "single") {
      const response = await plannerAgentChain.invoke(
        {
          messages: [
            new HumanMessage(
              `Task: ${planItem.data.step}\nContext: ${planItem.data.context}`
            ),
          ],
        },
        config
      );

      const newMessages = response.messages.slice(1, response.messages.length);
      const completedStep: CompletedStep = [planItem.data.step, newMessages];

      return completedStep;
    }
  };

  if (currentPlanItem.type === "single") {
    const response = await invoke({
      planItem: currentPlanItem,
    });

    return {
      plan: remainingPlan,
      pastSteps: [...pastSteps, response],
    };
  } else if (currentPlanItem.type === "parallel") {
    const responses = await Promise.all(
      currentPlanItem.data.map(async (planStep) => {
        return await invoke({
          planItem: { type: "single" as const, data: planStep },
        });
      })
    );

    return {
      plan: remainingPlan,
      pastSteps: [...pastSteps, ...responses],
    };
  }
}

async function replanner(
  state: typeof GraphState.State,
  config: RunnableConfig
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;
  const availableToolsDescription = await getAvailableToolsDescription(
    state,
    formattedConfig
  );
  const promptTemplate = createReplannerPrompt(availableToolsDescription);

  const model = await getModel(
    formattedConfig.ctx,
    formattedConfig.chat.model!,
    formattedConfig.chat.reasoningEffort
  );

  // Get model config to check if it's anthropic
  const outputSchema = replannerOutputSchema(formattedConfig.chat.artifacts);
  const modelConfig = models.find(
    (m) => m.model_name === formattedConfig.chat.model!
  );
  const isFunctionCallingParser = modelConfig?.parser === "functionCalling";
  const modelWithOutputParser = promptTemplate.pipe(
    isFunctionCallingParser
      ? model.withStructuredOutput(outputSchema, { method: "functionCalling" })
      : model.withStructuredOutput(outputSchema)
  );

  const formattedMessages = await formatMessages(
    formattedConfig.ctx,
    state.messages,
    formattedConfig.chat.model!
  );

  let response: z.infer<typeof outputSchema>;
  try {
    response = (await modelWithOutputParser.invoke(
      {
        messages: formattedMessages,
        plan: state.plan,
        pastSteps: state.pastSteps
          .map((pastStep) => {
            const [step, messages] = pastStep;
            const stepMessage = new HumanMessage(step as string);
            return [stepMessage, ...messages];
          })
          .flat(),
      },
      config
    )) as z.infer<typeof outputSchema>;
  } catch (error) {
    // Structured output parsing failed — attempt raw generation and coerce
    console.error("Replanner structured output parsing failed:", error);

    try {
      const rawChain = promptTemplate.pipe(model);
      const rawResponse = await rawChain.invoke(
        {
          messages: formattedMessages,
          plan: state.plan,
          pastSteps: state.pastSteps
            .map((pastStep) => {
              const [step, messages] = pastStep;
              const stepMessage = new HumanMessage(step as string);
              return [stepMessage, ...messages];
            })
            .flat(),
        },
        config
      );

      const rawText =
        typeof rawResponse.content === "string"
          ? rawResponse.content
          : JSON.stringify(rawResponse.content);

      let parsedResponse: any;
      try {
        parsedResponse = JSON.parse(rawText);
      } catch {
        // Ultimate fallback: return a graceful error message
        return {
          messages: [
            new AIMessage({
              content:
                "I encountered an error while processing your request. Please try again.",
              additional_kwargs: {
                pastSteps: state.pastSteps.map((pastStep) => {
                  const [step, messages] = pastStep;
                  const storedMessages =
                    mapChatMessagesToStoredMessages(messages);
                  return [step, storedMessages];
                }),
              },
            }),
          ],
          plan: [],
          pastSteps: [],
        };
      }

      // Coerce malformed continue_planning items
      if (
        parsedResponse?.type === "continue_planning" &&
        Array.isArray(parsedResponse.data)
      ) {
        const fixedData = parsedResponse.data.map((item: any) => {
          if (item.type === "single" && Array.isArray(item.data)) {
            const stepText = item.data[0] || "Complete task";
            return {
              type: "single",
              data: {
                step:
                  stepText.length > 50 ? stepText.substring(0, 50) : stepText,
                context: stepText,
              },
            };
          } else if (item.type === "parallel" && Array.isArray(item.data)) {
            const fixedParallelData = item.data.map((parallelItem: any) => {
              if (typeof parallelItem === "string") {
                return {
                  step:
                    parallelItem.length > 50
                      ? parallelItem.substring(0, 50)
                      : parallelItem,
                  context: parallelItem,
                };
              } else if (parallelItem && typeof parallelItem === "object") {
                return {
                  step:
                    parallelItem.step ||
                    parallelItem.context ||
                    "Complete task",
                  context:
                    parallelItem.context ||
                    parallelItem.step ||
                    "Complete the assigned task",
                };
              }
              return {
                step: "Complete task",
                context: "Complete the assigned task",
              };
            });
            return { type: "parallel", data: fixedParallelData };
          }
          return item;
        });
        parsedResponse.data = fixedData;
      }

      // Coerce malformed respond_to_user arrays (e.g. [{type:'tool_code', data:{step, context}}, ...])
      if (
        parsedResponse?.type === "respond_to_user" &&
        Array.isArray(parsedResponse.data)
      ) {
        const pieces = parsedResponse.data
          .map(
            (d: any) =>
              d?.data?.context ??
              d?.data?.step ??
              (typeof d === "string" ? d : null)
          )
          .filter(Boolean);
        parsedResponse = {
          type: "respond_to_user",
          data: pieces.length
            ? pieces.join("\n\n")
            : JSON.stringify(parsedResponse.data),
        };
      }

      response = parsedResponse as z.infer<typeof outputSchema>;
    } catch (fallbackError) {
      console.error("Fallback response coercion failed:", fallbackError);
      return {
        messages: [
          new AIMessage({
            content:
              "I encountered an error while processing your request. Please try again.",
            additional_kwargs: {
              pastSteps: state.pastSteps.map((pastStep) => {
                const [step, messages] = pastStep;
                const storedMessages =
                  mapChatMessagesToStoredMessages(messages);
                return [step, storedMessages];
              }),
            },
          }),
        ],
        plan: [],
        pastSteps: [],
      };
    }
  }

  if (response.type === "respond_to_user") {
    // Normalize various shapes into a single string for the final answer.
    const raw = response.data;
    let finalText: string;
    if (typeof raw === "string") {
      finalText = raw;
    } else if (Array.isArray(raw)) {
      const first = raw[0] as any;
      finalText =
        (first?.data?.context as string | undefined) ??
        (first?.data?.step as string | undefined) ??
        JSON.stringify(first ?? raw);
    } else if (raw && typeof raw === "object") {
      finalText = raw.context ?? raw.step ?? JSON.stringify(raw);
    } else {
      finalText = String(raw);
    }

    const responseMessages = [
      new AIMessage({
        content: finalText,
        additional_kwargs: {
          pastSteps: state.pastSteps.map((pastStep) => {
            const [step, messages] = pastStep;
            const storedMessages = mapChatMessagesToStoredMessages(messages);
            return [step, storedMessages];
          }),
        },
      }),
    ];
    return { messages: responseMessages, plan: [], pastSteps: [] };
  } else if (response.type === "continue_planning") {
    return { plan: response.data as z.infer<typeof planArray> };
  } else {
    throw new Error("Invalid response from replanner");
  }
}

async function shouldEndPlanner(state: typeof GraphState.State) {
  if (!state.plan || state.plan.length === 0) {
    return "true";
  }

  return "false";
}

export const agentGraph = new StateGraph(GraphState)
  .addNode("simple", simple)
  .addNode("baseAgent", baseAgent)
  .addNode("planner", planner)
  .addNode("plannerAgent", plannerAgent)
  .addNode("replanner", replanner)
  .addConditionalEdges(START, shouldPlanOrAgentOrSimple, {
    planner: "planner",
    baseAgent: "baseAgent",
    simple: "simple",
  })
  .addEdge("baseAgent", END)
  .addEdge("planner", "plannerAgent")
  .addEdge("plannerAgent", "replanner")
  .addConditionalEdges("replanner", shouldEndPlanner, {
    true: END,
    false: "plannerAgent",
  });
