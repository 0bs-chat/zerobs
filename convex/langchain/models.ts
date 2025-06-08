"use node";

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Embeddings } from "@langchain/core/embeddings";
import { ActionCtx, internalAction } from "../_generated/server";
import { fly, FlyApp } from "../utils/flyio";
import * as yaml from "js-yaml";
import { BaseMessage, HumanMessage, MessageContentComplex, DataContentBlock } from "@langchain/core/messages";
import { Doc } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";
import mime from "mime";

const LITELLM_APP_NAME = "zerobs-api"
const LITELLM_CONFIG_YAML = `
model_list:
  - model_name: gemini-2.5-flash
    litellm_params:
      model: gemini/gemini-2.5-flash-preview-05-20
      api_key: os.environ/GOOGLE_API_KEY
      tags: ["text", "image", "audio", "video", "pdf"]
  - model_name: gpt-4.1
    litellm_params:
      model: openrouter/openai/gpt-4.1
      api_key: os.environ/OPENAI_API_KEY
      tags: ["text", "image"]
  - model_name: claude-4
    litellm_params:
      model: openrouter/anthropic/claude-sonnet-4
      api_key: os.environ/OPENAI_API_KEY
      tags: ["text", "image", "pdf"]
  - model_name: worker
    litellm_params:
      model: openrouter/google/gemini-2.0-flash-001
      api_key: os.environ/OPENAI_API_KEY
      tags: ["text", "image", "pdf", "hidden"]
  - model_name: embeddings
    litellm_params:
      model: gemini/text-embedding-004
      api_key: os.environ/GOOGLE_API_KEY
      tags: ["text", "embeddings", "hidden"]

litellm_settings:
  drop_params: true

general_settings:
  master_key: os.environ/OPENAI_API_KEY
`

export const parsedConfig = yaml.load(LITELLM_CONFIG_YAML) as {
  model_list: {
    model_name: string;
    litellm_params: {
      model: string;
      api_key: string;
      tags: string[];
    };
  }[];
  litellm_settings: {
    drop_params: boolean;
  };
};

export const reCreateLiteLLMApp = internalAction({
  args: {},
  handler: async (ctx, args) => {
    console.log("Checking for existing app...");
    let app: FlyApp | null = await fly.getApp(LITELLM_APP_NAME);

    if (app) {
      console.log("Deleting existing app...");
      await fly.deleteApp(app.name!);
    }

    console.log("Creating new app...");
    app = await fly.createApp({
      app_name: LITELLM_APP_NAME,
      org_slug: "personal",
    });
    await fly.allocateIpAddress(app?.name!, "shared_v4");

    const scaleCount = 2;
    const litellmMachines = await Promise.all(Array.from({ length: scaleCount }, async (_, i) => {
      return await fly.getMachine(LITELLM_APP_NAME, `litellm-machine-${i}`);
    }));
    if (litellmMachines.some((machine) => !machine)) {
      console.log("Machine not found. Creating a new machine...");
      // create machine
      await Promise.all(Array.from({ length: scaleCount }, async (_, i) => {
        return await fly.createMachine(LITELLM_APP_NAME, {
          config: {
            image: "ghcr.io/berriai/litellm:main-latest",
            env: {
              GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || "",
              OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
              ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || "",
            },
            files: [{
              guest_path: "/app/config.yaml",
              raw_value: Buffer.from(LITELLM_CONFIG_YAML).toString("base64"),
            }],
            init: {
              cmd: ["--port", "4000", "--config", "/app/config.yaml"],
            },
            services: [
              {
                internal_port: 4000,
                protocol: "tcp",
                autostart: true,
                autostop: "suspend",
                min_machines_running: 0,
                ports: [{
                    port: 443,
                    handlers: ["tls", "http"],
                }]
              }
            ],
            guest: {
              cpus: 2,
              memory_mb: 4096,
              cpu_kind: "shared"
            },
            restart: {
              policy: "on-failure",
              max_retries: 2
            },
            
          },
          region: "sea",
          name: `litellm-machine-${i}`,
        });
      }));
    } else {
      console.log("Machine already exists.");
    }

    return app;
  },
});

export function getModel(model: string): BaseChatModel {
  const modelConfig = parsedConfig.model_list.find((m) => m.model_name === model);

  if (!modelConfig) {
    throw new Error(`Model ${model} not found in configuration`);
  }

  const API_KEY = process.env.OPENAI_API_KEY;

  return new ChatOpenAI({
    model: modelConfig.model_name,
    apiKey: API_KEY,
    configuration: {
      baseURL: `https://${LITELLM_APP_NAME}.fly.dev`,
    }
  });
}

export function getEmbeddingModel(model: string): Embeddings {
  const modelConfig = parsedConfig.model_list.find((m) => m.model_name === model);

  if (!modelConfig || !modelConfig.litellm_params.tags.includes("embeddings")) {
    throw new Error(`Model ${model} not found in configuration`);
  }

  const API_KEY = process.env.OPENAI_API_KEY;

  return new OpenAIEmbeddings({
    model: modelConfig.model_name,
    apiKey: API_KEY,
    configuration: {
      baseURL: `https://${LITELLM_APP_NAME}.fly.dev`,
    }
  });
}

export async function formatMessages(ctx: ActionCtx, messages: BaseMessage[], model: string): Promise<BaseMessage[]> {
  const modelConfig = parsedConfig.model_list.find((m) => m.model_name === model);
  
  if (!modelConfig) {
    throw new Error(`Model ${model} not found in configuration`);
  }

  const supportedTags = modelConfig.litellm_params.tags;

  // Process all messages in parallel
  const formattedMessages = await Promise.all(messages.map(async (message) => {
    if (message instanceof HumanMessage) {
      const content = message.content;
      
      // If content is a string, no processing needed
      if (typeof content === "string") {
        return message;
      }

      // If content is an array, check each item
      if (Array.isArray(content)) {
        // Process all content items in parallel
        const processedContent = await Promise.all(content.map(async (contentItem) => {
          if (typeof contentItem === "string") {
            return contentItem;
          }

          if (typeof contentItem === "object" && contentItem !== null) {
            // Handle file content (image, audio, video, pdf)
            if (contentItem.type === "file" && "file" in contentItem) {
              const documentId = contentItem.file?.file_id;
              const document = await ctx.runQuery(api.documents.queries.get, {
                documentId,
              });
              if (document.type === "file") {
                const mimeType = mime.getType(document.name) ?? "application/octet-stream";
                const fileType = mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[0];
                if (supportedTags.includes(fileType)) {
                  return {
                    type: "image_url",
                    image_url: {
                      url: await ctx.storage.getUrl(document.key),
                      format: mimeType,
                      detail: "high",
                    }
                  }
                } else {
                  return await getVectorText(ctx, document)
                }
              } else {
                return await getVectorText(ctx, document)
              }
            }
            // Handle text content and other supported types
            else {
              return contentItem;
            }
          } else {
            return contentItem;
          }
        }));

        // Create new message with processed content
        return new HumanMessage({ content: processedContent });
      } else {
        // Handle other content types
        return message;
      }
    } else {
      return message;
    }
  }));

  return formattedMessages;
}

export async function getVectorText(ctx: ActionCtx, document: Doc<"documents">): Promise<MessageContentComplex | DataContentBlock> {
  // Fall back to vector processing for unsupported file types
  let doc = document;
  let maxAttempts = 50;
  while (doc.status === "processing" && maxAttempts > 0) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    doc = await ctx.runQuery(api.documents.queries.get, {
      documentId: document._id,
    });
    maxAttempts--;
  }
  const vectors = await ctx.runQuery(internal.documents.queries.getAllVectors, {
    documentId: doc._id,
  });
  const text = vectors.length > 0 ? vectors.map((vector) => vector.text).join("\n") : "No text found";
  return {
    type: "text",
    text: `# ${doc.name}\n${text}\n`,
  }
}
