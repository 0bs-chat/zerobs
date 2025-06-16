"use node";

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import mime from "mime";
import { Documents } from "../../schema";

const CRAWLER_URL = process.env.CRAWLER_URL ?? "http://127.0.0.1:7860";
const DOC_PROCESSOR_URL =
  process.env.DOC_PROCESSOR_URL ?? "http://127.0.0.1:7861";
const SERVICE_PASSWORD = process.env.SERVICE_PASSWORD ?? "";

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
      const fileUrl = await ctx.storage.getUrl(document.key);
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

    return result;
  },
});

export const processUrlOrSite = internalAction({
  args: {
    url: v.string(),
    maxDepth: v.number(),
  },
  handler: async (_ctx, args) => {
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
