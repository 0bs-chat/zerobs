"use node";

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import mime from "mime";
import { Documents } from "../../schema";
import { getDocumentUrl } from "../helpers";
import runpodSdk from "runpod-sdk";
import Firecrawl from "@mendable/firecrawl-js";
import { internal } from "../../_generated/api";

const CRAWLER_URL = process.env.CRAWLER_URL ?? "http://127.0.0.1:7860";
const DOC_PROCESSOR_URL =
  process.env.DOC_PROCESSOR_URL ?? "http://127.0.0.1:7861";
const SERVICE_PASSWORD = process.env.SERVICE_PASSWORD ?? "";
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const RUNPOD_DOC_PROCESSOR_ENDPOINT_ID =
  process.env.RUNPOD_DOC_PROCESSOR_ENDPOINT_ID;
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

export const processFile = internalAction({
  args: {
    document: Documents.doc,
  },
  handler: async (ctx, args) => {
    const document = args.document;
    const mimeType = mime.getType(document.name) ?? "application/octet-stream";

    let result: string;
    if (mimeType.startsWith("text")) {
      const blob = await ctx.storage.get(document.key);
      if (blob) {
        const text = await blob.text();
        result = text;
      } else {
        result = "";
      }
    } else {
      const fileUrl = await getDocumentUrl(ctx, document.key);

      if (!fileUrl) {
        throw new Error("Unable to get file URL");
      }

      // Use RunPod if both API key and endpoint ID are available
      if (RUNPOD_API_KEY && RUNPOD_DOC_PROCESSOR_ENDPOINT_ID) {
        try {
          const runpod = runpodSdk(RUNPOD_API_KEY);
          const endpointId = RUNPOD_DOC_PROCESSOR_ENDPOINT_ID as string;
          const input = {
            input: {
              document_url: fileUrl,
            },
          };

          const response = await runpod.endpoint(endpointId)?.runSync(input)!;

          if (response.status === "COMPLETED" && response.output?.content) {
            result = response.output.content;
          } else {
            throw new Error(`RunPod processing failed: ${response.status}`);
          }
        } catch (error) {
          // Fall back to local service
          const response = await fetch(`${DOC_PROCESSOR_URL}/process`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SERVICE_PASSWORD}`,
            },
            body: JSON.stringify({ document_url: fileUrl }),
          });
          const data = await response.json();
          result = data.result.content;
        }
      } else {
        // Use local service when RunPod credentials are not available
        const response = await fetch(`${DOC_PROCESSOR_URL}/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SERVICE_PASSWORD}`,
          },
          body: JSON.stringify({ document_url: fileUrl }),
        });
        const data = await response.json();
        result = data.result.content;
      }
    }

    return result;
  },
});

export const processUrlOrSite = internalAction({
  args: {
    url: v.string(),
    maxDepth: v.number(),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    // Use Firecrawl SDK if API key is available
    if (FIRECRAWL_API_KEY) {
      try {
        const firecrawl = new Firecrawl({ apiKey: FIRECRAWL_API_KEY });
        
        // Use scrape for single page (maxDepth 0), crawl for multi-page
        if (args.maxDepth === 0) {
          const scrapeResponse = await firecrawl.scrape(args.url, {
            formats: ['markdown'],
          });

          if (scrapeResponse.markdown) {
            if (scrapeResponse.metadata?.title) {
              await ctx.runMutation(internal.documents.crud.update, {
                id: args.documentId,
                patch: { 
                  name: scrapeResponse.metadata?.title
                },
              });
            }
            
            return `### ${scrapeResponse.metadata?.sourceURL || args.url}\n${scrapeResponse.markdown}\n`;
          } else {
            throw new Error('Firecrawl scrape failed: No markdown content');
          }
        } else {
          const crawlResponse = await firecrawl.crawl(args.url, {
            limit: Math.pow(10, args.maxDepth), // Convert depth to page limit
            scrapeOptions: { formats: ['markdown'] },
            pollInterval: 2,
          });

          if (crawlResponse.status === 'completed' && crawlResponse.data) {
            if (crawlResponse.data.length > 0 && crawlResponse.data[0].metadata?.title) {
              await ctx.runMutation(internal.documents.crud.update, {
                id: args.documentId,
                patch: { name: crawlResponse.data[0].metadata?.title },
              });
            }

            return crawlResponse.data
              .map((page) => `### ${page.metadata?.sourceURL || args.url}\n${page.markdown}\n`)
              .join("\n");
          } else {
            throw new Error(`Firecrawl crawl failed with status: ${crawlResponse.status}`);
          }
        }
      } catch (error) {
        console.error("Firecrawl error, falling back to legacy crawler:", error);
        // Fall back to original implementation
      }
    }

    // Fallback to original crawler implementation
    const response = await fetch(`${CRAWLER_URL}/crawl`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_PASSWORD}`,
      },
      body: JSON.stringify({ url: args.url, max_depth: args.maxDepth }),
    });
    const data = (await response.json()) as { url: string; markdown: string }[];
    return data.map((url) => `### ${url.url}\n${url.markdown}\n`).join("\n");
  },
});
