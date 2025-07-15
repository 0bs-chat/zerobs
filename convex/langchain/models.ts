"use node";

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ActionCtx } from "../_generated/server";
import {
  BaseMessage,
  HumanMessage,
  type MessageContentComplex,
  type DataContentBlock,
  ToolMessage,
} from "@langchain/core/messages";
import type { Doc, Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";
import mime from "mime";
import { Base64 } from "convex/values";
import { getUrl } from "../utils/helpers";

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
  usageRateMultiplier: number;
  hidden?: boolean;
  type?: "chat" | "embeddings";
  temperature?: number;
  parser?: "base" | "functionCalling"
}[] = [
    {
      label: "Gemini 2.5 Flash",
      model_name: "gemini-2.5-flash",
      model: "google/gemini-2.5-flash-preview-05-20",
      isThinking: false,
      toolSupport: true,
      provider: "openai",
      modalities: ["text", "image", "pdf"],
      image:
        "https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
      description:
        "Gemini 2.5 Flash is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
      usageRateMultiplier: 1.0,
      temperature: 0.5,
      parser: "functionCalling",
    },
    {
      label: "Gemini 2.5 Flash Thinking",
      model_name: "gemini-2.5-flash-thinking",
      model: "google/gemini-2.5-flash-preview-05-20:thinking",
      isThinking: true,
      toolSupport: true,
      provider: "openai",
      modalities: ["text", "image", "pdf"],
      image:
        "https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
      description:
        "Gemini 2.5 Flash Thinking is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
      usageRateMultiplier: 1.0,
      temperature: 0.5,
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
      usageRateMultiplier: 1.5,
      temperature: 0.5,
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
        "https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5RsZQzuF5zDMLZP3RO4xGwmVtnqFcNKharf0",
      description:
        "GPT-4.1 is a state-of-the-art language model capable of understanding and generating human-like text.",
      usageRateMultiplier: 1.0,
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
        "https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
      description:
        "o4 mini is a state-of-the-art language model capable of understanding and generating human-like text.",
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
        "https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
      description:
        "o3 is a state-of-the-art language model capable of understanding and generating human-like text.",
      usageRateMultiplier: 1.5,
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
        "https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWSCRxLvQkYbi8sZjauXl0P9cm7wv6oqd4TkgLy",
      description:
        "Claude 4 is a versatile model that excels in various text and image processing tasks.",
      usageRateMultiplier: 2.0,
      temperature: 0.5,
      parser: "functionCalling",
    },
    {
      label: "Worker",
      model_name: "worker",
      model: "google/gemini-2.5-flash-preview-05-20",
      isThinking: false,
      toolSupport: true,
      provider: "openai",
      modalities: ["text", "image", "pdf"],
      image:
        "https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
      description:
        "The Worker model is designed for specialized tasks requiring high efficiency.",
      usageRateMultiplier: 1.0,
      hidden: true,
      temperature: 0.5,
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
        "https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
      description:
        "Grok 3 Mini is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
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
        "https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
      description:
        "Grok 4 is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
      usageRateMultiplier: 2.0,
    },
    {
      label: "Cypher Alpha",
      model_name: "cypher-alpha",
      model: "openrouter/cypher-alpha:free",
      isThinking: false,
      toolSupport: false,
      provider: "openai",
      modalities: ["text"],
      image:
        "https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
      description:
        "Cypher Alpha is a stealth mode model that can be used to generate text.",
      usageRateMultiplier: 0.0,
    },
    {
      label: "Kimi K2",
      model_name: "kimi-k2",
      model: "moonshotai/kimi-k2",
      isThinking: false,
      toolSupport: true,
      provider: "openai",
      modalities: ["text"],
      image:
        "https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5y4g1AF5zDMLZP3RO4xGwmVtnqFcNKharf0I",
      description:
        "Kimi K2 is a powerful model that can handle a wide range of tasks, including text, image, and video generation.",
      usageRateMultiplier: 1.0,
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
  const OPENAI_BASE_URL =
    (
      await ctx.runQuery(internal.apiKeys.queries.getFromKey, {
        key: "OPENAI_BASE_URL",
        userId,
      })
    )?.value ?? "https://openrouter.ai/api/v1";

  return new ChatOpenAI({
    model: modelConfig.model,
    apiKey: OPENAI_API_KEY,
    temperature: modelConfig.temperature ?? 0.3,
    reasoning: {
      effort: reasoningEffort,
    },
    configuration: {
      baseURL: OPENAI_BASE_URL,
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
    const OPENAI_BASE_URL = (
      await ctx.runQuery(internal.apiKeys.queries.getFromKey, {
        key: "OPENAI_EMBEDDING_BASE_URL",
      })
    )?.value;

    return new OpenAIEmbeddings({
      model: modelConfig.model,
      apiKey: API_KEY,
      configuration: {
        baseURL: OPENAI_BASE_URL,
      },
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
            content.map(async (contentItem) => {
              if (typeof contentItem === "object") {
                if (contentItem.type === "file" && "file" in contentItem) {
                  const documentId = contentItem.file?.file_id;
                  const document = await ctx.runQuery(
                    api.documents.queries.get,
                    {
                      documentId,
                    },
                  );
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
                      const base64 = Base64.fromByteArray(
                        new Uint8Array(
                          await (
                            await ctx.storage.get(
                              document.key as Id<"_storage">,
                            )
                          )?.arrayBuffer()!,
                        ),
                      );
                      if (fileType === "image") {
                        return {
                          type: "image_url",
                          image_url: {
                            url: `data:${mimeType};base64,${base64}`,
                            format: mimeType,
                            detail: "high",
                          },
                        };
                      } else {
                        return {
                          type: "file",
                          file: {
                            filename: document.name,
                            file_data: `data:${mimeType};base64,${base64}`,
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
                    return {
                      type: "text",
                      text: `# ${document.name}\n${blob?.text()}\n`,
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
    doc = await ctx.runQuery(api.documents.queries.get, {
      documentId: document._id,
    });
    maxAttempts--;
  }
  const vectors = await ctx.runQuery(internal.documents.queries.getAllVectors, {
    documentId: doc._id,
  });
  const text =
    vectors.length > 0
      ? vectors.map((vector) => vector.text).join("\n")
      : "No text found";

  const url = await getUrl(ctx, doc.key);
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
