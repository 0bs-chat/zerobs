"use node";

import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import {
	BaseMessage,
	type DataContentBlock,
	HumanMessage,
	type MessageContentComplex,
	ToolMessage,
} from "@langchain/core/messages";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import mime from "mime";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { ActionCtx } from "../_generated/server";
import { getDocumentUrl } from "../utils/helpers";

export const models: {
	label: string;
	model_name: string;
	model: string;
	isThinking: boolean;
	toolSupport: boolean;
	provider: "openai" | "google";
	modalities: ("text" | "image" | "pdf")[];
	image: string;
	description: string;
	owner:
		| "openai"
		| "google"
		| "x-ai"
		| "anthropic"
		| "deepseek"
		| "moonshotai"
		| "openrouter"
		| "cypher"
		| "qwen"
		| "z-ai"
		| "kimi"
		| "nvidia";
	usageRateMultiplier: number;
	hidden?: boolean;
	type?: "chat" | "embeddings";
	temperature?: number;
	parser?: "base" | "functionCalling";
}[] = [
	{
		label: "GPT-5 Mini",
		model_name: "gpt-5-mini",
		model: "openai/gpt-5-mini",
		isThinking: true,
		toolSupport: false,
		provider: "openai",
		modalities: ["text", "image"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqeptdPa1iGzX5t6K9HPo7rZCflV3QEyx01m8u",
		description:
			"GPT-5 Mini is a compact version of GPT-5, designed to handle lighter-weight reasoning tasks. It provides the same instruction-following and safety-tuning benefits as GPT-5, but with reduced latency and cost. GPT-5 Mini is the successor to OpenAI's o4-mini model.",
		owner: "openai",
		usageRateMultiplier: 1.0,
		temperature: 0.3,
	},
	{
		label: "GPT-5 Chat",
		model_name: "gpt-5-chat",
		model: "openai/gpt-5-chat",
		isThinking: false,
		toolSupport: false,
		provider: "openai",
		modalities: ["text", "image"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqeptdPa1iGzX5t6K9HPo7rZCflV3QEyx01m8u",
		description:
			"GPT-5 Chat is designed for advanced, natural, multimodal, and context-aware conversations for enterprise applications.",
		owner: "openai",
		usageRateMultiplier: 1.0,
		temperature: 0.3,
	},
	{
		label: "GPT-5 Codex",
		model_name: "gpt-5-codex",
		model: "openai/gpt-5-codex",
		isThinking: true,
		toolSupport: false,
		provider: "openai",
		modalities: ["text", "image"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqeptdPa1iGzX5t6K9HPo7rZCflV3QEyx01m8u",
		description:
			"GPT-5 Chat is designed for advanced, natural, multimodal, and context-aware conversations for enterprise applications.",
		owner: "openai",
		usageRateMultiplier: 1.0,
		temperature: 0.3,
	},
	{
		label: "Gemini 2.5 Flash",
		model_name: "gemini-2.5-flash",
		model: "google/gemini-2.5-flash",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image", "pdf"],
		image:
			"https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
		description:
			"Gemini 2.5 Flash is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
		owner: "google",
		usageRateMultiplier: 1.0,
		temperature: 1.0,
		parser: "functionCalling",
	},
	{
		label: "Gemini 2.5 Flash Thinking",
		model_name: "gemini-2.5-flash-thinking",
		model: "google/gemini-2.5-flash",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image", "pdf"],
		image:
			"https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
		description:
			"Gemini 2.5 Flash Thinking is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
		owner: "google",
		usageRateMultiplier: 1.0,
		temperature: 1.0,
		parser: "functionCalling",
	},
	{
		label: "Gemini 2.5 Pro",
		model_name: "gemini-2.5-pro",
		model: "google/gemini-2.5-pro-preview",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image", "pdf"],
		image:
			"https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
		description:
			"Gemini 2.5 Pro is an advanced model designed for high-performance tasks across various modalities.",
		owner: "google",
		usageRateMultiplier: 2.0,
		temperature: 1.0,
		parser: "functionCalling",
	},

	{
		label: "GPT-4.1",
		model_name: "gpt-4.1",
		model: "openai/gpt-4.1",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqeptdPa1iGzX5t6K9HPo7rZCflV3QEyx01m8u",
		description:
			"GPT-4.1 is a state-of-the-art language model capable of understanding and generating human-like text.",
		owner: "openai",
		usageRateMultiplier: 1.5,
	},
	{
		label: "o4 mini",
		model_name: "o4-mini",
		model: "openai/o4-mini",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqeptdPa1iGzX5t6K9HPo7rZCflV3QEyx01m8u",
		description:
			"o4 mini is a state-of-the-art language model capable of understanding and generating human-like text.",
		owner: "openai",
		usageRateMultiplier: 1.0,
	},
	{
		label: "o3",
		model_name: "o3",
		model: "openai/o3",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqeptdPa1iGzX5t6K9HPo7rZCflV3QEyx01m8u",
		description:
			"o3 is a state-of-the-art language model capable of understanding and generating human-like text.",
		owner: "openai",
		usageRateMultiplier: 1.5,
	},
	{
		label: "GPT OSS 120B",
		model_name: "gpt-oss-120b",
		model: "openai/gpt-oss-120b",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		modalities: ["text"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqeptdPa1iGzX5t6K9HPo7rZCflV3QEyx01m8u",
		description:
			"GPT OSS 120B is an open-weight, 117B-parameter Mixture-of-Experts (MoE) language model from OpenAI designed for high-reasoning, agentic, and general-purpose production use cases. It activates 5.1B parameters per forward pass and supports configurable reasoning depth, full chain-of-thought access, and native tool use.",
		owner: "openai",
		usageRateMultiplier: 1.0,
		temperature: 0.3,
	},
	{
		label: "Claude 4",
		model_name: "claude-4",
		model: "anthropic/claude-sonnet-4",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image", "pdf"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqERtPmCxK7iJruFcAblpzLxNM30vHj4R1XQGm",
		description:
			"Claude 4 is a versatile model that excels in various text and image processing tasks.",
		owner: "anthropic",
		usageRateMultiplier: 2.0,
		temperature: 0.5,
		parser: "functionCalling",
	},
	{
		label: "Claude 4.5",
		model_name: "claude-4.5",
		model: "anthropic/claude-sonnet-4.5",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image", "pdf"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqERtPmCxK7iJruFcAblpzLxNM30vHj4R1XQGm",
		description:
			"Claude Sonnet 4.5 is Anthropic’s most advanced Sonnet model to date, optimized for real-world agents and coding workflows.",
		owner: "anthropic",
		usageRateMultiplier: 2.0,
		temperature: 0.5,
		parser: "functionCalling",
	},
	{
		label: "Worker",
		model_name: "worker",
		model: "google/gemini-2.0-flash-001",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image", "pdf"],
		image:
			"https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
		description:
			"The Worker model is designed for specialized tasks requiring high efficiency.",
		owner: "openai",
		usageRateMultiplier: 1.0,
		hidden: true,
		temperature: 1.0,
		parser: "functionCalling",
	},
	{
		label: "Deepseek R1",
		model_name: "deepseek-r1-0528",
		model: "deepseek/deepseek-r1-0528:free",
		isThinking: true,
		toolSupport: false,
		provider: "openai",
		modalities: ["text"],
		image:
			"https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWSc6tHQtOkQ3diauvF12HnrWNtOmhI0eYwBKzf",
		description:
			"Deepseek R1 is a model focused on deep learning tasks with a strong emphasis on text processing.",
		owner: "deepseek",
		usageRateMultiplier: 1.0,
	},
	{
		label: "Embeddings",
		model_name: "embeddings",
		model: "text-embedding-004",
		isThinking: false,
		toolSupport: false,
		provider: "google",
		modalities: ["text"],
		image:
			"https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
		description:
			"The Embeddings model is designed for generating high-quality text embeddings.",
		usageRateMultiplier: 1.0,
		hidden: true,
		owner: "google",
		type: "embeddings",
	},
	{
		label: "Grok 3 Mini",
		model_name: "grok-3-mini",
		model: "x-ai/grok-3-mini-beta",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		modalities: ["text"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqTWQGWJKcCZGuB4JXj70amYe8kDsr5IfyOV6o",
		description:
			"Grok 3 Mini is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
		owner: "x-ai",
		usageRateMultiplier: 1.5,
	},
	{
		label: "Grok 4",
		model_name: "grok-4",
		model: "x-ai/grok-4",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		modalities: ["text", "image"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqTWQGWJKcCZGuB4JXj70amYe8kDsr5IfyOV6o",
		description:
			"Grok 4 is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
		owner: "x-ai",
		usageRateMultiplier: 2.0,
	},
	{
		label: "Grok 4 Fast",
		model_name: "grok-4-fast",
		model: "x-ai/grok-4-fast:free",
		isThinking: true,
		toolSupport: false,
		provider: "openai",
		modalities: ["text", "image"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgqTWQGWJKcCZGuB4JXj70amYe8kDsr5IfyOV6o",
		description:
			"Grok 4 Fast is xAI's latest multimodal model with SOTA cost-efficiency and a 2M token context window",
		owner: "x-ai",
		usageRateMultiplier: 2.0,
	},
	{
		label: "Kimi K2",
		model_name: "kimi-k2",
		model: "moonshotai/kimi-k2:free",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		modalities: ["text"],
		image:
			"https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://moonshot.ai&size=256",
		description:
			"Kimi K2 is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
		owner: "moonshotai",
		usageRateMultiplier: 1.0,
	},
	{
		label: "Qwen 3 235B",
		model_name: "qwen3-235b-a22b-2507",
		model: "qwen/qwen3-235b-a22b-2507:free",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		owner: "qwen",
		modalities: ["text"],
		image: "https://www.google.com/s2/favicons?domain=chat.qwen.ai&sz=256",
		description:
			"Qwen 3 235B is a large language model from Qwen, suitable for a wide range of text generation tasks.",
		usageRateMultiplier: 1.0,
		parser: "functionCalling",
	},
	{
		label: "Qwen 3 Coder",
		model_name: "qwen3-coder",
		model: "qwen/qwen3-coder:free",
		isThinking: false,
		toolSupport: true,
		provider: "openai",
		owner: "qwen",
		modalities: ["text"],
		image: "https://www.google.com/s2/favicons?domain=chat.qwen.ai&sz=256",
		description:
			"Qwen 3 Coder is a code-focused model from Qwen, designed for programming and code generation tasks.",
		usageRateMultiplier: 1.0,
		parser: "functionCalling",
	},
	{
		label: "GLM 4.5",
		model_name: "glm-4.5",
		model: "z-ai/glm-4.5",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		owner: "z-ai",
		modalities: ["text"],
		image: "https://z-cdn.chatglm.cn/z-blog/z-icon.svg",
		description:
			"Latest flagship model from Z-AI, designed for a wide range of tasks.",
		usageRateMultiplier: 1.0,
		parser: "functionCalling",
	},
	{
		label: "GLM 4.5 Air",
		model_name: "glm-4.5-air",
		model: "z-ai/glm-4.5-air",
		isThinking: true,
		toolSupport: true,
		provider: "openai",
		owner: "z-ai",
		modalities: ["text"],
		image: "https://z-cdn.chatglm.cn/z-blog/z-icon.svg",
		description: "Lightweight version of GLM 4.5",
		usageRateMultiplier: 1.0,
		parser: "functionCalling",
	},

	{
		label: "Nemotron Nano 9B v2",
		model_name: "nemotron-nano-9b-v2",
		model: "nvidia/nemotron-nano-9b-v2",
		isThinking: true,
		toolSupport: false,
		provider: "openai",
		owner: "nvidia",
		modalities: ["text"],
		image:
			"https://ypazyw0thq.ufs.sh/f/38t7p527clgq738p6aIYty0zsu2PpBGJxga1efWZASI7i4DU",
		description:
			"Nemotron Nano 9B v2 is a small language model from Nvidia, designed for a wide range of tasks.",
		usageRateMultiplier: 1.0,
		parser: "functionCalling",
	},
];

export async function getModel(
	ctx: ActionCtx,
	model: string,
	reasoningEffort: "low" | "medium" | "high" | undefined,
	userId?: string,
): Promise<BaseChatModel> {
	const modelConfig = models.find((m) => m.model_name === model);

	if (!modelConfig) {
		throw new Error(`Model ${model} not found in configuration`);
	}

	const OPENAI_API_KEY =
		(
			await ctx.runQuery(internal.apiKeys.queries.getFromKey, {
				key: "OPENAI_API_KEY",
				userId,
			})
		)?.value ?? process.env.OPENAI_API_KEY;

	return new ChatOpenAI({
		model: modelConfig.model,
		apiKey: OPENAI_API_KEY,
		temperature: modelConfig.temperature ?? 0.3,
		reasoning: {
			effort: reasoningEffort,
		},
		configuration: {
			baseURL: "https://openrouter.ai/api/v1",
		},
	});
}

export async function getEmbeddingModel(
	ctx: ActionCtx,
	model: string,
	userId?: string,
) {
	const modelConfig = models.find((m) => m.model_name === model);

	if (!modelConfig || !modelConfig.modalities.includes("text")) {
		throw new Error(`Model ${model} not found in configuration`);
	}

	const API_KEY =
		(
			await ctx.runQuery(internal.apiKeys.queries.getFromKey, {
				key:
					modelConfig.provider === "google"
						? "GOOGLE_EMBEDDING_API_KEY"
						: "OPENAI_EMBEDDING_API_KEY",
				userId,
			})
		)?.value ??
		process.env[
			modelConfig.provider === "google" ? "GOOGLE_API_KEY" : "OPENAI_API_KEY"
		];

	if (modelConfig.provider === "google") {
		return new GoogleGenerativeAIEmbeddings({
			model: modelConfig.model,
			apiKey: API_KEY,
		});
	} else {
		return new OpenAIEmbeddings({
			model: modelConfig.model,
			apiKey: API_KEY,
		});
	}
}

export async function formatMessages(
	ctx: ActionCtx,
	messages: BaseMessage[],
	model: string,
): Promise<BaseMessage[]> {
	const modelConfig = models.find((m) => m.model_name === model);

	if (!modelConfig) {
		throw new Error(`Model ${model} not found in configuration`);
	}

	const supportedTags = modelConfig.modalities;

	// Process all messages in parallel
	const formattedMessages = await Promise.all(
		messages.map(async (message) => {
			if (message instanceof HumanMessage || message instanceof ToolMessage) {
				const content = message.content;

				// If content is a string, no processing needed
				if (typeof content === "string") {
					return message;
				}

				// If content is an array, check each item
				if (Array.isArray(content)) {
					// Process all content items in parallel
					const processedContent = await Promise.all(
						content.map(async (contentItem, index) => {
							if (typeof contentItem === "object") {
								if (contentItem.type === "file" && "file" in contentItem) {
									const documentId = contentItem.file?.file_id;
									const document = await ctx.runQuery(
										internal.documents.crud.read,
										{
											id: documentId as Id<"documents">,
										},
									);
									if (!document) {
										return contentItem;
									}
									if (document.type === "file") {
										const mimeType =
											mime.getType(document.name) ?? "application/octet-stream";
										const fileType =
											mimeType === "application/pdf"
												? "pdf"
												: mimeType.split("/")[0];
										if (
											supportedTags.includes(
												fileType as "text" | "image" | "pdf",
											)
										) {
											// Special handling for CSV files - only pass first 10 rows
											if (mimeType === "text/csv") {
												const blob = await ctx.storage.get(
													document.key as Id<"_storage">,
												);
												const csvText = (await blob?.text()) || "";
												const lines = csvText.split("\n");
												const header = lines[0];
												const dataRows = lines.slice(1, 11); // Take first 10 data rows (excluding header)
												const truncatedCsv = [header, ...dataRows].join("\n");
												return {
													type: "text",
													text: `# ${document.name} (first 10 rows, file is avilable at /mnt/data/${index - 1}_${document.name})\n${truncatedCsv}\n`,
												};
											}

											// Get the file URL instead of converting to base64 for OpenRouter
											const fileUrl = await getDocumentUrl(ctx, document.key);
											if (fileType === "image") {
												return {
													type: "image_url",
													image_url: {
														url: fileUrl,
														format: mimeType,
														detail: "high",
													},
												};
											} else {
												return {
													type: "file",
													file: {
														filename: document.name,
														file_data: fileUrl,
													},
												};
											}
										} else {
											return await getVectorText(ctx, document);
										}
									} else if (["text", "github"].includes(document.type)) {
										const blob = await ctx.storage.get(
											document.key as Id<"_storage">,
										);
										const text = await blob?.text();
										return {
											type: "text",
											text: `# ${document.name}\n${text}\n`,
										};
									} else {
										return await getVectorText(ctx, document);
									}
								} else {
									return contentItem;
								}
							} else {
								return contentItem;
							}
						}),
					);

					// Create new message with processed content
					return new HumanMessage({ content: processedContent });
				} else {
					// Handle other content types
					return message;
				}
			} else {
				return message;
			}
		}),
	);

	return formattedMessages;
}

export async function getVectorText(
	ctx: ActionCtx,
	document: Doc<"documents">,
): Promise<MessageContentComplex | DataContentBlock> {
	// Fall back to vector processing for unsupported file types
	let doc = document;
	let maxAttempts = 50;
	while (doc.status === "processing" && maxAttempts > 0) {
		await new Promise((resolve) => setTimeout(resolve, 3000));
		doc = (await ctx.runQuery(internal.documents.crud.read, {
			id: document._id,
		}))!;
		maxAttempts--;
	}
	const vectors = await ctx.runQuery(internal.documents.queries.getAllVectors, {
		documentId: doc._id,
	});
	const text =
		vectors.length > 0
			? vectors.map((vector) => vector.text).join("\n")
			: "No text found";

	const url = await getDocumentUrl(ctx, doc.key);
	return {
		type: "text",
		text: `# [${doc.name}](${url})\n${text}\n`,
	};
}

export function modelSupportsTools(model: string): boolean {
	const modelConfig = models.find((m) => m.model_name === model);

	if (!modelConfig) {
		throw new Error(`Model ${model} not found in configuration`);
	}

	return modelConfig.toolSupport;
}
