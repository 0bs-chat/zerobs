"use node";

import { getEmbeddingModel, getModel } from "./models";
import {
  Annotation,
  END,
  messagesStateReducer,
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
} from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { z } from "zod";
import type { Doc } from "../_generated/dataModel";
import { api } from "../_generated/api";
import { Document } from "langchain/document";
import type { TavilySearchResponse } from "@langchain/tavily";
import { formatDocumentsAsString } from "langchain/util/document";
import { getSearchTools, getMCPTools } from "./getTools";
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { AIMessage } from "@langchain/core/messages";
import { ConvexVectorStore } from "@langchain/community/vectorstores/convex";

type ExtendedRunnableConfig = RunnableConfig & {
  ctx: ActionCtx;
  chatInput: Doc<"chatInput">;
};

const plan = z
  .array(
    z.object({
      step: z.string().describe("The step to be executed"),
      additional_context: z
        .string()
        .describe("Additional context that may be needed to execute the step"),
    })
  )
  .describe("A step by step plan to achieve the objective")
  .min(1)
  .max(9);

const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  documents: Annotation<DocumentInterface[]>({
    reducer: (x, y) => y ?? x ?? [],
  }),
  lastNode: Annotation<Record<string, any>>({
    reducer: (x, y) => y ?? x ?? {},
  }),
  plan: Annotation<z.infer<typeof plan>>({
    reducer: (x, y) => y ?? x ?? [],
  }),
});

async function shouldRetrieve(
  _state: typeof GraphState.State,
  config: RunnableConfig
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
  config: RunnableConfig
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;
  const vectorStore = new ConvexVectorStore(getEmbeddingModel("text-embedding-004"), {
    ctx: formattedConfig.ctx,
    table: "documentVectors",
  });
  if (!formattedConfig.chatInput.model) {
    throw new Error("Model is required");
  }

  async function generateQueries(
    type: "vectorStore" | "webSearch",
    model: string,
    state: typeof GraphState.State,
    config: ExtendedRunnableConfig
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
      getModel(model).withStructuredOutput(
        z.object({
          queries: z
            .array(z.string())
            .describe("Queries for the " + type + ".")
            .max(3)
            .min(1),
        })
      )
    );

    const queries = await modelWithOutputParser.invoke({
      messages: state.messages.slice(-5),
      config,
    });

    return queries.queries;
  }

  // Retrive documents
  let documents: DocumentInterface[] = [];
  if (formattedConfig.chatInput.projectId) {
    const includedProjectDocuments = await formattedConfig.ctx.runQuery(
      api.projectDocuments.queries.getSelected,
      {
        projectId: formattedConfig.chatInput.projectId,
        selected: true,
      }
    );

    const queries = await generateQueries(
      "vectorStore",
      formattedConfig.chatInput.model,
      state,
      formattedConfig
    );
    await Promise.all(
      queries.map(async (query) => {
        const results = await vectorStore.similaritySearch(query, 4, {
          filter: (q) =>
            q.or(
              ...includedProjectDocuments.map((doc) =>
                q.eq("metadata", {
                  source: doc.documentId
                })
              )
            ),
        });
        documents.push(...results);
      })
    );
  }
  if (formattedConfig.chatInput.webSearch) {
    const searchTools = await getSearchTools();

    const queries = await generateQueries(
      "webSearch",
      formattedConfig.chatInput.model,
      state,
      formattedConfig
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
              searchTools.crawlWeb.invoke({ url: result.url })
            )
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
      })
    );
  }

  // Grade documents
  async function gradeDocument(
    model: string,
    document: DocumentInterface,
    message: BaseMessage,
    config: ExtendedRunnableConfig
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
      getModel(model).withStructuredOutput(
        z.object({
          relevant: z
            .boolean()
            .describe("Whether the document is relevant to the user question"),
        })
      )
    );

    const gradedDocument = await modelWithOutputParser.invoke(
      {
        document: document,
        message: message,
      },
      config
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
          formattedConfig
        ))
          ? document
          : null;
      })
    )
  ).filter((document) => document !== null);

  return {
    documents: gradedDocuments,
  };
}

async function passToShouldPlan(
  _state: typeof GraphState.State,
  _config: RunnableConfig
) {
  return {};
}

async function shouldPlan(
  _state: typeof GraphState.State,
  config: RunnableConfig
) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;

  if (formattedConfig.chatInput.plannerMode) {
    return "true";
  }

  return "false";
}

async function agent(state: typeof GraphState.State, config: RunnableConfig) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;

  const promptTemplate = ChatPromptTemplate.fromMessages([
    new SystemMessage(
      `You are 0bs Chat, an AI assistant powered by the ${formattedConfig.chatInput.model} model. ` +
        `Your role is to assist and engage in conversation while being helpful, respectful, and engaging.\n` +
        `- If you are specifically asked about the model you are using, you may mention that you use the ${formattedConfig.chatInput.model} model. If you are not asked specifically about the model you are using, you do not need to mention it.\n` +
        `- The current date and time is` +
        JSON.stringify(new Date().toLocaleString()) +
        `.\n` +
        `- Always use LaTeX for mathematical expressions.\n` +
        `   - Inline math must be wrapped in escaped parentheses: \( content \).\n` +
        `   - Do not use single dollar signs for inline math.\n` +
        `   - Display math must be wrapped in double dollar signs: $$ content $$.\n` +
        `- When generating code:\n` +
        `   - Ensure it is properly formatted using Prettier with a print width of 80 characters\n` +
        `   - Present it in Markdown code blocks with the correct language extension indicated\n`
    ),
    ...(state.documents && state.documents.length > 0
      ? [
          new HumanMessage(
            "Here are the documents that are relevant to the question: " +
              formatDocumentsAsString(state.documents)
          ),
        ]
      : []),
    new MessagesPlaceholder("messages"),
  ]);

  const tools = await getMCPTools(formattedConfig.ctx);
  const searchTools = await getSearchTools();

  if (!formattedConfig.chatInput.model) {
    throw new Error("Model is required");
  }

  let agent;
  if (!formattedConfig.chatInput.agentMode) {
    agent = createReactAgent({
      llm: getModel(formattedConfig.chatInput.model),
      tools: [
        ...(tools.tools.length > 0 ? tools.tools : []),
        ...(searchTools.tavily
          ? [searchTools.tavily]
          : [searchTools.duckduckgo, searchTools.crawlWeb]),
      ],
      prompt: promptTemplate,
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
        })
    );

    agent = createSupervisor({
      agents,
      tools: [],
      llm: getModel(formattedConfig.chatInput.model!),
      prompt:
        `You are 0bs Chat, an AI assistant powered by the ${formattedConfig.chatInput.model} model. ` +
        `Your role is to analyze the user's request and determine a plan of action to take. Assign each plan step to the appropriate agent, one at a time.\n`,
    }).compile();
  }

  const response = await agent.invoke(
    {
      messages: state.messages,
    },
    config
  );

  const newMessages = response.messages.slice(
    state.messages.length,
    response.messages.length
  );

  return {
    messages: newMessages,
  };
}

async function planner(state: typeof GraphState.State, config: RunnableConfig) {
  const formattedConfig = config.configurable as ExtendedRunnableConfig;

  const promptTemplate = ChatPromptTemplate.fromMessages([
    [
      "system",
      `For the given objective, come up with a simple step by step plan.\n` +
        `This plan should involve individual tasks, that if executed correctly will yield the correct answer. Do not add any superfluous steps.\n` +
        `The result of the final step should be the final answer. Make sure that each step has all the information needed - do not skip steps.\n`,
    ],
    new MessagesPlaceholder("messages"),
  ]);

  const modelWithOutputParser = promptTemplate.pipe(
    getModel(formattedConfig.chatInput.model!).withStructuredOutput(plan)
  );

  const response = await modelWithOutputParser.invoke(
    {
      messages: state.messages,
    },
    config
  );

  return {
    plan: response,
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

  const currentTask = state.plan[0];
  const remainingPlan = state.plan.slice(1);

  const promptTemplate = ChatPromptTemplate.fromMessages([
    new SystemMessage(
      `You are 0bs Chat, an AI assistant powered by the ${formattedConfig.chatInput.model} model. ` +
        `Your role is to complete the following specific task:\n` +
        `${currentTask.step}\n\n` +
        `Additional Context: ${currentTask.additional_context}\n\n` +
        `- If you are specifically asked about the model you are using, you may mention that you use the ${formattedConfig.chatInput.model} model.\n` +
        `- The current date and time is ${new Date().toLocaleString()}.\n` +
        `- Always use LaTeX for mathematical expressions.\n` +
        `   - Inline math must be wrapped in escaped parentheses: \( content \).\n` +
        `   - Do not use single dollar signs for inline math.\n` +
        `   - Display math must be wrapped in double dollar signs: $$ content $$.\n` +
        `- When generating code:\n` +
        `   - Ensure it is properly formatted using Prettier with a print width of 80 characters\n` +
        `   - Present it in Markdown code blocks with the correct language extension indicated\n`
    ),
    ...(state.documents.length > 0
      ? [
          new HumanMessage(
            "Here are the documents that are relevant to the question: " +
              formatDocumentsAsString(state.documents)
          ),
        ]
      : []),
    new MessagesPlaceholder("messages"),
  ]);

  const tools = await getMCPTools(formattedConfig.ctx);
  const searchTools = await getSearchTools();

  if (!formattedConfig.chatInput.model) {
    throw new Error("Model is required");
  }

  let agent;
  if (!formattedConfig.chatInput.agentMode) {
    agent = createReactAgent({
      llm: getModel(formattedConfig.chatInput.model),
      tools: [
        ...tools.tools,
        ...(searchTools.tavily
          ? [searchTools.tavily]
          : [searchTools.duckduckgo, searchTools.crawlWeb]),
      ],
      prompt: promptTemplate,
    });
  } else {
    const agents = Object.entries(tools.groupedTools).map(
      ([groupName, tools]) =>
        createReactAgent({
          llm: getModel(formattedConfig.chatInput.model!),
          tools,
          prompt: `You are a ${groupName} assistant`,
        })
    );

    agent = createSupervisor({
      agents,
      tools: [],
      llm: getModel(formattedConfig.chatInput.model!),
      prompt:
        `You are 0bs Chat, an AI assistant powered by the ${formattedConfig.chatInput.model} model. ` +
        `Your role is to analyze the user's request and determine a plan of action to take. Assign each plan step to the appropriate agent, one at a time.\n`,
    }).compile();
  }

  const response = await agent.invoke(
    {
      messages: state.messages,
    },
    config
  );

  const newMessages = response.messages.slice(-1).map((message) => {
    message.response_metadata["planSteps"] = currentTask;
    return message;
  });

  return {
    messages: newMessages,
    plan: remainingPlan,
  };
}

async function replanner(
  state: typeof GraphState.State,
  config: RunnableConfig
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
      `Update your plan accordingly. If no more steps are needed and you can return to the user, then respond with that and use the 'response' function. ` +
      `Otherwise, fill out the plan. Only add steps to the plan that still NEED to be done. Do not return previously done steps as part of the plan.`
  );

  const outputParser = z.union([
    plan,
    z.object({
      response: z.string().describe("The response to the user"),
    }),
  ]);

  const modelWithOutputParser = promptTemplate.pipe(
    getModel(formattedConfig.chatInput.model!).withStructuredOutput(
      outputParser
    )
  );

  const response = await modelWithOutputParser.invoke(
    {
      input: state.messages[state.messages.length - 2],
      plan: state.plan,
      pastSteps: state.messages
        .filter((message) => message.response_metadata["planSteps"])
        .map((message, index) => [
          new AIMessage(
            `${index}: ${JSON.stringify(message.response_metadata["planSteps"])}`
          ),
          message,
        ])
        .flat(),
    },
    config
  );

  if (typeof response === "object" && "response" in response) {
    return {
      messages: [
        new AIMessage(response.response, {
          response_metadata: {
            planSteps: {
              step: "Response",
            },
          },
        }),
      ],
    };
  } else {
    return {
      plan: response,
    };
  }
}

async function shouldEndPlanner(state: typeof GraphState.State) {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage.response_metadata["planSteps"]?.step === "Response") {
    return "true";
  }
  return "false";
}

export const agentGraph = new StateGraph(GraphState)
  .addNode("retrieve", retrieve)
  .addNode("passToShouldPlan", passToShouldPlan)
  .addNode("agent", agent)
  .addNode("planner", planner)
  .addNode("plannerAgent", plannerAgent)
  .addNode("replanner", replanner)
  .addConditionalEdges(START, shouldRetrieve, {
    true: "retrieve",
    false: "passToShouldPlan",
  })
  .addEdge("retrieve", "passToShouldPlan")
  .addConditionalEdges("passToShouldPlan", shouldPlan, {
    true: "planner",
    false: "agent",
  })
  .addEdge("agent", END)
  .addEdge("planner", "plannerAgent")
  .addEdge("plannerAgent", "replanner")
  .addConditionalEdges("replanner", shouldEndPlanner, {
    true: END,
    false: "plannerAgent",
  });
