"use node";

import { api } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import runpodSdk from "runpod-sdk";
import mime from "mime";
import { TextLoader } from "langchain/document_loaders/fs/text";

const runpod = runpodSdk(process.env.RUN_POD_KEY!);
const runpodCrawler = runpod.endpoint(process.env.RUN_POD_CRAWLER_ID!);
const runpodDocProcessor = runpod.endpoint(process.env.RUN_POD_DOC_PROCESSOR_ID!);

export const load = internalAction({
  args: {
    documentId: v.id("documents"),
    metadata: v.optional(
      v.object({
        source: v.id("projectDocuments"),
        projectId: v.id("projects"),
      })
    ),
  },
  handler: async (ctx, args) => {
    const document = await ctx.runQuery(api.documents.queries.get, {
      documentId: args.documentId,
    });

    let pageContent = "";
    if (document.type === "file") {
      const documentUrl = new URL((await ctx.storage.getUrl(document.key))!);
      const res = await runpodDocProcessor?.runSync({
        input: {
          source: documentUrl.toString(),
        },
      });
      if (res?.output.output) {
        pageContent = res.output.output;
      } else {
        try {
          // try reading the document as document processor can't load txt, or text type files
          const contentType = mime.getType(document.name);
          if (contentType?.startsWith("text/")) {
            const blob = await ctx.storage.get(document.key);
            if (blob) {
              const loader = new TextLoader(blob);
              const docs = await loader.load();
              pageContent = docs.map((doc) => doc.pageContent).join("\n\n");
            }
          }
        } catch (e) {
          throw new Error("Failed to process document\n" + e);
        }
      }
    } else if (document.type === "url") {
      const res = await runpodCrawler?.runSync({
        input: {
          url: document.key,
          max_depth: 0,
        },
      });
      pageContent = res?.output.output.map((d: { url: string; markdown: string }) => `# ${d.url}\n\n${d.markdown}`).join("\n\n");
    } else if (document.type === "youtube") {
      const loader = YoutubeLoader.createFromUrl(document.key, {
        language: "en",
        addVideoInfo: true,
      });
      const docs = await loader.load();
      pageContent = docs
        .map(
          (doc) =>
            `# ${JSON.stringify(doc.metadata, null, 2)}\n\n${doc.pageContent}`
        )
        .join("\n\n");
    } else if (document.type === "site") {
      const res = await runpodCrawler?.runSync({
        input: {
          url: document.key,
          max_depth: 2,
        },
      });
      pageContent = res?.output.output.map((d: { url: string; markdown: string }) => `# ${d.url}\n\n${d.markdown}`).join("\n\n");
    } else {
      throw new Error("Invalid document type");
    }

    return {
      pageContent,
      ...(args.metadata ? { metadata: args.metadata } : {}),
    };
  },
});
