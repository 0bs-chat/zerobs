"use node";

import type { RunnableConfig } from "@langchain/core/runnables";
import {
	type ExtendedRunnableConfig,
	createSimpleAgent,
	createAgentWithTools,
	getAvailableToolsDescription,
} from "./helpers";
import {
	type CompletedStep,
	type GraphState,
	planSchema,
	planArray,
} from "./state";
import { modelSupportsTools, formatMessages, getModel, models } from "./models";
import {
	type BaseMessage,
	AIMessage,
	HumanMessage,
	ToolMessage,
	mapChatMessagesToStoredMessages,
} from "@langchain/core/messages";
import {
	createPlannerPrompt,
	createReplannerPrompt,
	replannerOutputSchema,
} from "./prompts";
import { type z } from "zod";
import { END, START, StateGraph } from "@langchain/langgraph/web";

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

function filterMessagesForReplanning(messages: BaseMessage[]): BaseMessage[] {
	const recentMessages = messages.slice(-20);

	const filteredMessages: BaseMessage[] = [];
	let skipNextAIMessage = false;

	for (let i = recentMessages.length - 1; i >= 0; i--) {
		const message = recentMessages[i];

		if (message instanceof ToolMessage) {
			skipNextAIMessage = true;
			continue;
		}

		if (message instanceof AIMessage && skipNextAIMessage) {
			if (message.tool_calls && message.tool_calls.length > 0) {
				skipNextAIMessage = false;
				continue;
			}
			skipNextAIMessage = false;
		}

		filteredMessages.unshift(message);
	}

	return filteredMessages;
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
	const availableToolsDescription = await getAvailableToolsDescription(
		state,
		formattedConfig,
	);
	const promptTemplate = createPlannerPrompt(availableToolsDescription);

	const model = await getModel(
		formattedConfig.ctx,
		formattedConfig.chat.model!,
		formattedConfig.chat.reasoningEffort,
	);

	// Get model config to check if it's anthropic
	const modelConfig = models.find(
		(m) => m.model_name === formattedConfig.chat.model!,
	);
	const isFunctionCallingParser = modelConfig?.parser === "functionCalling";

	const modelWithOutputParser = promptTemplate.pipe(
		isFunctionCallingParser
			? model.withStructuredOutput(planSchema, { method: "functionCalling" })
			: model.withStructuredOutput(planSchema),
	);

	const formattedMessages = await formatMessages(
		formattedConfig.ctx,
		state.messages,
		formattedConfig.chat.model!,
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

	const plannerAgentChain = await createAgentWithTools(
		state,
		formattedConfig,
		true,
	);

	const invoke = async ({ planItem }: { planItem: typeof currentPlanItem }) => {
		if (planItem.type === "single") {
			const response = await plannerAgentChain.invoke(
				{
					messages: [
						new HumanMessage(
							`Task: ${planItem.data.step}\nContext: ${planItem.data.context}`,
						),
					],
				},
				config,
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
			}),
		);

		return {
			plan: remainingPlan,
			pastSteps: [...pastSteps, ...responses],
		};
	}
}

async function replanner(
	state: typeof GraphState.State,
	config: RunnableConfig,
) {
	const formattedConfig = config.configurable as ExtendedRunnableConfig;
	const availableToolsDescription = await getAvailableToolsDescription(
		state,
		formattedConfig,
	);
	const promptTemplate = createReplannerPrompt(availableToolsDescription);

	const model = await getModel(
		formattedConfig.ctx,
		formattedConfig.chat.model!,
		formattedConfig.chat.reasoningEffort,
	);

	// Get model config to check if it's anthropic
	const outputSchema = replannerOutputSchema(formattedConfig.chat.artifacts);
	const modelConfig = models.find(
		(m) => m.model_name === formattedConfig.chat.model!,
	);
	const isFunctionCallingParser = modelConfig?.parser === "functionCalling";
	const modelWithOutputParser = promptTemplate.pipe(
		isFunctionCallingParser
			? model.withStructuredOutput(outputSchema, { method: "functionCalling" })
			: model.withStructuredOutput(outputSchema),
	);

	// Filter messages for replanning: last 20 steps, no tool calls
	const filteredMessages = filterMessagesForReplanning(state.messages);

	const formattedMessages = await formatMessages(
		formattedConfig.ctx,
		filteredMessages,
		formattedConfig.chat.model,
	);

	const response = (await modelWithOutputParser.invoke(
		{
			messages: formattedMessages,
			plan: state.plan,
			pastSteps: state.pastSteps
				.slice(-10) // Also limit pastSteps to last 10 for replanning
				.flatMap((pastStep) => {
					const [step, messages] = pastStep;
					// Filter out tool messages from past steps as well
					const filteredStepMessages = filterMessagesForReplanning(messages);
					const stepMessage = new HumanMessage(step as string);
					return [stepMessage, ...filteredStepMessages];
				}),
		},
		config,
	)) as z.infer<typeof outputSchema>;

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
