"use node";

import type { RunnableConfig } from "@langchain/core/runnables";
import {
  type ExtendedRunnableConfig,
  createSimpleAgent,
  createAgentWithTools,
} from "./helpers";
import { type CompletedStep, GraphState, planSchema } from "./state";
import { modelSupportsTools, formatMessages, getModel } from "./models";
import { getLastMessage } from "./helpers";
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
import { END, START, StateGraph } from "@langchain/langgraph";

async function shouldPlanOrAgentOrSimple(
  _state: typeof GraphState.State,
  config: RunnableConfig,
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
    formattedConfig.chat.model!,
  );

  const response = await chain.invoke(
    {
      messages: formattedMessages,
    },
    config,
  );

  return {
    messages: [response],
  };
}

async function baseAgent(
  state: typeof GraphState.State,
  config: RunnableConfig,
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;

  const chain = await createAgentWithTools(state, formattedConfig);
  const formattedMessages = await formatMessages(
    formattedConfig.ctx,
    state.messages,
    formattedConfig.chat.model!,
  );

  const response = await chain.invoke(
    {
      messages: formattedMessages,
    },
    config,
  );

  let newMessages = response.messages.slice(
    formattedMessages.length,
  ) as BaseMessage[];

  return {
    messages: newMessages,
  };
}

async function planner(state: typeof GraphState.State, config: RunnableConfig) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;
  const promptTemplate = createPlannerPrompt();
  const modelWithOutputParser = promptTemplate.pipe(
    (
      await getModel(
        formattedConfig.ctx,
        formattedConfig.chat.model,
        formattedConfig.chat.reasoningEffort,
      )
    ).withStructuredOutput(planSchema),
  );

  const formattedMessages = await formatMessages(
    formattedConfig.ctx,
    state.messages,
    formattedConfig.chat.model,
  );

  const response = (await modelWithOutputParser.invoke(
    {
      messages: formattedMessages,
    },
    config,
  )) as z.infer<typeof planSchema>;

  return {
    plan: response.plan,
  };
}

async function plannerAgent(
  state: typeof GraphState.State,
  config: RunnableConfig,
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;

  if (!state.plan || state.plan.length === 0) {
    return {};
  }

  const currentPlanItem = state.plan[0];
  const remainingPlan = state.plan.slice(1);
  const pastSteps = state.pastSteps || [];

  const formattedPastSteps = pastSteps
    .map((pastStep) => {
      const [step, messages] = pastStep;
      const stepMessage = new HumanMessage(step as string);
      return [stepMessage, ...messages];
    })
    .flat();

  const plannerAgentChain = await createAgentWithTools(
    state,
    formattedConfig,
    true,
  );
  const response = await plannerAgentChain.invoke(
    {
      messages: [
        ...formattedPastSteps,
        new HumanMessage(`Task: ${currentPlanItem}`),
      ],
    },
    config,
  );

  const newMessages = response.messages.slice(
    formattedPastSteps.length + 1,
    response.messages.length,
  );
  const completedStep: CompletedStep = [currentPlanItem, newMessages];

  return {
    plan: remainingPlan,
    pastSteps: [...pastSteps, completedStep],
  };
}

async function replanner(
  state: typeof GraphState.State,
  config: RunnableConfig,
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;
  const promptTemplate = createReplannerPrompt();
  const modelWithOutputParser = promptTemplate.pipe(
    (
      await getModel(
        formattedConfig.ctx,
        formattedConfig.chat.model,
        formattedConfig.chat.reasoningEffort,
      )
    ).withStructuredOutput(
      replannerOutputSchema(formattedConfig.chat.artifacts),
    ),
  );

  const inputMessage = getLastMessage(state.messages, "human")?.message;
  const formattedMessages = await formatMessages(
    formattedConfig.ctx,
    [inputMessage!],
    formattedConfig.chat.model,
  );

  const response = (await modelWithOutputParser.invoke(
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
    config,
  )) as z.infer<ReturnType<typeof replannerOutputSchema>>;

  if (response.action === "respond_to_user") {
    const responseMessages = [
      new AIMessage({
        content: response.response,
        additional_kwargs: {
          pastSteps: state.pastSteps.map((pastStep) => {
            const [step, messages] = pastStep;
            const storedMessages = mapChatMessagesToStoredMessages(messages);
            return [step, storedMessages];
          }),
        },
      }),
    ];
    return {
      messages: responseMessages,
      plan: [],
      pastSteps: [],
    };
  } else if (response.action === "continue_planning") {
    return {
      plan: response.plan,
    };
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
