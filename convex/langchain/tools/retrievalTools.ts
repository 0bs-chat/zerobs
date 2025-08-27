"use node";

import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { ConvexVectorStore } from "@langchain/community/vectorstores/convex";
import { Document } from "@langchain/core/documents";
import { z } from "zod";
import Exa from "exa-js";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { getEmbeddingModel } from "../models";
import type { GraphState } from "../state";
import type { ExtendedRunnableConfig } from "../helpers";
import { getDocumentUrl } from "../../utils/helpers";
import { DynamicStructuredTool } from "@langchain/core/tools";

export const getRetrievalTools = async (
	_state: typeof GraphState.State,
	config: ExtendedRunnableConfig,
	returnString: boolean = false,
) => {
	const vectorSearchTool = new DynamicStructuredTool({
		name: "searchProjectDocuments",
		description:
			"Search through project documents using vector similarity search with multiple queries (1-5). Use this to find relevant information from uploaded project documents." +
			"You are always supposed to use this tool if you are asked about something specific to find information but no additional information is provided.",
		schema: z.object({
			queries: z
				.array(z.string())
				.min(1)
				.max(5)
				.describe(
					"List of search queries to find relevant documents (1-5 queries)",
				),
			limit: z
				.number()
				.min(1)
				.max(256)
				.describe("Number of results to return")
				.default(10),
		}),
		func: async ({
			queries,
			limit = 10,
		}: {
			queries: string[];
			limit?: number;
		}) => {
			await dispatchCustomEvent("tool_progress", {
				chunk: "Initializing vector store...",
			});
			// Initialize ConvexVectorStore with the embedding model
			const embeddingModel = await getEmbeddingModel(config.ctx, "embeddings");
			const vectorStore = new ConvexVectorStore(embeddingModel, {
				ctx: config.ctx,
				table: "documentVectors",
			});

			await dispatchCustomEvent("tool_progress", {
				chunk: "Loading selected project documents...",
			});
			const includedProjectDocuments = await config.ctx.runQuery(
				internal.projectDocuments.queries.getSelected,
				{
					projectId: config.chat.projectId!,
					selected: true,
				},
			);

			if (includedProjectDocuments.length === 0) {
				const msg = "No project documents available for retrieval.";
				await dispatchCustomEvent("tool_progress", { chunk: msg });
				return msg;
			}

			await dispatchCustomEvent("tool_progress", {
				chunk: "Searching vector index...",
			});
			// Perform similarity search for each query, filtering by selected documents
			let allResults = [];
			for (const query of queries) {
				const results = await vectorStore.similaritySearch(
					query,
					Math.ceil(limit / queries.length),
					{
						filter: (q) =>
							q.or(
								// Assuming documentId is stored in the `source` field of metadata
								...includedProjectDocuments.map((document) =>
									q.eq("metadata", {
										source: document.documentId,
									}),
								),
							),
					},
				);

				// Add query metadata to results
				const resultsWithQuery = results.map((doc) => ({
					...doc,
					metadata: { ...doc.metadata, query },
				}));

				allResults.push(...resultsWithQuery);
			}

			// Limit total results and remove duplicates based on content similarity
			allResults = allResults.slice(0, limit);

			await dispatchCustomEvent("tool_progress", {
				chunk: `Found ${allResults.length} results. Building response...`,
			});
			const documentsMap = new Map<Id<"documents">, Doc<"documents">>();
			includedProjectDocuments.forEach((projectDocument) => {
				if (projectDocument.document) {
					documentsMap.set(
						projectDocument.documentId,
						projectDocument.document,
					);
				}
			});

			const documents = await Promise.all(
				allResults.map(async (doc) => {
					const projectDocument = documentsMap.get(
						(doc.metadata as any).source,
					);
					if (!projectDocument) {
						return null;
					}
					const url = await getDocumentUrl(config.ctx, projectDocument.key);

					return new Document({
						pageContent: doc.pageContent,
						metadata: {
							document: projectDocument,
							source: url,
							type: "document",
							query: doc.metadata.query,
						},
					});
				}),
			);

			await dispatchCustomEvent("tool_progress", {
				chunk: "Formatting final output...",
			});
			return returnString ? JSON.stringify(documents, null, 0) : documents;
		},
	});

	const webSearchTool = new DynamicStructuredTool({
		name: "searchWeb",
		description:
			"Search the web for current information using multiple queries (1-5) with Exa (if API key is configured) or DuckDuckGo. Use this to find up-to-date information from the internet.",
		schema: z.object({
			queries: z
				.array(z.string())
				.min(1)
				.max(5)
				.describe(
					"List of search queries to find relevant web information (1-5 queries)",
				),
			topic: z
				.union([
					z.literal("company"),
					z.literal("research paper"),
					z.literal("news"),
					z.literal("pdf"),
					z.literal("github"),
					z.literal("personal site"),
					z.literal("linkedin profile"),
					z.literal("financial report"),
				])
				.describe(
					"The topic of the search query (e.g., 'news', 'finance', ). By default, it will perform a google search." +
						"### SEARCH STRATEGY EXAMPLES:\n" +
						`- Topic: "AI model performance" → Search: "GPT-4 benchmark results 2024", "LLM performance comparison studies", "AI model evaluation metrics research"` +
						`- Topic: "Company financials" → Search: "Tesla Q3 2024 earnings report", "Tesla revenue growth analysis", "electric vehicle market share 2024"` +
						`- Topic: "Technical implementation" → Search: "React Server Components best practices", "Next.js performance optimization techniques", "modern web development patterns"` +
						`### USAGE GUIDELINES:\n` +
						`- Search first, search often, search comprehensively` +
						`- Make 1-3 targeted searches per research topic to get different angles and perspectives` +
						`- Search queries should be specific and focused` +
						`- Follow up initial searches with more targeted queries based on what you learn` +
						`- Cross-reference information by searching for the same topic from different angles` +
						`- Search for contradictory information to get balanced perspectives` +
						`- Include exact metrics, dates, technical terms, and proper nouns in queries` +
						`- Make searches progressively more specific as you gather context` +
						`- Search for recent developments, trends, and updates on topics` +
						`- Always verify information with multiple searches from different sources`,
				)
				.nullable()
				.optional(),
		}),
		func: async ({
			queries,
			topic,
		}: {
			queries: string[];
			topic?: string | null;
		}) => {
			await dispatchCustomEvent("tool_progress", {
				chunk: "Preparing web search...",
			});
			const EXA_API_KEY =
				(
					await config.ctx.runQuery(internal.apiKeys.queries.getFromKey, {
						key: "EXA_API_KEY",
					})
				)?.value ??
				process.env.EXA_API_KEY ??
				"";

			try {
				await dispatchCustomEvent("tool_progress", {
					chunk: "Searching the Internet...",
				});
				const exa = new Exa(EXA_API_KEY, undefined);
				let allDocuments = [];

				for (const query of queries) {
					const searchResponse = (
						await exa.searchAndContents(query, {
							numResults: Math.ceil(10 / queries.length),
							type: "auto",
							useAutoprompt: false,
							topic: topic,
							text: true,
						})
					).results;

					if (searchResponse.length === 0) {
						const msg = `No results found for query: ${query}`;
						await dispatchCustomEvent("tool_progress", { chunk: msg });
						return msg;
					}

					await dispatchCustomEvent("tool_progress", {
						chunk: `Found ${searchResponse.length} results.`,
					});

					// Create LangChain Document objects from Exa search results
					const documents = searchResponse.map((result) => {
						return new Document({
							pageContent: `${result.text}`,
							metadata: {
								type: "search",
								title: result.title,
								source: result.url,
								publishedDate: result.publishedDate,
								author: result.author,
								image: result.image,
								favicon: result.favicon,
								query: query,
							},
						});
					});

					allDocuments.push(...documents);
				}

				if (allDocuments.length === 0) {
					return "No results found.";
				}

				// Limit total results to 10
				const documents = allDocuments.slice(0, 10);

				return returnString ? JSON.stringify(documents, null, 0) : documents;
			} catch (error) {
				const msg = `Web search failed: ${
					error instanceof Error ? error.message : "Unknown error"
				}`;
				await dispatchCustomEvent("tool_progress", { chunk: msg });
				return msg;
			}
		},
	});

	return {
		vectorSearch: vectorSearchTool,
		webSearch: webSearchTool,
	};
};
