"use node";

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Embeddings } from "@langchain/core/embeddings";
import type { Doc } from "../_generated/dataModel";
import mime from "mime";
import type { ActionCtx } from "../_generated/server";
import type {
  MessageContentComplex,
  DataContentBlock,
} from "@langchain/core/messages";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { fly, FlyApp } from "../utils/flyio";
import * as yaml from "js-yaml";
import { v } from "convex/values";

const LITELLM_APP_NAME = "zerobs-api"
const LITELLM_CONFIG_YAML = `
model_list:
  - model_name: gemini-2.5-flash
    litellm_params:
      model: gemini/gemini-2.5-flash-preview-05-20
      api_key: os.environ/GOOGLE_API_KEY
      tags: ["text", "image", "audio", "video", "pdf"]
  - model_name: embeddings
    litellm_params:
      model: gemini/text-embedding-004
      api_key: os.environ/GOOGLE_API_KEY
      tags: ["text", "embeddings"]

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

export const pingOrCreateLiteLLMApp = internalAction({
  args: {},
  handler: async (ctx, args) => {
    console.log("Checking for existing app...");
    let app: FlyApp | null = await fly.getApp(LITELLM_APP_NAME);
    if (!app) {
      console.log("App not found. Creating a new app...");
      app = await fly.createApp({
        app_name: LITELLM_APP_NAME,
        org_slug: "personal",
      });
      await fly.allocateIpAddress(app?.name!, "shared_v4");
    }

    console.log("Checking for existing machine...");
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

export const formatDocument = internalAction({
  args: {
    document: v.any(),
    model: v.string(),
  },
  handler: async (ctx, args): Promise<MessageContentComplex | DataContentBlock> => {
    const modelConfig = parsedConfig.model_list.find((m) => m.model_name === args.model);
    if (!modelConfig) {
      throw new Error(`Model ${args.model} not found in configuration`);
    }

    let content: MessageContentComplex | DataContentBlock;

    if (args.document.type === "file") {
      const url = await ctx.storage.getUrl(args.document.key);
      const mimeType = mime.getType(args.document.name) ?? "application/octet-stream";
      const fileType = mimeType.split("/")[0];

      if (fileType === "image" && modelConfig.litellm_params.tags.includes("image")) {
        content = {
          type: "image_url",
          image_url: {
            url: url,
          }
        };
      } else if (["audio", "video", "pdf"].includes(fileType) && modelConfig.litellm_params.tags.includes(fileType)) {
        content = {
          type: "file",
          file: {
            file_id: url,
            format: mimeType,
          }
        };
      } else if (fileType === "text" && modelConfig.litellm_params.tags.includes("text")) {
        const text = await (await ctx.storage.get(args.document.key))?.text();
        content = {
          type: "text",
          source_type: "text",
          text: `# ${args.document.name}\n\n${text}\n\n`,
        };
      } else {
        try {
          const vectors = await ctx.runQuery(
            internal.documents.queries.getAllVectors,
            {
              documentId: args.document._id,
            },
          );
          const text = vectors.map((vector) => vector.text).join("\n");
          content = {
            type: "text",
            source_type: "text",
            text: `# ${args.document.name}\n${text}\n`,
          };
        } catch (e) {
          throw new Error(`Failed to format document ${args.document.name}: ${e}`);
        }
      }
    } else {
      try {
        const vectors = await ctx.runQuery(internal.documents.queries.getAllVectors, {
          documentId: args.document._id,
        });
        const text = vectors.map((vector) => vector.text).join("\n");
        content = {
          type: "text",
          source_type: "text",
          text: `# ${args.document.name}\n\n${text}\n\n`,
        };
      } catch (e) {
        throw new Error(`Failed to format document ${args.document.name}: ${e}`);
      }
    }

    return content;
  },
});