"use node";

import { RunnableConfig } from "@langchain/core/runnables";
import { Document } from "@langchain/core/documents";
import { ExtendedRunnableConfig, generateQueries, gradeDocument, createSimpleAgent, createAgentWithTools, getPlannerAgentResponse } from "./helpers";
import { GraphState, planSchema } from "./state";
import { getRetrievalTools } from "./tools";
import { modelSupportsTools, formatMessages, getModel } from "./models";
import { getLastMessage, addDocumentsToMessage, getDocumentsMessage } from "./helpers";
import { BaseMessage, AIMessage } from "@langchain/core/messages";
import { createPlannerPrompt, createReplannerPrompt, replannerOutputSchema } from "./prompts";
import { z } from "zod";
import { END, START, StateGraph } from "@langchain/langgraph";

async function shouldRetrieve(
  _state: typeof GraphState.State,
  config: RunnableConfig,
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;
  if (
    formattedConfig.chat.projectId ||
    formattedConfig.chat.webSearch
  ) {
    return "true";
  }

  return "false";
}

async function retrieve(
  state: typeof GraphState.State,
  config: RunnableConfig,
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;
  const retrievalTools = await getRetrievalTools(state, formattedConfig);
  
  if (!formattedConfig.chat.model) {
    throw new Error("Model is required");
  }

  let documents: Document[] = [];

  // Retrieve documents from project vector store
  if (formattedConfig.chat.projectId) {
    const queries = await generateQueries(
      state,
      formattedConfig,
      "vectorStore"
    );
    
    // Execute vector search for each query
    await Promise.all(queries.queries.map(async (query) => {
      const searchResults = await retrievalTools.vectorSearch.invoke({
        query: query,
        limit: 4,
      });
      
      if (Array.isArray(searchResults)) {
        documents.push(...searchResults.filter(doc => doc !== null) as Document[]);
      }
    }));
  }

  // Retrieve documents from web search
  if (formattedConfig.chat.webSearch) {
    const queries = await generateQueries(
      state,
      formattedConfig,
      "webSearch"
    );
    
    // Execute web search for each query
    await Promise.all(queries.queries.map(async (query) => {
      const searchResults = await retrievalTools.webSearch.invoke({
        query: query,
      });
      
      if (Array.isArray(searchResults)) {
        documents.push(...searchResults.filter(doc => doc !== null) as Document[]);
      }
    }));
  }

  // Grade documents for relevance
  const gradedDocuments: Document[] = [];
  if (documents.length > 0 && state.messages.length > 0) {
    await Promise.all(documents.map(async (document) => {
      const isRelevant = await gradeDocument(
        state,
        formattedConfig,
        document
      );
      
      if (isRelevant) {
        gradedDocuments.push(document);
      }
    }));
  }

  return {
    documents: gradedDocuments,
  };
}

async function pass(_state: typeof GraphState.State, _config: RunnableConfig) {
  return {};
}

async function shouldPlanOrAgentOrSimple(
  _state: typeof GraphState.State,
  config: RunnableConfig,
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;
  if (!modelSupportsTools(formattedConfig.chat.model!)) {
    return "simple";
  }

  if (formattedConfig.chat.deepSearchMode) {
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
  const documentsMessage = await getDocumentsMessage(state.documents);
  if (documentsMessage) { formattedMessages.splice(formattedMessages.length - 1, 0, documentsMessage) }

  const response = await chain.invoke(
    {
      messages: formattedMessages,
    },
    config,
  );

  const baseResponseWithDocuments = [addDocumentsToMessage(response, state.documents)];

  return {
    messages: baseResponseWithDocuments,
    documents: [], // reset documents
  };
}

async function baseAgent(state: typeof GraphState.State, config: RunnableConfig) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;

  const chain = await createAgentWithTools(state, formattedConfig);
  const formattedMessages = await formatMessages(
    formattedConfig.ctx,
    state.messages,
    formattedConfig.chat.model!,
  );
  const documentsMessage = await getDocumentsMessage(state.documents);
  let inputMessagesCount = formattedMessages.length;
  if (documentsMessage) { 
    formattedMessages.splice(formattedMessages.length - 1, 0, documentsMessage);
    inputMessagesCount = formattedMessages.length;
  }

  const response = await chain.invoke(
    {
      messages: formattedMessages,
    },
    config,
  );

  let newMessages = response.messages.slice(inputMessagesCount) as BaseMessage[];

  // append documents to last ai message
  const lastAIMessageResult = getLastMessage(newMessages, "ai");
  if (lastAIMessageResult) {
    const { message, index } = lastAIMessageResult;
    const updatedMessage = addDocumentsToMessage(message, state.documents);
    newMessages[index] = updatedMessage;
  }

  return {
    messages: newMessages,
    documents: [], // reset documents
  };
}

async function planner(state: typeof GraphState.State, config: RunnableConfig) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;
  const promptTemplate = createPlannerPrompt(state.documents);
  const modelWithOutputParser = promptTemplate.pipe(
    (await getModel(formattedConfig.ctx, formattedConfig.chat.model, formattedConfig.chat.reasoningEffort)).withStructuredOutput(planSchema)
  );

  const formattedMessages = await formatMessages(
    formattedConfig.ctx,
    state.messages,
    formattedConfig.chat.model,
  );

  const response = await modelWithOutputParser.invoke(
    {
      messages: formattedMessages,
    },
    config,
  ) as z.infer<typeof planSchema>;

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

  const formattedMessages = await formatMessages(
    formattedConfig.ctx,
    state.messages,
    formattedConfig.chat.model!,
  );
  const documentsMessage = await getDocumentsMessage(state.documents);
  if (documentsMessage) { formattedMessages.splice(formattedMessages.length - 1, 0, documentsMessage) }


  if (Array.isArray(currentPlanItem)) {
    const parallelResults = await Promise.all(
      currentPlanItem.map(async (step) => {
        const plannerAgentChain = await createAgentWithTools(state, formattedConfig, step);
        const response = await plannerAgentChain.invoke(
          {
            messages: formattedMessages,
          },
          config,
        );

        const message = getPlannerAgentResponse(response.messages);
        return [step, message];
      }),
    );

    return {
      plan: remainingPlan,
      pastSteps: [...pastSteps, ...parallelResults],
      documents: [],
    };
  } else {
    const plannerAgentChain = await createAgentWithTools(state, formattedConfig, currentPlanItem);
    const response = await plannerAgentChain.invoke(
      {
        messages: formattedMessages,
      },
      config,
    );

    const message = getPlannerAgentResponse(response.messages);

    return {
      plan: remainingPlan,
      pastSteps: [...pastSteps, [currentPlanItem, message]],
      documents: [],
    };
  }
}

async function replanner(
  state: typeof GraphState.State,
  config: RunnableConfig,
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;
  const promptTemplate = createReplannerPrompt();
  const modelWithOutputParser = promptTemplate.pipe(
    (await getModel(formattedConfig.ctx, formattedConfig.chat.model, formattedConfig.chat.reasoningEffort)).withStructuredOutput(replannerOutputSchema)
  );

  const inputMessage = getLastMessage(state.messages, "human")?.message;
  const formattedInputMessage = (await formatMessages(
    formattedConfig.ctx,
    [inputMessage!],
    formattedConfig.chat.model,
  ))[0];

  const response = await modelWithOutputParser.invoke(
    {
      input: formattedInputMessage,
      plan: state.plan,
      pastSteps: state.pastSteps,
    },
    config,
  ) as z.infer<typeof replannerOutputSchema>;

  if (response.action === "respond_to_user") {
    return {
      messages: [
        new AIMessage({
          content: response.response,
          additional_kwargs: {
            pastSteps: state.pastSteps,
            documents: state.documents,
          },
        }),
      ],
      plan: [],
      pastSteps: [],
      documents: [],
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
  .addNode("retrieve", retrieve)
  .addNode("pass", pass)
  .addNode("simple", simple)
  .addNode("baseAgent", baseAgent)
  .addNode("planner", planner)
  .addNode("plannerAgent", plannerAgent)
  .addNode("replanner", replanner)
  .addConditionalEdges(START, shouldRetrieve, {
    true: "retrieve",
    false: "pass",
  })
  .addEdge("retrieve", "pass")
  .addConditionalEdges("pass", shouldPlanOrAgentOrSimple, {
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
