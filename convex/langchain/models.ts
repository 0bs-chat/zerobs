"use node";

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { Embeddings } from "@langchain/core/embeddings";
import { ActionCtx, internalAction } from "../_generated/server";
import { fly, FlyApp } from "../utils/flyio";
import * as yaml from "js-yaml";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { getVectorText } from "./index";

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
  const supportsImage = supportedTags.includes("image");
  const supportsAudio = supportedTags.includes("audio"); 
  const supportsVideo = supportedTags.includes("video");
  const supportsPdf = supportedTags.includes("pdf");

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
            // Handle image content
            if (contentItem.type === "image_url" && !supportsImage) {
              // Convert image to text description using getVectorText
              try {
                const extractedText = await getVectorText(ctx, contentItem.image_url?.url || "");
                return {
                  type: "text",
                  text: extractedText || "[Image content could not be processed]"
                };
              } catch (error) {
                return {
                  type: "text",
                  text: "[Image content not supported by this model - extraction failed]"
                };
              }
            }
            // Handle file content (audio, video, pdf)
            else if (contentItem.type === "file" && "file" in contentItem) {
              const fileFormat = contentItem.file?.format || "";
              const fileType = fileFormat.split("/")[0];
              
              let shouldConvert = false;
              if (fileType === "audio" && !supportsAudio) shouldConvert = true;
              if (fileType === "video" && !supportsVideo) shouldConvert = true;
              if (fileFormat === "application/pdf" && !supportsPdf) shouldConvert = true;
              
              if (shouldConvert) {
                // Convert file to text using getVectorText
                try {
                  const extractedText = await getVectorText(ctx, contentItem.file?.url || "");
                  return {
                    type: "text",
                    text: extractedText || `[${fileType || "File"} content could not be processed - format: ${fileFormat}]`
                  };
                } catch (error) {
                  return {
                    type: "text",
                    text: `[${fileType || "File"} content not supported by this model - format: ${fileFormat}]`
                  };
                }
              } else {
                return contentItem;
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