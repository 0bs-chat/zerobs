import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Embeddings } from "@langchain/core/embeddings";
import type { Doc } from "../_generated/dataModel";
import mime from "mime";
import type { ActionCtx } from "../_generated/server";
import type {
  MessageContentComplex,
  DataContentBlock,
} from "@langchain/core/messages";
import { api, internal } from "../_generated/api";

const API_KEY_MAP = {
  anthropic: process.env.ANTHROPIC_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  google: process.env.GOOGLE_API_KEY,
};

export interface ModelConfig {
  label: string;
  icon_url: string;
  model: string;
  provider: keyof typeof API_KEY_MAP;
  providerType: "google" | "openai" | "anthropic";
  openai_args?: {
    base_url: string;
  };
  tags: ("text" | "image" | "audio" | "video" | "pdf")[];
}

export const models: ModelConfig[] = [
  {
    label: "gemini-2.5-flash",
    icon_url:
      "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://gemini.google.com/app&size=256",
    model: "gemini-2.5-flash-preview-05-20",
    provider: "google",
    providerType: "google",
    tags: ["text", "image", "audio", "video", "pdf"],
  },
];

export const embeddings: ModelConfig[] = [
  {
    label: "embeddings",
    icon_url:
      "https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://gemini.google.com/app&size=256",
    model: "text-embedding-004",
    provider: "google",
    providerType: "google",
    tags: ["text"],
  },
];

export function getModel(modelName: string): BaseChatModel {
  const modelConfig = models.find((m) => m.model === modelName);

  if (!modelConfig) {
    throw new Error(`Model ${modelName} not found in configuration`);
  }

  const apiKey = API_KEY_MAP[modelConfig.provider];

  switch (modelConfig.providerType) {
    case "openai":
      return new ChatOpenAI({
        model: modelConfig.model,
        apiKey: apiKey,
        ...(modelConfig.openai_args && {
          configuration: {
            baseURL: modelConfig.openai_args.base_url,
          },
        }),
      });

    case "anthropic":
      return new ChatAnthropic({
        model: modelConfig.model,
        apiKey: apiKey,
      });

    case "google":
      return new ChatOpenAI({
        model: modelConfig.model,
        apiKey: apiKey,
        configuration: {
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
        },
      });

    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }
}

export function getEmbeddingModel(modelName: string): Embeddings {
  const modelConfig = embeddings.find((m) => m.model === modelName);

  if (!modelConfig) {
    throw new Error(`Model ${modelName} not found in configuration`);
  }

  const apiKey = API_KEY_MAP[modelConfig.provider];

  switch (modelConfig.providerType) {
    case "openai":
      return new OpenAIEmbeddings({
        model: modelConfig.model,
        apiKey: apiKey,
      });

    case "google":
      return new GoogleGenerativeAIEmbeddings({
        model: modelConfig.model,
        apiKey: apiKey,
      });

    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }
}

export async function formatDocument(
  document: Doc<"documents">,
  model: string,
  ctx: ActionCtx,
) {
  const modelConfig = models.find((m) => m.model === model);
  if (!modelConfig) {
    throw new Error(`Model ${model} not found in configuration`);
  }

  let content: MessageContentComplex | DataContentBlock;

  if (document.type === "file") {
    const base64 = Buffer.from(
      await (await ctx.storage.get(document.key))?.arrayBuffer()!,
    ).toString("base64");
    const mimeType = mime.getType(document.name) ?? "application/octet-stream";
    const fileType = mimeType.split("/")[0];

    if (fileType === "image" && modelConfig.tags.includes("image")) {
      content = {
        type: "image",
        source_type: "base64",
        data: base64,
        mime_type: mimeType,
      };
    } else if (fileType === "audio" && modelConfig.tags.includes("audio")) {
      content = {
        type: "audio",
        source_type: "base64",
        data: base64,
        mime_type: mimeType,
      };
    } else if (fileType === "video" && modelConfig.tags.includes("video")) {
      content = {
        type: "video",
        source_type: "base64",
        data: base64,
        mime_type: mimeType,
      };
    } else if (
      mimeType === "application/pdf" &&
      modelConfig.tags.includes("pdf")
    ) {
      content = {
        type: "file",
        source_type: "base64",
        data: base64,
        mime_type: mimeType,
      };
    } else if (fileType === "text" && modelConfig.tags.includes("text")) {
      const text = await (await ctx.storage.get(document.key))?.text();
      content = {
        type: "text",
        source_type: "text",
        text: `# ${document.name}\n\n${text}\n\n`,
      };
    } else {
      try {
        const vectors = await ctx.runQuery(
          internal.documents.queries.getAllVectors,
          {
            documentId: document._id,
          },
        );
        const text = vectors.map((vector) => vector.text).join("\n");
        content = {
          type: "text",
          source_type: "text",
          text: `# ${document.name}\n${text}\n`,
        };
      } catch (e) {
        throw new Error(`Failed to format document ${document.name}: ${e}`);
      }
    }
  } else {
    try {
      const vectors = await ctx.runQuery(internal.documents.queries.getAllVectors, {
        documentId: document._id,
      });
      const text = vectors.map((vector) => vector.text).join("\n");
      content = {
        type: "text",
        source_type: "text",
        text: `# ${document.name}\n\n${text}\n\n`,
      };
    } catch (e) {
      throw new Error(`Failed to format document ${document.name}: ${e}`);
    }
  }

  return content;
}
