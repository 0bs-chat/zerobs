"use node";

import { getEmbeddingModel, getModel, formatMessages, modelSupportsTools } from "./models";
import {
  END,
  START,
  StateGraph,
} from "@langchain/langgraph";
import type { DocumentInterface } from "@langchain/core/documents";
import type { RunnableConfig } from "@langchain/core/runnables";
import type { ActionCtx } from "../_generated/server";
import {
  BaseMessage,
  SystemMessage,
  HumanMessage,
  AIMessage,
  mapStoredMessageToChatMessage,
  mapChatMessagesToStoredMessages
} from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { z } from "zod";
import type { Doc } from "../_generated/dataModel";
import { Document } from "langchain/document";
import type { TavilySearchResponse } from "@langchain/tavily";
import { formatDocumentsAsString } from "langchain/util/document";
import { getSearchTools, getMCPTools } from "./getTools";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ConvexVectorStore } from "@langchain/community/vectorstores/convex";
import { internal } from "../_generated/api";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { OutputFixingParser } from "langchain/output_parsers";
import { GraphState, planSchema, planArray, type CompletedStep } from "./state";

type ExtendedRunnableConfig = RunnableConfig & {
  ctx: ActionCtx;
  chatInput: Doc<"chatInputs">;
};

function createStructuredOutputWithFallback<T extends z.ZodType>(schema: T): OutputFixingParser<z.infer<T>> {
  const baseParser = StructuredOutputParser.fromZodSchema(schema);
  return OutputFixingParser.fromLLM(
    getModel("worker"),
    baseParser
  );
}

// Helper function to create system message for agents
function createAgentSystemMessage(model: string, taskDescription?: string): SystemMessage {
  const baseIdentity = `You are 0bs Chat, an AI assistant powered by the ${model} model.`;
  
  const roleDescription = taskDescription 
    ? `Your role is to complete the following specific task, you will be given the user input as well for context but focus on the given task:\n${taskDescription}\n\n`
    : `Your role is to assist and engage in conversation while being helpful, respectful, and engaging.\n`;
  
  const guidelines = 
    `- If you are specifically asked about the model you are using, you may mention that you use the ${model} model. If you are not asked specifically about the model you are using, you do not need to mention it.\n` +
    `- The current date and time is ${new Date().toLocaleString()}.\n` +
    `- Always use LaTeX for mathematical expressions.\n` +
    `   - Inline math must be wrapped in escaped parentheses: \( content \).\n` +
    `   - Do not use single dollar signs for inline math.\n` +
    `   - Display math must be wrapped in double dollar signs: $$ content $$.\n` +
    `- When generating code:\n` +
    `   - Ensure it is properly formatted using Prettier with a print width of 80 characters\n` +
    `   - Present it in Markdown code blocks with the correct language extension indicated\n`;
  
  return new SystemMessage(`${baseIdentity} ${roleDescription}${guidelines}`);
}

// Helper function to create agent with tools
async function createAgentWithTools(
  formattedConfig: ExtendedRunnableConfig,
  promptTemplate: ChatPromptTemplate,
  name: string = "baseAgent",
) {
  const tools = await getMCPTools(formattedConfig.ctx);
  const searchTools = await getSearchTools(formattedConfig.ctx);

  if (!formattedConfig.chatInput.model) {
    throw new Error("Model is required");
  }

  if (!formattedConfig.chatInput.agentMode) {
    return createReactAgent({
      llm: getModel(formattedConfig.chatInput.model),
      tools: [
        ...(tools.tools.length > 0 ? tools.tools : []),
        ...(searchTools.tavily
          ? [searchTools.tavily]
          : [searchTools.duckduckgo, searchTools.crawlWeb]),
      ],
      prompt: promptTemplate,
      name: name,
    });
  } else {
    if (Object.keys(tools.groupedTools).length === 0) {
      throw new Error("Need atleast 1 mcp enabled to use planner mode");
    }
    const agents = Object.entries(tools.groupedTools).map(
      ([groupName, tools]) =>
        createReactAgent({
          llm: getModel(formattedConfig.chatInput.model!),
          tools,
          prompt: `You are a ${groupName} assistant`,
          name: `${name}-worker`,
        }),
    );

    return createSupervisor({
      agents,
      tools: [],
      llm: getModel(formattedConfig.chatInput.model!),
      prompt:
        `You are 0bs Chat, an AI assistant powered by the ${formattedConfig.chatInput.model} model. ` +
        `Your role is to analyze the user's request and determine a plan of action to take. Assign each plan step to the appropriate agent, one at a time.\n`,
      supervisorName: name,
    }).compile();
  }
}

async function shouldRetrieve(
  _state: typeof GraphState.State,
  config: RunnableConfig,
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;

  if (
    formattedConfig.chatInput.projectId ||
    formattedConfig.chatInput.webSearch
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
  const vectorStore = new ConvexVectorStore(
    getEmbeddingModel("embeddings"),
    {
      ctx: formattedConfig.ctx,
      table: "documentVectors",
    },
  );
  if (!formattedConfig.chatInput.model) {
    throw new Error("Model is required");
  }

  async function generateQueries(
    type: "vectorStore" | "webSearch",
    model: string,
    state: typeof GraphState.State,
    config: ExtendedRunnableConfig,
  ) {
    const promptTemplate = ChatPromptTemplate.fromMessages([
      [
        "system",
        "Based on the messages and the user's query, generate queries for the " +
          type +
          ".",
      ],
      new MessagesPlaceholder("messages"),
    ]);

    const modelWithOutputParser = promptTemplate.pipe(
      getModel("worker").withStructuredOutput(z.object({
        queries: z
          .array(z.string())
          .describe("Queries for the " + type + ".")
          .max(3)
          .min(1),
      }))
    );

    const formattedMessages = await formatMessages(config.ctx, state.messages.slice(-5), model);
    const queries = await modelWithOutputParser.invoke({
      messages: formattedMessages,
      config,
    });

    return queries.queries;
  }

  // Retrive documents
  let documents: DocumentInterface[] = [];
  if (formattedConfig.chatInput.projectId) {
    console.log("retrieving documents for project", formattedConfig.chatInput.projectId);
    const includedProjectDocuments = await formattedConfig.ctx.runQuery(
      internal.projectDocuments.queries.getSelected,
      {
        projectId: formattedConfig.chatInput.projectId,
        selected: true,
      },
    );
    console.log("includedProjectDocuments", includedProjectDocuments.length);
    const queries = await generateQueries(
      "vectorStore",
      formattedConfig.chatInput.model,
      state,
      formattedConfig,
    );

    await Promise.all(
      queries.map(async (query) => {
        const results = await vectorStore.similaritySearch(query, 4, {
          filter: q =>
            q.or(...includedProjectDocuments.map(document => q.eq("metadata", {
              source: document.documentId,
            }))),
        });
        documents.push(...results);
      }),
    );
  }
  if (formattedConfig.chatInput.webSearch) {
    const searchTools = await getSearchTools(formattedConfig.ctx);

    const queries = await generateQueries(
      "webSearch",
      formattedConfig.chatInput.model,
      state,
      formattedConfig,
    );
    await Promise.all(
      queries.map(async (query) => {
        if (searchTools.tavily) {
          const searchResults = (await searchTools.tavily._call({
            query: query,
            topic: "general",
            includeImages: false,
            includeDomains: [],
            excludeDomains: [],
            searchDepth: "basic",
          })) as TavilySearchResponse;
          const docs = searchResults.results.map((result) => {
            return new Document({
              pageContent: `${result.score}. ${result.title}\n${result.url}\n${result.content}`,
              metadata: {
                source: "tavily",
              },
            });
          });
          documents.push(...docs);
        } else {
          const searchResults = await searchTools.duckduckgo._call(query);
          const searchResultsArray: {
            title: string;
            url: string;
            snippet: string;
          }[] = JSON.parse(searchResults);
          const urlMarkdownContents = await Promise.all(
            searchResultsArray.map((result) =>
              searchTools.crawlWeb.invoke({ url: result.url }),
            ),
          );
          const docs = searchResultsArray.map((result, index) => {
            return new Document({
              pageContent: `${result.title}\n${result.url}\n${urlMarkdownContents[index]}`,
              metadata: {
                source: "duckduckgo",
              },
            });
          });
          documents.push(...docs);
        }
      }),
    );
  }

  // Grade documents
  async function gradeDocument(
    model: string,
    document: DocumentInterface,
    message: BaseMessage,
    config: ExtendedRunnableConfig,
  ) {
    const promptTemplate = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are a grader assessing relevance of a retrieved document to the user question (focus on the last message as the question).\n" +
          "If the document contains keyword(s) or semantic meaning related to the user question, grade it as relevant.",
      ],
      new MessagesPlaceholder("document"),
      new MessagesPlaceholder("message"),
    ]);

    const modelWithOutputParser = promptTemplate.pipe(
      getModel("worker").withStructuredOutput(z.object({
        relevant: z
          .boolean()
          .describe("Whether the document is relevant to the user question"),
      }))
    );

    const formattedMessage = await formatMessages(config.ctx, [message], model);
    const gradedDocument = await modelWithOutputParser.invoke(
      {
        document: formatDocumentsAsString([document]),
        message: formattedMessage[0],
      },
      config,
    );

    return gradedDocument.relevant;
  }
  const gradedDocuments = (
    await Promise.all(
      documents.map(async (document) => {
        return (await gradeDocument(
          formattedConfig.chatInput.model!,
          document,
          state.messages.slice(-1)[0],
          formattedConfig,
        ))
          ? document
          : null;
      }),
    )
  ).filter((document) => document !== null);

  return {
    documents: gradedDocuments,
  };
}

async function pass(
  _state: typeof GraphState.State,
  _config: RunnableConfig,
) {
  return {};
}

async function shouldPlanOrAgentOrSimple(
  _state: typeof GraphState.State,
  config: RunnableConfig,
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;
  if (!modelSupportsTools(formattedConfig.chatInput.model!)) {
    return "simple";
  }

  if (formattedConfig.chatInput.plannerMode) {
    return "planner";
  }

  return "baseAgent";
}

async function simple(state: typeof GraphState.State, config: RunnableConfig) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;

  const promptTemplate = ChatPromptTemplate.fromMessages([
    createAgentSystemMessage(formattedConfig.chatInput.model!),
    new MessagesPlaceholder("messages"),
  ]);

  const model = getModel(formattedConfig.chatInput.model!);
  const chain = promptTemplate.pipe(model);

  const formattedMessages = await formatMessages(formattedConfig.ctx, state.messages.slice(-100), formattedConfig.chatInput.model!);
  const response = await chain.invoke(
    {
      messages: formattedMessages,
    },
    config,
  );

  // Add documents to message metadata if available
  const responseWithDocuments = state.documents && state.documents.length > 0 
    ? new AIMessage({
        content: response.content,
        additional_kwargs: {
          ...response.additional_kwargs,
          documents: state.documents,
        },
      })
    : response;

  return {
    messages: [responseWithDocuments],
  };
}

async function baseAgent(state: typeof GraphState.State, config: RunnableConfig) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;

  const promptTemplate = ChatPromptTemplate.fromMessages([
    createAgentSystemMessage(formattedConfig.chatInput.model!),
    ...(state.documents && state.documents.length > 0
      ? [
          new HumanMessage(
            "Here are the documents that are relevant to the question: " +
              formatDocumentsAsString(state.documents),
          ),
        ]
      : []),
    new MessagesPlaceholder("messages"),
  ]);

  const agent = await createAgentWithTools(formattedConfig, promptTemplate);

  const formattedMessages = await formatMessages(formattedConfig.ctx, state.messages.slice(-100), formattedConfig.chatInput.model!);
  const response = await agent.invoke(
    {
      messages: formattedMessages,
    },
    config,
  );

  const newMessages = response.messages.slice(
    state.messages.length,
    response.messages.length,
  );

  // Add documents to message metadata
  const messagesWithDocuments = newMessages.map(message => {
    if (message._getType() === "ai" && state.documents && state.documents.length > 0) {
      return new AIMessage({
        content: message.content,
        additional_kwargs: {
          ...message.additional_kwargs,
          documents: state.documents,
        },
      });
    }
    return message;
  });

  return {
    messages: messagesWithDocuments,
    documents: []
  };
}

async function planner(state: typeof GraphState.State, config: RunnableConfig) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;

  const promptTemplate = ChatPromptTemplate.fromMessages([
    [
      "system",
      `For the given objective, come up with a simple step by step plan.\n` +
        `This plan should involve individual tasks, that if executed correctly will yield the correct answer. Do not add any superfluous steps.\n` +
        `The result of the final step should be the final answer. Make sure that each step has all the information needed - do not skip steps.\n\n` +
        `You can structure the plan in two ways:\n` +
        `1. Sequential steps: Use individual step objects for tasks that must be done one after another\n` +
        `2. Parallel steps: Use parallel_steps arrays for tasks that can be executed simultaneously\n\n` +
        `Example plan structure:\n` +
        `- Step 1: Research topic A\n` +
        `- Parallel steps: [Research topic B, Research topic C, Research topic D]\n` +
        `- Step 2: Combine all research findings\n` +
        `- Step 3: Generate final answer\n\n` +
        `Use parallel execution when steps are independent and can benefit from simultaneous execution.`,
    ],
    ...(state.documents && state.documents.length > 0
      ? [
          new HumanMessage(
            "Here are the documents that are relevant to the question: " +
              formatDocumentsAsString(state.documents),
          ),
        ]
      : []),
    new MessagesPlaceholder("messages"),
  ]);

  const structuredOutputParser = createStructuredOutputWithFallback(planSchema);
  const modelWithOutputParser = promptTemplate.pipe(
    getModel(formattedConfig.chatInput.model!)
  ).pipe(structuredOutputParser);

  const formattedMessages = await formatMessages(formattedConfig.ctx, state.messages.slice(-100), formattedConfig.chatInput.model!);
  const response = await modelWithOutputParser.invoke(
    {
      messages: formattedMessages,
    },
    config,
  );

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
  const pastSteps = state.pastSteps;

  // Handle parallel steps
  if (Array.isArray(currentPlanItem)) {
    const parallelSteps = currentPlanItem;
    
    // Execute all parallel steps simultaneously
    const parallelResults = await Promise.all(
      parallelSteps.map(async (step) => {
        const taskDescription = 
          `${step.step}\n\n` +
          `Additional Context: ${step.additional_context}`;

        const promptTemplate = ChatPromptTemplate.fromMessages([
          createAgentSystemMessage(formattedConfig.chatInput.model!, taskDescription),
          new MessagesPlaceholder("messages"),
        ]);

        const plannerAgent = await createAgentWithTools(formattedConfig, promptTemplate, "plannerAgent");
        const formattedMessages = await formatMessages(formattedConfig.ctx, state.messages.slice(-100), formattedConfig.chatInput.model!);
        
        const response = await plannerAgent.invoke(
          {
            messages: formattedMessages,
          },
          config,
        );
        const lastMessage = mapChatMessagesToStoredMessages(response.messages.slice(-1))[0];
        return {
          step,
          message: lastMessage
        };
      })
    );

    const parallelPastSteps = parallelResults.map((result, index) => [currentPlanItem[index], result.message]);
    return {
      plan: remainingPlan,
      pastSteps: [...pastSteps, parallelPastSteps],
    };
  } else {
    // Handle sequential step
    const currentTask = currentPlanItem;
    const taskDescription = 
      `${currentTask.step}\n\n` +
      `Additional Context: ${currentTask.additional_context}`;

    const promptTemplate = ChatPromptTemplate.fromMessages([
      createAgentSystemMessage(formattedConfig.chatInput.model!, taskDescription),
      ...(state.documents && state.documents.length > 0
        ? [
            new HumanMessage(
              "Here are the documents that are relevant to the question: " +
                formatDocumentsAsString(state.documents),
            ),
          ]
        : []),
      new MessagesPlaceholder("messages"),
    ]);

    const plannerAgent = await createAgentWithTools(formattedConfig, promptTemplate, "plannerAgent");

    const formattedMessages = await formatMessages(formattedConfig.ctx, state.messages.slice(-100), formattedConfig.chatInput.model!);
    const response = await plannerAgent.invoke(
      {
        messages: formattedMessages,
      },
      config,
    );

    const lastMessage = mapChatMessagesToStoredMessages(response.messages.slice(-1))[0];
    return {
      plan: remainingPlan,
      pastSteps: [...pastSteps, [currentTask, lastMessage]],
    };
  }
}

async function replanner(
  state: typeof GraphState.State,
  config: RunnableConfig,
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;

  const promptTemplate = ChatPromptTemplate.fromTemplate(
    `For the given objective, come up with a simple step by step plan. ` +
      `This plan should involve individual tasks that, if executed correctly, will yield the correct answer. Do not add any superfluous steps. ` +
      `The result of the final step should be the final answer. Make sure that each step has all the information needed - do not skip steps.\n\n` +
      `Your objective was this:` +
      new MessagesPlaceholder("input") +
      "\n\n" +
      `Your original plan was this:\n{plan}\n\n` +
      `You have currently done the following steps:\n${new MessagesPlaceholder("pastSteps")}\n\n` +
      `Update your plan accordingly. If no more steps are needed and you can return to the user, set action to "respond_to_user" and provide the response. ` +
      `Otherwise, set action to "continue_planning" and fill out the plan. Only add steps to the plan that still NEED to be done. Do not return previously done steps as part of the plan.`,
  );

  const planOutput = z.object({
    action: z.literal("continue_planning"),
    plan: planArray,
  })
  const responseOutput = z.object({
    action: z.literal("respond_to_user"),
    response: z.string().describe("A concise and informative response to the user, summarizing the results of the completed steps and addressing their original request."),
  })
  const outputSchema = z.union([planOutput, responseOutput]);
  const structuredOutputParser = createStructuredOutputWithFallback(outputSchema);
  const modelWithOutputParser = promptTemplate.pipe(
    getModel(formattedConfig.chatInput.model!)
  ).pipe(structuredOutputParser);

  const inputMessage = state.messages.slice().reverse().find(msg => msg._getType() === "human") || state.messages[state.messages.length - 1];
  const currentPastStepsMessages: BaseMessage[] = [];

  const pastSteps = state.pastSteps;

  pastSteps.forEach((entry, idx) => {
    if (entry.flat().length > 2) {
      // Parallel steps (array of CompletedStep)
      const parallelSteps = entry as CompletedStep[];
      parallelSteps.forEach((stepTuple, pIdx) => {
        const [plan, msg] = stepTuple;
        currentPastStepsMessages.push(
          new AIMessage(`${idx + 1}.${pIdx + 1} (Parallel): ${plan.step}\n${plan.additional_context}\n`),
          mapStoredMessageToChatMessage(msg),
        );
      });
    } else {
      // Single CompletedStep
      const [plan, msg] = entry as CompletedStep;
      currentPastStepsMessages.push(
        new AIMessage(`${idx + 1}. ${plan.step}\n${plan.additional_context}\n`),
        mapStoredMessageToChatMessage(msg),
      );
    }
  });

  const formattedInputMessage = await formatMessages(formattedConfig.ctx, [inputMessage], formattedConfig.chatInput.model!);
  const formattedPastStepsMessages = await formatMessages(formattedConfig.ctx, currentPastStepsMessages, formattedConfig.chatInput.model!);

  const response = await modelWithOutputParser.invoke(
    {
      input: formattedInputMessage[0],
      plan: state.plan,
      pastSteps: formattedPastStepsMessages,
    },
    config,
  );

  if (response.action === "respond_to_user") {
    const pastSteps = state.pastSteps.map((entry) => {
      if (entry.flat().length > 2) {
        // Parallel steps (array of CompletedStep)
        const parallelSteps = entry as CompletedStep[];
        return parallelSteps.map(([plan, msg]) => {
          return [ plan, msg ];
        });
      } else {
        // Single CompletedStep
        const [plan, msg] = entry as CompletedStep;
        return [ plan, msg ];
      }
    });

    return {
      messages: [new AIMessage({
        content: response.response,
        additional_kwargs: {
          pastSteps,
          documents: state.documents,
        },
      })],
      plan: [],
      pastSteps: [],
      documents: []
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
