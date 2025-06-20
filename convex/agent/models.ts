import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { ActionCtx, GenericCtx, MutationCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { CoreMessage, TextPart, ImagePart, FilePart } from "ai"
import mime from 'mime';

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
    usageRateMultiplier: 1.0,
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
    usageRateMultiplier: 1.0,
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
  },
  {
    label: "Smart Worker",
    model_name: "smart-worker",
    model: "openai/gpt-4.1",
    isThinking: false,
    toolSupport: true,
    provider: "openai",
    modalities: ["text", "image"],
    image:
      "https://fcleqc6g9s.ufs.sh/f/FPLT8dMDdrWS5RsZQzuF5zDMLZP3RO4xGwmVtnqFcNKharf0",
    description:
      "The Smart Worker model is designed for specialized tasks requiring high accuracy.",
    usageRateMultiplier: 1.0,
    hidden: true,
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
    usageRateMultiplier: 1.0,
  },
];

export async function getChatModel(ctx: GenericCtx, model: string) {
  const modelConfig = models.find((m) => m.model_name === model);
  if (!modelConfig) {
    throw new Error(`Model ${model} not found in configuration`);
  }

  const OPENAI_API_KEY = (await ctx.runQuery(api.apiKeys.queries.getFromKey, {
    key: "OPENAI_API_KEY",
  }))?.value ?? process.env.OPENAI_API_KEY;
  const OPENAI_BASE_URL = (await ctx.runQuery(api.apiKeys.queries.getFromKey, {
    key: "OPENAI_BASE_URL",
  }))?.value ?? "https://openrouter.ai/api/v1";

  if (!OPENAI_API_KEY) {
    throw new Error(`API key not found for model ${model}`);
  }

  const openai = createOpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: OPENAI_BASE_URL,
  });

  return openai(modelConfig.model);
}

export async function getEmbeddingModel(ctx: GenericCtx, model: string) {
  const modelConfig = models.find((m) => m.model_name === model);
  if (!modelConfig) {
    throw new Error(`Model ${model} not found in configuration`);
  }

  const API_KEY = (await ctx.runQuery(api.apiKeys.queries.getFromKey, {
    key: modelConfig.provider === "google" ? "GOOGLE_EMBEDDING_API_KEY" : "OPENAI_EMBEDDING_API_KEY",
  }))?.value ?? process.env[modelConfig.provider === "google" ? "GOOGLE_API_KEY" : "OPENAI_API_KEY"];

  if (modelConfig.provider === "google") {
    const google = createGoogleGenerativeAI({
      apiKey: API_KEY,
    });

    return google.textEmbeddingModel(modelConfig.model);
  } else {
    const OPENAI_BASE_URL = (await ctx.runQuery(api.apiKeys.queries.getFromKey, {
      key: "OPENAI_EMBEDDING_BASE_URL",
    }))?.value;

    const openai = createOpenAI({
      apiKey: API_KEY,
      baseURL: OPENAI_BASE_URL,
    });

    return openai.textEmbeddingModel(modelConfig.model);
  }
}

export async function formatMessages(ctx: ActionCtx, messages: Doc<"chatMessages">[], model: string): Promise<CoreMessage[]> {
  const modelConfig = models.find((m) => m.model_name === model);
  if (!modelConfig) {
    throw new Error(`Model ${model} not found in configuration`);
  }
  const supportedModalities = modelConfig.modalities;

  const formattedMessages = await Promise.all(messages.map(async (message) => {
    const msg = JSON.parse(message.message) as CoreMessage;
    
    if (msg.role === "user") {
      const content: Array<TextPart | ImagePart | FilePart> = [];
      
      if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === "text") {
            content.push(part as TextPart);
          } else if (part.type === "file") {
            const document = await ctx.runQuery(api.documents.queries.get, {
              documentId: part.data as Id<"documents">,
            });
            
            if (document.type === "file") {
              const fileMimeType = mime.getType(document.name);
              const fileType = fileMimeType === "application/pdf" ? "pdf" : fileMimeType?.split("/")[0] as "text" | "image" | "pdf";
              
              if (fileType && supportedModalities.includes(fileType as "text" | "image" | "pdf")) {
                const url = await ctx.storage.getUrl(document.key);
                
                if (fileType === "image") {
                  content.push({
                    type: "image",
                    image: url!,
                    mimeType: fileMimeType ?? "",
                    providerOptions: {
                      openai: { imageDetail: "high" }
                    }
                  } as ImagePart);
                } else if (fileType === "pdf") {
                  content.push({
                    type: "file",
                    data: url!,
                    filename: document.name,
                    mimeType: fileMimeType ?? "",
                  } as FilePart);
                } else if (fileType === "text") {
                  const blob = await ctx.storage.get(document.key);
                  content.push({
                    type: "text",
                    text: `# ${document.name}\n${await blob?.text()}\n`,
                  } as TextPart);
                } else {
                  content.push({
                    type: "file",
                    data: url!,
                    filename: document.name,
                    mimeType: fileMimeType ?? "",
                  } as FilePart);
                }
              } else {
                // Fall back to vector text for unsupported file types
                const vectorText = await getVectorText(ctx, document);
                content.push(vectorText);
              }
            } else if (["text", "github"].includes(document.type)) {
              const blob = await ctx.storage.get(document.key);
              content.push({
                type: "text",
                text: `# ${document.name}\n${await blob?.text()}\n`,
              } as TextPart);
            } else {
              // Fall back to vector text for other document types
              const vectorText = await getVectorText(ctx, document);
              content.push(vectorText);
            }
          } else {
            // Pass through other content types as-is
            content.push(part as any);
          }
        }
        
        // Return message with processed content
        return {
          ...msg,
          content: content.length > 0 ? content : msg.content
        } as CoreMessage;
      }
    }
    
    return msg;
  }));

  return formattedMessages;
}

async function getVectorText(ctx: ActionCtx, document: Doc<"documents">): Promise<TextPart> {
  // Wait for document processing to complete
  let doc = document;
  let maxAttempts = 50;
  while (doc.status === "processing" && maxAttempts > 0) {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    doc = await ctx.runQuery(api.documents.queries.get, {
      documentId: document._id,
    });
    maxAttempts--;
  }
  
  // Get vectors for the document
  const vectors = await ctx.runQuery(internal.documents.queries.getAllVectors, {
    documentId: doc._id,
  });
  
  const text = vectors.length > 0
    ? vectors.map((vector: any) => vector.text).join("\n")
    : "No text found";
  
  const url = ["file", "text", "github"].includes(doc.type) ? await ctx.storage.getUrl(doc.key) : doc.key;
  return {
    type: "text",
    text: `# [${doc.name}](${url})\n${text}\n`,
  } as TextPart;
}